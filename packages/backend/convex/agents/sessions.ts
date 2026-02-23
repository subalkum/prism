import { query } from "../_generated/server";
import { v } from "convex/values";

// ---------------------------------------------------------------------------
// Public queries for session history
// ---------------------------------------------------------------------------

/** List all sessions for a user, most recent first */
export const getUserSessions = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(50, Math.max(1, Math.floor(args.limit ?? 30)));
    return await ctx.db
      .query("sessions")
      .withIndex("by_user_updated", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

/** Get all messages for a specific session, ordered chronologically */
export const getSessionMessages = query({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Also fetch insights for this session to reconstruct full assistant responses
    const insights = await ctx.db
      .query("insights")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Fetch citations for each insight
    const citations = await ctx.db
      .query("citations")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Fetch usage logs for telemetry data
    const usageLogs = await ctx.db
      .query("usageLogs")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    return {
      messages: messages.sort((a, b) => a.createdAt - b.createdAt),
      insights,
      citations,
      usageLogs,
    };
  },
});

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

export function parsePreferenceStatement(text: string) {
  const normalized = text.toLowerCase();
  const prefersCodeExamples =
    normalized.includes("code example") || normalized.includes("example code");
  const responseVerbosity: "concise" | "balanced" | "detailed" = normalized.includes(
    "concise",
  )
    ? "concise"
    : normalized.includes("detailed")
      ? "detailed"
      : "balanced";

  return {
    prefersCodeExamples,
    responseVerbosity,
    citationStyle: "inline" as const,
  };
}

export const upsertUserPreferences = mutation({
  args: {
    userId: v.string(),
    prefersCodeExamples: v.boolean(),
    responseVerbosity: v.union(
      v.literal("concise"),
      v.literal("balanced"),
      v.literal("detailed"),
    ),
    citationStyle: v.union(v.literal("inline"), v.literal("footnote")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (indexQuery) => indexQuery.eq("userId", args.userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        preferences: {
          prefersCodeExamples: args.prefersCodeExamples,
          responseVerbosity: args.responseVerbosity,
          citationStyle: args.citationStyle,
        },
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("profiles", {
        userId: args.userId,
        preferences: {
          prefersCodeExamples: args.prefersCodeExamples,
          responseVerbosity: args.responseVerbosity,
          citationStyle: args.citationStyle,
        },
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      userId: args.userId,
      updatedAt: now,
    };
  },
});

export const getUserPreferences = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (indexQuery) => indexQuery.eq("userId", args.userId))
      .unique();

    return (
      profile?.preferences ?? {
        prefersCodeExamples: true,
        responseVerbosity: "balanced" as const,
        citationStyle: "inline" as const,
      }
    );
  },
});

export const rememberPreferenceStatement = mutation({
  args: {
    userId: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const parsed = parsePreferenceStatement(args.text);

    const now = Date.now();
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (indexQuery) => indexQuery.eq("userId", args.userId))
      .unique();
    const nextPreferences = parsed;

    if (existing) {
      await ctx.db.patch(existing._id, {
        preferences: nextPreferences,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("profiles", {
        userId: args.userId,
        preferences: nextPreferences,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      remembered: true,
      userId: args.userId,
      parsed: {
        prefersCodeExamples: parsed.prefersCodeExamples,
        responseVerbosity: parsed.responseVerbosity,
      },
    };
  },
});

export const listRecentMemories = query({
  args: { userId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(20, Math.max(1, Math.floor(args.limit ?? 8)));
    return await ctx.db
      .query("episodicMemories")
      .withIndex("by_user_id", (indexQuery) => indexQuery.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

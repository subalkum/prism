import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Parse a natural language preference statement.
 * Only returns fields that are explicitly mentioned — undefined means "don't change".
 */
export function parsePreferenceStatement(text: string): {
  prefersCodeExamples?: boolean;
  responseVerbosity?: "concise" | "balanced" | "detailed";
  citationStyle?: "inline" | "footnote";
} {
  const normalized = text.toLowerCase();
  const result: {
    prefersCodeExamples?: boolean;
    responseVerbosity?: "concise" | "balanced" | "detailed";
    citationStyle?: "inline" | "footnote";
  } = {};

  // Code examples
  if (
    normalized.includes("code example") ||
    normalized.includes("example code") ||
    normalized.includes("code snippet") ||
    normalized.includes("show code") ||
    normalized.includes("prefer code") ||
    normalized.includes("with code")
  ) {
    result.prefersCodeExamples = true;
  } else if (
    normalized.includes("no code") ||
    normalized.includes("without code") ||
    normalized.includes("skip code")
  ) {
    result.prefersCodeExamples = false;
  }

  // Verbosity
  if (
    normalized.includes("concise") ||
    normalized.includes("brief") ||
    normalized.includes("short") ||
    normalized.includes("terse")
  ) {
    result.responseVerbosity = "concise";
  } else if (
    normalized.includes("detailed") ||
    normalized.includes("thorough") ||
    normalized.includes("comprehensive") ||
    normalized.includes("in-depth") ||
    normalized.includes("in depth")
  ) {
    result.responseVerbosity = "detailed";
  } else if (normalized.includes("balanced")) {
    result.responseVerbosity = "balanced";
  }

  // Citation style
  if (normalized.includes("footnote") || normalized.includes("foot note")) {
    result.citationStyle = "footnote";
  } else if (normalized.includes("inline")) {
    result.citationStyle = "inline";
  }

  return result;
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
        prefersCodeExamples: false,
        responseVerbosity: "balanced" as const,
        citationStyle: "inline" as const,
      }
    );
  },
});

/**
 * Parse a natural language statement and merge into existing preferences.
 * Only fields explicitly mentioned in the text are updated — others are preserved.
 */
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

    // Merge: only overwrite fields that were explicitly detected
    const currentPrefs = existing?.preferences ?? {
      prefersCodeExamples: false,
      responseVerbosity: "balanced" as const,
      citationStyle: "inline" as const,
    };

    const mergedPreferences = {
      prefersCodeExamples: parsed.prefersCodeExamples ?? currentPrefs.prefersCodeExamples,
      responseVerbosity: parsed.responseVerbosity ?? currentPrefs.responseVerbosity,
      citationStyle: parsed.citationStyle ?? currentPrefs.citationStyle,
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        preferences: mergedPreferences,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("profiles", {
        userId: args.userId,
        preferences: mergedPreferences,
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
        citationStyle: parsed.citationStyle,
      },
      merged: mergedPreferences,
    };
  },
});

export const listRecentMemories = query({
  args: { userId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(20, Math.max(1, Math.floor(args.limit ?? 10)));
    return await ctx.db
      .query("episodicMemories")
      .withIndex("by_user_id", (indexQuery) => indexQuery.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

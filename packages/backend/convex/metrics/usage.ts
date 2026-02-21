import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

const PRICE_PER_1K: Record<string, number> = {
  gemini: 0.005,
  groq: 0.002,
  cerebras: 0.0015,
};

export function estimateUsageCost(provider: string, totalTokens: number) {
  const unitPrice = PRICE_PER_1K[provider] ?? 0.004;
  return Number(((totalTokens / 1000) * unitPrice).toFixed(6));
}

export const logUsageMetric = mutation({
  args: {
    sessionId: v.optional(v.id("sessions")),
    query: v.string(),
    model: v.string(),
    provider: v.string(),
    route: v.union(v.literal("primary"), v.literal("fallback")),
    promptTokens: v.number(),
    completionTokens: v.number(),
    latencyMs: v.number(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const totalTokens = args.promptTokens + args.completionTokens;
    const estimatedCostUsd = estimateUsageCost(args.provider, totalTokens);

    const usageLogId = await ctx.db.insert("usageLogs", {
      sessionId: args.sessionId,
      query: args.query,
      model: args.model,
      provider: args.provider,
      route: args.route,
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      totalTokens,
      estimatedCostUsd,
      latencyMs: args.latencyMs,
      error: args.error,
      createdAt: Date.now(),
    });

    return {
      usageLogId,
      totalTokens,
      estimatedCostUsd,
    };
  },
});

export const listUsageMetrics = query({
  args: { sessionId: v.optional(v.id("sessions")), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(200, Math.max(1, Math.floor(args.limit ?? 50)));

    const queryBuilder = args.sessionId
      ? ctx.db
          .query("usageLogs")
          .withIndex("by_session_id", (indexQuery) => indexQuery.eq("sessionId", args.sessionId))
      : ctx.db.query("usageLogs");

    return await queryBuilder.order("desc").take(limit);
  },
});

export const getUsageSummary = query({
  args: { sessionId: v.optional(v.id("sessions")) },
  handler: async (ctx, args) => {
    const metrics = args.sessionId
      ? await ctx.db
          .query("usageLogs")
          .withIndex("by_session_id", (indexQuery) => indexQuery.eq("sessionId", args.sessionId))
          .collect()
      : await ctx.db.query("usageLogs").collect();

    const summary = metrics.reduce(
      (acc, metric) => {
        acc.requests += 1;
        acc.totalTokens += metric.totalTokens;
        acc.totalCostUsd += metric.estimatedCostUsd;
        acc.totalLatencyMs += metric.latencyMs;
        if (metric.error) {
          acc.errorCount += 1;
        }
        return acc;
      },
      {
        requests: 0,
        totalTokens: 0,
        totalCostUsd: 0,
        totalLatencyMs: 0,
        errorCount: 0,
      },
    );

    return {
      ...summary,
      averageLatencyMs:
        summary.requests > 0 ? Math.round(summary.totalLatencyMs / summary.requests) : 0,
      totalCostUsd: Number(summary.totalCostUsd.toFixed(6)),
    };
  },
});

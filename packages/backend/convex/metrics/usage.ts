import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { estimateCost } from "../lib/utils";

export { estimateCost as estimateUsageCost };

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

    const byProvider: Record<string, { requests: number; tokens: number; cost: number }> = {};

    const summary = metrics.reduce(
      (acc, metric) => {
        acc.requests += 1;
        acc.totalTokens += metric.totalTokens;
        acc.totalCostUsd += metric.estimatedCostUsd;
        acc.totalLatencyMs += metric.latencyMs;
        if (metric.error) {
          acc.errorCount += 1;
        }

        // Per-provider breakdown
        const p = metric.provider;
        if (!byProvider[p]) byProvider[p] = { requests: 0, tokens: 0, cost: 0 };
        byProvider[p].requests += 1;
        byProvider[p].tokens += metric.totalTokens;
        byProvider[p].cost += metric.estimatedCostUsd;

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
      byProvider,
    };
  },
});

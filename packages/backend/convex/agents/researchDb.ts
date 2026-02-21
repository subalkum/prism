import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { hybridScore } from "../rag/retrieve";
import { snippet } from "../lib/utils";

// ---------------------------------------------------------------------------
// Internal query: gather RAG chunks, preferences, memories for a research run
// ---------------------------------------------------------------------------

export const getSessionData = internalQuery({
  args: {
    userId: v.string(),
    query: v.string(),
    mode: v.union(v.literal("quick"), v.literal("deep")),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .unique();

    const allChunks = await ctx.db.query("ragChunks").collect();
    const limit = args.mode === "quick" ? 4 : 8;
    const ranked = allChunks
      .map((chunk) => ({ chunk, relevance: hybridScore(args.query, chunk.content) }))
      .filter((x) => x.relevance > 0.05)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);

    const sources: Record<string, { sourceUrl: string; title: string }> = {};
    for (const item of ranked) {
      const src = await ctx.db.get(item.chunk.sourceId);
      if (src) {
        sources[String(item.chunk.sourceId)] = {
          sourceUrl: src.sourceUrl,
          title: src.title,
        };
      }
    }

    // Fetch more memories for richer context (10 instead of 5)
    const memories = await ctx.db
      .query("episodicMemories")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(10);

    // Also fetch previous conversation messages from this session if a follow-up
    const previousContext: string[] = [];

    return {
      preferences: profile?.preferences ?? {
        prefersCodeExamples: true,
        responseVerbosity: "balanced" as const,
        citationStyle: "inline" as const,
      },
      ranked: ranked.map((r) => ({
        chunkId: String(r.chunk._id),
        sourceId: String(r.chunk.sourceId),
        content: r.chunk.content,
        heading: r.chunk.heading,
        relevance: r.relevance,
      })),
      sources,
      recentMemories: memories.map((m) => m.summary),
      memoryTags: memories.flatMap((m) => m.tags),
      previousContext,
    };
  },
});

// ---------------------------------------------------------------------------
// Internal mutation: persist all research outputs to the DB
// ---------------------------------------------------------------------------

export const persistResearchResult = internalMutation({
  args: {
    userId: v.string(),
    query: v.string(),
    mode: v.union(v.literal("quick"), v.literal("deep")),
    sessionId: v.optional(v.id("sessions")),
    parentInsightId: v.optional(v.id("insights")),
    answer: v.string(),
    status: v.union(
      v.literal("answered"),
      v.literal("needs_clarification"),
      v.literal("fallback"),
    ),
    citations: v.array(
      v.object({
        sourceId: v.string(),
        chunkId: v.string(),
        title: v.string(),
        url: v.string(),
        snippet: v.string(),
        relevance: v.number(),
      }),
    ),
    tradeoffs: v.array(
      v.object({
        option: v.string(),
        pros: v.array(v.string()),
        cons: v.array(v.string()),
      }),
    ),
    followUpQuestions: v.array(v.string()),
    clarificationPrompt: v.optional(
      v.object({ question: v.string(), reason: v.string() }),
    ),
    confidence: v.number(),
    limitations: v.array(v.string()),
    provider: v.string(),
    model: v.string(),
    route: v.union(v.literal("primary"), v.literal("fallback")),
    promptTokens: v.number(),
    completionTokens: v.number(),
    totalTokens: v.number(),
    estimatedCostUsd: v.number(),
    latencyMs: v.number(),
    llmError: v.optional(v.string()),
    memorySummary: v.optional(v.string()),
    memoryTags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const sessionId =
      args.sessionId ??
      (await ctx.db.insert("sessions", {
        userId: args.userId,
        title: args.query.slice(0, 80),
        mode: args.mode,
        status: "active",
        latestQuery: args.query,
        parentInsightId: args.parentInsightId,
        createdAt: now,
        updatedAt: now,
      }));

    if (args.sessionId) {
      await ctx.db.patch(args.sessionId, {
        latestQuery: args.query,
        mode: args.mode,
        updatedAt: now,
      });
    }

    await ctx.db.insert("messages", {
      sessionId,
      role: "user",
      content: args.query,
      metadata: {},
      createdAt: now,
    });

    const usageLogId = await ctx.db.insert("usageLogs", {
      sessionId,
      query: args.query,
      model: args.model,
      provider: args.provider,
      route: args.route,
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      totalTokens: args.totalTokens,
      estimatedCostUsd: args.estimatedCostUsd,
      latencyMs: args.latencyMs,
      error: args.llmError,
      createdAt: now,
    });

    const insightId = await ctx.db.insert("insights", {
      sessionId,
      mode: args.mode,
      status: args.status,
      answer: args.answer,
      tradeoffs: args.tradeoffs,
      followUpQuestions: args.followUpQuestions,
      clarificationPrompt: args.clarificationPrompt,
      confidence: args.confidence,
      limitations: args.limitations,
      telemetryId: usageLogId,
      createdAt: now,
    });

    for (const c of args.citations) {
      await ctx.db.insert("citations", {
        sessionId,
        insightId,
        sourceId: c.sourceId as never,
        chunkId: c.chunkId as never,
        title: c.title,
        url: c.url,
        snippet: c.snippet,
        relevance: c.relevance,
        createdAt: now,
      });
    }

    await ctx.db.insert("messages", {
      sessionId,
      role: "assistant",
      content: args.answer,
      metadata: {
        confidence: args.confidence,
        model: args.model,
      },
      createdAt: now,
    });

    await ctx.db.patch(sessionId, {
      status:
        args.status === "needs_clarification"
          ? "needs_clarification"
          : "completed",
      updatedAt: now,
    });

    // Create episodic memory with LLM-generated summary (or fallback to snippet)
    if (args.status !== "needs_clarification") {
      const summary = args.memorySummary ?? snippet(args.answer, 280);

      // Extract topic tags from query for better memory retrieval
      const queryTags = args.memoryTags ?? [
        "research",
        args.mode,
        args.provider,
      ];

      // Dedup: check if a very similar memory already exists (same session)
      const existingMemories = await ctx.db
        .query("episodicMemories")
        .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
        .order("desc")
        .take(3);

      const isDuplicate = existingMemories.some(
        (m) => m.sessionId === sessionId && m.summary.slice(0, 80) === summary.slice(0, 80),
      );

      if (!isDuplicate) {
        await ctx.db.insert("episodicMemories", {
          userId: args.userId,
          sessionId,
          insightId,
          summary,
          decisions: [
            args.mode === "deep"
              ? "deep_analysis_generated"
              : "quick_answer_generated",
          ],
          tags: queryTags,
          createdAt: now,
        });
      }
    }

    return { sessionId, insightId };
  },
});

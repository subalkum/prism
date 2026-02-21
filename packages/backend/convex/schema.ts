import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  profiles: defineTable({
    userId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    preferences: v.object({
      prefersCodeExamples: v.boolean(),
      responseVerbosity: v.union(
        v.literal("concise"),
        v.literal("balanced"),
        v.literal("detailed"),
      ),
      citationStyle: v.union(v.literal("inline"), v.literal("footnote")),
    }),
    updatedAt: v.number(),
    createdAt: v.number(),
  }).index("by_user_id", ["userId"]),

  sessions: defineTable({
    userId: v.string(),
    title: v.string(),
    mode: v.union(v.literal("quick"), v.literal("deep")),
    status: v.union(
      v.literal("active"),
      v.literal("needs_clarification"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    latestQuery: v.string(),
    parentInsightId: v.optional(v.id("insights")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_mode", ["userId", "mode"])
    .index("by_user_updated", ["userId", "updatedAt"]),

  messages: defineTable({
    sessionId: v.id("sessions"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    metadata: v.optional(
      v.object({
        ambiguityScore: v.optional(v.number()),
        confidence: v.optional(v.number()),
        model: v.optional(v.string()),
      }),
    ),
    createdAt: v.number(),
  }).index("by_session_id", ["sessionId"]),

  citations: defineTable({
    sessionId: v.id("sessions"),
    insightId: v.id("insights"),
    sourceId: v.id("sources"),
    chunkId: v.optional(v.id("ragChunks")),
    title: v.string(),
    url: v.string(),
    snippet: v.string(),
    relevance: v.number(),
    createdAt: v.number(),
  })
    .index("by_session_id", ["sessionId"])
    .index("by_insight_id", ["insightId"]),

  insights: defineTable({
    sessionId: v.id("sessions"),
    mode: v.union(v.literal("quick"), v.literal("deep")),
    status: v.union(
      v.literal("answered"),
      v.literal("needs_clarification"),
      v.literal("fallback"),
    ),
    answer: v.string(),
    tradeoffs: v.array(
      v.object({
        option: v.string(),
        pros: v.array(v.string()),
        cons: v.array(v.string()),
      }),
    ),
    followUpQuestions: v.array(v.string()),
    clarificationPrompt: v.optional(
      v.object({
        question: v.string(),
        reason: v.string(),
      }),
    ),
    confidence: v.number(),
    limitations: v.array(v.string()),
    telemetryId: v.optional(v.id("usageLogs")),
    createdAt: v.number(),
  }).index("by_session_id", ["sessionId"]),

  sources: defineTable({
    userId: v.optional(v.string()),
    sourceType: v.union(v.literal("url"), v.literal("upload"), v.literal("report")),
    sourceUrl: v.string(),
    title: v.string(),
    contentHash: v.string(),
    metadata: v.object({
      strategy: v.union(
        v.literal("fixed"),
        v.literal("heading-aware"),
        v.literal("semantic"),
      ),
      tokenEstimate: v.number(),
      charCount: v.number(),
    }),
    createdAt: v.number(),
  })
    .index("by_source_url", ["sourceUrl"])
    .index("by_hash", ["contentHash"]),

  ragDocuments: defineTable({
    sourceId: v.id("sources"),
    title: v.string(),
    sourceUrl: v.string(),
    chunkStrategy: v.union(
      v.literal("fixed"),
      v.literal("heading-aware"),
      v.literal("semantic"),
    ),
    metadata: v.object({
      chunkCount: v.number(),
      tokenEstimate: v.number(),
      language: v.string(),
    }),
    createdAt: v.number(),
  }).index("by_source_id", ["sourceId"]),

  ragChunks: defineTable({
    documentId: v.id("ragDocuments"),
    sourceId: v.id("sources"),
    chunkIndex: v.number(),
    heading: v.optional(v.string()),
    content: v.string(),
    embeddingKey: v.optional(v.string()),
    tokenEstimate: v.number(),
    metadata: v.object({
      strategy: v.union(
        v.literal("fixed"),
        v.literal("heading-aware"),
        v.literal("semantic"),
      ),
      startOffset: v.number(),
      endOffset: v.number(),
    }),
    createdAt: v.number(),
  })
    .index("by_document_id", ["documentId"])
    .index("by_source_id", ["sourceId"]),

  episodicMemories: defineTable({
    userId: v.string(),
    sessionId: v.id("sessions"),
    insightId: v.optional(v.id("insights")),
    summary: v.string(),
    decisions: v.array(v.string()),
    tags: v.array(v.string()),
    createdAt: v.number(),
  }).index("by_user_id", ["userId"]),

  usageLogs: defineTable({
    sessionId: v.optional(v.id("sessions")),
    query: v.string(),
    model: v.string(),
    provider: v.string(),
    route: v.union(v.literal("primary"), v.literal("fallback")),
    promptTokens: v.number(),
    completionTokens: v.number(),
    totalTokens: v.number(),
    estimatedCostUsd: v.number(),
    latencyMs: v.number(),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_session_id", ["sessionId"])
    .index("by_created_at", ["createdAt"]),
});


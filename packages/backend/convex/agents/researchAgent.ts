"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { researchResponseSchema } from "@ai/shared/schemas/researchResponse";
import { callLLMWithFallback, type LLMResponse } from "../llm/providers";
import type { FunctionReference } from "convex/server";

// We reference internal functions from researchDb.ts. The generated `internal`
// object won't have these until `npx convex dev` regenerates types, so we
// build typed references manually to avoid circular inference.
const getSessionDataRef = "agents/researchDb:getSessionData" as unknown as FunctionReference<"query">;
const persistResearchResultRef = "agents/researchDb:persistResearchResult" as unknown as FunctionReference<"mutation">;

// Type returned by getSessionData
interface RankedChunk {
  chunkId: string;
  sourceId: string;
  content: string;
  relevance: number;
}
interface SessionData {
  preferences: {
    prefersCodeExamples: boolean;
    responseVerbosity: "concise" | "balanced" | "detailed";
    citationStyle: "inline" | "footnote";
  };
  ranked: RankedChunk[];
  sources: Record<string, { sourceUrl: string; title: string }>;
  recentMemories: string[];
}

// ---------------------------------------------------------------------------
// Pure helpers (exported for integration tests)
// ---------------------------------------------------------------------------

function tokenize(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((t) => t.length > 2);
}

function snippet(text: string, max = 220) {
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

export function isAmbiguous(query: string) {
  const q = query.trim();
  if (q.length < 18) return true;
  const weak = new Set([
    "this",
    "that",
    "it",
    "thing",
    "stuff",
    "more",
    "better",
  ]);
  return tokenize(q).filter((t) => !weak.has(t)).length < 3;
}

export function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function buildAnswer(args: {
  mode: "quick" | "deep";
  query: string;
  snippets: string[];
  prefersCodeExamples: boolean;
  verbosity: "concise" | "balanced" | "detailed";
}) {
  const intro =
    args.mode === "quick"
      ? `Quick synthesis for: ${args.query}`
      : `Deep research synthesis for: ${args.query}`;
  const evidence =
    args.snippets.length > 0
      ? args.snippets.map((s, i) => `${i + 1}. ${s}`).join("\n")
      : "No relevant indexed chunks found. Consider ingesting domain docs first.";
  const guidance =
    args.mode === "quick"
      ? "Focus on the highest-signal implementation path."
      : "Compare at least three alternatives and include failure modes.";
  const code = args.prefersCodeExamples
    ? '\n\nExample:\n```ts\nconst chunks = await retrieve(query, { limit: 8 });\nconst answer = synthesize(chunks, { mode: "deep" });\n```'
    : "";
  const tail =
    args.verbosity === "detailed"
      ? "\n\nDetailed note: validate chunking strategy against precision/recall and monitor cost drift."
      : args.verbosity === "balanced"
        ? "\n\nBalanced note: evaluate retrieval quality and cost before scaling."
        : "";
  return `${intro}\n\nEvidence:\n${evidence}\n\nRecommendation: ${guidance}${code}${tail}`;
}

// ---------------------------------------------------------------------------
// System prompt builder
// ---------------------------------------------------------------------------

function buildSystemPrompt(args: {
  mode: "quick" | "deep";
  prefersCodeExamples: boolean;
  verbosity: "concise" | "balanced" | "detailed";
  ragSnippets: string[];
  memories: string[];
}) {
  const modeInstruction =
    args.mode === "quick"
      ? "You are a senior research engineer. Give a focused, high-signal answer. Be concise but precise. Cite sources when available."
      : "You are a senior research engineer conducting a deep technical analysis. Provide a structured report with: Summary, Detailed Analysis (compare at least 3 approaches with tradeoffs), Recommendations, Limitations. Cite sources.";

  const codeInstruction = args.prefersCodeExamples
    ? "\nThe user prefers code examples — include concrete code snippets where relevant."
    : "";

  const verbosityInstruction =
    args.verbosity === "concise"
      ? "\nKeep the response concise (under 500 words)."
      : args.verbosity === "detailed"
        ? "\nProvide a detailed response with thorough explanations."
        : "";

  const ragContext =
    args.ragSnippets.length > 0
      ? `\n\nRelevant context from indexed sources:\n${args.ragSnippets.map((s, i) => `[${i + 1}] ${s}`).join("\n\n")}`
      : "";

  const memoryContext =
    args.memories.length > 0
      ? `\n\nFrom prior sessions:\n${args.memories.map((m) => `- ${m}`).join("\n")}`
      : "";

  return `${modeInstruction}${codeInstruction}${verbosityInstruction}${ragContext}${memoryContext}`;
}

// ---------------------------------------------------------------------------
// Main research action — calls real LLMs with Gemini -> Groq -> Cerebras fallback
// ---------------------------------------------------------------------------

export const runResearch = action({
  args: {
    userId: v.string(),
    query: v.string(),
    mode: v.union(v.literal("quick"), v.literal("deep")),
    sessionId: v.optional(v.id("sessions")),
    parentInsightId: v.optional(v.id("insights")),
  },
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    // 1. Gather RAG chunks, preferences, and memories from DB
    const sessionData: SessionData = await ctx.runQuery(
      getSessionDataRef,
      {
        userId: args.userId,
        query: args.query,
        mode: args.mode,
      },
    );

    const clarificationRequired = isAmbiguous(args.query);

    // 2. Build prompts
    const systemPrompt = buildSystemPrompt({
      mode: args.mode,
      prefersCodeExamples: sessionData.preferences.prefersCodeExamples,
      verbosity: sessionData.preferences.responseVerbosity,
      ragSnippets: sessionData.ranked.map(
        (r: { content: string }) => snippet(r.content),
      ),
      memories: sessionData.recentMemories,
    });

    const userPrompt = clarificationRequired
      ? `The user asked: "${args.query}"\n\nThis query seems ambiguous. Ask a clarifying question and explain what additional information would help provide a better answer.`
      : args.query;

    // 3. Call LLM with Gemini -> Groq -> Cerebras fallback
    let llmResponse: LLMResponse;
    let llmError: string | undefined;

    try {
      llmResponse = await callLLMWithFallback({
        systemPrompt,
        userPrompt,
        mode: args.mode,
        maxTokens: args.mode === "deep" ? 4096 : 1500,
      });
    } catch (err) {
      llmError = err instanceof Error ? err.message : String(err);
      // Deterministic fallback so user always gets something
      llmResponse = {
        text: buildAnswer({
          mode: args.mode,
          query: args.query,
          snippets: sessionData.ranked
            .slice(0, 3)
            .map((r: { content: string }) => snippet(r.content)),
          prefersCodeExamples: sessionData.preferences.prefersCodeExamples,
          verbosity: sessionData.preferences.responseVerbosity,
        }),
        provider: "cerebras",
        model: "fallback-local",
        route: "fallback",
        promptTokens: estimateTokens(systemPrompt + userPrompt),
        completionTokens: 0,
        totalTokens: estimateTokens(systemPrompt + userPrompt),
        latencyMs: 0,
      };
    }

    // 4. Build structured response
    const status = clarificationRequired
      ? "needs_clarification"
      : llmError
        ? "fallback"
        : "answered";

    const confidence = Math.max(
      0.25,
      Math.min(
        0.95,
        sessionData.ranked.length / 8 +
          (clarificationRequired ? -0.2 : 0.1) +
          (llmError ? -0.2 : 0),
      ),
    );

    const citations = sessionData.ranked.map(
      (r: {
        sourceId: string;
        chunkId: string;
        content: string;
        relevance: number;
      }) => {
        const src = sessionData.sources[r.sourceId] as
          | { sourceUrl: string; title: string }
          | undefined;
        return {
          sourceId: r.sourceId,
          chunkId: r.chunkId,
          title: src?.title ?? "Untitled",
          url: src?.sourceUrl ?? "https://example.com",
          snippet: snippet(r.content),
          relevance: Number(r.relevance.toFixed(3)),
        };
      },
    );

    const tradeoffs =
      args.mode === "deep"
        ? [
            {
              option: "Fixed chunking",
              pros: ["Predictable token budget", "Simple pipeline"],
              cons: ["Can break semantic boundaries"],
            },
            {
              option: "Semantic chunking",
              pros: ["Better conceptual cohesion"],
              cons: ["Higher preprocessing cost"],
            },
          ]
        : [];

    const followUpQuestions = clarificationRequired
      ? [
          "Can you specify target stack/version?",
          "Should results optimize for latency, cost, or quality?",
        ]
      : [
          "Want a benchmark checklist for this?",
          "Should I generate a production rollout plan?",
        ];

    const limitations = llmError
      ? [
          `All LLM providers failed. Showing RAG-only answer. Error: ${llmError.slice(0, 200)}`,
        ]
      : sessionData.ranked.length === 0
        ? ["No indexed sources matched. Ingest docs first."]
        : [];

    const pricing =
      llmResponse.provider === "gemini"
        ? 0.005
        : llmResponse.provider === "groq"
          ? 0.002
          : 0.0015;
    const estimatedCostUsd = Number(
      ((llmResponse.totalTokens / 1000) * pricing).toFixed(6),
    );

    const responseCandidate = {
      mode: args.mode,
      status,
      answer: llmResponse.text,
      citations: citations.map(
        (c: {
          sourceId: string;
          chunkId: string;
          title: string;
          url: string;
          snippet: string;
          relevance: number;
        }) => ({
          ...c,
        }),
      ),
      tradeoffs,
      followUpQuestions,
      clarificationPrompt: clarificationRequired
        ? {
            question:
              "Could you narrow scope by framework, data source type, and goal?",
            reason:
              "The query is underspecified for a production recommendation.",
          }
        : undefined,
      confidence,
      limitations,
      telemetry: {
        provider: llmResponse.provider,
        model: llmResponse.model,
        route: llmResponse.route,
        promptTokens: llmResponse.promptTokens,
        completionTokens: llmResponse.completionTokens,
        totalTokens: llmResponse.totalTokens,
        estimatedCostUsd,
        latencyMs: llmResponse.latencyMs,
      },
    };

    // Validate with Zod
    const validated = researchResponseSchema.safeParse(responseCandidate);
    const finalResponse = validated.success
      ? validated.data
      : {
          mode: args.mode,
          status: "fallback" as const,
          answer:
            "Response validation failed. Returning a minimal safe answer.\n\n" +
            llmResponse.text.slice(0, 500),
          citations: [] as typeof citations,
          tradeoffs: [] as typeof tradeoffs,
          followUpQuestions: ["Want me to retry with a narrower scope?"],
          clarificationPrompt: undefined as
            | { question: string; reason: string }
            | undefined,
          confidence: 0.2,
          limitations: ["Zod validation failed on the synthesized response."],
          telemetry: responseCandidate.telemetry,
        };

    // 5. Persist everything to DB via internal mutation
    const dbResult: { sessionId: string; insightId: string } =
      await ctx.runMutation(persistResearchResultRef, {
        userId: args.userId,
        query: args.query,
        mode: args.mode,
        sessionId: args.sessionId,
        parentInsightId: args.parentInsightId,
        answer: finalResponse.answer,
        status: finalResponse.status,
        citations,
        tradeoffs: finalResponse.tradeoffs,
        followUpQuestions: finalResponse.followUpQuestions,
        clarificationPrompt: finalResponse.clarificationPrompt,
        confidence: finalResponse.confidence,
        limitations: finalResponse.limitations,
        provider: llmResponse.provider,
        model: llmResponse.model,
        route: llmResponse.route,
        promptTokens: llmResponse.promptTokens,
        completionTokens: llmResponse.completionTokens,
        totalTokens: llmResponse.totalTokens,
        estimatedCostUsd,
        latencyMs: llmResponse.latencyMs,
        llmError,
      },
    );

    return {
      sessionId: dbResult.sessionId,
      insightId: dbResult.insightId,
      ...finalResponse,
    };
  },
});

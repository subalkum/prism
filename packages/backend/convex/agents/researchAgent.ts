"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { researchResponseSchema } from "@ai/shared/schemas/researchResponse";
import { callLLMWithFallback, type LLMResponse } from "../llm/providers";
import type { FunctionReference } from "convex/server";
import {
  snippet,
  estimateTokens,
  estimateCost,
  isAmbiguous,
  tokenize,
  computeConfidence,
  extractLLMConfidence,
  hasCodeBlocks,
  hasStructuredSections,
  type ConfidenceSignals,
} from "../lib/utils";

// ---------------------------------------------------------------------------
// Internal function references (avoids circular codegen dependency)
// ---------------------------------------------------------------------------
const getSessionDataRef = "agents/researchDb:getSessionData" as unknown as FunctionReference<"query">;
const persistResearchResultRef = "agents/researchDb:persistResearchResult" as unknown as FunctionReference<"mutation">;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface RankedChunk {
  chunkId: string;
  sourceId: string;
  content: string;
  heading?: string;
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
  memoryTags: string[];
  previousContext: string[];
}

// ---------------------------------------------------------------------------
// Deterministic fallback answer (when ALL LLM providers fail)
// ---------------------------------------------------------------------------

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
// System prompt builder — now with inline citation labels & structured output
// ---------------------------------------------------------------------------

function buildSystemPrompt(args: {
  mode: "quick" | "deep";
  prefersCodeExamples: boolean;
  verbosity: "concise" | "balanced" | "detailed";
  ragSnippets: Array<{ label: number; title: string; url: string; snippet: string }>;
  memories: string[];
  citationStyle: "inline" | "footnote";
}) {
  const modeInstruction =
    args.mode === "quick"
      ? `You are a senior research engineer. Give a focused, high-signal answer. Be concise but precise.`
      : `You are a senior research engineer conducting a deep technical analysis. Provide a structured report with:
## Summary
Brief overview of findings.

## Detailed Analysis
Compare at least 3 approaches with tradeoffs. Use tables where appropriate.

## Recommendations
Actionable next steps with rationale.

## Limitations
What's unknown or uncertain.`;

  const codeInstruction = args.prefersCodeExamples
    ? "\nThe user prefers code examples — include concrete, runnable code snippets where relevant. Use TypeScript unless the context suggests otherwise."
    : "";

  const verbosityInstruction =
    args.verbosity === "concise"
      ? "\nKeep the response concise (under 500 words)."
      : args.verbosity === "detailed"
        ? "\nProvide a detailed response with thorough explanations (1000+ words for deep mode)."
        : "";

  // Citation context with numbered labels
  const ragContext =
    args.ragSnippets.length > 0
      ? `\n\nRelevant context from indexed sources (use these citations inline as [1], [2], etc.):\n${args.ragSnippets
          .map((s) => `[${s.label}] "${s.title}" (${s.url})\n${s.snippet}`)
          .join("\n\n")}`
      : "";

  const citationInstruction =
    args.ragSnippets.length > 0
      ? `\n\nIMPORTANT: When referencing information from the sources above, use inline citation markers like [1], [2], etc. to indicate which source supports each claim.`
      : "";

  const memoryContext =
    args.memories.length > 0
      ? `\n\nFrom prior research sessions with this user:\n${args.memories.map((m) => `- ${m}`).join("\n")}`
      : "";

  // Structured output instructions for follow-ups and tradeoffs
  const structuredOutputInstructions = `

IMPORTANT: At the very end of your response, include this exact block (it will be parsed and removed from the displayed answer):

\`\`\`json:metadata
{
  "followUpQuestions": ["<3 context-specific follow-up questions the user might want to ask next>"],
  "tradeoffs": [${args.mode === "deep" ? `
    {"option": "<approach 1 name>", "pros": ["<pro1>", "<pro2>"], "cons": ["<con1>", "<con2>"]},
    {"option": "<approach 2 name>", "pros": ["<pro1>", "<pro2>"], "cons": ["<con1>", "<con2>"]}` : ""}
  ],
  "confidence": <your confidence in this answer from 0.0 to 1.0, be honest about uncertainty>
}
\`\`\``;

  return `${modeInstruction}${codeInstruction}${verbosityInstruction}${ragContext}${citationInstruction}${memoryContext}${structuredOutputInstructions}`;
}

// ---------------------------------------------------------------------------
// Parse structured metadata block from LLM response
// ---------------------------------------------------------------------------

interface ParsedMetadata {
  followUpQuestions: string[];
  tradeoffs: Array<{ option: string; pros: string[]; cons: string[] }>;
  confidence: number | null;
}

function parseStructuredOutput(text: string): {
  cleanAnswer: string;
  metadata: ParsedMetadata;
} {
  const defaultMetadata: ParsedMetadata = {
    followUpQuestions: [],
    tradeoffs: [],
    confidence: null,
  };

  // Match ```json:metadata ... ``` block
  const metadataPattern = /```json:metadata\s*\n([\s\S]*?)```/;
  const match = text.match(metadataPattern);

  if (!match) {
    // Try alternative: <!-- confidence: X.X --> format
    const { confidence, cleanText } = extractLLMConfidence(text);
    return {
      cleanAnswer: cleanText,
      metadata: { ...defaultMetadata, confidence },
    };
  }

  const cleanAnswer = text.replace(metadataPattern, "").trim();
  try {
    const parsed = JSON.parse(match[1]);
    return {
      cleanAnswer,
      metadata: {
        followUpQuestions: Array.isArray(parsed.followUpQuestions)
          ? parsed.followUpQuestions.filter((q: unknown) => typeof q === "string").slice(0, 5)
          : [],
        tradeoffs: Array.isArray(parsed.tradeoffs)
          ? parsed.tradeoffs
              .filter(
                (t: Record<string, unknown>) =>
                  typeof t === "object" &&
                  t !== null &&
                  typeof t.option === "string",
              )
              .map((t: Record<string, unknown>) => ({
                option: String(t.option),
                pros: Array.isArray(t.pros) ? t.pros.map(String) : [],
                cons: Array.isArray(t.cons) ? t.cons.map(String) : [],
              }))
          : [],
        confidence:
          typeof parsed.confidence === "number"
            ? Math.min(1, Math.max(0, parsed.confidence))
            : null,
      },
    };
  } catch {
    return { cleanAnswer, metadata: defaultMetadata };
  }
}

// ---------------------------------------------------------------------------
// Generate memory summary via LLM (quick call)
// ---------------------------------------------------------------------------

async function generateMemorySummary(
  query: string,
  answer: string,
): Promise<{ summary: string; tags: string[] }> {
  try {
    const resp = await callLLMWithFallback({
      systemPrompt:
        "You are a concise summarizer. Given a research query and answer, produce a 1-2 sentence summary of the key finding and a list of 3-5 topic tags. Respond in JSON: {\"summary\": \"...\", \"tags\": [\"tag1\", \"tag2\"]}",
      userPrompt: `Query: ${query}\n\nAnswer (first 500 chars): ${answer.slice(0, 500)}`,
      mode: "quick",
      maxTokens: 200,
    });
    const parsed = JSON.parse(resp.text);
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 300) : answer.slice(0, 280),
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 5) : [],
    };
  } catch {
    // Fallback: first 280 chars + basic tags from query
    return {
      summary: answer.slice(0, 280),
      tags: tokenize(query).slice(0, 5),
    };
  }
}

// ---------------------------------------------------------------------------
// Main research action
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
    const sessionData: SessionData = await ctx.runQuery(getSessionDataRef, {
      userId: args.userId,
      query: args.query,
      mode: args.mode,
    });

    const clarificationRequired = isAmbiguous(args.query);

    // 2. Build numbered citation labels for RAG snippets
    const citationMap = sessionData.ranked.map((r, i) => {
      const src = sessionData.sources[r.sourceId] as
        | { sourceUrl: string; title: string }
        | undefined;
      return {
        label: i + 1,
        title: src?.title ?? "Untitled",
        url: src?.sourceUrl ?? "https://example.com",
        snippet: snippet(r.content),
        sourceId: r.sourceId,
        chunkId: r.chunkId,
        relevance: r.relevance,
      };
    });

    // 3. Build prompts
    const systemPrompt = buildSystemPrompt({
      mode: args.mode,
      prefersCodeExamples: sessionData.preferences.prefersCodeExamples,
      verbosity: sessionData.preferences.responseVerbosity,
      ragSnippets: citationMap,
      memories: sessionData.recentMemories,
      citationStyle: sessionData.preferences.citationStyle,
    });

    const userPrompt = clarificationRequired
      ? `The user asked: "${args.query}"\n\nThis query seems ambiguous or too short. Ask a specific clarifying question and explain what additional details would help you provide a better, more targeted answer.`
      : args.query;

    // 4. Call LLM with fallback chain
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
      llmResponse = {
        text: buildAnswer({
          mode: args.mode,
          query: args.query,
          snippets: sessionData.ranked
            .slice(0, 3)
            .map((r) => snippet(r.content)),
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

    // 5. Parse structured metadata from LLM response
    const { cleanAnswer, metadata } = parseStructuredOutput(llmResponse.text);

    // 6. Build response status
    const status = clarificationRequired
      ? "needs_clarification"
      : llmError
        ? "fallback"
        : "answered";

    // 7. Multi-signal confidence scoring
    const avgRelevance =
      sessionData.ranked.length > 0
        ? sessionData.ranked.reduce((sum, r) => sum + r.relevance, 0) / sessionData.ranked.length
        : 0;

    const distinctSources = new Set(sessionData.ranked.map((r) => r.sourceId)).size;
    const maxChunks = args.mode === "quick" ? 4 : 8;

    const confidenceSignals: ConfidenceSignals = {
      avgRelevance,
      sourcesCount: distinctSources,
      chunksFound: sessionData.ranked.length,
      maxChunks,
      answerLength: cleanAnswer.length,
      hasCodeBlocks: hasCodeBlocks(cleanAnswer),
      hasStructuredSections: hasStructuredSections(cleanAnswer),
      llmSelfConfidence: metadata.confidence,
      clarificationRequired,
      llmFailed: !!llmError,
      mode: args.mode,
    };

    const confidence = computeConfidence(confidenceSignals);

    // 8. Build citations with labels
    const citations = citationMap.map((c) => ({
      sourceId: c.sourceId,
      chunkId: c.chunkId,
      title: c.title,
      url: c.url,
      snippet: c.snippet,
      relevance: Number(c.relevance.toFixed(3)),
      label: c.label,
    }));

    // 9. Use LLM-generated tradeoffs (with fallback)
    const tradeoffs =
      metadata.tradeoffs.length > 0
        ? metadata.tradeoffs
        : args.mode === "deep"
          ? [
              {
                option: "Further analysis needed",
                pros: ["The LLM did not generate specific tradeoffs for this query"],
                cons: ["Consider re-running in deep mode with more specific query"],
              },
            ]
          : [];

    // 10. Use LLM-generated follow-up questions (with fallback)
    const followUpQuestions =
      metadata.followUpQuestions.length > 0
        ? metadata.followUpQuestions
        : clarificationRequired
          ? [
              "Can you specify the technology stack or framework?",
              "What is the target environment (production, dev, research)?",
              "Are you optimizing for latency, cost, or quality?",
            ]
          : [
              "How does this compare to alternative approaches?",
              "What are the production deployment considerations?",
              "Can you provide a benchmark or evaluation strategy?",
            ];

    // 11. Build clarification prompt (LLM-generated if needed)
    const clarificationPrompt = clarificationRequired
      ? {
          question: cleanAnswer.includes("?")
            ? cleanAnswer.split("?")[0] + "?"
            : "Could you provide more details about the scope, target stack, and specific goals?",
          reason: "The query needs more context for a production-quality recommendation.",
        }
      : undefined;

    // 12. Limitations
    const limitations = llmError
      ? [
          `All LLM providers failed. Showing RAG-only answer. Error: ${llmError.slice(0, 200)}`,
        ]
      : sessionData.ranked.length === 0
        ? ["No indexed sources matched this query. Ingest relevant docs for grounded answers."]
        : [];

    // 13. Cost calculation using per-model pricing
    const estimatedCostUsd = estimateCost(
      llmResponse.model,
      llmResponse.totalTokens,
    );

    const responseCandidate = {
      mode: args.mode,
      status,
      answer: cleanAnswer,
      citations,
      tradeoffs,
      followUpQuestions,
      clarificationPrompt,
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
            cleanAnswer.slice(0, 500),
          citations: [] as typeof citations,
          tradeoffs: [] as typeof tradeoffs,
          followUpQuestions: ["Want me to retry with a narrower scope?"],
          clarificationPrompt: undefined as
            | { question: string; reason: string }
            | undefined,
          confidence: 0.15,
          limitations: ["Zod validation failed on the synthesized response."],
          telemetry: responseCandidate.telemetry,
        };

    // 14. Generate memory summary (async, non-blocking fallback)
    let memorySummary: string | undefined;
    let memoryTags: string[] | undefined;
    if (status === "answered") {
      try {
        const mem = await generateMemorySummary(args.query, cleanAnswer);
        memorySummary = mem.summary;
        memoryTags = [...mem.tags, "research", args.mode, llmResponse.provider];
      } catch {
        // Fall through — researchDb will use fallback
      }
    }

    // 15. Persist everything to DB
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
        memorySummary,
        memoryTags,
      });

    return {
      sessionId: dbResult.sessionId,
      insightId: dbResult.insightId,
      ...finalResponse,
    };
  },
});

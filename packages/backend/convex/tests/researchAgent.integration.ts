import { buildAnswer, estimateTokens, isAmbiguous } from "../agents/researchAgent";
import { parsePreferenceStatement } from "../memory/preferences";
import { estimateUsageCost } from "../metrics/usage";
import { chunkByStrategy } from "../rag/ingest";
import { lexicalScore } from "../rag/retrieve";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

export function runResearchAgentIntegrationSuite() {
  const chunked = chunkByStrategy(
    "# Intro\nRAG systems rely on chunking.\n\n# Tradeoffs\nSemantic chunking improves context continuity.",
    "heading-aware",
  );
  assert(chunked.length >= 2, "Heading-aware chunking should split into multiple chunks.");

  const score = lexicalScore("semantic chunking continuity", chunked[1]?.text ?? "");
  assert(score > 0, "Retrieval scorer should detect overlapping query terms.");

  const parsedPreference = parsePreferenceStatement(
    "Remember I prefer code examples and detailed explanations.",
  );
  assert(parsedPreference.prefersCodeExamples, "Preference parsing should detect code example preference.");
  assert(parsedPreference.responseVerbosity === "detailed", "Preference parsing should detect detailed verbosity.");

  const answer = buildAnswer({
    mode: "deep",
    query: "Compare semantic vs fixed chunking for RAG",
    snippets: chunked.map((chunk) => chunk.text.slice(0, 80)),
    prefersCodeExamples: true,
    verbosity: "balanced",
  });
  assert(answer.includes("Deep research synthesis"), "Deep mode answer should include deep synthesis marker.");

  assert(isAmbiguous("What about this?"), "Short vague prompt should be considered ambiguous.");
  assert(!isAmbiguous("Compare LoRA and full fine-tuning with token cost and latency tradeoffs"), "Specific prompt should not be considered ambiguous.");

  const promptTokens = estimateTokens("short prompt");
  const completionTokens = estimateTokens(answer);
  const cost = estimateUsageCost("gemini", promptTokens + completionTokens);
  assert(cost >= 0, "Cost estimation should always be non-negative.");

  return {
    chunkCount: chunked.length,
    score,
    promptTokens,
    completionTokens,
    estimatedCostUsd: cost,
  };
}

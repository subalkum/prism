/**
 * Shared utilities used across the research agent pipeline.
 * Single source of truth for tokenization, scoring, cost estimation, etc.
 */

// ---------------------------------------------------------------------------
// Text processing
// ---------------------------------------------------------------------------

/** Lowercase alphanumeric tokenizer, filters tokens <= 2 chars */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((t) => t.length > 2);
}

/** Collapse whitespace and truncate */
export function snippet(text: string, max = 220): string {
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

/** Rough token estimate: ~4 chars per token */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

// ---------------------------------------------------------------------------
// Lightweight stemming (strip common English suffixes)
// ---------------------------------------------------------------------------

const SUFFIX_RULES: [RegExp, string][] = [
  [/ational$/, "ate"],
  [/tional$/, "tion"],
  [/ization$/, "ize"],
  [/fulness$/, "ful"],
  [/iveness$/, "ive"],
  [/ously$/, "ous"],
  [/ously$/, "ous"],
  [/ating$/, "ate"],
  [/izing$/, "ize"],
  [/ments$/, "ment"],
  [/ement$/, ""],
  [/ings$/, ""],
  [/tion$/, ""],
  [/sion$/, ""],
  [/ness$/, ""],
  [/ment$/, ""],
  [/able$/, ""],
  [/ible$/, ""],
  [/ally$/, ""],
  [/ful$/, ""],
  [/ous$/, ""],
  [/ive$/, ""],
  [/ing$/, ""],
  [/ies$/, "y"],
  [/ied$/, "y"],
  [/ted$/, ""],
  [/ed$/, ""],
  [/ly$/, ""],
  [/er$/, ""],
  [/es$/, ""],
  [/s$/, ""],
];

export function stem(word: string): string {
  if (word.length < 4) return word;
  for (const [pattern, replacement] of SUFFIX_RULES) {
    if (pattern.test(word)) {
      const result = word.replace(pattern, replacement);
      if (result.length >= 3) return result;
    }
  }
  return word;
}

// ---------------------------------------------------------------------------
// Query expansion — synonym map for common technical terms
// ---------------------------------------------------------------------------

const SYNONYM_MAP: Record<string, string[]> = {
  llm: ["language model", "large language model", "gpt", "transformer"],
  rag: ["retrieval augmented generation", "retrieval augmented"],
  api: ["endpoint", "rest", "interface"],
  ml: ["machine learning"],
  ai: ["artificial intelligence"],
  db: ["database"],
  sql: ["structured query language", "relational database"],
  nosql: ["document database", "non relational"],
  vector: ["embedding", "semantic search"],
  embedding: ["vector", "representation"],
  chunking: ["splitting", "segmentation", "partitioning"],
  hallucination: ["confabulation", "fabrication", "incorrect generation"],
  finetuning: ["fine tuning", "fine-tuning", "training"],
  prompt: ["instruction", "input"],
  token: ["tokenization", "subword"],
  latency: ["response time", "speed", "performance"],
  throughput: ["requests per second", "bandwidth"],
  kubernetes: ["k8s", "container orchestration"],
  docker: ["container", "containerization"],
  ci: ["continuous integration"],
  cd: ["continuous deployment", "continuous delivery"],
  auth: ["authentication", "authorization"],
  oauth: ["open authorization"],
  jwt: ["json web token"],
  graphql: ["graph query language"],
  grpc: ["remote procedure call"],
  websocket: ["real time", "bidirectional"],
  microservice: ["microservices", "service mesh"],
  monolith: ["monolithic", "single service"],
  cache: ["caching", "memoization", "redis"],
  queue: ["message queue", "event bus", "kafka", "rabbitmq"],
};

/** Expand query tokens with known synonyms to improve recall */
export function expandQuery(tokens: string[]): string[] {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    const synonyms = SYNONYM_MAP[token];
    if (synonyms) {
      for (const syn of synonyms) {
        for (const synToken of tokenize(syn)) {
          expanded.add(synToken);
        }
      }
    }
  }
  return Array.from(expanded);
}

// ---------------------------------------------------------------------------
// Bigram generation
// ---------------------------------------------------------------------------

export function bigrams(tokens: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    result.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Pricing config (single source of truth)
// ---------------------------------------------------------------------------

export const PRICING_PER_1K_TOKENS: Record<string, number> = {
  // Gemini
  "gemini-2.0-flash": 0.002,
  "gemini-2.5-pro-preview-05-06": 0.01,
  // Groq
  "llama-3.3-70b-versatile": 0.002,
  // Cerebras
  "llama-3.3-70b": 0.0015,
};

/** Default fallback price per 1K tokens */
const DEFAULT_PRICE_PER_1K = 0.004;

export function estimateCost(model: string, totalTokens: number): number {
  const unitPrice = PRICING_PER_1K_TOKENS[model] ?? DEFAULT_PRICE_PER_1K;
  return Number(((totalTokens / 1000) * unitPrice).toFixed(6));
}

// ---------------------------------------------------------------------------
// Ambiguity detection
// ---------------------------------------------------------------------------

const WEAK_WORDS = new Set([
  "this", "that", "it", "thing", "stuff", "more", "better",
  "some", "any", "what", "how", "why", "can", "the", "about",
]);

export function isAmbiguous(query: string): boolean {
  const q = query.trim();
  if (q.length < 12) return true;
  const meaningful = tokenize(q).filter((t) => !WEAK_WORDS.has(t));
  return meaningful.length < 2;
}

// ---------------------------------------------------------------------------
// Confidence scoring — multi-signal
// ---------------------------------------------------------------------------

export interface ConfidenceSignals {
  /** Average relevance of top RAG chunks (0-1) */
  avgRelevance: number;
  /** Number of distinct sources cited */
  sourcesCount: number;
  /** Total RAG chunks found */
  chunksFound: number;
  /** Maximum chunks that could be retrieved for this mode */
  maxChunks: number;
  /** Answer length in characters */
  answerLength: number;
  /** Whether the answer contains code blocks */
  hasCodeBlocks: boolean;
  /** Whether the answer contains structured headings */
  hasStructuredSections: boolean;
  /** LLM self-reported confidence (0-1), if extracted */
  llmSelfConfidence: number | null;
  /** Whether a clarification was needed */
  clarificationRequired: boolean;
  /** Whether the LLM call failed */
  llmFailed: boolean;
  /** Research mode */
  mode: "quick" | "deep";
}

export function computeConfidence(signals: ConfidenceSignals): number {
  // Weight distribution:
  // RAG quality:       30%
  // Answer quality:    25%
  // LLM self-assess:   25%
  // Source coverage:    20%

  // 1. RAG signal (30%) — average relevance of retrieved chunks
  const ragCoverage = signals.maxChunks > 0
    ? signals.chunksFound / signals.maxChunks
    : 0;
  const ragSignal = signals.avgRelevance * 0.6 + ragCoverage * 0.4;

  // 2. Answer quality signal (25%)
  const minExpectedLength = signals.mode === "deep" ? 800 : 200;
  const lengthScore = Math.min(1, signals.answerLength / (minExpectedLength * 3));
  const structureBonus = (signals.hasCodeBlocks ? 0.15 : 0) +
    (signals.hasStructuredSections ? 0.15 : 0);
  const answerSignal = Math.min(1, lengthScore * 0.7 + structureBonus);

  // 3. LLM self-assessment (25%)
  const llmSignal = signals.llmSelfConfidence ?? (signals.llmFailed ? 0.2 : 0.6);

  // 4. Source coverage signal (20%)
  const sourceSignal = Math.min(1, signals.sourcesCount / 3);

  // Combine
  let raw = ragSignal * 0.30 + answerSignal * 0.25 + llmSignal * 0.25 + sourceSignal * 0.20;

  // Penalties
  if (signals.clarificationRequired) raw -= 0.15;
  if (signals.llmFailed) raw -= 0.20;

  // Clamp to [0.10, 0.95]
  return Math.max(0.10, Math.min(0.95, Number(raw.toFixed(3))));
}

/** Extract LLM self-confidence from a hidden HTML comment in the response */
export function extractLLMConfidence(text: string): { confidence: number | null; cleanText: string } {
  const pattern = /<!--\s*confidence:\s*([\d.]+)\s*-->/i;
  const match = text.match(pattern);
  if (match) {
    const val = parseFloat(match[1]);
    const confidence = isNaN(val) ? null : Math.min(1, Math.max(0, val));
    const cleanText = text.replace(pattern, "").trim();
    return { confidence, cleanText };
  }
  return { confidence: null, cleanText: text };
}

/** Check if text contains markdown code blocks */
export function hasCodeBlocks(text: string): boolean {
  return /```[\s\S]*?```/.test(text);
}

/** Check if text has structured headings (##, ###, etc.) */
export function hasStructuredSections(text: string): boolean {
  return /^#{2,4}\s+.+/m.test(text);
}

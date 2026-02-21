import { query } from "../_generated/server";
import { v } from "convex/values";
import {
  tokenize,
  snippet,
  stem,
  expandQuery,
  bigrams,
} from "../lib/utils";

// ---------------------------------------------------------------------------
// BM25-inspired scoring with bigram, stemming, and query expansion
// ---------------------------------------------------------------------------

/** BM25 parameters */
const K1 = 1.2; // term frequency saturation
const B = 0.75; // length normalization
const AVG_DOC_LENGTH = 200; // assumed average document length in tokens

/**
 * Score a document against a query using BM25-inspired term frequency with
 * diminishing returns, bigram matching, phrase matching, and stemming.
 *
 * Scoring components:
 * 1. BM25-like TF scoring per query term (with stemming)
 * 2. Bigram overlap bonus (rewards phrase coherence)
 * 3. Exact phrase match bonus
 * 4. Query expansion bonus (synonym hits)
 */
export function hybridScore(query_text: string, content: string): number {
  const queryTokens = tokenize(query_text);
  if (queryTokens.length === 0) return 0;

  const contentTokens = tokenize(content);
  if (contentTokens.length === 0) return 0;

  // Stemmed versions
  const queryStemmed = queryTokens.map(stem);
  const contentStemmed = contentTokens.map(stem);

  // Build content term frequency map (stemmed)
  const contentTF = new Map<string, number>();
  for (const t of contentStemmed) {
    contentTF.set(t, (contentTF.get(t) ?? 0) + 1);
  }

  // 1. BM25-like scoring on stemmed terms
  const docLen = contentTokens.length;
  const lenNorm = 1 - B + B * (docLen / AVG_DOC_LENGTH);
  let bm25Score = 0;

  for (const qt of queryStemmed) {
    const tf = contentTF.get(qt) ?? 0;
    if (tf > 0) {
      // BM25 TF component with saturation
      bm25Score += (tf * (K1 + 1)) / (tf + K1 * lenNorm);
    }
  }
  // Normalize by query length
  const normalizedBM25 = queryStemmed.length > 0
    ? Math.min(1, bm25Score / queryStemmed.length)
    : 0;

  // 2. Bigram overlap
  const queryBigrams = bigrams(queryStemmed);
  const contentBigramSet = new Set(bigrams(contentStemmed));
  const bigramHits = queryBigrams.filter((bg) => contentBigramSet.has(bg)).length;
  const bigramScore = queryBigrams.length > 0
    ? bigramHits / queryBigrams.length
    : 0;

  // 3. Exact phrase match
  const phraseBoost = content.toLowerCase().includes(query_text.toLowerCase().trim())
    ? 0.2
    : 0;

  // 4. Query expansion — check if synonym-expanded terms match
  const expandedTokens = expandQuery(queryTokens);
  const expandedOnly = expandedTokens.filter((t) => !queryTokens.includes(t));
  const contentSet = new Set(contentStemmed);
  const expandedHits = expandedOnly.filter((t) => contentSet.has(stem(t))).length;
  const expansionBonus = expandedOnly.length > 0
    ? (expandedHits / expandedOnly.length) * 0.15
    : 0;

  // Combine: BM25 (50%) + bigrams (20%) + phrase (15%) + expansion (15%)
  const combined = normalizedBM25 * 0.50 +
    bigramScore * 0.20 +
    phraseBoost * 0.75 + // phrase boost scaled (0.2 * 0.75 = 0.15 max contribution)
    expansionBonus;

  return Math.min(1, Number(combined.toFixed(4)));
}

/** Backward-compatible alias */
export function lexicalScore(query_text: string, content: string): number {
  return hybridScore(query_text, content);
}

export function toSnippet(content: string, max = 220): string {
  return snippet(content, max);
}

// ---------------------------------------------------------------------------
// Public query: retrieve & rank chunks
// ---------------------------------------------------------------------------

export const retrieveChunks = query({
  args: {
    query: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const safeLimit = Math.min(20, Math.max(1, Math.floor(args.limit)));
    const chunks = await ctx.db.query("ragChunks").collect();

    const ranked = chunks
      .map((chunk) => {
        const relevance = hybridScore(args.query, chunk.content);
        return { chunk, relevance };
      })
      .filter((item) => item.relevance > 0.05) // Raised threshold from 0 to reduce noise
      .sort((left, right) => right.relevance - left.relevance)
      .slice(0, safeLimit);

    const resolved = await Promise.all(
      ranked.map(async ({ chunk, relevance }) => {
        const source = await ctx.db.get(chunk.sourceId);
        return {
          chunkId: chunk._id,
          sourceId: chunk.sourceId,
          sourceUrl: source?.sourceUrl ?? "",
          title: source?.title ?? "Untitled source",
          snippet: toSnippet(chunk.content),
          relevance,
        };
      }),
    );

    return {
      query: args.query,
      limit: safeLimit,
      chunks: resolved,
    };
  },
});

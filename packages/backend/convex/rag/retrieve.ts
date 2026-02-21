import { query } from "../_generated/server";
import { v } from "convex/values";

function tokenize(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length > 2);
}

export function lexicalScore(query: string, content: string) {
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) {
    return 0;
  }

  const contentTerms = new Set(tokenize(content));
  const matches = queryTerms.filter((term) => contentTerms.has(term)).length;
  const phraseBoost = content.toLowerCase().includes(query.toLowerCase()) ? 0.2 : 0;
  return Math.min(1, matches / queryTerms.length + phraseBoost);
}

export function toSnippet(content: string, max = 220) {
  return content.replace(/\s+/g, " ").trim().slice(0, max);
}

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
        const relevance = lexicalScore(args.query, chunk.content);
        return {
          chunk,
          relevance,
        };
      })
      .filter((item) => item.relevance > 0)
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

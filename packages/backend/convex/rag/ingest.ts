import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { estimateTokens } from "../lib/utils";

export type ChunkStrategy = "fixed" | "heading-aware" | "semantic";

function toKeywordBag(text: string) {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9]+/g)
        .filter((word) => word.length > 2),
    ),
  ).slice(0, 50);
}

function chunkFixed(content: string) {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  const size = 900;
  const overlap = 120;
  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < normalized.length) {
    const end = Math.min(normalized.length, cursor + size);
    const text = normalized.slice(cursor, end).trim();
    if (text.length > 0) {
      chunks.push(text);
    }
    if (end === normalized.length) {
      break;
    }
    cursor = Math.max(end - overlap, cursor + 1);
  }
  return chunks;
}

function chunkHeadingAware(content: string) {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  const lines = normalized.split("\n");
  const chunks: Array<{ heading?: string; text: string }> = [];
  let heading = "Document";
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join("\n").trim();
    if (text.length > 0) {
      chunks.push({ heading, text });
    }
    buffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (/^(#{1,6}\s+.+|[A-Z][A-Za-z0-9 /-]{3,}:)$/.test(line)) {
      flush();
      heading = line.replace(/^#+\s*/, "").replace(/:$/, "").trim();
      continue;
    }
    buffer.push(rawLine);
    if (buffer.join("\n").length > 1000) {
      flush();
    }
  }
  flush();
  return chunks;
}

function chunkSemantic(content: string) {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  const paragraphs = normalized
    .split(/\n{2,}/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let bucket = "";

  for (const paragraph of paragraphs) {
    const candidate = bucket.length > 0 ? `${bucket}\n\n${paragraph}` : paragraph;
    if (candidate.length > 1000 && bucket.length > 0) {
      chunks.push(bucket);
      bucket = paragraph;
      continue;
    }
    bucket = candidate;
  }
  if (bucket.length > 0) {
    chunks.push(bucket);
  }
  return chunks.length > 0 ? chunks : chunkFixed(normalized);
}

export function chunkByStrategy(content: string, chunkStrategy: ChunkStrategy) {
  if (chunkStrategy === "fixed") {
    return chunkFixed(content).map((text) => ({ text, heading: undefined }));
  }
  if (chunkStrategy === "semantic") {
    return chunkSemantic(content).map((text) => ({ text, heading: undefined }));
  }
  return chunkHeadingAware(content);
}

/**
 * Generate a real content hash based on content, not timestamp.
 * Uses a simple hash of the first 500 chars + content length for dedup.
 */
function contentHash(url: string, content: string): string {
  // Simple deterministic hash from content prefix + length
  let hash = 0;
  const sample = content.slice(0, 500);
  for (let i = 0; i < sample.length; i++) {
    const char = sample.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `${url}:${content.length}:${Math.abs(hash).toString(36)}`;
}

export const ingestDocument = mutation({
  args: {
    userId: v.string(),
    sourceUrl: v.string(),
    title: v.string(),
    content: v.string(),
    chunkStrategy: v.union(
      v.literal("fixed"),
      v.literal("heading-aware"),
      v.literal("semantic"),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const contentLength = args.content.length;
    const hash = contentHash(args.sourceUrl, args.content);

    // Check for existing source with same content hash (dedup)
    const existing = await ctx.db
      .query("sources")
      .withIndex("by_hash", (q) => q.eq("contentHash", hash))
      .unique();

    if (existing) {
      return {
        accepted: false,
        sourceId: existing._id,
        documentId: null,
        sourceUrl: args.sourceUrl,
        chunkStrategy: args.chunkStrategy,
        chunkCount: 0,
        keywordBagPreview: [],
        queuedAt: now,
        message: "Duplicate content — source already ingested.",
      };
    }

    const sourceId = await ctx.db.insert("sources", {
      userId: args.userId,
      sourceType: "url",
      sourceUrl: args.sourceUrl,
      title: args.title,
      contentHash: hash,
      metadata: {
        strategy: args.chunkStrategy,
        tokenEstimate: estimateTokens(args.content),
        charCount: contentLength,
      },
      createdAt: now,
    });

    const strategy: ChunkStrategy = args.chunkStrategy;
    const chunks = chunkByStrategy(args.content, strategy);

    const documentId = await ctx.db.insert("ragDocuments", {
      sourceId,
      title: args.title,
      sourceUrl: args.sourceUrl,
      chunkStrategy: strategy,
      metadata: {
        chunkCount: chunks.length,
        tokenEstimate: estimateTokens(args.content),
        language: "en",
      },
      createdAt: now,
    });

    // Track cumulative offset for correct startOffset per chunk
    let cumulativeOffset = 0;
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
      const chunk = chunks[chunkIndex];
      await ctx.db.insert("ragChunks", {
        documentId,
        sourceId,
        chunkIndex,
        heading: chunk.heading,
        content: chunk.text,
        embeddingKey: undefined,
        tokenEstimate: estimateTokens(chunk.text),
        metadata: {
          strategy,
          startOffset: cumulativeOffset,
          endOffset: cumulativeOffset + chunk.text.length,
        },
        createdAt: now,
      });
      cumulativeOffset += chunk.text.length;
    }

    return {
      accepted: true,
      sourceId,
      documentId,
      sourceUrl: args.sourceUrl,
      chunkStrategy: strategy,
      chunkCount: chunks.length,
      keywordBagPreview: toKeywordBag(args.content).slice(0, 8),
      queuedAt: now,
    };
  },
});

export const listIngestedDocuments = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sources")
      .filter((queryBuilder) => queryBuilder.eq(queryBuilder.field("userId"), args.userId))
      .order("desc")
      .take(25);
  },
});

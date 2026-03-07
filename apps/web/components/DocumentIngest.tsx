"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type ChunkStrategy = "fixed" | "heading-aware" | "semantic";

interface IngestedDoc {
  _id: string;
  title: string;
  sourceUrl: string;
  createdAt: number;
  metadata?: {
    strategy?: string;
    tokenEstimate?: number;
    charCount?: number;
  };
}

interface IngestResult {
  accepted: boolean;
  chunkCount: number;
  chunkStrategy: string;
  message?: string;
}

export function DocumentIngest({ userId }: { userId: string }) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [chunkStrategy, setChunkStrategy] =
    useState<ChunkStrategy>("heading-aware");
  const [isIngesting, setIsIngesting] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<IngestedDoc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const res = await fetch(
        `/api/ingest?userId=${encodeURIComponent(userId)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setDocuments(Array.isArray(data) ? data : []);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingDocs(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen) fetchDocuments();
  }, [isOpen, fetchDocuments]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!content.trim() || !title.trim()) return;

    setIsIngesting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          sourceUrl: sourceUrl || `local://${title.toLowerCase().replace(/\s+/g, "-")}`,
          title,
          content,
          chunkStrategy,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message ?? "Failed to ingest document.");
      }

      setResult(data as IngestResult);
      if (data.accepted) {
        setSourceUrl("");
        setTitle("");
        setContent("");
        fetchDocuments();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setIsIngesting(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-xs font-medium text-tx-secondary transition-all hover:border-prism-300 hover:bg-prism-50 hover:text-prism-700"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
        Add Knowledge
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-5 shadow-card">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-tx">
            Knowledge Base
          </h3>
          <p className="text-[10px] text-tx-muted">
            Ingest documents for RAG-powered research
          </p>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded-lg p-1.5 text-tx-muted transition-colors hover:bg-prism-50 hover:text-tx"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Ingest form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-[1px] text-tx-muted">
              Title *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. RAG Best Practices"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-tx outline-none transition-all placeholder:text-tx-muted focus:border-prism-300 focus:ring-1 focus:ring-prism-100"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-[1px] text-tx-muted">
              Source URL
            </label>
            <input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://example.com/article (optional)"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-tx outline-none transition-all placeholder:text-tx-muted focus:border-prism-300 focus:ring-1 focus:ring-prism-100"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-[1px] text-tx-muted">
            Content *
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            placeholder="Paste the document content here... Markdown, plain text, or any structured text works."
            className="resize-none rounded-lg border border-border bg-surface px-3 py-2 text-xs leading-relaxed text-tx outline-none transition-all placeholder:text-tx-muted focus:border-prism-300 focus:ring-1 focus:ring-prism-100"
          />
          {content.length > 0 && (
            <p className="text-[10px] text-tx-muted">
              {content.length.toLocaleString()} chars
            </p>
          )}
        </div>

        {/* Chunk strategy selector */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-[1px] text-tx-muted">
            Chunking Strategy
          </label>
          <div className="flex gap-1.5">
            {(
              [
                {
                  key: "heading-aware" as const,
                  label: "Heading-Aware",
                  desc: "Splits on headings",
                },
                {
                  key: "semantic" as const,
                  label: "Semantic",
                  desc: "Paragraph boundaries",
                },
                {
                  key: "fixed" as const,
                  label: "Fixed",
                  desc: "900-char windows",
                },
              ] as const
            ).map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setChunkStrategy(s.key)}
                className={`flex-1 rounded-lg border px-2.5 py-2 text-center transition-all ${
                  chunkStrategy === s.key
                    ? "border-prism-300 bg-prism-50 text-prism-700"
                    : "border-border bg-surface text-tx-secondary hover:bg-prism-50/50"
                }`}
              >
                <p className="text-[11px] font-medium">{s.label}</p>
                <p className="text-[9px] text-tx-muted">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={!title.trim() || !content.trim() || isIngesting}
          className="w-full rounded-xl bg-[#131313] px-4 py-2.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-black active:scale-[0.98] disabled:opacity-40"
        >
          {isIngesting ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="h-3.5 w-3.5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" className="opacity-75" />
              </svg>
              Ingesting...
            </span>
          ) : (
            "Ingest Document"
          )}
        </button>
      </form>

      {/* Success/error feedback */}
      {result && (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
            result.accepted
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-yellow-200 bg-yellow-50 text-yellow-700"
          }`}
        >
          {result.accepted
            ? `Ingested ${result.chunkCount} chunks using ${result.chunkStrategy} strategy.`
            : result.message ?? "Document was not accepted."}
        </div>
      )}
      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Ingested documents list */}
      <div className="mt-4 border-t border-border pt-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[1px] text-tx-muted">
          Ingested Documents ({documents.length})
        </p>
        {loadingDocs ? (
          <div className="space-y-1.5">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-8 animate-pulse rounded-lg bg-prism-50"
              />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <p className="text-[11px] text-tx-muted">
            No documents ingested yet. Add content above to enable RAG-powered
            answers.
          </p>
        ) : (
          <div className="max-h-48 space-y-1.5 overflow-y-auto">
            {documents.map((doc) => (
              <div
                key={doc._id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2"
              >
                <div className="flex-1 truncate">
                  <p className="truncate text-[11px] font-medium text-tx">
                    {doc.title}
                  </p>
                  <p className="text-[9px] text-tx-muted">
                    {doc.metadata?.strategy ?? "unknown"} |{" "}
                    {doc.metadata?.charCount?.toLocaleString() ?? "?"} chars |{" "}
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <a
                  href={doc.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 shrink-0 text-tx-muted transition-colors hover:text-prism-600"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

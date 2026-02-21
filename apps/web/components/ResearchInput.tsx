"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type ResearchMode = "quick" | "deep";

export function ResearchInput() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<ResearchMode>("quick");

  const canSubmit = query.trim().length > 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const params = new URLSearchParams({ q: query, mode });
    router.push(`/chat?${params.toString()}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSubmit) {
        const params = new URLSearchParams({ q: query, mode });
        router.push(`/chat?${params.toString()}`);
      }
    }
  }

  return (
    <section id="research" className="relative mx-auto w-full max-w-5xl px-4 py-20 md:py-32">
      <div className="mb-12 text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[3px] text-tx-tertiary">
          Research Interface
        </p>
        <h2 className="font-display text-3xl tracking-tight text-tx md:text-4xl">
          Ask anything. Get grounded answers.
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-tx-secondary">
          Choose quick synthesis or deep analysis. Every answer comes with sources,
          confidence scores, and cost transparency.
        </p>
      </div>

      <div className="mx-auto max-w-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Mode toggle */}
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setMode("quick")}
              className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                mode === "quick"
                  ? "bg-[#131313] text-white shadow-lg"
                  : "border border-border bg-surface-raised text-tx-secondary hover:bg-prism-50"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Quick
            </button>
            <button
              type="button"
              onClick={() => setMode("deep")}
              className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                mode === "deep"
                  ? "bg-[#131313] text-white shadow-lg"
                  : "border border-border bg-surface-raised text-tx-secondary hover:bg-prism-50"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Deep
            </button>
          </div>

          {/* Input card */}
          <div className="rounded-2xl border border-border bg-surface-raised p-2 shadow-card transition-all focus-within:border-prism-300 focus-within:shadow-glow">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              placeholder="Deep dive on RAG chunking strategies with tradeoffs..."
              className="w-full resize-none rounded-xl bg-transparent px-4 py-3 text-sm text-tx outline-none placeholder:text-tx-muted"
            />
            <div className="flex items-center justify-between px-2 pb-1">
              <p className="text-[10px] text-tx-muted">
                Enter to send, Shift+Enter for new line
              </p>
              <button
                type="submit"
                disabled={!canSubmit}
                className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-[#131313] px-6 py-2.5 text-sm font-medium text-white shadow-button-dark transition-all duration-500 active:scale-95 disabled:opacity-40"
              >
                <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[#131313] via-prism-700 to-warm-400 opacity-0 shadow-[inset_0px_0px_12px_2px_rgba(255,255,255,0.4)] transition-opacity duration-700 group-hover:opacity-100" />
                <span className="relative z-10 flex items-center gap-2">
                  Start researching
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </form>

        {/* Example queries */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {[
            "Approaches to reducing LLM hallucinations",
            "RAG chunking strategies with tradeoffs",
            "Explain attention mechanisms with code",
          ].map((eg) => (
            <button
              key={eg}
              onClick={() => {
                setQuery(eg);
              }}
              className="rounded-full border border-border bg-surface-raised px-3.5 py-2 text-xs text-tx-secondary transition-all hover:border-prism-300 hover:bg-prism-50 hover:text-prism-700"
            >
              {eg}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

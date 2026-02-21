"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ResearchResponse } from "@ai/shared/schemas/researchResponse";
import { SourcesPanel } from "@/components/SourcesPanel";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

type ResearchMode = "quick" | "deep";

type ResearchResult = ResearchResponse & {
  sessionId?: string;
  insightId?: string;
};

interface ConversationEntry {
  query: string;
  mode: ResearchMode;
  result: ResearchResult;
  timestamp: number;
}

type LoadingStep = "retrieving" | "analyzing" | "generating" | null;

const STORAGE_KEY = "prism-session-id";

export function ResearchChat() {
  const [userId, setUserId] = useState("demo-user");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<ResearchMode>("quick");
  const [sessionId, setSessionId] = useState<string | undefined>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) ?? undefined;
    }
    return undefined;
  });
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<LoadingStep>(null);
  const [lastFailedQuery, setLastFailedQuery] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const resultsEndRef = useRef<HTMLDivElement>(null);
  const [activeCitationId, setActiveCitationId] = useState<string | null>(null);

  const canSubmit = query.trim().length > 0 && userId.trim().length > 0;

  // Persist sessionId to localStorage
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem(STORAGE_KEY, sessionId);
    }
  }, [sessionId]);

  // Scroll to latest result
  useEffect(() => {
    if (conversation.length > 0) {
      resultsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation.length]);

  // Intersection observer for reveal animations
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-revealed");
        });
      },
      { threshold: 0.1 },
    );
    el.querySelectorAll("[data-reveal]").forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, []);

  // Simulate loading steps
  useEffect(() => {
    if (!isLoading) {
      setLoadingStep(null);
      return;
    }
    setLoadingStep("retrieving");
    const t1 = setTimeout(() => setLoadingStep("analyzing"), 1500);
    const t2 = setTimeout(() => setLoadingStep("generating"), 4000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isLoading]);

  const submitQuery = useCallback(
    async (q: string, m: ResearchMode, parentInsightId?: string) => {
      if (!q.trim() || !userId.trim()) return;

      setIsLoading(true);
      setError(null);
      setLastFailedQuery(null);

      try {
        const response = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            query: q,
            mode: m,
            sessionId,
            parentInsightId,
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.message ?? "Failed to run research query.");
        }

        const typed = payload as ResearchResult;
        setConversation((prev) => [
          ...prev,
          { query: q, mode: m, result: typed, timestamp: Date.now() },
        ]);
        if (typed.sessionId) setSessionId(typed.sessionId);
        setQuery("");
      } catch (requestError) {
        const msg = requestError instanceof Error ? requestError.message : "Unexpected error";
        setError(msg);
        setLastFailedQuery(q);
      } finally {
        setIsLoading(false);
      }
    },
    [userId, sessionId],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    await submitQuery(query, mode);
  }

  function handleFollowUp(question: string, parentInsightId?: string) {
    setQuery(question);
    submitQuery(question, mode, parentInsightId);
  }

  function handleRetry() {
    if (lastFailedQuery) {
      submitQuery(lastFailedQuery, mode);
    }
  }

  function handleNewSession() {
    setConversation([]);
    setSessionId(undefined);
    setQuery("");
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <section
      id="research"
      ref={sectionRef}
      className="relative mx-auto w-full max-w-5xl px-4 py-20 md:py-32"
    >
      {/* Section header */}
      <div data-reveal className="mb-12 text-center opacity-0">
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

      {/* Research form card */}
      <div
        data-reveal
        className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface-raised p-6 shadow-card md:p-8 opacity-0"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* User ID + New Session row */}
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-xs font-medium uppercase tracking-[1px] text-tx-tertiary">
                User ID
              </label>
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="user-123"
                autoComplete="off"
                className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-tx outline-none transition-all placeholder:text-tx-muted focus:border-prism-300 focus:ring-2 focus:ring-prism-100"
              />
            </div>
            {conversation.length > 0 && (
              <div className="flex flex-col justify-end">
                <button
                  type="button"
                  onClick={handleNewSession}
                  className="rounded-xl border border-border bg-surface px-4 py-3 text-xs font-medium text-tx-secondary transition-all hover:bg-prism-50 hover:text-prism-700"
                >
                  New Session
                </button>
              </div>
            )}
          </div>

          {/* Mode toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-[1px] text-tx-tertiary">
              Research Mode
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("quick")}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                  mode === "quick"
                    ? "border-prism-300 bg-prism-50 text-prism-700 shadow-sm"
                    : "border-border bg-surface text-tx-secondary hover:bg-prism-50/50"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  Quick
                </div>
                <p className="mt-1 text-xs font-normal text-tx-muted">&lt; 2 min</p>
              </button>
              <button
                type="button"
                onClick={() => setMode("deep")}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                  mode === "deep"
                    ? "border-prism-300 bg-prism-50 text-prism-700 shadow-sm"
                    : "border-border bg-surface text-tx-secondary hover:bg-prism-50/50"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  Deep
                </div>
                <p className="mt-1 text-xs font-normal text-tx-muted">&lt; 10 min</p>
              </button>
            </div>
          </div>

          {/* Query */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-[1px] text-tx-tertiary">
              Query
            </label>
            <textarea
              value={query}
              rows={4}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Deep dive on RAG chunking strategies with tradeoffs..."
              className="resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm text-tx outline-none transition-all placeholder:text-tx-muted focus:border-prism-300 focus:ring-2 focus:ring-prism-100"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit || isLoading}
            className="group relative mt-1 inline-flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#131313] px-6 py-3.5 text-base font-medium text-white shadow-button-dark transition-all duration-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[#131313] via-prism-700 to-warm-400 opacity-0 shadow-[inset_0px_0px_12px_2px_rgba(255,255,255,0.4)] transition-opacity duration-700 group-hover:opacity-100" />
            <span className="relative z-10 flex items-center gap-2">
              {isLoading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8" className="opacity-75" />
                  </svg>
                  Researching...
                </>
              ) : (
                <>
                  Run {mode} research
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </span>
          </button>
        </form>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="mx-auto mt-8 max-w-3xl">
          <div className="rounded-2xl border border-border bg-surface-raised p-6 shadow-card md:p-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-2 w-2 animate-pulse rounded-full bg-prism-400" />
              <span className="text-xs font-semibold uppercase tracking-[1px] text-prism-600">
                {loadingStep === "retrieving" && "Retrieving sources..."}
                {loadingStep === "analyzing" && "Analyzing context..."}
                {loadingStep === "generating" && "Generating answer..."}
              </span>
            </div>
            {/* Shimmer skeleton lines */}
            <div className="space-y-3">
              <div className="h-4 w-3/4 animate-pulse rounded-lg bg-prism-50" />
              <div className="h-4 w-full animate-pulse rounded-lg bg-prism-50" />
              <div className="h-4 w-5/6 animate-pulse rounded-lg bg-prism-50" />
              <div className="h-4 w-2/3 animate-pulse rounded-lg bg-prism-50" />
              <div className="mt-4 h-3 w-1/2 animate-pulse rounded-lg bg-prism-50" />
              <div className="h-3 w-3/5 animate-pulse rounded-lg bg-prism-50" />
            </div>
            {/* Progress bar */}
            <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-prism-50">
              <div className="h-full animate-pulse rounded-full bg-gradient-to-r from-prism-300 via-prism-500 to-warm-400" style={{
                width: loadingStep === "retrieving" ? "30%" : loadingStep === "analyzing" ? "60%" : "85%",
                transition: "width 1.5s ease-in-out",
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Error with retry */}
      {error && (
        <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span>{error}</span>
            </div>
            {lastFailedQuery && (
              <button
                onClick={handleRetry}
                className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition-all hover:bg-red-50"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Conversation thread */}
      {conversation.length > 0 && (
        <div className="mx-auto mt-8 max-w-3xl space-y-8">
          {conversation.map((entry, idx) => (
            <ConversationItem
              key={`${entry.timestamp}-${idx}`}
              entry={entry}
              isLatest={idx === conversation.length - 1}
              onFollowUp={handleFollowUp}
              activeCitationId={activeCitationId}
              onCitationClick={setActiveCitationId}
            />
          ))}
          <div ref={resultsEndRef} />
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Conversation item component
// ---------------------------------------------------------------------------

function ConversationItem({
  entry,
  isLatest,
  onFollowUp,
  activeCitationId,
  onCitationClick,
}: {
  entry: ConversationEntry;
  isLatest: boolean;
  onFollowUp: (question: string, parentInsightId?: string) => void;
  activeCitationId: string | null;
  onCitationClick: (id: string | null) => void;
}) {
  const { query, mode, result } = entry;

  const latencyLabel = useMemo(() => {
    if (!result.telemetry) return "-";
    return `${result.telemetry.latencyMs} ms`;
  }, [result.telemetry]);

  return (
    <div className="space-y-4">
      {/* User query bubble */}
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-[#131313] px-5 py-3 text-sm text-white shadow-sm">
          <p>{query}</p>
          <p className="mt-1 text-[10px] text-white/40">
            {mode} mode
          </p>
        </div>
      </div>

      {/* Answer card */}
      <div className="rounded-2xl border border-border bg-surface-raised p-6 shadow-card md:p-8">
        {/* Clarification prompt card */}
        {result.clarificationPrompt && result.status === "needs_clarification" && (
          <div className="mb-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-start gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-yellow-600">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  {result.clarificationPrompt.question}
                </p>
                <p className="mt-1 text-xs text-yellow-600">
                  {result.clarificationPrompt.reason}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4 flex items-center gap-2">
          <div
            className={`h-1.5 w-1.5 rounded-full ${
              result.status === "answered"
                ? "bg-green-400"
                : result.status === "needs_clarification"
                  ? "bg-yellow-400"
                  : "bg-orange-400"
            }`}
          />
          <h3 className="text-xs font-semibold uppercase tracking-[1px] text-tx-tertiary">
            Answer
          </h3>
        </div>
        <MarkdownRenderer
          content={result.answer}
          citations={result.citations}
          onCitationClick={onCitationClick}
        />
      </div>

      {/* Diagnostics badges */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-tx-secondary">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              result.status === "answered"
                ? "bg-green-400"
                : result.status === "needs_clarification"
                  ? "bg-yellow-400"
                  : "bg-orange-400"
            }`}
          />
          {result.status}
        </span>
        <ConfidenceBadge confidence={result.confidence} />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-tx-secondary">
          {latencyLabel}
        </span>
        {result.telemetry && (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-tx-secondary">
              ${result.telemetry.estimatedCostUsd}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-tx-secondary">
              {result.telemetry.provider}/{result.telemetry.model}
              <span className="ml-1 rounded-full bg-prism-50 px-1.5 py-0.5 text-[10px] text-prism-600">
                {result.telemetry.route}
              </span>
            </span>
          </>
        )}
      </div>

      {/* Tradeoffs */}
      {result.tradeoffs.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface-raised p-6 shadow-soft">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-[1px] text-tx-tertiary">
            Tradeoffs
          </h3>
          <div className="space-y-4">
            {result.tradeoffs.map((tradeoff, i) => (
              <div key={`${tradeoff.option}-${i}`} className="rounded-xl bg-surface p-4">
                <p className="mb-2 text-sm font-semibold text-tx">{tradeoff.option}</p>
                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[1px] text-green-600">
                      Pros
                    </p>
                    <ul className="space-y-1">
                      {tradeoff.pros.map((pro, j) => (
                        <li key={`pro-${j}`} className="flex items-start gap-1.5 text-xs text-tx-secondary">
                          <span className="mt-0.5 text-green-500">+</span>
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[1px] text-red-600">
                      Cons
                    </p>
                    <ul className="space-y-1">
                      {tradeoff.cons.map((con, j) => (
                        <li key={`con-${j}`} className="flex items-start gap-1.5 text-xs text-tx-secondary">
                          <span className="mt-0.5 text-red-500">-</span>
                          {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up questions — auto-submit on click */}
      {isLatest && result.followUpQuestions.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[1px] text-tx-tertiary">
            Follow-up prompts
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.followUpQuestions.map((question, i) => (
              <button
                key={`follow-${i}`}
                onClick={() => onFollowUp(question, result.insightId)}
                className="rounded-full border border-border bg-surface-raised px-4 py-2 text-sm text-tx-secondary transition-all hover:border-prism-300 hover:bg-prism-50 hover:text-prism-700"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      <SourcesPanel
        citations={result.citations}
        activeCitationId={activeCitationId}
        onCitationClick={onCitationClick}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confidence badge with color coding
// ---------------------------------------------------------------------------

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 70
      ? "text-green-700 bg-green-50 border-green-200"
      : pct >= 40
        ? "text-yellow-700 bg-yellow-50 border-yellow-200"
        : "text-red-700 bg-red-50 border-red-200";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${color}`}
    >
      Confidence: {pct}%
    </span>
  );
}

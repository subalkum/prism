"use client";

import {
  FormEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { ResearchResponse } from "@ai/shared/schemas/researchResponse";
import { SourcesPanel } from "@/components/SourcesPanel";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ResearchMode = "quick" | "deep";

type ResearchResult = ResearchResponse & {
  sessionId?: string;
  insightId?: string;
};

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: ResearchMode;
  result?: ResearchResult;
  timestamp: number;
}

type LoadingStep = "retrieving" | "analyzing" | "generating" | null;

// ---------------------------------------------------------------------------
// Wrapper with Suspense for useSearchParams
// ---------------------------------------------------------------------------

export function ChatView() {
  return (
    <Suspense fallback={<ChatLoadingShell />}>
      <ChatViewInner />
    </Suspense>
  );
}

function ChatLoadingShell() {
  return (
    <div className="flex h-screen items-center justify-center bg-surface">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-prism-200 border-t-prism-600" />
        <span className="text-sm text-tx-secondary">Loading...</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ChatView (inner, uses useSearchParams)
// ---------------------------------------------------------------------------

function ChatViewInner() {
  const searchParams = useSearchParams();

  // Read initial query and mode from URL params (set by landing page)
  const initialQuery = searchParams.get("q") ?? "";
  const initialMode = (searchParams.get("mode") as ResearchMode) ?? "quick";

  const [userId] = useState("demo-user");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<ResearchMode>(initialMode);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<LoadingStep>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCitationId, setActiveCitationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasSubmittedInitial = useRef(false);

  const canSubmit = query.trim().length > 0 && !isLoading;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Loading step simulation
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

  // Submit a query
  const submitQuery = useCallback(
    async (q: string, m: ResearchMode, parentInsightId?: string) => {
      if (!q.trim() || isLoading) return;

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: q,
        mode: m,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setQuery("");
      setIsLoading(true);
      setError(null);

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
          throw new Error(payload?.message ?? "Research query failed.");
        }

        const typed = payload as ResearchResult;
        if (typed.sessionId) setSessionId(typed.sessionId);

        const assistantMsg: Message = {
          id: `asst-${Date.now()}`,
          role: "assistant",
          content: typed.answer,
          result: typed,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unexpected error");
      } finally {
        setIsLoading(false);
      }
    },
    [userId, sessionId, isLoading],
  );

  // Handle initial query from URL
  useEffect(() => {
    if (initialQuery && !hasSubmittedInitial.current) {
      hasSubmittedInitial.current = true;
      submitQuery(initialQuery, initialMode);
    }
  }, [initialQuery, initialMode, submitQuery]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    submitQuery(query, mode);
  }

  function handleFollowUp(question: string, parentInsightId?: string) {
    submitQuery(question, mode, parentInsightId);
  }

  function handleNewChat() {
    setMessages([]);
    setSessionId(undefined);
    setError(null);
    setQuery("");
    inputRef.current?.focus();
  }

  // Handle Ctrl+Enter / Enter submit
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSubmit) submitQuery(query, mode);
    }
  }

  const lastAssistantResult = useMemo(() => {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    return last?.result ?? null;
  }, [messages]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface">
      {/* ─── Sidebar ─── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-surface-raised transition-transform duration-300 lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-prism-500 to-prism-700 shadow-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
            <span className="text-base font-bold tracking-tight text-tx">prism</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-tx-muted transition-colors hover:bg-prism-50 hover:text-tx lg:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* New chat button */}
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="flex w-full items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-tx transition-all hover:border-prism-300 hover:bg-prism-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New research
          </button>
        </div>

        {/* Mode toggle in sidebar */}
        <div className="px-3 pb-3">
          <div className="flex gap-1 rounded-xl border border-border bg-surface p-1">
            <button
              onClick={() => setMode("quick")}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                mode === "quick"
                  ? "bg-prism-50 text-prism-700 shadow-sm"
                  : "text-tx-secondary hover:text-tx"
              }`}
            >
              Quick
            </button>
            <button
              onClick={() => setMode("deep")}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                mode === "deep"
                  ? "bg-prism-50 text-prism-700 shadow-sm"
                  : "text-tx-secondary hover:text-tx"
              }`}
            >
              Deep
            </button>
          </div>
        </div>

        {/* Session info */}
        <div className="flex-1 overflow-y-auto px-3">
          {sessionId && (
            <div className="rounded-lg bg-surface px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-[1px] text-tx-muted">
                Session
              </p>
              <p className="mt-0.5 truncate text-xs text-tx-secondary">
                {sessionId.slice(0, 20)}...
              </p>
            </div>
          )}
        </div>

        {/* Sidebar footer */}
        <div className="border-t border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-prism-100 text-xs font-bold text-prism-700">
              {userId[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 truncate">
              <p className="text-xs font-medium text-tx">{userId}</p>
              <p className="text-[10px] text-tx-muted">Research mode</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── Main chat area ─── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 border-b border-border bg-surface-raised/80 px-4 py-3 backdrop-blur-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-tx-muted transition-colors hover:bg-prism-50 hover:text-tx lg:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-semibold text-tx">
              {messages.length > 0 ? "Research Session" : "New Research"}
            </h1>
            <p className="text-[10px] text-tx-muted">
              {mode === "quick" ? "Quick synthesis" : "Deep analysis"} mode
            </p>
          </div>
          {lastAssistantResult?.telemetry && (
            <div className="hidden items-center gap-2 md:flex">
              <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-medium text-tx-muted">
                {lastAssistantResult.telemetry.provider}/{lastAssistantResult.telemetry.model}
              </span>
            </div>
          )}
        </header>

        {/* ─── Messages ─── */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && !isLoading ? (
            /* Empty state */
            <div className="flex h-full flex-col items-center justify-center px-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-prism-500 to-prism-700 shadow-lg">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </div>
              <h2 className="mt-5 text-xl font-semibold text-tx">What do you want to research?</h2>
              <p className="mt-2 max-w-md text-center text-sm text-tx-secondary">
                Ask a technical question. Get grounded answers with sources, confidence scores, and follow-up suggestions.
              </p>
              {/* Example queries */}
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {[
                  "Quick overview of approaches to reducing LLM hallucinations",
                  "Deep dive on RAG chunking strategies with tradeoffs",
                  "Compare vector DBs: Pinecone vs Weaviate vs Qdrant",
                ].map((eg) => (
                  <button
                    key={eg}
                    onClick={() => {
                      setQuery(eg);
                      inputRef.current?.focus();
                    }}
                    className="rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-left text-xs text-tx-secondary transition-all hover:border-prism-300 hover:bg-prism-50 hover:text-prism-700"
                  >
                    {eg}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message thread */
            <div className="mx-auto max-w-3xl px-4 py-6">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  userId={userId}
                  isLast={msg === messages[messages.length - 1]}
                  onFollowUp={handleFollowUp}
                  activeCitationId={activeCitationId}
                  onCitationClick={setActiveCitationId}
                />
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="mb-6 flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-prism-500 to-prism-700">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 2 7 12 12 22 7 12 2" />
                      <polyline points="2 17 12 22 22 17" />
                      <polyline points="2 12 12 17 22 12" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="rounded-2xl rounded-tl-md border border-border bg-surface-raised p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-prism-400" />
                        <span className="text-xs font-medium text-prism-600">
                          {loadingStep === "retrieving" && "Retrieving sources..."}
                          {loadingStep === "analyzing" && "Analyzing context..."}
                          {loadingStep === "generating" && "Generating answer..."}
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        <div className="h-3 w-3/4 animate-pulse rounded bg-prism-50" />
                        <div className="h-3 w-full animate-pulse rounded bg-prism-50" />
                        <div className="h-3 w-5/6 animate-pulse rounded bg-prism-50" />
                        <div className="h-3 w-2/3 animate-pulse rounded bg-prism-50" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <div className="flex items-center justify-between">
                    <span>{error}</span>
                    <button
                      onClick={() => {
                        setError(null);
                        const lastUser = [...messages].reverse().find((m) => m.role === "user");
                        if (lastUser) submitQuery(lastUser.content, mode);
                      }}
                      className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1 text-xs font-medium hover:bg-red-50"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ─── Bottom input bar ─── */}
        <div className="border-t border-border bg-surface-raised/80 px-4 pb-4 pt-3 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-3xl items-end gap-3"
          >
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a research question..."
                rows={1}
                className="max-h-36 min-h-[48px] w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3 pr-12 text-sm text-tx outline-none transition-all placeholder:text-tx-muted focus:border-prism-300 focus:ring-2 focus:ring-prism-100"
                style={{
                  height: "auto",
                  overflow: "hidden",
                }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 144) + "px";
                }}
              />
              {/* Mode indicator inside input */}
              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-prism-50 px-1.5 py-0.5 text-[10px] font-medium text-prism-600">
                {mode}
              </span>
            </div>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#131313] text-white shadow-lg transition-all hover:bg-black active:scale-95 disabled:opacity-40"
            >
              {isLoading ? (
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" className="opacity-75" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </form>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-tx-muted">
            Press Enter to send, Shift+Enter for new line. Sources are grounded from ingested docs.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chat message component
// ---------------------------------------------------------------------------

function ChatMessage({
  message,
  userId,
  isLast,
  onFollowUp,
  activeCitationId,
  onCitationClick,
}: {
  message: Message;
  userId: string;
  isLast: boolean;
  onFollowUp: (question: string, parentInsightId?: string) => void;
  activeCitationId: string | null;
  onCitationClick: (id: string | null) => void;
}) {
  if (message.role === "user") {
    return (
      <div className="mb-6 flex justify-end gap-3">
        <div className="max-w-[75%]">
          <div className="rounded-2xl rounded-br-md bg-[#131313] px-5 py-3.5 text-sm leading-relaxed text-white shadow-sm">
            {message.content}
          </div>
          <p className="mt-1 text-right text-[10px] text-tx-muted">
            {message.mode} mode
          </p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-prism-100 text-xs font-bold text-prism-700">
          {userId[0]?.toUpperCase() ?? "U"}
        </div>
      </div>
    );
  }

  const result = message.result;

  return (
    <div className="mb-6 flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-prism-500 to-prism-700">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      </div>
      <div className="flex-1 space-y-3">
        {/* Clarification card */}
        {result?.clarificationPrompt && result.status === "needs_clarification" && (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3">
            <div className="flex items-start gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-yellow-600">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-800">{result.clarificationPrompt.question}</p>
                <p className="mt-0.5 text-xs text-yellow-600">{result.clarificationPrompt.reason}</p>
              </div>
            </div>
          </div>
        )}

        {/* Answer */}
        <div className="rounded-2xl rounded-tl-md border border-border bg-surface-raised p-5 shadow-sm">
          <MarkdownRenderer
            content={message.content}
            citations={result?.citations}
            onCitationClick={onCitationClick}
          />
        </div>

        {/* Diagnostics */}
        {result && (
          <div className="flex flex-wrap gap-1.5">
            <Badge
              color={
                result.status === "answered"
                  ? "green"
                  : result.status === "needs_clarification"
                    ? "yellow"
                    : "orange"
              }
            >
              {result.status}
            </Badge>
            <ConfidenceBadge confidence={result.confidence} />
            {result.telemetry && (
              <>
                <Badge>{result.telemetry.latencyMs}ms</Badge>
                <Badge>${result.telemetry.estimatedCostUsd}</Badge>
                <Badge>
                  {result.telemetry.provider}
                  <span className="ml-1 rounded bg-prism-100 px-1 py-0.5 text-[9px] text-prism-600">
                    {result.telemetry.route}
                  </span>
                </Badge>
              </>
            )}
          </div>
        )}

        {/* Tradeoffs */}
        {result && result.tradeoffs.length > 0 && (
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[1px] text-tx-tertiary">
              Tradeoffs
            </p>
            <div className="space-y-3">
              {result.tradeoffs.map((t, i) => (
                <div key={i} className="rounded-lg bg-surface-raised p-3">
                  <p className="mb-1.5 text-xs font-semibold text-tx">{t.option}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-0.5">
                      {t.pros.map((p, j) => (
                        <p key={j} className="text-[11px] text-tx-secondary">
                          <span className="text-green-500">+</span> {p}
                        </p>
                      ))}
                    </div>
                    <div className="space-y-0.5">
                      {t.cons.map((c, j) => (
                        <p key={j} className="text-[11px] text-tx-secondary">
                          <span className="text-red-500">-</span> {c}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-ups */}
        {isLast && result && result.followUpQuestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {result.followUpQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => onFollowUp(q, result.insightId)}
                className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs text-tx-secondary transition-all hover:border-prism-300 hover:bg-prism-50 hover:text-prism-700"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Sources */}
        {result && result.citations.length > 0 && (
          <SourcesPanel
            citations={result.citations}
            activeCitationId={activeCitationId}
            onCitationClick={onCitationClick}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small UI components
// ---------------------------------------------------------------------------

function Badge({
  children,
  color,
}: {
  children: React.ReactNode;
  color?: "green" | "yellow" | "orange";
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised px-2.5 py-1 text-[10px] font-medium text-tx-secondary">
      {color && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            color === "green"
              ? "bg-green-400"
              : color === "yellow"
                ? "bg-yellow-400"
                : "bg-orange-400"
          }`}
        />
      )}
      {children}
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const cls =
    pct >= 70
      ? "text-green-700 bg-green-50 border-green-200"
      : pct >= 40
        ? "text-yellow-700 bg-yellow-50 border-yellow-200"
        : "text-red-700 bg-red-50 border-red-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium ${cls}`}>
      {pct}% confidence
    </span>
  );
}

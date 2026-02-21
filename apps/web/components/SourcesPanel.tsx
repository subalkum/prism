import type { ResearchCitation } from "@ai/shared/schemas/researchResponse";
import { useEffect, useRef } from "react";

type SourcesPanelProps = {
  citations?: ResearchCitation[];
  activeCitationId?: string | null;
  onCitationClick?: (id: string | null) => void;
};

export function SourcesPanel({
  citations = [],
  activeCitationId,
  onCitationClick,
}: SourcesPanelProps) {
  const activeRef = useRef<HTMLAnchorElement>(null);

  // Scroll to highlighted citation when activeCitationId changes
  useEffect(() => {
    if (activeCitationId && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      // Clear highlight after 3s
      const timer = setTimeout(() => onCitationClick?.(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [activeCitationId, onCitationClick]);

  return (
    <aside id="sources">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[1px] text-tx-tertiary">
        Sources
      </h3>
      {citations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface-raised p-8 text-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-3 text-tx-muted"
          >
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <p className="text-sm text-tx-muted">
            No citations yet. Ingest docs and run a query to ground answers.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {citations.map((citation, index) => {
            const isActive = activeCitationId === citation.sourceId;
            return (
              <a
                key={`${citation.url}-${index}`}
                ref={isActive ? activeRef : undefined}
                href={citation.url}
                target="_blank"
                rel="noreferrer"
                className={`group rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-card ${
                  isActive
                    ? "border-prism-400 bg-prism-50 shadow-md ring-2 ring-prism-200"
                    : "border-border bg-surface-raised hover:border-prism-200"
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {citation.label && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-prism-100 text-[10px] font-bold text-prism-700">
                        {citation.label}
                      </span>
                    )}
                    <h4 className="text-sm font-medium text-tx group-hover:text-prism-600">
                      {citation.title}
                    </h4>
                  </div>
                  {citation.relevance != null && (
                    <span className="shrink-0 rounded-full bg-prism-50 px-2 py-0.5 text-[10px] font-semibold text-prism-600">
                      {Math.round(citation.relevance * 100)}%
                    </span>
                  )}
                </div>
                <p className="line-clamp-2 text-xs leading-relaxed text-tx-secondary">
                  {citation.snippet}
                </p>
                <div className="mt-2 flex items-center gap-1 text-[10px] text-tx-muted">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  <span className="truncate max-w-[200px]">{citation.url}</span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </aside>
  );
}

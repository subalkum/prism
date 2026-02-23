import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import type { ResearchCitation } from "@ai/shared/schemas/researchResponse";

type MarkdownRendererProps = {
  content: string;
  citations?: ResearchCitation[];
  onCitationClick?: (id: string | null) => void;
};

/**
 * Render inline citation markers [1], [2], etc. as clickable badges.
 */
function renderWithCitations(
  text: string,
  citations: ResearchCitation[],
  onCitationClick?: (id: string | null) => void,
): (string | React.ReactElement)[] {
  if (citations.length === 0) return [text];

  const parts: (string | React.ReactElement)[] = [];
  const pattern = /\[(\d+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const num = parseInt(match[1], 10);
    const citation = citations.find((c) => c.label === num);

    if (citation) {
      parts.push(
        <button
          key={`cite-${match.index}`}
          onClick={() => onCitationClick?.(citation.sourceId ?? null)}
          className="mx-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-prism-100 text-[10px] font-bold text-prism-700 transition-all hover:bg-prism-200 hover:scale-110"
          title={citation.title}
        >
          {num}
        </button>,
      );
    } else {
      parts.push(match[0]);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function MarkdownRenderer({ content, citations = [], onCitationClick }: MarkdownRendererProps) {
  const components: Components = useMemo(() => ({
    h1: ({ children }) => (
      <h1 className="mb-4 mt-6 text-2xl font-bold tracking-tight text-tx first:mt-0">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-3 mt-5 text-xl font-bold tracking-tight text-tx first:mt-0">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-2 mt-4 text-lg font-semibold text-tx first:mt-0">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="mb-2 mt-3 text-base font-semibold text-tx first:mt-0">
        {children}
      </h4>
    ),
    p: ({ children }) => {
      const processed = processChildren(children, citations, onCitationClick);
      return (
        <p className="mb-3 text-[15px] leading-[1.7] text-tx-secondary last:mb-0">
          {processed}
        </p>
      );
    },
    ul: ({ children }) => (
      <ul className="mb-3 ml-1 space-y-1.5 text-[15px] text-tx-secondary last:mb-0">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-3 ml-1 list-decimal space-y-1.5 pl-4 text-[15px] text-tx-secondary last:mb-0">
        {children}
      </ol>
    ),
    li: ({ children }) => {
      const processed = processChildren(children, citations, onCitationClick);
      return (
        <li className="flex gap-2 leading-[1.7]">
          <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-prism-400" />
          <span>{processed}</span>
        </li>
      );
    },
    strong: ({ children }) => (
      <strong className="font-semibold text-tx">{children}</strong>
    ),
    em: ({ children }) => (
      <em className="italic text-tx-secondary">{children}</em>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-prism-600 underline decoration-prism-300 underline-offset-2 transition-colors hover:text-prism-700 hover:decoration-prism-400"
      >
        {children}
      </a>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-3 border-l-2 border-prism-300 bg-prism-50/50 py-2 pl-4 pr-3 text-[15px] italic text-tx-secondary">
        {children}
      </blockquote>
    ),
    code: ({ className, children }) => {
      const isBlock = className?.includes("language-");
      if (isBlock) {
        return (
          <div className="my-3 overflow-x-auto rounded-xl border border-border bg-[#0f1629] p-4">
            <pre className="text-xs leading-relaxed text-[#d4d4d8]">
              <code>{children}</code>
            </pre>
          </div>
        );
      }
      return (
        <code className="rounded-md bg-prism-50 px-1.5 py-0.5 text-xs font-medium text-prism-700">
          {children}
        </code>
      );
    },
    pre: ({ children }) => <>{children}</>,
    hr: () => <hr className="my-4 border-t border-border" />,
    table: ({ children }) => (
      <div className="my-3 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="border-b border-border bg-prism-50/50 text-xs font-semibold uppercase tracking-wide text-tx-tertiary">
        {children}
      </thead>
    ),
    tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
    tr: ({ children }) => <tr className="transition-colors hover:bg-prism-50/30">{children}</tr>,
    th: ({ children }) => <th className="px-3 py-2">{children}</th>,
    td: ({ children }) => {
      const processed = processChildren(children, citations, onCitationClick);
      return <td className="px-3 py-2 text-tx-secondary">{processed}</td>;
    },
  }), [citations, onCitationClick]);

  return (
    <div className="prose-prism">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}

/** Process React children to render inline citation markers [1], [2] */
function processChildren(
  children: React.ReactNode,
  citations: ResearchCitation[],
  onCitationClick?: (id: string | null) => void,
): React.ReactNode {
  if (citations.length === 0) return children;

  if (typeof children === "string") {
    const parts = renderWithCitations(children, citations, onCitationClick);
    return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{parts}</>;
  }

  if (Array.isArray(children)) {
    return children.map((child, i) => {
      if (typeof child === "string") {
        const parts = renderWithCitations(child, citations, onCitationClick);
        return parts.length === 1 && typeof parts[0] === "string" ? (
          parts[0]
        ) : (
          <span key={i}>{parts}</span>
        );
      }
      return child;
    });
  }

  return children;
}

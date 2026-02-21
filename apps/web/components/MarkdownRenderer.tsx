import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

type MarkdownRendererProps = {
  content: string;
};

const components: Components = {
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
  p: ({ children }) => (
    <p className="mb-3 text-sm leading-relaxed text-tx-secondary last:mb-0">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 ml-1 space-y-1.5 text-sm text-tx-secondary last:mb-0">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 ml-1 list-decimal space-y-1.5 pl-4 text-sm text-tx-secondary last:mb-0">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="flex gap-2 leading-relaxed">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-prism-400" />
      <span>{children}</span>
    </li>
  ),
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
    <blockquote className="my-3 border-l-2 border-prism-300 bg-prism-50/50 py-2 pl-4 pr-3 text-sm italic text-tx-secondary">
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
  td: ({ children }) => <td className="px-3 py-2 text-tx-secondary">{children}</td>,
};

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose-prism">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}

import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-surface">
      {/* CTA banner */}
<div className="relative h-[70vh] flex items-center justify-center overflow-hidden bg-linear-to-br from-orange-400 via-orange-300 to-orange-500">

{/* background arcs */}
<div className="pointer-events-none absolute inset-0">

  <div className="absolute -left-[300px] -bottom-[300px] w-[800px] h-[800px] rounded-full border-120 border-orange-200 opacity-40"></div>
  <div className="absolute -left-[300px] -bottom-[300px] w-[600px] h-[600px] rounded-full border-100 border-orange-200 opacity-40"></div>

  <div className="absolute -right-[300px] top-[50px] w-[800px] h-[800px] rounded-full border-120 border-orange-200 opacity-40"></div>
  <div className="absolute -right-[300px] top-[300px] w-[600px] h-[600px] rounded-full border-100 border-orange-200 opacity-40"></div>

</div>

{/* center card */}
<div className="relative mx-auto max-w-md rounded-xl bg-[#e7dfd4] px-10 py-12 text-center shadow-xl">

  <h2 className="text-4xl font-semibold text-gray-800">
    So, what are we building?
  </h2>
  <Link href={"/#research"}>
  <button className="mt-8 inline-flex items-center gap-3 rounded-full bg-black px-6 py-3 text-white transition hover:scale-105">

    Get started

    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-lime-300 text-black">
      →
    </span>

  </button>
  </Link>

</div>

</div>

      {/* Footer links */}
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 md:flex-row">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-linear-to-br from-prism-500 to-prism-700">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight text-tx">
              prism
            </span>
          </div>

          <p className="text-xs text-tx-muted">
            Built with Next.js, Convex, and frontier-class AI models.
          </p>

          <div className="flex items-center gap-4">
            <a
              href="#research"
              className="text-xs text-tx-tertiary transition-colors hover:text-tx"
            >
              Research
            </a>
            <a
              href="#sources"
              className="text-xs text-tx-tertiary transition-colors hover:text-tx"
            >
              Sources
            </a>
            <a
              href="#about"
              className="text-xs text-tx-tertiary transition-colors hover:text-tx"
            >
              About
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

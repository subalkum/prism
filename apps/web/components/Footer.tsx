export function Footer() {
  return (
    <footer className="relative border-t border-border bg-surface">
      {/* CTA banner */}
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 opacity-20 blur-[80px]"
            style={{
              background:
                "radial-gradient(ellipse, #A5BBFC 0%, #D5E2FF 40%, transparent 70%)",
            }}
          />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center">
          <h2 className="font-display text-2xl tracking-tight text-tx md:text-3xl">
            Start researching with Prism.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-tx-secondary">
            Multi-model deep research with source grounding, cost tracking, and episodic memory.
          </p>
          <a
            href="#research"
            className="group relative mt-8 inline-flex cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#131313] px-7 py-3.5 text-base font-medium text-white shadow-button-dark transition-all duration-500 active:scale-95"
          >
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[#131313] via-prism-700 to-warm-400 opacity-0 shadow-[inset_0px_0px_12px_2px_rgba(255,255,255,0.4)] transition-opacity duration-700 group-hover:opacity-100" />
            <span className="relative z-10">Get Started Now</span>
          </a>
        </div>
      </div>

      {/* Footer links */}
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 md:flex-row">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-prism-500 to-prism-700">
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
            <span className="text-sm font-semibold tracking-tight text-tx">prism</span>
          </div>

          <p className="text-xs text-tx-muted">
            Built with Next.js, Convex, and frontier-class AI models.
          </p>

          <div className="flex items-center gap-4">
            <a href="#research" className="text-xs text-tx-tertiary transition-colors hover:text-tx">
              Research
            </a>
            <a href="#sources" className="text-xs text-tx-tertiary transition-colors hover:text-tx">
              Sources
            </a>
            <a href="#about" className="text-xs text-tx-tertiary transition-colors hover:text-tx">
              About
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

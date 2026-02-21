"use client";

import { useEffect, useRef } from "react";

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
          }
        });
      },
      { threshold: 0.1 },
    );

    el.querySelectorAll("[data-reveal]").forEach((child) => {
      observer.observe(child);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden pt-28 md:pt-36"
    >
      {/* ============================================= */}
      {/* TRI-COLOR GRADIENT BACKGROUND                 */}
      {/* Lavender (left) — Orange (center) — Lavender (right) */}
      {/* Spans from top of page behind the fixed nav   */}
      {/* ============================================= */}
      <div className="pointer-events-none absolute inset-0">
        {/* LEFT BLOB — Lavender / Periwinkle blue */}
        <div
          className="absolute -left-[5%] -top-[5%] h-[600px] w-[45%] opacity-50 blur-[100px]"
          style={{
            background:
              "radial-gradient(ellipse at center, #bfc8f0 0%, #d5ddfb 40%, transparent 70%)",
          }}
        />

        {/* CENTER BLOB — Warm orange / peach / amber (most prominent) */}
        <div
          className="absolute left-1/2 -top-[5%] h-[550px] w-[38%] -translate-x-1/2 opacity-60 blur-[80px]"
          style={{
            background:
              "radial-gradient(ellipse at center, #e8922f 0%, #f0a050 25%, #f4b87a 45%, #fcd4a8 65%, transparent 85%)",
          }}
        />

        {/* RIGHT BLOB — Lavender / Periwinkle blue (mirrors left) */}
        <div
          className="absolute -right-[5%] -top-[5%] h-[600px] w-[45%] opacity-50 blur-[100px]"
          style={{
            background:
              "radial-gradient(ellipse at center, #bfc8f0 0%, #d5ddfb 40%, transparent 70%)",
          }}
        />

        {/* Subtle warm highlight for more depth in center-top */}
        <div
          className="absolute left-1/2 top-0 h-[300px] w-[25%] -translate-x-1/2 opacity-30 blur-[60px]"
          style={{
            background:
              "radial-gradient(ellipse at center, #f59e42 0%, #fbbf6a 40%, transparent 70%)",
          }}
        />

        {/* Bottom fade to clean white */}
        <div className="absolute bottom-0 left-0 h-40 w-full bg-gradient-to-b from-transparent to-white" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-4 pb-20 md:gap-10">
        {/* Decorative ornamental motif */}
        <div data-reveal className="opacity-0" style={{ animationDelay: "0.1s" }}>
          <svg
            width="140"
            height="50"
            viewBox="0 0 140 50"
            fill="none"
            className="opacity-30"
          >
            {/* Left scroll */}
            <path
              d="M35 25c-6-14-18-18-28-14s-9 20 2 24 22-2 26-10z"
              stroke="white"
              strokeWidth="1.2"
              fill="none"
            />
            <path
              d="M55 25c-6 14-18 18-28 14s-9-20 2-24 22 2 26 10z"
              stroke="white"
              strokeWidth="1.2"
              fill="none"
            />
            {/* Center line */}
            <line x1="62" y1="25" x2="78" y2="25" stroke="white" strokeWidth="1" opacity="0.5" />
            {/* Right scroll */}
            <path
              d="M85 25c6-14 18-18 28-14s9 20-2 24-22-2-26-10z"
              stroke="white"
              strokeWidth="1.2"
              fill="none"
            />
            <path
              d="M105 25c6 14 18 18 28 14s9-20-2-24-22 2-26 10z"
              stroke="white"
              strokeWidth="1.2"
              fill="none"
            />
          </svg>
        </div>

        {/* Badge */}
        <div data-reveal className="opacity-0" style={{ animationDelay: "0.2s" }}>
          <div className="relative overflow-hidden rounded-full border border-prism-200/60 bg-white/50 px-5 py-2.5 shadow-glow backdrop-blur-lg">
            <span className="pointer-events-none absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            <p className="relative text-sm font-semibold tracking-wide text-prism-700">
              AI Research Agent
            </p>
          </div>
        </div>

        {/* Heading */}
        <div
          data-reveal
          className="flex flex-col items-center gap-4 opacity-0"
          style={{ animationDelay: "0.35s" }}
        >
          <h1 className="max-w-4xl text-center font-display text-5xl leading-[1.05] tracking-tight text-tx md:text-7xl lg:text-8xl">
            Research, synthesized.
          </h1>
          <p className="max-w-[700px] text-center text-lg leading-relaxed text-neutral-500 md:text-xl">
            Multi-model deep research with source grounding.
            <br className="hidden md:block" />
            Quick answers or thorough analysis, powered by frontier-class models.
          </p>
        </div>

        {/* CTA */}
        <div data-reveal className="opacity-0" style={{ animationDelay: "0.5s" }}>
          <a
            href="#research"
            className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[#1a1a1a] px-8 py-4 text-lg font-medium text-white shadow-xl transition-all duration-300 hover:bg-black hover:shadow-2xl active:scale-95"
          >
            <span className="flex items-center gap-2">
              Start Researching
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform duration-300 group-hover:translate-x-1"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </span>
          </a>
        </div>

        {/* Feature pills */}
        <div
          data-reveal
          className="mt-4 flex flex-wrap items-center justify-center gap-3 opacity-0"
          style={{ animationDelay: "0.65s" }}
        >
          {[
            "Multi-model fallback",
            "Source grounding",
            "RAG-powered",
            "Cost tracking",
            "Episodic memory",
          ].map((feature) => (
            <span
              key={feature}
              className="rounded-full border border-neutral-200 bg-white/60 px-3 py-1.5 text-xs font-medium text-neutral-500 backdrop-blur-sm"
            >
              {feature}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

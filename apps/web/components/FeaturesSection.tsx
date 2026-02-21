"use client";

import { useEffect, useRef } from "react";

const features = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    title: "Dual Research Modes",
    description: "Quick synthesis under 2 minutes or deep analysis under 10. Choose the depth that matches your needs.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    title: "Source Grounding",
    description: "Every answer is backed by cited sources with relevance scores. No hallucinations, just grounded research.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: "Multi-Model Fallback",
    description: "Gemini, Groq, and Cerebras in a resilient chain. If one provider fails, the next picks up seamlessly.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    title: "Cost & Latency Tracking",
    description: "Full telemetry on every query -- token counts, estimated cost, latency, and which provider/model was used.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
    title: "Conversational Follow-ups",
    description: "Continue your research with suggested follow-up prompts. Each session builds on prior context.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
      </svg>
    ),
    title: "Episodic Memory",
    description: "Prism remembers your research patterns and preferences across sessions for increasingly relevant results.",
  },
];

export function FeaturesSection() {
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
      id="about"
      ref={sectionRef}
      className="relative mx-auto w-full max-w-6xl px-4 py-20 md:py-32"
    >
      <div data-reveal className="mb-16 text-center opacity-0">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[3px] text-tx-tertiary">
          Capabilities
        </p>
        <h2 className="font-display text-3xl tracking-tight text-tx md:text-4xl">
          Built for serious research
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-tx-secondary">
          Every component designed for accuracy, transparency, and reliability.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, i) => (
          <div
            key={feature.title}
            data-reveal
            className="group rounded-2xl border border-border bg-surface-raised p-6 opacity-0 transition-all hover:-translate-y-1 hover:shadow-card"
            style={{ transitionDelay: `${i * 0.08}s` }}
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-prism-50 text-prism-500 transition-colors group-hover:bg-prism-100">
              {feature.icon}
            </div>
            <h3 className="mb-2 text-base font-semibold text-tx">{feature.title}</h3>
            <p className="text-sm leading-relaxed text-tx-secondary">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

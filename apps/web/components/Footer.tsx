"use client";

import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function Footer() {
  const containerRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.from(".arc-item", {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top bottom",
          toggleActions: "play none none reverse",
        },
        scale: 0.5,
        opacity: 0,
        duration: 1.5,
        stagger: 0.15,
        ease: "power3.out",
      });
    },
    { scope: containerRef },
  );

  return (
    <footer
      ref={containerRef}
      className="relative border-t border-border bg-surface"
    >
      {/* CTA banner */}
      <div className="relative h-[70vh] flex items-center justify-center overflow-hidden bg-linear-to-br from-orange-400 via-orange-300 to-orange-500">
        {/* background arcs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="arc-item absolute -left-[300px] -bottom-[300px] w-[800px] h-[800px] rounded-full border-120 border-orange-200 opacity-40"></div>
          <div className="arc-item absolute -left-[300px] -bottom-[300px] w-[600px] h-[600px] rounded-full border-100 border-orange-200 opacity-40"></div>

          <div className="arc-item absolute -right-[300px] top-[50px] w-[800px] h-[800px] rounded-full border-120 border-orange-200 opacity-40"></div>
          <div className="arc-item absolute -right-[300px] top-[300px] w-[600px] h-[600px] rounded-full border-100 border-orange-200 opacity-40"></div>
        </div>

        {/* center card */}
        <div className="relative mx-auto max-w-md space-y-2 rounded-xl bg-[#e7dfd4] px-10 py-12 text-center shadow-xl">
          <h2 className="text-4xl font-bold text-black">
            Start researching with Prism.
          </h2>
          <p className="text-muted-foreground">
            Multi-model deep research with source grounding, cost tracking, and
            episodic memory.
          </p>
          <Link
            href="/#research"
            className="group relative inline-flex cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#131313] px-6 py-2.5 text-sm font-medium text-white shadow-button-dark transition-all duration-500 active:scale-95"
          >
            <span className="absolute inset-0 rounded-full bg-linear-to-r from-[#131313] via-prism-700 to-warm-400 opacity-0 shadow-[inset_0px_0px_12px_2px_rgba(255,255,255,0.4)] transition-opacity duration-700 group-hover:opacity-100" />
            <span className="relative z-10">Get Started Now</span>
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

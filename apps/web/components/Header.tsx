"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-50 w-full transition-all duration-500 ${
        scrolled
          ? "bg-white/70 backdrop-blur-xl shadow-[0_1px_0_rgba(0,0,0,0.04)]"
          : "bg-transparent"
      }`}
    >
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-prism-500 to-prism-700 shadow-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-tx">
            prism
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-1 md:flex">
          {["RESEARCH", "SOURCES", "ABOUT"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="group flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-[1.5px] text-neutral-600 transition-colors hover:text-neutral-900"
            >
              {item}
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                className="opacity-40 transition-transform group-hover:translate-y-0.5 group-hover:opacity-70"
              >
                <path
                  d="M2.5 3.5L5 6L7.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          ))}
        </div>

        {/* CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          <a
            href="#research"
            className="group relative inline-flex cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#131313] px-6 py-2.5 text-sm font-medium text-white shadow-button-dark transition-all duration-500 active:scale-95"
          >
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[#131313] via-prism-700 to-warm-400 opacity-0 shadow-[inset_0px_0px_12px_2px_rgba(255,255,255,0.4)] transition-opacity duration-700 group-hover:opacity-100" />
            <span className="relative z-10">Try Prism</span>
          </a>
          <a
            href="#about"
            className="group relative inline-flex cursor-pointer items-center justify-center overflow-hidden rounded-full bg-surface px-6 py-2.5 text-sm font-medium text-tx shadow-button-light transition-all duration-500 active:scale-95"
          >
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-prism-300 via-prism-100 to-warm-200 opacity-0 shadow-[inset_0_0_12px_2px_rgba(255,255,255,0.8)] transition-opacity duration-700 group-hover:opacity-100" />
            <span className="relative z-10">Learn More</span>
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="flex flex-col items-center justify-center gap-1.5 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span
            className={`h-0.5 w-6 bg-neutral-800 transition-transform duration-300 ${mobileOpen ? "translate-y-2 rotate-45" : ""}`}
          />
          <span
            className={`h-0.5 w-6 bg-neutral-800 transition-opacity duration-300 ${mobileOpen ? "opacity-0" : ""}`}
          />
          <span
            className={`h-0.5 w-6 bg-neutral-800 transition-transform duration-300 ${mobileOpen ? "-translate-y-2 -rotate-45" : ""}`}
          />
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="relative z-10 mx-4 rounded-2xl border border-white/60 bg-white/80 px-6 py-4 shadow-lg backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-2">
            {["RESEARCH", "SOURCES", "ABOUT"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-[1.5px] text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
              >
                {item}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <a
                href="#research"
                onClick={() => setMobileOpen(false)}
                className="rounded-full bg-[#1a1a1a] px-5 py-3 text-center text-sm font-medium text-white"
              >
                Try Prism
              </a>
              <a
                href="#about"
                onClick={() => setMobileOpen(false)}
                className="rounded-full border border-neutral-200 bg-white px-5 py-3 text-center text-sm font-medium text-neutral-800"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

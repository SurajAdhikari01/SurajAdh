"use client";

import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { SectionLabel } from "@/components/section-label";

/*
 * Four verbs, each with a small line drawing that acts it out on hover:
 * blocks stack, a tree branches, bars settle into a profile, a noisy signal
 * smooths into a curve. One stroke weight, one colour, no ornament.
 */

function BuildMark() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden="true" className="wid-mark wid-build">
      <rect x="18" y="52" width="84" height="16" rx="2" />
      <rect x="30" y="34" width="60" height="16" rx="2" />
      <rect x="44" y="16" width="32" height="16" rx="2" />
    </svg>
  );
}

function UnderstandMark() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden="true" className="wid-mark wid-tree">
      <path d="M60 12v18M60 30 32 48M60 30l28 18M32 48l-12 18M32 48l12 18M88 48v18" />
      <circle cx="60" cy="12" r="3.5" />
      <circle cx="32" cy="48" r="3" />
      <circle cx="88" cy="48" r="3" />
      <circle cx="20" cy="66" r="2.5" />
      <circle cx="44" cy="66" r="2.5" />
      <circle cx="88" cy="66" r="2.5" />
    </svg>
  );
}

function MeasureMark() {
  const bars = [22, 38, 30, 54, 46, 62, 40, 26];
  return (
    <svg viewBox="0 0 120 80" aria-hidden="true" className="wid-mark wid-bars">
      <path d="M10 70h100" />
      {bars.map((h, i) => (
        <line key={i} x1={18 + i * 12} x2={18 + i * 12} y1={70} y2={70 - h} style={{ "--i": i } as CSSProperties} />
      ))}
    </svg>
  );
}

function RefineMark() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden="true" className="wid-mark wid-refine">
      <path className="wid-noisy" d="M8 52l8-14 7 20 8-26 7 22 8-16 8 18 7-24 8 20 8-12 7 16 8-20 8 14 8-6" />
      <path className="wid-smooth" d="M8 50C30 50 34 28 60 28S92 50 112 46" />
    </svg>
  );
}

// Each verb carries its own glow: a soft, matte bloom behind the drawing.
const services = [
  { title: "Build", description: "Robust software with clear ownership.", Mark: BuildMark, glow: "var(--primary)", accent: "#8b5cf6" },
  { title: "Understand", description: "Low-level concepts, followed all the way down.", Mark: UnderstandMark, glow: "#06b6d4", accent: "var(--primary)" },
  { title: "Measure", description: "Performance proven with evidence, not hunches.", Mark: MeasureMark, glow: "#22c55e", accent: "#06b6d4" },
  { title: "Refine", description: "Complex systems made simple to use.", Mark: RefineMark, glow: "#8b5cf6", accent: "var(--coral)" },
];

export function WhatIDoSection() {
  return (
    <section id="what-i-do" className="relative pb-28 pt-20 sm:pb-36 sm:pt-28" aria-labelledby="what-i-do-heading">
      <div className="site-shell">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="mb-14 space-y-6"
        >
          <SectionLabel name="What I do" />
          <h2
            id="what-i-do-heading"
            className="text-balance text-4xl font-medium leading-[1.02] tracking-[-.05em] text-foreground md:text-5xl lg:text-[3.6rem]"
          >
            Where performance
            <br />
            meets <span className="accent-serif">precision.</span>
          </h2>
        </motion.div>

        <ol className="wid-grid">
          {services.map(({ title, description, Mark, glow, accent }, index) => (
            <motion.li
              key={title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.55 }}
              viewport={{ once: true, margin: "-40px" }}
              className="wid-item"
              tabIndex={0}
              style={{ "--glow": glow, "--accent": accent } as CSSProperties}
            >
              <span className="wid-art">
                <span className="wid-glow" aria-hidden="true" />
                <Mark />
              </span>
              <h3>{title}</h3>
              <p>{description}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

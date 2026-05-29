"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const branchKeys = ["build", "learn", "explore", "solve"] as const;

type BranchKey = (typeof branchKeys)[number];

type BranchPoint = {
  x: number;
  y: number;
};

type FlowLayout = {
  width: number;
  height: number;
  hero: BranchPoint;
  split: BranchPoint;
  branches: Record<BranchKey, BranchPoint>;
};

export function HeroBranchFlow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<FlowLayout | null>(null);
  const { scrollY } = useScroll();

  const measure = useCallback(() => {
    if (!containerRef.current) return;

    const heroEl = document.querySelector(
      "[data-hero-blob='true']",
    ) as HTMLElement | null;

    const branchEls = branchKeys.reduce<Record<BranchKey, HTMLElement | null>>(
      (acc, key) => {
        acc[key] = document.querySelector(
          `[data-branch='${key}']`,
        ) as HTMLElement | null;
        return acc;
      },
      { build: null, learn: null, explore: null, solve: null },
    );

    if (!heroEl || branchKeys.some((key) => !branchEls[key])) return;

    const heroRect = heroEl.getBoundingClientRect();
    const heroPoint = {
      x: heroRect.left + window.scrollX + heroRect.width / 2,
      y: heroRect.top + window.scrollY + heroRect.height * 0.85,
    };

    const branchPoints = branchKeys.reduce<Record<BranchKey, BranchPoint>>(
      (acc, key) => {
        const rect = branchEls[key]!.getBoundingClientRect();
        acc[key] = {
          x: rect.left + window.scrollX + rect.width / 2,
          y: rect.top + window.scrollY + rect.height / 2,
        };
        return acc;
      },
      {
        build: { x: 0, y: 0 },
        learn: { x: 0, y: 0 },
        explore: { x: 0, y: 0 },
        solve: { x: 0, y: 0 },
      },
    );

    const splitX =
      branchKeys.reduce((sum, key) => sum + branchPoints[key].x, 0) /
      branchKeys.length;
    const splitY =
      Math.min(...branchKeys.map((key) => branchPoints[key].y)) - 90;

    const width = Math.max(
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    );
    const height = Math.max(
      document.documentElement.scrollHeight,
      document.documentElement.clientHeight,
    );

    setLayout({
      width,
      height,
      hero: heroPoint,
      split: { x: splitX, y: splitY },
      branches: branchPoints,
    });
  }, []);

  useEffect(() => {
    measure();
    const resizeHandler = () => measure();
    window.addEventListener("resize", resizeHandler);

    const delayed = window.setTimeout(() => measure(), 500);
    return () => {
      window.removeEventListener("resize", resizeHandler);
      window.clearTimeout(delayed);
    };
  }, [measure]);

  const ranges = useMemo(() => {
    if (!layout) {
      return {
        stemStart: 0,
        stemEnd: 1,
        splitStart: 0,
        splitEnd: 1,
      };
    }

    const stemStart = layout.hero.y - window.innerHeight * 0.25;
    const stemEnd = layout.split.y - window.innerHeight * 0.15;
    const splitStart = layout.split.y - window.innerHeight * 0.1;
    const splitEnd = layout.split.y + window.innerHeight * 0.25;

    return { stemStart, stemEnd, splitStart, splitEnd };
  }, [layout]);

  const stemProgress = useTransform(
    scrollY,
    [ranges.stemStart, ranges.stemEnd],
    [0, 1],
  );
  const splitProgress = useTransform(
    scrollY,
    [ranges.splitStart, ranges.splitEnd],
    [0, 1],
  );
  const splitOpacity = useTransform(splitProgress, [0, 1], [0, 1]);

  if (!layout) return null;

  const stemPath = `M ${layout.hero.x} ${layout.hero.y} C ${layout.hero.x} ${layout.hero.y + 120}, ${layout.split.x} ${layout.split.y - 140}, ${layout.split.x} ${layout.split.y}`;

  const branchPath = (target: BranchPoint) =>
    `M ${layout.split.x} ${layout.split.y} C ${layout.split.x} ${layout.split.y + 60}, ${target.x} ${target.y - 80}, ${target.x} ${target.y}`;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-0"
      aria-hidden="true"
    >
      <svg
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="absolute left-0 top-0 h-full w-full"
      >
        <defs>
          <linearGradient id="hero-flow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff4fa3" stopOpacity="0.65" />
            <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        <motion.path
          d={stemPath}
          stroke="url(#hero-flow)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          pathLength={stemProgress}
        />

        {branchKeys.map((key) => (
          <motion.path
            key={key}
            d={branchPath(layout.branches[key])}
            stroke="url(#hero-flow)"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
            pathLength={splitProgress}
            style={{ opacity: splitOpacity }}
          />
        ))}

        <motion.circle
          cx={layout.split.x}
          cy={layout.split.y}
          r={5}
          fill="#ff4fa3"
          style={{ opacity: splitOpacity }}
        />
      </svg>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import {
  Briefcase,
  FlaskConical,
  Home,
  Mail,
  Moon,
  Sun,
  User,
} from "lucide-react";

const navItems = [
  { icon: Home, label: "Home", href: "#home" },
  { icon: User, label: "About", href: "#about" },
  { icon: Briefcase, label: "Work", href: "#work" },

  { icon: Mail, label: "Contact", href: "#contact" },
];

export function Sidebar() {
  const activeItemRef = useRef("Home");
  const [activeItem, setActiveItem] = useState("Home");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("suraj-theme");
    } catch {
      /* Theme still works without storage. */
    }
    const dark = saved
      ? saved === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);

    const sections = navItems
      .map((item) => ({
        ...item,
        element: document.querySelector(item.href) as HTMLElement | null,
      }))
      .filter((item): item is typeof item & { element: HTMLElement } =>
        Boolean(item.element),
      );

    let scrollFrame = 0;
    let cancelled = false;

    const updateActiveSection = () => {
      scrollFrame = 0;
      if (!sections.length) return;

      const viewportHeight = window.innerHeight;
      const pageBottom = window.scrollY + viewportHeight;
      let next: string;

      // Hard guarantees at both document boundaries.
      if (window.scrollY <= 16) {
        next = sections[0].label;
      } else if (pageBottom >= document.documentElement.scrollHeight - 4) {
        next = sections[sections.length - 1].label;
      } else {
        // Score the live overlap with the viewport's visual reading band.
        // Live rects stay accurate when content or viewport dimensions change.
        const bandTop = viewportHeight * 0.22;
        const bandBottom = viewportHeight * 0.68;
        const bandHeight = bandBottom - bandTop;
        const scores = sections.map((section) => {
          const rect = section.element.getBoundingClientRect();
          const overlap = Math.max(
            0,
            Math.min(rect.bottom, bandBottom) - Math.max(rect.top, bandTop),
          );
          const centerDistance = Math.abs(
            (rect.top + rect.bottom) / 2 - (bandTop + bandBottom) / 2,
          );
          return {
            label: section.label,
            score: overlap / bandHeight,
            centerDistance,
          };
        });

        const best = scores.reduce((winner, candidate) => {
          if (candidate.score > winner.score + 0.001) return candidate;
          if (
            Math.abs(candidate.score - winner.score) <= 0.001 &&
            candidate.centerDistance < winner.centerDistance
          )
            return candidate;
          return winner;
        });

        // If a deliberate section gap crosses the band, choose its nearest neighbour.
        next =
          best.score > 0
            ? best.label
            : scores.reduce((winner, candidate) =>
                candidate.centerDistance < winner.centerDistance
                  ? candidate
                  : winner,
              ).label;

        // A tiny tie guard prevents sub-pixel oscillation at exact boundaries.
        const current = scores.find(
          (score) => score.label === activeItemRef.current,
        );
        if (current && current.score > 0 && best.score - current.score < 0.008)
          next = current.label;
      }

      if (activeItemRef.current !== next) {
        activeItemRef.current = next;
        setActiveItem(next);
      }
    };

    const scheduleScrollUpdate = () => {
      if (!cancelled && !scrollFrame)
        scrollFrame = window.requestAnimationFrame(updateActiveSection);
    };

    const resizeObserver = new ResizeObserver(scheduleScrollUpdate);
    const page = document.querySelector(".site-main");
    if (page) resizeObserver.observe(page);
    window.addEventListener("scroll", scheduleScrollUpdate, { passive: true });
    window.addEventListener("resize", scheduleScrollUpdate, { passive: true });
    document.fonts?.ready.then(scheduleScrollUpdate);
    scheduleScrollUpdate();

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      window.removeEventListener("scroll", scheduleScrollUpdate);
      window.removeEventListener("resize", scheduleScrollUpdate);
      window.cancelAnimationFrame(scrollFrame);
    };
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("suraj-theme", next ? "dark" : "light");
    } catch {
      /* Keep the in-session choice. */
    }
  };

  return (
    <nav className="floating-nav" aria-label="Primary navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = activeItem === item.label;
        return (
          <a
            key={item.label}
            href={item.href}
            className="nav-tile"
            aria-label={item.label}
            aria-current={active ? "location" : undefined}
          >
            <Icon
              size={19}
              strokeWidth={active ? 1.9 : 1.55}
              aria-hidden="true"
            />
            <span className="nav-tile-label" aria-hidden="true">
              {item.label}
            </span>
          </a>
        );
      })}
      <button
        type="button"
        className="nav-tile nav-theme"
        onClick={toggleTheme}
        aria-label="Toggle color theme"
        aria-pressed={isDark}
      >
        {isDark ? (
          <Sun size={18} strokeWidth={1.5} aria-hidden="true" />
        ) : (
          <Moon size={18} strokeWidth={1.5} aria-hidden="true" />
        )}
        <span className="nav-tile-label" aria-hidden="true">
          {isDark ? "Light mode" : "Dark mode"}
        </span>
      </button>
    </nav>
  );
}

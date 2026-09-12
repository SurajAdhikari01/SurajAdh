"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { PortfolioTerminal, type TerminalProject } from "@/components/portfolio-terminal";

type Point = { x: number; y: number };
type PeelState = { page: string; back: string; source: "gui" | "cli" };

function clipPolygon(points: Point[], a: number, b: number, c: number, keepLess: boolean) {
  const inside = (point: Point) => keepLess ? a * point.x + b * point.y <= c : a * point.x + b * point.y >= c;
  const output: Point[] = [];
  points.forEach((current, index) => {
    const previous = points[(index + points.length - 1) % points.length];
    const currentInside = inside(current);
    const previousInside = inside(previous);
    if (currentInside !== previousInside) {
      const dx = current.x - previous.x;
      const dy = current.y - previous.y;
      const divisor = a * dx + b * dy;
      const t = divisor ? (c - a * previous.x - b * previous.y) / divisor : 0;
      output.push({ x: previous.x + t * dx, y: previous.y + t * dy });
    }
    if (currentInside) output.push(current);
  });
  return output;
}

function polygonCss(points: Point[]) {
  if (points.length < 3) return "polygon(0 0, 0 0, 0 0)";
  return `polygon(${points.map(({ x, y }) => `${x.toFixed(3)}px ${y.toFixed(3)}px`).join(", ")})`;
}

function foldAt(pointer: Point, source: "gui" | "cli"): PeelState {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const corner = { x: width, y: 0 };
  const point = {
    x: Math.min(width - 1, Math.max(-width * 2.5, pointer.x)),
    y: Math.min(height * 2.5, Math.max(1, pointer.y)),
  };
  const a = corner.x - point.x;
  const b = -point.y;
  const c = (corner.x * corner.x - point.x * point.x - point.y * point.y) / 2;
  const rectangle = [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }];
  const page = clipPolygon(rectangle, a, b, c, true);
  const lifted = clipPolygon(rectangle, a, b, c, false);
  const denominator = a * a + b * b || 1;
  const back = lifted.map((vertex) => {
    const distance = (a * vertex.x + b * vertex.y - c) / denominator;
    return { x: vertex.x - 2 * a * distance, y: vertex.y - 2 * b * distance };
  });
  return { page: polygonCss(page), back: polygonCss(back), source };
}

const navItems = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Work", href: "#work" },
  { label: "Contact", href: "#contact" },
];

export function Sidebar({ projects }: { projects: TerminalProject[] }) {
  const [isDark, setIsDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [cliMode, setCliMode] = useState(false);
  const [peel, setPeel] = useState<PeelState | null>(null);
  const [cornerPreview, setCornerPreview] = useState<PeelState | null>(null);
  const pointerStartRef = useRef<Point | null>(null);
  const lastPointerRef = useRef<Point | null>(null);
  const animationRef = useRef<number | null>(null);

  const setMode = (nextCliMode: boolean) => {
    setMenuOpen(false);
    setCornerPreview(foldAt(
      { x: window.innerWidth - 38, y: 38 },
      nextCliMode ? "cli" : "gui",
    ));
    setPeel(null);
    setCliMode(nextCliMode);
    if (!nextCliMode) setIsDark(document.documentElement.classList.contains("dark"));
  };

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem("suraj-theme"); } catch { /* Optional preference. */ }
    const dark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setMode(!cliMode);
      }
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cliMode]);

  useEffect(() => {
    const sections = navItems
      .map(({ href }) => document.querySelector<HTMLElement>(href))
      .filter((section): section is HTMLElement => Boolean(section));
    const scrollRoot = document.querySelector<HTMLElement>(".site-main");
    if (!scrollRoot || !sections.length) return;

    let frame = 0;
    const updateActiveSection = () => {
      frame = 0;
      const marker = window.innerHeight * .35;
      let current = sections[0].id;
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= marker) current = section.id;
      }
      setActiveSection(current);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    scrollRoot.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      scrollRoot.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => () => {
    if (animationRef.current) window.cancelAnimationFrame(animationRef.current);
  }, []);

  useEffect(() => {
    const fold = peel ?? cornerPreview;
    const surfaces = fold?.source === "cli"
      ? [document.querySelector<HTMLElement>(".cli-site-mode")]
      : [document.querySelector<HTMLElement>("#main-content"), document.querySelector<HTMLElement>(".gui-chrome-layer")];
    if (!fold) return;
    surfaces.forEach((surface) => {
      if (!surface) return;
      surface.style.clipPath = fold.page;
      surface.classList.add("is-page-turning");
      if (!peel) surface.classList.add("is-corner-preview");
    });
    return () => {
      surfaces.forEach((surface) => {
        if (!surface) return;
        surface.style.clipPath = "";
        surface.classList.remove("is-page-turning");
        surface.classList.remove("is-corner-preview");
      });
    };
  }, [peel, cornerPreview]);

  useEffect(() => {
    const resetCorner = () => setCornerPreview(foldAt(
      { x: window.innerWidth - 38, y: 38 },
      cliMode ? "cli" : "gui",
    ));
    setCornerPreview(foldAt(
      { x: window.innerWidth - 1, y: 1 },
      cliMode ? "cli" : "gui",
    ));
    let settleFrame = 0;
    const revealFrame = window.requestAnimationFrame(() => {
      settleFrame = window.requestAnimationFrame(resetCorner);
    });
    window.addEventListener("resize", resetCorner);
    return () => {
      window.cancelAnimationFrame(revealFrame);
      window.cancelAnimationFrame(settleFrame);
      window.removeEventListener("resize", resetCorner);
    };
  }, [cliMode]);

  const animateFold = (from: Point, to: Point, source: "gui" | "cli", complete: boolean) => {
    if (animationRef.current) window.cancelAnimationFrame(animationRef.current);
    const started = performance.now();
    const duration = complete ? 920 : 460;
    const frame = (now: number) => {
      const linear = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - linear, 3);
      const point = { x: from.x + (to.x - from.x) * eased, y: from.y + (to.y - from.y) * eased };
      setPeel(foldAt(point, source));
      if (linear < 1) animationRef.current = window.requestAnimationFrame(frame);
      else if (complete) setMode(source === "gui");
      else setPeel(null);
    };
    animationRef.current = window.requestAnimationFrame(frame);
  };

  const releaseFold = (current: Point, cancelled = false) => {
    const start = pointerStartRef.current;
    if (!start) return;
    pointerStartRef.current = null;
    lastPointerRef.current = null;
    const gestureDistance = Math.hypot(current.x - start.x, current.y - start.y);
    const cornerDistance = Math.hypot(window.innerWidth - current.x, current.y);
    const completes = !cancelled && (gestureDistance < 8 || cornerDistance > Math.max(64, Math.min(window.innerWidth, window.innerHeight) * .12));
    const diagonal = Math.hypot(window.innerWidth, window.innerHeight);
    animateFold(
      current,
      completes
        ? { x: window.innerWidth - diagonal * 2.15, y: diagonal * 2.15 }
        : { x: window.innerWidth - 1, y: 1 },
      cliMode ? "cli" : "gui",
      completes,
    );
  };

  useEffect(() => {
    if (!cliMode) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [cliMode]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("suraj-theme", next ? "dark" : "light"); } catch { /* Keep in-session state. */ }
  };

  return (
    <>
      <motion.button
        type="button"
        className={`mode-corner-pull${cliMode ? " is-cli" : ""}${peel ? " is-peeling" : ""}`}
        onClick={(event) => { if (event.detail === 0) setMode(!cliMode); }}
        aria-label={cliMode ? "Pull to switch to the graphical portfolio" : "Pull to switch to the command-line portfolio"}
        title={`Pull or click for ${cliMode ? "GUI" : "CLI"}`}
        onPointerEnter={() => {
          if (!pointerStartRef.current) setCornerPreview(foldAt(
            { x: window.innerWidth - 118, y: 118 },
            cliMode ? "cli" : "gui",
          ));
        }}
        onPointerLeave={() => {
          if (!pointerStartRef.current) setCornerPreview(foldAt(
            { x: window.innerWidth - 38, y: 38 },
            cliMode ? "cli" : "gui",
          ));
        }}
        onPointerDown={(event) => {
          if (animationRef.current) window.cancelAnimationFrame(animationRef.current);
          event.currentTarget.setPointerCapture(event.pointerId);
          pointerStartRef.current = { x: event.clientX, y: event.clientY };
          lastPointerRef.current = pointerStartRef.current;
          setMenuOpen(false);
          setPeel(foldAt({ x: event.clientX, y: event.clientY }, cliMode ? "cli" : "gui"));
        }}
        onPointerMove={(event) => {
          if (!pointerStartRef.current) return;
          const current = { x: event.clientX, y: event.clientY };
          lastPointerRef.current = current;
          setPeel(foldAt(current, cliMode ? "cli" : "gui"));
        }}
        onPointerUp={(event) => {
          releaseFold({ x: event.clientX, y: event.clientY });
        }}
        onPointerCancel={() => releaseFold(lastPointerRef.current ?? { x: window.innerWidth - 1, y: 1 }, true)}
        onLostPointerCapture={() => {
          if (pointerStartRef.current) releaseFold(lastPointerRef.current ?? pointerStartRef.current, true);
        }}
      >
        <span className="fold-hit-area" aria-hidden="true" />
      </motion.button>

      {(peel ?? cornerPreview) && (
        <div
          className={`page-fold-back from-${(peel ?? cornerPreview)!.source}${peel ? "" : " is-corner-preview"}`}
          style={{ clipPath: (peel ?? cornerPreview)!.back }}
          aria-hidden="true"
        ><span /></div>
      )}

      {(!cliMode || peel?.source === "cli") && (
        <div className="gui-chrome-layer">
          <div className="site-controls">
            <button type="button" className="control-button theme-control" onClick={toggleTheme} aria-label={isDark ? "Use light theme" : "Use dark theme"}>
              {isDark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
            </button>
            <button type="button" className="control-button menu-control" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="site-menu">
              <span className="menu-control-label">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={menuOpen ? "close" : "menu"}
                    initial={{ opacity: 0, y: menuOpen ? 8 : -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: menuOpen ? -8 : 8 }}
                    transition={{ duration: .18, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {menuOpen ? "Close" : "Menu"}
                  </motion.span>
                </AnimatePresence>
              </span>
              <i className="menu-symbol" aria-hidden="true"><b /><b /></i>
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {menuOpen && (
          <motion.button
            type="button"
            className="menu-page-dimmer"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: .28 }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            id="site-menu"
            className="site-menu-panel"
            aria-label="Primary navigation"
            initial={{ opacity: 0, y: -14, scale: .96, clipPath: "inset(0 0 100% 0 round 1.35rem)" }}
            animate={{ opacity: 1, y: 0, scale: 1, clipPath: "inset(0 0 0% 0 round 1.35rem)" }}
            exit={{ opacity: 0, y: -10, scale: .97, clipPath: "inset(0 0 100% 0 round 1.35rem)" }}
            transition={{ duration: .4, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="menu-link-panel"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{
                hidden: { transition: { staggerChildren: .035, staggerDirection: -1 } },
                visible: { transition: { delayChildren: .1, staggerChildren: .06 } },
              }}
            >
              {navItems.map((item) => {
                const isActive = activeSection === item.href.slice(1);
                return (
                  <motion.a
                    key={item.href}
                    href={item.href}
                    className={isActive ? "is-active" : undefined}
                    aria-current={isActive ? "location" : undefined}
                    variants={{
                      hidden: { opacity: 0, y: -9 },
                      visible: { opacity: 1, y: 0, transition: { duration: .28, ease: [0.22, 1, 0.36, 1] } },
                    }}
                    onClick={() => {
                      setActiveSection(item.href.slice(1));
                      setMenuOpen(false);
                    }}
                  >
                    {item.label}<i aria-hidden="true" />
                  </motion.a>
                );
              })}
            </motion.div>
          </motion.nav>
        )}
      </AnimatePresence>

      {(cliMode || cornerPreview?.source === "gui" || peel?.source === "gui") && (
          <main className={`cli-site-mode${!cliMode ? " is-preview" : ""}`}>
            <header className="cli-mode-header"><span>suraj.dev</span><span>portfolio_cli — C++20</span><span>ONLINE</span></header>
            <div className="cli-mode-layout">
              <aside>
                <p>QUICK START</p>
                <code>tree</code><span>map the portfolio</span>
                <code>cat about</code><span>read the profile</span>
                <code>cd work</code><span>browse projects</span>
                <code>project 1</code><span>inspect a repository</span>
                <code>sajilo</code><span>compiler status</span>
                <code>theme light|dark</code><span>change appearance</span>
                <code>exit</code><span>return to GUI</span>
              </aside>
              <PortfolioTerminal projects={projects} autoFocus={cliMode} standalone onExit={() => setMode(false)} />
            </div>
            <footer className="cli-mode-footer"><span>CTRL + K / SWITCH INTERFACE</span><span>KATHMANDU, NP</span></footer>
          </main>
      )}
    </>
  );
}

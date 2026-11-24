"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowLeft, ArrowUpRight, Moon, Sun } from "lucide-react";
import { CHAPTERS, LEG_METRES, STATIONS } from "./world";
import type { Chapter, ExploreProject } from "./world";
import { panelFor } from "./content";

const Scene = dynamic(() => import("./scene"), { ssr: false });

/*
 * The guided climb. A plain, snapping page scrolls over a fixed canvas; the
 * scroll position, in chapters, is the camera's place on the trail. The words
 * themselves are painted onto the mountain by the scene; this page carries
 * the same words for screen readers, and the links as real links.
 */

const ease = [0.22, 1, 0.36, 1] as const;

// Each leg's share of the page follows how far the trail runs, so a flick of
// the wheel always covers about the same ground: no stretch races past while
// another crawls.
const LEG_VH = LEG_METRES.map((m) => Math.round(Math.min(200, Math.max(80, m * 1.4))));

function chapterLabel(chapter: Chapter) {
  return chapter.kind === "intro" ? "Valley" : STATIONS.find((s) => s.id === chapter.id)!.name;
}

function useCountUp(done: boolean) {
  const [n, setN] = useState(0);
  const value = useRef(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      // Creep toward 90 while loading; run to 100 once the scene is up.
      const t = (now - start) / 1000;
      const next = done ? Math.min(100, value.current + 4) : Math.min(90, Math.round(90 * (1 - Math.exp(-t * 1.5))));
      if (next !== value.current) {
        value.current = next;
        setN(next);
      }
      // Stop once the count is complete, rather than ticking forever.
      if (next < 100) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [done]);
  return n;
}

export function ExploreClient({ projects }: { projects: ExploreProject[] }) {
  const panels = useMemo(() => CHAPTERS.map((c) => panelFor(c, projects)), [projects]);
  const root = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const playhead = useRef(0);
  const altitude = useRef<HTMLElement | null>(null);
  const [active, setActive] = useState(0);
  const [settled, setSettled] = useState(true);
  const [ready, setReady] = useState(false);
  const [night, setNight] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const count = useCountUp(ready);
  const loaded = ready && count >= 100;

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setNight(root.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (loaded) scroller.current?.focus({ preventScroll: true });
  }, [loaded]);

  const onReady = useCallback(() => setReady(true), []);

  const sections = useRef<(HTMLElement | null)[]>([]);
  // Where the page is, in chapters: the stop it last passed plus how far it
  // is along the leg to the next one.
  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const top = el.scrollTop;
    const tops = sections.current.map((s) => s?.offsetTop ?? 0);
    let p = CHAPTERS.length - 1;
    for (let i = 0; i < tops.length - 1; i += 1) {
      if (top < tops[i + 1]) {
        p = i + Math.max(0, top - tops[i]) / Math.max(1, tops[i + 1] - tops[i]);
        break;
      }
    }
    progress.current = p;
    const next = Math.round(p);
    setActive((prev) => (prev === next ? prev : next));
  }, []);

  // Links appear once the camera has actually arrived and turned to read.
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const still = Math.abs(playhead.current - Math.round(progress.current)) < 0.02;
      setSettled((prev) => (prev === still ? prev : still));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const jump = useCallback((index: number) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ top: sections.current[index]?.offsetTop ?? 0, behavior: reducedMotion ? "auto" : "smooth" });
  }, [reducedMotion]);

  const toggleNight = () => {
    const next = !night;
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("suraj-theme", next ? "dark" : "light"); } catch { /* Keep in-session state. */ }
  };

  const actions = panels[active]?.actions ?? [];
  const last = active === CHAPTERS.length - 1;

  return (
    <div ref={root} className={`xp${night ? " is-night" : ""}${loaded ? " is-loaded" : ""}`}>
      <Scene
        projects={projects}
        progress={progress as RefObject<number>}
        active={active}
        night={night}
        reducedMotion={reducedMotion}
        altitude={altitude}
        playhead={playhead as RefObject<number>}
        onReady={onReady}
        eventRoot={root}
      />
      <div className="xp-scrim" aria-hidden="true" />

      <div ref={scroller} className="xp-scroll" onScroll={onScroll} tabIndex={-1}>
        {CHAPTERS.map((chapter, i) => {
          const panel = panels[i];
          const Heading = i === 0 ? "h1" : "h2";
          return (
            <section
              key={chapter.key}
              ref={(el) => { sections.current[i] = el; }}
              className="xp-chapter"
              style={i < LEG_VH.length ? { height: `${LEG_VH[i]}dvh` } : undefined}
              aria-label={chapterLabel(chapter)}
            >
              <div className="sr-only">
                <p>{panel.kicker}</p>
                <Heading>{panel.title.map((line) => line.map((seg) => seg.t).join("")).join(" ")}</Heading>
                {panel.body?.map((line) => <p key={line}>{line}</p>)}
                {panel.rows && (
                  <dl>
                    {panel.rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
                  </dl>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <AnimatePresence>
        {loaded && active === 0 && settled && (
          <motion.p
            className="xp-cue"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.8, delay: 1.6, ease } }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <ArrowDown size={15} aria-hidden="true" /> Scroll to climb
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {loaded && settled && (actions.length > 0 || last) && (
          <motion.nav
            key={active}
            className="xp-actions"
            aria-label="Links"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.5, ease } }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            {actions.map((a) =>
              a.external ? (
                <a key={a.href} className="xp-link" href={a.href} target="_blank" rel="noreferrer">
                  {a.label} <ArrowUpRight size={13} aria-hidden="true" />
                </a>
              ) : (
                <Link key={a.href} className="xp-link" href={a.href}>{a.label}</Link>
              ),
            )}
            {last && <button type="button" className="xp-link" onClick={() => jump(0)}>Climb again</button>}
          </motion.nav>
        )}
      </AnimatePresence>

      <header className="xp-top">
        <Link href="/" className="xp-brand">Suraj Adhikari</Link>
        <div className="xp-controls">
          <button type="button" className="xp-round" onClick={toggleNight} aria-label={night ? "Climb by day" : "Climb by night"}>
            {night ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
          </button>
          <Link href="/" className="xp-pill"><ArrowLeft size={14} aria-hidden="true" /> 2D site</Link>
        </div>
      </header>

      <nav className="xp-rail" aria-label="Chapters">
        {CHAPTERS.map((chapter, i) => (
          <button
            key={chapter.key}
            type="button"
            className={active === i ? "is-active" : undefined}
            onClick={() => jump(i)}
            aria-current={active === i ? "step" : undefined}
          >
            <span>{chapterLabel(chapter)}</span>
            <i aria-hidden="true" />
          </button>
        ))}
      </nav>

      <footer className="xp-foot" aria-hidden="true">
        <span className="xp-rec"><i /> ALT <b ref={(el) => { altitude.current = el; }}>—</b></span>
        <span className="xp-count">
          {String(active + 1).padStart(2, "0")} <em>/ {String(CHAPTERS.length).padStart(2, "0")}</em>
        </span>
      </footer>

      <AnimatePresence>
        {!loaded && (
          <motion.div className="xp-loader" exit={{ opacity: 0, transition: { duration: 1, ease } }}>
            <p className="xp-loader-n">{String(count).padStart(3, "0")}</p>
            <p>Surveying the range</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

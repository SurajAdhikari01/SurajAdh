"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
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
  {
    icon: Home,
    label: "Home",
    detail: "Introduction",
    href: "#home",
    number: "01",
  },
  {
    icon: User,
    label: "About",
    detail: "What I do",
    href: "#about",
    number: "02",
  },
  {
    icon: Briefcase,
    label: "Work",
    detail: "Selected projects",
    href: "#work",
    number: "03",
  },
  {
    icon: FlaskConical,
    label: "Approach",
    detail: "How I think",
    href: "#ai-lab",
    number: "04",
  },
  {
    icon: Mail,
    label: "Contact",
    detail: "Start a project",
    href: "#contact",
    number: "05",
  },
];

const sidebarTransition = { duration: 0.56, ease: [0.22, 1, 0.36, 1] as const };
const activeTransition = {
  type: "tween" as const,
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1] as const,
};

export function Sidebar() {
  const asideRef = useRef<HTMLElement>(null);
  const pointerInsideRef = useRef(false);
  const focusInsideRef = useRef(false);
  const activeItemRef = useRef("Home");
  const [activeItem, setActiveItem] = useState("Home");
  const [isDark, setIsDark] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 24,
    mass: 0.45,
  });
  const activeIndex = navItems.findIndex((item) => item.label === activeItem);

  const syncExpandedState = () => {
    const next = pointerInsideRef.current || focusInsideRef.current;
    document.documentElement.toggleAttribute("data-sidebar-expanded", next);
    setExpanded(next);
  };

  useEffect(() => {
    return () => {
      document.documentElement.removeAttribute("data-sidebar-expanded");
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("suraj-theme");
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
        // Live rects stay accurate while sidebar expansion reflows the page.
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
    localStorage.setItem("suraj-theme", next ? "dark" : "light");
  };

  return (
    <>
      <motion.aside
        ref={asideRef}
        initial={{ x: -88, opacity: 0 }}
        animate={{ x: 0, opacity: 1, width: expanded ? 252 : 88 }}
        transition={sidebarTransition}
        onMouseEnter={() => {
          pointerInsideRef.current = true;
          syncExpandedState();
        }}
        onMouseLeave={() => {
          pointerInsideRef.current = false;
          syncExpandedState();
        }}
        onFocusCapture={(event) => {
          // Pointer clicks may leave focus on a link after the cursor exits.
          // Only keyboard-visible focus should hold the sidebar open.
          focusInsideRef.current = event.target.matches(":focus-visible");
          syncExpandedState();
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            focusInsideRef.current = false;
            syncExpandedState();
          }
        }}
        onPointerMove={(event) =>
          asideRef.current?.style.setProperty(
            "--sidebar-cursor-y",
            `${event.clientY}px`,
          )
        }
        className="site-sidebar fixed inset-y-0 left-0 z-50 hidden overflow-hidden bg-background/90 shadow-[8px_0_40px_rgba(20,20,35,.025)] backdrop-blur-md md:flex md:flex-col dark:shadow-[8px_0_45px_rgba(0,0,0,.14)]"
      >
        <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(190px_circle_at_12%_var(--sidebar-cursor-y,35%),color-mix(in_oklab,var(--primary)_9%,transparent),transparent_72%)]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-linear-to-b from-transparent via-border/70 to-transparent" />
        <motion.div
          className="absolute right-0 top-0 h-full w-px origin-top bg-linear-to-b from-primary via-cyan-400/70 to-primary/10"
          style={{ scaleY: progress }}
        />

        <a
          href="#home"
          aria-label="Suraj Adhikari — back to home"
          className="relative grid h-28 w-[252px] shrink-0 grid-cols-[88px_164px] items-center"
        >
          <span className="relative mx-auto grid h-11 w-11 place-items-center rounded-[1.15rem] bg-foreground text-sm font-bold tracking-tight text-background shadow-lg shadow-primary/10 transition-transform duration-500 hover:rotate-[-4deg]">
            SA
          </span>
          <motion.span
            animate={{ opacity: expanded ? 1 : 0, x: expanded ? 0 : -12 }}
            transition={sidebarTransition}
            className="pointer-events-none whitespace-nowrap pr-4"
          >
            <span className="block text-sm font-semibold tracking-tight">
              Suraj Adhikari
            </span>
          </motion.span>
        </a>

        <div className="relative mx-6 h-px w-10 shrink-0 bg-border/70">
          <motion.div
            animate={{ width: expanded ? 204 : 40 }}
            transition={sidebarTransition}
            className="absolute left-0 top-0 h-px bg-border/70"
          />
        </div>

        <nav
          aria-label="Primary navigation"
          className="relative my-auto flex w-[252px] flex-col gap-1.5 py-7"
        >
          <motion.span
            aria-hidden="true"
            initial={false}
            animate={{ y: activeIndex * 62, width: expanded ? 228 : 64 }}
            transition={{ y: activeTransition, width: sidebarTransition }}
            className="pointer-events-none absolute left-3 top-7 h-14 rounded-2xl bg-foreground shadow-[0_8px_25px_rgba(15,15,25,.12)] [will-change:transform,width]"
          />
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.label;
            return (
              <motion.a
                key={item.label}
                href={item.href}
                animate={{ width: expanded ? 228 : 64 }}
                transition={sidebarTransition}
                aria-current={isActive ? "page" : undefined}
                whileTap={{ scale: 0.975 }}
                className={`group/nav relative mx-3 grid h-14 grid-cols-[64px_1fr_28px] items-center overflow-hidden rounded-2xl outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-primary/40 ${isActive ? "text-background" : "text-muted-foreground hover:text-foreground"}`}
              >
                {!isActive && (
                  <span className="absolute inset-0 rounded-2xl bg-muted/0 transition-colors duration-300 group-hover/nav:bg-muted/65" />
                )}

                <span className="relative z-10 grid h-14 w-16 place-items-center">
                  <motion.span
                    animate={{
                      scale: isActive ? 1 : 0.94,
                      rotate: isActive ? 0 : -2,
                    }}
                    transition={activeTransition}
                    className="grid place-items-center"
                  >
                    <Icon
                      className="h-5 w-5"
                      strokeWidth={isActive ? 2.15 : 1.55}
                    />
                  </motion.span>
                </span>

                <motion.span
                  animate={{ opacity: expanded ? 1 : 0, x: expanded ? 0 : -10 }}
                  transition={sidebarTransition}
                  className="relative z-10 min-w-0 whitespace-nowrap"
                >
                  <span className="block text-[13px] font-semibold tracking-tight">
                    {item.label}
                  </span>
                </motion.span>
                <motion.span
                  animate={{ opacity: expanded ? 1 : 0 }}
                  transition={{ duration: 0.25 }}
                  className={`relative z-10 font-mono text-[8px] ${isActive ? "text-background/35" : "text-muted-foreground/45"}`}
                >
                  {item.number}
                </motion.span>
              </motion.a>
            );
          })}
        </nav>

        <div className="relative w-[252px] shrink-0 pb-3">
          <motion.div
            animate={{ width: expanded ? 228 : 64 }}
            transition={sidebarTransition}
            className="mx-3 grid h-12 grid-cols-[64px_1fr_36px] items-center overflow-hidden rounded-2xl text-muted-foreground transition-colors hover:bg-muted/65 hover:text-foreground"
          >
            <button
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              className="col-span-2 grid h-12 grid-cols-[64px_1fr] items-center text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <span className="grid place-items-center">
                {isDark ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </span>
              <motion.span
                animate={{ opacity: expanded ? 1 : 0, x: expanded ? 0 : -10 }}
                transition={sidebarTransition}
                className="whitespace-nowrap text-xs font-medium"
              >
                {isDark ? "Switch to light" : "Switch to dark"}
              </motion.span>
            </button>
            <motion.span
              animate={{ opacity: expanded ? 1 : 0 }}
              className="font-mono text-[8px] text-muted-foreground/45"
            >
              {String(activeIndex + 1).padStart(2, "0")}/05
            </motion.span>
          </motion.div>
        </div>
      </motion.aside>

      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-4 left-4 right-4 z-50 grid h-16 grid-cols-5 items-center rounded-[1.4rem] border border-white/15 bg-foreground/90 px-2 text-background shadow-2xl backdrop-blur-xl md:hidden"
      >
        <motion.span
          aria-hidden="true"
          initial={false}
          animate={{ x: `${activeIndex * 100}%` }}
          transition={activeTransition}
          className="pointer-events-none absolute left-2 top-2.5 h-11 w-[calc((100%_-_1rem)/5)] rounded-xl bg-background [will-change:transform]"
        />
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeItem === item.label;
          return (
            <a
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              className={`relative z-10 mx-auto grid h-11 w-full place-items-center rounded-xl transition-colors duration-300 ${active ? "text-foreground" : "text-background/55"}`}
            >
              <Icon
                className="relative z-10 h-[18px] w-[18px]"
                strokeWidth={active ? 2.1 : 1.5}
              />
            </a>
          );
        })}
      </nav>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { PortfolioTerminal, type TerminalProject } from "@/components/portfolio-terminal";

const navItems = [
  { label: "Home", href: "#home", index: "01" },
  { label: "About", href: "#about", index: "02" },
  { label: "Work", href: "#work", index: "03" },
  { label: "Contact", href: "#contact", index: "04" },
];

export function Sidebar({ projects }: { projects: TerminalProject[] }) {
  const [isDark, setIsDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cliMode, setCliMode] = useState(false);

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
        setMenuOpen(false);
        setCliMode((active) => !active);
      }
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!cliMode) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [cliMode]);

  const setMode = (nextCliMode: boolean) => {
    setMenuOpen(false);
    setCliMode(nextCliMode);
  };

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
        className={`mode-corner-pull${cliMode ? " is-cli" : ""}`}
        onClick={() => setMode(!cliMode)}
        aria-label={cliMode ? "Pull to switch to the graphical portfolio" : "Pull to switch to the command-line portfolio"}
        whileTap={{ scale: .97 }}
      >
        <span>Pull for {cliMode ? "GUI" : "CLI"}</span>
        <i aria-hidden="true"><b /></i>
      </motion.button>

      {!cliMode && (
        <div className="site-controls">
          <button type="button" className="control-button theme-control" onClick={toggleTheme} aria-label={isDark ? "Use light theme" : "Use dark theme"}>
            {isDark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
          </button>
          <button type="button" className="control-button menu-control" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="site-menu">
            <span>{menuOpen ? "Close" : "Menu"}</span>
            <i className="menu-symbol" aria-hidden="true"><b /><b /></i>
          </button>
        </div>
      )}

      <AnimatePresence>
        {menuOpen && (
          <motion.nav id="site-menu" className="site-menu-panel" aria-label="Primary navigation" initial={{ opacity: 0, y: -12, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: .98 }} transition={{ duration: .28, ease: [0.22, 1, 0.36, 1] }}>
            <div className="menu-link-panel">
              {navItems.map((item) => <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}><span>{item.index}</span>{item.label}<i aria-hidden="true" /></a>)}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cliMode && (
          <motion.main
            className="cli-site-mode"
            initial={{ clipPath: "circle(0% at 100% 0%)" }}
            animate={{ clipPath: "circle(150% at 100% 0%)" }}
            exit={{ clipPath: "circle(0% at 100% 0%)" }}
            transition={{ duration: .85, ease: [0.76, 0, 0.24, 1] }}
          >
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
              <PortfolioTerminal projects={projects} autoFocus standalone onExit={() => setMode(false)} />
            </div>
            <footer className="cli-mode-footer"><span>CTRL + K / SWITCH INTERFACE</span><span>KATHMANDU, NP</span></footer>
          </motion.main>
        )}
      </AnimatePresence>
    </>
  );
}

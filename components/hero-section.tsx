"use client";

import { motion } from "framer-motion";
import { ArrowDown, ArrowUpRight, Asterisk, Circle } from "lucide-react";

const reveal = {
  hidden: { y: "110%", rotate: 2 },
  visible: { y: 0, rotate: 0 },
};

export function HeroSection() {
  return (
    <section id="home" className="hero-stage relative min-h-[100svh] overflow-hidden border-b border-foreground/10">
      <div className="site-shell relative flex min-h-[100svh] flex-col py-6 sm:py-8">
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-30 grid grid-cols-2 items-center border-y border-foreground/12 py-3 font-mono text-[8px] uppercase tracking-[.18em] text-muted-foreground sm:grid-cols-[1fr_auto_1fr] sm:text-[9px]"
        >
          <span className="flex items-center gap-2"><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime-400" />Available / 2026</span>
          <span className="hidden items-center gap-2 sm:flex"><Circle className="h-2.5 w-2.5 fill-primary text-primary" />27.7172° N · 85.3240° E</span>
          <span className="text-right">Independent engineer / KTM</span>
        </motion.header>

        <div className="relative flex flex-1 items-center py-14 sm:py-16 lg:py-10">
          <div className="pointer-events-none absolute left-[8%] top-[12%] hidden h-24 w-24 rounded-full border border-foreground/10 lg:block" />
          <div className="pointer-events-none absolute left-[calc(8%+2.75rem)] top-[calc(12%+2.75rem)] hidden h-2 w-2 rounded-full bg-lime-400 lg:block" />

          <motion.div
            initial={{ opacity: 0, x: 32, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.28, duration: 1.15, ease: [0.16, 1, 0.3, 1] }}
            className="hero-portrait pointer-events-none absolute -right-[10%] top-[15%] z-10 h-[48%] w-[62%] sm:right-[3%] sm:top-[10%] sm:h-[65%] sm:w-[42%] lg:right-[8%] lg:h-[72%] lg:w-[34%]"
          >
            <img
              src="/hero.png"
              alt="Suraj Adhikari standing above the Himalayan cloud line"
              width={954}
              height={954}
              fetchPriority="high"
              decoding="async"
              className="h-full w-full object-cover object-[48%_52%]"
            />
            <div className="absolute inset-0 bg-linear-to-t from-[#101018]/25 via-transparent to-white/5" />
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between border-t border-white/35 bg-black/15 px-4 py-3 font-mono text-[7px] uppercase tracking-[.18em] text-white backdrop-blur-sm sm:text-[8px]">
              <span>Field note / Himalaya</span><span>Altitude + clarity</span>
            </div>
          </motion.div>

          <div className="relative z-20 w-full">
            <div className="mb-5 flex items-center justify-between sm:mb-2">
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.65 }}
                className="max-w-[13rem] text-[10px] font-medium uppercase leading-5 tracking-[.16em] text-muted-foreground sm:max-w-[16rem]"
              >
                Software engineering, artificial intelligence &amp; expressive digital craft.
              </motion.p>
              <span className="hidden -rotate-90 font-mono text-[8px] uppercase tracking-[.2em] text-muted-foreground lg:block">Scroll to inspect</span>
            </div>

            <h1 className="select-none text-[clamp(3.2rem,12.6vw,12.2rem)] font-semibold uppercase leading-[.72] tracking-[-.09em]">
              <span className="block overflow-hidden pb-[.08em]">
                <motion.span variants={reveal} initial="hidden" animate="visible" transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} className="block">I design</motion.span>
              </span>
              <span className="block overflow-hidden pb-[.08em] text-right">
                <motion.span variants={reveal} initial="hidden" animate="visible" transition={{ delay: 0.13, duration: 0.9, ease: [0.16, 1, 0.3, 1] }} className="hero-word-outline block">Intelligent</motion.span>
              </span>
              <span className="relative block overflow-hidden pb-[.11em]">
                <motion.span variants={reveal} initial="hidden" animate="visible" transition={{ delay: 0.26, duration: 0.9, ease: [0.16, 1, 0.3, 1] }} className="block">
                  Systems<span className="align-top text-[.24em] text-primary">®</span>
                </motion.span>
              </span>
            </h1>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.95, duration: 0.7 }}
              className="mt-5 grid gap-5 border-t border-foreground/15 pt-5 sm:grid-cols-[1fr_auto] sm:items-end"
            >
              <div className="flex items-start gap-3">
                <Asterisk className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="max-w-xl text-sm leading-6 text-muted-foreground">I turn ambitious ideas into useful, unusual products—where rigorous code, emerging intelligence and a sharp visual point of view work as one.</p>
              </div>
              <div className="flex items-center gap-2">
                <a href="#work" className="group inline-flex h-12 items-center gap-5 rounded-full bg-foreground pl-5 pr-2 text-[10px] font-bold uppercase tracking-[.14em] text-background">
                  Enter the work<span className="grid h-8 w-8 place-items-center rounded-full bg-background text-foreground"><ArrowDown className="h-3.5 w-3.5 transition-transform group-hover:translate-y-1" /></span>
                </a>
                <a href="https://github.com/SurajAdhikari01" target="_blank" rel="noreferrer" aria-label="Visit Suraj's GitHub" className="group grid h-12 w-12 place-items-center rounded-full border border-foreground/20">
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:rotate-45" />
                </a>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="relative z-30 flex items-center justify-between border-t border-foreground/12 pt-3 font-mono text-[8px] uppercase tracking-[.16em] text-muted-foreground">
          <span>Selected signal / SA—01</span><span className="hidden sm:inline">Build · Learn · Explore · Solve</span><span>Portfolio v2.6</span>
        </div>
      </div>
    </section>
  );
}

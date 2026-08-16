"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, GitFork, Github, Star } from "lucide-react";
import type { GitHubShowcase } from "@/lib/github";

const featuredFallback = [
  { id: 1, name: "Legal Document Analyzer", description: "AI-assisted extraction, summaries, and risk analysis for dense legal documents.", html_url: "https://github.com/SurajAdhikari01", homepage: null, language: "Python", stargazers_count: 0, forks_count: 0, topics: ["nlp", "fastapi"], updated_at: "", fork: false },
  { id: 2, name: "House Price Prediction", description: "Explainable property valuations from complex and fragmented market signals.", html_url: "https://github.com/SurajAdhikari01", homepage: null, language: "Python", stargazers_count: 0, forks_count: 0, topics: ["machine-learning", "xgboost"], updated_at: "", fork: false },
  { id: 3, name: "Smart Waste Classifier", description: "Real-time computer vision that makes everyday recycling more accurate.", html_url: "https://github.com/SurajAdhikari01", homepage: null, language: "Python", stargazers_count: 0, forks_count: 0, topics: ["pytorch", "computer-vision"], updated_at: "", fork: false },
];

const swatches = ["project-indigo", "project-lime", "project-coral", "project-blue", "project-violet", "project-mono"];

export function ProjectsSection({ github }: { github: GitHubShowcase }) {
  const repositories = github.repositories.length ? github.repositories : featuredFallback;
  return (
    <section id="work" className="relative scroll-mt-8 overflow-hidden py-28">
      <div className="site-shell">
        <div className="mb-12 grid gap-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div><div className="eyebrow mb-6"><span>Selected work</span><i /></div><h2 className="max-w-3xl text-4xl font-medium leading-[.98] tracking-[-.05em] sm:text-6xl lg:text-7xl">Code with a point of view.</h2></div>
          <div className="flex items-end justify-between gap-6 border-t border-foreground/12 pt-5"><p className="max-w-xs text-xs leading-6 text-muted-foreground">A living feed from GitHub—fresh repositories, honest metrics, zero hard-coded vanity.</p><a href={github.profile.html_url} target="_blank" rel="noreferrer" className="group grid h-12 w-12 shrink-0 place-items-center rounded-full border border-foreground/20 transition-colors hover:bg-foreground hover:text-background"><ArrowUpRight className="h-4 w-4 transition-transform group-hover:rotate-45" /></a></div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {repositories.map((repo, index) => (
            <motion.a key={repo.id} href={repo.homepage || repo.html_url} target="_blank" rel="noreferrer" initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ delay: index * .06 }} className={`project-card group ${swatches[index % swatches.length]}`}>
              <div className="flex items-start justify-between"><span className="font-mono text-[9px] uppercase tracking-[.16em] opacity-55">Repository / {String(index + 1).padStart(2,"0")}</span><ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" /></div>
              <div className="project-mark my-12"><Github className="h-9 w-9" strokeWidth={1.3} /></div>
              <h3 className="max-w-[18rem] text-2xl font-semibold leading-tight tracking-[-.035em]">{repo.name.replaceAll("-", " ")}</h3>
              <p className="mt-3 line-clamp-2 min-h-10 max-w-sm text-xs leading-5 opacity-65">{repo.description || "An evolving experiment in useful software and thoughtful engineering."}</p>
              <div className="mt-8 flex items-end justify-between gap-4 border-t border-current/15 pt-4"><div className="flex flex-wrap gap-2"><span className="rounded-full border border-current/20 px-2.5 py-1 text-[9px]">{repo.language || "Code"}</span>{repo.topics.slice(0,1).map(topic => <span key={topic} className="rounded-full border border-current/20 px-2.5 py-1 text-[9px]">{topic}</span>)}</div><div className="flex shrink-0 items-center gap-3 font-mono text-[9px] opacity-60"><span className="flex items-center gap-1"><Star className="h-3 w-3" />{repo.stargazers_count}</span><span className="flex items-center gap-1"><GitFork className="h-3 w-3" />{repo.forks_count}</span></div></div>
            </motion.a>
          ))}
        </div>
        <div className="mt-5 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
          {[{ label: "Public repositories", value: github.profile.public_repos || `${repositories.length}+` }, { label: "Stars earned", value: github.totalStars }, { label: "GitHub signal", value: "Live" }].map((stat) => <div key={stat.label} className="flex items-center justify-between bg-background px-5 py-5"><span className="text-[10px] uppercase tracking-[.14em] text-muted-foreground">{stat.label}</span><strong className="font-mono text-sm">{stat.value}</strong></div>)}
        </div>
      </div>
    </section>
  );
}

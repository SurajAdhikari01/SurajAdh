"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, GitFork, Github, Star } from "lucide-react";
import type { GitHubShowcase } from "@/lib/github";

const swatches = [
  "project-indigo",
  "project-lime",
  "project-coral",
  "project-blue",
  "project-violet",
  "project-mono",
];

export function ProjectsSection({ github }: { github: GitHubShowcase }) {
  const repositories = github.repositories;
  return (
    <section
      id="work"
      className="projects-field relative scroll-mt-8 overflow-hidden py-28 sm:py-36"
    >
      <svg className="projects-blob" viewBox="0 0 500 500" aria-hidden="true">
        <path
          d="M424 79c62 57 83 155 57 239-27 85-101 157-188 172-87 15-188-28-239-105C2 309 1 198 59 122 117 45 362 22 424 79Z"
          fill="currentColor"
        />
      </svg>
      <div className="site-shell relative z-10">
        <div className="mb-12 grid gap-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="eyebrow mb-6">
              <span>Selected work / 04</span>
              <i />
            </div>
            <h2 className="max-w-3xl text-4xl font-medium leading-[.98] tracking-[-.05em] sm:text-6xl lg:text-7xl">
              Code with a<br />
              <span className="font-serif font-normal italic text-primary">
                point of view.
              </span>
            </h2>
          </div>
        </div>
        {!repositories.length && (
          <div className="border-y border-border py-12">
            <p className="text-sm text-muted-foreground">
              The repository feed is temporarily unavailable.
            </p>
            <a
              href={github.profile.html_url}
              target="_blank"
              rel="noreferrer"
              className="text-link mt-5"
            >
              Explore my projects on GitHub <ArrowUpRight size={16} />
            </a>
          </div>
        )}
        <div className="project-gallery grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {repositories.map((repo, index) => (
            <motion.a
              key={repo.id}
              href={repo.homepage || repo.html_url}
              target="_blank"
              rel="noreferrer"
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: index * 0.06 }}
              className={`project-card group ${swatches[index % swatches.length]}`}
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-[9px] uppercase tracking-[.16em] opacity-55">
                  Repository / {String(index + 1).padStart(2, "0")}
                </span>
                <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" />
              </div>
              <div className="project-mark my-12">
                <Github className="h-9 w-9" strokeWidth={1.3} />
              </div>
              <h3 className="max-w-[18rem] text-2xl font-semibold leading-tight tracking-[-.035em]">
                {repo.name.replaceAll("-", " ")}
              </h3>
              <p className="mt-3 line-clamp-2 min-h-10 max-w-sm text-xs leading-5 opacity-65">
                {repo.description ||
                  "An evolving experiment in useful software and thoughtful engineering."}
              </p>
              <div className="mt-8 flex items-end justify-between gap-4 border-t border-current/15 pt-4">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-current/20 px-2.5 py-1 text-[9px]">
                    {repo.language || "Code"}
                  </span>
                  {repo.topics.slice(0, 1).map((topic) => (
                    <span
                      key={topic}
                      className="rounded-full border border-current/20 px-2.5 py-1 text-[9px]"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
                <div className="flex shrink-0 items-center gap-3 font-mono text-[9px] opacity-60">
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {repo.stargazers_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitFork className="h-3 w-3" />
                    {repo.forks_count}
                  </span>
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}

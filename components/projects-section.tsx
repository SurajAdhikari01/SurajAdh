"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Star } from "lucide-react";
import type { GitHubShowcase } from "@/lib/github";
import { TechStackSection } from "@/components/tech-stack-section";
import { SectionLabel } from "@/components/section-label";

/*
 * The work as a typographic index: names set large, nothing boxed. Hovering
 * a row brings it forward and lets the rest of the list step back.
 */

export function ProjectsSection({ github }: { github: GitHubShowcase }) {
  const repositories = github.repositories;
  return (
    <section id="work" className="relative scroll-mt-8 py-32 sm:py-44" aria-labelledby="work-heading">
      <div className="site-shell relative z-10">
        <div className="mb-14">
          <SectionLabel name="Selected work" className="mb-6" />
          <h2
            id="work-heading"
            className="max-w-3xl text-4xl font-medium leading-[.98] tracking-[-.05em] sm:text-6xl lg:text-7xl"
          >
            Code with a<br />
            <span className="accent-serif">point of view.</span>
          </h2>
        </div>
        <TechStackSection />

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

        <ol className="work-list" aria-label="Projects">
          {repositories.map((repo, index) => (
              <motion.li
                key={repo.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: index * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <a
                  className="work-row"
                  href={repo.homepage || repo.html_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="work-main">
                    <h3 className="work-name">{repo.name.replaceAll("-", " ")}</h3>
                    <p>
                      {repo.description ||
                        "An evolving experiment in useful software and thoughtful engineering."}
                    </p>
                  </span>
                  <span className="work-meta">
                    <span>{repo.language || "Code"}</span>
                    {repo.stargazers_count > 0 && (
                      <span className="work-stars" aria-label={`${repo.stargazers_count} stars`}>
                        <Star aria-hidden="true" /> {repo.stargazers_count}
                      </span>
                    )}
                    <ArrowUpRight className="work-arrow" aria-hidden="true" />
                  </span>
                </a>
              </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

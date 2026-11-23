import type { Metadata } from "next";
import { ExploreClient } from "@/components/explore/explore-client";
import { getGitHubShowcase } from "@/lib/github";
import "./explore.css";

/*
 * The portfolio as a climb: one mountain, camp by camp, with the work waiting
 * at each stop. The 2D site stays the canonical page.
 */

export const metadata: Metadata = {
  title: "Explore in 3D — Suraj Adhikari",
  description: "Climb one Himalayan peak, camp by camp, to find Suraj Adhikari's work: skills, projects, and Sajilo at the summit.",
  alternates: { canonical: "/explore" },
};

export default async function ExplorePage() {
  const github = await getGitHubShowcase();
  // Sajilo is the summit; every other project is a flag on the way up.
  const projects = github.repositories
    .filter((repo) => repo.name !== "sajilo-compiler")
    .map((repo) => ({
      name: repo.name,
      url: repo.html_url,
      homepage: repo.homepage,
      language: repo.language,
      description: repo.description,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
    }));
  return <ExploreClient projects={projects} />;
}

import { metres, stopS, trailPoint } from "./world";
import type { Chapter, ExploreProject, StationId } from "./world";

/*
 * What each stop says. The scene paints it onto the mountain; the page keeps
 * the same words as plain text for screen readers and search, and the links
 * as real, clickable links.
 */

export type Seg = { t: string; em?: boolean };
export type Action = { label: string; href: string; external?: boolean };
export type Panel = {
  kicker: string;
  title: Seg[][];
  body?: string[];
  rows?: [string, string][];
  actions: Action[];
  accent: string;
};

const EMAIL = "surajadhikari01@icloud.com";
const GITHUB = "https://github.com/SurajAdhikari01";

const alt = (id: StationId) => {
  return `${metres(trailPoint(stopS({ key: id, kind: "station", id }))[1]).toLocaleString()} m`;
};

export function panelFor(chapter: Chapter, projects: ExploreProject[]): Panel {
  if (chapter.kind === "intro")
    return {
      kicker: "Suraj Adhikari — C++ & systems engineer",
      title: [[{ t: "Engineering" }], [{ t: "from the " }, { t: "token", em: true }, { t: " up." }]],
      body: ["A portfolio you climb. Scroll to start."],
      actions: [],
      accent: "#fcd34d",
    };
  switch (chapter.id) {
    case "about":
      return {
        kicker: `Base camp · ${alt("about")}`,
        title: [[{ t: "Deep in the system." }], [{ t: "Clear at the " }, { t: "surface.", em: true }]],
        rows: [["Based in", "Kathmandu, Nepal"], ["Works on", "Systems, networking, compilers"], ["Available", "Remotely, worldwide"]],
        actions: [],
        accent: "#fcd34d",
      };
    case "stack":
      return {
        kicker: `Camp I · ${alt("stack")}`,
        title: [[{ t: "The tools I" }], [{ t: "reach " }, { t: "for.", em: true }]],
        rows: [
          ["C++", "RAII, templates, the STL"],
          ["Systems", "Concurrency, networking, Linux"],
          ["Performance", "Profiling, caches"],
          ["Interfaces", "Python, TypeScript, React"],
        ],
        actions: [],
        accent: "#7dd3fc",
      };
    case "projects":
      return {
        kicker: `Camp II · ${alt("projects")}`,
        title: [[{ t: "Flags on the" }], [{ t: "way " }, { t: "up.", em: true }]],
        body: ["Each flag on the rope is a project."],
        actions: projects.map((p) => ({ label: p.name, href: p.url, external: true })),
        accent: "#fda4af",
      };
    default:
      return {
        kicker: `Summit · ${alt("contact")}`,
        title: [[{ t: "Make it mean" }], [{ t: "something.", em: true }]],
        body: [EMAIL],
        actions: [
          { label: "Email", href: `mailto:${EMAIL}` },
          { label: "GitHub", href: GITHUB, external: true },
          { label: "LinkedIn", href: "https://www.linkedin.com/in/surajadk/", external: true },
          { label: "2D site", href: "/" },
        ],
        accent: "#86efac",
      };
  }
}

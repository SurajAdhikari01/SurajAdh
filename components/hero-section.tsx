import { ArrowDown, ArrowUpRight } from "lucide-react";
import {
  PortfolioTerminal,
  type TerminalProject,
} from "@/components/portfolio-terminal";

export function HeroSection({ projects }: { projects: TerminalProject[] }) {
  return (
    <section
      id="home"
      className="hero-stage hero-clean min-h-screen flex items-center"
    >
      <div className="site-shell w-full mx-auto">
        <div className="hero-clean-layout">
          <div className="hero-clean-copy">
            <h1>
              C++ engineer.
              <br />
              <em>Systems thinker.</em>
            </h1>

            <p className="hero-clean-description">
              I’m Suraj. I build dependable software with a focus on C++,
              memory, and performance.
            </p>

            <a href="#work" className="hero-primary-link">
              Explore my work
              <span>
                <ArrowDown size={17} />
              </span>
            </a>
          </div>

          <PortfolioTerminal projects={projects} />
        </div>
      </div>
    </section>
  );
}

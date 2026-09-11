import { ArrowDown, ArrowUpRight } from "lucide-react";
import { KineticSculpture } from "@/components/kinetic-sculpture";

export function HeroSection() {
  return (
    <section id="home" className="premium-hero">
      <div className="site-shell">
        <header className="premium-hero-top">
          <a href="#home" className="wordmark">Suraj Adhikari<span>C++ / Software engineer</span></a>
          <span>Based in Kathmandu · Working worldwide</span>
        </header>

        <div className="premium-hero-main">
          <div className="premium-hero-copy">
            <p>C++ · Systems · Compiler design</p>
            <h1>Build deeply.<br /><em>Ship simply.</em></h1>
            <div className="premium-hero-intro">
              <p>I turn low-level understanding into software that feels clear, fast, and dependable.</p>
              <a href="#work">View selected work <span><ArrowDown size={16} /></span></a>
            </div>
          </div>

          <div className="premium-hero-visual">
            <KineticSculpture />
          </div>
        </div>

        <footer className="premium-hero-foot">
          <span>Currently building Sajilo in C++</span>
          <span>Pull MODE from the corner to enter the CLI</span>
          <a href="#about">About the engineer <ArrowUpRight size={12} /></a>
        </footer>
      </div>
    </section>
  );
}

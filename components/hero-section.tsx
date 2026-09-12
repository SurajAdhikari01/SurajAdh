import { KineticSculpture } from "@/components/kinetic-sculpture";

export function HeroSection() {
  return (
    <section id="home" className="premium-hero">
      <div className="site-shell">
        <div className="premium-hero-main">
          <div className="premium-hero-copy">
            <h1>C++ engineer.<br />Complex systems,<br /><em>made clear.</em></h1>
          </div>

          <div className="premium-hero-visual">
            <KineticSculpture />
          </div>
        </div>
      </div>
    </section>
  );
}

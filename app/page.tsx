import { Sidebar } from "@/components/sidebar";
import { HeroSection } from "@/components/hero-section";
import { HeroBranchFlow } from "@/components/hero-branch-flow";
import { WhatIDoSection } from "@/components/what-i-do-section";
import { ProjectsSection } from "@/components/projects-section";
import { PhilosophySection } from "@/components/philosophy-section";
import { ContactSection } from "@/components/contact-section";
import { FloatingParticles } from "@/components/floating-particles";
import { HeroNeuron } from "@/components/hero-neuron";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Neural network particles background */}
      <FloatingParticles />

      <Sidebar />
      <main className="relative ml-20 overflow-x-clip">
        <HeroBranchFlow />
        <div className="relative z-10">
          <div className="absolute aspect-square w-full max-w-140 z-10  right-30 overview-hidden">
            <HeroNeuron />
          </div>

          <HeroSection />
          <WhatIDoSection />
          <ProjectsSection />
          <PhilosophySection />
          <ContactSection />
        </div>
      </main>
    </div>
  );
}

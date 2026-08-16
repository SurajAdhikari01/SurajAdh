import { Sidebar } from "@/components/sidebar";
import { HeroSection } from "@/components/hero-section";
import { WhatIDoSection } from "@/components/what-i-do-section";
import { ProjectsSection } from "@/components/projects-section";
import { PhilosophySection } from "@/components/philosophy-section";
import { ContactSection } from "@/components/contact-section";
import { FloatingParticles } from "@/components/floating-particles";
import { AboutProfileSection } from "@/components/about-profile-section";
import { TechStackSection } from "@/components/tech-stack-section";
import { getGitHubShowcase } from "@/lib/github";

export default async function Home() {
  const github = await getGitHubShowcase();
  return (
    <div className="relative min-h-screen bg-background">
      <FloatingParticles />
      <Sidebar />
      <main className="site-main relative overflow-x-clip pb-24 md:ml-[5.5rem] md:pb-0">
        <div className="relative z-10">
          <HeroSection />
          <div id="about">
            <AboutProfileSection />
            <WhatIDoSection />
            <TechStackSection />
          </div>
          <ProjectsSection github={github} />
          <PhilosophySection />
          <ContactSection />
        </div>
      </main>
    </div>
  );
}

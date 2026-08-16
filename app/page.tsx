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
import { siteDescription, siteName, siteUrl } from "@/lib/site";

const profileSchema = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  url: siteUrl,
  name: `${siteName} — Software and AI Engineer`,
  description: siteDescription,
  mainEntity: {
    "@type": "Person",
    "@id": `${siteUrl}/#suraj-adhikari`,
    name: siteName,
    alternateName: "SurajAdhikari01",
    url: siteUrl,
    image: `${siteUrl}/hero.png`,
    email: "surajadhikari01@icloud.com",
    jobTitle: ["Software Engineer", "AI Engineer", "C++ Developer"],
    description:
      "Remote software and AI engineer from Nepal building intelligent systems, machine learning products, C++ and network software, and modern web applications.",
    homeLocation: {
      "@type": "Place",
      name: "Kathmandu, Nepal",
    },
    nationality: {
      "@type": "Country",
      name: "Nepal",
    },
    knowsAbout: [
      "Software engineering",
      "Artificial intelligence",
      "Machine learning",
      "C++",
      "Network software development",
      "Python",
      "React",
      "TypeScript",
      "Web development",
      "Distributed systems",
    ],
    sameAs: [
      "https://github.com/SurajAdhikari01",
      "https://www.linkedin.com/in/surajadk/",
    ],
  },
};

export default async function Home() {
  const github = await getGitHubShowcase();
  return (
    <div className="relative min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(profileSchema).replace(/</g, "\\u003c"),
        }}
      />
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

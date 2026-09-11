import { Sidebar } from "@/components/sidebar";
import { HeroSection } from "@/components/hero-section";
import { WhatIDoSection } from "@/components/what-i-do-section";
import { ProjectsSection } from "@/components/projects-section";

import { ContactSection } from "@/components/contact-section";
import { AboutProfileSection } from "@/components/about-profile-section";
import { getGitHubShowcase } from "@/lib/github";
import { siteDescription, siteName, siteUrl } from "@/lib/site";

const profileSchema = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  url: siteUrl,
  name: `${siteName} — C++ and Software Engineer`,
  description: siteDescription,
  mainEntity: {
    "@type": "Person",
    "@id": `${siteUrl}/#suraj-adhikari`,
    name: siteName,
    alternateName: "SurajAdhikari01",
    url: siteUrl,
    image: `${siteUrl}/hero.png`,
    email: "surajadhikari01@icloud.com",
    jobTitle: ["C++ Engineer", "Software Engineer", "Systems Developer"],
    description:
      "Remote C++ and software engineer from Nepal building performant systems, network software, developer tools, and dependable applications.",
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
      "C++",
      "Systems programming",
      "Performance engineering",
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
  const terminalProjects = github.repositories.map((repo) => ({
    name: repo.name,
    url: repo.html_url,
    language: repo.language,
  }));
  return (
    <div className="relative min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(profileSchema).replace(/</g, "\\u003c"),
        }}
      />
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Sidebar projects={terminalProjects} />
      <main id="main-content" className="site-main relative overflow-x-clip">
        <div className="relative z-10">
          <HeroSection />
          <div id="about">
            <AboutProfileSection />
            <WhatIDoSection />
          </div>
          <ProjectsSection github={github} />

          <ContactSection />
        </div>
      </main>
    </div>
  );
}

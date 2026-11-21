import { Sidebar } from "@/components/sidebar";
import { HeroSection } from "@/components/hero-section";
import { WhatIDoSection } from "@/components/what-i-do-section";
import { ProjectsSection } from "@/components/projects-section";

import { ContactSection } from "@/components/contact-section";
import { AboutProfileSection } from "@/components/about-profile-section";
import { getGitHubShowcase } from "@/lib/github";
import { siteDescription, siteName, siteTitle, siteUrl } from "@/lib/site";

const person = {
  "@type": "Person",
  "@id": `${siteUrl}/#suraj-adhikari`,
  name: siteName,
  alternateName: "SurajAdhikari01",
  url: siteUrl,
  image: `${siteUrl}/portrait.jpg`,
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
    "Compilers",
    "Programming language design",
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
};

export default async function Home() {
  const github = await getGitHubShowcase();
  // One graph: the site, the page about the person, the person, their work.
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: siteName,
        description: siteDescription,
        inLanguage: "en",
        publisher: { "@id": person["@id"] },
      },
      {
        "@type": "ProfilePage",
        "@id": `${siteUrl}/#profile`,
        url: siteUrl,
        name: siteTitle,
        description: siteDescription,
        isPartOf: { "@id": `${siteUrl}/#website` },
        mainEntity: person,
      },
      ...github.repositories.map((repo) => ({
        "@type": "SoftwareSourceCode",
        name: repo.name.replaceAll("-", " "),
        description: repo.description ?? undefined,
        codeRepository: repo.html_url,
        url: repo.homepage || repo.html_url,
        programmingLanguage: repo.language ?? undefined,
        author: { "@id": person["@id"] },
      })),
    ],
  };
  const terminalProjects = github.repositories.map((repo) => ({
    name: repo.name,
    url: repo.html_url,
    homepage: repo.homepage,
    language: repo.language,
    description: repo.description,
    topics: repo.topics,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    updatedAt: repo.updated_at,
  }));
  return (
    <div className="relative min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
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

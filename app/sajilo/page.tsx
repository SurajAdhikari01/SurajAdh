import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ArrowLeft } from "lucide-react";
import { TechStackSection } from "@/components/tech-stack-section";
import { SectionLabel } from "@/components/section-label";
import { siteName, siteUrl } from "@/lib/site";

/*
 * The page that answers "what is Sajilo?" on its own: for people arriving
 * from search, and for crawlers and answer engines that need one plain,
 * citable source. Same type and hairline rows as the portfolio.
 */

const REPO = "https://github.com/SurajAdhikari01/sajilo-compiler";
const url = `${siteUrl}/sajilo`;
const title = "Sajilo — a programming language with Nepali keywords";
const description =
  "Sajilo (सजिलो, Nepali for “easy”) is a statically typed, compiled programming language with Nepali keywords. Its C++ compiler, by Suraj Adhikari, turns .sj files into x86-64 assembly for Linux.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/sajilo" },
  keywords: [
    "Sajilo",
    "Sajilo programming language",
    "Nepali programming language",
    "programming language in Nepali",
    "compiler written in C++",
    "Pratt parser",
    "three-address code",
    "x86-64 compiler",
    "Suraj Adhikari",
  ],
  openGraph: { type: "article", url: "/sajilo", title, description, siteName },
  twitter: { card: "summary_large_image", title, description },
};

const facts = [
  { label: "Kind", value: "Statically typed, compiled" },
  { label: "Compiler", value: "C++, written from scratch" },
  { label: "Target", value: "x86-64 Linux, via NASM" },
  { label: "Files", value: ".sj" },
  { label: "Status", value: "In active development since August 2026" },
];

const keywords = [
  { word: "manau", nepali: "मानौं", meaning: "let: declares a variable" },
  { word: "func", nepali: "कार्य", meaning: "declares a function" },
  { word: "deu", nepali: "देऊ", meaning: "give: the return type" },
  { word: "jaba", nepali: "जब", meaning: "when: if" },
  { word: "natra", nepali: "नत्र", meaning: "otherwise: else" },
  { word: "jabasamma", nepali: "जबसम्म", meaning: "as long as: while" },
  { word: "laijau", nepali: "लैजाऊ", meaning: "take: return" },
];

const pipeline = [
  { name: "Lexer", text: "Reads characters into tokens." },
  { name: "Parser", text: "A Pratt parser builds the syntax tree." },
  { name: "Semantics", text: "A scoped symbol table resolves names and checks types." },
  { name: "IR", text: "Lowers the tree to three-address code." },
  { name: "Codegen", text: "Emits x86-64 NASM that calls Linux directly." },
];

const questions = [
  {
    q: "What does Sajilo mean?",
    a: "Sajilo (सजिलो) is Nepali for “easy” or “simple”. The language keeps ordinary programming syntax and uses Nepali words for its keywords.",
  },
  {
    q: "Who made Sajilo?",
    a: "Suraj Adhikari, a C++ and systems engineer in Kathmandu, Nepal, designed the language and is writing its compiler from scratch in C++.",
  },
  {
    q: "Can I use it?",
    a: "The source is open on GitHub and builds with CMake. It is early: Sajilo has int and string types, functions, conditionals, loops and system calls for read, write and exit.",
  },
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${url}#page`,
      url,
      name: title,
      description,
      inLanguage: "en",
      isPartOf: { "@id": `${siteUrl}/#website` },
      about: { "@id": `${url}#language` },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: siteName, item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Sajilo", item: url },
        ],
      },
    },
    {
      "@type": "ComputerLanguage",
      "@id": `${url}#language`,
      name: "Sajilo",
      alternateName: "सजिलो",
      description,
      url,
      sameAs: [REPO],
      creator: { "@id": `${siteUrl}/#suraj-adhikari` },
    },
    {
      "@type": "SoftwareSourceCode",
      "@id": `${url}#compiler`,
      name: "Sajilo compiler",
      description: "The compiler for the Sajilo programming language, written in C++.",
      codeRepository: REPO,
      programmingLanguage: "C++",
      runtimePlatform: "Linux x86-64",
      author: { "@id": `${siteUrl}/#suraj-adhikari` },
    },
    {
      "@type": "FAQPage",
      "@id": `${url}#questions`,
      mainEntity: questions.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ],
};

export default function SajiloPage() {
  return (
    <main className="site-main sjp">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}
      />
      <div className="site-shell">
        <nav className="sjp-nav" aria-label="Breadcrumb">
          <Link href="/"><ArrowLeft aria-hidden="true" /> {siteName}</Link>
        </nav>

        <header className="sjp-head">
          <SectionLabel name="Sajilo" />
          <h1>
            A programming language
            <br />
            with <span className="accent-serif">Nepali keywords.</span>
          </h1>
          <p className="sjp-lead">
            Sajilo (सजिलो, Nepali for “easy”) is a statically typed, compiled language. Its
            compiler, written in C++ by Suraj Adhikari, turns <code>.sj</code> files into x86-64
            assembly that talks straight to Linux.
          </p>
        </header>

        <dl className="ab-facts sjp-block">
          {facts.map(({ label, value }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <section className="sjp-block" aria-labelledby="sjp-run">
          <h2 id="sjp-run" className="sjp-h2">One program, every stage.</h2>
          <TechStackSection />
        </section>

        <section className="sjp-block" aria-labelledby="sjp-words">
          <h2 id="sjp-words" className="sjp-h2">The keywords.</h2>
          <dl className="sjp-words">
            {keywords.map(({ word, nepali, meaning }) => (
              <div key={word}>
                <dt><code>{word}</code></dt>
                <dd lang="ne">{nepali}</dd>
                <dd>{meaning}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="sjp-block" aria-labelledby="sjp-pipe">
          <h2 id="sjp-pipe" className="sjp-h2">How the compiler works.</h2>
          <ol className="sjp-pipe">
            {pipeline.map(({ name, text }) => (
              <li key={name}>
                <strong>{name}</strong>
                <span>{text}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="sjp-block" aria-labelledby="sjp-q">
          <h2 id="sjp-q" className="sjp-h2">Questions.</h2>
          <div className="sjp-qa">
            {questions.map(({ q, a }) => (
              <div key={q}>
                <h3>{q}</h3>
                <p>{a}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="sjp-foot">
          <a href={REPO} target="_blank" rel="noreferrer">
            Source on GitHub <ArrowUpRight aria-hidden="true" />
          </a>
          <Link href="/">
            More from Suraj <ArrowUpRight aria-hidden="true" />
          </Link>
        </footer>
      </div>
    </main>
  );
}

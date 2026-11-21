"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import trace from "@/data/sajilo-trace.json";
import { highlightLines } from "@/lib/sajilo-highlight";

/*
 * The whole portfolio as a shell. Set in the site's own type and colours:
 * one column, the prompt inline after the output like a real terminal.
 * Everything Sajilo-related is real: stages from the repository, output from
 * data/sajilo-trace.json, commits from its history.
 */

export type TerminalProject = {
  name: string;
  url: string;
  homepage?: string | null;
  language: string | null;
  description?: string | null;
  topics?: string[];
  stars?: number;
  forks?: number;
  updatedAt?: string;
};

type Entry = { id: number; command: string; cwd: string; output: ReactNode };
type CommandHelp = { command: string; detail: string };

const email = "surajadhikari01@icloud.com";
const SAJILO_REPO = "https://github.com/SurajAdhikari01/sajilo-compiler";
const sectionNames = ["home", "about", "skills", "sajilo", "work", "contact"];
const aliases: Record<string, string> = { projects: "work", project: "work", compiler: "sajilo", practice: "skills", socials: "contact" };

const commandGroups: { label: string; commands: CommandHelp[] }[] = [
  { label: "Move around", commands: [
    { command: "ls [path]", detail: "List sections" },
    { command: "cd <section>", detail: "Open a section" },
    { command: "tree", detail: "Map the portfolio" },
    { command: "gui [section]", detail: "Back to the site" },
  ] },
  { label: "Work", commands: [
    { command: "projects", detail: "Selected repositories" },
    { command: "project <n|name>", detail: "Inspect one" },
    { command: "grep <term>", detail: "Search everything" },
    { command: "open <target>", detail: "Open a project or profile" },
  ] },
  { label: "Sajilo", commands: [
    { command: "sajilo", detail: "Where the compiler is" },
    { command: "run sajilo", detail: "Compile hello.sj" },
    { command: "build", detail: "Build the compiler" },
    { command: "git log", detail: "Recent commits" },
  ] },
  { label: "Shell", commands: [
    { command: "contact", detail: "Email and profiles" },
    { command: "cout << \"hi\"", detail: "A tiny C++ stream" },
    { command: "theme light|dark", detail: "Switch theme" },
    { command: "clear", detail: "Clear the screen" },
  ] },
];
const commands = Array.from(new Set([
  "help", "man", "about", "home", "work", "ls", "tree", "pwd", "cd", "cat", "find", "grep", "project", "projects", "open",
  "history", "theme", "contact", "email", "copy", "gui", "exit", "quit", "whoami", "skills",
  "sajilo", "date", "echo", "clear", "cpp", "build", "make", "run", "bench", "memory", "git", "cout",
]));

// Sajilo, as it stands in the repository.
const SAJILO_STAGES: [done: boolean, name: string, detail: string][] = [
  [true, "Lexer", "keywords, literals, operators"],
  [true, "Pratt parser", "expressions, statements, AST"],
  [true, "Semantic analysis", "scoped symbol table, type checks"],
  [true, "IR", "three-address code, string pool"],
  [false, "x86-64 codegen", "stack frames, Linux syscalls; hello world runs"],
];
const SAJILO_LOG = [
  ["e870984", "implemented code gen for hello world"],
  ["0100e10", "feat: frame size implementation for func"],
  ["5f3c979", "Add function label support and enhance IR table management"],
  ["1fb96ad", "code gen func decleration and ground work for code gen"],
  ["915801b", "improved ir with function label and string support"],
];

function displayPath(path: string) { return path === "home" ? "~" : `~/${path}`; }
function normalizeSection(value: string, current: string) {
  const cleaned = value.trim().toLowerCase().replace(/^\.\//, "").replace(/\/$/, "");
  if (!cleaned || cleaned === ".") return current;
  if (["~", "/", "portfolio", "/portfolio"].includes(cleaned)) return "home";
  if (cleaned === ".." || cleaned.startsWith("../")) return "home";
  const leaf = cleaned.split("/").pop() || "home";
  return aliases[leaf] || leaf;
}

function evaluateCout(source: string) {
  const expression = source.replace(/^(?:std::)?cout\s*<</i, "").replace(/;\s*$/, "");
  return expression.split(/\s*<<\s*/).map((token) => {
    const value = token.trim();
    if (/^(?:std::)?endl$/i.test(value)) return "\n";
    if (/^"(?:[^"\\]|\\.)*"$/.test(value)) {
      try { return JSON.parse(value) as string; } catch { return value.slice(1, -1); }
    }
    if (/^(?:true|false|-?\d+(?:\.\d+)?)$/i.test(value)) return value;
    return `[${value}]`;
  }).join("");
}

// Real compiler text, lit the same way as the panel on the site.
function Code({ lang, text, from }: { lang: "sajilo" | "ir" | "asm"; text: string; from?: RegExp }) {
  let lines = text.replace(/\t/g, "  ").split("\n");
  if (from) { const at = lines.findIndex((l) => from.test(l)); if (at > 0) lines = lines.slice(at); }
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const shown = lines.join("\n");
  return (
    <pre className="tx-code">
      {highlightLines(lang, shown).map((line, i) => <span key={i} className="sj-line">{line}</span>)}
    </pre>
  );
}

function asmText() {
  const asm = trace.asm as string | { output: string };
  return typeof asm === "string" ? asm : asm.output;
}

export function PortfolioTerminal({ projects, autoFocus = false, onExit }: { projects: TerminalProject[]; autoFocus?: boolean; standalone?: boolean; onExit?: () => void }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState("home");
  const history = useRef<string[]>([]);
  const historyIndex = useRef(0);
  const draft = useRef("");
  const nextId = useRef(0);
  const screenRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    const value = input.trim().toLowerCase();
    if (!value) return [];
    const [verb, partial = ""] = value.split(/\s+/, 2);
    if (!value.includes(" ")) return commands.filter((command) => command.startsWith(verb) && command !== verb).slice(0, 5);
    if (["cd", "cat", "gui"].includes(verb)) return sectionNames.filter((name) => name.startsWith(partial)).map((name) => `${verb} ${name}`).slice(0, 5);
    if (["project", "open"].includes(verb)) return projects.filter((project) => project.name.toLowerCase().startsWith(partial)).map((project) => `${verb} ${project.name}`).slice(0, 5);
    return [];
  }, [input, projects]);

  useEffect(() => { screenRef.current?.scrollTo({ top: screenRef.current.scrollHeight, behavior: "smooth" }); }, [entries]);
  useEffect(() => { if (autoFocus) inputRef.current?.focus({ preventScroll: true }); }, [autoFocus]);
  useEffect(() => {
    const runExternalCommand = (event: Event) => { const command = (event as CustomEvent<string>).detail; if (command) void execute(command); };
    window.addEventListener("portfolio-command", runExternalCommand);
    return () => window.removeEventListener("portfolio-command", runExternalCommand);
  });

  const cmd = (text: string) => <button type="button" className="tx-cmd" onClick={() => void execute(text)}>{text}</button>;

  function projectList(): ReactNode {
    return (
      <div className="tx-table">
        {projects.map((project, index) => (
          <button key={project.url} type="button" onClick={() => void execute(`project ${index + 1}`)}>
            <span className="tx-dim">{index + 1}</span>
            <strong>{project.name}</strong>
            <span className="tx-dim">{project.language || "Code"}</span>
          </button>
        ))}
      </div>
    );
  }

  function sectionOutput(target: string): ReactNode {
    if (target === "home") return <div className="tx-doc"><h2>Engineering from the token up.</h2><p>C++ and systems engineer in Kathmandu, building Sajilo, my own programming language.</p><p className="tx-next">Next: {cmd("cd about")} {cmd("projects")} {cmd("sajilo")}</p></div>;
    if (target === "about") return <div className="tx-doc"><h2>Deep in the system. Clear at the surface.</h2><dl className="tx-facts"><div><dt>Based in</dt><dd>Kathmandu, Nepal</dd></div><div><dt>Works on</dt><dd>Systems, networking, compilers</dd></div><div><dt>Building</dt><dd>Sajilo, a programming language</dd></div></dl></div>;
    if (target === "skills") return <dl className="tx-facts">
      <div><dt>C++</dt><dd>RAII, ownership, templates, the STL, data layout</dd></div>
      <div><dt>Systems</dt><dd>Concurrency, networking, Linux</dd></div>
      <div><dt>Performance</dt><dd>Profiling, measurement, cache awareness</dd></div>
      <div><dt>Interfaces</dt><dd>Python, TypeScript, React, developer tooling</dd></div>
    </dl>;
    if (target === "sajilo") return <div className="tx-doc">
      <h2>Sajilo <span className="tx-dim">सजिलो, &ldquo;easy&rdquo;</span></h2>
      <p>A compiled language with Nepali keywords, and its compiler in C++.</p>
      <ol className="tx-stages">{SAJILO_STAGES.map(([done, name, detail]) => (
        <li key={name} className={done ? "is-done" : "is-active"}><i aria-hidden="true">{done ? "✓" : "◐"}</i><strong>{name}</strong><span>{detail}</span></li>
      ))}</ol>
      <p className="tx-next">Try: {cmd("run sajilo")} {cmd("build")} {cmd("git log")}</p>
    </div>;
    if (target === "work") return projectList();
    if (target === "contact") return <dl className="tx-facts tx-links">
      <div><dt>Email</dt><dd><a href={`mailto:${email}`}>{email}</a></dd></div>
      <div><dt>GitHub</dt><dd><a href="https://github.com/SurajAdhikari01" target="_blank" rel="noreferrer">SurajAdhikari01 <ArrowUpRight size={13} /></a></dd></div>
      <div><dt>LinkedIn</dt><dd><a href="https://www.linkedin.com/in/surajadk/" target="_blank" rel="noreferrer">surajadk <ArrowUpRight size={13} /></a></dd></div>
    </dl>;
    return <>No section named <strong>{target}</strong>. Try {cmd("ls")}.</>;
  }

  function findProject(query: string) {
    const lowered = query.toLowerCase();
    return /^\d+$/.test(lowered) ? projects[Number(lowered) - 1] : projects.find((project) => project.name.toLowerCase().includes(lowered));
  }

  async function execute(raw: string) {
    if (busy) return;
    const command = raw.trim().slice(0, 240);
    if (!command) return;
    const cwd = displayPath(section);
    setInput("");
    history.current = [...history.current, command].slice(-100);
    historyIndex.current = history.current.length;
    draft.current = "";
    const [rawVerb, ...parts] = command.split(/\s+/);
    const verb = rawVerb.toLowerCase();
    const argument = parts.join(" ").trim();
    const lowerArgument = argument.toLowerCase();
    let output: ReactNode;

    switch (verb) {
      case "help":
      case "man":
        output = <div className="tx-help">{commandGroups.map((group) => (
          <section key={group.label}><h3>{group.label}</h3>{group.commands.map((item) => (
            <button key={item.command} type="button" onClick={() => { const base = item.command.split(/[ [<]/)[0]; setInput(base + (/[<[]/.test(item.command) ? " " : "")); inputRef.current?.focus(); }}>
              <code>{item.command}</code><span>{item.detail}</span>
            </button>
          ))}</section>
        ))}</div>;
        break;
      case "ls": {
        const target = normalizeSection(argument, section);
        if (target === "home") output = <p className="tx-row">{sectionNames.slice(1).map((name) => <Fragment key={name}>{cmd(`${name}/`)}</Fragment>)}</p>;
        else if (target === "work") output = projects.map((project) => `${project.name}/`).join("   ");
        else output = `${target}.md`;
        break;
      }
      case "tree": output = <pre className="tx-pre">{`~/portfolio
├── about/
├── skills/
├── sajilo/
│   └── compiler/src/
│       ├── lexer.cpp
│       ├── parser.cpp
│       ├── statements/
│       ├── Expressions/
│       └── IR/
├── work/          ${projects.length} repositories
└── contact/`}</pre>; break;
      case "pwd": output = `/portfolio${section === "home" ? "" : `/${section}`}`; break;
      case "cd": {
        const target = normalizeSection(argument || "home", section);
        if (sectionNames.includes(target)) { setSection(target); output = sectionOutput(target); }
        else output = <>cd: no such section: <strong>{argument}</strong></>;
        break;
      }
      case "cat": output = sectionOutput(normalizeSection(argument || ".", section)); break;
      // Every section name works on its own, as the welcome line suggests.
      case "about":
      case "home":
      case "work":
      case "whoami": {
        const target = verb === "whoami" ? "about" : verb;
        setSection(target);
        output = sectionOutput(target);
        break;
      }
      case "skills": output = sectionOutput("skills"); break;
      case "sajilo": output = sectionOutput("sajilo"); break;
      case "projects": output = sectionOutput("work"); break;
      case "project": {
        const project = findProject(argument);
        output = project ? <div className="tx-doc"><h2>{project.name.replaceAll("-", " ")}</h2><p>{project.description || "An evolving experiment in useful software."}</p><p className="tx-dim">{project.language || "Code"}{project.stars ? ` · ${project.stars} ★` : ""}</p><p><a href={project.homepage || project.url} target="_blank" rel="noreferrer">Open repository <ArrowUpRight size={13} /></a></p></div> : <>Not found. Try {cmd("projects")}.</>;
        break;
      }
      case "grep":
      case "find": {
        if (!argument) { output = `Usage: ${verb} <term>`; break; }
        const searchable = [
          ["about", "C++ systems networking compilers Kathmandu"],
          ["skills", "RAII ownership templates concurrency Linux profiling Python TypeScript React"],
          ["sajilo", "lexer Pratt parser AST semantic analysis IR three-address code x86-64 codegen"],
          ["contact", email],
          ...projects.map((project) => [`work/${project.name}`, `${project.name} ${project.description || ""} ${project.language || ""}`]),
        ];
        const matches = searchable.filter(([, content]) => content.toLowerCase().includes(lowerArgument));
        output = matches.length ? <div className="tx-table">{matches.map(([file, content]) => <div key={file}><strong>{file}</strong><span className="tx-dim">{content}</span></div>)}</div> : `No matches for “${argument}”.`;
        break;
      }
      case "cpp": output = <pre className="tx-pre">{`standard   C++20
build      CMake, Make
debug      GDB, sanitizers
platform   Linux`}</pre>; break;
      case "cout": output = <pre className="tx-pre">{evaluateCout(command)}</pre>; break;
      case "build":
      case "make": output = <pre className="tx-pre"><span className="tx-dim">$ cd compiler && cmake -B build && cmake --build build</span>{`\n[ 96%] Building CXX object CMakeFiles/sajilo.dir/src/utils.cpp.o\n[100%] Linking CXX executable sajilo\n`}<span className="tx-ok">[100%] Built target sajilo</span></pre>; break;
      case "run":
        if (lowerArgument && lowerArgument !== "sajilo") { output = "Usage: run sajilo"; break; }
        output = <div className="tx-doc">
          <p className="tx-dim">$ cat {trace.file}</p>
          <Code lang="sajilo" text={trace.source} />
          <p className="tx-dim">$ sajilo {trace.file} -o code out.asm</p>
          <Code lang="asm" text={asmText()} from={/^main\$:/} />
        </div>;
        break;
      case "bench": output = <ol className="tx-list"><li>Find a representative workload.</li><li>Measure before changing anything.</li><li>Profile CPU, allocations and cache.</li><li>Change one thing, compare again.</li></ol>; break;
      case "memory": output = <ol className="tx-list"><li>Prefer values and deterministic lifetimes.</li><li>RAII for every resource.</li><li>Make ownership explicit with unique_ptr.</li><li>Share ownership only when the model needs it.</li></ol>; break;
      case "git":
        output = lowerArgument === "log" || lowerArgument.startsWith("log")
          ? <pre className="tx-pre">{SAJILO_LOG.map(([hash, message]) => <span key={hash} className="sj-line"><span className="tx-hash">{hash}</span> {message}</span>)}</pre>
          : <>Try {cmd("git log")}.</>;
        break;
      case "open": {
        const project = findProject(argument);
        const url = project?.homepage || project?.url || (lowerArgument === "sajilo" ? SAJILO_REPO : lowerArgument === "github" ? "https://github.com/SurajAdhikari01" : lowerArgument === "linkedin" ? "https://www.linkedin.com/in/surajadk/" : lowerArgument === "email" ? `mailto:${email}` : "");
        if (url) { window.open(url, lowerArgument === "email" ? "_self" : "_blank", "noopener,noreferrer"); output = `Opening ${project?.name || lowerArgument}…`; }
        else output = "Usage: open <project | github | linkedin | email>";
        break;
      }
      case "contact": setSection("contact"); output = sectionOutput("contact"); break;
      case "email": output = <a href={`mailto:${email}`}>{email}</a>; break;
      case "copy":
        if (lowerArgument !== "email") { output = "Usage: copy email"; break; }
        setBusy(true);
        try { await navigator.clipboard.writeText(email); output = <span className="tx-ok">Copied.</span>; }
        catch { output = <a href={`mailto:${email}`}>{email}</a>; }
        finally { setBusy(false); }
        break;
      case "theme": {
        if (!["light", "dark"].includes(lowerArgument)) { output = "Usage: theme light | dark"; break; }
        document.documentElement.classList.toggle("dark", lowerArgument === "dark");
        try { localStorage.setItem("suraj-theme", lowerArgument); } catch { /* Optional preference. */ }
        output = `Theme set to ${lowerArgument}.`;
        break;
      }
      case "gui":
      case "exit":
      case "quit": {
        const target = normalizeSection(argument, section);
        if (target === "sajilo") window.location.hash = "compiler";
        else if (sectionNames.includes(target) && target !== "skills" && target !== "home") window.location.hash = target;
        output = "Back to the site…";
        window.setTimeout(() => onExit?.(), 240);
        break;
      }
      case "history": output = <pre className="tx-pre">{history.current.map((item, index) => `${String(index + 1).padStart(3, " ")}  ${item}`).join("\n")}</pre>; break;
      case "date": output = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Kathmandu" }).format(new Date()); break;
      case "echo": output = argument || ""; break;
      case "clear": setEntries([]); return;
      default: output = <>command not found: <strong>{rawVerb}</strong>. Try {cmd("help")}.</>;
    }
    setEntries((previous) => [...previous.slice(-59), { id: nextId.current++, command, cwd, output }]);
  }

  function submit(event: FormEvent) { event.preventDefault(); void execute(input); }
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      if (historyIndex.current === history.current.length) draft.current = input;
      historyIndex.current = Math.max(0, Math.min(history.current.length, historyIndex.current + (event.key === "ArrowUp" ? -1 : 1)));
      setInput(historyIndex.current === history.current.length ? draft.current : history.current[historyIndex.current]);
    } else if (event.key === "Tab") {
      event.preventDefault();
      if (suggestions.length) setInput(suggestions[0]); else if (!input.trim()) setInput("help");
    } else if (event.ctrlKey && event.key.toLowerCase() === "l") { event.preventDefault(); setEntries([]); }
    else if (event.ctrlKey && event.key.toLowerCase() === "c") { event.preventDefault(); setInput(""); }
  }

  return (
    <div className="tx" role="region" aria-label="Portfolio terminal">
      <header className="tx-top">
        <span>suraj@portfolio <span className="tx-dim">{displayPath(section)}</span></span>
        <button type="button" onClick={() => onExit?.()}>Back to site <kbd>⌘K</kbd></button>
      </header>

      <div className="tx-screen" ref={screenRef} onClick={(event) => { if (!(event.target as HTMLElement).closest("a, button") && !window.getSelection()?.toString()) inputRef.current?.focus({ preventScroll: true }); }}>
        <div className="tx-col">
          <div className="tx-welcome">
            <h1>Suraj Adhikari</h1>
            <p>The portfolio, as a shell. Try {cmd("about")} {cmd("projects")} {cmd("sajilo")} or {cmd("help")}.</p>
          </div>

          <div role="log" aria-live="polite" aria-relevant="additions">
            {entries.map((entry) => (
              <div className="tx-entry" key={entry.id}>
                <p className="tx-cmdline"><span className="tx-dim">{entry.cwd}</span> <b>❯</b> {entry.command}</p>
                <div className="tx-out">{entry.output}</div>
              </div>
            ))}
          </div>

          <form className="tx-prompt" onSubmit={submit}>
            <label htmlFor="terminal-command"><span className="tx-dim">{displayPath(section)}</span> <b>❯</b></label>
            <input ref={inputRef} id="terminal-command" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={onKeyDown} autoComplete="off" autoCapitalize="off" spellCheck={false} maxLength={240} aria-describedby="terminal-hint" />
          </form>
          {suggestions.length > 0 && (
            <p className="tx-suggest">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}>{suggestion}</button>)}</p>
          )}
        </div>
      </div>

      <footer className="tx-foot" id="terminal-hint">↑↓ history · Tab completes · Ctrl L clears</footer>
    </div>
  );
}

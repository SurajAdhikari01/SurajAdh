"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { ArrowUpRight, Check, ChevronRight, CircleDot, CornerDownLeft, Cpu, Terminal } from "lucide-react";

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
const sectionNames = ["home", "about", "skills", "sajilo", "work", "contact"];
const aliases: Record<string, string> = { projects: "work", project: "work", compiler: "sajilo", practice: "skills", socials: "contact" };
const commandGroups: { label: string; commands: CommandHelp[] }[] = [
  { label: "Navigate", commands: [
    { command: "ls [path]", detail: "List portfolio files" },
    { command: "tree", detail: "Map the complete portfolio" },
    { command: "cd <section>", detail: "Change section" },
    { command: "cat <section>", detail: "Read section content" },
    { command: "gui [section]", detail: "Open the graphical portfolio" },
  ] },
  { label: "Explore", commands: [
    { command: "projects", detail: "List selected repositories" },
    { command: "project <n|name>", detail: "Inspect a repository" },
    { command: "grep <term>", detail: "Search portfolio content" },
    { command: "open <target>", detail: "Open a project or profile" },
    { command: "contact", detail: "Show contact channels" },
  ] },
  { label: "C++ lab", commands: [
    { command: "cpp --version", detail: "Show engineering toolchain" },
    { command: "cout << \"text\"", detail: "Evaluate C++ stream output" },
    { command: "build [sajilo]", detail: "Inspect the build pipeline" },
    { command: "run sajilo", detail: "Run the compiler example" },
    { command: "memory", detail: "Show ownership principles" },
    { command: "bench", detail: "Show performance methodology" },
  ] },
  { label: "Shell", commands: [
    { command: "help / man", detail: "Command reference" },
    { command: "history", detail: "Show command history" },
    { command: "theme light|dark", detail: "Change terminal theme" },
    { command: "clear", detail: "Clear command output" },
    { command: "exit", detail: "Return to the GUI" },
  ] },
];
const commands = Array.from(new Set([
  "help", "man", "ls", "tree", "pwd", "cd", "cat", "find", "grep", "project", "projects", "open",
  "status", "history", "theme", "socials", "contact", "email", "copy", "gui", "exit", "quit", "mode",
  "whoami", "skills", "resume", "sajilo", "goto", "date", "echo", "clear", "cpp", "cmake", "build",
  "make", "run", "bench", "memory", "uname", "neofetch", "git", "cout", "std::cout",
]));

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
  const expression = source
    .replace(/^(?:std::)?cout\s*<</i, "")
    .replace(/;\s*$/, "");
  const values = expression.split(/\s*<<\s*/).map((token) => {
    const value = token.trim();
    if (/^(?:std::)?endl$/i.test(value)) return "\n";
    if (/^flush$/i.test(value)) return "";
    if (/^"(?:[^"\\]|\\.)*"$/.test(value)) {
      try { return JSON.parse(value) as string; } catch { return value.slice(1, -1); }
    }
    if (/^'(?:[^'\\]|\\.)*'$/.test(value)) {
      const character = value.slice(1, -1);
      return character === "\\n" ? "\n" : character === "\\t" ? "\t" : character;
    }
    if (/^(?:true|false|-?\d+(?:\.\d+)?[fFuUlL]*)$/i.test(value)) return value.replace(/[fFuUlL]+$/, "");
    return `[${value}]`;
  });
  return values.join("");
}

export function PortfolioTerminal({ projects, autoFocus = false, onNavigate, standalone = false, onExit }: { projects: TerminalProject[]; autoFocus?: boolean; onNavigate?: () => void; standalone?: boolean; onExit?: () => void }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState("home");
  const history = useRef<string[]>([]);
  const historyIndex = useRef(0);
  const draft = useRef("");
  const nextId = useRef(0);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    const value = input.trim().toLowerCase();
    if (!value) return [];
    const [verb, partial = ""] = value.split(/\s+/, 2);
    if (!value.includes(" ")) return commands.filter((command) => command.startsWith(verb) && command !== verb).slice(0, 5);
    if (["cd", "cat", "goto", "gui"].includes(verb)) return sectionNames.filter((name) => name.startsWith(partial)).map((name) => `${verb} ${name}`).slice(0, 5);
    if (["project", "open"].includes(verb)) return projects.filter((project) => project.name.toLowerCase().startsWith(partial)).map((project) => `${verb} ${project.name}`).slice(0, 5);
    return [];
  }, [input, projects]);

  useEffect(() => { outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight, behavior: "smooth" }); }, [entries]);
  useEffect(() => { if (autoFocus) inputRef.current?.focus(); }, [autoFocus]);
  useEffect(() => {
    const runExternalCommand = (event: Event) => { const command = (event as CustomEvent<string>).detail; if (command) void execute(command); };
    window.addEventListener("portfolio-command", runExternalCommand);
    return () => window.removeEventListener("portfolio-command", runExternalCommand);
  });

  function projectList(): ReactNode {
    if (!projects.length) return <span className="terminal-warning">Repository feed unavailable. Open GitHub for the complete archive.</span>;
    return <div className="terminal-project-table">
      <div className="terminal-table-head"><span>#</span><span>Repository</span><span>Language</span><span>★</span></div>
      {projects.map((project, index) => <button key={project.url} type="button" onClick={() => void execute(`project ${index + 1}`)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{project.name}</strong><span>{project.language || "Code"}</span><span>{project.stars ?? 0}</span></button>)}
    </div>;
  }

  function sectionOutput(target: string): ReactNode {
    if (target === "home") return <div className="terminal-document"><span className="terminal-doc-label">README.md</span><h2>Complex systems, made clear.</h2><p>Suraj Adhikari is a C++ and software engineer working across systems, compilers, networking, and thoughtful interfaces.</p><p className="terminal-next">Next: <button onClick={() => void execute("cd about")}>cd about</button> or <button onClick={() => void execute("projects")}>projects</button></p></div>;
    if (target === "about") return <div className="terminal-document"><span className="terminal-doc-label">about/profile.md</span><h2>Deep in the system. Clear at the surface.</h2><p>I build software from the inside out—starting with how it works and ending with how it feels.</p><p>My work moves between systems, networking, compilers, and interfaces, wherever careful engineering can make complexity feel simple.</p></div>;
    if (target === "skills") return <div className="terminal-skill-grid">
      <div><span>01</span><strong>C++</strong><p>RAII · ownership · templates · STL · data layout</p></div>
      <div><span>02</span><strong>Systems</strong><p>concurrency · synchronization · networking · Linux</p></div>
      <div><span>03</span><strong>Performance</strong><p>profiling · algorithms · measurement · cache awareness</p></div>
      <div><span>04</span><strong>Interfaces</strong><p>Python · TypeScript · React · developer tooling</p></div>
    </div>;
    if (target === "sajilo") return <div className="terminal-build-status"><div className="terminal-status-title"><CircleDot size={14} /><strong>Sajilo compiler</strong><span>C++ / active</span></div><ol>
      <li className="is-done"><span>01</span><strong>Tokenizer</strong><em>implemented</em></li><li className="is-done"><span>02</span><strong>Parser core</strong><em>implemented</em></li><li className="is-done"><span>03</span><strong>Function grammar</strong><em>implemented</em></li><li className="is-active"><span>04</span><strong>Expression grammar</strong><em>in progress</em></li><li><span>05</span><strong>AST + codegen</strong><em>next</em></li>
      </ol><p className="terminal-next">Try: <button onClick={() => void execute("build sajilo")}>build sajilo</button> or <button onClick={() => void execute("run sajilo")}>run sajilo</button></p></div>;
    if (target === "work") return projectList();
    if (target === "contact") return <div className="terminal-contact-grid"><a href={`mailto:${email}`}><span>EMAIL</span><strong>{email}</strong><ArrowUpRight size={14} /></a><a href="https://github.com/SurajAdhikari01" target="_blank" rel="noreferrer"><span>GITHUB</span><strong>SurajAdhikari01</strong><ArrowUpRight size={14} /></a><a href="https://www.linkedin.com/in/surajadk/" target="_blank" rel="noreferrer"><span>LINKEDIN</span><strong>surajadk</strong><ArrowUpRight size={14} /></a></div>;
    return <>No portfolio section named <strong>{target}</strong>. Run <strong>tree</strong> to inspect the filesystem.</>;
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
      case "man": {
        if (argument && argument !== "help") {
          const match = commandGroups.flatMap((group) => group.commands).find((item) => item.command.split(" ")[0] === lowerArgument);
          output = match ? <><strong>{match.command}</strong><br />{match.detail}<br /><span className="terminal-muted">Run help for the complete command index.</span></> : `No manual entry for ${argument}.`;
        } else output = <div className="terminal-help-grid">{commandGroups.map((group) => <section key={group.label}><h3>{group.label}</h3>{group.commands.map((item) => <button key={item.command} onClick={() => { const base = item.command.split(/[ /[]/)[0]; setInput(base + (item.command.includes("<") || item.command.includes("[") ? " " : "")); inputRef.current?.focus(); }}><code>{item.command}</code><span>{item.detail}</span></button>)}</section>)}</div>;
        break;
      }
      case "ls": {
        const target = normalizeSection(argument, section);
        if (target === "home") output = <div className="terminal-file-list">{sectionNames.slice(1).map((name) => <button key={name} onClick={() => void execute(`cd ${name}`)}><span>drwxr-xr-x</span><strong>{name}/</strong></button>)}</div>;
        else if (target === "work") output = projects.length ? projects.map((project) => `${project.name}/`).join("   ") : "No cached repositories.";
        else output = `${target}.md`;
        break;
      }
      case "tree": output = <pre className="terminal-tree">{`~/portfolio
├── about/
│   ├── profile.md
│   └── skills.md
├── sajilo/
│   ├── lexer.cpp
│   ├── parser.cpp
│   └── roadmap.md
├── work/              ${projects.length} repositories
│   └── <project>/README.md
└── contact/
    ├── email
    ├── github
    └── linkedin`}</pre>; break;
      case "pwd": output = `/portfolio${section === "home" ? "" : `/${section}`}`; break;
      case "cd":
      case "goto": {
        const target = normalizeSection(argument || "home", section);
        if (sectionNames.includes(target)) { setSection(target); output = sectionOutput(target); }
        else output = <>cd: no such directory: <strong>{argument}</strong></>;
        break;
      }
      case "cat": output = sectionOutput(normalizeSection(argument || ".", section)); break;
      case "whoami": output = sectionOutput("about"); break;
      case "skills": output = sectionOutput("skills"); break;
      case "resume": output = <>{sectionOutput("about")}<div className="terminal-output-spacer" />{sectionOutput("skills")}</>; break;
      case "sajilo":
      case "status": output = sectionOutput("sajilo"); break;
      case "projects": output = sectionOutput("work"); break;
      case "project": {
        const project = findProject(argument);
        output = project ? <article className="terminal-project-detail"><span className="terminal-doc-label">work/{project.name}/README.md</span><h2>{project.name.replaceAll("-", " ")}</h2><p>{project.description || "An evolving experiment in useful software and thoughtful engineering."}</p><dl><div><dt>language</dt><dd>{project.language || "Code"}</dd></div><div><dt>stars</dt><dd>{project.stars ?? 0}</dd></div><div><dt>forks</dt><dd>{project.forks ?? 0}</dd></div></dl>{!!project.topics?.length && <div className="terminal-tags">{project.topics.map((topic) => <span key={topic}>{topic}</span>)}</div>}<a href={project.homepage || project.url} target="_blank" rel="noreferrer">Open repository <ArrowUpRight size={13} /></a></article> : "Project not found. Run projects to see valid names and numbers.";
        break;
      }
      case "grep":
      case "find": {
        if (!argument) { output = `Usage: ${verb} <term>`; break; }
        const searchable = [["about/profile.md", "C++ systems networking compilers interfaces performance"], ["about/skills.md", "RAII ownership templates concurrency synchronization Linux profiling Python TypeScript React"], ["sajilo/roadmap.md", "lexer tokenizer parser grammar AST codegen"], ["contact/email", email], ...projects.map((project) => [`work/${project.name}/README.md`, `${project.name} ${project.description || ""} ${(project.topics || []).join(" ")} ${project.language || ""}`])];
        const matches = searchable.filter(([, content]) => content.toLowerCase().includes(lowerArgument));
        output = matches.length ? <div className="terminal-search-results">{matches.map(([file, content]) => <div key={file}><strong>{file}</strong><span>{content}</span></div>)}</div> : `No matches found for “${argument}”.`;
        break;
      }
      case "cpp":
      case "cmake": output = <pre className="terminal-code-output">{`suraj/toolchain 1.0
standard     C++20 / exploring C++23
build        CMake · Ninja · Make
debug        GDB · sanitizers
quality      clang-format · warnings-first
platform     Linux / Unix-oriented systems`}</pre>; break;
      case "cout":
      case "std::cout": output = <pre className="terminal-cout-output">{evaluateCout(command)}</pre>; break;
      case "build":
      case "make": output = <pre className="terminal-build-log"><span>[1/4]</span> Configure C++ toolchain{`\n`}<span>[2/4]</span> Compile lexer.cpp{`\n`}<span>[3/4]</span> Compile parser.cpp{`\n`}<span>[4/4]</span> Link sajilo{`\n`}<strong><Check size={12} /> Build graph is healthy — expression grammar remains active work.</strong></pre>; break;
      case "run": output = lowerArgument && lowerArgument !== "sajilo" ? "Usage: run sajilo" : <pre className="terminal-code-output">{`$ sajilo examples/hello.sajilo
tokenize  →  18 tokens
parse     →  function_decl
evaluate  →  parser milestone reached

Welcome Suraj!`}</pre>; break;
      case "bench": output = <div className="terminal-policy"><strong>Performance workflow</strong><span>01 Establish a representative workload</span><span>02 Measure before changing code</span><span>03 Profile CPU, allocation, and cache behavior</span><span>04 Change one variable and compare</span><em>No invented benchmark numbers—evidence belongs with the workload.</em></div>; break;
      case "memory": output = <div className="terminal-policy"><strong>Ownership policy</strong><span>Prefer values and deterministic lifetime</span><span>Use RAII for every acquired resource</span><span>Make ownership explicit with unique_ptr</span><span>Use shared ownership only when the model requires it</span><em>Lifetime is part of the design, not cleanup work.</em></div>; break;
      case "git": output = lowerArgument === "log" ? <pre>{`* HEAD  build Sajilo expression grammar
*       refine parser ownership
*       implement function declarations
*       tokenize source language`}</pre> : <><span className="terminal-success">On branch main · working tree intentional</span><br />Current focus: Sajilo expression grammar</>; break;
      case "uname":
      case "neofetch": output = <>SurajOS portfolio_cli C++20 x86_64<br /><span className="terminal-muted">Engineer: Suraj Adhikari · Shell: interactive portfolio · Status: available</span></>; break;
      case "open": {
        const project = findProject(argument);
        const url = project?.homepage || project?.url || (lowerArgument === "github" ? "https://github.com/SurajAdhikari01" : lowerArgument === "linkedin" ? "https://www.linkedin.com/in/surajadk/" : lowerArgument === "email" ? `mailto:${email}` : "");
        if (url) { window.open(url, lowerArgument === "email" ? "_self" : "_blank", "noopener,noreferrer"); output = `Opening ${project?.name || lowerArgument}...`; }
        else output = "Usage: open <project number|name|github|linkedin|email>";
        break;
      }
      case "contact":
      case "socials": output = sectionOutput("contact"); break;
      case "email": output = <a href={`mailto:${email}`}>{email}</a>; break;
      case "copy":
        if (lowerArgument !== "email") { output = "Usage: copy email"; break; }
        setBusy(true);
        try { await navigator.clipboard.writeText(email); output = <span className="terminal-success">Email copied to clipboard.</span>; }
        catch { output = <>Clipboard unavailable. Select: <a href={`mailto:${email}`}>{email}</a></>; }
        finally { setBusy(false); }
        break;
      case "theme": {
        if (!["light", "dark"].includes(lowerArgument)) { output = "Usage: theme light | dark"; break; }
        document.documentElement.classList.toggle("dark", lowerArgument === "dark");
        document.querySelector(".cli-site-mode")?.classList.toggle("is-light", lowerArgument === "light");
        try { localStorage.setItem("suraj-theme", lowerArgument); } catch { /* Optional preference. */ }
        output = `Theme set to ${lowerArgument}.`;
        break;
      }
      case "gui":
      case "exit":
      case "quit":
      case "mode": {
        const target = normalizeSection(argument === "gui" ? "home" : argument, section);
        if (verb === "mode" && lowerArgument === "cli") { output = "Already using the command-line interface."; break; }
        if (sectionNames.includes(target) && target !== "skills" && target !== "sajilo") window.location.hash = target;
        if (target === "sajilo") window.location.hash = "compiler";
        output = `Opening graphical portfolio${target !== "home" ? ` at ${target}` : ""}...`;
        window.setTimeout(() => onExit?.(), 240);
        break;
      }
      case "history": output = history.current.map((item, index) => `${String(index + 1).padStart(3, " ")}  ${item}`).join("\n"); break;
      case "date": output = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "long", timeZone: "Asia/Kathmandu" }).format(new Date()); break;
      case "echo": output = argument || "Usage: echo <text>"; break;
      case "clear": setEntries([]); return;
      default: output = <>command not found: <strong>{rawVerb}</strong><br /><span className="terminal-muted">Type help, or press Tab to complete a command.</span></>;
    }
    setEntries((previous) => [...previous.slice(-59), { id: nextId.current++, command, cwd, output }]);
    window.setTimeout(() => onNavigate?.(), 180);
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

  return <div className={`portfolio-terminal${standalone ? " terminal-standalone" : ""}`} id="terminal" role="region" aria-label="Interactive portfolio terminal">
    <div className="terminal-topbar"><span className="terminal-window-controls" aria-hidden="true"><i /><i /><i /></span><span className="terminal-tab"><Terminal size={13} /> portfolio — {displayPath(section)}</span></div>
    <div className="terminal-screen" ref={outputRef} role="log" aria-label="Command output" aria-live="polite" aria-relevant="additions" tabIndex={0} onClick={(event) => { if (!(event.target as HTMLElement).closest("a, button")) inputRef.current?.focus(); }}>
      <div className="terminal-welcome"><div className="terminal-welcome-mark"><Cpu size={18} /><span>PORTFOLIO_CLI</span><small>C++20</small></div><h1>Suraj Adhikari<span>::</span>engineer</h1><p>A complete command-line view of my work, systems practice, and current compiler project.</p><div className="terminal-welcome-actions"><button onClick={() => void execute("help")}><ChevronRight size={12} /> command index</button><button onClick={() => void execute("tree")}><ChevronRight size={12} /> explore filesystem</button></div></div>
      {entries.map((entry) => <div className="terminal-entry" key={entry.id}><div className="terminal-command"><span>suraj@portfolio</span><i>{entry.cwd}</i><b>❯</b> {entry.command}</div><div className="terminal-output">{entry.output}</div></div>)}
    </div>
    <div className={`terminal-completions${suggestions.length ? " is-visible" : ""}`} aria-label="Command suggestions">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}>{suggestion}</button>)}</div>
    <form className="terminal-prompt" onSubmit={submit}><span className="terminal-prompt-identity" aria-hidden="true"><b>suraj@portfolio</b><i>{displayPath(section)}</i><em>❯</em></span><label htmlFor="terminal-command" className="sr-only">Terminal command</label><input ref={inputRef} id="terminal-command" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={onKeyDown} placeholder="Type a command or ‘help’" autoComplete="off" autoCapitalize="off" spellCheck={false} maxLength={240} aria-describedby="terminal-hint" /><button type="submit" disabled={busy || !input.trim()} aria-label="Run command"><CornerDownLeft size={16} /></button></form>
    <div className="terminal-bottom-bar"><div className="terminal-shortcuts"><span>QUICK</span>{["about", "skills", "projects", "sajilo"].map((command) => <button key={command} disabled={busy} onClick={() => { void execute(command === "about" ? "cat about" : command); inputRef.current?.focus({ preventScroll: true }); }}>{command}</button>)}</div><p id="terminal-hint" className="terminal-hint"><kbd>↑↓</kbd> history <kbd>Tab</kbd> complete <kbd>Ctrl L</kbd> clear</p></div>
  </div>;
}

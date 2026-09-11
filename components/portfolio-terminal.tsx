"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { ArrowUpRight, CornerDownLeft, Terminal } from "lucide-react";

export type TerminalProject = { name: string; url: string; language: string | null };
type Entry = { id: number; command: string; output: ReactNode };
const commands = ["help", "ls", "tree", "pwd", "cd", "cat", "project", "open", "status", "history", "theme", "socials", "email", "gui", "exit", "quit", "mode", "whoami", "skills", "projects", "sajilo", "contact", "goto", "copy", "date", "echo", "clear"];
const destinations: Record<string, string> = { home: "home", about: "about", practice: "about", sajilo: "compiler", work: "work", contact: "contact" };
const email = "surajadhikari01@icloud.com";

export function PortfolioTerminal({ projects, autoFocus = false, onNavigate, standalone = false, onExit }: { projects: TerminalProject[]; autoFocus?: boolean; onNavigate?: () => void; standalone?: boolean; onExit?: () => void }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [path, setPath] = useState("~");
  const history = useRef<string[]>([]);
  const historyIndex = useRef(0);
  const draft = useRef("");
  const nextId = useRef(0);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const output = outputRef.current;
    if (output) output.scrollTop = output.scrollHeight;
  }, [entries]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function sectionOutput(section: string): ReactNode {
    if (section === "home") return <>Suraj Adhikari<br />C++ engineer building systems, compilers, and dependable software from Kathmandu.</>;
    if (section === "about" || section === "practice") return <>I build software from the inside out — from memory and parser internals to interfaces that feel simple.<br /><br /><span className="terminal-muted">BUILD</span> robust software with clear ownership.<br /><span className="terminal-muted">UNDERSTAND</span> low-level concepts deeply.<br /><span className="terminal-muted">MEASURE</span> performance with evidence.<br /><span className="terminal-muted">REFINE</span> complex systems until they feel simple.</>;
    if (section === "sajilo") return <>SAJILO / C++ COMPILER / WIP<br /><br />[done] tokenization — keywords, operators, literals<br />[done] parser core — lookahead, match, expect<br />[done] function grammar — signatures, types, bodies<br />[wip ] expression grammar — primary, unary, precedence<br />[next] AST ownership, scopes, semantics, codegen</>;
    if (section === "work" || section === "projects") return projects.length ? <ul className="terminal-projects">{projects.map((project, index) => <li key={project.url}><span className="terminal-project-index">{String(index + 1).padStart(2, "0")}</span><a href={project.url} target="_blank" rel="noreferrer">{project.name}<ArrowUpRight size={12} /></a><span>{project.language || "Code"}</span></li>)}</ul> : "Repository feed unavailable.";
    if (section === "contact") return <><a href={`mailto:${email}`}>{email}</a><br /><a href="https://github.com/SurajAdhikari01" target="_blank" rel="noreferrer">github.com/SurajAdhikari01 ↗</a><br /><a href="https://www.linkedin.com/in/surajadk/" target="_blank" rel="noreferrer">linkedin.com/in/surajadk ↗</a></>;
    return <>No document named <strong>{section}</strong>. Run <strong>ls</strong> or <strong>tree</strong>.</>;
  }

  async function execute(raw: string) {
    if (busy) return;
    const command = raw.trim().slice(0, 200);
    if (!command) return;
    setInput("");
    history.current = [...history.current, command].slice(-50);
    historyIndex.current = history.current.length;
    draft.current = "";
    const [verb, ...parts] = command.split(/\s+/);
    const argument = parts.join(" ");
    let output: ReactNode;
    switch (verb.toLowerCase()) {
      case "help":
        output = <dl className="terminal-help">{[
          ["whoami", "Meet the engineer"], ["skills", "Explore my C++ focus"],
          ["ls / tree", "List or map the portfolio"], ["cd <section>", "Move into a section"],
          ["cat <section>", "Read any section"], ["project <n|name>", "Inspect one repository"],
          ["open <n|github|linkedin>", "Open a destination"], ["status", "Show current engineering status"],
          ["theme light|dark", "Change the interface theme"], ["history", "Show command history"],
          ["socials / contact", "Get in touch"], ["copy email", "Copy my email address"],
          ["exit / mode gui", "Return to the graphical site"],
          ["date", "Local time in Kathmandu"], ["echo <text>", "Print something"], ["clear", "Start fresh"],
        ].map(([name, detail]) => <div key={name}><dt>{name}</dt><dd>{detail}</dd></div>)}</dl>;
        break;
      case "ls":
        output = <div className="terminal-list">home/ &nbsp; about/ &nbsp; sajilo/ &nbsp; work/ &nbsp; contact/</div>;
        break;
      case "tree":
        output = <pre className="terminal-tree">{`portfolio/
├── home
├── about
│   └── practice
├── work
│   ├── sajilo
│   └── projects [${projects.length}]
└── contact
    ├── email
    ├── github
    └── linkedin`}</pre>;
        break;
      case "pwd": output = `/portfolio/${path === "~" ? "" : path.slice(2)}`; break;
      case "cat": output = sectionOutput(argument.toLowerCase().replace(/^\.\//, "")); break;
      case "status": output = sectionOutput("sajilo"); break;
      case "history": output = history.current.map((item, index) => `${String(index + 1).padStart(2, "0")}  ${item}`).join("\n"); break;
      case "gui":
      case "exit":
      case "quit":
        output = "Switching to the graphical interface...";
        window.setTimeout(() => onExit?.(), 220);
        break;
      case "mode":
        if (argument.toLowerCase() === "gui") {
          output = "Switching to the graphical interface...";
          window.setTimeout(() => onExit?.(), 220);
        } else if (argument.toLowerCase() === "cli") {
          output = "Already using the command-line interface.";
        } else {
          output = "Usage: mode gui | mode cli";
        }
        break;
      case "whoami":
        output = <>Suraj Adhikari — C++ &amp; systems engineer.<br />Based in Kathmandu, Nepal. Working worldwide.<br />Curious about memory, networking, and what makes software fast.</>;
        break;
      case "skills":
        output = <>C++ → ownership, RAII, data layout<br />Systems → concurrency, synchronization, networking<br />Performance → algorithms, profiling, measurement<br /><span className="terminal-muted">Also: Python, TypeScript, React.</span></>;
        break;
      case "projects":
        output = sectionOutput("work");
        break;
      case "project": {
        const query = argument.toLowerCase();
        const project = /^\d+$/.test(query) ? projects[Number(query) - 1] : projects.find((item) => item.name.toLowerCase().includes(query));
        output = project ? <><strong>{project.name}</strong><br />language: {project.language || "Code"}<br />url: <a href={project.url} target="_blank" rel="noreferrer">{project.url} ↗</a><br /><span className="terminal-muted">Run: open {projects.indexOf(project) + 1}</span></> : "Project not found. Run projects to see valid names and numbers.";
        break;
      }
      case "open": {
        const target = argument.toLowerCase();
        const project = /^\d+$/.test(target) ? projects[Number(target) - 1] : projects.find((item) => item.name.toLowerCase() === target);
        const url = project?.url || (target === "github" ? "https://github.com/SurajAdhikari01" : target === "linkedin" ? "https://www.linkedin.com/in/surajadk/" : target === "email" ? `mailto:${email}` : "");
        if (url) { window.open(url, target === "email" ? "_self" : "_blank", "noopener,noreferrer"); output = `Opening ${project?.name || target}...`; }
        else output = "Usage: open <project number|exact name|github|linkedin|email>";
        break;
      }
      case "sajilo":
        output = <>Sajilo is a compiler in progress, written in C++.<br />Lexer and function parsing are implemented; primary and unary expressions are underway.<br /><span className="terminal-muted">Run: cd sajilo</span></>;
        break;
      case "contact":
      case "socials": output = sectionOutput("contact"); break;
      case "email": output = <a href={`mailto:${email}`}>{email}</a>; break;
      case "theme": {
        const requestedTheme = argument.toLowerCase();
        if (requestedTheme !== "light" && requestedTheme !== "dark") { output = "Usage: theme light | theme dark"; break; }
        document.documentElement.classList.toggle("dark", requestedTheme === "dark");
        try { localStorage.setItem("suraj-theme", requestedTheme); } catch { /* Optional persistence. */ }
        output = `Theme set to ${requestedTheme}.`;
        break;
      }
        break;
      case "cd":
      case "goto": {
        const target = destinations[argument.toLowerCase()];
        if (target) {
          if (standalone) {
            const section = argument.toLowerCase();
            setPath(`~/${section}`);
            output = sectionOutput(section);
          } else {
            window.location.hash = target;
            const destination = document.getElementById(target);
            if (destination) { destination.tabIndex = -1; destination.focus({ preventScroll: true }); }
            output = `Moved to ${argument.toLowerCase()}.`;
            window.setTimeout(() => onNavigate?.(), 180);
          }
        } else output = "Usage: cd home | about | practice | sajilo | work | contact";
        break;
      }
      case "copy":
        if (argument.toLowerCase() !== "email") { output = "Usage: copy email"; break; }
        setBusy(true);
        try { await navigator.clipboard.writeText(email); output = "Email copied. Let’s make something good."; }
        catch { output = <>Clipboard unavailable. You can select this address: <a href={`mailto:${email}`}>{email}</a></>; }
        finally { setBusy(false); }
        break;
      case "date":
        output = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "long", timeZone: "Asia/Kathmandu" }).format(new Date());
        break;
      case "echo": output = argument || "Usage: echo <text>"; break;
      case "clear": setEntries([]); return;
      default: output = <>Unknown command: {verb}. Type <strong>help</strong> to see what works.</>;
    }
    const id = nextId.current++;
    setEntries(previous => [...previous.slice(-39), { id, command, output }]);
  }

  function submit(event: FormEvent) { event.preventDefault(); void execute(input); }
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      if (historyIndex.current === history.current.length) draft.current = input;
      historyIndex.current = Math.max(0, Math.min(history.current.length, historyIndex.current + (event.key === "ArrowUp" ? -1 : 1)));
      setInput(historyIndex.current === history.current.length ? draft.current : history.current[historyIndex.current]);
    } else if (event.key === "Tab" && input.trim()) {
      const matches = commands.filter(command => command.startsWith(input.trim().toLowerCase()));
      if (matches.length === 1) { event.preventDefault(); setInput(matches[0]); }
    } else if (event.ctrlKey && event.key.toLowerCase() === "l") {
      event.preventDefault(); setEntries([]);
    }
  }

  return (
    <div className={`portfolio-terminal${standalone ? " terminal-standalone" : ""}`} id="terminal" role="region" aria-label="Interactive portfolio terminal">
      <div className="terminal-topbar"><span><Terminal size={14} /> suraj / interactive</span><span className="terminal-online">Ready</span></div>
      <div className="terminal-screen" ref={outputRef} role="log" aria-label="Command output" aria-live="polite" aria-relevant="additions" tabIndex={0}>
        <div className="terminal-welcome"><span className="terminal-ascii" aria-hidden="true">C++<span> / {standalone ? "portfolio_cli" : "hello, world."}</span></span><p>{standalone ? "CLI mode active. The complete portfolio is available as commands." : "A small window into my work."}<br />Type <strong>help</strong> to see what you can do.</p></div>
        {entries.map(entry => <div className="terminal-entry" key={entry.id}><div className="terminal-command"><span aria-hidden="true">❯</span> {entry.command}</div><div className="terminal-output">{entry.output}</div></div>)}
      </div>
      <form className="terminal-prompt" onSubmit={submit}>
        <span className="terminal-path" aria-hidden="true">{standalone ? `${path} ❯` : "❯"}</span><label htmlFor="terminal-command" className="sr-only">Terminal command</label>
        <input ref={inputRef} id="terminal-command" value={input} onChange={event => setInput(event.target.value)} onKeyDown={onKeyDown} placeholder="Try help" autoComplete="off" autoCapitalize="off" spellCheck={false} maxLength={200} aria-describedby="terminal-hint" />
        <button type="submit" disabled={busy || !input.trim()} aria-label="Run command"><CornerDownLeft size={17} /></button>
      </form>
      <div className="terminal-shortcuts"><span>Try</span>{["whoami", "projects", "contact"].map(command => <button key={command} disabled={busy} onClick={() => { void execute(command); inputRef.current?.focus({ preventScroll: true }); }}>{command}</button>)}</div>
      <p id="terminal-hint" className="terminal-hint">Portfolio commands · ↑↓ history · Tab autocomplete</p>
    </div>
  );
}

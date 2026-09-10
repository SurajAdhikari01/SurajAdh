"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { ArrowUpRight, CornerDownLeft, Terminal } from "lucide-react";

export type TerminalProject = { name: string; url: string; language: string | null };
type Entry = { id: number; command: string; output: ReactNode };
const commands = ["help", "whoami", "skills", "projects", "contact", "goto", "copy", "date", "echo", "clear"];
const destinations: Record<string, string> = { home: "home", about: "about", work: "work", approach: "ai-lab", contact: "contact" };
const email = "surajadhikari01@icloud.com";

export function PortfolioTerminal({ projects }: { projects: TerminalProject[] }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
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
          ["projects", "Browse GitHub repositories"], ["contact", "Get in touch"],
          ["goto work", "Jump to a section"], ["copy email", "Copy my email address"],
          ["date", "Local time in Kathmandu"], ["echo <text>", "Print something"], ["clear", "Start fresh"],
        ].map(([name, detail]) => <div key={name}><dt>{name}</dt><dd>{detail}</dd></div>)}</dl>;
        break;
      case "whoami":
        output = <>Suraj Adhikari — C++ &amp; systems engineer.<br />Based in Kathmandu, Nepal. Working worldwide.<br />Curious about memory, networking, and what makes software fast.</>;
        break;
      case "skills":
        output = <>C++ → ownership, RAII, data layout<br />Systems → concurrency, synchronization, networking<br />Performance → algorithms, profiling, measurement<br /><span className="terminal-muted">Also: Python, TypeScript, React.</span></>;
        break;
      case "projects":
        output = projects.length ? <ul className="terminal-projects">{projects.map(project => <li key={project.url}><a href={project.url} target="_blank" rel="noreferrer">{project.name}<ArrowUpRight size={12} /></a><span>{project.language || "Code"}</span></li>)}</ul> : <>The repository feed is unavailable. <a href="https://github.com/SurajAdhikari01" target="_blank" rel="noreferrer">Explore GitHub ↗</a></>;
        break;
      case "contact":
        output = <><a href={`mailto:${email}`}>{email}</a><br /><a href="https://github.com/SurajAdhikari01" target="_blank" rel="noreferrer">GitHub ↗</a>{" · "}<a href="https://www.linkedin.com/in/surajadk/" target="_blank" rel="noreferrer">LinkedIn ↗</a><br /><span className="terminal-muted">Tip: copy email puts the address on your clipboard.</span></>;
        break;
      case "goto": {
        const target = destinations[argument.toLowerCase()];
        if (target) {
          window.location.hash = target;
          const destination = document.getElementById(target);
          if (destination) { destination.tabIndex = -1; destination.focus({ preventScroll: true }); }
          output = `Moved to ${argument.toLowerCase()}.`;
        } else output = "Usage: goto home | about | work | approach | contact";
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
    <div className="portfolio-terminal" id="terminal" role="region" aria-label="Interactive portfolio terminal">
      <div className="terminal-topbar"><span><Terminal size={14} /> suraj / interactive</span><span className="terminal-online">Ready</span></div>
      <div className="terminal-screen" ref={outputRef} role="log" aria-label="Command output" aria-live="polite" aria-relevant="additions" tabIndex={0}>
        <div className="terminal-welcome"><span className="terminal-ascii" aria-hidden="true">C++<span> / hello, world.</span></span><p>A small window into my work.<br />Type <strong>help</strong> to see what you can do.</p></div>
        {entries.map(entry => <div className="terminal-entry" key={entry.id}><div className="terminal-command"><span aria-hidden="true">❯</span> {entry.command}</div><div className="terminal-output">{entry.output}</div></div>)}
      </div>
      <form className="terminal-prompt" onSubmit={submit}>
        <span aria-hidden="true">❯</span><label htmlFor="terminal-command" className="sr-only">Terminal command</label>
        <input ref={inputRef} id="terminal-command" value={input} onChange={event => setInput(event.target.value)} onKeyDown={onKeyDown} placeholder="Try help" autoComplete="off" autoCapitalize="off" spellCheck={false} maxLength={200} aria-describedby="terminal-hint" />
        <button type="submit" disabled={busy || !input.trim()} aria-label="Run command"><CornerDownLeft size={17} /></button>
      </form>
      <div className="terminal-shortcuts"><span>Try</span>{["whoami", "projects", "contact"].map(command => <button key={command} disabled={busy} onClick={() => { void execute(command); inputRef.current?.focus({ preventScroll: true }); }}>{command}</button>)}</div>
      <p id="terminal-hint" className="terminal-hint">Portfolio commands · ↑↓ history · Tab autocomplete</p>
    </div>
  );
}

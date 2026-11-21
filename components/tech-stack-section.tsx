"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import trace from "@/data/sajilo-trace.json";
import { highlightLines, parseTokens, tokenClass } from "@/lib/sajilo-highlight";
import type { Lang, Token } from "@/lib/sajilo-highlight";

/*
 * One Sajilo program, followed through every stage of the compiler. All
 * compiler output lives in data/sajilo-trace.json, exactly as the compiler
 * prints it; this file only decides how each stage is framed and lit.
 *
 * Each stage in the JSON may be a raw string, or the compiler's own JSON
 * envelope: { "status": bool, "output": string, "error": string }. Tokens
 * may also be an array of { "type", "value" }.
 */

const REPO = "https://github.com/SurajAdhikari01/sajilo-compiler";

type Envelope = { status: boolean; output: string; error?: string };
type StageData = string | Envelope | Token[];
type Trace = { file: string; source: string } & Record<StageKey, StageData>;
type StageKey = "tokens" | "ast" | "semantics" | "ir" | "asm";

const data = trace as Trace;

type Stage = {
  key: StageKey;
  name: string;
  title: string;
  lang: Lang;
  /** Start the excerpt at the first line matching this, e.g. the user's code. */
  focus?: RegExp;
};

const stages: Stage[] = [
  { key: "tokens", name: "Lexer", title: "Characters become tokens.", lang: "tokens" },
  { key: "ast", name: "Parser", title: "A Pratt parser builds the tree.", lang: "tree" },
  { key: "semantics", name: "Semantics", title: "Names resolved, types checked.", lang: "tree" },
  { key: "ir", name: "IR", title: "Lowered to three-address code.", lang: "ir" },
  { key: "asm", name: "Codegen", title: "x86-64, straight to Linux syscalls.", lang: "asm", focus: /^main\$:/ },
];

const MAX_LINES = 13;

function unwrap(value: StageData): { text: string | Token[]; error?: string } {
  if (Array.isArray(value) || typeof value === "string") return { text: value };
  if (!value.status) return { text: "", error: value.error || "Compilation failed." };
  return { text: value.output };
}

// Keeps the panel a fixed size: start at the interesting part, trim the rest.
function excerpt(text: string, focus?: RegExp) {
  let lines = text.replace(/\t/g, "  ").split("\n");
  if (focus) {
    const at = lines.findIndex((l) => focus.test(l));
    if (at > 0) lines = lines.slice(at);
  }
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const cut = lines.length > MAX_LINES;
  return { text: lines.slice(0, MAX_LINES).join("\n"), cut };
}

function StageOutput({ stage }: { stage: Stage }) {
  const { text, error } = unwrap(data[stage.key]);
  if (error) return <pre className="sj-code"><span className="hl-err">{error}</span></pre>;

  if (stage.lang === "tokens") {
    return (
      <p className="sj-tokens">
        {parseTokens(text).map((t, i) => (
          <span key={i}>
            <span className={tokenClass(t.type)}>{t.type}</span>
            {t.value !== undefined && <span className="hl-dim">({t.value})</span>}
          </span>
        ))}
      </p>
    );
  }

  const { text: shown, cut } = excerpt(text as string, stage.focus);
  return (
    <pre className="sj-code">
      {highlightLines(stage.lang, shown).map((line, i) => {
        const raw = shown.split("\n")[i] ?? "";
        // Assembly reads by its labels: indent instructions beneath them.
        const indent = stage.lang === "asm" && raw.trim() && !/:\s*$/.test(raw) && !/^\s*(section|global)\b/.test(raw);
        return (
          <span key={i} className={indent ? "sj-line sj-indent" : "sj-line"}>{line}</span>
        );
      })}
      {cut && <span className="hl-dim">…</span>}
    </pre>
  );
}

const sourceLines = highlightLines("sajilo", data.source);

export function TechStackSection() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const stage = stages[active];

  // Plays through the stages until someone takes over.
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % stages.length), 4500);
    return () => window.clearInterval(id);
  }, [paused]);

  return (
    <div id="compiler" className="scroll-mt-8">
      <motion.div
        className="sj"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
      >
        <div className="sj-head">
          <div className="sj-tabs" role="tablist" aria-label="Sajilo compiler stages">
            {stages.map((item, index) => (
              <button
                type="button"
                role="tab"
                key={item.key}
                aria-selected={index === active}
                className={index === active ? "is-active" : undefined}
                onClick={() => {
                  setActive(index);
                  setPaused(true);
                }}
              >
                {item.name}
                {index === active && !paused && <i aria-hidden="true" />}
              </button>
            ))}
          </div>
          <a className="sj-repo" href={REPO} target="_blank" rel="noreferrer">
            Source <ArrowUpRight aria-hidden="true" />
          </a>
        </div>

        <div className="sj-body">
          <div className="sj-source">
            <p className="sj-file">{data.file}</p>
            <pre aria-label="Example Sajilo program"><code>
              {sourceLines.map((line, i) => (
                <span key={i}>
                  <b>{i + 1}</b>{line}
                </span>
              ))}
            </code></pre>
          </div>

          <div className="sj-output" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={stage.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <p className="sj-title">{stage.title}</p>
                <StageOutput stage={stage} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

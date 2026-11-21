import type { ReactNode } from "react";

/*
 * Highlighters for each format the Sajilo compiler produces. Each works line
 * by line with small, ordered regex rules written against what the compiler
 * actually emits (see compiler/src/IR/*.cpp and utils.cpp), so the output
 * can be pasted in raw and still read correctly.
 *
 * Classes: hl-kw keyword · hl-type type · hl-str string · hl-num number
 *          hl-label label · hl-fn function/symbol · hl-reg register
 *          hl-temp temporary · hl-com comment · hl-dim punctuation/glyphs
 */

export type Lang = "sajilo" | "tokens" | "tree" | "ir" | "asm";

type Rule = [RegExp, string | ((m: RegExpExecArray) => string)];

function paint(line: string, rules: Rule[], key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = line;
  let n = 0;
  while (rest.length) {
    let best: { index: number; m: RegExpExecArray; cls: string } | null = null;
    for (const [re, cls] of rules) {
      // Anchored rules (labels, mnemonics) only apply at the true line start.
      if (re.source.startsWith("^") && rest.length !== line.length) continue;
      const m = re.exec(rest);
      if (m && m[0].length && (!best || m.index < best.index)) {
        best = { index: m.index, m, cls: typeof cls === "function" ? cls(m) : cls };
      }
    }
    if (!best) {
      out.push(rest);
      break;
    }
    if (best.index) out.push(rest.slice(0, best.index));
    out.push(<span key={`${key}-${n++}`} className={best.cls}>{best.m[0]}</span>);
    rest = rest.slice(best.index + best.m[0].length);
  }
  return out;
}

/* Sajilo source: keywords from TokenType, `#` comments. */
const SAJILO_KW = /\b(?:func|deu|manau|const|jaba|natra|jabasamma|laijau|read|write|exit|bol|sun|gar|feri|rok|suru|niski|dohorau)\b/;
const SAJILO: Rule[] = [
  [/#.*$/, "hl-com"],
  [/"(?:[^"\\]|\\.)*"/, "hl-str"],
  [SAJILO_KW, "hl-kw"],
  [/\b(?:int|string|float|char|bool)\b/, "hl-type"],
  [/\b\d+(?:\.\d+)?\b/, "hl-num"],
  [/\b[A-Za-z_]\w*(?=\s*\()/, "hl-fn"],
  [/->|[{}()[\];,:]/, "hl-dim"],
];

/* Three-address code, as IR/*.cpp prints it. */
const IR: Rule[] = [
  [/^[^\s=]+(?:\([^)]*\))?:(?=\s*(?:"|$))/, "hl-label"], // main(int,int):  b0:  str0:
  [/"(?:[^"\\]|\\.)*"/, "hl-str"],
  [/\b(?:if|false|true|jmp|param|call|return)\b/, "hl-kw"],
  [/\b__sys_\w+(?:\(\))?/, "hl-fn"],
  [/\bt\d+\b/, "hl-temp"],
  [/\bb\d+\b/, "hl-label"],
  [/\bstr\d+\b/, "hl-fn"],
  [/\b\d+\b/, "hl-num"],
  [/[=+\-*/%<>!&|^]+/, "hl-dim"],
];

/* x86-64 NASM, as utils.cpp and FunctionLabel.cpp print it. */
const ASM: Rule[] = [
  [/;.*$/, "hl-com"],
  [/"(?:[^"\\]|\\.)*"/, "hl-str"],
  [/^\s*(?:section|global|extern|default)\b/, "hl-kw"],
  [/\.(?:data|text|bss|rodata)\b/, "hl-label"],
  [/^\s*[\w.$@]+:/, "hl-label"],
  [/\b(?:db|dw|dd|dq|resb|resq)\b/, "hl-kw"],
  [/^\s*[a-z]{2,8}\b/, "hl-kw"], // the mnemonic
  [/\b(?:qword|dword|word|byte)\b/, "hl-type"],
  [/\b(?:r(?:[abcd]x|si|di|bp|sp|8|9|1[0-5])|e(?:[abcd]x|si|di|bp|sp)|[abcd][lh])\b/, "hl-reg"],
  [/-?\b(?:0x[\da-f]+|\d+)\b/i, "hl-num"],
  [/[\w.$@]+/, "hl-fn"],
  [/[[\],+\-]/, "hl-dim"],
];

/* Trees and tables (AST, symbol table): glyphs dim, types and values lit. */
const TREE: Rule[] = [
  [/[├└│─]+/, "hl-dim"],
  [/"(?:[^"\\]|\\.)*"/, "hl-str"],
  [/\b(?:int|string|float|char|bool)\b/, "hl-type"],
  [/\b(?:ok|pass(?:ed)?|0 errors)\b/, "hl-ok"],
  [/\b(?:error|errors|mismatch|undefined)\b/, "hl-err"],
  [/\b[A-Z][A-Za-z]+\b/, "hl-kw"],
  [/\b\d+\b/, "hl-num"],
  [/->|[(),:=]/, "hl-dim"],
];

const RULES: Record<Exclude<Lang, "tokens">, Rule[]> = { sajilo: SAJILO, ir: IR, asm: ASM, tree: TREE };

export function highlightLines(lang: Exclude<Lang, "tokens">, text: string): ReactNode[][] {
  return text.split("\n").map((line, i) => paint(line, RULES[lang], `${lang}${i}`));
}

/* Tokens: one per line, as `TYPE(value)`, `TYPE value` or bare `TYPE`. */
const TOKEN_KEYWORDS = new Set([
  "FUNC", "DEU", "MANAU", "CONST", "JABA", "NATRA", "JABASAMMA", "LAIJAU", "READ", "WRITE", "EXIT",
  "BOL", "SUN", "GAR", "FERI", "ROK", "SURU", "NISKI", "DOHORAU", "KEYWORD",
]);

export type Token = { type: string; value?: string };

export function tokenClass(type: string) {
  if (TOKEN_KEYWORDS.has(type)) return "hl-kw";
  if (type === "IDENTIFIER") return "hl-id";
  if (type.endsWith("_LITERAL") || type === "TRUE" || type === "FALSE") return "hl-str";
  return "hl-dim";
}

export function parseTokens(input: string | Token[]): Token[] {
  if (Array.isArray(input)) return input;
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = /^([A-Z_]+)(?:\((.*)\)|\s+(.+))?$/.exec(line);
      return m ? { type: m[1], value: m[2] ?? m[3] } : { type: line };
    });
}

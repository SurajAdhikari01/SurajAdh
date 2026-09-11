"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";

const stages = [
  {
    id: "01",
    sourceLine: 0,
    label: "TOKENIZATION",
    status: "IMPLEMENTED",
    note: "keywords · operators · literals",
    title: "The lexer classifies the source.",
    output: (
      <div className="compiler-token-stream">
        <span data-kind="keyword">KW_SURU</span>
        <span>TK_LPAREN</span><span>TK_RPAREN</span><span>TK_ARROW</span>
        <span data-kind="keyword">KW_DEU</span><span>TYPE_INT</span>
        <span data-kind="identifier">IDENTIFIER(name)</span>
        <span data-kind="keyword">KW_SUN</span>
        <span data-kind="keyword">KW_JABA</span>
        <span>OP_EQUAL_EQUAL</span>
      </div>
    ),
  },
  {
    id: "02",
    sourceLine: 2,
    label: "PARSER CORE",
    status: "IMPLEMENTED",
    note: "lookahead · match · expect",
    title: "A token cursor drives recursive descent.",
    output: (
      <pre className="compiler-code-output">{`current_token()
  └── check(TokenType::JABA)
        ├── match(...)
        ├── advance()
        └── parse_statement()`}</pre>
    ),
  },
  {
    id: "03",
    sourceLine: 0,
    label: "FUNCTION GRAMMAR",
    status: "IMPLEMENTED",
    note: "signature · return type · body",
    title: "The function grammar is now recognized.",
    output: (
      <pre className="compiler-tree">{`function_decl
  ::= SURU "(" params? ")"
      "->" DEU "(" type ")"
      block`}</pre>
    ),
  },
  {
    id: "04",
    sourceLine: 2,
    label: "EXPRESSION GRAMMAR",
    status: "IN PROGRESS",
    note: "primary · unary · precedence",
    title: "Expression parsing starts at the leaves.",
    output: (
      <pre className="compiler-tree">{`parse_unary()
├── operator?  MINUS | NOT
└── parse_primary()
    ├── IDENTIFIER(name)
    ├── STRING("Suraj")
    └── grouped expression`}</pre>
    ),
  },
  {
    id: "05",
    sourceLine: 7,
    label: "AST + CODEGEN",
    status: "NEXT",
    note: "owned nodes · scopes · lowering",
    title: "The next layer gives the tree meaning.",
    output: (
      <div className="compiler-next-state">
        <span>unique_ptr&lt;Node&gt;</span><i>→</i><span>scope + types</span><i>→</i><span>codegen</span>
      </div>
    ),
  },
];

export function TechStackSection() {
  const [active, setActive] = useState(0);
  const stage = stages[active];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActive((index) => (index + 1) % stages.length);
    }, 3000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div id="compiler" className="compiler-feature scroll-mt-8" aria-label="Sajilo compiler progress">
        <motion.div
          className="compiler-lab"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="compiler-lab-bar">
            <span><i /> sajilo / parser.cpp</span>
            <span>automatic trace</span>
          </div>

          <div className="compiler-lab-body">
            <div className="compiler-source-pane">
              <div className="compiler-pane-label"><span>INPUT</span><span>source.sajilo</span></div>
              <pre aria-label="Example Sajilo source code"><code>
                <span><b>01</b><em>suru</em>() -&gt; <em>deu</em>(int) &#123;</span>
                <span><b>02</b>  name = <em>sun</em> &quot;What is your name?&quot;</span>
                <span><b>03</b>  <em>jaba</em> name == &quot;Suraj&quot; &#123;</span>
                <span><b>04</b>    <em>bol</em> &quot;Welcome Suraj!&quot;</span>
                <span><b>05</b>  &#125; <em>natra</em> &#123;</span>
                <span><b>06</b>    <em>bol</em> &quot;Hello &quot; + name</span>
                <span><b>07</b>  &#125;</span>
                <span><b>08</b>  <em>laijau</em> value;</span>
                <span><b>09</b>&#125;</span>
              </code></pre>
              <div
                className="compiler-cursor-line"
                style={{ "--line-y": `${6.05 + stage.sourceLine * 2.25}rem` } as CSSProperties}
              />
            </div>

            <div className="compiler-transfer" aria-hidden="true">
              <span>→</span><i />
            </div>

            <div className="compiler-output-pane">
              <div className="compiler-pane-label"><span>STAGE {stage.id}</span><span>{stage.status}</span></div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  className="compiler-stage-output"
                  key={stage.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.25 }}
                >
                  <p>{stage.title}</p>
                  {stage.output}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="compiler-stage-rail" aria-label="Sajilo compiler progress">
            {stages.map((item, index) => (
              <div className={index === active ? "is-active" : ""} key={item.id}>
                <span>{item.id}</span>
                <strong>{item.label}</strong>
                <small>{item.status}</small>
                <em>{item.note}</em>
                {index === active && <i className="compiler-stage-progress" aria-hidden="true" />}
              </div>
            ))}
          </div>
        </motion.div>
    </div>
  );
}

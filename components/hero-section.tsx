"use client";

import { useCallback, useRef } from "react";
import type { CSSProperties } from "react";
import { ArrowDownRight } from "lucide-react";
import { HeroTerrain } from "@/components/hero-terrain";

/*
 * The headline over a real-time 3D Himalayan range, lit by one sun. The same
 * sun throws the headline's shadow, so the type and the mountains agree.
 */

type Kind = "identifier" | "keyword" | "literal" | "punctuation";
const TOKENS: { text: string; kind: Kind }[] = [
  { text: "Engineering", kind: "identifier" },
  { text: "from", kind: "keyword" },
  { text: "the", kind: "keyword" },
  { text: "token", kind: "literal" },
  { text: "up", kind: "keyword" },
  { text: ".", kind: "punctuation" },
];

export function HeroSection() {
  const stageRef = useRef<HTMLDivElement>(null);

  // The same sun that lights the range throws the headline's shadow.
  const onSun = useCallback((sun: [number, number, number]) => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.style.setProperty("--sun-x", sun[0].toFixed(3));
    stage.style.setProperty("--sun-y", sun[1].toFixed(3));
  }, []);

  return (
    <section id="home" className="hx" aria-labelledby="hx-title">
      <div className="site-shell hx-shell">
        <header className="hx-meta">
          <span>Suraj Adhikari</span>
        </header>

        <div className="hx-stage" ref={stageRef}>
          <HeroTerrain onSun={onSun} />

          <h1 id="hx-title" className="hx-title" aria-label="Engineering from the token up.">
            {TOKENS.map((token, t) => (
              <span
                key={t}
                className="hx-tok"
                data-kind={token.kind}
                aria-hidden="true"
                style={{ "--i": t } as CSSProperties}
              >
                {token.text}
              </span>
            ))}
          </h1>
        </div>

        <div className="hx-foot">
          <p className="hx-intro">
            C++ and systems engineer, building Sajilo, my own programming language.
          </p>
          <div className="hx-links">
            <a href="#work">
              See the work <ArrowDownRight aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

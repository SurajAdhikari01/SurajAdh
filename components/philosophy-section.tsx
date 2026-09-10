"use client";

import { useState } from "react";
import { Plus, ArrowDownRight } from "lucide-react";

const steps = [
  {
    title: "Understand",
    copy: "The first job is asking better questions. Find the real problem, understand the constraints, and decide what a useful outcome looks like.",
    note: "Question the obvious.",
  },
  {
    title: "Design",
    copy: "Reduce complexity into clear boundaries. Think through the tradeoffs, sketch the system, and give every part a reason to exist.",
    note: "Make space for clarity.",
  },
  {
    title: "Build",
    copy: "Turn the idea into dependable software. Work in small, deliberate steps, with attention to performance, resilience, and the person using it.",
    note: "Care is in the details.",
  },
  {
    title: "Improve",
    copy: "Ship, observe, and learn. Measure what matters, listen to real use, and make the useful parts better with every iteration.",
    note: "Nothing is ever quite finished.",
  },
];

export function PhilosophySection() {
  const [active, setActive] = useState<number | null>(0);
  return (
    <section id="ai-lab" className="approach-section">
      <div className="site-shell">
        <div className="approach-layout">
          <div className="approach-intro">
            <h2>
              Less noise.
              <br />
              <em>More purpose.</em>
            </h2>
            <p>
              Good engineering is a practice.
              <br />
              This is how I approach it.
            </p>
            <div className="process-flower" aria-hidden="true">
              {Array.from({ length: 8 }, (_, i) => (
                <i key={i} style={{ rotate: `${i * 22.5}deg` }} />
              ))}
              <ArrowDownRight />
            </div>
          </div>
          <div className="approach-steps">
            {steps.map((step, index) => (
              <article
                key={step.title}
                className={
                  active === index ? "approach-step is-open" : "approach-step"
                }
              >
                <h3>
                  <button
                    aria-expanded={active === index}
                    aria-controls={`step-panel-${index}`}
                    id={`step-heading-${index}`}
                    onClick={() => setActive(active === index ? null : index)}
                  >
                    <span className="step-number">0{index + 1}</span>
                    <span>{step.title}</span>
                    <Plus size={22} />
                  </button>
                </h3>
                <div
                  id={`step-panel-${index}`}
                  role="region"
                  aria-labelledby={`step-heading-${index}`}
                  hidden={active !== index}
                  className="step-content"
                >
                  <p>{step.copy}</p>
                  <span>{step.note}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

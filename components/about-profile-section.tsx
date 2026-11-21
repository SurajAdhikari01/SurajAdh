"use client";

import { motion } from "framer-motion";
import { SectionLabel } from "@/components/section-label";

/*
 * About, set like the rest of the site: one large statement, a plain
 * portrait, and the facts as an index of hairline rows. No icons, no pills.
 */

const facts = [
  { label: "Based in", value: "Kathmandu, Nepal" },
  { label: "Works on", value: "Systems, networking, compilers" },
];

const ease = [0.22, 1, 0.36, 1] as const;

export function AboutProfileSection() {
  return (
    <section className="ab relative" aria-labelledby="about-heading">
      <div className="site-shell">
        <SectionLabel name="About" />

        <motion.h2
          id="about-heading"
          className="ab-statement"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease }}
        >
          Deep in the system.
          <br />
          Clear at the <span className="accent-serif">surface.</span>
        </motion.h2>

        <div className="ab-body">
          <motion.figure
            className="ab-portrait"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
          >
            <picture>
              <source srcSet="/portrait.webp" type="image/webp" />
              <img
                src="/portrait.jpg"
                alt="Suraj Adhikari, software engineer, in the Himalayas of Nepal"
                width="760"
                height="760"
                loading="lazy"
                decoding="async"
              />
            </picture>
          </motion.figure>

          <div className="ab-side">
            <dl className="ab-facts">
              {facts.map(({ label, value }, index) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.6, delay: 0.15 + index * 0.08, ease }}
                >
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </motion.div>
              ))}
            </dl>

          </div>
        </div>
      </div>
    </section>
  );
}

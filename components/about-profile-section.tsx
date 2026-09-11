"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function AboutProfileSection() {
  return (
    <section className="about-section" aria-labelledby="about-heading">
      <div className="site-shell">
        <motion.div
          className="about-stage"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="about-title-wrap">
            <h2 id="about-heading">
              Deep in the system.<br />
              <em>Clear at the surface.</em>
            </h2>
            <ArrowDownRight aria-hidden="true" />
          </div>

          <div className="about-body">
            <figure className="about-portrait">
              <div className="about-portrait-frame">
                <img
                  src="/hero.png"
                  alt="Suraj Adhikari in the Himalayas of Nepal"
                  width="954"
                  height="954"
                  loading="lazy"
                />
              </div>
            </figure>

            <div className="about-intro">
              <p className="about-intro-lead">
                I build software from the inside out—starting with how it works,
                ending with how it feels.
              </p>
              <p>
                I’m Suraj, a C++ and software engineer based in Kathmandu. My work
                moves between systems, networking, compilers, and interfaces,
                wherever careful engineering can make complexity feel simple.
              </p>
              <p>
                Right now, I’m building Sajilo: my own programming language and
                compiler, one token, grammar rule, and syntax tree at a time.
              </p>
              <a href="#contact" className="about-cta">
                <span>Start a conversation</span>
                <i><ArrowUpRight aria-hidden="true" /></i>
              </a>
            </div>
          </div>

        </motion.div>
      </div>
    </section>
  );
}

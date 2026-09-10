"use client";

import { ArrowUpRight } from "lucide-react";

export function AboutProfileSection() {
  return (
    <section className="about-section">
      <div className="site-shell">
        <div className="about-editorial">
          <figure className="portrait-composition">
            <div className="portrait-mat">
              <img
                src="/hero.png"
                alt="Suraj Adhikari exploring the Himalayas in Nepal"
                width="954"
                height="954"
                loading="lazy"
              />
            </div>
            <span className="portrait-stamp" aria-hidden="true">
              STAY
              <br />
              <em>curious.</em>
              <span>↗</span>
            </span>
          </figure>
          <div className="about-copy">
            <h2>
              Curiosity is the
              <br />
              <em>operating system.</em>
            </h2>
            <p>
              I’m Suraj, a C++ and software engineer from Nepal. I like
              understanding what happens beneath the surface—and making what
              happens above it feel simple.
            </p>
            <p>
              From systems and networking to thoughtful interfaces, I care about
              the details that make software fast, dependable, and a pleasure to
              use.
            </p>
            <dl className="about-facts">
              <div>
                <dt>Rooted in</dt>
                <dd>Kathmandu, Nepal</dd>
              </div>
              <div>
                <dt>Working across</dt>
                <dd>Systems &amp; software</dd>
              </div>
              <div>
                <dt>Thinking beyond</dt>
                <dd>Borders &amp; time zones</dd>
              </div>
            </dl>
            <a href="#contact" className="text-link">
              Good work starts with a conversation <ArrowUpRight size={17} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const stats = [
  { value: "3+", label: "Years of Experience" },
  { value: "15+", label: "Projects Completed" },
  { value: "10+", label: "AI Models Worked On" },
  { value: "7+", label: "Hackathons Participated" },
  { value: "\u221e", label: "Curiosity Everyday" },
  { value: "100%", label: "Passion Always" },
];

// Animated SVG path component - matching the reference design
function AnimatedConnector() {
  // Long serpentine path that flows from left to right with multiple curves
  const pathD =
    "M 0 120 C 20 120, 40 180, 80 180 S 120 100, 160 100 S 200 160, 240 140 C 280 120, 300 80, 340 60 S 400 40, 440 60";

  return (
    <svg
      className="absolute left-0 top-1/2 w-full -translate-y-1/2 overflow-visible"
      style={{ height: "280px" }}
      viewBox="0 0 440 240"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Main flowing path - solid line */}
      <motion.path
        d={pathD}
        stroke="url(#philosophyGradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 2.5, ease: "easeInOut" }}
        viewport={{ once: true }}
      />

      {/* Animated traveling dot */}
      <motion.circle
        r="4"
        fill="#7c3aed"
        initial={{ offsetDistance: "0%" }}
        animate={{ offsetDistance: "100%" }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "linear",
          repeatDelay: 0.5,
        }}
        style={{ offsetPath: `path('${pathD}')` }}
      />

      {/* Node 1 - Start */}
      <motion.g>
        <motion.circle
          cx="0"
          cy="120"
          r="8"
          fill="#7c3aed"
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          viewport={{ once: true }}
        />
        <motion.circle
          cx="0"
          cy="120"
          r="12"
          fill="none"
          stroke="#7c3aed"
          strokeWidth="2"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.g>

      {/* Node 2 - First curve */}
      <motion.g>
        <motion.circle
          cx="80"
          cy="180"
          r="6"
          fill="#a78bfa"
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          viewport={{ once: true }}
        />
        <motion.circle
          cx="80"
          cy="180"
          r="10"
          fill="none"
          stroke="#a78bfa"
          strokeWidth="1.5"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
        />
      </motion.g>

      {/* Node 3 - Middle */}
      <motion.g>
        <motion.circle
          cx="160"
          cy="100"
          r="5"
          fill="#7c3aed"
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          transition={{ duration: 0.4, delay: 1 }}
          viewport={{ once: true }}
        />
      </motion.g>

      {/* Node 4 - Lower curve */}
      <motion.g>
        <motion.circle
          cx="240"
          cy="140"
          r="7"
          fill="#8b5cf6"
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          transition={{ duration: 0.4, delay: 1.4 }}
          viewport={{ once: true }}
        />
        <motion.circle
          cx="240"
          cy="140"
          r="11"
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="1.5"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
        />
      </motion.g>

      {/* Node 5 - Upper curve */}
      <motion.g>
        <motion.circle
          cx="340"
          cy="60"
          r="5"
          fill="#a78bfa"
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          transition={{ duration: 0.4, delay: 1.8 }}
          viewport={{ once: true }}
        />
      </motion.g>

      {/* Node 6 - End */}
      <motion.g>
        <motion.circle
          cx="440"
          cy="60"
          r="8"
          fill="#7c3aed"
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          transition={{ duration: 0.4, delay: 2.2 }}
          viewport={{ once: true }}
        />
        <motion.circle
          cx="440"
          cy="60"
          r="14"
          fill="none"
          stroke="#7c3aed"
          strokeWidth="2"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.9 }}
        />
      </motion.g>

      {/* Gradient definition */}
      <defs>
        <linearGradient
          id="philosophyGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.8" />
          <stop offset="30%" stopColor="#8b5cf6" stopOpacity="1" />
          <stop offset="70%" stopColor="#a78bfa" stopOpacity="1" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function PhilosophySection() {
  return (
    <section id="ai-lab" className="relative py-24 overflow-hidden">
      {/* Background decorative element */}
      <div className="pointer-events-none absolute left-0 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-gradient-to-r from-primary/5 to-transparent blur-3xl" />

      <div className="container mx-auto px-8">
        <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_1.5fr] lg:gap-4">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="relative z-10 space-y-6"
          >
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Philosophy
            </p>
            <h2 className="text-balance text-4xl font-light leading-tight tracking-tight text-foreground md:text-5xl">
              {"I don't just write code,"}
              <br />
              {"I design solutions"}
              <br />
              {"that create "}
              <span className="relative inline-block">
                <span className="font-medium text-primary underline decoration-primary/30 decoration-2 underline-offset-4">
                  impact.
                </span>
                {/* Decorative glow behind "impact" */}
                <span className="absolute -inset-2 -z-10 rounded-lg bg-primary/10 blur-lg" />
              </span>
            </h2>
            <motion.button
              whileHover={{ x: 5 }}
              className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              More about me
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </motion.button>
          </motion.div>

          {/* Right Content - Stats Grid with SVG connector overlay */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="relative z-10"
          >
            {/* SVG Connector positioned above the card */}
            <div className="absolute -left-32 top-1/2 z-20 hidden w-[580px] -translate-y-1/2 lg:block">
              <AnimatedConnector />
            </div>

            <div className="ml-auto max-w-md overflow-hidden rounded-3xl border border-border/50 bg-card/80 backdrop-blur-sm">
              <div className="grid grid-cols-3">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.05 * index }}
                    viewport={{ once: true }}
                    className={`relative p-6 text-center ${
                      index < 3 ? "border-b border-border/50" : ""
                    } ${index % 3 !== 2 ? "border-r border-border/50" : ""}`}
                  >
                    <motion.p
                      className="text-3xl font-semibold text-foreground md:text-4xl"
                      initial={{ scale: 1 }}
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      {stat.value}
                    </motion.p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {stat.label}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { motion } from "framer-motion";

const services = [
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6 transition-all duration-300"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
    ),
    title: "Build",
    description: "Robust software that scales.",
    accentClass:
      "absolute left-1/2 bottom-0 h-10 w-12 -translate-x-1/2 rounded-b-full rounded-t-none bg-[#5F66E9]/70 blur-xs opacity-40 transition-all duration-500 group-hover/icon:-translate-y-1",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6 transition-all duration-300"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
        <path d="m4.93 4.93 2.83 2.83m8.48 8.48 2.83 2.83m0-14.14-2.83 2.83m-8.48 8.48-2.83 2.83" />
      </svg>
    ),
    title: "Learn",
    description: "AI/ML models that learn and adapt.",
    accentClass:
      "absolute left-1 top-1 h-8 w-6 rounded-full bg-[#06B6D4]/75 blur-xs opacity-45 transition-all duration-500 group-hover/icon:translate-y-1 group-hover/icon:-translate-x-1",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6 transition-all duration-300"
      >
        <path d="M2 12l5 5 5-5-5-5-5 5z" />
        <path d="M7 17v4m0-18v4" />
        <path d="M12 12l5 5 5-5-5-5-5 5z" />
        <path d="M17 17v4m0-18v4" />
      </svg>
    ),
    title: "Explore",
    description: "Push boundaries, experiment daily.",
    accentClass:
      "absolute left-1 bottom-1 h-7 w-8 rounded-full bg-[#22C55E]/70 blur-xs opacity-40 transition-all duration-500 group-hover/icon:-translate-y-1 group-hover/icon:translate-x-1",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6 transition-all duration-300"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    title: "Solve",
    description: "Real-world problems that matter.",
    accentClass:
      "absolute right-3 top-4 h-8 w-6 rounded-full bg-[#8B5CF6]/75 blur-xs opacity-45 transition-all duration-500 group-hover/icon:-translate-y-1 group-hover/icon:translate-x-1",
  },
];

export function WhatIDoSection() {
  return (
    <section id="what-i-do" className="relative py-28">
      <div className="site-shell">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Left Side */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              What I do
            </p>

            <h2 className="text-balance text-4xl font-light leading-tight tracking-tight text-foreground md:text-5xl lg:text-[3.35rem]">
              Where <span className="font-medium">Engineering</span>
              <br />
              meets{" "}
              <span className="relative font-medium text-[#5F66E9]">
                Intelligence.
                <motion.span
                  initial={{ width: 0 }}
                  whileInView={{ width: "100%" }}
                  transition={{ delay: 0.45, duration: 0.5 }}
                  viewport={{ once: true }}
                  className="absolute -bottom-1 left-0 h-0.5 bg-[#5F66E9]/25"
                />
              </span>
            </h2>
          </motion.div>

          {/* Right Side */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4"
          >
            {services.map((service, index) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.12, duration: 0.5 }}
                viewport={{ once: true }}
                className="group flex flex-col items-center text-center"
              >
                {/* Icon Area */}
                <div className="relative mb-5 group/icon">
                  {/* Matte Glow */}
                  <div
                    className="
                      absolute left-3 top-3
                      h-14 w-14 rounded-full
                      bg-[#5F66E9]/18
                      blur-xl
                      transition-all duration-500
                      group-hover/icon:scale-125
                      group-hover/icon:bg-[#5F66E9]/30
                    "
                  />

                  {/* Small Floating Accent */}
                  <div className={service.accentClass} />

                  {/* Icon */}
                  <motion.div
                    whileHover={{ y: -2 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 22,
                    }}
                    className="
                      relative z-10
                      flex h-16 w-16 items-center justify-center
                      
                      text-foreground/80
                      transition-all duration-300
                      group-hover/icon:scale-[1.03]
                      group-hover/icon:text-[#5F66E9]
                    "
                  >
                    {service.icon}
                  </motion.div>
                </div>

                {/* Text */}
                <h3 className="mb-2 text-sm font-semibold tracking-wide text-foreground">
                  {service.title}
                </h3>

                <p className="max-w-35 text-xs leading-relaxed text-muted-foreground">
                  {service.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

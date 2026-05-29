"use client";

import { motion } from "framer-motion";
import { ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NeuralNetwork } from "./neural-network";

export function HeroSection() {
  return (
    <section
      id="home"
      className="relative min-h-screen overflow-hidden pb-24 pt-28"
    >
      {/* Subtle background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/2 via-transparent to-cyan-500/2" />

      {/* Subtle grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="container mt-40 mx-30 self-center relative  px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="space-y-10"
          >
            <div className="space-y-3">
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground"
              >
                Suraj Adhikari
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-balance text-5xl font-light leading-[1.08] tracking-tight text-foreground md:text-6xl lg:text-7xl"
              >
                I build{" "}
                <span className="relative inline-block font-medium text-primary">
                  intelligent
                  <motion.span
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ delay: 0.9, duration: 0.6 }}
                    className="absolute -bottom-1 left-0 h-0.75 rounded-full bg-primary/30"
                  />
                </span>
                <br />
                experiences with <span className="font-medium">AI.</span>
              </motion.h1>
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="max-w-md text-lg leading-relaxed text-muted-foreground"
            >
              Software Engineer passionate about turning ideas into scalable,
              meaningful products.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap items-center gap-4 pt-2"
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  size="lg"
                  className="group gap-2.5 rounded-full bg-foreground px-8 py-6 text-background shadow-xl transition-all hover:bg-foreground/90 hover:shadow-2xl"
                >
                  Explore My Work
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="ghost"
                  size="lg"
                  className="gap-2.5 rounded-full border border-border/60 px-7 py-6 text-foreground transition-all hover:border-border hover:bg-muted/50"
                >
                  View Resume
                  <Download className="h-4 w-4" />
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Right Content - Portrait Blob Visual */}
          {/* Right Content - Detailed Neuron + Center Blob */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.3 }}
            className="relative flex justify-center lg:justify-end"
          >
            <div className="absolute aspect-square w-full max-w-140 z-10 -top-80 left-2 overflow-y-visible">
              <NeuralNetwork />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

"use client"

import { motion } from "framer-motion"
import { Github, Linkedin, Send } from "lucide-react"
import { Button } from "@/components/ui/button"

// Animated wavy dotted path for the contact section
function AnimatedMailPath() {
  // Longer serpentine path matching the reference design
  const pathD = "M 0 30 Q 30 50, 60 35 T 120 40 Q 150 50, 180 30 T 250 35 Q 290 20, 330 30 T 400 25"
  
  return (
    <svg 
      className="absolute left-6 top-20 w-[400px] overflow-visible" 
      style={{ height: "80px" }}
      viewBox="0 0 400 60" 
      fill="none"
    >
      {/* Main dotted path */}
      <motion.path
        d={pathD}
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="8 8"
        strokeLinecap="round"
        className="text-muted-foreground/30"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
        viewport={{ once: true }}
      />
      
      {/* Secondary lighter path for depth */}
      <motion.path
        d={pathD}
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="4 12"
        strokeLinecap="round"
        className="text-primary/20"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        transition={{ duration: 2.5, ease: "easeOut", delay: 0.3 }}
        viewport={{ once: true }}
      />
      
      {/* Animated traveling dot */}
      <motion.circle
        r="4"
        fill="#7c3aed"
        initial={{ offsetDistance: "0%" }}
        animate={{ offsetDistance: "100%" }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
        style={{ offsetPath: `path('${pathD}')` }}
      />
      
      {/* Static nodes along the path */}
      <motion.circle
        cx="60"
        cy="35"
        r="4"
        fill="#a78bfa"
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        viewport={{ once: true }}
      />
      <motion.circle
        cx="180"
        cy="30"
        r="5"
        fill="#7c3aed"
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 1 }}
        viewport={{ once: true }}
      />
      <motion.circle
        cx="180"
        cy="30"
        r="9"
        fill="none"
        stroke="#7c3aed"
        strokeWidth="1.5"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.circle
        cx="330"
        cy="30"
        r="4"
        fill="#a78bfa"
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 1.5 }}
        viewport={{ once: true }}
      />
    </svg>
  )
}

export function ContactSection() {
  return (
    <section id="contact" className="relative py-24">
      <div className="container mx-auto px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="overflow-hidden rounded-3xl border border-border/50 bg-card/80 backdrop-blur-sm"
        >
          <div className="grid items-center gap-8 p-8 lg:grid-cols-2 lg:p-12">
            {/* Left Content */}
            <div className="space-y-4">
              <h2 className="text-balance text-3xl font-light tracking-tight text-foreground md:text-4xl">
                {"Let's build something"}
                <br />
                {"amazing "}
                <span className="font-medium text-primary">together.</span>
              </h2>
              
              {/* Paper plane illustration with animated path */}
              <div className="relative py-8">
                <motion.div
                  animate={{ 
                    x: [0, 15, 5, 20, 10], 
                    y: [0, -8, -3, -12, -6],
                    rotate: [-15, -10, -20, -8, -15]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 5, 
                    ease: "easeInOut" 
                  }}
                  className="relative z-10"
                >
                  <Send className="h-16 w-16 rotate-[-20deg] text-primary/70" />
                </motion.div>
                
                {/* Animated wavy dotted trail */}
                <AnimatedMailPath />
              </div>
              
              <p className="text-muted-foreground">
                Open to exciting opportunities
                <br />
                and meaningful collaborations.
              </p>
            </div>

            {/* Right Content - CTA */}
            <div className="flex flex-col items-start gap-6 lg:items-end">
              <div className="flex items-center gap-4">
                <motion.a
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground shadow-sm transition-all hover:border-foreground hover:text-foreground hover:shadow-md"
                >
                  <Github className="h-6 w-6" />
                </motion.a>
                <motion.a
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground shadow-sm transition-all hover:border-foreground hover:text-foreground hover:shadow-md"
                >
                  <Linkedin className="h-6 w-6" />
                </motion.a>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    size="lg"
                    className="h-14 gap-3 rounded-2xl bg-foreground px-8 text-background shadow-lg hover:bg-foreground/90 hover:shadow-xl"
                  >
                    Say Hello
                    <motion.span 
                      animate={{ rotate: [0, 15, 0, -15, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                      className="text-lg"
                    >
                      {"\uD83D\uDC4B"}
                    </motion.span>
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Footer spacer */}
      <div className="h-12" />
    </section>
  )
}

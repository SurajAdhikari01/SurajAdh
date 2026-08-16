"use client"

import { motion } from "framer-motion"
import { Atom, BrainCircuit, Braces, Code2, Cpu, Wind } from "lucide-react"

const technologies = [
  { name: "C++", icon: Cpu, color: "#686EF3" },
  { name: "Python", icon: Code2, color: "#6366F1" },
  { name: "AI / ML", icon: BrainCircuit, color: "#7C6CF2" },
  { name: "React", icon: Atom, color: "#38BDF8" },
  { name: "TypeScript", icon: Braces, color: "#5E6CE8" },
  { name: "Tailwind CSS", icon: Wind, color: "#43BCEB" },
]

export function TechStackSection() {
  return (
    <section className="relative overflow-hidden py-20">
      <div className="site-shell">
        <div className="mb-10 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[.2em] text-[#686EF3]"><span>What I work with</span><span className="h-px w-8 bg-[#686EF3]/50" /></div>
        <div className="relative grid grid-cols-3 gap-y-12 sm:grid-cols-6">
          <div aria-hidden="true" className="pointer-events-none absolute bottom-[3.5px] left-[8.333%] right-[8.333%] hidden h-px bg-[#777CF5]/30 sm:block" />
          {technologies.map((tech, index) => {
            const Icon = tech.icon
            return <motion.div key={tech.name} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * .07 }} className="relative z-10 flex flex-col items-center gap-3 text-center"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-background shadow-[0_10px_30px_rgba(69,72,145,.08)] ring-1 ring-border/50"><Icon className="h-6 w-6" style={{ color: tech.color }} strokeWidth={1.7} /></span><span className="text-[11px] font-medium">{tech.name}</span><i className="hidden h-2 w-2 rounded-full bg-[#777CF5] shadow-[0_0_0_6px_rgba(119,124,245,.1)] sm:block" /></motion.div>
          })}
        </div>
      </div>
    </section>
  )
}

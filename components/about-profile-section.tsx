"use client"

import { motion } from "framer-motion"

const code = [
  ["1", "class Engineer {"],
  ["2", "  constructor() {"],
  ["3", '    this.name = "Suraj";'],
  ["4", '    this.role = "Software Engineer";'],
  ["5", '    this.focus = ["AI/ML", "C++", "Systems"];'],
  ["6", '    this.mission = "Build. Learn. Impact.";'],
  ["7", "  }"],
  ["8", ""],
  ["9", "  build() {"],
  ["10", "    return ideas => usefulProducts;"],
  ["11", "  }"],
  ["12", "}"],
]

export function AboutProfileSection() {
  return (
    <section className="relative py-20 sm:py-24">
      <div className="site-shell grid items-center gap-14 lg:grid-cols-[.9fr_1.1fr]">
        <motion.div initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="mb-7 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[.2em] text-[#686EF3]"><span>About me</span><span className="h-px w-8 bg-[#686EF3]/50" /></div>
          <h2 className="max-w-md text-3xl font-light leading-tight tracking-tight sm:text-4xl">I build things that solve <span className="font-medium text-[#686EF3]">real problems.</span></h2>
          <p className="mt-6 max-w-md text-sm leading-7 text-muted-foreground">I&apos;m a software and AI engineer from Nepal, working with C++, Python and modern web technologies. I collaborate remotely with clients and teams worldwide to turn ambitious ideas into reliable, useful products.</p>
          <span className="mt-8 block -rotate-6 font-serif text-2xl italic text-[#686EF3]">Suraj</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 26, rotate: 1 }} whileInView={{ opacity: 1, y: 0, rotate: 0 }} viewport={{ once: true }} transition={{ duration: .7 }} className="relative mx-auto w-full max-w-[520px]">
          <div className="absolute -inset-7 -z-10 rounded-[45%_55%_63%_37%/55%_37%_63%_45%] bg-[#686EF3]/10 blur-3xl" />
          <div className="overflow-hidden rounded-2xl bg-[#171925] shadow-[0_28px_70px_rgba(38,40,94,.22)] ring-1 ring-white/10">
            <div className="flex h-11 items-center gap-2 border-b border-white/5 px-5"><i className="h-2.5 w-2.5 rounded-full bg-[#ff6868]" /><i className="h-2.5 w-2.5 rounded-full bg-[#ffd166]" /><i className="h-2.5 w-2.5 rounded-full bg-[#68d47b]" /><span className="ml-auto font-mono text-[8px] uppercase tracking-[.15em] text-white/25">profile.ts</span></div>
            <div className="p-5 font-mono text-[11px] leading-[1.85] sm:p-7 sm:text-xs">
              {code.map(([number, content]) => <div key={number} className="grid grid-cols-[24px_1fr]"><span className="select-none text-white/20">{number}</span><span className="whitespace-pre text-[#d7dbf7]">{content.includes("this.") ? <><span className="text-[#9fa5ff]">{content.slice(0, content.indexOf("="))}</span><span className="text-white/55">=</span><span className="text-[#d8e783]">{content.slice(content.indexOf("=") + 1)}</span></> : content.includes("return") ? <span className="text-[#e49ad8]">{content}</span> : content}</span></div>)}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

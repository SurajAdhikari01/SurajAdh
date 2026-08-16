"use client"

import { motion } from "framer-motion"
import { ArrowRight, Code2, Lightbulb, PencilRuler, TrendingUp } from "lucide-react"

const steps = [
  { title: "Understand", copy: "Dig deep into the problem.", icon: Lightbulb },
  { title: "Design", copy: "Plan simple, scalable solutions.", icon: PencilRuler },
  { title: "Build", copy: "Write clean, efficient code.", icon: Code2 },
  { title: "Improve", copy: "Iterate, learn and make it better.", icon: TrendingUp },
]

export function PhilosophySection() {
  return (
    <section id="ai-lab" className="relative py-20">
      <div className="site-shell">
        <div className="mb-8 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[.2em] text-[#686EF3]"><span>How I approach</span><span className="h-px w-8 bg-[#686EF3]/50"/><span className="h-px flex-1 bg-border/70"/></div>
        <div className="grid overflow-hidden rounded-2xl border border-border/60 bg-background/55 shadow-[0_10px_35px_rgba(60,62,125,.04)] backdrop-blur sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step,index)=>{const Icon=step.icon; return <motion.div key={step.title} initial={{opacity:0,y:15}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:index*.08}} className="group relative flex items-center gap-4 border-b border-border/60 p-5 last:border-b-0 sm:[&:nth-child(3)]:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#777CF5]/8 text-[#686EF3] transition-transform group-hover:rotate-[-5deg] group-hover:scale-105"><Icon className="h-5 w-5" strokeWidth={1.6}/></span><div><h3 className="text-xs font-semibold">{step.title}</h3><p className="mt-1 max-w-[130px] text-[10px] leading-4 text-muted-foreground">{step.copy}</p></div>{index<steps.length-1&&<ArrowRight className="absolute right-3 hidden h-3.5 w-3.5 text-muted-foreground/35 lg:block"/>}</motion.div>})}
        </div>
      </div>
    </section>
  )
}

"use client"

import { motion } from "framer-motion"
import { ArrowRight, Github, Linkedin, Mail } from "lucide-react"

export function ContactSection() {
  return (
    <section id="contact" className="relative overflow-hidden border-t border-border/60 py-20">
      <div className="pointer-events-none absolute bottom-[-80%] right-[3%] h-80 w-80 rounded-full bg-[#777CF5]/10 blur-3xl" />
      <div className="site-shell relative grid items-center gap-10 lg:grid-cols-[1.2fr_.8fr_.6fr]">
        <motion.h2 initial={{opacity:0,y:18}} whileInView={{opacity:1,y:0}} viewport={{once:true}} className="text-3xl font-light leading-tight tracking-tight sm:text-4xl">Let&apos;s build something<br/><span className="font-serif italic text-[#686EF3]">amazing</span> together.</motion.h2>
        <div><p className="max-w-xs text-xs leading-6 text-muted-foreground">I&apos;m open to exciting opportunities and meaningful collaborations.</p><a href="mailto:surajadhikari01@icloud.com" className="group mt-5 inline-flex h-12 items-center gap-8 rounded-xl bg-[#121218] px-6 text-xs font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5">Get in touch<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/></a></div>
        <div className="relative hidden h-32 lg:block"><svg className="absolute inset-0 h-full w-full" viewBox="0 0 180 130"><ellipse cx="90" cy="66" rx="67" ry="28" fill="none" stroke="#777CF5" strokeOpacity=".25" transform="rotate(-25 90 66)"/><ellipse cx="90" cy="66" rx="50" ry="18" fill="none" stroke="#777CF5" strokeOpacity=".2" transform="rotate(35 90 66)"/><circle cx="90" cy="66" r="13" fill="#777CF5" fillOpacity=".8"/><circle cx="36" cy="94" r="5" fill="#9DA1FC"/><circle cx="146" cy="29" r="4" fill="#777CF5"/></svg></div>
      </div>
      <footer className="site-shell mt-16 flex flex-col gap-4 border-t border-border/60 pt-6 text-[9px] uppercase tracking-[.14em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>© 2026 Suraj Adhikari</span><div className="flex items-center gap-4"><a href="https://github.com/SurajAdhikari01" target="_blank" rel="noreferrer" aria-label="Suraj Adhikari on GitHub"><Github className="h-4 w-4"/></a><a href="https://www.linkedin.com/in/surajadk/" target="_blank" rel="noreferrer" aria-label="Suraj Adhikari on LinkedIn"><Linkedin className="h-4 w-4"/></a><a href="mailto:surajadhikari01@icloud.com" aria-label="Email Suraj Adhikari"><Mail className="h-4 w-4"/></a></div><a href="#home">Back to top ↑</a></footer>
    </section>
  )
}

"use client"

import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const projects = [
  {
    category: "AI/NLP",
    title: "Legal Document Analyzer",
    description: "AI tool that extracts, summarizes and analyzes legal documents with high accuracy.",
    tags: ["Python", "NLP", "FastAPI"],
    bgGradient: "from-violet-50/80 via-slate-50 to-blue-50/60",
    accentColor: "bg-violet-500",
  },
  {
    category: "ML",
    title: "House Price Prediction",
    description: "ML model that predicts house prices using advanced regression techniques.",
    tags: ["Scikit-learn", "XGBoost", "Pandas"],
    bgGradient: "from-emerald-50/80 via-cyan-50/60 to-teal-50/40",
    accentColor: "bg-emerald-500",
  },
  {
    category: "CV",
    title: "Smart Waste Classifier",
    description: "Computer vision model that classifies waste into categories for smart recycling systems.",
    tags: ["PyTorch", "ResNet", "OpenCV"],
    bgGradient: "from-blue-50/80 via-indigo-50/60 to-sky-50/40",
    accentColor: "bg-blue-500",
  },
]

export function ProjectsSection() {
  return (
    <section id="work" className="relative py-28">
      <div className="container mx-auto px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-16 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-medium tracking-tight text-foreground">Featured Projects</h2>
            <div className="hidden h-px w-16 bg-gradient-to-r from-border to-transparent sm:block" />
            <motion.div 
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              className="hidden h-2 w-2 rounded-full bg-primary sm:block" 
            />
          </div>
          <Button
            variant="ghost"
            className="group gap-2 rounded-full border border-border/60 px-5 text-muted-foreground transition-all hover:border-foreground/30 hover:bg-muted/50 hover:text-foreground"
          >
            View all projects
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </motion.div>

        {/* Projects Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, index) => (
            <motion.div
              key={project.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 * index }}
              viewport={{ once: true }}
              whileHover={{ y: -8 }}
              className="group relative"
            >
              <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-card shadow-sm transition-all duration-500 hover:border-border/60 hover:shadow-2xl hover:shadow-primary/5">
                {/* Top - Text Content */}
                <div className="relative p-7">
                  {/* Category badge */}
                  <span className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                    <span className={`h-1.5 w-1.5 rounded-full ${project.accentColor}`} />
                    {project.category}
                  </span>
                  
                  <h3 className="mb-3 text-xl font-semibold tracking-tight text-foreground">
                    {project.title}
                  </h3>
                  
                  <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                    {project.description}
                  </p>
                  
                  {/* Arrow Button */}
                  <motion.button 
                    whileHover={{ scale: 1.1, rotate: -10 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-shadow hover:shadow-xl"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </motion.button>
                </div>
                
                {/* Bottom - Preview Area with glass morphism */}
                <div className={`relative h-44 bg-gradient-to-br ${project.bgGradient} overflow-hidden`}>
                  {/* Glass card preview */}
                  <div className="absolute inset-5">
                    <motion.div 
                      initial={{ rotate: -4, y: 8, scale: 0.98 }}
                      whileHover={{ rotate: 0, y: 0, scale: 1 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="relative h-full w-full overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-xl backdrop-blur-md"
                    >
                      {/* Window dots */}
                      <div className="absolute left-3 top-3 flex gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-red-400/60" />
                        <div className="h-2 w-2 rounded-full bg-yellow-400/60" />
                        <div className="h-2 w-2 rounded-full bg-green-400/60" />
                      </div>
                      
                      {/* Content placeholder lines */}
                      <div className="absolute left-3 right-3 top-8 space-y-2">
                        <div className="h-2 w-3/4 rounded bg-slate-200/80" />
                        <div className="h-2 w-1/2 rounded bg-slate-200/60" />
                      </div>
                      
                      {/* Chart/visual placeholder */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-end gap-1">
                        {[40, 65, 45, 80, 55, 70, 50].map((h, i) => (
                          <motion.div
                            key={i}
                            initial={{ height: 0 }}
                            whileInView={{ height: `${h}%` }}
                            transition={{ delay: 0.3 + i * 0.05, duration: 0.4 }}
                            viewport={{ once: true }}
                            className={`flex-1 rounded-t ${project.accentColor}/30`}
                            style={{ maxHeight: 48 }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  </div>
                  
                  {/* Floating particles */}
                  <motion.div
                    animate={{ y: [-4, 4, -4], opacity: [0.4, 0.8, 0.4] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="absolute right-5 top-3 h-1.5 w-1.5 rounded-full bg-primary"
                  />
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 border-t border-border/30 bg-muted/20 p-5">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border/40 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all group-hover:border-border/60 group-hover:bg-background"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

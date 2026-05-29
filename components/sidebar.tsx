"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Home, User, Briefcase, FlaskConical, Mail, Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"

// Filled icon variants
import { 
  HouseFill, 
  UserFill, 
  BriefcaseFill, 
  FlaskFill, 
  MailFill 
} from "./icons-filled"

const navItems = [
  { icon: Home, iconFilled: HouseFill, label: "Home", href: "#home" },
  { icon: User, iconFilled: UserFill, label: "About", href: "#about" },
  { icon: Briefcase, iconFilled: BriefcaseFill, label: "Work", href: "#work" },
  { icon: FlaskConical, iconFilled: FlaskFill, label: "AI Lab", href: "#ai-lab" },
  { icon: Mail, iconFilled: MailFill, label: "Contact", href: "#contact" },
]

export function Sidebar() {
  const [activeItem, setActiveItem] = useState("Home")
  const [isDark, setIsDark] = useState(false)

  const handleNavClick = (label: string) => {
    setActiveItem(label)
  }

  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle("dark")
  }

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed left-0 top-0 z-50 flex h-screen w-20 flex-col items-center justify-between border-r border-border/40 bg-card/80 py-8 backdrop-blur-xl"
    >
      {/* Logo */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-2xl font-bold tracking-tight text-foreground">SA</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col items-center gap-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const IconFilled = item.iconFilled
          const isActive = activeItem === item.label
          return (
            <a
              key={item.label}
              href={item.href}
              onClick={() => handleNavClick(item.label)}
              className={cn(
                "group relative flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive ? (
                <IconFilled className="h-5 w-5" />
              ) : (
                <Icon className="h-5 w-5" strokeWidth={1.5} />
              )}
              <span className="absolute left-full ml-3 hidden whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background group-hover:block">
                {item.label}
              </span>
            </a>
          )
        })}
      </nav>

      {/* Theme Toggle & Decorative dots */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={toggleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
        >
          {isDark ? <Sun className="h-5 w-5" strokeWidth={1.5} /> : <Moon className="h-5 w-5" strokeWidth={1.5} />}
        </button>
        <div className="h-1.5 w-1.5 rounded-full bg-foreground" />
        <div className="h-1 w-1 rounded-full bg-muted-foreground/50" />
      </div>
    </motion.aside>
  )
}

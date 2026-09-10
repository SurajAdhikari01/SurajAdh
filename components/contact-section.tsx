"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUpRight, ArrowUp, Check, Copy } from "lucide-react";

export function ContactSection() {
  const [copyState, setCopyState] = useState("Copy email");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  async function copyEmail() {
    try { await navigator.clipboard.writeText("surajadhikari01@icloud.com"); setCopyState("Copied!"); }
    catch { setCopyState("Select the email to copy"); }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopyState("Copy email"), 3000);
  }
  return (
    <section id="contact" className="contact-section">
      <div className="site-shell">
        <div className="section-rule"><span className="small-label">Let’s connect / 06</span><span className="small-label">Kathmandu ↔ Worldwide</span></div>
        <div className="contact-heading"><div><p>Have something good in mind?</p><h2>Make it<br /><em>mean something.</em></h2></div><a className="contact-arrow" href="mailto:surajadhikari01@icloud.com" aria-label="Start a conversation by email"><ArrowUpRight strokeWidth={1} /><span>LET’S TALK</span></a></div>
        <div className="contact-bottom"><p>Thoughtful projects. Interesting problems.<br />People who care about what they make.</p><div className="contact-email"><a href="mailto:surajadhikari01@icloud.com">surajadhikari01@icloud.com</a><button onClick={copyEmail} aria-label={copyState}>{copyState === "Copied!" ? <Check size={15} /> : <Copy size={15} />}</button><span role="status" className="copy-status">{copyState !== "Copy email" ? copyState : ""}</span></div></div>
        <footer className="site-footer"><span>© 2026 Suraj Adhikari</span><div><a href="https://github.com/SurajAdhikari01" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={13} /></a><a href="https://www.linkedin.com/in/surajadk/" target="_blank" rel="noreferrer">LinkedIn <ArrowUpRight size={13} /></a></div><a href="#home">Back to the beginning <ArrowUp size={14} /></a></footer>
      </div>
    </section>
  );
}

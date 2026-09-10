"use client";

import { useRef } from "react";

/** A deterministic vector sculpture: no textures, downloads, or render loop. */
export function KineticSculpture() {
  const stage = useRef<HTMLDivElement>(null);
  return (
    <div className="sculpture" ref={stage} onPointerMove={(event) => {
      if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const rect = event.currentTarget.getBoundingClientRect();
      stage.current?.style.setProperty("--sculpture-x", `${(event.clientX - rect.left - rect.width / 2) / 24}deg`);
      stage.current?.style.setProperty("--sculpture-y", `${-(event.clientY - rect.top - rect.height / 2) / 24}deg`);
    }} onPointerLeave={() => {
      stage.current?.style.setProperty("--sculpture-x", "0deg");
      stage.current?.style.setProperty("--sculpture-y", "0deg");
    }} aria-hidden="true">
      <div className="sculpture-shadow" />
      <svg className="sculpture-object" viewBox="0 0 600 600" fill="none">
        <defs>
          <linearGradient id="silk" x1="100" y1="50" x2="460" y2="530" gradientUnits="userSpaceOnUse">
            <stop stopColor="#c7baff" /><stop offset=".28" stopColor="#8664ff" /><stop offset=".56" stopColor="#5426df" /><stop offset=".79" stopColor="#b7a0ff" /><stop offset="1" stopColor="#e6dcff" />
          </linearGradient>
          <linearGradient id="edge" x1="80" y1="100" x2="500" y2="460" gradientUnits="userSpaceOnUse"><stop stopColor="#ede6ff" /><stop offset=".5" stopColor="#a48cff" /><stop offset="1" stopColor="#3a0b9c" /></linearGradient>
        </defs>
        <g className="sculpture-spin">
          {Array.from({ length: 40 }, (_, index) => <ellipse key={index} cx="300" cy="300" rx="111" ry="230" fill="url(#silk)" stroke="url(#edge)" strokeWidth="1.1" transform={`rotate(${index * 4.5} 300 300)`} />)}
        </g>
      </svg>
      <span className="sculpture-cross sculpture-cross-one">+</span><span className="sculpture-cross sculpture-cross-two">+</span>
      <span className="sculpture-caption">FORM / 001<br />Complexity, composed.</span>
    </div>
  );
}

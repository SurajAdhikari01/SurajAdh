"use client";

import { useId } from "react";

export function HeroNeuron() {
  const somaClipId = useId();
  const neuronTransform = "rotate(90 225 400) translate(-175, 200)";
  const imageCounterTransform = "translate(175 -200) rotate(-90 225 400)";

  return (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 450 800"
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[145%] w-[185%] -translate-x-1/2 -translate-y-30 opacity-85"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Definitions for modern styling and animations */}
        <defs>
          {/* Smooth linear gradient for the main axon line */}
          <linearGradient id="axonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="60%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>

          {/* Gradient for myelin sheath insulation blocks */}
          <linearGradient id="myelinGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#bae6fd" />
          </linearGradient>

          {/* Core cell body radial depth */}
          <radialGradient id="somaGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="70%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0369a1" />
          </radialGradient>

          {/* Subtle glow filter to make the animating pulses look electrical */}
          <filter id="signalGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id={somaClipId} clipPathUnits="userSpaceOnUse">
            <path
              d="M 225,95
   Q 315,135 315,225
   Q 315,320 225,315
   Q 135,340 140,245
   Q 75,215 165,155
   Q 130,85 225,95 Z"
              transform={neuronTransform}
            />
          </clipPath>
        </defs>
        <style>
          {`
      .data-pulse-core {
        stroke-dasharray: 20, 150;
        animation: flowEffect 2.5s linear infinite;
      }
      .data-pulse-glow {
        stroke-dasharray: 10, 160;
        animation: flowEffect 2.5s linear infinite;
      }
      @keyframes flowEffect {
        from {
          stroke-dashoffset: 0;
        }
        to {
          stroke-dashoffset: -170;
        }
      }
    `}
        </style>

        {/* ==================== MAIN NEURON STRUCTURE (Vertical) ==================== */}
        <g transform={neuronTransform}>
          {/* 1. DENDRITES (Input Branches) */}
          <g
            fill="none"
            stroke="#0ea5e9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Top-Left System */}
            <path d="M 195,190 Q 130,130 100,140" strokeWidth="4" />
            <path d="M 100,140 Q 60,110 30,130" strokeWidth="2.5" />
            <path d="M 100,140 Q 80,180 50,195" strokeWidth="2" />
            <path d="M 30,130 L 10,120" strokeWidth="1.5" />
            <path d="M 30,130 L 20,150" strokeWidth="1.5" />

            {/* Far-Top System */}
            <path d="M 215,160 Q 180,80 150,55" strokeWidth="4" />
            <path d="M 150,55 Q 120,30 125,5" strokeWidth="2.5" />
            <path d="M 150,55 Q 180,25 175,2" strokeWidth="2" />

            {/* Bottom-Left System */}
            <path d="M 190,240 Q 130,300 95,290" strokeWidth="4.5" />
            <path d="M 95,290 Q 55,310 35,355" strokeWidth="2.5" />
            <path d="M 95,290 Q 75,255 45,250" strokeWidth="2" />
            <path d="M 35,355 L 10,360" strokeWidth="1.5" />
            <path d="M 35,355 L 25,385" strokeWidth="1.5" />

            {/* Bottom-Mid System */}
            <path d="M 225,265 Q 200,340 215,390" strokeWidth="4" />
            <path d="M 215,390 Q 190,430 200,460" strokeWidth="2" />
            <path d="M 215,390 Q 240,425 255,450" strokeWidth="2" />
          </g>

          {/* Dendritic Spines (Input Receptor Nodes) */}
          <g fill="#0284c7">
            <circle cx="10" cy="120" r="3" />
            <circle cx="20" cy="150" r="3" />
            <circle cx="50" cy="195" r="3" />
            <circle cx="125" cy="5" r="3.5" />
            <circle cx="175" cy="2" r="3" />
            <circle cx="45" cy="250" r="3" />
            <circle cx="200" cy="460" r="3.5" />
            <circle cx="255" cy="450" r="3" />
            <circle cx="10" cy="360" r="3.5" />
            <circle cx="25" cy="385" r="3" />
          </g>
          {/* 4. MYELIN SHEATH SECTIONS */}
          {/* <g stroke="#2563eb" strokeWidth="1.5" fill="url(#myelinGrad)">
           
            <path
              d="M 290,211 Q 320,197 345,207 L 343,219 Q 318,209 288,223 Z"
              strokeLinejoin="round"
            />
           
            <path
              d="M 365,218 Q 395,230 425,228 L 423,240 Q 393,242 363,230 Z"
              strokeLinejoin="round"
            />
           
            <path
              d="M 445,230 Q 475,233 505,229 L 503,241 Q 473,245 443,242 Z"
              strokeLinejoin="round"
            />
           
            <path
              d="M 525,225 Q 555,218 585,215 L 587,227 Q 557,230 527,237 Z"
              strokeLinejoin="round"
            />
          </g> */}

          {/* 2. AXON CORE PATHWAY (Background Track) */}
          <path
            id="axonPathway"
            d="M 260,215 Q 320,195 380,225 T 500,235 T 620,215"
            fill="none"
            stroke="url(#axonGrad)"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* 3. ANIMATING DATA FLOW OVERLAY */}
          {/* Glow layer tracking the path perfectly */}
          <path
            d="M 260,215 Q 320,195 380,225 T 500,235 T 620,215"
            fill="none"
            stroke="#60a5fa"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.6"
            filter="url(#signalGlow)"
            className="data-pulse-glow"
          />

          {/* Core sharp pulse layer tracking the path perfectly */}
          <path
            d="M 260,215 Q 320,195 380,225 T 500,235 T 620,215"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            className="data-pulse-core"
          />

          {/* 5. NODES OF RANVIER (Gaps along the Axon) */}
          <g fill="#2563eb">
            <circle cx="355" cy="213" r="3" />
            <circle cx="434" cy="235" r="3" />
            <circle cx="515" cy="233" r="3" />
          </g>

          <path
            d="M 225,95
   Q 315,135 315,225
   Q 315,320 225,315
   Q 135,340 140,245
   Q 75,215 165,155
   Q 130,85 225,95 Z"
            fill="url(#somaGrad)"
            stroke="#0369a1"
            strokeWidth="2"
          />

          {/* Axon Hillock (Tapered base connecting Soma to Axon) */}
          <path
            d="M 256,200 Q 275,206 290,211 L 288,223 Q 262,221 251,230 Z"
            fill="#0284c7"
          />

          <image
            href="/hero.png"
            x="85"
            y="85"
            width="280"
            height="280"
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${somaClipId})`}
            transform={imageCounterTransform}
          />

          {/* 8. AXON TERMINALS (Output Branches) */}
          <g
            fill="none"
            stroke="#4f46e5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Upper Branch Set */}
            <path d="M 612,216 Q 650,205 680,155" strokeWidth="3.5" />
            <path d="M 680,155 Q 700,125 730,115" strokeWidth="2.5" />
            <path d="M 680,155 Q 710,165 745,160" strokeWidth="2" />

            {/* Center Branch Set */}
            <path d="M 622,215 L 675,214" strokeWidth="3" />
            <path d="M 675,214 Q 710,194 750,199" strokeWidth="2" />
            <path d="M 675,214 Q 710,229 745,234" strokeWidth="2" />

            {/* Lower Branch Set */}
            <path d="M 616,218 Q 660,225 690,265" strokeWidth="3.5" />
            <path d="M 690,265 Q 705,305 740,315" strokeWidth="2.5" />
            <path d="M 690,265 Q 730,265 760,250" strokeWidth="2" />
          </g>

          {/* Synaptic Knobs (Terminal Buttons) */}
          <g fill="#4f46e5">
            <circle cx="730" cy="115" r="4.5" />
            <circle cx="745" cy="160" r="4" />
            <circle cx="750" cy="199" r="4" />
            <circle cx="745" cy="234" r="4" />
            <circle cx="760" cy="250" r="4.5" />
            <circle cx="740" cy="315" r="4.5" />
          </g>
        </g>
      </svg>
    </>
  );
}

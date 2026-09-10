import { ArrowUpRight } from "lucide-react";

const disciplines = [
  {
    number: "01",
    title: "Own the memory.",
    detail: "Lifetimes / RAII / Data layout",
    copy: "Explicit ownership, predictable lifetimes, and data arranged with the machine in mind. The details underneath shape everything above.",
  },
  {
    number: "02",
    title: "Coordinate the work.",
    detail: "Concurrency / Synchronization / Networking",
    copy: "Think through how work moves, where state is shared, and what happens when timing changes. Correctness comes before cleverness.",
  },
  {
    number: "03",
    title: "Make every cycle count.",
    detail: "Algorithms / Profiling / Performance",
    copy: "Understand the cost, find the bottleneck, and measure the change. Fast software starts with knowing where the time goes.",
  },
];

function CoreDiagram() {
  return (
    <figure className="cpp-diagram" aria-label="C++ at the center of memory, concurrency, and performance engineering">
      <div className="cpp-diagram-top"><span>Inside the practice</span><span>Fig. 03 / C++</span></div>
      <svg viewBox="0 0 480 420" className="cpp-circuit" aria-hidden="true" fill="none">
        <defs>
          <linearGradient id="cpp-core-fill" x1="140" y1="100" x2="340" y2="310" gradientUnits="userSpaceOnUse">
            <stop stopColor="#cfc0ff" /><stop offset="1" stopColor="#9e83ed" />
          </linearGradient>
        </defs>
        <g className="cpp-traces" stroke="currentColor" strokeWidth="1">
          <path d="M0 94h66l52 52h34M0 210h152M0 328h70l48-52h34M480 94h-66l-52 52h-34M480 210H328M480 328h-70l-48-52h-34" />
          <path d="M204 0v112M240 0v112M276 0v112M204 308v112M240 308v112M276 308v112" />
          <rect x="132" y="92" width="216" height="236" rx="2" strokeDasharray="3 7" />
          {[146,178,210,242,274].map(y => <g key={y}><path d={`M139 ${y}h18M323 ${y}h18`} strokeWidth="5" /></g>)}
        </g>
        <path d="M172 112h136l20 20v176H152V132Z" fill="url(#cpp-core-fill)" stroke="#7b5bbd" />
        <path d="M163 144v152h153" stroke="#7658b0" strokeOpacity=".4" />
        <text x="240" y="229" textAnchor="middle" fill="#35244e" fontSize="69" fontWeight="500" letterSpacing="-7">C++</text>
        <text x="240" y="268" textAnchor="middle" fill="#483162" fontFamily="monospace" fontSize="8" letterSpacing="3">AT THE CORE</text>
        <circle cx="172" cy="131" r="3" fill="#4f366e" />
        <g fill="#d6ed9e" stroke="#6c8050"><circle cx="66" cy="94" r="5" /><circle cx="410" cy="328" r="5" /></g>
        <g fill="#e78d76"><circle cx="414" cy="94" r="4" /><circle cx="70" cy="328" r="4" /></g>
      </svg>
      <div className="cpp-memory-strip" aria-hidden="true">{Array.from({ length: 24 }, (_, index) => <i key={index} />)}</div>
      <figcaption><span>High-level intent.<br /><em>Low-level understanding.</em></span><span className="cpp-caption-arrow" aria-hidden="true">↘</span></figcaption>
    </figure>
  );
}

export function TechStackSection() {
  return (
    <section className="toolkit-section cpp-section" aria-labelledby="cpp-heading">
      <div className="site-shell">
        <div className="cpp-heading">
          <div className="eyebrow"><span>Engineering / 03</span><i /></div>
          <h2 id="cpp-heading">C++ is the core.<br /><em>The details are the craft.</em></h2>
          <p>I’m drawn to the part of software where abstractions meet the machine. Where ownership, timing, and a single design decision can change everything.</p>
        </div>
        <div className="cpp-workbench">
          <CoreDiagram />
          <div className="cpp-disciplines">
            <p className="small-label cpp-margin-note">Three things I think deeply about</p>
            {disciplines.map((discipline) => (
              <article className="cpp-discipline" key={discipline.number}>
                <span className="cpp-discipline-number">{discipline.number}</span>
                <div><h3>{discipline.title}</h3><p>{discipline.copy}</p><span className="cpp-discipline-detail">{discipline.detail}</span></div>
              </article>
            ))}
          </div>
        </div>
        <div className="cpp-footnote">
          <span className="small-label">Around the core</span>
          <p><strong>Python</strong> for experiments.<br className="sm:hidden" /> <strong>TypeScript &amp; React</strong> for interfaces.</p>
          <a href="#work" className="text-link">Explore the work <ArrowUpRight size={17} /></a>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

type NeuralNetworkProps = {
  showCenter?: boolean;
};

export function NeuralNetwork({ showCenter = true }: NeuralNetworkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Reduced node count for cleaner look - 18 nodes instead of 35
    const nodes: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      pulse: number;
    }[] = [];
    const nodeCount = 18;

    // Initialize nodes in a more spread out pattern
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2;
      const radius = 100 + Math.random() * 120;
      nodes.push({
        x:
          rect.width / 2 +
          Math.cos(angle) * radius +
          (Math.random() - 0.5) * 80,
        y:
          rect.height / 2 +
          Math.sin(angle) * radius +
          (Math.random() - 0.5) * 80,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        radius: Math.random() * 2.5 + 2,
        color:
          i % 5 === 0
            ? "#7c3aed"
            : i % 3 === 0
              ? "#06b6d4"
              : i % 7 === 0
                ? "#f97316"
                : "#94a3b8",
        pulse: Math.random() * Math.PI * 2,
      });
    }

    let animationId: number;
    let time = 0;

    const animate = () => {
      time += 0.015;
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Draw connections with more selective distance - 130px for sparser connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 130) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = "#94a3b8";
            ctx.globalAlpha = 0.12 * (1 - distance / 130);
            ctx.lineWidth = 0.8;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }

      // Update and draw nodes
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        node.pulse += 0.03;

        // Bounce off edges with padding
        const padding = 60;
        if (node.x < padding || node.x > rect.width - padding) node.vx *= -1;
        if (node.y < padding || node.y > rect.height - padding) node.vy *= -1;

        // Draw subtle outer glow
        const pulseSize = Math.sin(node.pulse) * 0.3 + 1;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 2.5 * pulseSize, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.globalAlpha = 0.06;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Draw node
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();
      }

      // Draw fewer, more subtle data flow pulses
      const pulseCount = 3;
      for (let p = 0; p < pulseCount; p++) {
        const pulseTime = (time + p * 0.6) % 2.5;
        const startNode = nodes[p % nodes.length];
        const endNode = nodes[(p + 4) % nodes.length];

        const t = pulseTime / 2.5;
        const px = startNode.x + (endNode.x - startNode.x) * t;
        const py = startNode.y + (endNode.y - startNode.y) * t;

        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#7c3aed";
        ctx.globalAlpha = 0.4 * (1 - t);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="relative h-full w-full">
      {/* Primary gradient orb */}
      <motion.div
        animate={{ scale: [1, 1.03, 1], opacity: [0.25, 0.35, 0.25] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-linear-to-br from-violet-400/15 via-blue-400/10 to-cyan-400/5 blur-3xl"
      />

      {/* Canvas for neural network */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ width: "100%", height: "100%" }}
      />

      {showCenter ? (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative"></div>
        </div>
      ) : null}

      {/* Floating geometric elements */}
      <motion.div
        animate={{ y: [-8, 8, -8], rotate: [0, 90, 180, 270, 360] }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute right-20 top-16 h-6 w-6 rounded-md border border-primary/20 bg-linear-to-br from-primary/10 to-transparent"
      />
      <motion.div
        animate={{ y: [8, -8, 8], x: [-4, 4, -4] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-20 top-28 h-4 w-4 rounded-full border border-cyan-400/20 bg-linear-to-br from-cyan-400/10 to-transparent"
      />

      {/* Code bracket */}
      <motion.div
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute bottom-24 right-12 font-mono text-xl text-primary/30"
      >
        {"</>"}
      </motion.div>
    </div>
  );
}

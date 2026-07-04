"use client";

import { useEffect, useRef } from "react";

/**
 * 3D hero: a perspective-projected wave field of points — a nod to what
 * Altaviz does (watching signal surfaces for the spike that matters). One
 * "anomaly" pulse periodically travels through the field in red.
 */
export default function HeroWave() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let t = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    const COLS = 46;
    const ROWS = 26;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const camY = 1.5;
      const camZ = -2.2;
      const fov = H * 0.9;
      // anomaly pulse position cycles across the grid
      const pulse = (t * 0.25) % 1.6 - 0.3;

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const x = (c / (COLS - 1) - 0.5) * 4.4;
          const z = (r / (ROWS - 1)) * 5 + 0.4;
          const u = c / (COLS - 1);

          let y =
            Math.sin(x * 1.6 + t) * 0.18 +
            Math.cos(z * 1.3 - t * 0.8) * 0.14 +
            Math.sin((x + z) * 0.9 + t * 0.5) * 0.1;

          // the anomaly: a sharp traveling spike
          const d = Math.abs(u - pulse);
          const spike = Math.exp(-(d * d) / 0.002) * 0.85;
          y += spike * Math.exp(-Math.abs(z - 2.6) / 1.4);

          const py = y - camY;
          const pz = z - camZ;
          const sx = W / 2 + (x / pz) * fov;
          const sy = H * 0.4 - (py / pz) * fov;

          const depth = Math.max(0, 1 - z / 6);
          const isSpike = spike > 0.08;
          const size = (isSpike ? 2.6 : 1.5) * dpr * (0.4 + depth);

          ctx.beginPath();
          ctx.arc(sx, sy, size, 0, Math.PI * 2);
          ctx.fillStyle = isSpike
            ? `rgba(239, 68, 68, ${0.35 + depth * 0.55})`
            : `rgba(14, 116, 233, ${0.12 + depth * 0.5})`;
          ctx.fill();
        }
      }

      t += reduceMotion ? 0 : 0.016;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full"
      aria-label="Animated 3D wave of data points with a red anomaly pulse traveling through it"
    />
  );
}

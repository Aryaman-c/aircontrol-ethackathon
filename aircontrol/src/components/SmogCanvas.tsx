import { useEffect, useRef } from "react";

/**
 * Full-viewport smog simulation. Particle density is driven by the live
 * PM2.5 (µg/m³) of the selected station — Anand Vihar at 160+ renders a
 * dense drifting haze, the cleanest station is nearly clear air.
 */
interface Props {
  pm25: number; // µg/m³, 0–500
}

interface Particle {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  baseAlpha: number;
  phase: number;
}

const MAX_PARTICLES = 800;

function makeParticle(w: number, h: number): Particle {
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    r: 30 + Math.random() * 70,
    vx: 0.12 + Math.random() * 0.25, // prevailing wind, left → right
    vy: (Math.random() - 0.5) * 0.08,
    baseAlpha: 0.025 + Math.random() * 0.05,
    phase: Math.random() * Math.PI * 2,
  };
}

export default function SmogCanvas({ pm25 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetRef = useRef(pm25);
  targetRef.current = pm25;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0;
    let h = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = Array.from({ length: MAX_PARTICLES }, () =>
      makeParticle(w, h),
    );

    // pm25 0–500 → particle count 0–MAX
    const countFor = (v: number) =>
      Math.round(Math.min(Math.max(v, 0), 500) * (MAX_PARTICLES / 500));

    let current = countFor(targetRef.current); // start at target, no fade-in on load
    let raf = 0;
    let running = true;
    let t = 0;

    const drawStatic = () => {
      // reduced-motion: one static haze pass, no animation loop
      ctx.clearRect(0, 0, w, h);
      const n = countFor(targetRef.current);
      for (let i = 0; i < n; i++) {
        const p = particles[i];
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, `rgba(168, 148, 110, ${p.baseAlpha})`);
        g.addColorStop(1, "rgba(168, 148, 110, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
    };

    const frame = () => {
      if (!running) return;
      t += 0.008;
      // ease particle count toward the live target so station switches breathe
      current += (countFor(targetRef.current) - current) * 0.025;
      const n = Math.round(current);

      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < n; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy + Math.sin(t + p.phase) * 0.05;
        if (p.x - p.r > w) p.x = -p.r;
        if (p.y - p.r > h) p.y = -p.r;
        if (p.y + p.r < 0) p.y = h + p.r;

        const alpha = p.baseAlpha * (0.85 + 0.15 * Math.sin(t * 2 + p.phase));
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, `rgba(168, 148, 110, ${alpha})`);
        g.addColorStop(1, "rgba(168, 148, 110, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
      raf = requestAnimationFrame(frame);
    };

    if (reduced) {
      drawStatic();
      // redraw statically when the target changes
      const interval = window.setInterval(drawStatic, 1200);
      return () => {
        window.clearInterval(interval);
        window.removeEventListener("resize", resize);
      };
    }

    const onVisibility = () => {
      running = document.visibilityState === "visible";
      if (running) raf = requestAnimationFrame(frame);
      else cancelAnimationFrame(raf);
    };
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}

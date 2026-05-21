'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number; y: number;
  ox: number; oy: number; // origin
  vx: number; vy: number;
  size: number;
  alpha: number;
}

export function ParticleMagnet() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });
  const particles = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init();
    };

    const init = () => {
      const COUNT = 120;
      particles.current = [];
      for (let i = 0; i < COUNT; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        particles.current.push({
          x, y, ox: x, oy: y,
          vx: 0, vy: 0,
          size: Math.random() * 3 + 2,
          alpha: Math.random() * 0.5 + 0.2,
        });
      }
    };

    const REPULSE_RADIUS = 150;
    const CONNECT_DIST = 120;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const p = particles.current;
      
      // Get sentient stress from CSS variable
      const stressStr = getComputedStyle(document.documentElement).getPropertyValue('--sentient-stress') || '0';
      const stress = parseFloat(stressStr);
      const isTargeting = stress > 0.7;

      // Update positions
      for (const pt of p) {
        const dx = pt.x - mouse.current.x;
        const dy = pt.y - mouse.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (isTargeting && dist < 300) {
            // "Intention Stabilization": Particles act as magnetic targeting grid
            const force = (300 - dist) / 300;
            pt.vx -= (dx / dist) * force * 1.5; // Attract instead of repulse
            pt.vy -= (dy / dist) * force * 1.5;
        } else if (dist < REPULSE_RADIUS) {
          const force = (REPULSE_RADIUS - dist) / REPULSE_RADIUS;
          pt.vx += (dx / dist) * force * 3;
          pt.vy += (dy / dist) * force * 3;
        }

        // Spring back
        pt.vx += (pt.ox - pt.x) * (isTargeting ? 0.08 : 0.04);
        pt.vy += (pt.oy - pt.y) * (isTargeting ? 0.08 : 0.04);

        // Dampen
        pt.vx *= (isTargeting ? 0.7 : 0.85);
        pt.vy *= (isTargeting ? 0.7 : 0.85);

        pt.x += pt.vx;
        pt.y += pt.vy;
      }

      // Draw connections
      for (let i = 0; i < p.length; i++) {
        for (let j = i + 1; j < p.length; j++) {
          const dx = p[i].x - p[j].x;
          const dy = p[i].y - p[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < (isTargeting ? 200 : CONNECT_DIST)) {
            const alpha = (1 - dist / (isTargeting ? 200 : CONNECT_DIST)) * (isTargeting ? 0.3 : 0.15);
            ctx.beginPath();
            ctx.moveTo(p[i].x, p[i].y);
            ctx.lineTo(p[j].x, p[j].y);
            ctx.strokeStyle = isTargeting ? `rgba(239, 68, 68, ${alpha})` : `rgba(6, 182, 212, ${alpha})`;
            ctx.lineWidth = isTargeting ? 1.2 : 0.8;
            ctx.stroke();
          }
        }
      }

      // Draw hexagonal nodes
      for (const pt of p) {
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(performance.now() * (isTargeting ? 0.001 : 0.0003));
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const angle = (k / 6) * Math.PI * 2;
          const hx = Math.cos(angle) * pt.size;
          const hy = Math.sin(angle) * pt.size;
          k === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.strokeStyle = isTargeting ? `rgba(239, 68, 68, ${pt.alpha})` : `rgba(6, 182, 212, ${pt.alpha})`;
        ctx.lineWidth = isTargeting ? 1.5 : 0.8;
        ctx.stroke();

        // Central dot
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fillStyle = isTargeting ? `rgba(239, 68, 68, ${pt.alpha * 2})` : `rgba(6, 182, 212, ${pt.alpha * 2})`;
        ctx.fill();
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    const onMouseMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouseMove);
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
        opacity: 0.6,
      }}
    />
  );
}


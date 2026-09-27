'use client';

/**
 * 赛博朋克背景粒子（plexus 网络）：
 * - 缓慢漂移的节点 + 距离阈值内的连线，指针附近产生轻柔的引力扰动（物理感）
 * - 主题感知颜色（CSS 变量 --particle-a/b/c），透明度压低不干扰阅读
 * - 尊重 prefers-reduced-motion（不渲染）；页面隐藏时暂停 rAF；DPR 上限 2
 */
import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  r: number;
}

export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const style = getComputedStyle(document.documentElement);
    const palette = [
      style.getPropertyValue('--particle-a').trim() || 'rgba(0,112,243,0.5)',
      style.getPropertyValue('--particle-b').trim() || 'rgba(121,40,202,0.4)',
      style.getPropertyValue('--particle-c').trim() || 'rgba(6,182,212,0.45)',
    ];

    let particles: Particle[] = [];
    let raf = 0;
    let running = true;
    const pointer = { x: -9999, y: -9999 };
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const LINK_DIST = 130;
    const POINTER_DIST = 160;

    const seed = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const count = Math.min(Math.round((w * h) / 22000), 90);
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        color: palette[Math.floor(Math.random() * palette.length)],
        r: Math.random() * 1.4 + 0.8,
      }));
    };

    const resize = () => {
      canvas.width = window.innerWidth * DPR;
      canvas.height = window.innerHeight * DPR;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      seed();
    };

    const tick = () => {
      if (!running) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        // 指针引力扰动：靠近时被轻柔吸引，产生物理跟随感
        const dx = pointer.x - p.x;
        const dy = pointer.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < POINTER_DIST && dist > 0.001) {
          const pull = (1 - dist / POINTER_DIST) * 0.012;
          p.vx += (dx / dist) * pull;
          p.vy += (dy / dist) * pull;
        }
        // 阻尼限速，保持缓慢漂移
        p.vx = Math.max(-0.4, Math.min(0.4, p.vx * 0.995));
        p.vy = Math.max(-0.4, Math.min(0.4, p.vy * 0.995));
        p.x += p.vx;
        p.y += p.vy;
        // 环绕边界
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;
      }

      // 连线：距离越近越亮
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < LINK_DIST) {
            ctx.strokeStyle = a.color;
            ctx.globalAlpha = (1 - dist / LINK_DIST) * 0.14;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // 节点
      for (const p of particles) {
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(tick);
    };

    const onPointerMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    };
    const onPointerLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };
    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };

    resize();
    raf = requestAnimationFrame(tick);
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}

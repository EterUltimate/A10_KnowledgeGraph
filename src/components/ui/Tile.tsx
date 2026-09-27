'use client';

/**
 * 交互磁贴：Vercel 风格 bento 单元。
 * - 指针聚光：跟随鼠标的径向渐变（--mx/--my 注入 .tile::before）
 * - 物理 3D 倾斜（tilt）：rAF lerp 弹簧回中，幅度克制（≤2.4°）不抢交互
 * - accent 决定聚光与顶部强调线颜色（多种强调色语义化）
 */
import { useRef, type CSSProperties, type ReactNode } from 'react';

type Accent = 'blue' | 'cyan' | 'violet' | 'amber' | 'green' | 'red' | 'neutral';

const ACCENT_VAR: Record<Accent, string> = {
  blue: 'var(--acc-blue)',
  cyan: 'var(--acc-cyan)',
  violet: 'var(--acc-violet)',
  amber: 'var(--acc-amber)',
  green: 'var(--acc-green)',
  red: 'var(--acc-red)',
  neutral: 'var(--line-strong)',
};

interface TileProps {
  children: ReactNode;
  accent?: Accent;
  /** 悬浮聚光 + 抬升 */
  interactive?: boolean;
  /** 物理 3D 倾斜（默认开启于 interactive） */
  tilt?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  ariaLabel?: string;
}

export function Tile({
  children,
  accent = 'blue',
  interactive = false,
  tilt = true,
  className = '',
  style,
  onClick,
  ariaLabel,
}: TileProps) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const target = useRef({ rx: 0, ry: 0, mx: 50, my: 50, op: 0 });
  const current = useRef({ rx: 0, ry: 0, mx: 50, my: 50, op: 0 });

  // lerp 弹簧：每帧向目标值收敛，产生物理回弹感（function 声明以支持自递归调度）
  function animate() {
    const el = ref.current;
    if (!el) return;
    const t = target.current;
    const c = current.current;
    c.rx += (t.rx - c.rx) * 0.12;
    c.ry += (t.ry - c.ry) * 0.12;
    c.mx += (t.mx - c.mx) * 0.2;
    c.my += (t.my - c.my) * 0.2;
    c.op += (t.op - c.op) * 0.16;
    el.style.transform = `perspective(900px) rotateX(${c.rx.toFixed(3)}deg) rotateY(${c.ry.toFixed(3)}deg)${t.op > 0.02 ? ' translateY(-3px)' : ''}`;
    el.style.setProperty('--mx', `${c.mx.toFixed(2)}%`);
    el.style.setProperty('--my', `${c.my.toFixed(2)}%`);
    el.style.setProperty('--spot-opacity', c.op.toFixed(3));
    if (
      Math.abs(t.rx - c.rx) > 0.002 ||
      Math.abs(t.ry - c.ry) > 0.002 ||
      Math.abs(t.op - c.op) > 0.005
    ) {
      raf.current = requestAnimationFrame(animate);
    } else if (t.op === 0 && t.rx === 0 && t.ry === 0) {
      // 完全回中后清理 transform，避免残留 3d 上下文
      el.style.transform = '';
    }
  }

  const startLoop = () => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(animate);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    target.current.mx = px;
    target.current.my = py;
    target.current.op = 1;
    if (tilt) {
      // 克制倾角：中心为轴，边缘最多 ±2.4°
      target.current.ry = ((px - 50) / 50) * 2.4;
      target.current.rx = -((py - 50) / 50) * 2.4;
    }
    startLoop();
  };

  const onPointerLeave = () => {
    target.current.op = 0;
    target.current.rx = 0;
    target.current.ry = 0;
    startLoop();
  };

  return (
    <div
      ref={ref}
      className={`tile ${interactive ? 'tile-interactive' : ''} ${className}`}
      style={
        {
          '--spot-color': `color-mix(in srgb, ${ACCENT_VAR[accent]} 12%, transparent)`,
          ...style,
        } as CSSProperties
      }
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {interactive && (
        <span
          aria-hidden="true"
          className="tile-topline"
          style={{ background: ACCENT_VAR[accent] }}
        />
      )}
      {children}
    </div>
  );
}

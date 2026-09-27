import type { ReactNode } from 'react';

/**
 * 页头：眉标（强调色小标 + 发丝线）→ 标题 → 描述。
 * 统一 7 个页面的视觉入口，eyebrow 颜色语义化区分端别/功能区。
 */
interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  /** 眉标强调色：blue/cyan/violet/amber/green */
  accent?: 'blue' | 'cyan' | 'violet' | 'amber' | 'green';
  actions?: ReactNode;
}

const ACCENT_CLASS: Record<
  NonNullable<PageHeaderProps['accent']>,
  { text: string; dot: string }
> = {
  blue: { text: 'text-acc-blue', dot: 'bg-acc-blue' },
  cyan: { text: 'text-acc-cyan', dot: 'bg-acc-cyan' },
  violet: { text: 'text-acc-violet', dot: 'bg-acc-violet' },
  amber: { text: 'text-acc-amber', dot: 'bg-acc-amber' },
  green: { text: 'text-acc-green', dot: 'bg-acc-green' },
};

export function PageHeader({
  eyebrow,
  title,
  description,
  accent = 'blue',
  actions,
}: PageHeaderProps) {
  const a = ACCENT_CLASS[accent];
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <p
          className={`mb-2 flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.14em] ${a.text}`}
        >
          <span aria-hidden="true" className={`h-px w-6 ${a.dot}`} style={{ height: 2 }} />
          {eyebrow}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * 空状态引导：数据为空时展示提示文案 + CTA 按钮。2px 虚线框 + blue 图标底座。
 */
import Link from 'next/link';

interface EmptyStateProps {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}

export function EmptyState({ title, description, actionHref, actionLabel }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-line py-16 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-acc-blue-soft">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--acc-blue)"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-xs text-sm leading-relaxed text-fg-muted">{description}</p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="btn btn-primary mt-4 !px-5 !py-2 text-sm">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

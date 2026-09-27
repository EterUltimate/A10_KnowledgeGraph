/**
 * 面包屑导航：显示当前页面层级位置。等宽斜杠分隔，当前页加重。
 */
import Link from 'next/link';

interface Crumb {
  href: string;
  label: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav
      aria-label="面包屑"
      className="mb-4 flex items-center gap-1.5 font-mono text-xs text-fg-subtle"
    >
      {items.map((item, i) => (
        <span key={item.href} className="flex items-center gap-1.5">
          {i > 0 && (
            <span aria-hidden="true" className="select-none opacity-60">
              /
            </span>
          )}
          {i === items.length - 1 ? (
            <span className="font-medium text-fg">{item.label}</span>
          ) : (
            <Link href={item.href} className="transition-colors hover:text-acc-blue">
              {item.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

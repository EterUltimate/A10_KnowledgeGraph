/**
 * 面包屑导航：显示当前页面层级位置。
 */
import Link from 'next/link';

interface Crumb {
  href: string;
  label: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="面包屑" className="mb-3 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
      {items.map((item, i) => (
        <span key={item.href} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden="true">/</span>}
          {i === items.length - 1 ? (
            <span className="font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
          ) : (
            <Link href={item.href} className="hover:text-brand-600">{item.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}

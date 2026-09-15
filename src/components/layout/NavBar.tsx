/**
 * 全局导航栏（tier1 基础版）
 * 教师端 / 学生端入口，遵循 frontend-design 的语义化与可访问性要求。
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: '首页' },
  { href: '/teacher/upload', label: '上传资料' },
  { href: '/teacher/knowledge', label: '知识点管理' },
  { href: '/student/graph', label: '知识图谱' },
  { href: '/student/path', label: '学习路径' },
  { href: '/student/qa', label: '智能问答' },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-10 border-b border-surface-border bg-surface/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-3" aria-label="主导航">
        <span className="mr-4 text-base font-semibold text-brand-600">A10 知识图谱</span>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                active ? 'bg-brand-50 font-medium text-brand-700' : 'text-gray-600 hover:bg-surface-muted'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

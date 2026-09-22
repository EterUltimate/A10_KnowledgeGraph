'use client';

/**
 * 全局导航栏：品牌 + 主导航 + 右侧操作区（主题切换 + 用户菜单）。
 * 颜色全部走设计 token（surface/brand → CSS 变量），深/浅主题自适应。
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { UserMenu } from '@/components/layout/UserMenu';

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
        <Link href="/" className="mr-4 flex items-center gap-2 text-base font-semibold text-brand-600">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-xs font-bold text-white">A10</span>
          知识图谱
        </Link>
        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? 'bg-brand-50 font-medium text-brand-700'
                    : 'text-gray-600 hover:bg-surface-muted dark:text-gray-300'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className="ml-2 flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </nav>
    </header>
  );
}

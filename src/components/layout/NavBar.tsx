'use client';

/**
 * 全局导航栏：玻璃拟态吸顶 + 发丝线，品牌标 + 主导航（2px 滑动下划线）+ 主题/用户。
 * 导航按登录角色向下兼容过滤：admin ⊇ teacher ⊇ student；未登录/学生仅见学生端。
 */
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { UserMenu } from '@/components/layout/UserMenu';
import { LogoMark } from '@/components/layout/Footer';
import type { Role } from '@/lib/auth-roles';

const NAV_GROUPS: {
  label: string;
  accent: 'blue' | 'violet' | 'amber';
  /** 哪些角色可见（向下兼容在角色映射里处理） */
  visibleFor: Role[];
  items: { href: string; label: string }[];
}[] = [
  {
    label: '管理后台',
    accent: 'amber',
    visibleFor: ['admin'],
    items: [{ href: '/admin', label: '系统管理' }],
  },
  {
    label: '教师端',
    accent: 'blue',
    visibleFor: ['teacher', 'admin'],
    items: [
      { href: '/teacher/upload', label: '上传资料' },
      { href: '/teacher/knowledge', label: '知识点管理' },
    ],
  },
  {
    label: '学生端',
    accent: 'violet',
    visibleFor: ['student', 'teacher', 'admin'],
    items: [
      { href: '/student/graph', label: '知识图谱' },
      { href: '/student/path', label: '学习路径' },
      { href: '/student/qa', label: '智能问答' },
    ],
  },
];

export function NavBar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();
  const role: Role = session?.user?.role ?? 'student';
  const groups = NAV_GROUPS.filter((g) => g.visibleFor.includes(role));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/72 backdrop-blur-xl">
      {/* 顶部 1px 渐变光束（赛博朋克微信号） */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent 5%, var(--acc-blue) 30%, var(--acc-violet) 55%, var(--acc-cyan) 75%, transparent 95%)',
          opacity: 0.5,
        }}
      />
      <nav
        className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4 sm:px-6"
        aria-label="主导航"
      >
        <Link
          href="/"
          className="group mr-2 flex shrink-0 items-center gap-2.5"
          aria-label="返回首页"
        >
          <LogoMark className="h-6 w-6 transition-transform duration-300 [transition-timing-function:var(--ease-spring)] group-hover:rotate-[15deg] group-hover:scale-110" />
          <span className="text-[15px] font-semibold tracking-tight">
            A10 <span className="text-fg-muted">知识图谱</span>
          </span>
        </Link>

        {/* 桌面导航（按角色过滤分组） */}
        <div className="hidden flex-1 items-center gap-4 pl-4 md:flex">
          {groups.map((group) => (
            <div key={group.label} className="flex items-center gap-0.5">
              <span
                className={`mr-1.5 hidden select-none font-mono text-[10px] uppercase tracking-[0.12em] lg:inline ${
                  group.accent === 'blue'
                    ? 'text-acc-blue'
                    : group.accent === 'amber'
                      ? 'text-acc-amber'
                      : 'text-acc-violet'
                }`}
              >
                {group.label}
              </span>
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`nav-link ${active ? 'nav-link-active' : ''}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
          {/* 汉堡按钮（仅窄屏） */}
          <button
            type="button"
            aria-label={mobileOpen ? '关闭菜单' : '打开菜单'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg md:hidden"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
              className={`transition-transform duration-300 [transition-timing-function:var(--ease-spring)] ${mobileOpen ? 'rotate-90' : ''}`}
            >
              {mobileOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* 移动端展开菜单（弹簧下落） */}
      <div
        className={`overflow-hidden border-line bg-background/95 backdrop-blur-xl transition-all duration-300 [transition-timing-function:var(--ease-spring)] md:hidden ${
          mobileOpen ? 'max-h-96 border-t opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="space-y-1 px-4 py-3">
          {groups.map((group) => (
            <div key={group.label}>
              <p
                className={`mb-1 mt-2 font-mono text-[10px] uppercase tracking-[0.12em] ${
                  group.accent === 'blue'
                    ? 'text-acc-blue'
                    : group.accent === 'amber'
                      ? 'text-acc-amber'
                      : 'text-acc-violet'
                }`}
              >
                {group.label}
              </p>
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setMobileOpen(false)}
                    className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                      active
                        ? 'bg-surface-hover font-medium text-fg'
                        : 'text-fg-muted hover:bg-surface-hover hover:text-fg'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}

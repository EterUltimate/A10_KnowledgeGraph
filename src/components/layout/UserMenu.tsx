'use client';

/**
 * 用户菜单：显示当前登录用户与角色，提供「模型设置」（仅教师）与「登出」。
 * 未登录时显示「登录」入口。下拉菜单弹簧展开，角色徽章蓝/紫语义区分。
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

export function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  if (status === 'loading') {
    return (
      <span className="h-9 w-20 animate-pulse rounded-lg bg-surface-hover" aria-hidden="true" />
    );
  }

  if (!session?.user) {
    return (
      <Link href="/login" className="btn btn-primary !px-3 !py-1.5 text-sm">
        登录
      </Link>
    );
  }

  const role = session.user.role ?? 'student';
  const name = session.user.name ?? (role === 'teacher' ? '教师' : '学生');
  const initial = name.trim().slice(0, 1) || 'U';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm transition-all duration-300 [transition-timing-function:var(--ease-spring)] hover:-translate-y-0.5 hover:border-line-strong"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-acc-blue text-xs font-semibold text-white">
          {initial}
        </span>
        <span className="hidden max-w-[8rem] truncate sm:inline">{name}</span>
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${
            role === 'teacher'
              ? 'bg-acc-blue-soft text-acc-blue'
              : 'bg-acc-violet-soft text-acc-violet'
          }`}
        >
          {role === 'teacher' ? '教师' : '学生'}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-line bg-surface shadow-lg"
          style={{ animation: 'fade-up 240ms var(--ease-spring-soft)' }}
        >
          <div className="border-b border-line px-3 py-2 text-xs text-fg-subtle">
            {name} · {role === 'teacher' ? '教师' : '学生'}
          </div>
          {role === 'teacher' && (
            <Link
              href="/teacher/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
            >
              模型接入设置
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await signOut({ redirect: false });
              router.push('/login');
              router.refresh();
            }}
            className="block w-full px-3 py-2 text-left text-sm text-acc-red transition-colors hover:bg-surface-hover"
          >
            登出
          </button>
        </div>
      )}
    </div>
  );
}

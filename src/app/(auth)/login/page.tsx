'use client';

/**
 * 登录页（A-1）：使用 Auth.js v5 客户端 signIn（credentials），成功后跳转 callbackUrl 或教师工作台。
 * Vercel 风格居中卡片：品牌标 + 玻璃卡片 + 演示账号 mono 提示。
 */
import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { LogoMark } from '@/components/layout/Footer';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const forbidden = searchParams.get('error') === 'forbidden';
  const callbackUrl = searchParams.get('callbackUrl') ?? '/teacher/upload';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await signIn('credentials', { username, password, redirect: false });
      if (result?.error) {
        setError('用户名或密码错误');
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
      {/* 登录卡片后方的柔光 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-72 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(closest-side, var(--glow), transparent)' }}
      />
      <div className="mb-8 text-center">
        <LogoMark className="mx-auto h-11 w-11" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">登录知识图谱系统</h1>
        <p className="mt-2 text-sm text-fg-muted">
          教师可管理课程与图谱，学生可浏览图谱、规划路径与智能问答。
        </p>
      </div>

      {forbidden && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-line bg-acc-amber-soft px-3 py-2 text-sm text-fg">
          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-acc-amber" />
          当前账号无教师权限，请使用教师账号登录。
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-4 !p-6">
        <div>
          <label htmlFor="username" className="label">
            用户名
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="password" className="label">
            密码
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-line bg-acc-red-soft px-3 py-2 text-sm text-fg"
          >
            <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-acc-red" />
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting} className="btn btn-primary w-full !py-2.5">
          {submitting ? '登录中…' : '登录'}
        </button>

        <div className="rounded-lg border border-line bg-surface-muted px-3 py-2.5 text-xs leading-relaxed text-fg-muted">
          演示账号：教师 <code className="kbd !text-[11px]">teacher / teach123456</code>
          <br />
          <span className="mt-1 block">
            学生 <code className="kbd !text-[11px]">student / study123456</code>
          </span>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-12 text-fg-muted">加载中…</div>}>
      <LoginForm />
    </Suspense>
  );
}

'use client';

/**
 * 登录页（A-1）：使用 Auth.js v5 客户端 signIn（credentials），成功后跳转 callbackUrl 或教师工作台。
 */
import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

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
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
      <div className="mb-8 text-center">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">A10</span>
        <h1 className="mt-4 text-2xl font-bold">登录知识图谱系统</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          教师可管理课程与图谱，学生可浏览图谱、规划路径与智能问答。
        </p>
      </div>

      {forbidden && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
          当前账号无教师权限，请使用教师账号登录。
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label htmlFor="username" className="label">用户名</label>
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
          <label htmlFor="password" className="label">密码</label>
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
          <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? '登录中…' : '登录'}
        </button>

        <div className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
          演示账号：教师 <code className="mark-accent">teacher / teach123456</code>，学生 <code className="mark-accent">student / study123456</code>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-12 text-gray-500">加载中…</div>}>
      <LoginForm />
    </Suspense>
  );
}

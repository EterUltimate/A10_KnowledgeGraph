'use client';

/**
 * 登录页（A-1）：对应 S4B 演示脚本「教师登录系统」。
 * 使用 Auth.js v5 客户端 signIn（credentials），成功后跳转 callbackUrl 或教师工作台。
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
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold mb-2">登录 A10 知识图谱系统</h1>
      <p className="text-sm text-gray-500 mb-6">
        教师可管理课程与图谱，学生可浏览图谱、规划路径与智能问答。
      </p>

      {forbidden && (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          当前账号无教师权限，请使用教师账号登录。
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-6 shadow-sm">
        <div>
          <label htmlFor="username" className="block text-sm font-medium mb-1">
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
            className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
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
            className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div role="alert" className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? '登录中…' : '登录'}
        </button>

        <div className="rounded bg-gray-50 px-3 py-2 text-xs text-gray-600">
          演示账号：教师 <code>teacher / teach123456</code>，学生 <code>student / study123456</code>
          （生产环境请通过 DEMO_TEACHER_USER 等环境变量覆盖）。
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

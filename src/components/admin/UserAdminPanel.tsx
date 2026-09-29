'use client';

/**
 * 管理员后台 - 用户账号面板：列出账号、新增（用户名/密码/角色）、删除、重置口令。
 * 通过 /api/admin/users 系列端点交互（服务端 requireAdmin 守卫）。
 */
import { useCallback, useEffect, useState } from 'react';

interface SafeUser {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
  createdAt: string;
}

const ROLE_LABEL: Record<SafeUser['role'], string> = {
  admin: '管理员',
  teacher: '教师',
  student: '学生',
};

async function api<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; data?: T; error?: string }> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const json = (await res.json()) as { success: boolean; data?: T; error?: string };
  return { ok: json.success, data: json.data, error: json.error };
}

export function UserAdminPanel() {
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<SafeUser['role']>('student');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    return api<SafeUser[]>('/api/admin/users').then((r) => {
      if (r.ok && r.data) setUsers(r.data);
      else setMsg(r.error ?? '加载失败');
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const r = await api<SafeUser>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({ username, password, name, role }),
    });
    if (r.ok) {
      setUsername('');
      setPassword('');
      setName('');
      await reload();
      setMsg('已新增用户');
    } else setMsg(r.error ?? '新增失败');
  }

  async function remove(id: string, uname: string) {
    if (!confirm(`确认删除用户「${uname}」？该操作不可撤销。`)) return;
    setMsg(null);
    const r = await api(`/api/admin/users/${id}`, { method: 'DELETE' });
    if (r.ok) await reload();
    else setMsg(r.error ?? '删除失败');
  }

  async function resetPassword(id: string) {
    const pw = prompt('输入新密码（至少 6 位）：');
    if (!pw) return;
    setMsg(null);
    const r = await api(`/api/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ password: pw }),
    });
    setMsg(r.ok ? '口令已重置' : (r.error ?? '重置失败'));
  }

  return (
    <section className="card space-y-4 !p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">用户账号管理</h2>
        <button type="button" onClick={() => void reload()} className="btn btn-ghost !px-2.5 !py-1 text-sm">
          刷新
        </button>
      </div>

      <form onSubmit={addUser} className="grid grid-cols-2 gap-2 rounded-lg border border-line bg-surface-muted p-3 sm:grid-cols-5">
        <input className="input" placeholder="用户名" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <input className="input" type="password" placeholder="密码(≥6)" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <input className="input" placeholder="显示名(可选)" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="input" value={role} onChange={(e) => setRole(e.target.value as SafeUser['role'])}>
          <option value="student">学生</option>
          <option value="teacher">教师</option>
          <option value="admin">管理员</option>
        </select>
        <button type="submit" className="btn btn-primary !px-3 !py-1.5 text-sm">
          新增
        </button>
      </form>

      {msg && <p className="text-sm text-fg-muted">{msg}</p>}

      <ul className="divide-y divide-line">
        {loading && <li className="py-3 text-sm text-fg-muted">加载中…</li>}
        {users.map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
            <div className="min-w-0">
              <span className="font-medium">{u.name}</span>
              <span className="ml-2 text-fg-subtle">@{u.username}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs text-fg-muted">
                {ROLE_LABEL[u.role]}
              </span>
              <button type="button" onClick={() => resetPassword(u.id)} className="btn btn-ghost !px-2 !py-0.5 text-xs">
                改密
              </button>
              <button type="button" onClick={() => remove(u.id, u.username)} className="btn btn-ghost !px-2 !py-0.5 text-xs text-acc-red">
                删除
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

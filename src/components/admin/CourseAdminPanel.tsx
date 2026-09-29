'use client';

/**
 * 管理员后台 - 图数据维护：课程列表、级联删除课程、一键重种内置《数据结构》演示数据。
 * 知识点/关系的精细编辑沿用教师端「知识点管理」。
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface Course {
  id: string;
  name: string;
  knowledgeCount?: number;
  createdAt: string;
}

async function api<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; data?: T; error?: string }> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const json = (await res.json()) as { success: boolean; data?: T; error?: string };
  return { ok: json.success, data: json.data, error: json.error };
}

export function CourseAdminPanel() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    return api<Course[]>('/api/admin/courses').then((r) => {
      if (r.ok && r.data) setCourses(r.data);
      else setMsg(r.error ?? '加载失败');
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function remove(id: string, name: string) {
    if (!confirm(`确认删除课程「${name}」？将同时清除其图谱、语料与向量，操作不可撤销。`)) return;
    setBusy(true);
    setMsg(null);
    const r = await api(`/api/admin/courses/${id}`, { method: 'DELETE' });
    if (r.ok) await reload();
    else setMsg(r.error ?? '删除失败');
    setBusy(false);
  }

  async function reseed() {
    if (!confirm('将向默认课程 data-structures 重种内置《数据结构》演示数据（覆盖其图/语料），继续？')) return;
    setBusy(true);
    setMsg(null);
    const r = await api<{ knowledgeCount: number; relationCount: number }>(
      '/api/admin/courses/reseed',
      { method: 'POST', body: JSON.stringify({}) },
    );
    if (r.ok) {
      await reload();
      setMsg(`已重种演示数据：${r.data?.knowledgeCount ?? '?'} 知识点 / ${r.data?.relationCount ?? '?'} 关系`);
    } else setMsg(r.error ?? '重种失败');
    setBusy(false);
  }

  return (
    <section className="card space-y-4 !p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">图数据维护</h2>
        <div className="flex gap-2">
          <Link href="/teacher/knowledge" className="btn btn-ghost !px-2.5 !py-1 text-sm">
            知识点编辑
          </Link>
          <button type="button" onClick={reseed} disabled={busy} className="btn btn-ghost !px-2.5 !py-1 text-sm">
            重种演示数据
          </button>
        </div>
      </div>

      {msg && <p className="text-sm text-fg-muted">{msg}</p>}

      <ul className="divide-y divide-line">
        {loading && <li className="py-3 text-sm text-fg-muted">加载中…</li>}
        {!loading && courses.length === 0 && (
          <li className="py-3 text-sm text-fg-muted">暂无课程，可「重种演示数据」快速生成。</li>
        )}
        {courses.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
            <div className="min-w-0">
              <span className="font-medium">{c.name}</span>
              <span className="ml-2 text-fg-subtle">
                {c.id} · {c.knowledgeCount ?? 0} 知识点
              </span>
            </div>
            <button
              type="button"
              onClick={() => remove(c.id, c.name)}
              disabled={busy}
              className="btn btn-ghost shrink-0 !px-2 !py-0.5 text-xs text-acc-red"
            >
              删除课程
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

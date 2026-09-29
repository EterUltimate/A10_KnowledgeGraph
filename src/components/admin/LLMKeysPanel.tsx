'use client';

/**
 * 管理员后台 - 大模型 API Key 密钥池：列出（掩码）、新增、切换当前生效、删除。
 * 端点：GET/POST/PATCH /api/admin/keys，DELETE /api/admin/keys/{id}。
 */
import { useCallback, useEffect, useState } from 'react';

interface SafeKey {
  id: string;
  name: string;
  kind: string;
  baseURL: string;
  model: string;
  embedModel: string;
  maskedApiKey: string;
  active: boolean;
}

const KINDS = [
  'openai-compatible',
  'openai-chat',
  'openai-responses',
  'anthropic',
  'gemini',
];

async function api<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; data?: T; error?: string }> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const json = (await res.json()) as { success: boolean; data?: T; error?: string };
  return { ok: json.success, data: json.data, error: json.error };
}

export function LLMKeysPanel() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [keys, setKeys] = useState<SafeKey[]>([]);
  const [form, setForm] = useState({
    name: '',
    kind: 'openai-compatible',
    baseURL: '',
    apiKey: '',
    model: '',
    embedModel: '',
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    return api<{ activeId: string | null; profiles: SafeKey[] }>('/api/admin/keys').then((r) => {
      if (r.ok && r.data) {
        setActiveId(r.data.activeId);
        setKeys(r.data.profiles);
      } else setMsg(r.error ?? '加载失败');
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const r = await api<SafeKey>('/api/admin/keys', { method: 'POST', body: JSON.stringify(form) });
    if (r.ok) {
      setForm({ ...form, name: '', baseURL: '', apiKey: '', model: '', embedModel: '' });
      await reload();
      setMsg('已新增密钥');
    } else setMsg(r.error ?? '新增失败');
  }

  async function activate(id: string | null) {
    setMsg(null);
    const r = await api<{ activeId: string | null; profiles: SafeKey[] }>('/api/admin/keys', {
      method: 'PATCH',
      body: JSON.stringify({ activeId: id }),
    });
    if (r.ok && r.data) {
      setActiveId(r.data.activeId);
      setKeys(r.data.profiles);
    } else setMsg(r.error ?? '切换失败');
  }

  async function remove(id: string) {
    if (!confirm('确认删除该密钥？')) return;
    const r = await api(`/api/admin/keys/${id}`, { method: 'DELETE' });
    if (r.ok) await reload();
    else setMsg(r.error ?? '删除失败');
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <section className="card space-y-4 !p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">大模型 API Key 管理</h2>
        <button type="button" onClick={() => void reload()} className="btn btn-ghost !px-2.5 !py-1 text-sm">
          刷新
        </button>
      </div>
      <p className="text-xs text-fg-subtle">
        当前生效：{activeId ? keys.find((k) => k.id === activeId)?.name : '未启用密钥池（回退教师设置/.env）'}
      </p>

      <form onSubmit={add} className="grid grid-cols-2 gap-2 rounded-lg border border-line bg-surface-muted p-3">
        <input className="input" placeholder="名称（如 DeepSeek 主号）" value={form.name} onChange={set('name')} required />
        <select className="input" value={form.kind} onChange={set('kind')}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <input className="input col-span-2" placeholder="Base URL（https://…）" value={form.baseURL} onChange={set('baseURL')} required />
        <input className="input" placeholder="API Key" value={form.apiKey} onChange={set('apiKey')} required />
        <input className="input" placeholder="对话模型名" value={form.model} onChange={set('model')} required />
        <input className="input col-span-2" placeholder="嵌入模型名（可选，启用向量检索）" value={form.embedModel} onChange={set('embedModel')} />
        <button type="submit" className="btn btn-primary col-span-2 !py-2 text-sm">
          新增密钥
        </button>
      </form>

      {msg && <p className="text-sm text-fg-muted">{msg}</p>}

      <ul className="space-y-2">
        {loading && <li className="text-sm text-fg-muted">加载中…</li>}
        {keys.map((k) => (
          <li
            key={k.id}
            className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm ${
              k.active ? 'border-acc-amber bg-acc-amber-soft' : 'border-line bg-surface'
            }`}
          >
            <div className="min-w-0">
              <span className="font-medium">{k.name}</span>
              {k.active && <span className="ml-2 text-xs text-acc-amber">● 生效中</span>}
              <div className="truncate text-xs text-fg-subtle">
                {k.kind} · {k.model} · key {k.maskedApiKey}
                {k.embedModel ? ` · embed ${k.embedModel}` : ''}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => activate(k.active ? null : k.id)}
                className="btn btn-ghost !px-2 !py-0.5 text-xs"
              >
                {k.active ? '取消生效' : '设为生效'}
              </button>
              <button type="button" onClick={() => remove(k.id)} className="btn btn-ghost !px-2 !py-0.5 text-xs text-acc-red">
                删除
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

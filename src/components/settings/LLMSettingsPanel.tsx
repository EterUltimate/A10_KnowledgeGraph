'use client';

/**
 * LLM 接入设置面板（仅教师，路由已由 /teacher/* 守卫）。
 * 功能：选择协议格式 → 自定义 baseURL / Key / 模型 → 「hi」测连通 → 保存为运行时配置。
 * 安全：密钥只发服务端存储，界面仅回显掩码；「恢复默认」清除覆盖回退 .env。
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react';

type ProviderKind =
  | 'openai-compatible'
  | 'openai-chat'
  | 'openai-responses'
  | 'anthropic'
  | 'gemini';

const KIND_OPTIONS: { value: ProviderKind; label: string; hint: string }[] = [
  { value: 'openai-compatible', label: 'OpenAI 兼容（DeepSeek/Qwen 等）', hint: '兼容 OpenAI 聊天接口格式，最通用' },
  { value: 'openai-chat', label: 'OpenAI Chat', hint: 'OpenAI 官方聊天接口格式' },
  { value: 'openai-responses', label: 'OpenAI Responses', hint: 'OpenAI 新回复接口格式' },
  { value: 'anthropic', label: 'Anthropic（Claude）', hint: 'Claude 消息接口格式' },
  { value: 'gemini', label: 'Google Gemini', hint: '谷歌 Gemini 生成接口格式' },
];

const DEFAULT_BASE_URL: Record<ProviderKind, string> = {
  'openai-compatible': 'https://api.deepseek.com/v1',
  'openai-chat': 'https://api.openai.com/v1',
  'openai-responses': 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
};

interface ConfigView {
  kind: ProviderKind;
  baseURL: string;
  model: string;
  source: 'runtime' | 'env';
  configured: boolean;
  maskedApiKey: string;
}

interface TestResult {
  ok: boolean;
  latencyMs: number;
  reply?: string;
  error?: string;
}

export function LLMSettingsPanel() {
  const [view, setView] = useState<ConfigView | null>(null);
  const [kind, setKind] = useState<ProviderKind>('openai-compatible');
  const [baseURL, setBaseURL] = useState(DEFAULT_BASE_URL['openai-compatible']);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [modelOptions, setModelOptions] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [listing, setListing] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/llm/config', { cache: 'no-store' });
    if (!res.ok) return;
    const json = (await res.json()) as { success: boolean; data?: ConfigView };
    if (json.success && json.data) {
      setView(json.data);
      setKind(json.data.kind);
      setBaseURL(json.data.baseURL);
      setModel(json.data.model);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function candidate(withKey: boolean) {
    return {
      kind,
      baseURL: baseURL.trim(),
      model: model.trim(),
      ...(withKey && apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
    };
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    setMessage(null);
    try {
      const res = await fetch('/api/llm/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidate(true)),
      });
      const json = (await res.json()) as { success: boolean; data?: TestResult; error?: string };
      if (json.success && json.data) {
        setTestResult(json.data);
      } else {
        setTestResult({ ok: false, latencyMs: 0, error: json.error ?? '测试失败' });
      }
    } catch (e) {
      setTestResult({ ok: false, latencyMs: 0, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setTesting(false);
    }
  }

  async function handleListModels() {
    setListing(true);
    setMessage(null);
    try {
      const res = await fetch('/api/llm/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidate(true)),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { models: string[] | null; note?: string };
      };
      if (json.success && json.data) {
        if (json.data.models && json.data.models.length > 0) {
          setModelOptions(json.data.models);
          setMessage({ type: 'ok', text: `已获取 ${json.data.models.length} 个可用模型，可在下拉中选择` });
        } else {
          setModelOptions(null);
          setMessage({ type: 'err', text: json.data.note ?? '端点未返回模型列表，请手动填写' });
        }
      } else {
        setMessage({ type: 'err', text: '获取模型列表失败' });
      }
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setListing(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/llm/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidate(true)),
      });
      const json = (await res.json()) as { success: boolean; data?: ConfigView; error?: string };
      if (json.success && json.data) {
        setView(json.data);
        setApiKey('');
        setMessage({ type: 'ok', text: '已保存为运行时配置，立即生效（无需重启）' });
      } else {
        setMessage({ type: 'err', text: json.error ?? '保存失败' });
      }
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/llm/config', { method: 'DELETE' });
      const json = (await res.json()) as { success: boolean; data?: ConfigView };
      if (json.success && json.data) {
        setView(json.data);
        setKind(json.data.kind);
        setBaseURL(json.data.baseURL);
        setModel(json.data.model);
        setApiKey('');
        setTestResult(null);
        setMessage({ type: 'ok', text: '已恢复为 .env 默认配置' });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {view && (
        <div className="card flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="font-medium">当前生效配置</span>
          <span className="text-gray-600">
            格式：{KIND_OPTIONS.find((k) => k.value === view.kind)?.label ?? view.kind}
          </span>
          <span className="text-gray-600">模型：{view.model || '—'}</span>
          <span className="text-gray-600">密钥：{view.maskedApiKey || '未配置'}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              view.source === 'runtime' ? 'bg-brand-50 text-brand-700' : 'bg-surface-muted text-gray-600'
            }`}
          >
            {view.source === 'runtime' ? '自定义（运行时）' : '系统默认'}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs ${view.configured ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {view.configured ? '在线' : '离线演示'}
          </span>
        </div>
      )}

      <form onSubmit={handleSave} className="card space-y-4">
        <div>
          <label htmlFor="llm-kind" className="label">协议格式</label>
          <select
            id="llm-kind"
            className="input"
            value={kind}
            onChange={(e) => {
              const k = e.target.value as ProviderKind;
              setKind(k);
              setBaseURL(DEFAULT_BASE_URL[k]);
              setModelOptions(null);
            }}
          >
            {KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">{KIND_OPTIONS.find((k) => k.value === kind)?.hint}</p>
        </div>

        <div>
          <label htmlFor="llm-baseurl" className="label">接口地址</label>
          <input
            id="llm-baseurl"
            className="input"
            value={baseURL}
            onChange={(e) => setBaseURL(e.target.value)}
            placeholder="https://api.deepseek.com/v1"
            required
          />
        </div>

        <div>
          <label htmlFor="llm-apikey" className="label">密钥</label>
          <input
            id="llm-apikey"
            className="input"
            type="password"
            autoComplete="new-password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={view?.maskedApiKey ? `留空沿用当前密钥（${view.maskedApiKey}）` : '输入密钥'}
          />
          <p className="mt-1 text-xs text-gray-500">密钥仅存服务端，不回显明文；留空表示沿用现有密钥。</p>
        </div>

        <div>
          <label htmlFor="llm-model" className="label">模型名</label>
          <div className="flex gap-2">
            <input
              id="llm-model"
              className="input flex-1"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="deepseek-chat"
              list="llm-model-options"
              required
            />
            <button type="button" className="btn-ghost" onClick={handleListModels} disabled={listing}>
              {listing ? '获取中…' : '获取模型'}
            </button>
          </div>
          {modelOptions && (
            <datalist id="llm-model-options">
              {modelOptions.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          )}
        </div>

        {message && (
          <div
            role="alert"
            className={`rounded-lg border px-3 py-2 text-sm ${
              message.type === 'ok'
                ? 'border-green-300 bg-green-50 text-green-700'
                : 'border-red-300 bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {testResult && (
          <div
            className={`rounded-lg border px-3 py-2 text-sm ${
              testResult.ok ? 'border-green-300 bg-green-50 text-green-700' : 'border-red-300 bg-red-50 text-red-700'
            }`}
          >
            {testResult.ok ? (
              <>连通正常 · {testResult.latencyMs}ms{testResult.reply ? ` · 回复：${testResult.reply}` : ''}</>
            ) : (
              <>连接失败 · {testResult.error}</>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={handleTest} disabled={testing}>
            {testing ? '测试中…' : '一键测连通'}
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '保存中…' : '保存启用'}
          </button>
          <button type="button" className="btn-ghost" onClick={handleReset} disabled={loading}>
            恢复系统默认
          </button>
        </div>
      </form>

      <div className="card text-sm text-gray-600">
        <p className="font-medium text-gray-800 dark:text-gray-200">说明</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>配置保存后立即对「上传建图 / 智能问答」等所有调用生效，无需重启。</li>
          <li>未配置有效 Key 时系统自动进入离线演示模式（内置《数据结构》数据集）。</li>
          <li>密钥只保存在服务端（data/llm-config.json），任何接口都不回显明文。</li>
        </ul>
      </div>
    </div>
  );
}

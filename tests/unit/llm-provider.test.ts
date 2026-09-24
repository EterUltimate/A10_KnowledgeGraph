/**
 * LLM Provider 工厂单元测试（#40 重构模块 provider.ts）。
 * 全程离线：SSRF 校验为纯函数；getLLM 只构造模型描述符不发请求；
 * pingLLM 覆盖「未配置 Key」与「构造即抛错」两条不触网路径；
 * listModels 用 mock fetch 覆盖三种协议解析 + 非 2xx + 抛错分支。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assertLLMBaseURLSafe,
  getLLM,
  listModels,
  pingLLM,
} from '@/lib/ai/provider';
import { setRuntimeLLMConfig, type LLMConfig } from '@/lib/ai/llm-config';

function resetLLMCache(): void {
  (globalThis as unknown as { __a10LLMRuntime?: unknown }).__a10LLMRuntime = undefined;
}

const INSECURE = 'LLM_ALLOW_INSECURE_BASEURL';
const LOCAL = 'LLM_ALLOW_LOCAL_LLM';
let savedInsecure: string | undefined;
let savedLocal: string | undefined;

beforeEach(() => {
  savedInsecure = process.env[INSECURE];
  savedLocal = process.env[LOCAL];
  delete process.env[INSECURE];
  delete process.env[LOCAL];
  resetLLMCache();
});

afterEach(() => {
  const restore = (k: string, v: string | undefined) => {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  };
  restore(INSECURE, savedInsecure);
  restore(LOCAL, savedLocal);
  vi.unstubAllGlobals();
  resetLLMCache();
});

describe('assertLLMBaseURLSafe（SSRF 防护）', () => {
  it('非法 URL 报格式错误', () => {
    expect(assertLLMBaseURLSafe('not-a-url')).toMatch(/不是合法 URL/);
  });

  it('默认拒绝 http', () => {
    expect(assertLLMBaseURLSafe('http://api.deepseek.com/v1')).toMatch(/必须使用 https/);
  });

  it('允许 http 时放行公网 http', () => {
    process.env[INSECURE] = '1';
    expect(assertLLMBaseURLSafe('http://api.deepseek.com/v1')).toBeNull();
  });

  it('拒绝回环/内网主机', () => {
    expect(assertLLMBaseURLSafe('https://localhost:11434/v1')).toMatch(/内网|回环/);
    expect(assertLLMBaseURLSafe('https://127.0.0.1/v1')).toMatch(/内网|回环/);
    expect(assertLLMBaseURLSafe('https://192.168.1.10/v1')).toMatch(/内网|回环/);
  });

  it('LLM_ALLOW_LOCAL_LLM=1 时放行本地', () => {
    process.env[LOCAL] = '1';
    expect(assertLLMBaseURLSafe('https://localhost:11434/v1')).toBeNull();
  });

  it('公网 https 直接放行', () => {
    expect(assertLLMBaseURLSafe('https://api.openai.com/v1')).toBeNull();
  });
});

describe('getLLM（离线构造模型实例）', () => {
  const base: Omit<LLMConfig, 'kind'> = {
    baseURL: 'https://api.deepseek.com/v1',
    apiKey: 'sk-test-abcdef',
    model: 'deepseek-chat',
  };

  it.each(['openai-compatible', 'openai-chat', 'openai-responses', 'anthropic', 'gemini'] as const)(
    '协议 %s 能构造出模型对象',
    (kind) => {
      setRuntimeLLMConfig({ ...base, kind });
      resetLLMCache();
      const model = getLLM();
      expect(model).toBeTruthy();
      expect(typeof model).toBe('object');
    },
  );

  it('相同配置命中缓存返回同一实例', () => {
    setRuntimeLLMConfig({ ...base, kind: 'openai-compatible' });
    resetLLMCache();
    expect(getLLM()).toBe(getLLM());
  });
});

describe('pingLLM（不触网路径）', () => {
  it('未配置 Key 直接返回离线提示', async () => {
    const r = await pingLLM({ kind: 'openai-compatible', baseURL: 'https://api.deepseek.com/v1', apiKey: '', model: 'm' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/未配置 API Key/);
    expect(r.latencyMs).toBe(0);
  });

  it('占位 Key 视为未配置', async () => {
    const r = await pingLLM({ kind: 'openai-chat', baseURL: 'https://api.openai.com/v1', apiKey: 'your_api_key_here', model: 'm' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/未配置 API Key/);
  });

  it('构造阶段抛错被捕获，返回 ok:false（无网络）', async () => {
    const r = await pingLLM({ kind: 'openai-chat', baseURL: 'https://localhost:1/v1', apiKey: 'sk-real', model: 'm' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/\[provider\]/);
  });
});

describe('listModels（mock fetch）', () => {
  const safeBase = 'https://api.example.com/v1';

  function mockFetchJson(body: unknown, ok = true, status = 200) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        ok
          ? { ok: true, status, json: async () => body }
          : { ok: false, status, json: async () => ({}) },
      ),
    );
  }

  it('不安全 URL 返回 null（不发请求）', async () => {
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    const r = await listModels({ kind: 'openai-chat', baseURL: 'http://127.0.0.1:1/v1', apiKey: 'k', model: 'm' });
    expect(r).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('openai 系解析 data[].id', async () => {
    mockFetchJson({ data: [{ id: 'gpt-x' }, { id: '' }] });
    const r = await listModels({ kind: 'openai-chat', baseURL: safeBase, apiKey: 'k', model: 'm' });
    expect(r).toEqual(['gpt-x']);
  });

  it('anthropic 解析 data[].id', async () => {
    mockFetchJson({ data: [{ id: 'claude-1' }] });
    const r = await listModels({ kind: 'anthropic', baseURL: safeBase, apiKey: 'k', model: 'm' });
    expect(r).toEqual(['claude-1']);
  });

  it('gemini 解析 models[].name 并去前缀', async () => {
    mockFetchJson({ models: [{ name: 'models/gemini-pro' }, {}] });
    const r = await listModels({ kind: 'gemini', baseURL: safeBase, apiKey: 'k', model: 'm' });
    expect(r).toEqual(['gemini-pro']);
  });

  it('非 2xx 返回 null', async () => {
    mockFetchJson({}, false, 500);
    const r = await listModels({ kind: 'openai-compatible', baseURL: safeBase, apiKey: 'k', model: 'm' });
    expect(r).toBeNull();
  });

  it('fetch 抛错返回 null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
    const r = await listModels({ kind: 'openai-compatible', baseURL: safeBase, apiKey: 'k', model: 'm' });
    expect(r).toBeNull();
  });
});

/**
 * 多提供商 LLM 运行时配置单元测试（#40 新增模块 llm-config.ts）。
 * 覆盖：密钥掩码、生效配置优先级（runtime > env）、运行时读写/清除与持久化、
 * 非法 kind 容错、安全视图对外字段。
 * 通过重置 globalThis.__a10LLMRuntime 缓存并操作 DATA_DIR 下的 json 文件来隔离用例。
 */
import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { config } from '@/lib/config';
import {
  PROVIDER_KINDS,
  clearRuntimeLLMConfig,
  getEffectiveLLMConfig,
  hasRuntimeOverride,
  isLLMConfigured,
  maskApiKey,
  publicLLMConfigView,
  setRuntimeLLMConfig,
  type LLMConfig,
} from '@/lib/ai/llm-config';

const CONFIG_FILE = path.join(config.store.dataDir, 'llm-config.json');

function resetCache(): void {
  // 清除模块内运行时缓存，强制下次从磁盘/默认值重新加载
  (globalThis as unknown as { __a10LLMRuntime?: unknown }).__a10LLMRuntime = undefined;
}

beforeEach(() => {
  resetCache();
  if (fs.existsSync(CONFIG_FILE)) fs.rmSync(CONFIG_FILE);
});

afterEach(() => {
  resetCache();
  if (fs.existsSync(CONFIG_FILE)) fs.rmSync(CONFIG_FILE);
});

describe('maskApiKey 密钥掩码', () => {
  it('空串返回空', () => {
    expect(maskApiKey('')).toBe('');
    expect(maskApiKey('   ')).toBe('');
  });

  it('长度 ≤4 一律四个星', () => {
    expect(maskApiKey('abc')).toBe('****');
    expect(maskApiKey('abcd')).toBe('****');
  });

  it('长密钥只留前 4 位，其余打码且至多 8 个星', () => {
    expect(maskApiKey('sk-1234567890')).toBe(`sk-1${'*'.repeat(8)}`);
    expect(maskApiKey('sk-secret')).toBe(`sk-s${'*'.repeat(5)}`);
  });
});

describe('PROVIDER_KINDS 协议清单', () => {
  it('包含五种协议且默认 openai-compatible 在前', () => {
    expect(PROVIDER_KINDS.map((k) => k.value)).toEqual([
      'openai-compatible',
      'openai-chat',
      'openai-responses',
      'anthropic',
      'gemini',
    ]);
  });
});

describe('生效配置：无运行时覆盖时回退 env', () => {
  it('source=env、kind=openai-compatible、默认未配置', () => {
    const eff = getEffectiveLLMConfig();
    expect(eff.source).toBe('env');
    expect(eff.kind).toBe('openai-compatible');
    expect(eff.model).toBe(config.llm.model);
    expect(hasRuntimeOverride()).toBe(false);
    expect(isLLMConfigured()).toBe(false);
  });
});

describe('运行时覆盖的读写与生效', () => {
  const custom: LLMConfig = {
    kind: 'anthropic',
    baseURL: 'https://api.anthropic.com/v1',
    apiKey: 'sk-ant-test-123',
    model: 'claude-3-5-sonnet',
  };

  it('setRuntimeLLMConfig 后 source=runtime 且各项生效', () => {
    setRuntimeLLMConfig(custom);
    resetCache(); // 从磁盘重新加载，验证持久化
    const eff = getEffectiveLLMConfig();
    expect(eff.source).toBe('runtime');
    expect(eff.kind).toBe('anthropic');
    expect(eff.apiKey).toBe('sk-ant-test-123');
    expect(eff.model).toBe('claude-3-5-sonnet');
    expect(hasRuntimeOverride()).toBe(true);
    expect(isLLMConfigured()).toBe(true);
  });

  it('publicLLMConfigView 不回显明文密钥', () => {
    setRuntimeLLMConfig(custom);
    const view = publicLLMConfigView();
    expect(view.kind).toBe('anthropic');
    expect(view.source).toBe('runtime');
    expect(view.configured).toBe(true);
    expect(view.maskedApiKey).toBe(maskApiKey(custom.apiKey));
    expect(view).not.toHaveProperty('apiKey');
  });

  it('clearRuntimeLLMConfig 后回退 env', () => {
    setRuntimeLLMConfig(custom);
    clearRuntimeLLMConfig();
    resetCache();
    expect(getEffectiveLLMConfig().source).toBe('env');
    expect(hasRuntimeOverride()).toBe(false);
  });

  it('覆盖密钥为空白时视为未配置，仍回退 env', () => {
    setRuntimeLLMConfig({ ...custom, apiKey: '   ' });
    resetCache();
    expect(getEffectiveLLMConfig().source).toBe('env');
  });
});

describe('loadRuntime 容错', () => {
  it('持久化文件里 kind 非法时丢弃覆盖并回退 env', () => {
    fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify({ override: { kind: 'bogus', baseURL: 'https://x', apiKey: 'k', model: 'm' } }),
      'utf-8',
    );
    resetCache();
    expect(getEffectiveLLMConfig().source).toBe('env');
    expect(hasRuntimeOverride()).toBe(false);
  });
});

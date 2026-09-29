/**
 * LLM 密钥池（管理员）单元测试：CRUD、掩码、生效优先级（profile > runtime > env）、
 * 删除生效项自动取消生效、更新留空沿用旧密钥、旧文件（仅 override）向后兼容。
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'a10-keys-'));
process.env.DATA_DIR = DATA_DIR;

const { config } = await import('@/lib/config');
const {
  addKeyProfile,
  getEffectiveEmbedConfig,
  getEffectiveLLMConfig,
  listKeyProfiles,
  maskApiKey,
  removeKeyProfile,
  setActiveKey,
  setRuntimeLLMConfig,
  updateKeyProfile,
} = await import('@/lib/ai/llm-config');

const CONFIG_FILE = path.join(config.store.dataDir, 'llm-config.json');

function reset(): void {
  (globalThis as unknown as { __a10LLMRuntime?: unknown }).__a10LLMRuntime = undefined;
  if (fs.existsSync(CONFIG_FILE)) fs.rmSync(CONFIG_FILE);
}

beforeEach(reset);
afterEach(reset);

const validKey = {
  name: 'DeepSeek 主号',
  kind: 'openai-compatible' as const,
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: 'sk-ds-abcdef123456',
  model: 'deepseek-chat',
};

describe('密钥池生效与优先级', () => {
  it('无 profile 时回退 env', () => {
    expect(getEffectiveLLMConfig().source).toBe('env');
  });

  it('新增但未设为生效 → 仍回退 env', () => {
    addKeyProfile(validKey);
    expect(getEffectiveLLMConfig().source).toBe('env');
  });

  it('设为生效 → source=profile 且各字段来自密钥', () => {
    const k = addKeyProfile(validKey);
    setActiveKey(k.id);
    const eff = getEffectiveLLMConfig();
    expect(eff.source).toBe('profile');
    expect(eff.model).toBe('deepseek-chat');
    expect(eff.apiKey).toBe('sk-ds-abcdef123456');
  });

  it('profile 生效优先于 runtime 单覆盖', () => {
    setRuntimeLLMConfig({ kind: 'anthropic', baseURL: 'https://api.anthropic.com', apiKey: 'sk-ant-1', model: 'claude' });
    const k = addKeyProfile(validKey);
    setActiveKey(k.id);
    expect(getEffectiveLLMConfig().source).toBe('profile');
  });

  it('列表掩码、activeId 与 active 标记正确', () => {
    const k = addKeyProfile(validKey);
    setActiveKey(k.id);
    const view = listKeyProfiles();
    expect(view.activeId).toBe(k.id);
    expect(view.profiles[0].maskedApiKey).toBe(maskApiKey(validKey.apiKey));
    expect(view.profiles[0]).not.toHaveProperty('apiKey');
    expect(view.profiles[0].active).toBe(true);
  });
});

describe('密钥池增删改', () => {
  it('删除生效密钥后自动取消生效，回退 env', () => {
    const k = addKeyProfile(validKey);
    setActiveKey(k.id);
    expect(removeKeyProfile(k.id)).toBe(true);
    expect(listKeyProfiles().activeId).toBeNull();
    expect(getEffectiveLLMConfig().source).toBe('env');
  });

  it('更新时 apiKey 留空沿用现有密钥', () => {
    const k = addKeyProfile(validKey);
    const updated = updateKeyProfile(k.id, { name: '改名', apiKey: '' });
    expect(updated.name).toBe('改名');
    expect(updated.maskedApiKey).toBe(maskApiKey(validKey.apiKey));
  });

  it('生效密钥带 embedModel 且协议支持 → 启用向量检索', () => {
    const k = addKeyProfile({ ...validKey, embedModel: 'bge-m3' });
    setActiveKey(k.id);
    expect(getEffectiveEmbedConfig()?.model).toBe('bge-m3');
  });

  it('向后兼容：仅含 override 的旧文件（无 profiles 字段）正常读取', () => {
    fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify({ override: { kind: 'anthropic', baseURL: 'https://api.anthropic.com', apiKey: 'sk-ant-x', model: 'claude' } }),
      'utf-8',
    );
    (globalThis as unknown as { __a10LLMRuntime?: unknown }).__a10LLMRuntime = undefined;
    const eff = getEffectiveLLMConfig();
    expect(eff.source).toBe('runtime');
    expect(listKeyProfiles().profiles).toEqual([]);
  });
});

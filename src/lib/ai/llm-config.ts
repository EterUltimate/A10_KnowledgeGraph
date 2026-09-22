/**
 * 多提供商 LLM 运行时配置（教师端可自助接入自定义模型）。
 *
 * 支持四种协议格式（对应赛题"接入大模型"的扩展，便于评委用任意 Key 演示）：
 * - openai-compatible：通用 OpenAI 兼容接口（DeepSeek/Qwen/Moonshot 等，默认）
 * - openai-chat     ：OpenAI Chat Completions（POST {baseURL}/chat/completions）
 * - openai-responses：OpenAI Responses（POST {baseURL}/responses）
 * - anthropic       ：Anthropic Messages（POST {baseURL}/v1/messages）
 * - gemini          ：Google Gemini（{baseURL}/models/{model}:generateContent）
 *
 * 配置来源优先级：运行时覆盖（教师在设置页保存，持久化到 data/llm-config.json）
 * > 环境变量 .env（LLM_*）。密钥仅存服务端，前端一律掩码回显。
 */
import path from 'path';
import { config } from '@/lib/config';
import { readJsonFile, writeJsonFile } from '@/lib/db/json-file';

export type LLMProviderKind =
  | 'openai-compatible'
  | 'openai-chat'
  | 'openai-responses'
  | 'anthropic'
  | 'gemini';

export const PROVIDER_KINDS: { value: LLMProviderKind; label: string; hint: string }[] = [
  { value: 'openai-compatible', label: 'OpenAI 兼容（DeepSeek/Qwen 等）', hint: 'POST /chat/completions，最通用' },
  { value: 'openai-chat', label: 'OpenAI Chat', hint: 'POST /chat/completions（官方 api.openai.com）' },
  { value: 'openai-responses', label: 'OpenAI Responses', hint: 'POST /responses（新格式）' },
  { value: 'anthropic', label: 'Anthropic（Claude）', hint: 'POST /v1/messages' },
  { value: 'gemini', label: 'Google Gemini', hint: ':generateContent' },
];

export interface LLMConfig {
  kind: LLMProviderKind;
  baseURL: string;
  apiKey: string;
  model: string;
}

interface RuntimeConfigFile {
  override: LLMConfig | null;
}

const globalForLLM = globalThis as unknown as { __a10LLMRuntime?: RuntimeConfigFile };

function configFile(): string {
  return path.join(config.store.dataDir, 'llm-config.json');
}

function loadRuntime(): RuntimeConfigFile {
  if (!globalForLLM.__a10LLMRuntime) {
    const raw = readJsonFile<RuntimeConfigFile>(configFile(), { override: null });
    // 容错：kind 非法时丢弃覆盖，回退 env
    const kinds = new Set<LLMProviderKind>(PROVIDER_KINDS.map((k) => k.value));
    globalForLLM.__a10LLMRuntime =
      raw.override && kinds.has(raw.override.kind) ? raw : { override: null };
  }
  return globalForLLM.__a10LLMRuntime;
}

/** 环境变量默认配置（openai-compatible） */
function envDefault(): LLMConfig {
  return {
    kind: 'openai-compatible',
    baseURL: config.llm.baseURL,
    apiKey: config.llm.apiKey,
    model: config.llm.model,
  };
}

/** 生效配置：优先运行时覆盖，其次 .env */
export function getEffectiveLLMConfig(): LLMConfig & { source: 'runtime' | 'env' } {
  const runtime = loadRuntime().override;
  if (runtime && runtime.apiKey.trim()) {
    return { ...runtime, source: 'runtime' };
  }
  return { ...envDefault(), source: 'env' };
}

/** 是否有运行时覆盖（用于设置页显示"已自定义"标记） */
export function hasRuntimeOverride(): boolean {
  return Boolean(loadRuntime().override?.apiKey.trim());
}

/** 保存运行时覆盖（密钥不再返回，见 maskApiKey） */
export function setRuntimeLLMConfig(cfg: LLMConfig): void {
  const store = loadRuntime();
  store.override = { ...cfg };
  writeJsonFile(configFile(), store);
}

/** 清除运行时覆盖，回退 .env */
export function clearRuntimeLLMConfig(): void {
  const store = loadRuntime();
  store.override = null;
  writeJsonFile(configFile(), store);
}

/** 密钥掩码：只留前 4 位，其余打码，避免泄露到前端 */
export function maskApiKey(key: string): string {
  const k = key.trim();
  if (!k) return '';
  if (k.length <= 4) return '****';
  return `${k.slice(0, 4)}${'*'.repeat(Math.min(8, k.length - 4))}`;
}

/** 对外返回的安全视图（不含明文 key） */
export function publicLLMConfigView() {
  const eff = getEffectiveLLMConfig();
  return {
    kind: eff.kind,
    baseURL: eff.baseURL,
    model: eff.model,
    source: eff.source,
    configured: isLLMConfigured(),
    maskedApiKey: maskApiKey(eff.apiKey),
  };
}

/** LLM 是否可用（生效配置含非占位密钥） */
export function isLLMConfigured(): boolean {
  const key = getEffectiveLLMConfig().apiKey.trim();
  return Boolean(key) && key !== 'your_api_key_here';
}

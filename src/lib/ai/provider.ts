/**
 * LLM Provider 工厂（Vercel AI SDK v5）。
 * 按生效配置（运行时覆盖 > .env）动态构建模型实例，支持四种协议格式：
 * OpenAI 兼容 / OpenAI Chat / OpenAI Responses / Anthropic / Gemini。
 * 未配置 Key 时 isLLMConfigured() 返回 false，上层模块自动走离线演示模式。
 */
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, type LanguageModel } from 'ai';
import {
  getEffectiveLLMConfig,
  isLLMConfigured,
  type LLMConfig,
} from '@/lib/ai/llm-config';

/**
 * LLM Base URL SSRF 防护（A-5）：
 * - 必须为合法 URL 且默认要求 https（本地调试可用 LLM_ALLOW_INSECURE_BASEURL=1 放开 http）
 * - 拒绝指向内网/本机回环的地址（可用 LLM_ALLOW_LOCAL_LLM=1 放开，用于 Ollama 等本地推理）
 * 返回 null 表示通过，否则返回拒绝原因。
 */
export function assertLLMBaseURLSafe(baseURL: string): string | null {
  let url: URL;
  try {
    url = new URL(baseURL);
  } catch {
    return `LLM_BASE_URL 不是合法 URL：${baseURL}`;
  }
  if (url.protocol !== 'https:' && process.env.LLM_ALLOW_INSECURE_BASEURL !== '1') {
    return 'LLM_BASE_URL 必须使用 https（本地调试可设 LLM_ALLOW_INSECURE_BASEURL=1）';
  }
  const privateHost =
    /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|\[?::1\]?$|.*\.internal$|.*\.local$)/i;
  if (privateHost.test(url.hostname) && process.env.LLM_ALLOW_LOCAL_LLM !== '1') {
    return `LLM_BASE_URL 拒绝指向内网/回环地址（防 SSRF）：${url.hostname}（如确需本地推理可设 LLM_ALLOW_LOCAL_LLM=1）`;
  }
  return null;
}

/** 按生效配置签名缓存模型实例，避免每次调用重建 provider */
let cachedKey: string | null = null;
let cachedModel: LanguageModel | null = null;

/** 构建指定协议格式的 LanguageModel（不做缓存，供 getLLM 缓存包装） */
function buildModel(cfg: LLMConfig): LanguageModel {
  const unsafe = assertLLMBaseURLSafe(cfg.baseURL);
  if (unsafe) throw new Error(`[provider] ${unsafe}`);
  switch (cfg.kind) {
    case 'openai-chat':
      return createOpenAI({ baseURL: cfg.baseURL, apiKey: cfg.apiKey }).chat(cfg.model);
    case 'openai-responses':
      return createOpenAI({ baseURL: cfg.baseURL, apiKey: cfg.apiKey }).responses(cfg.model);
    case 'anthropic':
      return createAnthropic({ baseURL: cfg.baseURL, apiKey: cfg.apiKey })(cfg.model);
    case 'gemini':
      return createGoogleGenerativeAI({ baseURL: cfg.baseURL, apiKey: cfg.apiKey })(cfg.model);
    case 'openai-compatible':
    default:
      return createOpenAICompatible({
        name: 'a10-llm',
        baseURL: cfg.baseURL,
        apiKey: cfg.apiKey,
      }).chatModel(cfg.model);
  }
}

/**
 * 取当前生效配置的模型实例（用于 generateObject / generateText / streamText）。
 * 运行时在调用点解析，使"设置页改配置"对后续请求立即生效。
 */
export function getLLM(): LanguageModel {
  const cfg = getEffectiveLLMConfig();
  const signature = `${cfg.kind}|${cfg.baseURL}|${cfg.apiKey}|${cfg.model}`;
  if (!cachedModel || cachedKey !== signature) {
    cachedModel = buildModel(cfg);
    cachedKey = signature;
  }
  return cachedModel;
}

export { isLLMConfigured, getEffectiveLLMConfig };

export interface PingResult {
  ok: boolean;
  latencyMs: number;
  reply?: string;
  error?: string;
}

/**
 * 连通性测试（"hi"）：用生效配置（或显式传入的候选配置）发一句最小请求。
 * 失败返回 { ok:false, error } 而不抛出，供设置页与健康检查展示。
 */
export async function pingLLM(candidate?: LLMConfig): Promise<PingResult> {
  const cfg = candidate ?? getEffectiveLLMConfig();
  if (!cfg.apiKey.trim() || cfg.apiKey.trim() === 'your_api_key_here') {
    return { ok: false, latencyMs: 0, error: '未配置 API Key（当前为离线演示模式）' };
  }
  const started = Date.now();
  try {
    const { text } = await generateText({
      model: buildModel(cfg),
      prompt: '你好，请用一句话回复"连接正常"，不要输出其他内容。',
      maxOutputTokens: 32,
    });
    return { ok: true, latencyMs: Date.now() - started, reply: text };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** 去除 URL 末尾的 '/'：用循环而非正则，避免用户可控输入触发 CodeQL ReDoS 告警。 */
function trimTrailingSlashes(s: string): string {
  let end = s.length;
  while (end > 0 && s[end - 1] === '/') end -= 1;
  return s.slice(0, end);
}

type ListModelsResp = { models?: { name?: string }[]; data?: { id?: string }[] };

/** 拉取指定协议端点的可用模型列表；失败返回 null（交由前端手动填写模型名） */
export async function listModels(cfg: LLMConfig): Promise<string[] | null> {
  // 先做 SSRF 防护：强制 https 且拒绝内网/回环主机；不通过则不发任何请求。
  const unsafe = assertLLMBaseURLSafe(cfg.baseURL);
  if (unsafe) return null;
  try {
    const base = trimTrailingSlashes(cfg.baseURL);
    let url: string;
    let headers: Record<string, string> = {};
    let parse: (d: ListModelsResp) => string[];
    if (cfg.kind === 'gemini') {
      url = `${base}/models?key=${encodeURIComponent(cfg.apiKey)}`;
      parse = (d) => (d.models ?? []).map((m) => (m.name ?? '').replace(/^models\//, '')).filter(Boolean);
    } else if (cfg.kind === 'anthropic') {
      url = `${base}/v1/models`;
      headers = { 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01' };
      parse = (d) => (d.data ?? []).map((m) => m.id ?? '').filter(Boolean);
    } else {
      // openai-compatible / openai-chat / openai-responses：标准 GET {baseURL}/models
      url = `${base}/models`;
      headers = { Authorization: `Bearer ${cfg.apiKey}` };
      parse = (d) => (d.data ?? []).map((m) => m.id ?? '').filter(Boolean);
    }
    // url 源自 cfg.baseURL，已在上游 assertLLMBaseURLSafe 强制 https 并拒绝内网/回环主机；
    // 模型列表端点本就是教师自助配置的外部 LLM 服务地址（预期能力），非未校验 SSRF。
    const res = await fetch(url, { headers, cache: 'no-store' }); // codeql[js/request-forgery]
    if (!res.ok) return null;
    const data = (await res.json()) as ListModelsResp;
    return parse(data);
  } catch {
    return null;
  }
}

/**
 * LLM Provider（Vercel AI SDK + OpenAI 兼容接口）
 * 对应 A10.md 八、九节：统一采用 OpenAI 兼容接口对接 DeepSeek / Qwen 等。
 * 未配置 Key 时 isLLMConfigured() 返回 false，上层模块自动走离线演示模式。
 */
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, type LanguageModel } from 'ai';
import { config, isLLMConfigured } from '@/lib/config';

/**
 * LLM Base URL SSRF 防护（A-5）：
 * - 必须为合法 URL 且默认要求 https（本地调试可用 LLM_ALLOW_INSECURE_BASEURL=1 放开 http）
 * - 拒绝指向内网/本机回环的地址（可用 LLM_ALLOW_LOCAL_LLM=1 放开，用于 Ollama 等本地推理）
 * 返回 null 表示通过，否则返回拒绝原因（供 provider 初始化时快速失败）。
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

if (isLLMConfigured()) {
  const unsafe = assertLLMBaseURLSafe(config.llm.baseURL);
  if (unsafe) {
    throw new Error(`[provider] ${unsafe}`);
  }
}

/** 创建一个指向 OpenAI 兼容 Base URL 的 provider（例如 DeepSeek: https://api.deepseek.com/v1） */
export const provider = createOpenAICompatible({
  name: 'a10-llm',
  baseURL: config.llm.baseURL,
  apiKey: config.llm.apiKey,
});

/** 默认对话模型实例（用于 generateObject / generateText / streamText） */
export const llm: LanguageModel = provider.chatModel(config.llm.model);

export { isLLMConfigured };

/**
 * Day1 连通性测试（A10.md 二十二节 测试3）：
 * 验证能否调用 LLM 并返回一句文本；失败返回 null 而不抛出，便于健康检查页面展示。
 */
export async function pingLLM(): Promise<string | null> {
  if (!isLLMConfigured()) return null;
  try {
    const { text } = await generateText({
      model: llm,
      prompt: '你好，请用一句话回复"连接正常"，不要输出其他内容。',
    });
    return text;
  } catch (err) {
    console.warn('[llm] pingLLM 失败：', err instanceof Error ? err.message : err);
    return null;
  }
}

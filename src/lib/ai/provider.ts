/**
 * LLM Provider（Vercel AI SDK + OpenAI 兼容接口）
 * 对应 A10.md 八、九节：统一采用 OpenAI 兼容接口对接 DeepSeek / Qwen 等。
 * 未配置 Key 时 isLLMConfigured() 返回 false，上层模块自动走离线演示模式。
 */
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, type LanguageModel } from 'ai';
import { config, isLLMConfigured } from '@/lib/config';

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

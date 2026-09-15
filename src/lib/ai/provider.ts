/**
 * LLM Provider（Vercel AI SDK + OpenAI 兼容接口）
 * 对应 A10.md 八、九节：统一采用 OpenAI 兼容接口对接 DeepSeek / Qwen 等。
 */
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { config } from '@/lib/config';

/**
 * 创建一个指向 OpenAI 兼容 Base URL 的 provider。
 * 例如 DeepSeek: https://api.deepseek.com/v1
 */
export const provider = createOpenAICompatible({
  name: 'a10-llm',
  baseURL: config.llm.baseURL,
  apiKey: config.llm.apiKey,
});

/** 默认对话模型实例（用于 generateObject / generateText / streamText） */
export const llm = provider.chatModel(config.llm.model);

/**
 * Day1 连通性测试（A10.md 二十二节 测试3）：
 * 验证能否调用 LLM 并返回一句文本。
 * TODO(tier2)：使用 generateText({ model: llm, prompt }) 实现真实调用。
 */
export async function pingLLM(): Promise<string | null> {
  // TODO(tier2): 取消注释并实现
  // const { text } = await generateText({
  //   model: llm,
  //   prompt: '你好，请回复一句确认连接的文本。',
  // });
  // return text;
  console.warn('[llm] pingLLM 尚未实现（tier1 桩），返回 null');
  return null;
}

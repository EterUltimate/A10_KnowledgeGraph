/**
 * POST /api/qa — 课程智能问答（A10.md 十五、十六节）
 * 与前端 ai-sdk（v5）useChat 对接：接收 { messages }，用 streamText 返回 UI 数据流响应。
 * RAG：先检索教材文本块作为上下文，要求 LLM 只依据教材回答。
 * tier1：结构完整、检索为占位；tier2 落地检索质量与引用返回。
 */
import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { llm } from '@/lib/ai/provider';
import { buildQASystemPrompt } from '@/lib/ai/prompts';
import { retrieve } from '@/services/rag.service';

/** 从 UIMessage 的 parts 中提取纯文本内容（AI SDK v5） */
function extractText(message?: UIMessage): string {
  if (!message) return '';
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

export async function POST(request: Request) {
  const { messages, courseId } = (await request.json()) as {
    messages: UIMessage[];
    courseId?: string;
  };

  // 取最后一个用户问题用于检索
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  const question = extractText(lastUserMessage);

  // RAG 检索教材上下文（TODO(tier2)：提升检索准确度并回传引用章节）
  const chunks = await retrieve(question, courseId);
  const context = chunks.map((c) => c.content).join('\n\n');

  const result = streamText({
    model: llm,
    system: buildQASystemPrompt(context || '（暂无检索到的教材内容）'),
    messages: await convertToModelMessages(messages),
    temperature: 0.3,
  });

  return result.toUIMessageStreamResponse();
}

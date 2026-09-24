/**
 * POST /api/qa — 课程智能问答（A10.md 十五、十六节）
 * 与前端 useChat（AI SDK v5）对接：接收 { messages, courseId }，返回 UI 消息流。
 * 流程：取最后一条用户问题 → RAG 检索教材文本块 → 先写入"引用"数据部件 → LLM 流式生成。
 * 有 LLM：streamText 流式回答；无 LLM（离线模式）：直接流式输出教材抽取式答案。
 */
import {
  streamText,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from 'ai';
import { getLLM, isLLMConfigured } from '@/lib/ai/provider';
import { buildQASystemPrompt } from '@/lib/ai/prompts';
import { answer, buildContext, buildReferences, retrieve } from '@/services/rag.service';
import { getCourse } from '@/services/course.service';
import type { A10UIMessage } from '@/types';

/** 从 UIMessage 的 parts 中提取纯文本内容（AI SDK v5） */
function extractText(message?: UIMessage): string {
  if (!message) return '';
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

export async function POST(request: Request) {
  let payload: { messages?: UIMessage[]; courseId?: string };
  try {
    payload = (await request.json()) as { messages?: UIMessage[]; courseId?: string };
  } catch {
    return Response.json({ success: false, error: '请求体不是合法 JSON' }, { status: 400 });
  }
  const { messages = [], courseId } = payload;

  // 取最后一个用户问题用于检索
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  const question = extractText(lastUserMessage);
  const course = courseId ? await getCourse(courseId) : null;

  // RAG 检索教材上下文，构造引用
  const chunks = await retrieve(question, courseId);
  const references = buildReferences(chunks);

  const stream = createUIMessageStream<A10UIMessage>({
    execute: async ({ writer }) => {
      // 引用先于回答写入，前端可在回答过程中/结束后展示"参考章节"
      if (references.length > 0) {
        writer.write({ type: 'data-references', id: 'references', data: references });
      }

      if (isLLMConfigured()) {
        const result = streamText({
          model: getLLM(),
          system: buildQASystemPrompt(
            buildContext(chunks) || '（暂无检索到的教材内容）',
            course?.name ?? '数据结构',
          ),
          messages: await convertToModelMessages(messages),
          temperature: 0.3,
        });
        writer.merge(result.toUIMessageStream({ sendStart: false }));
      } else {
        // 离线模式：抽取式答案模拟流式输出，UI 行为与在线模式一致
        const { answer: offlineAnswer } = await answer(question, courseId, course?.name);
        const textId = 'offline-answer';
        writer.write({ type: 'text-start', id: textId });
        for (const piece of offlineAnswer.match(/[\s\S]{1,24}/g) ?? []) {
          writer.write({ type: 'text-delta', id: textId, delta: piece });
        }
        writer.write({ type: 'text-end', id: textId });
      }
    },
    onError: (err) => {
      console.warn('[qa] 流式回答出错：', err instanceof Error ? err.message : err);
      return '问答服务暂时不可用，请稍后重试。';
    },
  });

  return createUIMessageStreamResponse({ stream });
}

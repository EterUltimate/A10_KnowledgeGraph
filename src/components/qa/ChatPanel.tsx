/**
 * 智能问答对话面板（A10.md 十五节）
 * 基于 Vercel AI SDK v5 useChat 连接 /api/qa 流式接口；
 * tier2：支持课程上下文（courseId 随请求发送），展示"参考章节"引用块。
 *
 * 注意：v5 的 useChat 不会响应 transport 实例变化（chat 实例仅在首次渲染创建），
 * 因此课程切换时通过 body 函数 + ref 动态读取最新 courseId，而不是重建 transport。
 */
'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { A10UIMessage } from '@/types';

interface ChatPanelProps {
  /** 课程上下文：随每次请求发送给后端，用于限定检索范围 */
  courseId: string;
}

export function ChatPanel({ courseId }: ChatPanelProps) {
  // ref 始终指向最新 courseId；body 以函数形式在每次请求时读取
  const courseIdRef = useRef(courseId);
  useEffect(() => {
    courseIdRef.current = courseId;
  }, [courseId]);

  // transport 只创建一次（useChat 不支持运行时更换），courseId 通过 body 函数动态注入
  const [transport] = useState(
    () =>
      new DefaultChatTransport<A10UIMessage>({
        api: '/api/qa',
        body: () => ({ courseId: courseIdRef.current }),
      }),
  );

  const { messages, sendMessage, status, error } = useChat<A10UIMessage>({ transport });
  const [input, setInput] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    sendMessage({ text });
    setInput('');
  }

  return (
    <div className="card flex h-[560px] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite">
        {messages.length === 0 && (
          <p className="text-sm text-gray-500">
            输入问题开始问答，例如「栈和队列有什么区别？」（AI 仅依据教材内容回答，并标注参考章节）。
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id}>
            {m.parts.map((part, i) => {
              if (part.type === 'text') {
                return (
                  <div
                    key={i}
                    className={`whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                      m.role === 'user'
                        ? 'ml-auto bg-brand-50 text-brand-700'
                        : 'bg-surface-muted text-gray-800 dark:text-gray-200'
                    }`}
                    style={{ maxWidth: '80%', width: 'fit-content' }}
                  >
                    {part.text}
                  </div>
                );
              }
              if (part.type === 'data-references' && m.role === 'assistant' && part.data.length > 0) {
                const chapters = [...new Set(part.data.map((r) => r.chapter ?? '未分类'))];
                return (
                  <div
                    key={i}
                    className="rounded-lg border border-surface-border bg-surface-muted/60 px-3 py-2 text-xs text-gray-600"
                    style={{ maxWidth: '80%' }}
                  >
                    <p className="font-medium text-gray-700">📚 参考章节：{chapters.join('、')}</p>
                    <details className="mt-1">
                      <summary className="cursor-pointer text-gray-500">查看引用片段</summary>
                      <ul className="mt-1 space-y-1">
                        {part.data.map((ref) => (
                          <li key={ref.chunkId} className="rounded bg-surface px-2 py-1">
                            {ref.chapter ? `【${ref.chapter}】` : ''}
                            {ref.snippet}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </div>
                );
              }
              return null;
            })}
          </div>
        ))}
        {status === 'streaming' && <p className="text-xs text-gray-400">AI 正在回答…</p>}
        {status === 'submitted' && <p className="text-xs text-gray-400">正在检索教材…</p>}
        {error && <p className="text-xs text-red-600">出错了：{error.message}</p>}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入你的问题…"
          aria-label="问题输入框"
        />
        <button type="submit" className="btn-primary" disabled={status === 'streaming' || status === 'submitted'}>
          发送
        </button>
      </form>
    </div>
  );
}

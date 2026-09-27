/**
 * 智能问答对话面板（A10.md 十五节）
 * 基于 Vercel AI SDK v7 useChat 连接 /api/qa 流式接口；
 * tier2：支持课程上下文（courseId 随请求发送），展示"参考章节"引用块。
 * 视觉：用户消息 blue 渐变气泡，AI 回答 surface 气泡，参考章节引用块 amber 强调。
 *
 * 注意：v7 的 useChat 在每次发送时读取最新 transport（latestRef 委托），
 * 因此按 courseId 用 useMemo 重建 transport 即可随课程切换生效，消息状态保留。
 */
'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { A10UIMessage } from '@/types';

interface ChatPanelProps {
  /** 课程上下文：随每次请求发送给后端，用于限定检索范围 */
  courseId: string;
}

export function ChatPanel({ courseId }: ChatPanelProps) {
  // transport 随课程切换重建（useChat 发送时读取最新 transport，消息状态不丢失）
  const transport = useMemo(
    () =>
      new DefaultChatTransport<A10UIMessage>({
        api: '/api/qa',
        body: { courseId },
      }),
    [courseId],
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
    <div className="card flex h-[560px] flex-col !p-5">
      <div className="flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-acc-green-soft text-acc-green">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 4V6z" />
              </svg>
            </span>
            <p className="max-w-sm text-sm leading-relaxed text-fg-muted">
              输入问题开始问答，例如「栈和队列有什么区别？」
              <br />
              （AI 仅依据教材内容回答，并标注参考章节）
            </p>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className="flex flex-col gap-1.5"
            style={{ alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}
          >
            {m.parts.map((part, i) => {
              if (part.type === 'text') {
                return (
                  <div
                    key={i}
                    className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'rounded-br-md bg-acc-blue text-white'
                        : 'rounded-bl-md border border-line bg-surface-muted text-fg'
                    }`}
                    style={
                      m.role === 'user'
                        ? {
                            boxShadow:
                              '0 2px 8px color-mix(in srgb, var(--acc-blue) 25%, transparent)',
                          }
                        : undefined
                    }
                  >
                    {part.text}
                  </div>
                );
              }
              if (
                part.type === 'data-references' &&
                m.role === 'assistant' &&
                part.data.length > 0
              ) {
                const chapters = [...new Set(part.data.map((r) => r.chapter ?? '未分类'))];
                return (
                  <div
                    key={i}
                    className="max-w-[80%] rounded-xl border border-line bg-surface-muted/70 px-3 py-2 text-xs text-fg-muted"
                  >
                    <p className="flex items-center gap-1.5 font-medium text-fg">
                      <span aria-hidden="true" className="text-acc-amber">
                        📚
                      </span>
                      参考章节：{chapters.join('、')}
                    </p>
                    <details className="mt-1 group/ref">
                      <summary className="cursor-pointer select-none text-fg-subtle transition-colors hover:text-fg-muted">
                        查看引用片段
                      </summary>
                      <ul className="mt-1.5 space-y-1">
                        {part.data.map((ref) => (
                          <li
                            key={ref.chunkId}
                            className="rounded-md border border-line bg-surface px-2 py-1.5 leading-relaxed"
                          >
                            {ref.chapter ? (
                              <span className="font-mono text-acc-amber">【{ref.chapter}】</span>
                            ) : (
                              ''
                            )}
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
        {status === 'streaming' && (
          <p className="flex items-center gap-2 text-xs text-fg-subtle">
            <span aria-hidden="true" className="badge-dot text-acc-blue" />
            AI 正在回答…
          </p>
        )}
        {status === 'submitted' && (
          <p className="flex items-center gap-2 text-xs text-fg-subtle">
            <span aria-hidden="true" className="badge-dot text-acc-amber" />
            正在检索教材…
          </p>
        )}
        {error && (
          <p className="flex items-center gap-2 text-xs text-acc-red">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-acc-red" />
            出错了：{error.message}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2 border-t border-line pt-4">
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入你的问题…"
          aria-label="问题输入框"
        />
        <button
          type="submit"
          className="btn btn-primary shrink-0"
          disabled={status === 'streaming' || status === 'submitted'}
        >
          发送
        </button>
      </form>
    </div>
  );
}

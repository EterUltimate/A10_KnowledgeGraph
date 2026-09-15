/**
 * 智能问答对话面板（A10.md 十五节）
 * 基于 Vercel AI SDK v5 的 useChat（@ai-sdk/react），连接后端 /api/qa 流式接口。
 * tier1：完整对话 UI 与流式接线；tier2 补充"参考教材章节"引用展示。
 */
'use client';

import { useState, type FormEvent } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';

/** 从消息 parts 中提取文本（AI SDK v5） */
function messageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

export function ChatPanel() {
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/qa' }),
  });
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
            输入问题开始问答，例如「栈和队列有什么区别？」（AI 仅依据教材内容回答）。
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-lg px-3 py-2 text-sm ${
              m.role === 'user' ? 'ml-auto bg-brand-50 text-brand-700' : 'bg-surface-muted text-gray-800'
            }`}
            style={{ maxWidth: '80%', width: 'fit-content' }}
          >
            {messageText(m)}
          </div>
        ))}
        {status === 'streaming' && <p className="text-xs text-gray-400">AI 正在回答…</p>}
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
        <button type="submit" className="btn-primary" disabled={status === 'streaming'}>
          发送
        </button>
      </form>
    </div>
  );
}

/**
 * 学生端 - 智能问答页（A10.md 十五节）
 */
import { ChatPanel } from '@/components/qa/ChatPanel';

export const metadata = { title: '课程智能问答 · A10' };

export default function StudentQAPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">课程智能问答</h1>
        <p className="mt-1 text-sm text-gray-600">
          基于教材内容的 RAG 问答，AI 只依据检索到的教材片段作答并标注参考章节。
        </p>
      </div>
      <ChatPanel />
    </div>
  );
}

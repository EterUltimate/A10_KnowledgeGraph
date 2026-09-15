/**
 * 知识点详情卡（A10.md 十三节：点击节点显示名称、定义、章节、难度、教材来源）
 */
import type { KnowledgePoint } from '@/types';

interface KnowledgeDetailProps {
  knowledge: KnowledgePoint | null;
}

export function KnowledgeDetail({ knowledge }: KnowledgeDetailProps) {
  if (!knowledge) {
    return (
      <div className="card text-sm text-gray-500">点击图谱中的节点查看详情。</div>
    );
  }
  return (
    <div className="card space-y-2">
      <h3 className="text-lg font-semibold">{knowledge.name}</h3>
      <dl className="space-y-1 text-sm">
        <div>
          <dt className="inline font-medium text-gray-500">定义：</dt>
          <dd className="inline">{knowledge.definition}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-gray-500">章节：</dt>
          <dd className="inline">{knowledge.chapter}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-gray-500">难度：</dt>
          <dd className="inline">{knowledge.difficulty} / 5</dd>
        </div>
        {knowledge.source && (
          <div>
            <dt className="inline font-medium text-gray-500">教材来源：</dt>
            <dd className="inline">{knowledge.source}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

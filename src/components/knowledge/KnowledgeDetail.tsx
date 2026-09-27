/**
 * 知识点详情卡（A10.md 十三节：点击节点显示名称、定义、章节、难度、教材来源）
 * 视觉：进入时弹簧浮入，难度用 amber 圆点刻度呈现（1-5）。
 */
import type { KnowledgePoint } from '@/types';

interface KnowledgeDetailProps {
  knowledge: KnowledgePoint | null;
}

export function KnowledgeDetail({ knowledge }: KnowledgeDetailProps) {
  if (!knowledge) {
    return (
      <div className="card border-dashed text-sm text-fg-muted">点击图谱中的节点查看详情。</div>
    );
  }
  return (
    <div
      className="card space-y-2.5"
      style={{ animation: 'fade-up 280ms var(--ease-spring-soft)' }}
    >
      <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <span aria-hidden="true" className="h-4 w-[3px] rounded-full bg-acc-cyan" />
        {knowledge.name}
      </h3>
      <dl className="space-y-1.5 text-sm">
        <div>
          <dt className="inline font-medium text-fg-subtle">定义：</dt>
          <dd className="inline leading-relaxed">{knowledge.definition}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-fg-subtle">章节：</dt>
          <dd className="inline font-mono text-xs">{knowledge.chapter}</dd>
        </div>
        <div className="flex items-center">
          <dt className="mr-1.5 inline font-medium text-fg-subtle">难度：</dt>
          <dd className="inline-flex items-center gap-2">
            <span className="flex gap-0.5" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className={`h-1.5 w-3 rounded-full ${n <= knowledge.difficulty ? 'bg-acc-amber' : 'bg-line'}`}
                />
              ))}
            </span>
            <span className="font-mono text-xs">{knowledge.difficulty} / 5</span>
          </dd>
        </div>
        {knowledge.source && (
          <div>
            <dt className="inline font-medium text-fg-subtle">教材来源：</dt>
            <dd className="inline font-mono text-xs">{knowledge.source}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

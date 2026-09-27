/**
 * 学习路径列表（A10.md 十四节）
 * 展示推荐知识点 + 推荐理由 + "标记已掌握"快捷按钮。
 * 视觉：竖向连接线串联步骤序号（amber 序号 + 1px 脉络线），卡片悬浮抬升。
 */
'use client';

import type { PathRecommendation } from '@/types';

interface PathListProps {
  data: PathRecommendation;
  onMarkMastered?: (knowledgeName: string) => void;
}

export function PathList({ data, onMarkMastered }: PathListProps) {
  if (data.recommendations.length === 0) {
    return (
      <div className="card text-sm text-fg-muted">
        暂无推荐。请先在下方勾选已掌握的知识点（例如「数据结构」「线性表」），系统会据此推荐下一步学习内容。
      </div>
    );
  }
  return (
    <ol className="relative space-y-3">
      {/* 步骤脉络线：串联各推荐节点 */}
      <span aria-hidden="true" className="absolute bottom-5 left-[26px] top-5 w-px bg-line" />
      {data.recommendations.map(({ knowledge, reason }, index) => (
        <li
          key={knowledge.id}
          className="card relative flex items-center justify-between gap-4 !p-5 transition-all duration-300 [transition-timing-function:var(--ease-spring)] hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md"
        >
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface font-mono text-xs font-semibold text-acc-amber shadow-sm">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="font-medium">
                {knowledge.name}
                <span className="ml-2 font-mono text-xs font-normal text-fg-subtle">
                  {knowledge.chapter} · 难度 {knowledge.difficulty}/5
                </span>
              </p>
              <p className="mt-1 flex items-start gap-1.5 text-sm text-fg-muted">
                <span
                  aria-hidden="true"
                  className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-acc-green"
                />
                {reason}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-fg-subtle">{knowledge.definition}</p>
            </div>
          </div>
          <button
            className="btn btn-ghost shrink-0"
            onClick={() => onMarkMastered?.(knowledge.name)}
          >
            标记已掌握
          </button>
        </li>
      ))}
    </ol>
  );
}

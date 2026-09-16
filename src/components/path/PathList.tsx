/**
 * 学习路径列表（A10.md 十四节）
 * 展示推荐知识点 + 推荐理由 + "标记已掌握"快捷按钮。
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
      <div className="card text-sm text-gray-500">
        暂无推荐。请先在下方勾选已掌握的知识点（例如「数据结构」「线性表」），系统会据此推荐下一步学习内容。
      </div>
    );
  }
  return (
    <ol className="space-y-3">
      {data.recommendations.map(({ knowledge, reason }, index) => (
        <li key={knowledge.id} className="card flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-sm text-brand-700">
                {index + 1}
              </span>
              {knowledge.name}
              <span className="ml-2 text-xs text-gray-400">{knowledge.chapter} · 难度 {knowledge.difficulty}/5</span>
            </p>
            <p className="mt-1 text-sm text-gray-500">{reason}</p>
            <p className="mt-1 text-xs text-gray-600">{knowledge.definition}</p>
          </div>
          <button className="btn-ghost shrink-0" onClick={() => onMarkMastered?.(knowledge.name)}>
            标记已掌握
          </button>
        </li>
      ))}
    </ol>
  );
}

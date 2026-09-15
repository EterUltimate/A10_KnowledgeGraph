/**
 * 学习路径列表（A10.md 十四节）
 * tier1：展示推荐知识点 + "标记已掌握"按钮。
 * 说明：tier1 掌握状态暂存于父组件本地；tier2 增加 POST /api/mastery 持久化端点。
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
        暂无推荐。请先标记已掌握的知识点（例如「线性表」），系统会据此推荐下一步学习内容。
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {data.recommendations.map(({ knowledge, reason }) => (
        <li key={knowledge.id} className="card flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">{knowledge.name}</p>
            <p className="text-sm text-gray-500">{reason}</p>
            <p className="text-xs text-gray-400">
              章节：{knowledge.chapter} · 难度：{knowledge.difficulty}/5
            </p>
          </div>
          <button className="btn-ghost" onClick={() => onMarkMastered?.(knowledge.name)}>
            标记已掌握
          </button>
        </li>
      ))}
    </ul>
  );
}

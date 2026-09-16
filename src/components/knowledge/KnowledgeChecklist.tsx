/**
 * 知识点掌握清单（tier2 新增）
 * 按章节分组展示全部知识点，勾选/取消即调用 onToggle；
 * 数据来自 GET /api/knowledge?courseId=，掌握状态由父组件持有并持久化到 /api/mastery。
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import type { KnowledgePoint } from '@/types';

interface KnowledgeChecklistProps {
  courseId: string;
  mastered: string[];
  onToggle: (name: string, checked: boolean) => void;
}

export function KnowledgeChecklist({ courseId, mastered, onToggle }: KnowledgeChecklistProps) {
  const [points, setPoints] = useState<KnowledgePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/knowledge?courseId=${encodeURIComponent(courseId)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setPoints(json.data as KnowledgePoint[]);
      })
      .finally(() => setLoading(false));
  }, [courseId]);

  // 按章节分组（保持接口返回的章节顺序）
  const grouped = useMemo(() => {
    const map = new Map<string, KnowledgePoint[]>();
    for (const p of points) {
      const list = map.get(p.chapter) ?? [];
      list.push(p);
      map.set(p.chapter, list);
    }
    return [...map.entries()];
  }, [points]);

  if (loading) return <p className="text-sm text-gray-500">加载知识点列表…</p>;
  if (points.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        该课程还没有知识点。请先在「上传资料」页上传教材生成知识图谱。
      </p>
    );
  }

  const masteredCount = points.filter((p) => mastered.includes(p.name)).length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        已掌握 <span className="font-semibold text-brand-700">{masteredCount}</span> / {points.length} 个知识点
        <span className="ml-2 text-xs text-gray-400">勾选即保存，学习路径会实时更新</span>
      </p>
      {grouped.map(([chapter, list]) => (
        <div key={chapter}>
          <p className="mb-1 text-xs font-semibold text-gray-500">{chapter}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {list.map((p) => {
              const checked = mastered.includes(p.name);
              return (
                <label
                  key={p.id}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm transition-colors ${
                    checked
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-surface-border bg-surface text-gray-700 hover:bg-surface-muted'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="accent-brand-600"
                    checked={checked}
                    aria-label={`标记 ${p.name} 已掌握`}
                    onChange={(e) => onToggle(p.name, e.target.checked)}
                  />
                  {p.name}
                  <span className="text-xs text-gray-400">难度{p.difficulty}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

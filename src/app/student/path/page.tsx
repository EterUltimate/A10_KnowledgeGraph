/**
 * 学生端 - 学习路径页（A10.md 十四节）
 * tier1：本地维护"已掌握"集合用于演示交互；推荐结果来自 /api/path/{studentId}。
 * TODO(tier2)：新增 POST /api/mastery 端点持久化掌握状态，替换本地 state。
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { PathList } from '@/components/path/PathList';
import type { PathRecommendation } from '@/types';

const STUDENT_ID = 'demo-student';
const COURSE_ID = 'data-structures';

export default function StudentPathPage() {
  const [mastered, setMastered] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [path, setPath] = useState<PathRecommendation>({ studentId: STUDENT_ID, recommendations: [] });

  const loadPath = useCallback(() => {
    fetch(`/api/path/${STUDENT_ID}?courseId=${COURSE_ID}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setPath(json.data as PathRecommendation);
      });
  }, []);

  useEffect(() => {
    loadPath();
  }, [loadPath]);

  function addMastered() {
    const name = input.trim();
    if (!name || mastered.includes(name)) return;
    setMastered((prev) => [...prev, name]);
    setInput('');
    // TODO(tier2): POST /api/mastery 持久化后再 loadPath()
    loadPath();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">学习路径推荐</h1>
        <p className="mt-1 text-sm text-gray-600">
          标记已掌握的知识点（例如「线性表」），系统基于前置关系推荐下一步学习内容。
        </p>
      </div>

      <div className="card space-y-3">
        <div className="flex gap-2">
          <input
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入已掌握的知识点名称，如：线性表"
            aria-label="已掌握知识点输入"
          />
          <button className="btn-primary" onClick={addMastered}>
            标记已掌握
          </button>
        </div>
        {mastered.length > 0 && (
          <p className="text-sm text-gray-600">
            已掌握：<span className="text-brand-700">{mastered.join('、')}</span>
          </p>
        )}
      </div>

      <PathList
        data={path}
        onMarkMastered={(name) => {
          setMastered((prev) => (prev.includes(name) ? prev : [...prev, name]));
          loadPath();
        }}
      />
    </div>
  );
}

/**
 * 课程选择器（tier2 新增）：拉取课程列表，支持多课程切换（赛题要求 ≥2 门独立课程）。
 */
'use client';

import { useEffect, useState } from 'react';
import type { Course } from '@/types';

interface CourseSelectProps {
  value: string;
  onChange: (courseId: string) => void;
  ariaLabel?: string;
}

export function CourseSelect({ value, onChange, ariaLabel = '选择课程' }: CourseSelectProps) {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    fetch('/api/course/list')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setCourses(json.data as Course[]);
      })
      .catch(() => setCourses([]));
  }, []);

  return (
    <select
      className="input max-w-xs"
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
    >
      {courses.length === 0 && <option value={value}>{value}（暂无课程数据）</option>}
      {courses.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}（{c.knowledgeCount ?? 0} 个知识点）
        </option>
      ))}
    </select>
  );
}

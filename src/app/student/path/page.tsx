/**
 * 学生端 - 学习路径页（A10.md 十四节）
 * tier2：勾选掌握状态持久化（POST /api/mastery），推荐结果实时刷新，
 * 按解锁价值/难度/章节排序展示。
 */
'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { KnowledgeChecklist } from '@/components/knowledge/KnowledgeChecklist';
import { PathList } from '@/components/path/PathList';
import { CourseSelect } from '@/components/course/CourseSelect';
import type { MasteryState, PathRecommendation } from '@/types';

const STUDENT_ID = 'demo-student';
const DEFAULT_COURSE = 'data-structures';

export default function StudentPathPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-500">加载中…</p>}>
      <StudentPathContent />
    </Suspense>
  );
}

function StudentPathContent() {
  const searchParams = useSearchParams();
  const [courseId, setCourseId] = useState(DEFAULT_COURSE);
  const [mastered, setMastered] = useState<string[]>([]);
  const [path, setPath] = useState<PathRecommendation>({
    studentId: STUDENT_ID,
    recommendations: [],
  });

  // 支持 ?courseId= 直达指定课程（与图谱页/上传完成页跳转联动）
  useEffect(() => {
    const param = searchParams.get('courseId');
    if (param) setCourseId(param);
  }, [searchParams]);

  const loadPath = useCallback((cid: string) => {
    fetch(`/api/path/${STUDENT_ID}?courseId=${encodeURIComponent(cid)}&limit=5`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setPath(json.data as PathRecommendation);
      });
  }, []);

  useEffect(() => {
    fetch(`/api/mastery?studentId=${STUDENT_ID}&courseId=${encodeURIComponent(courseId)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setMastered((json.data as MasteryState).mastered);
      });
    loadPath(courseId);
  }, [courseId, loadPath]);

  // 勾选/取消掌握：持久化并刷新推荐
  const toggleMastered = useCallback(
    async (name: string, checked: boolean) => {
      const res = await fetch('/api/mastery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: STUDENT_ID,
          courseId,
          action: checked ? 'add' : 'remove',
          knowledgeName: name,
        }),
      });
      const json = await res.json();
      if (json.success) setMastered((json.data as MasteryState).mastered);
      loadPath(courseId);
    },
    [courseId, loadPath],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">学习路径推荐</h1>
          <p className="mt-1 text-sm text-gray-600">
            勾选已掌握的知识点，系统基于「前置关系」图遍历，按解锁价值 / 难度 / 章节顺序推荐下一步学习内容。
          </p>
        </div>
        <CourseSelect value={courseId} onChange={setCourseId} />
      </div>

      <PathList data={path} onMarkMastered={(name) => void toggleMastered(name, true)} />

      <div className="card">
        <h2 className="mb-3 font-semibold">已掌握知识点管理</h2>
        <KnowledgeChecklist courseId={courseId} mastered={mastered} onToggle={(name, checked) => void toggleMastered(name, checked)} />
      </div>
    </div>
  );
}

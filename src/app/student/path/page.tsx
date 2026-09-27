/**
 * 学生端 - 学习路径页（A10.md 十四节）
 * tier2：勾选掌握状态持久化（POST /api/mastery），推荐结果实时刷新，
 * 按解锁价值/难度/章节排序展示。
 */
'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { KnowledgeChecklist } from '@/components/knowledge/KnowledgeChecklist';
import { PathList } from '@/components/path/PathList';
import { CourseSelect } from '@/components/course/CourseSelect';
import { PageHeader } from '@/components/ui/PageHeader';
import type { MasteryState, PathRecommendation } from '@/types';

const STUDENT_ID = 'demo-student';
const DEFAULT_COURSE = 'data-structures';

export default function StudentPathPage() {
  return (
    <Suspense fallback={<p className="text-sm text-fg-muted">加载中…</p>}>
      <StudentPathContent />
    </Suspense>
  );
}

function StudentPathContent() {
  const searchParams = useSearchParams();
  // 直接从 URL 初始化课程（支持 ?courseId= 直达指定课程），避免 effect 中同步 setState
  const [courseId, setCourseId] = useState(() => searchParams.get('courseId') ?? DEFAULT_COURSE);
  const [mastered, setMastered] = useState<string[]>([]);
  const [path, setPath] = useState<PathRecommendation>({
    studentId: STUDENT_ID,
    recommendations: [],
  });
  // mastery 写入序号：初始 GET 若迟于用户勾选（POST）完成，丢弃过期响应避免覆盖用户操作；
  // courseIdRef 用于丢弃课程切换后仍在途的旧 toggle 响应（防止旧课程掌握状态串显到新课程）
  const masteryVersion = useRef(0);
  const courseIdRef = useRef(courseId);

  useEffect(() => {
    courseIdRef.current = courseId;
  }, [courseId]);

  const loadPath = useCallback((cid: string) => {
    fetch(`/api/path/${STUDENT_ID}?courseId=${encodeURIComponent(cid)}&limit=5`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && courseIdRef.current === cid) setPath(json.data as PathRecommendation);
      });
  }, []);

  useEffect(() => {
    const versionAtStart = masteryVersion.current;
    fetch(`/api/mastery?studentId=${STUDENT_ID}&courseId=${encodeURIComponent(courseId)}`)
      .then((r) => r.json())
      .then((json) => {
        if (versionAtStart !== masteryVersion.current) return;
        if (json.success) setMastered((json.data as MasteryState).mastered);
      });
    loadPath(courseId);
  }, [courseId, loadPath]);

  // 勾选/取消掌握：持久化并刷新推荐
  const toggleMastered = useCallback(
    async (name: string, checked: boolean) => {
      const cid = courseId;
      const res = await fetch('/api/mastery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: STUDENT_ID,
          courseId: cid,
          action: checked ? 'add' : 'remove',
          knowledgeName: name,
        }),
      });
      const json = await res.json();
      if (!json.success || courseIdRef.current !== cid) return;
      masteryVersion.current += 1;
      setMastered((json.data as MasteryState).mastered);
      loadPath(cid);
    },
    [courseId, loadPath],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Student · Path"
        title="学习路径推荐"
        description="勾选已掌握的知识点，系统基于「前置关系」图遍历，按解锁价值 / 难度 / 章节顺序推荐下一步学习内容。"
        accent="amber"
        actions={<CourseSelect value={courseId} onChange={setCourseId} />}
      />

      <PathList data={path} onMarkMastered={(name) => void toggleMastered(name, true)} />

      <div className="card !p-6">
        <h2 className="mb-3 flex items-center gap-2 font-semibold tracking-tight">
          <span aria-hidden="true" className="h-3.5 w-[3px] rounded-full bg-acc-green" />
          已掌握知识点管理
        </h2>
        <KnowledgeChecklist
          courseId={courseId}
          mastered={mastered}
          onToggle={(name, checked) => void toggleMastered(name, checked)}
        />
      </div>
    </div>
  );
}

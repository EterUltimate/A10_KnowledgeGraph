/**
 * 学生端 - 智能问答页（A10.md 十五节）
 * tier2：多课程上下文切换，问答基于所选课程的知识图谱与教材检索。
 */
'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatPanel } from '@/components/qa/ChatPanel';
import { CourseSelect } from '@/components/course/CourseSelect';
import { PageHeader } from '@/components/ui/PageHeader';

export default function StudentQAPage() {
  return (
    <Suspense fallback={<p className="text-sm text-fg-muted">加载中…</p>}>
      <StudentQAContent />
    </Suspense>
  );
}

function StudentQAContent() {
  const searchParams = useSearchParams();
  // 直接从 URL 初始化课程（支持 ?courseId= 直达指定课程），避免 effect 中同步 setState
  const [courseId, setCourseId] = useState(() => searchParams.get('courseId') ?? 'data-structures');

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Student · QA"
        title="课程智能问答"
        description="基于教材内容的 RAG 问答，AI 只依据检索到的教材片段作答并标注参考章节。"
        accent="green"
        actions={<CourseSelect value={courseId} onChange={setCourseId} />}
      />
      <ChatPanel courseId={courseId} />
    </div>
  );
}

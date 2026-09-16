/**
 * 学生端 - 智能问答页（A10.md 十五节）
 * tier2：多课程上下文切换，问答基于所选课程的知识图谱与教材检索。
 */
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatPanel } from '@/components/qa/ChatPanel';
import { CourseSelect } from '@/components/course/CourseSelect';

export default function StudentQAPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-500">加载中…</p>}>
      <StudentQAContent />
    </Suspense>
  );
}

function StudentQAContent() {
  const searchParams = useSearchParams();
  const [courseId, setCourseId] = useState('data-structures');

  // 支持 ?courseId= 直达指定课程
  useEffect(() => {
    const param = searchParams.get('courseId');
    if (param) setCourseId(param);
  }, [searchParams]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">课程智能问答</h1>
          <p className="mt-1 text-sm text-gray-600">
            基于教材内容的 RAG 问答，AI 只依据检索到的教材片段作答并标注参考章节。
          </p>
        </div>
        <CourseSelect value={courseId} onChange={setCourseId} />
      </div>
      <ChatPanel courseId={courseId} />
    </div>
  );
}

/**
 * 学生端 - 知识图谱浏览页（A10.md 十三节 + 学生进度标记）
 * tier2：多课程切换、图谱交互浏览、节点详情、"标记已掌握"按钮、掌握清单。
 */
'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { GraphView } from '@/components/graph/GraphView';
import { KnowledgeDetail } from '@/components/knowledge/KnowledgeDetail';
import { KnowledgeChecklist } from '@/components/knowledge/KnowledgeChecklist';
import { CourseSelect } from '@/components/course/CourseSelect';
import type { GraphData, KnowledgePoint, MasteryState } from '@/types';

const STUDENT_ID = 'demo-student';
const DEFAULT_COURSE = 'data-structures';

export default function StudentGraphPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-500">加载中…</p>}>
      <StudentGraphContent />
    </Suspense>
  );
}

function StudentGraphContent() {
  const searchParams = useSearchParams();
  const [courseId, setCourseId] = useState(DEFAULT_COURSE);
  const [graph, setGraph] = useState<GraphData>({ nodes: [], edges: [] });
  const [detail, setDetail] = useState<KnowledgePoint | null>(null);
  const [mastered, setMastered] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const param = searchParams.get('courseId');
    if (param) setCourseId(param);
  }, [searchParams]);

  // 切换课程：拉取图谱 + 掌握状态
  useEffect(() => {
    setLoading(true);
    setDetail(null);
    fetch(`/api/graph/${encodeURIComponent(courseId)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setGraph(json.data as GraphData);
      })
      .finally(() => setLoading(false));
    fetch(`/api/mastery?studentId=${STUDENT_ID}&courseId=${encodeURIComponent(courseId)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setMastered((json.data as MasteryState).mastered);
      });
  }, [courseId]);

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      fetch(`/api/knowledge/${encodeURIComponent(nodeId)}?courseId=${encodeURIComponent(courseId)}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success) setDetail(json.data as KnowledgePoint);
        });
    },
    [courseId],
  );

  // 标记/取消掌握（持久化到 /api/mastery）
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
    },
    [courseId],
  );

  const detailMastered = detail ? mastered.includes(detail.name) : false;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">知识图谱浏览</h1>
          <p className="mt-1 text-sm text-gray-600">
            节点为知识点，边为前置/包含/相关关系。支持缩放、拖拽，点击节点查看详情并标记掌握。
          </p>
        </div>
        <CourseSelect value={courseId} onChange={setCourseId} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          {loading ? (
            <p className="text-sm text-gray-500">加载图谱中…</p>
          ) : graph.nodes.length === 0 ? (
            <p className="text-sm text-gray-500">该课程暂无图谱，请教师先上传课程资料。</p>
          ) : (
            <GraphView data={graph} onNodeClick={handleNodeClick} />
          )}
        </div>

        <div className="space-y-4">
          <KnowledgeDetail knowledge={detail} />
          {detail && (
            <button
              className={detailMastered ? 'btn-ghost' : 'btn-primary'}
              onClick={() => toggleMastered(detail.name, !detailMastered)}
            >
              {detailMastered ? `✓ 已掌握「${detail.name}」（点击取消）` : `标记「${detail.name}」为已掌握`}
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">知识点掌握清单</h2>
        <KnowledgeChecklist
          courseId={courseId}
          mastered={mastered}
          onToggle={(name, checked) => void toggleMastered(name, checked)}
        />
      </div>
    </div>
  );
}

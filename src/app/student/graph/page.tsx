/**
 * 学生端 - 知识图谱浏览页（A10.md 十三节 + 学生进度标记）
 * tier2：多课程切换、图谱交互浏览、节点详情、"标记已掌握"按钮、掌握清单。
 */
'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { GraphView } from '@/components/graph/GraphView';
import { KnowledgeDetail } from '@/components/knowledge/KnowledgeDetail';
import { KnowledgeChecklist } from '@/components/knowledge/KnowledgeChecklist';
import { CourseSelect } from '@/components/course/CourseSelect';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { PageHeader } from '@/components/ui/PageHeader';
import type { GraphData, KnowledgePoint, MasteryState } from '@/types';

const STUDENT_ID = 'demo-student';
const DEFAULT_COURSE = 'data-structures';

export default function StudentGraphPage() {
  return (
    <Suspense fallback={<p className="text-sm text-fg-muted">加载中…</p>}>
      <StudentGraphContent />
    </Suspense>
  );
}

function StudentGraphContent() {
  const searchParams = useSearchParams();
  // 直接从 URL 初始化课程（支持 ?courseId= 直达指定课程），避免 effect 中同步 setState
  const [courseId, setCourseId] = useState(() => searchParams.get('courseId') ?? DEFAULT_COURSE);
  // 数据按课程维度缓存，loading 由"已加载课程 !== 当前课程"派生（避免 effect 同步 setState）
  const [loaded, setLoaded] = useState<{
    courseId: string;
    graph: GraphData;
    mastered: string[];
  }>({ courseId: '', graph: { nodes: [], edges: [] }, mastered: [] });
  const [detail, setDetail] = useState<{ courseId: string; point: KnowledgePoint } | null>(null);
  // mastery 写入序号：初始 GET 若迟于用户勾选（POST）完成，丢弃过期响应避免覆盖用户操作
  const masteryVersion = useRef(0);

  const loading = loaded.courseId !== courseId;
  const graph = loading ? { nodes: [], edges: [] } : loaded.graph;
  const mastered = loading ? [] : loaded.mastered;

  // 切换课程：拉取图谱 + 掌握状态
  useEffect(() => {
    let cancelled = false;
    const versionAtStart = masteryVersion.current;
    Promise.all([
      fetch(`/api/graph/${encodeURIComponent(courseId)}`).then((r) => r.json()),
      fetch(`/api/mastery?studentId=${STUDENT_ID}&courseId=${encodeURIComponent(courseId)}`).then(
        (r) => r.json(),
      ),
    ]).then(([graphRes, masteryRes]) => {
      if (cancelled || versionAtStart !== masteryVersion.current) return;
      setLoaded({
        courseId,
        graph: graphRes.success ? (graphRes.data as GraphData) : { nodes: [], edges: [] },
        mastered: masteryRes.success ? (masteryRes.data as MasteryState).mastered : [],
      });
    });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      fetch(`/api/knowledge/${encodeURIComponent(nodeId)}?courseId=${encodeURIComponent(courseId)}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success) setDetail({ courseId, point: json.data as KnowledgePoint });
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
      if (json.success) {
        masteryVersion.current += 1;
        setLoaded((d) =>
          d.courseId === courseId ? { ...d, mastered: (json.data as MasteryState).mastered } : d,
        );
      }
    },
    [courseId],
  );

  const activeDetail = detail && detail.courseId === courseId ? detail.point : null;
  const detailMastered = activeDetail ? mastered.includes(activeDetail.name) : false;

  return (
    <div className="space-y-5">
      <Breadcrumb
        items={[
          { href: '/', label: '首页' },
          { href: '/student/graph', label: '知识图谱' },
        ]}
      />
      <PageHeader
        eyebrow="Student · Graph"
        title="知识图谱浏览"
        description="节点为知识点，边为前置/包含/相关关系。支持缩放、拖拽，点击节点查看详情并标记掌握。"
        accent="cyan"
        actions={<CourseSelect value={courseId} onChange={setCourseId} />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card !p-5 lg:col-span-2">
          {loading ? (
            <p className="text-sm text-fg-muted">加载图谱中…</p>
          ) : graph.nodes.length === 0 ? (
            <p className="text-sm text-fg-muted">该课程暂无图谱，请教师先上传课程资料。</p>
          ) : (
            <GraphView data={graph} onNodeClick={handleNodeClick} />
          )}
        </div>

        <div className="space-y-4">
          <KnowledgeDetail knowledge={activeDetail} />
          {activeDetail && (
            <button
              className={`btn w-full ${detailMastered ? 'btn-ghost' : 'btn-primary'}`}
              onClick={() => toggleMastered(activeDetail.name, !detailMastered)}
            >
              {detailMastered
                ? `✓ 已掌握「${activeDetail.name}」（点击取消）`
                : `标记「${activeDetail.name}」为已掌握`}
            </button>
          )}
        </div>
      </div>

      <div className="card !p-6">
        <h2 className="mb-3 flex items-center gap-2 font-semibold tracking-tight">
          <span aria-hidden="true" className="h-3.5 w-[3px] rounded-full bg-acc-green" />
          知识点掌握清单
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

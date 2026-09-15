/**
 * 学生端 - 知识图谱浏览页（A10.md 十三节）
 * tier1：拉取 /api/graph/{courseId} 渲染 ECharts，点击节点拉取详情。
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { GraphView } from '@/components/graph/GraphView';
import { KnowledgeDetail } from '@/components/knowledge/KnowledgeDetail';
import type { GraphData, KnowledgePoint } from '@/types';

const COURSE_ID = 'data-structures';

export default function StudentGraphPage() {
  const [graph, setGraph] = useState<GraphData>({ nodes: [], edges: [] });
  const [detail, setDetail] = useState<KnowledgePoint | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/graph/${COURSE_ID}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setGraph(json.data as GraphData);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleNodeClick = useCallback((nodeId: string) => {
    fetch(`/api/knowledge/${nodeId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setDetail(json.data as KnowledgePoint);
      });
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">知识图谱浏览</h1>
        <p className="mt-1 text-sm text-gray-600">
          课程《数据结构》· 节点为知识点，边为前置/包含/相关关系。点击节点查看详情。
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          {loading ? <p className="text-sm text-gray-500">加载图谱中…</p> : <GraphView data={graph} onNodeClick={handleNodeClick} />}
        </div>
        <KnowledgeDetail knowledge={detail} />
      </div>
    </div>
  );
}

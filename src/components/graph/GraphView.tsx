/**
 * 知识图谱可视化（A10.md 十三节：ECharts Graph）
 * tier1：接收 GraphData 渲染 ECharts 关系图，点击节点回调（详情由父组件处理）。
 * 备选：AntV G6（tier2 视效果需要替换）。
 */
'use client';

import ReactECharts from 'echarts-for-react';
import type { GraphData } from '@/types';

interface GraphViewProps {
  data: GraphData;
  onNodeClick?: (nodeId: string) => void;
}

export function GraphView({ data, onNodeClick }: GraphViewProps) {
  const option = {
    tooltip: {},
    series: [
      {
        type: 'graph',
        layout: 'force',
        roam: true,
        label: { show: true, position: 'right' },
        force: { repulsion: 200, edgeLength: 120 },
        data: data.nodes.map((n) => ({ id: n.id, name: n.name, value: n.difficulty })),
        links: data.edges.map((e) => ({ source: e.source, target: e.target, label: { show: true, formatter: e.type } })),
        lineStyle: { color: 'source', curveness: 0.1 },
        emphasis: { focus: 'adjacency' },
      },
    ],
  };

  const onEvents = {
    click: (params: { dataType?: string; data?: { id?: string } }) => {
      if (params.dataType === 'node' && params.data?.id) {
        onNodeClick?.(params.data.id);
      }
    },
  };

  return (
    <ReactECharts
      option={option}
      onEvents={onEvents}
      style={{ height: 480, width: '100%' }}
      notMerge
      aria-label="知识图谱可视化"
    />
  );
}

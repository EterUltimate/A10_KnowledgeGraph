/**
 * 知识图谱可视化（A10.md 十三节：ECharts Graph）
 * 交互：缩放、拖拽、节点点击回调（详情由父组件处理）。
 * 视觉：三类关系「颜色 + 线型」双通道区分（前置=实线/红、包含=虚线/蓝、相关=点线/灰），
 *       兼顾色觉障碍与打印灰度；节点大小映射难度；图例为真实 HTML（修复原 ECharts
 *       文本组件把 HTML 当纯文本渲染导致源码外露的缺陷）。
 */
'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from 'next-themes';
import type { GraphData } from '@/types';

/** 三类关系的展示色（与中文边标签、图例配套） */
const EDGE_COLORS: Record<string, string> = {
  前置: '#e5484d',
  包含: '#4f6ef7',
  相关: '#9ca3af',
};

/** 三类关系的线型（多一种可区分维度，色盲/灰度友好） */
const EDGE_LINE_TYPES: Record<string, 'solid' | 'dashed' | 'dotted'> = {
  前置: 'solid',
  包含: 'dashed',
  相关: 'dotted',
};

const LINE_TYPE_LABEL: Record<string, string> = {
  solid: '——',
  dashed: '－－',
  dotted: '····',
};

interface GraphViewProps {
  data: GraphData;
  onNodeClick?: (nodeId: string) => void;
}

export function GraphView({ data, onNodeClick }: GraphViewProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const labelColor = isDark ? '#cbd2dc' : '#1f2430';
  const edgeLabelColor = isDark ? '#8b93a3' : '#6b7280';

  const option = useMemo(
    () => ({
      tooltip: {
        formatter: (params: { dataType?: string; data?: { name?: string; value?: number } }) => {
          if (params.dataType === 'node') {
            return `${params.data?.name ?? ''}<br/>难度：${params.data?.value ?? '-'}/5`;
          }
          return params.data?.name ?? '';
        },
      },
      series: [
        {
          type: 'graph',
          layout: 'force',
          roam: true,
          label: { show: true, position: 'right' as const, fontSize: 12, color: labelColor },
          force: { repulsion: 260, edgeLength: 130, gravity: 0.08 },
          data: data.nodes.map((n) => ({
            id: n.id,
            name: n.name,
            value: n.difficulty,
            // 难度映射节点大小：1→18px，5→42px
            symbolSize: 14 + (n.difficulty ?? 3) * 6,
            itemStyle:
              (n.difficulty ?? 3) >= 4
                ? { borderColor: '#e5484d', borderWidth: 2 }
                : undefined,
          })),
          links: data.edges.map((e) => ({
            source: e.source,
            target: e.target,
            label: { show: true, formatter: e.type, fontSize: 10, color: edgeLabelColor },
            lineStyle: {
              color: EDGE_COLORS[e.type] ?? '#9ca3af',
              type: EDGE_LINE_TYPES[e.type] ?? 'solid',
              curveness: 0.1,
              width: 1.6,
            },
          })),
          lineStyle: { curveness: 0.1 },
          emphasis: { focus: 'adjacency' as const },
        },
      ],
    }),
    [data, labelColor, edgeLabelColor],
  );

  const onEvents = {
    click: (params: { dataType?: string; data?: { id?: string } }) => {
      if (params.dataType === 'node' && params.data?.id) {
        onNodeClick?.(params.data.id);
      }
    },
  };

  return (
    <div>
      {/* 真实 HTML 图例（替代原 ECharts 文本组件，修复 HTML 源码外露缺陷） */}
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        {(Object.keys(EDGE_COLORS) as Array<keyof typeof EDGE_COLORS>).map((type) => (
          <span key={type} className="inline-flex items-center gap-1">
            <span aria-hidden="true" style={{ color: EDGE_COLORS[type], letterSpacing: '-1px' }}>
              {LINE_TYPE_LABEL[EDGE_LINE_TYPES[type]]}
            </span>
            {type}
          </span>
        ))}
        <span className="text-gray-400 dark:text-gray-500">节点越大难度越高，点击节点查看详情</span>
      </div>
      <ReactECharts
        option={option}
        onEvents={onEvents}
        style={{ height: 480, width: '100%' }}
        notMerge
        aria-label="知识图谱可视化"
      />
    </div>
  );
}

/**
 * 知识图谱可视化（A10.md 十三节：ECharts Graph）
 * 交互：缩放、拖拽、节点点击回调（详情由父组件处理）。
 * 视觉：节点蓝底白字、文字居中入内、尺寸按名称长度+难度自适应；
 *       三类关系「颜色+线型」双通道区分（前置实线红/包含虚线蓝/相关点线灰）；
 *       难度≥4 红色边框强调；图例为真实 HTML。
 */
'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from 'next-themes';
import type { GraphData } from '@/types';

const EDGE_COLORS: Record<string, string> = {
  前置: '#e5484d',
  包含: '#4f6ef7',
  相关: '#9ca3af',
};

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

const NODE_FILL = '#4f6ef7';
const NODE_TEXT_COLOR = '#ffffff';
const NODE_HIGHLIGHT = '#d97706';

interface GraphViewProps {
  data: GraphData;
  onNodeClick?: (nodeId: string) => void;
}

export function GraphView({ data, onNodeClick }: GraphViewProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const edgeLabelColor = isDark ? '#8b93a3' : '#6b7280';

  const option = useMemo(
    () => ({
      tooltip: {
        formatter: (params: { dataType?: string; data?: { name?: string; value?: number } }) => {
          if (params.dataType === 'node') {
            return `<b>${params.data?.name ?? ''}</b><br/>难度：${params.data?.value ?? '-'} / 5`;
          }
          if (params.dataType === 'edge') {
            const s = (params.data as { source?: string })?.source ?? '';
            const t = (params.data as { target?: string })?.target ?? '';
            return `${s} → ${t}`;
          }
          return '';
        },
      },
      series: [
        {
          type: 'graph',
          layout: 'force',
          roam: true,
          force: { repulsion: 400, edgeLength: 150, gravity: 0.06 },
          label: {
            show: true,
            position: 'inside',
            fontSize: 11,
            fontWeight: 500,
            color: NODE_TEXT_COLOR,
            overflow: 'truncate',
            width: 50,
          },
          emphasis: {
            focus: 'adjacency',
            label: { fontSize: 12 },
            itemStyle: { shadowBlur: 12, shadowColor: 'rgba(79,110,247,0.3)' },
          },
          data: data.nodes.map((n) => {
            const nameLen = n.name.length;
            const diff = n.difficulty ?? 3;
            const size = Math.max(44, Math.min(68, nameLen * 11 + diff * 2));
            return {
              id: n.id,
              name: n.name,
              value: diff,
              symbolSize: size,
              itemStyle: {
                color: NODE_FILL,
                ...(diff >= 4 ? { borderColor: '#e5484d', borderWidth: 2.5 } : {}),
              },
            };
          }),
          links: data.edges.map((e) => ({
            source: e.source,
            target: e.target,
            label: { show: false },
            lineStyle: {
              color: EDGE_COLORS[e.type] ?? '#9ca3af',
              type: EDGE_LINE_TYPES[e.type] ?? 'solid',
              curveness: 0.12,
              width: 1.6,
            },
          })),
          lineStyle: { curveness: 0.12 },
        },
      ],
    }),
    [data, edgeLabelColor],
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
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        {(Object.keys(EDGE_COLORS) as Array<keyof typeof EDGE_COLORS>).map((type) => (
          <span key={type} className="inline-flex items-center gap-1">
            <span aria-hidden="true" style={{ color: EDGE_COLORS[type], letterSpacing: '-1px' }}>
              {LINE_TYPE_LABEL[EDGE_LINE_TYPES[type]]}
            </span>
            {type}
          </span>
        ))}
        <span className="text-gray-400 dark:text-gray-500">
          节点越大难度越高 · 滚轮缩放 · 拖拽平移 · 点击节点查看详情
        </span>
      </div>
      <ReactECharts
        option={option}
        onEvents={onEvents}
        style={{ height: 520, width: '100%' }}
        notMerge
        aria-label="知识图谱可视化"
      />
    </div>
  );
}

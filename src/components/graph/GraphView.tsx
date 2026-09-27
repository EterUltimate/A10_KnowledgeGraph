/**
 * 知识图谱可视化（A10.md 十三节：ECharts Graph）
 * 交互：缩放、拖拽、节点点击回调（详情由父组件处理）。
 * 视觉：节点 blue 渐变底白字、文字居中入内、尺寸按名称长度+难度自适应；
 *       三类关系「颜色+线型」双通道区分（前置实线红 2.2px / 包含虚线蓝 / 相关点线灰），
 *       线宽区分语义权重；难度≥4 红色边框强调；图例为真实 HTML，颜色随主题切换。
 */
'use client';

import { useMemo } from 'react';
import { useTheme } from 'next-themes';
import ReactECharts from 'echarts-for-react';
import type { GraphData } from '@/types';

interface GraphViewProps {
  data: GraphData;
  onNodeClick?: (nodeId: string) => void;
}

export function GraphView({ data, onNodeClick }: GraphViewProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const palette = useMemo(() => {
    const css = getComputedStyle(document.documentElement);
    const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    return {
      nodeFill: v('--acc-blue', '#0070f3'),
      nodeFillDark: v('--acc-violet', '#7928ca'),
      edgePrereq: v('--acc-red', '#e5484d'),
      edgeContains: v('--acc-blue', '#0070f3'),
      edgeRelated: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.32)',
      highlight: v('--acc-amber', '#f5a623'),
      tooltipBg: isDark ? '#161616' : '#ffffff',
      tooltipFg: isDark ? '#ededf0' : '#0a0a0a',
      tooltipBorder: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.09)',
    };
  }, [isDark]);

  const option = useMemo(
    () => ({
      tooltip: {
        backgroundColor: palette.tooltipBg,
        borderWidth: 1,
        borderColor: palette.tooltipBorder,
        textStyle: { color: palette.tooltipFg, fontSize: 12 },
        extraCssText: 'border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.14);',
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
            color: '#ffffff',
            overflow: 'truncate',
            width: 50,
          },
          emphasis: {
            focus: 'adjacency',
            label: { fontSize: 12 },
            itemStyle: { shadowBlur: 16, shadowColor: palette.highlight },
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
                color: {
                  type: 'radial',
                  x: 0.35,
                  y: 0.3,
                  r: 0.9,
                  colorStops: [
                    { offset: 0, color: palette.nodeFillDark },
                    { offset: 1, color: palette.nodeFill },
                  ],
                },
                shadowBlur: 6,
                shadowColor: 'rgba(0,0,0,0.18)',
                ...(diff >= 4 ? { borderColor: palette.edgePrereq, borderWidth: 2.5 } : {}),
              },
            };
          }),
          links: data.edges.map((e) => ({
            source: e.source,
            target: e.target,
            label: { show: false },
            lineStyle: {
              color:
                e.type === '前置'
                  ? palette.edgePrereq
                  : e.type === '包含'
                    ? palette.edgeContains
                    : palette.edgeRelated,
              type: e.type === '前置' ? 'solid' : e.type === '包含' ? 'dashed' : 'dotted',
              curveness: 0.12,
              // 线宽区分语义权重：前置关系最重要（2.4px），包含次之，相关最细
              width: e.type === '前置' ? 2.4 : e.type === '包含' ? 1.6 : 1,
            },
          })),
          lineStyle: { curveness: 0.12 },
        },
      ],
    }),
    [data, palette],
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
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted">
        {(['前置', '包含', '相关'] as const).map((type) => (
          <span key={type} className="inline-flex items-center gap-1">
            <span
              aria-hidden="true"
              style={{
                color:
                  type === '前置'
                    ? palette.edgePrereq
                    : type === '包含'
                      ? palette.edgeContains
                      : palette.edgeRelated,
                letterSpacing: '-1px',
              }}
            >
              {type === '前置' ? '——' : type === '包含' ? '－－' : '····'}
            </span>
            {type}
          </span>
        ))}
        <span className="text-fg-subtle">
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

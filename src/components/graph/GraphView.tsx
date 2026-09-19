/**
 * 知识图谱可视化（A10.md 十三节：ECharts Graph）
 * 交互：缩放、拖拽、节点点击回调（详情由父组件处理）。
 * 视觉：三类关系分色（前置/包含/相关），节点大小映射难度，含图例说明。
 */
'use client';

import ReactECharts from 'echarts-for-react';
import type { GraphData } from '@/types';

/**
 * 三类关系的展示色（与中文边标签配套）。
 * 相关灰取 #6b7280（对白底约 4.8:1），满足 WCAG 1.4.11 非文本对比度 ≥3:1；
 * 边仍带中文标签，颜色非唯一区分手段（满足 1.4.1）。
 */
const EDGE_COLORS: Record<string, string> = {
  前置: '#e5484d',
  包含: '#4f6ef7',
  相关: '#6b7280',
};

const LEGEND_HTML =
  '<span style="font-size:12px;color:#4b5563">' +
  '<span style="color:#e5484d">— 前置</span>　' +
  '<span style="color:#4f6ef7">— 包含</span>　' +
  '<span style="color:#6b7280">— 相关</span>　' +
  '节点越大难度越高，点击节点查看详情</span>';

interface GraphViewProps {
  data: GraphData;
  onNodeClick?: (nodeId: string) => void;
}

export function GraphView({ data, onNodeClick }: GraphViewProps) {
  const option = {
    tooltip: {
      formatter: (params: { dataType?: string; data?: { name?: string; value?: number } }) => {
        if (params.dataType === 'node') {
          return `${params.data?.name ?? ''}<br/>难度：${params.data?.value ?? '-'}/5`;
        }
        return params.data?.name ?? '';
      },
    },
    graphic: [
      {
        type: 'text',
        right: 12,
        top: 8,
        style: { text: LEGEND_HTML, fill: '#6b7280' },
      },
    ],
    series: [
      {
        type: 'graph',
        layout: 'force',
        roam: true,
        label: { show: true, position: 'right', fontSize: 12 },
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
          label: { show: true, formatter: e.type, fontSize: 10, color: '#6b7280' },
          lineStyle: { color: EDGE_COLORS[e.type] ?? '#9ca3af', curveness: 0.1, width: 1.5 },
        })),
        lineStyle: { curveness: 0.1 },
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

  const nodeCount = data.nodes.length;
  const edgeCount = data.edges.length;
  const summary = `知识图谱可视化，共 ${nodeCount} 个知识点、${edgeCount} 条关系（前置/包含/相关）。可缩放、拖拽，点击节点查看详情。`;

  return (
    <div>
      <div role="img" aria-label={summary}>
        <ReactECharts
          option={option}
          onEvents={onEvents}
          style={{ height: 480, width: '100%' }}
          notMerge
        />
      </div>
      {/* canvas 无文字替代，为读屏用户提供等价的节点/关系文本（视觉隐藏） */}
      <div className="sr-only">
        <p>
          <strong>知识图谱数据（文字版）</strong>
        </p>
        <p>{summary}</p>
        <p>知识点（{nodeCount}）：</p>
        <ul>
          {data.nodes.map((n) => (
            <li key={n.id}>
              {n.name}
              {n.chapter ? `（章节：${n.chapter}）` : ''}
              {typeof n.difficulty === 'number' ? `，难度 ${n.difficulty}/5` : ''}
            </li>
          ))}
        </ul>
        <p>关系（{edgeCount}）：</p>
        <ul>
          {data.edges.map((e, i) => (
            <li key={`${e.source}-${e.target}-${i}`}>
              {e.source} —{e.type}→ {e.target}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

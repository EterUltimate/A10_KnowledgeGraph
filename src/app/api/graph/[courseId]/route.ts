/**
 * GET /api/graph/{courseId} — 获得知识图谱（A10.md 十三、十六节）
 * 返回 { nodes, edges } 供前端 ECharts 渲染。
 */
import { ok, fail } from '@/lib/http';
import { getGraph } from '@/services/graph.service';

export async function GET(_request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  try {
    const graph = await getGraph(courseId);
    return ok(graph);
  } catch (err) {
    const message = err instanceof Error ? err.message : '存储层异常';
    console.error('[api/graph]', message);
    return fail(`图谱查询失败：${message}`, 500);
  }
}

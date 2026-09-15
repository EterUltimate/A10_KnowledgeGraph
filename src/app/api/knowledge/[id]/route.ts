/**
 * GET /api/knowledge/{id} — 获得知识点详情（A10.md 十三、十六节）
 * 点击节点后展示：名称、定义、所属章节、难度、教材来源。
 */
import { ok, fail } from '@/lib/http';
import { getKnowledgeById } from '@/services/graph.service';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const point = await getKnowledgeById(id);
  if (!point) {
    return fail(`知识点不存在：${id}`, 404);
  }
  return ok(point);
}

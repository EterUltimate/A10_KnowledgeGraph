/**
 * GET /api/knowledge/{id} — 获得知识点详情（A10.md 十三、十六节）
 * PATCH /api/knowledge/{id} — 教师编辑知识点（tier2 新增，手动修正图谱）
 * DELETE /api/knowledge/{id} — 教师删除知识点及其关联关系（tier2 新增）
 */
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail } from '@/lib/http';
import { deleteKnowledge, getKnowledgeById, updateKnowledge } from '@/services/graph.service';

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  definition: z.string().min(1).optional(),
  chapter: z.string().min(1).optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  source: z.string().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const courseId = request.nextUrl.searchParams.get('courseId') ?? undefined;
  try {
    const point = await getKnowledgeById(id, courseId);
    if (!point) {
      return fail(`知识点不存在：${id}`, 404);
    }
    return ok(point);
  } catch (err) {
    const message = err instanceof Error ? err.message : '存储层异常';
    console.error('[api/knowledge/[id] GET]', message);
    return fail(`查询失败：${message}`, 500);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return fail(`参数校验失败：${parsed.error.message}`);
  }
  try {
    const updated = await updateKnowledge(id, parsed.data);
    if (!updated) {
      return fail(`知识点不存在：${id}`, 404);
    }
    return ok(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : '存储层异常';
    console.error('[api/knowledge/[id] PATCH]', message);
    return fail(`更新失败：${message}`, 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const deleted = await deleteKnowledge(id);
    if (!deleted) {
      return fail(`知识点不存在：${id}`, 404);
    }
    return ok({ deleted: true, id });
  } catch (err) {
    const message = err instanceof Error ? err.message : '存储层异常';
    console.error('[api/knowledge/[id] DELETE]', message);
    return fail(`删除失败：${message}`, 500);
  }
}

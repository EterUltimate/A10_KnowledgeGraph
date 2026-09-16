/**
 * POST /api/relation — 教师新增关系（A10.md 十六节）
 * 请求体：{ source, target, type, courseId? }，type 仅允许 PREREQUISITE/CONTAINS/RELATED
 * DELETE /api/relation?source=&target=&type=&courseId= — 教师删除关系（tier2 新增）
 */
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail } from '@/lib/http';
import { RELATION_TYPES } from '@/types';
import { addRelation, deleteRelation, getRelations } from '@/services/graph.service';

const bodySchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  type: z.enum(RELATION_TYPES),
  courseId: z.string().optional(),
});

/** GET /api/relation?courseId= — 课程全部关系列表（教师管理页用，tier2 新增） */
export async function GET(request: NextRequest) {
  const courseId = request.nextUrl.searchParams.get('courseId');
  if (!courseId) {
    return fail('缺少 courseId 参数');
  }
  try {
    const relations = await getRelations(courseId);
    return ok(relations);
  } catch (err) {
    const message = err instanceof Error ? err.message : '存储层异常';
    console.error('[api/relation GET]', message);
    return fail(`关系列表查询失败：${message}`, 500);
  }
}

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return fail(`参数校验失败：${parsed.error.message}`);
  }
  try {
    const created = await addRelation(parsed.data);
    return ok(created, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : '存储层异常';
    console.error('[api/relation POST]', message);
    return fail(`关系创建失败：${message}`, 500);
  }
}

export async function DELETE(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const source = sp.get('source');
  const target = sp.get('target');
  const type = sp.get('type');
  const courseId = sp.get('courseId') ?? undefined;

  const parsed = z
    .object({ source: z.string().min(1), target: z.string().min(1), type: z.enum(RELATION_TYPES) })
    .safeParse({ source, target, type });
  if (!parsed.success) {
    return fail('参数不完整：需要 source、target、type（query 参数）');
  }

  try {
    const deleted = await deleteRelation({ ...parsed.data, courseId });
    if (!deleted) {
      return fail('关系不存在', 404);
    }
    return ok({ deleted: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : '存储层异常';
    console.error('[api/relation DELETE]', message);
    return fail(`关系删除失败：${message}`, 500);
  }
}

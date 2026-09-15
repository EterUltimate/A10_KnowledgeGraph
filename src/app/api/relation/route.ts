/**
 * POST /api/relation — 教师新增关系（A10.md 十六节）
 * 请求体：{ source, target, type }，type 仅允许 PREREQUISITE/CONTAINS/RELATED
 */
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail } from '@/lib/http';
import { RELATION_TYPES } from '@/types';
import { addRelation } from '@/services/graph.service';

const bodySchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  type: z.enum(RELATION_TYPES),
});

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return fail(`参数校验失败：${parsed.error.message}`);
  }
  const created = await addRelation(parsed.data);
  return ok(created, 201);
}

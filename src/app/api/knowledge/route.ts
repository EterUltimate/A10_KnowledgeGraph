/**
 * POST /api/knowledge — 教师新增知识点（A10.md 十六节）
 * 请求体：{ name, definition, chapter, difficulty, courseId?, source? }
 */
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail } from '@/lib/http';
import { addKnowledge } from '@/services/graph.service';

const bodySchema = z.object({
  name: z.string().min(1),
  definition: z.string().min(1),
  chapter: z.string().min(1),
  difficulty: z.number().int().min(1).max(5),
  courseId: z.string().optional(),
  source: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return fail(`参数校验失败：${parsed.error.message}`);
  }
  const created = await addKnowledge(parsed.data);
  return ok(created, 201);
}

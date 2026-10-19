/**
 * 管理员：一键重种内置《数据结构》演示数据到指定课程（默认 data-structures）
 * POST /api/admin/courses/reseed  body?: { courseId?, courseName? }
 */
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail } from '@/lib/http';
import { requireAdmin } from '@/lib/auth-guard';
import { seedDemoCourse } from '@/services/demo-seed.service';

const schema = z
  .object({ courseId: z.string().min(1).optional(), courseName: z.string().min(1).optional() })
  .nullish();

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return fail(`参数校验失败：${parsed.error.message}`);
  try {
    const result = await seedDemoCourse(parsed.data?.courseId, parsed.data?.courseName);
    return ok(result);
  } catch (err) {
    return fail(err instanceof Error ? err.message : '重种演示数据失败', 500);
  }
}

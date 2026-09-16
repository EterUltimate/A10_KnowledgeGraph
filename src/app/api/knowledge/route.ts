/**
 * GET /api/knowledge?courseId= — 课程知识点列表（tier2 新增）
 * 供学生端勾选"已掌握"、教师端管理列表使用。
 * POST /api/knowledge — 教师新增知识点（A10.md 十六节）
 * 请求体：{ name, definition, chapter, difficulty, courseId?, source? }
 */
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail } from '@/lib/http';
import { requireTeacher } from '@/lib/auth-guard';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';
import { addKnowledge, listKnowledge } from '@/services/graph.service';

const bodySchema = z.object({
  name: z.string().min(1),
  definition: z.string().min(1),
  chapter: z.string().min(1),
  difficulty: z.number().int().min(1).max(5),
  courseId: z.string().optional(),
  source: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const courseId = request.nextUrl.searchParams.get('courseId');
  if (!courseId) {
    return fail('缺少 courseId 参数');
  }
  try {
    const points = await listKnowledge(courseId);
    return ok(points);
  } catch (err) {
    const message = err instanceof Error ? err.message : '存储层异常';
    console.error('[api/knowledge GET]', message);
    return fail(`知识点列表查询失败：${message}`, 500);
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireTeacher();
  if (guard) return guard;

  // 限流（A-5）：写操作单 IP 每分钟 30 次
  const limit = checkRateLimit(`knowledge-write:${clientIp(request.headers)}`, {
    windowMs: 60_000,
    max: 30,
  });
  if (!limit.ok) {
    return fail(`请求过于频繁，请 ${limit.retryAfterSec} 秒后重试`, 429, {
      'Retry-After': String(limit.retryAfterSec),
    });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return fail(`参数校验失败：${parsed.error.message}`);
  }
  try {
    const created = await addKnowledge(parsed.data);
    return ok(created, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : '存储层异常';
    console.error('[api/knowledge POST]', message);
    return fail(`知识点创建失败：${message}`, 500);
  }
}

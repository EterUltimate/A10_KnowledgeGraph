/**
 * GET /api/mastery?studentId=&courseId= — 查询学生掌握状态（tier2 新增）
 * POST /api/mastery — 标记/取消/批量设置掌握状态（A10.md 十四、十九节）
 * 请求体：{ studentId, courseId, action: 'add' | 'remove' | 'set', knowledgeName?, mastered? }
 * 掌握状态持久化在 data/store/mastery.json，重启不丢。
 */
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail } from '@/lib/http';
import { getMastery, markMastered, setMastery, unmarkMastered } from '@/services/course.service';

const postSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('add'),
    studentId: z.string().min(1),
    courseId: z.string().min(1),
    knowledgeName: z.string().min(1),
  }),
  z.object({
    action: z.literal('remove'),
    studentId: z.string().min(1),
    courseId: z.string().min(1),
    knowledgeName: z.string().min(1),
  }),
  z.object({
    action: z.literal('set'),
    studentId: z.string().min(1),
    courseId: z.string().min(1),
    mastered: z.array(z.string()),
  }),
]);

export async function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get('studentId');
  const courseId = request.nextUrl.searchParams.get('courseId');
  if (!studentId || !courseId) {
    return fail('需要 studentId 与 courseId 参数');
  }
  const state = await getMastery(studentId, courseId);
  return ok(state);
}

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return fail(`参数校验失败：${parsed.error.message}`);
  }
  const { studentId, courseId } = parsed.data;
  switch (parsed.data.action) {
    case 'add': {
      const state = await markMastered(studentId, courseId, parsed.data.knowledgeName);
      return ok(state);
    }
    case 'remove': {
      const state = await unmarkMastered(studentId, courseId, parsed.data.knowledgeName);
      return ok(state);
    }
    case 'set': {
      const state = await setMastery(studentId, courseId, parsed.data.mastered);
      return ok(state);
    }
  }
}

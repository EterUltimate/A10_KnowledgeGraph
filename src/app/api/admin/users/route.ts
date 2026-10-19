/**
 * 管理员：用户账号管理
 * GET  /api/admin/users — 列出全部账号（安全视图，不含口令）
 * POST /api/admin/users — 新增账号 { username, password, name?, role }
 */
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail } from '@/lib/http';
import { requireAdmin } from '@/lib/auth-guard';
import { createUser, listUsers } from '@/services/user.service';

const createSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(6, '密码至少 6 位'),
  name: z.string().optional(),
  role: z.enum(['admin', 'teacher', 'student']),
});

export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;
  return ok(listUsers());
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return fail(`参数校验失败：${parsed.error.message}`);
  }
  try {
    return ok(createUser(parsed.data), 201);
  } catch (err) {
    return fail(err instanceof Error ? err.message : '创建用户失败', 400);
  }
}

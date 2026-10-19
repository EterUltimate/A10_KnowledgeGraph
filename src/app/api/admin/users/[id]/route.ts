/**
 * 管理员：单个账号维护
 * PATCH  /api/admin/users/{id} — 重置口令 { password }
 * DELETE /api/admin/users/{id} — 删除账号
 */
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail } from '@/lib/http';
import { requireAdmin } from '@/lib/auth-guard';
import { removeUser, setUserPassword } from '@/services/user.service';

const patchSchema = z.object({ password: z.string().min(6, '密码至少 6 位') });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return fail(`参数校验失败：${parsed.error.message}`);
  const updated = setUserPassword(id, parsed.data.password);
  if (!updated) return fail(`用户不存在：${id}`, 404);
  return ok({ id, passwordUpdated: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await params;
  try {
    const removed = removeUser(id);
    if (!removed) return fail(`用户不存在：${id}`, 404);
    return ok({ id, removed: true });
  } catch (err) {
    return fail(err instanceof Error ? err.message : '删除失败', 400);
  }
}

/**
 * 管理员：单套密钥维护
 * PATCH  /api/admin/keys/{id} — 更新（apiKey 留空沿用现有）
 * DELETE /api/admin/keys/{id} — 删除
 */
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail } from '@/lib/http';
import { requireAdmin } from '@/lib/auth-guard';
import { assertLLMBaseURLSafe } from '@/lib/ai/provider';
import { listKeyProfiles, removeKeyProfile, updateKeyProfile } from '@/lib/ai/llm-config';

const kindEnum = z.enum([
  'openai-compatible',
  'openai-chat',
  'openai-responses',
  'anthropic',
  'gemini',
]);

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  kind: kindEnum.optional(),
  baseURL: z.string().min(1).optional(),
  apiKey: z.string().optional(),
  model: z.string().min(1).optional(),
  embedModel: z.string().optional(),
});

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
  if (parsed.data.baseURL) {
    const unsafe = assertLLMBaseURLSafe(parsed.data.baseURL);
    if (unsafe) return fail(unsafe, 400);
  }
  try {
    return ok(updateKeyProfile(id, parsed.data));
  } catch (err) {
    return fail(err instanceof Error ? err.message : '更新密钥失败', 400);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await params;
  const removed = removeKeyProfile(id);
  if (!removed) return fail(`密钥不存在：${id}`, 404);
  return ok(listKeyProfiles());
}

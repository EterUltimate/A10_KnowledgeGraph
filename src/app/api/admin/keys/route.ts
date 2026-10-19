/**
 * 管理员：大模型 API Key 密钥池管理
 * GET   /api/admin/keys — 列出全部密钥（掩码回显）与当前生效 id
 * POST  /api/admin/keys — 新增一套 { name, kind, baseURL, apiKey, model, embedModel? }
 * PATCH /api/admin/keys — 切换当前生效 { activeId: string|null }
 */
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail } from '@/lib/http';
import { requireAdmin } from '@/lib/auth-guard';
import { assertLLMBaseURLSafe } from '@/lib/ai/provider';
import { addKeyProfile, listKeyProfiles, setActiveKey } from '@/lib/ai/llm-config';

const kindEnum = z.enum([
  'openai-compatible',
  'openai-chat',
  'openai-responses',
  'anthropic',
  'gemini',
]);

const createSchema = z.object({
  name: z.string().min(1, '名称不能为空'),
  kind: kindEnum,
  baseURL: z.string().min(1, 'baseURL 不能为空'),
  apiKey: z.string().min(1, 'API Key 不能为空'),
  model: z.string().min(1, '模型名不能为空'),
  embedModel: z.string().optional(),
});

export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;
  return ok(listKeyProfiles());
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return fail(`参数校验失败：${parsed.error.message}`);
  const unsafe = assertLLMBaseURLSafe(parsed.data.baseURL);
  if (unsafe) return fail(unsafe, 400);
  try {
    return ok(addKeyProfile(parsed.data), 201);
  } catch (err) {
    return fail(err instanceof Error ? err.message : '新增密钥失败', 400);
  }
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const json = await request.json().catch(() => null) as { activeId?: string | null } | null;
  const activeId = json?.activeId ?? null;
  try {
    setActiveKey(activeId);
    return ok(listKeyProfiles());
  } catch (err) {
    return fail(err instanceof Error ? err.message : '切换生效密钥失败', 400);
  }
}

/**
 * GET    /api/llm/config — 读取生效 LLM 配置（密钥掩码回显，仅教师）
 * POST   /api/llm/config — 保存运行时覆盖配置（仅教师；apiKey 留空表示沿用现有密钥）
 * DELETE /api/llm/config — 清除运行时覆盖，回退 .env（仅教师）
 */
import { NextResponse, type NextRequest } from 'next/server';
import { requireTeacher } from '@/lib/auth-guard';
import { ok, fail } from '@/lib/http';
import { assertLLMBaseURLSafe } from '@/lib/ai/provider';
import {
  clearRuntimeLLMConfig,
  getEffectiveLLMConfig,
  publicLLMConfigView,
  setRuntimeLLMConfig,
  type LLMConfig,
  type LLMProviderKind,
} from '@/lib/ai/llm-config';

const VALID_KINDS = new Set<LLMProviderKind>([
  'openai-compatible',
  'openai-chat',
  'openai-responses',
  'anthropic',
  'gemini',
]);

export async function GET() {
  const guard = await requireTeacher();
  if (guard) return guard;
  return ok(publicLLMConfigView());
}

export async function POST(request: NextRequest) {
  const guard = await requireTeacher();
  if (guard) return guard;

  let body: Partial<LLMConfig>;
  try {
    body = (await request.json()) as Partial<LLMConfig>;
  } catch {
    return fail('请求体不是合法 JSON', 400);
  }

  const kind = (body.kind ?? 'openai-compatible') as LLMProviderKind;
  if (!VALID_KINDS.has(kind)) {
    return fail(`不支持的协议格式：${String(body.kind)}`, 400);
  }
  const baseURL = String(body.baseURL ?? '').trim();
  const model = String(body.model ?? '').trim();
  if (!baseURL) return fail('baseURL 不能为空', 400);
  if (!model) return fail('模型名不能为空', 400);
  const unsafe = assertLLMBaseURLSafe(baseURL);
  if (unsafe) return fail(unsafe, 400);

  // apiKey 留空 → 沿用当前生效密钥（前端掩码场景下不强制重输）
  const current = getEffectiveLLMConfig();
  const apiKey = String(body.apiKey ?? '').trim() || current.apiKey;
  if (!apiKey || apiKey === 'your_api_key_here') {
    return fail('API Key 不能为空', 400);
  }

  setRuntimeLLMConfig({ kind, baseURL, apiKey, model });
  return ok(publicLLMConfigView());
}

export async function DELETE() {
  const guard = await requireTeacher();
  if (guard) return guard;
  clearRuntimeLLMConfig();
  return ok(publicLLMConfigView());
}

export function PUT() {
  return NextResponse.json({ success: false, error: '请使用 POST' }, { status: 405 });
}

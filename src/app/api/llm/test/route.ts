/**
 * POST /api/llm/test — "hi" 连通性测试（仅教师）。
 * 默认测生效配置；也可传入候选配置先测后存（不写入存储）。
 * 返回 { ok, latencyMs, reply?, error? }，永不抛出。
 */
import type { NextRequest } from 'next/server';
import { requireTeacher } from '@/lib/auth-guard';
import { ok } from '@/lib/http';
import { pingLLM } from '@/lib/ai/provider';
import { getEffectiveLLMConfig, type LLMConfig } from '@/lib/ai/llm-config';

export async function POST(request: NextRequest) {
  const guard = await requireTeacher();
  if (guard) return guard;

  let candidate: LLMConfig | undefined;
  try {
    const body = (await request.json()) as Partial<LLMConfig>;
    if (body && (body.baseURL || body.kind || body.model)) {
      const current = getEffectiveLLMConfig();
      candidate = {
        kind: (body.kind as LLMConfig['kind']) ?? current.kind,
        baseURL: String(body.baseURL ?? current.baseURL).trim(),
        apiKey: String(body.apiKey ?? '').trim() || current.apiKey,
        model: String(body.model ?? current.model).trim(),
      };
    }
  } catch {
    // 空请求体 → 测生效配置
  }

  const result = await pingLLM(candidate);
  return ok(result);
}

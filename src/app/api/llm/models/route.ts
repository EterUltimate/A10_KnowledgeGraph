/**
 * POST /api/llm/models — 拉取指定协议端点的可用模型列表（仅教师）。
 * 用 POST 而非 GET：候选配置（含 Key）放请求体，避免密钥出现在 URL/访问日志。
 * 端点不支持列表时返回 { models: null }，前端回退为手动填写模型名。
 */
import type { NextRequest } from 'next/server';
import { requireTeacher } from '@/lib/auth-guard';
import { ok } from '@/lib/http';
import { listModels } from '@/lib/ai/provider';
import { getEffectiveLLMConfig, type LLMConfig } from '@/lib/ai/llm-config';

export async function POST(request: NextRequest) {
  const guard = await requireTeacher();
  if (guard) return guard;

  let body: Partial<LLMConfig> = {};
  try {
    body = (await request.json()) as Partial<LLMConfig>;
  } catch {
    // 允许空请求体 → 用生效配置
  }
  const current = getEffectiveLLMConfig();
  const cfg: LLMConfig = {
    kind: (body.kind as LLMConfig['kind']) ?? current.kind,
    baseURL: String(body.baseURL ?? current.baseURL).trim(),
    apiKey: String(body.apiKey ?? '').trim() || current.apiKey,
    model: String(body.model ?? current.model).trim(),
  };

  const models = await listModels(cfg);
  if (models === null) {
    return ok({ models: null as string[] | null, note: '端点未返回模型列表，请手动填写模型名' });
  }
  return ok({ models });
}

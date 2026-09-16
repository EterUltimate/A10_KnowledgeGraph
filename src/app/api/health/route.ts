/**
 * GET /api/health — 系统健康检查（A-3，对应 Issue #11「Day1 三连通性测试」）
 * 串联三项自检：
 *   1. 图存储：verifyConnectivity()（Neo4j；auto 模式连不上自动落 JSON，不视为不健康）
 *   2. LLM：pingLLM()（未配置 Key 时 skipped——离线演示模式）
 *   3. 文档解析：parseFile 微型样例（解析失败才返回 503，属硬性故障）
 * 另附 assertConfigReady() 配置概览与运行时长，供部署 healthcheck 与 `npm run check` 使用。
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { assertConfigReady, config } from '@/lib/config';
import { verifyConnectivity } from '@/lib/db/neo4j';
import { isLLMConfigured, pingLLM } from '@/lib/ai/provider';
import { parseFile } from '@/services/document.service';

const PARSER_SAMPLE = Buffer.from('A10 健康检查解析样例：栈是限定仅在表尾进行插入和删除的线性表。', 'utf8');

export async function GET(_request: NextRequest) {
  const startedAt = Date.now();

  const [neo4jOk, llmReply] = await Promise.all([verifyConnectivity(), pingLLM()]);

  let parserOk = false;
  let parserError: string | undefined;
  try {
    const text = await parseFile(PARSER_SAMPLE, 'health-check.txt');
    parserOk = text.includes('健康检查');
  } catch (err) {
    parserError = err instanceof Error ? err.message : String(err);
  }

  const llmConfigured = isLLMConfigured();
  const graphMode =
    config.store.mode === 'json'
      ? 'json（强制）'
      : neo4jOk
        ? 'neo4j'
        : 'json（auto 降级）';

  const body = {
    status: parserOk ? 'ok' : 'unhealthy',
    checks: {
      graph: { neo4j: neo4jOk, mode: graphMode },
      llm: {
        configured: llmConfigured,
        status: !llmConfigured ? 'skipped（离线演示模式）' : llmReply ? 'ok' : 'error',
        reply: llmReply,
      },
      parser: { ok: parserOk, error: parserError },
    },
    config: assertConfigReady(),
    uptimeSeconds: Math.round(process.uptime()),
    latencyMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    status: parserOk ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}

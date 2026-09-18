/**
 * 一键连通性检查（A-3）：调用运行中服务的 /api/health 并汇总三项自检结果。
 * 用法：
 *   npm run check                            （默认检查 http://localhost:3000）
 *   BASE_URL=http://your-host:3000 npm run check
 * 服务未启动时会给出提示并以非零码退出。
 */
const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';

interface HealthBody {
  status?: string;
  checks?: {
    graph?: { neo4j?: boolean; mode?: string };
    llm?: { configured?: boolean; status?: string; reply?: string | null };
    parser?: { ok?: boolean; error?: string | null };
  };
  uptimeSeconds?: number;
  latencyMs?: number;
}

async function main() {
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(15_000) });
  } catch (err) {
    console.error(`✗ 无法连接 ${baseUrl} —— 请先启动服务（npm run dev 或 docker compose up -d）`);
    console.error(`  原因：${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  const body = (await res.json()) as HealthBody;
  const g = body.checks?.graph;
  const l = body.checks?.llm;
  const p = body.checks?.parser;

  console.log(`A10 连通性检查（${baseUrl}/api/health）`);
  console.log(`  1. 图存储  Neo4j: ${g?.neo4j ? '✓ 已连接' : '✗ 未连接'}｜生效模式：${g?.mode ?? '未知'}`);
  console.log(
    `  2. LLM     ${l?.configured ? `✓ ${l.status}${l.reply ? `：${l.reply}` : ''}` : '— 未配置 Key（离线演示模式）'}`,
  );
  console.log(`  3. 文档解析 ${p?.ok ? '✓ 正常' : `✗ 失败：${p?.error ?? '未知'}`}`);
  console.log(`  总状态：${res.status === 200 ? '✓ 健康' : '✗ 异常'}（HTTP ${res.status}，服务已运行 ${body.uptimeSeconds ?? '?'}s）`);

  process.exit(res.status === 200 ? 0 : 1);
}

void main();

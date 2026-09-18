/**
 * B-3 性能脚本 3/3：图谱查询并发（autocannon）
 * 用法：node perf/graph-concurrent.mjs（默认 30s / 20 并发连接）
 * 环境变量：BASE_URL、COURSE_ID、DURATION、CONNECTIONS
 * 判定：p99 延迟 ≤ 2000ms 且 0 非错误响应 → PASS（自定基线，报告留档）
 */
import autocannon from 'autocannon';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const COURSE_ID = process.env.COURSE_ID ?? 'data-structures';
const DURATION = Number(process.env.DURATION ?? 30);
const CONNECTIONS = Number(process.env.CONNECTIONS ?? 20);

const result = await autocannon({
  url: `${BASE_URL}/api/graph/${encodeURIComponent(COURSE_ID)}`,
  duration: DURATION,
  connections: CONNECTIONS,
});

const p99 = result.latency.p99;
const non2xx = (result['2xx'] ?? 0) === 0 ? result.requests.total : 0; // 0 个 2xx 才视为异常
const errors = result.errors + result.timeouts + result.non2xx;
const pass = p99 <= 2000 && errors === 0 && result.requests.total > 0;

console.log(`\n[图谱查询并发] ${DURATION}s / ${CONNECTIONS} 连接`);
console.log(`  总请求 ${result.requests.total}，吞吐 ${Math.round(result.requests.average)} req/s`);
console.log(`  延迟 avg ${result.latency.average}ms / p95 ${result.latency.p95}ms / p99 ${p99}ms`);
console.log(`  错误+超时+非2xx：${errors}`);
console.log(`  指标 p99 ≤ 2000ms 且无错误 → ${pass ? 'PASS' : 'FAIL'}`);
process.exit(pass ? 0 : 1);

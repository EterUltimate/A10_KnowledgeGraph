/**
 * B-3 性能脚本 1/3：上传建图端到端耗时（离线/在线两种模式均可）
 * 用法：node perf/upload-latency.mjs [次数]（默认 3 次串行，每次唯一课程 ID）
 * 环境变量：BASE_URL（默认 http://localhost:3000）、SAMPLE_FILE（默认 assets/数据结构-示例教材.txt）
 * 判定：单次 totalMs ≤ 60_000（赛题指标）→ PASS
 */
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const SAMPLE = process.env.SAMPLE_FILE ?? path.resolve(process.cwd(), 'assets/数据结构-示例教材.txt');
const RUNS = Number(process.argv[2] ?? 3);
const USER = process.env.DEMO_TEACHER_USER ?? 'teacher';
const PASS = process.env.DEMO_TEACHER_PASS ?? 'teach123456';

/** 登录教师账号（A-1 上线后上传需要会话），返回 Cookie 头值 */
async function loginCookie() {
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() ?? [])
    .find((c) => c.includes('authjs.csrf-token'))
    ?.split(';')[0];
  const res = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: csrfCookie ?? '' },
    body: new URLSearchParams({ csrfToken, username: USER, password: PASS }),
    redirect: 'manual',
  });
  const sessionCookie = (res.headers.getSetCookie?.() ?? [])
    .find((c) => c.includes('authjs.session-token'))
    ?.split(';')[0];
  if (!sessionCookie) throw new Error(`登录失败：HTTP ${res.status}`);
  return sessionCookie;
}

async function uploadOnce(i, cookie) {
  const fd = new FormData();
  fd.set('file', new File([fs.readFileSync(SAMPLE)], `perf-${i}.txt`, { type: 'text/plain' }));
  fd.set('courseId', `perf-${Date.now()}-${i}`);
  fd.set('courseName', `性能测试课程 ${i}`);

  const t0 = Date.now();
  const res = await fetch(`${BASE_URL}/api/course/upload`, {
    method: 'POST',
    body: fd,
    headers: { cookie },
  });
  const body = await res.json();
  const wallMs = Date.now() - t0;

  if (!res.ok || !body.success) {
    return { ok: false, wallMs, error: body.error ?? `HTTP ${res.status}` };
  }
  return { ok: true, wallMs, ...body.data.timing, knowledgeCount: body.data.knowledgeCount };
}

const cookie = await loginCookie();
console.log('教师登录成功，开始压测');
const results = [];
for (let i = 1; i <= RUNS; i++) {
  const r = await uploadOnce(i, cookie);
  results.push(r);
  console.log(
    r.ok
      ? `#${i} ✓ 总耗时 ${r.wallMs}ms（解析 ${r.parseMs} + 抽取 ${r.extractMs}），知识点 ${r.knowledgeCount}`
      : `#${i} ✗ ${r.error}`,
  );
}

const okRuns = results.filter((r) => r.ok);
const worst = Math.max(...okRuns.map((r) => r.wallMs), 0);
const pass = okRuns.length > 0 && worst <= 60_000;
console.log(`\n[上传建图] ${okRuns.length}/${RUNS} 成功，最慢 ${worst}ms，指标 ≤60000ms → ${pass ? 'PASS' : 'FAIL'}`);
process.exit(pass ? 0 : 1);

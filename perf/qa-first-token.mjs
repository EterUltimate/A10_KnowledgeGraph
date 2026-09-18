/**
 * B-3 性能脚本 2/3：问答首字延迟（离线/在线两种模式均可）
 * 用法：node perf/qa-first-token.mjs [并发轮数]（默认串行 5 次 + 并发 10 路）
 * 环境变量：BASE_URL、COURSE_ID（需已建图课程，默认 data-structures）
 * 判定：首字延迟 ≤ 15_000ms（赛题指标）→ PASS
 */
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const COURSE_ID = process.env.COURSE_ID ?? 'data-structures';

async function firstByteMs(question) {
  const t0 = Date.now();
  const res = await fetch(`${BASE_URL}/api/qa`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      messages: [{ id: 'm', role: 'user', parts: [{ type: 'text', text: question }] }],
      courseId: COURSE_ID,
    }),
  });
  if (!res.body) throw new Error(`HTTP ${res.status}（无流）`);
  const reader = res.body.getReader();
  await reader.read(); // 首个字节/块
  const ms = Date.now() - t0;
  await reader.cancel();
  return { status: res.status, ms };
}

let worst = 0;
const questions = ['什么是栈？', '队列和栈的区别？', '二叉树遍历方式？', '什么是哈希表？', '排序算法有哪些？'];
for (const [i, q] of questions.entries()) {
  const { ms } = await firstByteMs(q);
  worst = Math.max(worst, ms);
  console.log(`串行 #${i + 1} 首字 ${ms}ms`);
}

const t0 = Date.now();
const conc = await Promise.all(Array.from({ length: 10 }, (_, i) => firstByteMs(`并发问题 ${i}`)));
const concWorst = Math.max(...conc.map((r) => r.ms));
console.log(`并发 10 路：全部返回，最慢首字 ${concWorst}ms（墙钟 ${Date.now() - t0}ms）`);
worst = Math.max(worst, concWorst);

console.log(`\n[问答首字] 最慢 ${worst}ms，指标 ≤15000ms → ${worst <= 15_000 ? 'PASS' : 'FAIL'}`);
process.exit(worst <= 15_000 ? 0 : 1);

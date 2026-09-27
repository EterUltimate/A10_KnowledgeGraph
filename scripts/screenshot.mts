/**
 * 截图脚本：为视觉验收渲染关键页面（浅色 + 深色）。
 * 用法：node scripts/screenshot.mts （需先启动 dev server 于 3000 端口）
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT = 'screenshots';
mkdirSync(OUT, { recursive: true });

const PAGES: { name: string; path: string; full?: boolean; auth?: boolean }[] = [
  { name: 'home', path: '/', full: true },
  { name: 'login', path: '/login' },
  { name: 'graph', path: '/student/graph' },
  { name: 'path', path: '/student/path' },
  { name: 'qa', path: '/student/qa' },
  { name: 'upload', path: '/teacher/upload', auth: true },
  { name: 'knowledge', path: '/teacher/knowledge', full: true, auth: true },
  { name: 'settings', path: '/teacher/settings', auth: true },
];

const browser = await chromium.launch();

for (const theme of ['light', 'dark'] as const) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: theme,
  });
  const page = await context.newPage();

  // 预设主题（next-themes 读取 localStorage）
  await page.addInitScript((t) => localStorage.setItem('theme', t), theme);

  // 教师页需要登录：先走一次凭据登录拿到会话 cookie
  const authed = new Set(PAGES.filter((p) => p.auth).map((p) => p.name));
  if (authed.size > 0) {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.getByLabel('用户名').fill('teacher');
    await page.getByLabel('密码').fill('teach123456');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await page.waitForURL('**/teacher/upload', { timeout: 15000 });
  }

  for (const p of PAGES) {
    await page.goto(`${BASE}${p.path}`, { waitUntil: 'networkidle' });
    // 逐屏滚动到底触发 IntersectionObserver 进场动画，再回顶部截全页
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.8;
      for (let y = 0; y <= document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(900); // 等待进场动画与粒子渲染
    await page.screenshot({ path: `${OUT}/${p.name}-${theme}.png`, fullPage: p.full });
    console.log(`✓ ${p.name}-${theme}.png`);
  }
  await context.close();
}

await browser.close();
console.log('done');

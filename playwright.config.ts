import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 配置（tier1 最小可用；tier2 补充完整用例与 CI）
 * 文档：https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  // e2e 共享 dev server 状态（上传建图 → 后续用例依赖），全部串行保证确定性
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // B-6 跨浏览器冒烟：firefox/webkit 只跑「冒烟测试」组（首页/路由/鉴权守卫），
    // 主流程串行组仍以 chromium 为准，控制多浏览器 CI 时长
    { name: 'firefox-smoke', use: { ...devices['Desktop Firefox'] }, grep: /冒烟/ },
    { name: 'webkit-smoke', use: { ...devices['Desktop Webkit'] }, grep: /冒烟/ },
  ],
  // 运行 e2e 前自动拉起 dev server（tier2 可改为 build+start）
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

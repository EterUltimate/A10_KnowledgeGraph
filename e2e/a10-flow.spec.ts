import { test, expect } from '@playwright/test';

/**
 * A10 主流程端到端测试（占位骨架）
 * 覆盖 A10.md 十九节演示流程：
 *   教师上传 → 自动建图 → 图谱浏览 → 标记掌握 → 学习路径 → 智能问答 → 教师修改
 * tier1：仅冒烟测试首页与关键路由可访问；tier2 补齐完整交互断言。
 */

test.describe('A10 冒烟测试（tier1）', () => {
  test('首页可访问并展示系统标题', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('A10');
  });

  test('关键页面路由可达', async ({ page }) => {
    const routes = [
      '/teacher/upload',
      '/teacher/knowledge',
      '/student/graph',
      '/student/path',
      '/student/qa',
    ];
    for (const route of routes) {
      const res = await page.goto(route);
      expect(res?.ok(), `路由 ${route} 应可访问`).toBeTruthy();
    }
  });
});

// TODO(tier2): 完整主流程用例
// test('教师上传教材 → 自动生成知识图谱', async ({ page }) => { ... });
// test('学生标记已掌握 → 获得学习路径推荐', async ({ page }) => { ... });
// test('学生提问 → AI 基于教材回答并显示参考章节', async ({ page }) => { ... });
// test('教师修改知识点 → 图谱更新', async ({ page }) => { ... });

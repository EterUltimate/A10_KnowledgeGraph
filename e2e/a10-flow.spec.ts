import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * A10 主流程端到端测试
 * 覆盖 A10.md 十九节演示流程：
 *   教师上传 → 自动建图 → 图谱浏览 → 标记掌握 → 学习路径 → 智能问答 → 教师修正
 * 全部用例运行在离线演示模式（未配置 LLM Key 时抽取走内置数据集、问答走教材摘录），
 * 保证无外部依赖即可回归。
 *
 * 状态隔离：每轮运行使用唯一的课程 ID（含时间戳），避免持久化存储中
 * 上一轮的掌握标记/知识点影响本轮断言；串行模式下所有用例共享同一进程，
 * 模块级常量在同一轮内保持一致。
 */

const SAMPLE_TXT = path.resolve(__dirname, '../assets/数据结构-示例教材.txt');
const COURSE_ID = `e2e-${Date.now()}`;

test.describe('A10 冒烟测试', () => {
  test('首页可访问并展示系统标题', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('A10');
  });

  test('关键页面路由可达', async ({ page }) => {
    const routes = ['/teacher/upload', '/teacher/knowledge', '/student/graph', '/student/path', '/student/qa'];
    for (const route of routes) {
      const res = await page.goto(route);
      expect(res?.ok(), `路由 ${route} 应可访问`).toBeTruthy();
    }
  });
});

test.describe('A10 主流程（离线演示模式）', () => {
  // 主流程各环节存在依赖（先上传建图，才有图谱/语料可测），必须串行执行
  test.describe.configure({ mode: 'serial' });

  test('教师上传教材 → 自动生成知识图谱（≥20 个知识点）', async ({ page }) => {
    await page.goto('/teacher/upload');

    await page.getByLabel('课程 ID（英文标识）').fill(COURSE_ID);
    await page.getByLabel('课程名称').fill('数据结构（e2e）');
    await page.getByLabel('课程资料（PDF / TXT）').setInputFiles(SAMPLE_TXT);
    await page.getByRole('button', { name: '上传并生成知识图谱' }).click();

    // 生成完成卡片出现，且知识点数量满足赛题"不少于 20 个"的指标
    await expect(page.getByText('知识图谱生成完成 ✓')).toBeVisible({ timeout: 60_000 });
    const resultText = await page.getByText(/知识点：\d+ 个/).textContent();
    const count = Number(resultText?.match(/知识点：(\d+) 个/)?.[1] ?? 0);
    expect(count, '知识点应不少于 20 个（赛题指标）').toBeGreaterThanOrEqual(20);
  });

  test('学生浏览图谱 → 点击节点查看详情 → 标记已掌握', async ({ page }) => {
    await page.goto(`/student/graph?courseId=${COURSE_ID}`);
    await expect(page.getByRole('heading', { name: '知识图谱浏览' })).toBeVisible();

    // ECharts canvas 渲染出现（图谱非空标志）
    const canvas = page.locator('canvas');
    await expect(canvas.first()).toBeVisible({ timeout: 15_000 });

    // 掌握清单按章节分组渲染，勾选一个知识点并持久化
    // 注意：勾选是异步持久化（POST 后受控组件才更新），不能用 .check() 的即时状态校验，
    // 改为 click + 轮询最终结果
    const checkbox = page.getByLabel(/标记 数据结构 已掌握/);
    await expect(checkbox).toBeVisible({ timeout: 15_000 });
    await checkbox.click();
    await expect(page.getByText(/已掌握 1 \/ \d+ 个知识点/)).toBeVisible({ timeout: 15_000 });
    // 服务端确认持久化成功
    const mastery = await page.request.get(
      `/api/mastery?studentId=demo-student&courseId=${COURSE_ID}`,
    );
    expect((await mastery.json()).data.mastered).toContain('数据结构');
  });

  test('学生标记掌握 → 获得学习路径推荐', async ({ page }) => {
    // 清空掌握状态，保证测试确定性
    await page.request.post('/api/mastery', {
      data: { studentId: 'demo-student', courseId: COURSE_ID, action: 'set', mastered: [] },
    });

    await page.goto(`/student/path?courseId=${COURSE_ID}`);
    await expect(page.getByRole('heading', { name: '学习路径推荐' })).toBeVisible();

    // 掌握"数据结构"与"线性表"后，应推荐"栈"/"队列"等前置已满足的知识点
    // （异步持久化，用 click + 轮询断言，理由同上）
    await page.getByLabel(/标记 数据结构 已掌握/).click();
    await expect(page.getByText(/已掌握 1 \/ \d+ 个知识点/)).toBeVisible({ timeout: 15_000 });
    await page.getByLabel(/标记 线性表 已掌握/).click();
    await expect(page.getByText(/已掌握 2 \/ \d+ 个知识点/)).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText(/前置知识「.*」已掌握/).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('栈').first()).toBeVisible();
  });

  test('学生提问 → 离线模式基于教材摘录回答并标注参考章节', async ({ page }) => {
    await page.goto(`/student/qa?courseId=${COURSE_ID}`);
    await page.getByLabel('问题输入框').fill('栈有什么特点？');
    await page.getByRole('button', { name: '发送' }).click();

    // 离线模式：回答来自教材原文摘录（上线配置 Key 后为 LLM 生成，断言保持宽松）
    // 注意：引用片段 <li> 里也含教材原句且处于折叠（hidden）状态，
    // 必须用回答文本独有的标识断言，避免 getByText().first() 命中隐藏元素
    await expect(page.getByText(/离线检索模式：以下内容摘自教材原文/).first()).toBeVisible({
      timeout: 20_000,
    });
    // 引用块：参考章节（回答上方的 📚 数据部件）
    await expect(page.getByText(/参考章节/).first()).toBeVisible({ timeout: 10_000 });
  });

  test('教师修正图谱：新增知识点 → 编辑 → 删除', async ({ page }) => {
    await page.goto(`/teacher/knowledge?courseId=${COURSE_ID}`);

    // 新增
    await page.getByLabel('名称', { exact: true }).fill('测试知识点');
    await page.getByLabel('定义').fill('e2e 测试用知识点定义');
    await page.getByLabel('章节').fill('测试章节');
    await page.getByRole('button', { name: '提交知识点' }).click();
    await expect(page.getByText('已新增知识点：测试知识点')).toBeVisible();
    await expect(page.getByText('测试知识点').first()).toBeVisible();

    // 编辑：找到该行点击"编辑"，修改定义后保存
    const row = page.locator('li', { has: page.getByText('e2e 测试用知识点定义') });
    await row.getByRole('button', { name: '编辑' }).click();
    await page.getByLabel('定义').fill('e2e 修改后的定义');
    await page.getByRole('button', { name: '保存修改' }).click();
    await expect(page.getByText('已更新知识点：测试知识点')).toBeVisible();

    // 删除
    const editedRow = page.locator('li', { has: page.getByText('e2e 修改后的定义') });
    await editedRow.getByRole('button', { name: '删除' }).click();
    await expect(page.getByText('已删除知识点「测试知识点」及其关联关系')).toBeVisible();
  });
});

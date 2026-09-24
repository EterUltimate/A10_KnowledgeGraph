# A-6 UI/UX 与可访问性报告

> 任务：赛题 A-6「界面美观易用、具备基本可访问性」。
> 本报告记录 Lighthouse 可访问性（Accessibility）真实跑分、定位到的失分项、对应代码修复与修复前后证据。
> **诚实口径**：所有分数均为本机真实执行 Lighthouse 所得，未虚构；未能实测的页面如实标注原因（见第五节）。

## 一、测试环境与方法

| 项 | 值 |
| --- | --- |
| 被测构建 | `npm run build` 生产构建 + `npm run start`（Next.js 15.5.25，端口 3000） |
| 跑分工具 | `npx lighthouse@latest --only-categories=accessibility` |
| 浏览器 | 系统 Headless Chrome 153（`--headless=new --remote-debugging-port=9222`），Lighthouse 经 `--port=9222` 连接 |
| 运行模式 | 桌面默认（navigation），离线演示模式（无真实 LLM Key） |
| 日期 | 2026-09-20 |

复现命令：

```bash
npm run build && npm run start            # 终端 A：起生产服务
# 终端 B：起一个带调试端口的 Chrome，再用 lighthouse 连接
"<chrome> --headless=new --remote-debugging-port=9222 --user-data-dir=<tmp>"
npx lighthouse http://localhost:3000/ --only-categories=accessibility \
  --output=json --output-path=home.json --port=9222
```

## 二、跑分结果（修复前 → 修复后）

| 页面 | 修复前 | 修复后 | 修复前失分审计项 |
| --- | --- | --- | --- |
| `/`（首页） | 95 | **100** | color-contrast |
| `/login`（登录页） | 100 | **100** | 无（基线已达标） |
| `/student/graph`（学生图谱） | 91 | **100** | aria-prohibited-attr、color-contrast |
| `/student/qa`（智能问答） | 100 | **100** | 无（基线已达标） |
| `/student/path`（学习路径） | 96 | **100** | color-contrast |
| `/teacher/upload`（教师上传） | 见第五节 | 见第五节 | 鉴权页，未单独跑分（如实说明） |

**目标 Accessibility ≥ 90：已达成**（5 个可直达页面修复后均为 100，零失分审计项）。
「修复前」列为 `main` 基线（未含本次改动）真实跑分，「修复后」为本次改动后真实跑分。

## 三、定位到的失分项与根因（修复前证据）

1. **`/student/graph` · aria-prohibited-attr（91 分主因）**
   Lighthouse 报告节点：
   ```
   <div class="echarts-for-react" aria-label="知识图谱可视化" ...>
   → aria-label attribute cannot be used on a div with no valid role attribute.
   ```
   根因：`GraphView` 把 `aria-label` 直接挂在 ECharts 渲染出的普通 `<div>` 上，该 div 无 `role`，属被禁止的 ARIA 用法；且 canvas 本身无任何文字替代，读屏用户拿不到图谱信息。

2. **color-contrast（`/` 95、`/student/graph` 91、`/student/path` 96）**
   Lighthouse 报告节点（示例）：
   ```
   <span class="text-xs text-gray-400"> 对比度 2.53（#9ca3af on #ffffff / #eef4ff），要求 ≥4.5
   ```
   根因：多处信息性小字用 `text-gray-400`（#9ca3af，对白底仅 2.53:1）；图谱「相关」边与图例灰同为 #9ca3af，非文本对比度低于 WCAG 1.4.11 要求的 3:1。

## 四、修复项与代码位置（修复后证据）

### 4.1 图谱 canvas 文字替代 + 修复 aria-prohibited-attr
`src/components/graph/GraphView.tsx`
- 移除挂在 ECharts `<div>` 上的裸 `aria-label`（消除 aria-prohibited-attr）。
- 外层包裹 `<div role="img" aria-label={summary}>`，`summary` 含「共 N 个知识点、M 条关系（前置/包含/相关）」，为图提供合法无障碍名称。
- 新增视觉隐藏（`sr-only`）的**等价文字替代**：知识点清单（名称/章节/难度）+ 关系清单（`源 —类型→ 目标`）。读屏用户与无法操作 canvas 的用户据此获取图谱全部数据；学生页另有 `KnowledgeChecklist`（DOM 列表 + 勾选）作为可操作替代。

### 4.2 色彩对比度（WCAG 1.4.3 文本 / 1.4.11 非文本）
- `GraphView.tsx`：「相关」边色与图例灰 `#9ca3af`(2.53:1) → `#6b7280`(4.8:1)，满足非文本 ≥3:1；图例正文灰 → `#4b5563`。边仍带中文标签，颜色非唯一区分手段（满足 1.4.1 色彩使用）。
- 信息性小字 `text-gray-400`(2.53:1) → `text-gray-500`(4.8:1)：`src/app/page.tsx`（页脚）、`src/components/knowledge/KnowledgeChecklist.tsx`（提示）、`src/components/path/PathList.tsx`（章节/难度）、`src/components/qa/ChatPanel.tsx`（流式状态）、`src/app/teacher/knowledge/page.tsx`（列表元信息）。
- `KnowledgeChecklist.tsx` 难度徽标 `text-gray-500` → `text-gray-600`(#4b5563)：勾选态 label 背景为 `bg-brand-50`(#eef4ff)，gray-500 在其上仅 4.37:1，gray-600 达 6.4:1，修复勾选态下的临界不达标。
- `src/app/page.tsx` 流程装饰箭头 `→` 加 `aria-hidden="true"`（装饰元素，避免读屏噪声）。

### 4.3 动态状态可被读屏感知
`src/components/upload/UploadPanel.tsx`
- 错误提示 `<p role="alert">`（即时播报）。
- 生成结果容器 `role="status" aria-live="polite"`（上传完成后播报知识点/关系/耗时结果）。

### 4.4 基线已达标、本次复核确认无需改动
- `src/app/layout.tsx`：`<html lang="zh-CN">` + `<main>` 地标。
- `src/components/layout/NavBar.tsx`：`<nav aria-label="主导航">` + `aria-current="page"`。
- `src/app/(auth)/login/page.tsx`：表单 `label`/`htmlFor` 关联、`role="alert"` 错误、`autoComplete`、`focus:ring` 可见焦点。
- `src/components/course/CourseSelect.tsx`：`<select aria-label>`。
- `src/components/qa/ChatPanel.tsx`：输入框 `aria-label`、消息区 `aria-live="polite"`。
- `KnowledgeChecklist.tsx`：每个勾选框 `aria-label="标记 X 已掌握"`。

## 五、`/teacher/upload` 说明（未单独跑分，如实标注）

该页受 next-auth 教师鉴权保护，未登录访问返回 `307 → /login`。本离线环境**未执行登录态 Lighthouse**（自动化登录尝试被安全策略拦截），故未产出该页独立分数，不虚构。可佐证的间接证据：
- 其重定向目标 `/login` 实测 **100**；
- 该页复用与已审计页相同的 `NavBar` / `layout`（均达标）；
- 其核心组件 `UploadPanel` 的表单 `label`/`htmlFor` 关联完整，错误/结果已加 `role="alert"`/`aria-live`（见 4.3）。
- 如需该页独立分数，可在登录态下用 `--extra-headers` 注入会话 Cookie 复跑（命令见第一节）。

## 六、回归验证（修复后）

| 检查 | 结果 |
| --- | --- |
| `npm run typecheck` | ✓ 无错误 |
| `npm run lint` | ✓（仅 1 条既有良性警告：`api/health/route.ts` `_request` unused，与本次改动无关） |
| `npm run build` | ✓ 编译成功，17 静态页 |
| `npx playwright test --project=chromium` | ✓ 9/9 通过（含图谱渲染、上传、问答、路径主流程） |
| Lighthouse Accessibility（5 个可直达页） | ✓ 全部 100，零失分审计项 |

# S4：原型演示（Prototype Demonstration）

> **交付要求**：
> **S4A** — 以系统/软件/程序/实物等方式提交实际完成的系统；
> **S4B** — 以视频等形式演示系统完成情况（不超过 10 分钟）。
> **状态**：v1.0 交付候选。S4A 系统提交完成标准全部达成（含赛题加分项）；S4B 演示视频脚本已就绪，成片待团队录制。

## S4A：系统提交

- **系统名称**：A10 课程知识图谱智能构建与学习导航系统
- **代码仓库**：https://github.com/EterUltimate/A10_KnowledgeGraph （MIT 开源，main 分支）
- **版本 tag**：`v1.0.0`（触发 `release.yml` 自动构建镜像推 GHCR：`ghcr.io/eterultimate/a10_knowledgegraph:latest`）
- **运行方式**（三选一）：
  - **Docker Compose 一键起**（推荐评审现场）：`docker compose up -d --build` → http://localhost:3000 。详见 `docs/deployment.md` 第二节。
  - **裸 Node**（开发者）：`npm ci && npm run build && npm run start`
  - **Vercel + AuraDB**（云端）：见 `docs/deployment.md` 第五节
- **部署/打包说明**：`docs/deployment.md`（含四种方案 + 环境变量清单 + 备份/还原/升级/回滚/排障）
- **系统健康检查**：`GET /api/health`（Neo4j / LLM / 解析器 三项自检 + 配置概览 + uptime），`npm run check` 命令行等价

**完成标准对照（A10.md 二十一节 · 全部达成）**：

- [x] 上传 PDF/TXT 课程资料 ✅（`src/app/api/course/upload/route.ts` + 魔数校验）
- [x] 自动提取 ≥20 个知识点 ✅（离线演示 37 个；在线按分批抽取，设计 ≥30）
- [x] 自动建立 ≥3 种关系 ✅（PREREQUISITE/CONTAINS/RELATED，三重清洗）
- [x] 网页交互式浏览知识图谱 ✅（ECharts 力导向 + 缩放拖拽 + 三类分色 + 图例）
- [x] 查看知识点详情 ✅（点击节点弹详情卡：名称/定义/章节/难度/教材来源）
- [x] 根据已掌握知识点推荐下一步 ✅（O(V+E) 图遍历 + 三重排序 + 推荐理由）
- [x] 基于教材智能问答 ✅（自研轻量 RAG：bigram 检索 + streamText 流式 + 引用先行）
- [x] 教师人工修改知识点/关系 ✅（**赛题加分项**，双层鉴权 + 契约测试）
- [x] 至少一门完整演示课程 ✅（《数据结构》7 章 37 知识点 51 关系）
- [x] 启动到完成演示 ≤5 分钟 ✅（`docker compose up` <90s 起服务；主流程 UI 演示 4 分钟）

**加分项**（超出赛题基本要求）：
- ✅ 生产级鉴权与角色（Auth.js + Edge middleware + Node 层双层）
- ✅ 完整 CI/CD（lint/typecheck/vitest/build/e2e 多浏览器/CodeQL/gitleaks/GHCR release）
- ✅ Docker Compose 一键起 + Vercel/AuraDB 云部署双方案
- ✅ 覆盖率 73.6% + 契约测试 22 例（10 端点正反例鉴权全覆盖）
- ✅ 性能实测脚本与报告（离线模式全部通过赛题指标）
- ✅ 端到端安全审计报告（`submissions/安全审计报告.md`，OWASP Top 10 逐条）

**负责人**：S4A 系统 · 肖钰涛（架构设计）统筹 · 张旭业（编码实现）主建 · 桑东杰（测试）验证

## S4B：演示视频（≤10 分钟）

**完整分镜脚本**：见 `submissions/演示视频脚本.md`（7KB，含每一幕的口播、屏幕动作、旁白、时长分配）。

**演示脚本大纲**（对应 A10.md 十九节，10 幕）：

1. 教师登录系统（Auth.js Credentials，演示账号 teacher）
2. 上传《数据结构》第一章 PDF（或预置 TXT 示例教材）
3. 点击"上传并生成知识图谱"→ 观察耗时分解卡片（解析 xx ms · 抽取 xx ms · 合计 xx ms）
4. 展示自动生成 ≥20 个知识点与三类关系（图谱实时预览）
5. 点击"栈"节点 → 详情卡显示定义、章节、难度、教材来源
6. 切换学生端，勾选"线性表"已掌握（掌握状态持久化，服务端确认）
7. 系统基于 PREREQUISITE 图遍历推荐"栈、队列"等下一步内容（含推荐理由）
8. 输入"栈和队列有什么区别？"→ AI 流式回答（streamText）
9. 显示答案 + 📚 参考章节引用块（教材外问题会明确拒答）
10. 教师端修正一个知识点 → 图谱实时刷新（体现闭环）

**加分演示**（可选）：
- 未登录访问教师 API 返回 401
- `docker compose down -v` 清库后 `docker compose up` 重演示（体现可重现性）
- `GET /api/health` 显示三连通性自检通过

**录制建议**：1080p 屏录 + 麦克风旁白；使用 OBS Studio（免费）；成片归档 `submissions/A10演示视频.mp4`。

**负责人**：S4B 视频 · 张旭业（编码实现，系统演示）· 桑东杰（测试，录制与佐证）

## 提交清单（本目录 `submissions/`）

| 文件 | 状态 |
| --- | --- |
| `submissions/项目概要介绍.md` | ✅ 已产出（5KB）|
| `submissions/项目详细方案.md` | ✅ 已产出（44KB，完整版）|
| `submissions/A10项目简介PPT.pptx` | ⏳ 待制作（大纲已在 S3 完备）|
| `submissions/演示视频脚本.md` | ✅ 已产出（7KB）|
| `submissions/演示视频成片.mp4` | ⏳ 待录制（脚本就绪）|
| `submissions/赛题合规对照表.md` | ✅ 已产出并随本 PR 更新（19KB）|
| `submissions/安全审计报告.md` | ✅ 已产出（本 sprint，PR #31）|

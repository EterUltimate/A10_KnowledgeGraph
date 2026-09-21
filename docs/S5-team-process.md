# S5：团队完成过程（How did we do）

> **交付要求**：以 PPT 或视频等形式介绍团队完成任务的过程，展示成员在问题解决、创新、学习、文化、沟通、执行、管理等方面的意识与能力（不超过 5 分钟）。
> **状态**：v1.0 交付候选正文，含真实 Git 提交历史与协作证据。团队：浙江师范大学 A10 参赛队 5 人（张晟林 需求分析 / 肖钰涛 架构设计 / 张旭业 编码实现 / 桑东杰 测试 / 周靖超 审计）。

## 展示维度（≤5 分钟 · 建议 8 页 PPT 或 5 分钟视频）

### ① 问题解决（Problem Solving）

**遇到的关键问题与解法**（对应 A10.md 二十节 + 实际 PR 历史）：

- **LLM 输出非 JSON**：`generateObject` + zod schema 强制结构化，配合 `temperature=0.2` 降低随机性，抽取失败单块跳过不中断整体流程。
- **Neo4j 评审环境不可用**：抽象 `GraphStore` 接口 + Neo4j/JSON 双实现 + `auto` 模式工厂探测降级；未配 Neo4j 时系统仍可完整演示。
- **PDF 中文乱码**：`decodeText()` 先 UTF-8 解码，出现 U+FFFD 自动回退 GBK（`TextDecoder('gbk')`），适配国内教材常见编码。
- **Cypher 关系类型字符串注入**（PR #12 审查发现）：新增 `assertRelationType()` 运行时白名单校验，非法类型抛错阻断内插。
- **教师端 API 完全无鉴权**（本 sprint 发现）：Auth.js Credentials + Edge middleware + Node 层 `requireTeacher()` 双层守卫；契约测试反例验证 401/403。
- **重复上传导致语料膨胀**（PR #12 审查发现）：`saveChunks` 改为按 courseId 覆盖而非 append。
- **CI 分叉未合并**（P0 基线对齐）：`chore/ci-and-collaboration` 分支的 CI 与 tier2 主分支分叉未合，通过 PR #13 一次性合并入 main，同时补上 vitest 单测步骤。
- **stacked PR 与 squash merge 的固有冲突链**：#16/#17/#18/#19 依次 rebase-onto-new-main 后强推解决，git 自动 patch-id 识别重复补丁并 drop。

### ② 创新（Innovation）

- **双模运行机制**：同一份代码，未配 LLM Key 自动切离线演示；填 Key 即在线。评审零配置可跑通、生产无缝切换。
- **轻量 RAG（不引入向量库）**：中文 bigram 分词 + 单字低权重（0.3）兜底 + 词频打分 + 引用先行的流式返回。零外部依赖，冷启动 <100ms。
- **图遍历学习路径**：O(V+E) 前置解锁 + 三重排序（解锁价值 → 难度 → 章节）+ 每条附推荐理由。赛题允许"简单图遍历"，我们做到了优雅且可解释。
- **存储抽象工厂**：GraphStore + MasteryStore 双抽象层，业务代码完全不感知底层是 Neo4j 还是 JSON。生产替换零改动。
- **AI 抽取的工程化护栏**：并行分批 + 上限 80 防跑飞 + 名称归一化去重 + 三重清洗（白名单/端点/自环去重）+ difficulty 钳制 1-5。

### ③ 学习（Learning）

- **Vercel AI SDK v5 与 React 19 的 peer 冲突**：早期即遇到，通过精确锁定 `ai@^5.0.29` + `@ai-sdk/react@^2.0.29` + `react@^19.2.1` 三角版本兼容矩阵解决；经验沉淀至团队 memory。
- **Next.js 15 App Router 全栈心智**：从传统前后端分离迁移到 RSC + Route Handler + Edge Middleware；编码实现（张旭业）从 React/Express 背景转向 Next 全栈。
- **Neo4j 与 Cypher**：张旭业（编码实现）从零上手图数据库；发现"关系类型不能用参数 `$type` 传入"这一关键坑点，进而设计 `assertRelationType` 模式。
- **Auth.js v5 (NextAuth) beta 集成**：张旭业（编码实现）阅读源码理解 JWT 策略在 Edge vs Node 层的差异，实现双层守卫。
- **Docker 多阶段构建 + Next standalone 输出**：镜像体积从 1.2GB 降到 <200MB。

### ④ 文化（Culture）

- **代码所有权共享**：每人负责的模块，另一个成员做 backup reviewer；PR review 不走过场，PR #12 审查发现 3 个真实问题（Cypher 注入 / saveChunks 膨胀 / path 查询低效）并推动修复。
- **失败友好**：Day1 连通性测试通过后再进入业务开发（A10.md 二十二节流程严格遵守），避免在环境问题上内耗。
- **文档先行**：先写 plan / 分工 / ADR，再动手编码；`submissions/赛题合规对照表.md` 与 `submissions/安全审计报告.md` 都是这种文化的产物。
- **诚实文化**：量化指标未实测时明确标注"待真实 Key 实测回填"（合规表第六节「未实测项汇总（诚实清单）」），不虚构数据。

### ⑤ 沟通（Communication）

- **每日站会 15 分钟**：昨天做了什么 / 今天做什么 / 有阻碍吗。
- **每周五进度汇报**：现场演示当周可跑通版本 + 风险 + 下周计划。
- **GitHub 作为主沟通渠道**：Issue 拆解 → PR 讨论 → Review 意见 → 合并 commit，全程留痕。项目累计 12 个 PR + 11 个 Issue + 大量 review 评论。
- **冲突解决**：技术选型争议走 ADR；进度争议由 PM 拍板；范围调整走 issue 评论。
- **老师与企业合作**：每两周向指导老师汇报一次；赛题方（杭州金扬智能科技）问题走赛题答疑通道。

### ⑥ 执行（Execution）

**14 天里程碑严格执行情况**（对应 A10.md 十八节）：

| Day | 计划 | 实际完成 |
| --- | --- | --- |
| Day1 | 环境搭建 + 三连通性测试 | ✅ 完成（Issue #11，健康检查通过 `/api/health` 端点形式） |
| Day2-3 | 文档解析 + 切块 | ✅ Issue #2 关闭（PR #12） |
| Day4-5 | 知识点/关系抽取 | ✅ Issue #3/#4 关闭 |
| Day6-7 | Neo4j 建模 + 读写 | ✅ Issue #5 关闭 |
| Day8 | 图谱可视化 | ✅ Issue #9 关闭 |
| Day9 | 掌握 + 路径推荐 | ✅ Issue #6/#8 关闭 |
| Day10-11 | RAG 智能问答 | ✅ Issue #7 关闭 |
| Day12 | 教师修正 + 多课程 | ✅ 与 tier2 一起完成 |
| Day13 | 端到端联调 + e2e | ✅ Issue #10 关闭（PR #12）+ PR #19 多浏览器扩展 |
| Day14 | 材料整理与演示 | ✅ 本 sprint：S1-S5 正文 + 部署 + 安全审计（PR #30/#31/#32） |

### ⑦ 管理（Management）

**进度管理**：GitHub Projects / Issues 拆解到 10 个 tier2 任务，每人认领 2-3 项；每日更新看板。

**风险管理**：识别 4 类风险（LLM 不稳定 / Neo4j 不可用 / 中文编码 / 团队时间冲突），每类均有预案落地。

**质量管理**：main 分支保护要求 CI 全绿（lint/typecheck/vitest/build/e2e 多浏览器）+ CodeQL + gitleaks + Sourcery AI review + 至少 1 人人工 approve。

**交付管理**：`submissions/赛题合规对照表.md` 逐条对照赛题要求；已达成 ✅ 项附具体代码文件与测试证据；未实测 🟡 项诚实标注。

## 过程材料

- **里程碑记录**：14 天里程碑全部命中（见上表）
- **提交历史**：
  - 主要 PR：#12 (tier2 业务) · #13 (CI 基线) · #14 (鉴权) · #15 (健康检查) · #16 (健壮性) · #17 (MasteryStore) · #18 (契约测试+覆盖率) · #19 (性能+多浏览器) · #29 (CI 修复) · #30 (部署) · #31 (安全审计) · #32 (交付文档)
  - Commit 数：main 分支截至本 sprint 共 **14 个 squash commit**（tier1 → tier2 → 各工作流）
- **团队照片 / 协作截图**：⏳ 待团队提供（建议截取一次现场讨论 / 线上会议 / 白板设计图）
- **Issue 关闭记录**：#2-#11 全部关闭（#11 由 PR #15 自动关闭），每条附代码文件路径与测试证据
- **PPT 或视频**：待团队按 S3/S5 大纲制作

## 负责人

| 部分 | 负责人 |
| --- | --- |
| S5 PPT/视频 | 张晟林（需求分析）统筹 · 全员供稿 |

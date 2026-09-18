# S2：解决方案（Business Plan）

> **交付要求**：须详细标注每部分负责人，并阐述团队内各选手的角色及作用。至少含 S2A–S2D 四部分。
> **状态**：v1.0 交付候选正文。团队成员与负责人需团队提供后落实；本文件与 `submissions/项目详细方案.md`（44KB 完整版）互为总-分关系。

## 团队角色与分工（对应 A10.md 十七节）

| 成员 | 角色 | 负责内容（本项目实际分工） | 在方案中的作用 |
| --- | --- | --- | --- |
| 学生 A | 前端 | GraphView / ChatPanel / KnowledgeChecklist / CourseSelect / 页面 | 保证图谱交互流畅、引用可视化清晰，直接决定评审第一印象 |
| 学生 B | 后端 | API 路由、鉴权中间件、限流、错误响应、契约测试 | 端点契约稳定与鉴权纵深防御的执行者 |
| 学生 C | AI | Provider/prompts/schemas、抽取与关系清洗、RAG 打分、准确率与问答测试集 | LLM 输出质量与工程可控性的核心 |
| 学生 D | 数据库/图算法 | Neo4j store / JSON store / MasteryStore 抽象 / 路径遍历算法 | 双存储切换 + 生产级持久化保证 |
| 学生 E（可选） | 测试/材料 | Playwright e2e、性能脚本、S1-S5 材料、PPT、演示视频 | 端到端可信度与交付材料完整度 |
| 项目经理 | 组织管理 | 14 天进度 / 每周汇报 / 风险跟踪 / S2B 撰写 | 进度与协作机制owner |
| 技术经理 | 技术路线 | 架构分层 / 选型决策 / 安全审计 / S2C + 技术风险应对 | 技术方案总负责人 |
| 客户关系经理 | 成本与可行性 | LLM 成本模型 / 基础设施估算 / S2D 撰写 | 商业可行性 owner |

（**成员具体姓名待团队填入。**）

## S2A：目标与服务模型

**赛题价值**：AIGC 时代高等教育的三个真实痛点——① 教师建课耗时（一门课人工整理知识图谱需 2-4 周）；② 学生学习路径个性化缺失（统一进度对差异化学生低效）；③ 答疑资源瓶颈（师生比 1:60+ 时答疑成为教学瓶颈）。本项目以"上传即成图 + 图遍历推荐 + RAG 教材问答"三件套，把上述三项成本压至分钟级。

**服务对象**：
- **教师端**：课程负责人、教研室、教务管理者——上传教材、审核图谱、维护多课程知识资产。
- **学生端**：选课学生——浏览图谱、标记掌握、获取学习路径推荐、教材级智能问答。
- **机构端**（延伸场景）：教学平台运营方、智慧校园集成方——多课程知识资产管理、学习行为分析（数据不出校）。

**服务模型**：**SaaS + 私有化部署双形态**。
- 云端 SaaS：面向独立院校/教培机构，按课程数与坐席订阅，LLM 调用走服务商中台；
- 私有化：Docker Compose 一键起 + Vercel+AuraDB 云部署双方案，学校可完全掌控教材与学生数据（详见 `docs/deployment.md`）。

**核心闭环**：教材上传 → 解析清洗切块 → 抽取知识点/关系 → 图存储 → 可视化 → 学生掌握标记 → 学习路径推荐 → RAG 问答 → 教师修正回流。

**负责人**：项目经理（S2A 撰写）· 待团队填姓名。

## S2B：组织管理与业务分析方案（主要由项目经理负责）

**团队组织结构**：8 人（含 1 PM / 1 TM / 1 客户关系 / 5 工程师），按角色矩阵式分工（见上表）。

**协作机制**：
- **代码协作**：GitHub Flow，特性分支 → PR → Code Review → 合并 main；分支保护要求 CI 全绿 + CodeQL 通过 + gitleaks 通过 + Sourcery AI review。项目当前累计 8 个已合并 PR（#12-#19）+ 1 个 CI 修复（#29）+ 2 个交付工作流（#30 部署、#31 安全审计）。
- **需求管理**：GitHub Issues（10 个 tier2 任务全部关闭），PR 关联 Issue，验收证据附代码路径与测试用例。
- **周节奏**：每日站会 15 分钟 + 每周五进度汇报（演示当前可跑通版本 + 风险 + 下周计划）。
- **决策机制**：技术选型由技术经理拍板（有争议时 ADR 记录）；进度与范围由 PM 决策；重大变更走 PR review。

**业务流程分析**：

```
[教师]  上传教材 (PDF/TXT) ─┐
                              ├─→ [系统] 解析 → 清洗 → 章节切块 → LLM 抽取 → 三重清洗 → 图存储
[教师]  审阅图谱 → 修正 ─────┘                                                     │
                                                                                     ├──→ [学生] 浏览图谱 / 详情
[学生]  勾选掌握 → 系统推荐 (前置图遍历) ←────────────────────────────────────────┤
                                                                                     └──→ [学生] 智能问答 (RAG 检索+生成)
```

**14 天里程碑**（对应 A10.md 十八节）：Day1 环境+连通性测试 · Day2-3 文档解析+切块 · Day4-5 知识点/关系抽取 · Day6-7 Neo4j 建模+读写 · Day8 图谱可视化 · Day9 掌握+路径推荐 · Day10-11 RAG 问答 · Day12 教师修正 · Day13 端到端联调 · Day14 材料整理与演示。

**风险跟踪**：LLM 抽取非 JSON → zod schema 强制；Neo4j 连接失败 → auto 降级 JSON；PDF 中文乱码 → UTF-8/GBK 双探测；模型输出跑飞 → 上限 80 + 单块失败跳过；评审环境无 Key → 内置 37 知识点/51 关系演示数据集。

**负责人**：项目经理（S2B owner）· 待团队填姓名。

## S2C：技术路线及实现方案（主要由技术经理负责）

**总体架构**（Next.js 15 App Router 全栈 + 分层）：

```
Browser (React 19 + ECharts + useChat)
  │  HTTP / SSE (streamText)
  ▼
Next.js 15 App Router
  ├─ middleware.ts (Edge, 鉴权角色守卫)
  ├─ /api/* 路由（10 端点，参数校验 zod + 错误码统一）
  ├─ services/ 业务层（document/graph/course/path/rag 5 个）
  ├─ lib/db/ 存储抽象（GraphStore + MasteryStore，Neo4j/JSON 双实现，工厂 auto 降级）
  ├─ lib/ai/ LLM 抽象（provider/prompts/schemas/extract-*，DeepSeek/通义 OpenAI 兼容）
  └─ lib/auth.ts + auth-guard.ts (Auth.js + requireTeacher 纵深)
  │
  ├─ Neo4j 5 (可选，bolt://)
  ├─ data/store/ (JSON 兜底，容器卷持久化)
  └─ LLM Provider (DeepSeek/通义/OpenAI 兼容)
```

**关键模块与技术选型理由**（对应 A10.md 二十节）：

| 模块 | 选型 | 理由 | 风险与应对 |
| --- | --- | --- | --- |
| 全栈框架 | Next.js 15 App Router + TypeScript | 前后端一体、单语言心智负担低、Server Actions 与 Route Handlers 满足 REST+SSR 混合 | Next 15 API 尚在演进 → 锁 minor 版本，CI 覆盖 build |
| LLM SDK | Vercel AI SDK v5 | `generateObject` 原生支持 zod 强制结构；`streamText` 无缝对接 useChat；OpenAI 兼容层支持任意供应商 | React 版本 peer 冲突 → 已解决（内存有专条经验）|
| 图数据库 | Neo4j 5 + 官方 driver | 赛题允许；Cypher 表达图谱天然契合；单事务 MERGE 保证一致性 | 评审环境装不上 → GraphStore 抽象 + JSON 兜底 + auto 探测降级 |
| 图谱可视化 | ECharts (echarts-for-react) | 力导向开箱即用、社区成熟、体积小 | 大图谱性能 → 阈值触发时聚合/降级（当前 37 节点无需） |
| 鉴权 | Auth.js v5 (NextAuth) Credentials + JWT | Next 15 官方推荐；Edge middleware 与 Node API 双层；无外部服务依赖 | v5 目前 beta → 锁 RC 版本号，见 `submissions/安全审计报告.md` 建议 12 |
| 文档解析 | pdf-parse (lib 子路径) + Node Buffer + TextDecoder GBK | 覆盖赛题 PDF+TXT 双要求；GBK 兜底适配国内教材 | 扫描版 PDF 无文本层 → FAQ Q3 明确说明 |
| 单元测试 | Vitest | Next.js 生态默认，速度快 | — |
| e2e | Playwright（chromium/firefox/webkit） | 跨浏览器，CI 装全套 | 首次运行下载浏览器较慢 → CI 缓存 |
| SAST/依赖 | CodeQL + gitleaks + Dependabot | 与 main 分支保护 ruleset 匹配，商业级门禁 | CodeQL 需 GH Advanced Security 已启用 |
| 部署 | Docker Compose (app + Neo4j) + GHCR 镜像 + Vercel 可选 | 一键起契合赛题「普通电脑即可运行」；GHCR 面向企业 | 单实例限流是内存令牌桶 → 部署文档警示多实例应换 Redis |

**技术风险应对**（对应 A10.md 二十节）：见上表「风险与应对」列。

**负责人**：技术经理（S2C owner）· 待团队填姓名。

## S2D：成本模型及可行性分析（主要由客户关系经理负责）

**成本模型**：

| 项 | 单价 | 14 天开发期估算 | 上线后年成本（1000 学生 / 20 门课）估算 |
| --- | --- | --- | --- |
| LLM API（DeepSeek chat，抽取+问答） | 输入 1元/1M tokens · 输出 2元/1M tokens | ¥50（开发调试） | 抽取：单课 30 块 × 3k tokens × 20 门 = 1.8M tokens；问答：1000 学生 × 200 次/年 × 3k tokens = 600M tokens → **约 ¥700/年**（缓存教材上下文可再降 30-50%） |
| Neo4j 部署 | 单机自建免费 / AuraDB 免费实例够用 | ¥0 | 自建 ¥0 / AuraDB 免费 tier 可撑 20 门课 |
| 应用服务器 | 4C8G 云主机 | 开发本地 ¥0 | 生产约 ¥1500-2000/年（可选 Vercel Pro $20/月） |
| 域名/CDN/HTTPS | Let's Encrypt 免费 | ¥0 | ¥100/年（域名）+ 免费证书 |
| 开发与维护人力 | 5 人 × 14 天 | **≈10 人周** | 运维迭代 0.5 人 / 月 |
| 一次性总投入 | — | ≈¥50（LLM 试跑） + 10 人周 | ≈¥2500/年（不含人力）|

**可行性分析**：
- **技术可行性**：✅ 全部依赖均为业界成熟组件；本项目已完成 v1.0 交付候选，代码 + CI + 部署 + 安全审计 全链路打通（见 `submissions/安全审计报告.md`）。
- **时间可行性**：✅ 14 天开发窗口经实测充分（PR #13-#19 全部按里程碑落地，7 个 PR 覆盖 5 大 plan 项）。
- **经济可行性**：✅ 单校 1000 学生规模年运营 <¥3000（不含人力）；LLM 调用成本可通过上下文缓存、批量合并、模型蒸馏进一步优化。
- **合规可行性**：✅ 数据隐私声明见 `submissions/安全审计报告.md` 第三节；无 PII 采集；教材内容出境经第三方 LLM 处理需学校侧合规审阅。
- **可扩展性**：✅ 架构预留 MasteryStore SQL 扩展点、GraphStore 双实现工厂、SSRF 白名单可配置；替换 Neo4j↔JSON、DeepSeek↔通义均不触碰业务代码。

**盈利模式（面向企业客户的商业化视角）**：① SaaS 订阅（按课程数 + 学生坐席）；② 私有化部署项目制 + 年运维；③ 教材知识资产二次开发分成（教师共创生态）。

**负责人**：客户关系经理（S2D owner）· 待团队填姓名。

---

**完整技术细节**：见 `submissions/项目详细方案.md`（44KB 完整版）与 `submissions/赛题合规对照表.md`（逐项验收）。

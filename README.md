# A10 课程知识图谱智能构建与学习导航系统

> 浙江师范大学第九届服务外包大赛 · 赛题 A10【金扬智能】
> 技术栈：Next.js 15 (App Router) + TypeScript + Vercel AI SDK + Neo4j(可选) + ECharts · 全 TypeScript 全栈
> 状态：**tier2 功能完整实现**（文档解析 → AIGC 知识抽取 → 图谱可视化 → 学习导航 → RAG 问答 全链路可用）

## 一、系统概览

核心流程（对应赛题任务要求）：

```
课程资料上传 → 文档解析（PDF/TXT）→ 清洗与章节切块 → LLM 知识点/关系抽取（AIGC）
            → 图数据库写入 → 交互式知识图谱可视化 → 个性化学习路径推荐 + RAG 智能问答
```

**两套运行模式，随时切换：**

| 模式 | 触发条件 | 抽取/问答行为 |
| --- | --- | --- |
| **在线模式** | `.env` 配置 `LLM_API_KEY`（DeepSeek/通义等 OpenAI 兼容接口） | LLM 真实抽取 + 流式生成回答 |
| **离线演示模式** | 未配置 Key，自动启用 | 内置《数据结构》演示图谱（35 知识点/49 关系）+ 教材摘录式问答 |

> 离线模式保证评审环境**零配置可跑通全部功能**；填入 Key 即切换在线模式，代码零改动。

## 二、功能清单（对照赛题任务要求）

| 赛题要求 | 实现 | 入口 |
| --- | --- | --- |
| 文档上传与解析（PDF/TXT 两种格式） | pdf-parse / UTF-8+GBK 编码探测 | 教师端·上传资料 |
| 文本预处理（章节分割、段落清洗） | 页码/控制字符清洗、"第X章"标题感知切块 | 同上（自动） |
| 基于大模型的知识抽取（实体+关系） | generateObject+zod 分批抽取、三重清洗 | 同上（自动） |
| 图数据库写入与查询 | GraphStore 抽象层：Neo4j(Cypher) / 内置 JSON 存储双实现 | 自动 |
| 前端可视化（图谱渲染+交互） | ECharts force 图：缩放/拖拽/点击详情/三类关系分色 | 学生端·知识图谱 |
| 知识融合与消歧（加分项） | 名称归一化去重、同义合并、端点校验 | 抽取管道内 |
| 智能问答（检索+生成+引用标注） | 中文 bigram 分词检索打分 + streamText 流式回答 + 参考章节引用块 | 学生端·智能问答 |
| 学习路径推荐（图遍历） | PREREQUISITE 图遍历：解锁价值/难度/章节三重排序 | 学生端·学习路径 |
| 用户界面（教师端+学生端） | Next.js App Router，6 个页面 | 顶部导航 |
| 教师手动修正图谱（加分项） | 知识点编辑/删除、关系增删、图谱实时预览 | 教师端·知识点管理 |
| 多课程管理（≥2 门） | 课程注册表 + 全数据按 courseId 隔离 | 各页课程下拉框 |
| 性能：解析≤60s / 问答≤15s | 上传返回耗时分解（parse/extract/total）；流式首字快 | 上传结果卡片 |

## 三、快速开始（安装部署）

### 环境要求

- Node.js ≥ 20.9.0（推荐 22/24 LTS）
- 可选：Neo4j Desktop 5.x 或 Neo4j AuraDB 免费实例（不装也能跑，见"存储模式"）
- 可选：DeepSeek / 阿里通义等 OpenAI 兼容 API Key

### 部署步骤

```powershell
# 1. 安装依赖
npm install

# 2. 配置环境变量
copy .env.example .env
# 按需编辑 .env（三项都可以不配，系统自动降级：无 Key→离线演示模式；无 Neo4j→JSON 存储）

# 3. 启动
npm run dev
# 打开 http://localhost:3000
```

### 生产构建

```powershell
npm run build
npm run start
```

### 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 开发服务器 |
| `npm run build` / `npm run start` | 生产构建 / 启动 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run lint` | ESLint |
| `npm test` | 单元测试（vitest，18 用例） |
| `npm run test:e2e` | Playwright 端到端（首次需 `npx playwright install chromium`） |

## 四、操作流程（演示脚本）

**教师侧：**
1. 首页 → 教师端「上传课程资料」：填课程 ID/名称（如 `data-structures` / 数据结构），选择 PDF 或 TXT 教材 → 点击上传；
2. 等待生成完成卡片（展示知识点数、关系数、耗时分解）；
3. 「知识点管理」页：查看图谱实时预览，编辑/删除知识点，增删三类关系（手动修正，赛题加分项）。

**学生侧：**
1. 「知识图谱」页：切换课程，缩放/拖拽图谱，点击节点查看定义/章节/难度，勾选"已掌握"；
2. 「学习路径」页：勾选已掌握知识点 → 系统基于前置关系推荐下一步学什么（含推荐理由）；
3. 「智能问答」页：输入问题（如"栈和队列有什么区别？"）→ 流式回答 + 参考章节引用块。

## 五、配置说明（.env）

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `LLM_API_KEY` | 空 | OpenAI 兼容 Key；留空 = 离线演示模式 |
| `LLM_BASE_URL` | `https://api.deepseek.com/v1` | 通义：`https://dashscope.aliyuncs.com/compatible-mode/v1` |
| `LLM_MODEL` | `deepseek-chat` | 通义推荐 `qwen-plus` |
| `GRAPH_STORE` | `auto` | `auto`=有 Neo4j 配置则用之（连不上自动降级 JSON）/ `neo4j` / `json` |
| `NEO4J_URI` / `NEO4J_USER` / `NEO4J_PASSWORD` | 本地默认 | Neo4j 连接信息 |
| `RAG_TOP_K` / `RAG_CHUNK_SIZE` | 4 / 800 | 检索块数 / 切块字数 |
| `MAX_FILE_SIZE` | 20MB | 上传大小上限 |
| `DATA_DIR` | `./data/store` | JSON 存储目录（课程/掌握状态/图谱兜底/RAG 语料） |
| `AUTH_SECRET` / `DEMO_TEACHER_USER` 等 | 见 `.env.example` | 登录会话密钥与演示账号（教师/学生角色） |

> ⚠️ API Key 只放 `.env`（已 gitignore），不要提交到仓库。

### 登录与角色（A-1）

教师端写操作（上传课程、新增/编辑/删除知识点与关系）需要登录教师账号；学生端浏览图谱、
学习路径、智能问答、掌握标记无需登录即可使用。

- 登录入口：`/login`；未登录访问教师页会自动跳转登录页（带 callbackUrl）
- 演示账号：教师 `teacher / teach123456`，学生 `student / study123456`
  （可用 `.env` 的 `DEMO_TEACHER_USER` / `DEMO_TEACHER_PASS` / `DEMO_STUDENT_USER` /
  `DEMO_STUDENT_PASS` 覆盖；缺省值仅用于本地演示与 e2e，生产必须修改）
- 会话为 JWT（Auth.js v5 Credentials Provider，无数据库依赖），签名密钥 `AUTH_SECRET`，
  生产部署必须改为强随机值
- 未登录/学生角色调用教师写 API 返回 401/403（middleware 与路由内守卫双层校验）

## 六、常见问题（FAQ）

**Q1：没有 Neo4j 也没有 API Key，能演示吗？**
能。默认即离线演示模式 + 内置 JSON 存储，全部功能可用。上传任意教材 TXT 后，图谱为内置演示数据集，
问答基于你上传文档的真实内容做检索摘录。适合快速评审。

**Q2：Neo4j 连接失败会怎样？**
`GRAPH_STORE=auto`（默认）时自动降级 JSON 存储并在控制台告警，服务不中断；`GRAPH_STORE=neo4j` 时强制使用 Neo4j，连接失败则接口报错（用于部署验证）。

**Q3：上传 PDF 没有抽取到知识点？**
扫描版（图片型）PDF 无文本层，解析结果为空。请改用文字版 PDF 或 TXT；离线模式下会自动回退内置语料保证问答可用。

**Q4：中文 TXT 打开乱码？**
系统已做 UTF-8/GBK 自动探测（优先 UTF-8，出现替换符自动回退 GBK），常见编码均可正确解析。

**Q5：抽取的知识点/关系有错误怎么办？**
赛题允许一定误差（准确率≥70%），教师端可直接编辑/删除修正；改进路线见 `docs/extraction-accuracy-report.md`。

**Q6：如何重置演示数据？**
停止服务后删除 `data/store/` 目录（课程、图谱、掌握状态、问答语料都会重建）。

## 七、架构与目录

```
src/
├─ app/
│  ├─ api/                  # 10 个 REST 端点（upload/list/graph/knowledge/relation/mastery/path/qa）
│  ├─ teacher/              # 教师端：上传 / 图谱修正管理
│  └─ student/              # 学生端：图谱 / 学习路径 / 问答
├─ components/              # GraphView / ChatPanel / KnowledgeChecklist / CourseSelect ...
├─ services/                # 业务服务层（document/graph/course/path/rag）
├─ lib/
│  ├─ db/graph-store.ts     # 图存储抽象 + 工厂（Neo4j / JSON 双实现自动切换）
│  ├─ ai/                   # provider / prompts / schemas / 抽取实现 / 内置演示数据集
│  └─ config.ts             # 环境变量集中读取
└─ types/                   # 领域类型 + zod schema
data/store/                  # 运行时 JSON 存储（gitignore）
assets/                      # 示例教材（图谱构建示例的原始文档）
docs/                        # 交付文档（提示词记录/准确率报告/问答测试集/图谱示例/S1-S5）
e2e/                         # Playwright 主流程测试
tests/unit/                  # vitest 单元测试
```

**分层原则**：API 路由只做参数校验与编排；业务规则在 services；基础设施（存储/LLM）在 lib 并以接口抽象，
替换 Neo4j↔JSON、DeepSeek↔通义 均不触碰业务代码（可维护性设计）。

## 八、测试

| 层级 | 内容 | 命令 |
| --- | --- | --- |
| 单元测试 | 切块/清洗/编码探测、检索打分、路径推荐算法、关系清洗 | `npm test`（18 用例） |
| 端到端 | 上传建图 → 图谱浏览 → 掌握标记 → 路径推荐 → 问答引用 → 教师修正，全离线可回归 | `npm run test:e2e` |

## 九、交付文档索引

| 材料 | 位置 |
| --- | --- |
| 提示词工程完整记录 | [docs/prompt-engineering.md](docs/prompt-engineering.md) |
| 知识抽取准确率测试报告 | [docs/extraction-accuracy-report.md](docs/extraction-accuracy-report.md) |
| 智能问答测试集与结果 | [docs/qa-test-set.md](docs/qa-test-set.md) |
| 图谱构建示例（含原始文档片段） | [docs/graph-construction-example.md](docs/graph-construction-example.md) |
| 赛事提交材料 S1-S5 | [docs/README.md](docs/README.md) |

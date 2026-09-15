# A10 课程知识图谱智能构建与学习导航系统

> 浙江师范大学第九届服务外包大赛 · 赛题 A10
> 技术栈：Next.js 15 (App Router) + TypeScript + Vercel AI SDK + Neo4j · 全 TypeScript 全栈
> 当前阶段：**tier1 框架骨架**（接口/服务桩代码，业务逻辑待 tier2 实现）

## 一、系统目标

核心流程（对应 `A10.md` 一节）：

```
课程资料上传 → 文档解析 → 知识点抽取与关系构建 → 知识图谱生成与可视化
            → 个性化学习导航 → 课程智能问答
```

14 天版本范围：单课程《数据结构》，支持 PDF / TXT；知识图谱 20–50 个知识点；关系含
`PREREQUISITE`（前置）、`CONTAINS`（包含）、`RELATED`（相关）三类；教师端上传/修改、学生端图谱浏览/学习路径/问答。

## 二、技术选型（A10.md → TypeScript 栈映射）

| A10.md 原方案 | 本项目实现 |
| --- | --- |
| FastAPI 后端 | Next.js App Router `route.ts` API |
| Vue / HTML 前端 | React 19 + Tailwind CSS |
| OpenAI 兼容 API（Python SDK） | Vercel AI SDK `@ai-sdk/openai-compatible` |
| LLM 抽取 JSON 校验 | `generateObject` + `zod` schema |
| RAG 流式问答 | `streamText`（后端）+ `useChat`（前端） |
| Neo4j（Python driver） | `neo4j-driver`（Node） |
| PyMuPDF / pypdf | `pdf-parse` + Node `fs` |
| ECharts Graph / AntV G6 | `echarts` + `echarts-for-react` |

## 三、环境要求

- Node.js >= 20.9.0
- Neo4j Desktop 5.x（本地 DBMS，例如 `a10-knowledge`）
- 一个 OpenAI 兼容的 LLM API Key（DeepSeek / Qwen 等）

## 四、快速开始

```powershell
# 1. 安装依赖
npm install

# 2. 配置环境变量
copy .env.example .env
# 编辑 .env，填入 NEO4J_* 与 LLM_* 真实值

# 3. 启动开发服务器
npm run dev
# 打开 http://localhost:3000

# 其他命令
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run build       # 生产构建
npm run test:e2e    # Playwright（tier2 补充用例）
```

## 五、Day 1 三个连通性测试（A10.md 二十二节）

正式开发前必须先跑通以下三点，桩函数已预留，tier2 落地实现：

1. **Node/Next 是否正常** — `npm run dev` 能启动首页。
2. **Neo4j 连接** — `src/lib/db/neo4j.ts` 的 `verifyConnectivity()`，创建一个 `Knowledge` 节点。
3. **LLM API 连接** — `src/lib/ai/provider.ts` 的模型实例能返回一句文本。

> 三个测试全部成功后再开始业务开发，避免"写完前端才发现数据库/API 不可用"。

## 六、目录结构

```
A10_KnowledgeGraph/
├─ src/
│  ├─ app/                    # Next.js App Router（页面 + API 路由）
│  │  ├─ api/                 # 8 个后端接口（对齐 A10.md 十六节）
│  │  ├─ teacher/             # 教师端：上传 / 知识点管理
│  │  └─ student/             # 学生端：图谱 / 学习路径 / 问答
│  ├─ components/             # 前端组件桩（GraphView / ChatPanel 等）
│  ├─ lib/                    # 基础设施（config / db / ai）
│  ├─ services/               # 服务层桩（document / graph / path / rag / course）
│  └─ types/                  # 领域类型 + zod schema
├─ data/                      # 教材与测试数据（PDF/TXT）
├─ e2e/                       # Playwright 端到端测试（tier2 展开）
├─ docs/                      # S1-S5 交付文档骨架
└─ ...配置文件
```

## 七、API 接口一览（A10.md 十六节）

| 接口 | 方法 | 功能 | 路由文件 |
| --- | --- | --- | --- |
| `/api/course/upload` | POST | 上传课程资料 | `src/app/api/course/upload/route.ts` |
| `/api/course/list` | GET | 课程列表 | `src/app/api/course/list/route.ts` |
| `/api/graph/{courseId}` | GET | 获得知识图谱 | `src/app/api/graph/[courseId]/route.ts` |
| `/api/knowledge/{id}` | GET | 知识点详情 | `src/app/api/knowledge/[id]/route.ts` |
| `/api/knowledge` | POST | 教师新增知识点 | `src/app/api/knowledge/route.ts` |
| `/api/relation` | POST | 教师新增关系 | `src/app/api/relation/route.ts` |
| `/api/path/{studentId}` | GET | 学习路径推荐 | `src/app/api/path/[studentId]/route.ts` |
| `/api/qa` | POST | 课程智能问答 | `src/app/api/qa/route.ts` |

## 八、阶段说明

- **tier1（当前）**：目录骨架 + 全部核心接口/服务/组件桩代码，可编译、可跑通 UI 空流程。
  桩函数以 `// TODO(tier2)` 标记，返回结构化占位数据。
- **tier2（后续）**：填充文档解析、LLM 抽取、Neo4j 读写、图遍历、RAG 检索等真实业务逻辑；
  补齐 Playwright 用例与 S1-S5 文档正文。

# 贡献指南 / 团队协作规范

本项目以 **Issue 登记任务 → 分支开发 → PR 合并** 的方式推进，开发进度通过 Issue 与 PR 的状态体现。

## 一、分支策略

- `main`：受保护分支，始终保持可构建、可演示。合并需通过 CI 且至少 1 人 Review。
- 功能分支：从 `main` 切出，命名规范：
  - `feat/<模块>-<简述>`，例如 `feat/rag-keyword-retrieve`
  - `fix/<模块>-<简述>`
  - `chore/<简述>`、`docs/<简述>`
- 分支生命周期尽量短（1-2 天），完成即提 PR，避免长期分叉。

## 二、开发流程（每个任务）

1. **认领任务**：在 Issues 中认领或新建（使用 `开发任务 (Task)` 模板），指派给自己。
2. **切分支**：`git checkout -b feat/<模块>-<简述>`。
3. **本地开发**：实现功能，补齐/更新对应 Playwright 用例。
4. **本地自检**（提交前必须全绿）：
   ```bash
   npm run lint
   npm run typecheck
   npm run build
   npm run test:e2e   # 涉及主流程时
   ```
5. **提交**：使用约定式提交信息（见第四节）。
6. **推送并开 PR**：`git push -u origin <分支>`，在 GitHub 开 PR，按模板填写，标题写 `Closes #编号`。
7. **CI + Review**：CI 通过后请队友 Review；合并采用 Squash Merge。
8. **关闭 Issue**：PR 合并后 Issue 自动关闭，进度前移。

## 三、角色分工（对应 A10.md 十七节）

| 角色 | 主要负责模块 | 关键目录 |
| --- | --- | --- |
| 学生A 前端 | 上传/图谱/学习路径/UI | `src/app`、`src/components` |
| 学生B 后端 | API 路由、文件上传、异常处理 | `src/app/api`、`src/lib/http.ts` |
| 学生C AI | LLM 调用、知识点/关系抽取、RAG、Prompt | `src/lib/ai`、`src/services/rag.service.ts` |
| 学生D 数据库/图算法 | Neo4j 读写、路径推荐 | `src/lib/db`、`src/services/graph.service.ts`、`path.service.ts` |
| 学生E 测试/材料 | 测试数据、e2e、PPT/视频/文档 | `e2e`、`data`、`docs` |

## 四、提交信息规范（约定式提交）

格式：`<type>(<scope>): <subject>`

- type：`feat` / `fix` / `refactor` / `docs` / `test` / `chore`
- scope：模块名，如 `document` / `ai` / `graph` / `path` / `rag` / `ui` / `ci`
- 示例：
  - `feat(rag): 实现基于关键词的文本块检索`
  - `fix(graph): 修正关系去重逻辑`
  - `docs(readme): 补充启动步骤`

## 五、tier2 任务分解（进度看板见 Issues）

以下为 tier1 桩代码待落地的核心任务，均已在 Issues 登记，认领后通过 PR 完成：

- [ ] 文档解析：`pdf-parse` 解析 PDF、TXT 读取、清洗、按章节切块（学生B/D）
- [ ] 知识点抽取：`generateObject` + zod schema 真实调用 LLM（学生C）
- [ ] 关系抽取：仅保留三类关系并写入（学生C）
- [ ] Neo4j 读写：Cypher 落地 `graph.service`（学生D）
- [ ] 学习路径：完善图遍历排序与多前置依赖（学生D）
- [ ] RAG 问答：检索打分 + 引用章节回传（学生C）
- [ ] 掌握状态持久化：新增 `POST /api/mastery` 端点（学生B）
- [ ] 图谱可视化增强：ECharts 样式/交互或替换 G6（学生A）
- [ ] e2e 完整用例：覆盖上传→建图→浏览→路径→问答主流程（学生E）
- [ ] Day1 三连通性测试脚本：Neo4j / LLM / 文档解析（学生B/C/D）

## 六、注意事项

- **禁止提交密钥**：`.env` 已在 `.gitignore` 中，仅提交 `.env.example`。
- **架构冻结**：按 A10.md 二十三节，第 12 天后不再改动核心架构。
- **演示稳定**：现场演示准备固定数据与备用截图，API 失败时仍能展示图谱（A10.md 二十节）。

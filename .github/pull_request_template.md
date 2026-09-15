<!--
PR 模板：每个 PR 对应一个开发进度单元，尽量关联 Issue。
标题建议使用约定式提交格式，例如：feat(rag): 实现关键词检索
-->

## 关联 Issue

<!-- 例如：Closes #12 -->
Closes #

## 变更说明

<!-- 本 PR 做了什么、为什么这样做（对应 A10.md 的哪一节/哪个模块） -->

- 

## 变更类型

- [ ] feat 新功能
- [ ] fix 缺陷修复
- [ ] refactor 重构（不改变外部行为）
- [ ] docs 文档
- [ ] test 测试
- [ ] chore 构建/CI/依赖

## 影响范围（模块）

- [ ] 文档解析 document
- [ ] 知识点/关系抽取 ai
- [ ] 图谱 graph / Neo4j
- [ ] 学习路径 path
- [ ] RAG 问答 rag / qa
- [ ] 前端 UI
- [ ] CI / 工程配置

## 自检清单

- [ ] 本地已跑通 `npm run lint` 与 `npm run typecheck`
- [ ] 本地已跑通 `npm run build`
- [ ] 相关功能已补充/更新 Playwright 用例（如涉及主流程）
- [ ] 未提交 `.env` 等密钥文件
- [ ] 已更新相关文档（README / docs）

## 演示证据（可选）

<!-- 截图、录屏或接口返回，佐证功能可用（对应 S4 原型演示） -->

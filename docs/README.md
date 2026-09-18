# 交付文档索引（S1–S5 + 工程文档）

本目录存放浙江师范大学第九届服务外包大赛 A10 赛题的最终交付文档与工程文档。**当前状态：v1.0 交付候选，S1-S5 正文已填充。**

## 赛事交付材料 S1-S5

| 编号 | 文档 | 说明 | 文件 |
| --- | --- | --- | --- |
| S1 | 方案概要（Summary） | S1A ≤800 字概要（含离线实测数据）；S1B ≤5 分钟视频/音频（可选） | [S1-summary.md](./S1-summary.md) |
| S2 | 解决方案（Business Plan） | S2A 目标与服务模型 / S2B 组织管理与业务分析 / S2C 技术路线 / S2D 成本与可行性 | [S2-business-plan.md](./S2-business-plan.md) |
| S3 | 核心内容展示（Presentation） | PPT 14 页大纲 + 素材清单 + 演讲稿要点 | [S3-presentation.md](./S3-presentation.md) |
| S4 | 原型演示（Prototype） | S4A 系统提交（含 10 项完成标准）+ S4B 演示视频脚本 | [S4-prototype.md](./S4-prototype.md) |
| S5 | 团队完成过程（How did we do） | 7 维度过程记录 + 14 天里程碑 + PR/Issue 历史 | [S5-team-process.md](./S5-team-process.md) |

## 工程与测试文档

| 文档 | 内容 |
| --- | --- |
| [deployment.md](./deployment.md) | 部署与运维指南（Docker Compose / 单容器 / 裸 Node / Vercel+AuraDB 四方案 + 备份/还原/升级/回滚/排障 + CI/CD） |
| [prompt-engineering.md](./prompt-engineering.md) | 提示词工程完整记录（抽取 / 关系 / 问答系统 prompt 与 user prompt 模板） |
| [extraction-accuracy-report.md](./extraction-accuracy-report.md) | 知识抽取准确率测试报告（方法/人工标注基准/指标口径/错误模式/改进方向；**实测列待真实 Key 回填**） |
| [qa-test-set.md](./qa-test-set.md) | 智能问答测试集与结果（8 题三类：单点/对比/跨章节/教材外拒答；离线列已记录） |
| [graph-construction-example.md](./graph-construction-example.md) | 图谱构建示例（含原始文档片段与构建流程实录；运行截图待补） |

## 相关外部交付材料（在 `submissions/`）

| 材料 | 位置 |
| --- | --- |
| 项目概要介绍 | `submissions/项目概要介绍.md` |
| 项目详细方案（44KB 完整版） | `submissions/项目详细方案.md` |
| 演示视频脚本 | `submissions/演示视频脚本.md` |
| **安全审计报告**（本 sprint 新增） | `submissions/安全审计报告.md` |
| 赛题合规对照表（逐项验收） | `submissions/赛题合规对照表.md` |

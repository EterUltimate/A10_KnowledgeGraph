/**
 * Prompt 模板（对应 A10.md 十、十一、十五节）
 * 集中管理，便于做 Prompt 优化与评测对比（提示词工程完整记录见 docs/prompt-engineering.md）。
 */

/**
 * 知识点抽取 system prompt（A10.md 十节）
 * 设计要点：
 *  - 给出明确的输出字段与约束，配合 generateObject 的 zod schema 双保险；
 *  - 用"只抽取教材中出现"抑制幻觉，用"去重"减少冗余；
 *  - 明确知识点的粒度（可讲授的最小单元），避免抽出行级碎词。
 */
export const KNOWLEDGE_EXTRACTION_SYSTEM_PROMPT = `你是课程知识图谱构建助手，负责从教材文本中抽取知识点。
每个知识点包含字段：name（名称）、definition（定义，一句话）、chapter（所属章节）、difficulty（难度 1-5 的整数）。
要求：
1. 只抽取教材中真实出现且值得作为独立教学单元的知识点（概念、术语、算法、方法、结构等），不要臆造，不要抽取行级碎词。
2. name 需去重，避免同义重复；名称使用教材中的规范叫法。
3. definition 用一句话概括，不超过 40 字。
4. chapter 填写该知识点所在章节标题；若无法判断，填"未分类"。
5. difficulty 根据概念的抽象程度与先修要求评估：1=入门，5=很难。
6. 单次输入至少抽取 5 个知识点（若文本确实不足则按实际数量）。`;

/** 关系抽取 system prompt（A10.md 十一节，只允许三类关系） */
export const RELATION_EXTRACTION_SYSTEM_PROMPT = `你是课程知识图谱关系抽取助手。
给定一批知识点（含编号、名称与章节），请识别它们之间的关系，只允许以下三类：
- PREREQUISITE（前置）：学习 target 之前必须先掌握 source（source 是 target 的先修知识）。
- CONTAINS（包含）：source 在概念体系上包含 target（如"查找"包含"二分查找"）。
- RELATED（相关）：source 与 target 存在关联（可对比、可配合使用等），但无前置/包含关系。
要求：
1. source 与 target 必须从给定知识点列表中选取，逐字使用其名称，不得编造或改写。
2. 方向要正确：PREREQUISITE 是"先修 → 后学"；CONTAINS 是"整体 → 局部"。
3. 不要输出规定之外的关系类型；不确定的关系宁可标为 RELATED 或省略。
4. 尽量全面：同一对知识点可以同时有 CONTAINS 与 RELATED 之外的多重关系时只保留最有语义的一条。`;

/**
 * RAG 问答 system prompt（A10.md 十五节）
 * @param context 检索到的教材文本块拼接内容
 * @param courseName 课程名（默认《数据结构》，支持多课程）
 */
export function buildQASystemPrompt(context: string, courseName: string = '数据结构'): string {
  return `你是《${courseName}》课程智能问答助手。
请严格只根据下面提供的教材内容回答学生问题：
- 若教材内容能回答，回答需简洁准确，并在结尾用一行"参考章节：X、Y"标注所参考的章节。
- 若教材内容没有涉及，明确回答"教材中未涉及该内容"，不要编造。
- 不要使用教材之外的先验知识补充技术细节。

【教材内容】
${context}`;
}

/**
 * 构造知识点抽取的 user prompt。
 * @param text 已清洗、切块的教材文本
 * @param chapterHint 该文本块所属章节（切块阶段识别，为模型提供兜底信息）
 */
export function buildKnowledgeExtractionUserPrompt(text: string, chapterHint?: string): string {
  const hint = chapterHint && chapterHint !== '全文' ? `（本段所属章节参考：${chapterHint}）` : '';
  return `请从以下教材内容${hint}提取知识点：\n\n${text}`;
}

/**
 * 构造关系抽取的 user prompt。
 * 给知识点带上编号与章节信息，帮助模型理解概念体系层级。
 */
export function buildRelationExtractionUserPrompt(points: KnowledgePointBrief[]): string {
  const lines = points
    .map((p, i) => `${i + 1}. ${p.name}（章节：${p.chapter}）`)
    .join('\n');
  return `以下是已抽取的知识点列表：\n${lines}\n\n请识别这些知识点之间的三类关系（PREREQUISITE/CONTAINS/RELATED），并按 system 要求返回 JSON。`;
}

/** 关系抽取输入的知识点简要信息 */
export interface KnowledgePointBrief {
  name: string;
  chapter: string;
}

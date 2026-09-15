/**
 * 知识点抽取（A10.md 十节）
 * 输入：教材文本；输出：结构化知识点数组。
 * tier1：桩实现，返回示例数据；tier2 用 generateObject + zod schema 落地。
 */
import type { KnowledgePoint } from '@/types';
// TODO(tier2): import { generateObject } from 'ai';
// import { llm } from '@/lib/ai/provider';
// import { knowledgeExtractionSchema } from '@/lib/ai/schemas';
// import { KNOWLEDGE_EXTRACTION_SYSTEM_PROMPT, buildKnowledgeExtractionUserPrompt } from '@/lib/ai/prompts';

/**
 * 从教材文本抽取知识点。
 * @param text 已清洗、切块的教材文本
 * @param courseId 所属课程 id（可选）
 */
export async function extractKnowledge(text: string, courseId?: string): Promise<KnowledgePoint[]> {
  // TODO(tier2): 实现真实抽取
  // const { object } = await generateObject({
  //   model: llm,
  //   schema: knowledgeExtractionSchema,
  //   system: KNOWLEDGE_EXTRACTION_SYSTEM_PROMPT,
  //   prompt: buildKnowledgeExtractionUserPrompt(text),
  //   temperature: 0.2,
  // });
  // return object.knowledge.map((k, i) => ({ id: `${courseId ?? 'c'}-k${i}`, ...k, courseId }));

  void text;
  console.warn('[extractKnowledge] tier1 桩：返回示例知识点');
  return [
    {
      id: `${courseId ?? 'demo'}-k0`,
      name: '线性表',
      definition: '一种最基本、最简单、最常用的线性数据结构',
      chapter: '线性表',
      difficulty: 1,
      courseId,
    },
    {
      id: `${courseId ?? 'demo'}-k1`,
      name: '栈',
      definition: '一种后进先出的线性数据结构',
      chapter: '线性表',
      difficulty: 2,
      courseId,
    },
    {
      id: `${courseId ?? 'demo'}-k2`,
      name: '队列',
      definition: '一种先进先出的线性数据结构',
      chapter: '线性表',
      difficulty: 2,
      courseId,
    },
  ];
}

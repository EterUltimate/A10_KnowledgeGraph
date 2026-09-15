/**
 * 关系抽取（A10.md 十一节）
 * 第二次调用 LLM，根据已抽取的知识点识别关系，只允许三类。
 * tier1：桩实现，返回示例关系；tier2 用 generateObject + zod schema 落地。
 */
import { RELATION_TYPES, type KnowledgePoint, type Relation, type RelationType } from '@/types';
// TODO(tier2): import { generateObject } from 'ai';
// import { llm } from '@/lib/ai/provider';
// import { relationExtractionSchema } from '@/lib/ai/schemas';
// import { RELATION_EXTRACTION_SYSTEM_PROMPT, buildRelationExtractionUserPrompt } from '@/lib/ai/prompts';

/** 过滤：只保留允许的三类关系，其余丢弃（A10.md 十一节） */
export function filterValidRelations(relations: Relation[]): Relation[] {
  return relations.filter((r) => (RELATION_TYPES as readonly string[]).includes(r.type as RelationType));
}

/**
 * 根据知识点识别关系。
 * @param points 已抽取的知识点
 */
export async function extractRelations(points: KnowledgePoint[]): Promise<Relation[]> {
  // TODO(tier2): 实现真实抽取
  // const { object } = await generateObject({
  //   model: llm,
  //   schema: relationExtractionSchema,
  //   system: RELATION_EXTRACTION_SYSTEM_PROMPT,
  //   prompt: buildRelationExtractionUserPrompt(points.map((p) => p.name)),
  //   temperature: 0.2,
  // });
  // return filterValidRelations(object.relations);

  void points;
  console.warn('[extractRelations] tier1 桩：返回示例关系');
  return filterValidRelations([
    { source: '线性表', target: '栈', type: 'PREREQUISITE' },
    { source: '线性表', target: '队列', type: 'PREREQUISITE' },
  ]);
}

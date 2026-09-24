/**
 * 关系抽取（A10.md 十一节）
 * 第二次调用 LLM，根据已抽取的知识点识别关系，只允许三类；
 * 结果做三重清洗：类型白名单过滤 → 端点存在性校验 → 自环/重复去重。
 * 无 LLM Key（离线演示模式）：返回内置演示关系集。
 */
import { generateObject } from 'ai';
import type { KnowledgePoint, Relation } from '@/types';
import { getLLM, isLLMConfigured } from '@/lib/ai/provider';
import { relationExtractionSchema } from '@/lib/ai/schemas';
import {
  RELATION_EXTRACTION_SYSTEM_PROMPT,
  buildRelationExtractionUserPrompt,
  type KnowledgePointBrief,
} from '@/lib/ai/prompts';
import { DEMO_RELATIONS } from '@/lib/ai/demo-dataset';

/** 单次送入关系抽取的知识点数量上限（防上下文超长） */
const RELATION_BATCH_SIZE = 40;

/** 过滤：只保留允许的三类关系，其余丢弃（A10.md 十一节） */
export function filterValidRelations(relations: Relation[]): Relation[] {
  return relations.filter((r) =>
    ['PREREQUISITE', 'CONTAINS', 'RELATED'].includes(r.type),
  );
}

/**
 * 关系结果清洗：端点必须存在于知识点列表、去自环、去重复。
 */
export function sanitizeRelations(relations: Relation[], points: KnowledgePoint[]): Relation[] {
  const known = new Set(points.map((p) => p.name.replace(/\s+/g, '')));
  const seen = new Set<string>();
  const result: Relation[] = [];
  for (const r of relations) {
    const source = r.source.replace(/\s+/g, '');
    const target = r.target.replace(/\s+/g, '');
    if (source === target) continue;
    if (!known.has(source) || !known.has(target)) continue;
    const key = `${source}|${target}|${r.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ source: r.source.trim(), target: r.target.trim(), type: r.type });
  }
  return result;
}

/**
 * 根据知识点识别关系。
 * @param points 已抽取的知识点
 */
export async function extractRelations(points: KnowledgePoint[]): Promise<Relation[]> {
  if (points.length < 2) return [];

  // 离线演示模式
  if (!isLLMConfigured()) {
    console.warn('[extractRelations] 未配置 LLM Key，使用内置演示关系集（离线模式）');
    const names = new Set(points.map((p) => p.name));
    return filterValidRelations(
      DEMO_RELATIONS.filter((r) => names.has(r.source) && names.has(r.target)),
    );
  }

  const briefs: KnowledgePointBrief[] = points.map((p) => ({ name: p.name, chapter: p.chapter }));
  const all: Relation[] = [];

  // 分批抽取，避免知识点较多时超出上下文
  for (let i = 0; i < briefs.length; i += RELATION_BATCH_SIZE) {
    const batch = briefs.slice(i, i + RELATION_BATCH_SIZE);
    try {
      const { object } = await generateObject({
        model: getLLM(),
        schema: relationExtractionSchema,
        system: RELATION_EXTRACTION_SYSTEM_PROMPT,
        prompt: buildRelationExtractionUserPrompt(batch),
        temperature: 0.2,
      });
      all.push(...object.relations);
    } catch (err) {
      console.warn(`[extractRelations] 第 ${Math.floor(i / RELATION_BATCH_SIZE) + 1} 批抽取失败，跳过：`,
        err instanceof Error ? err.message : err);
    }
  }

  return sanitizeRelations(filterValidRelations(all), points);
}

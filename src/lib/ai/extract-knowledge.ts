/**
 * 知识点抽取（A10.md 十节）
 * 有 LLM Key：按文本块分批 generateObject（zod schema 强制 JSON），合并去重。
 * 无 LLM Key（离线演示模式）：返回内置《数据结构》演示数据集，保证全流程可跑通。
 */
import { generateObject } from 'ai';
import type { KnowledgePoint } from '@/types';
import { llm, isLLMConfigured } from '@/lib/ai/provider';
import { knowledgeExtractionSchema } from '@/lib/ai/schemas';
import {
  KNOWLEDGE_EXTRACTION_SYSTEM_PROMPT,
  buildKnowledgeExtractionUserPrompt,
} from '@/lib/ai/prompts';
import { DEMO_COURSE_ID, DEMO_KNOWLEDGE } from '@/lib/ai/demo-dataset';
import { chunkText } from '@/services/document.service';

/** 参与抽取的最大文本块数（控制 60s 性能预算） */
const MAX_EXTRACTION_CHUNKS = 6;
/** 抽取结果的知识点数量上限（防跑飞） */
const MAX_KNOWLEDGE_POINTS = 80;

/** 名称归一化：去空白，用于去重判断 */
function normalizeName(name: string): string {
  return name.replace(/\s+/g, '');
}

/**
 * 从教材文本抽取知识点。
 * @param text 已清洗的教材文本（内部自行切块分批抽取）
 * @param courseId 所属课程 id（可选）
 */
export async function extractKnowledge(text: string, courseId?: string): Promise<KnowledgePoint[]> {
  // 离线演示模式：未配置 LLM Key 时返回内置演示数据
  if (!isLLMConfigured()) {
    console.warn('[extractKnowledge] 未配置 LLM Key，使用内置演示数据集（离线模式）');
    return DEMO_KNOWLEDGE.map((k) => ({ ...k, courseId: courseId ?? DEMO_COURSE_ID }));
  }

  const chunks = chunkText(text, 1600).slice(0, MAX_EXTRACTION_CHUNKS);
  if (chunks.length === 0) return [];

  const seen = new Set<string>();
  const merged: KnowledgePoint[] = [];

  for (const chunk of chunks) {
    try {
      const { object } = await generateObject({
        model: llm,
        schema: knowledgeExtractionSchema,
        system: KNOWLEDGE_EXTRACTION_SYSTEM_PROMPT,
        prompt: buildKnowledgeExtractionUserPrompt(chunk.content, chunk.chapter),
        temperature: 0.2,
      });
      for (const k of object.knowledge) {
        const key = normalizeName(k.name);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        merged.push({
          id: `k-${key}`,
          name: k.name.trim(),
          definition: k.definition.trim(),
          chapter: k.chapter.trim() || chunk.chapter,
          difficulty: Math.min(5, Math.max(1, Math.round(k.difficulty))),
          courseId,
        });
        if (merged.length >= MAX_KNOWLEDGE_POINTS) return merged;
      }
    } catch (err) {
      // 单块抽取失败不中断整体流程（允许一定冗余与缺失，见准确率测试报告）
      console.warn('[extractKnowledge] 单块抽取失败，跳过：', err instanceof Error ? err.message : err);
    }
  }
  return merged;
}

/**
 * LLM 结构化输出 schema（zod）
 * 用途：配合 Vercel AI SDK generateObject 强制模型返回严格 JSON，
 * 规避 A10.md 二十节"LLM 输出不是 JSON"的风险。
 */
import { z } from 'zod';
import { RELATION_TYPES } from '@/types';

/** 单个知识点 schema（A10.md 十节示例输出结构） */
export const knowledgePointSchema = z.object({
  name: z.string().describe('知识点名称，例如"栈"'),
  definition: z.string().describe('知识点定义，一句话概述'),
  chapter: z.string().describe('所属章节，例如"线性表"'),
  difficulty: z.number().int().min(1).max(5).describe('难度 1-5'),
});

/** 知识点抽取结果 schema（对应 { "knowledge": [...] }） */
export const knowledgeExtractionSchema = z.object({
  knowledge: z.array(knowledgePointSchema).describe('从教材文本中抽取的知识点列表'),
});

/** 单个关系 schema（A10.md 十一节，仅允许三类关系） */
export const relationSchema = z.object({
  source: z.string().describe('起点知识点名称'),
  target: z.string().describe('终点知识点名称'),
  type: z.enum(RELATION_TYPES).describe('关系类型：PREREQUISITE/CONTAINS/RELATED'),
});

/** 关系抽取结果 schema（对应 { "relations": [...] }） */
export const relationExtractionSchema = z.object({
  relations: z.array(relationSchema).describe('知识点之间的关系列表，只允许三类'),
});

export type KnowledgeExtraction = z.infer<typeof knowledgeExtractionSchema>;
export type RelationExtraction = z.infer<typeof relationExtractionSchema>;

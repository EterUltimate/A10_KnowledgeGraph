/**
 * RAG 智能问答服务（A10.md 十五节：轻量 RAG）
 * 14 天简化方案：文本切块 + 关键词/简单相似度检索 + LLM 生成。
 * tier1：桩实现；tier2 落地检索与 streamText 生成。增强项（Embedding+FAISS/Chroma）非前置条件。
 */
import type { QAResponse, TextChunk } from '@/types';
import { config } from '@/lib/config';
// TODO(tier2): import { streamText, generateText } from 'ai';
// import { llm } from '@/lib/ai/provider';
// import { buildQASystemPrompt } from '@/lib/ai/prompts';

/** 内存态文本块存储（tier1 占位；tier2 可换持久化存储或 Neo4j/向量库） */
const chunkStore: TextChunk[] = [];

/** 保存教材文本块（A10.md 十五节 步骤 24） */
export function saveChunks(chunks: TextChunk[]): void {
  chunkStore.push(...chunks);
}

/** 读取某课程的文本块 */
export function getChunks(courseId?: string): TextChunk[] {
  if (!courseId) return [...chunkStore];
  return chunkStore.filter((c) => c.courseId === courseId);
}

/**
 * 检索最相关的 3-5 个文本块（A10.md 十五节 步骤 26）。
 * tier1：占位返回前 topK 个块；tier2：实现关键词/相似度检索。
 */
export async function retrieve(question: string, courseId?: string): Promise<TextChunk[]> {
  // TODO(tier2): 基于关键词命中/简单相似度对 chunk 打分排序
  void question;
  return getChunks(courseId).slice(0, config.rag.topK);
}

/**
 * 生成问答结果（A10.md 十五节 步骤 27-29）：
 * 把问题与检索结果一起发给 LLM，要求只根据教材回答，并返回参考章节。
 * 非流式版本，供需要完整答案的场景使用。
 */
export async function answer(question: string, courseId?: string): Promise<QAResponse> {
  const chunks = await retrieve(question, courseId);
  // TODO(tier2): 用 generateText({ model: llm, system: buildQASystemPrompt(context), prompt: question })
  console.warn('[rag.answer] tier1 桩', question);
  return {
    answer: '（tier1 占位）此处将由 LLM 基于检索到的教材内容生成答案。',
    references: chunks.map((c) => ({
      chunkId: c.id,
      chapter: c.chapter,
      source: c.source,
      snippet: c.content.slice(0, 80),
    })),
  };
}

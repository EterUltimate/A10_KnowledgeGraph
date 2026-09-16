/**
 * RAG 智能问答服务（A10.md 十五节：轻量 RAG）
 * 流程：切块入库 → 关键词检索打分 → LLM 生成（带引用）/ 离线抽取式兜底。
 * 检索：中文按相邻双字（bigram）+ 英文按单词分词，对文本块做词频打分排序；
 *      无需向量库，零依赖即可满足"检索增强 + 引用标注"的赛题要求。
 */
import path from 'path';
import { generateText } from 'ai';
import type { QAResponse, TextChunk } from '@/types';
import { config, isLLMConfigured } from '@/lib/config';
import { llm } from '@/lib/ai/provider';
import { buildQASystemPrompt } from '@/lib/ai/prompts';
import { readJsonFile, writeJsonFile } from '@/lib/db/json-file';

/** chunks.json 持久化结构：courseId -> 文本块列表（重新上传同一课程会整体覆盖） */
type ChunkFileData = Record<string, TextChunk[]>;

const globalForChunks = globalThis as unknown as { __a10Chunks?: ChunkFileData };

function chunksFile(): string {
  return path.join(config.store.dataDir, 'chunks.json');
}

function loadChunkStore(): ChunkFileData {
  if (!globalForChunks.__a10Chunks) {
    globalForChunks.__a10Chunks = readJsonFile<ChunkFileData>(chunksFile(), {});
  }
  return globalForChunks.__a10Chunks;
}

/** 保存教材文本块（按课程覆盖写入，重新上传同一课程时替换而非追加，A10.md 十五节 步骤 24） */
export function saveChunks(chunks: TextChunk[]): void {
  const store = loadChunkStore();
  // 按 courseId 分组，同一课程的块整体覆盖（避免重复上传导致语料膨胀）
  const grouped = new Map<string, TextChunk[]>();
  for (const chunk of chunks) {
    const list = grouped.get(chunk.courseId) ?? [];
    list.push(chunk);
    grouped.set(chunk.courseId, list);
  }
  for (const [courseId, courseChunks] of grouped) {
    store[courseId] = courseChunks;
  }
  writeJsonFile(chunksFile(), store);
}

/** 读取某课程的文本块 */
export function getChunks(courseId?: string): TextChunk[] {
  const store = loadChunkStore();
  if (!courseId) return Object.values(store).flat();
  return [...(store[courseId] ?? [])];
}

/**
 * 分词：中文按相邻双字（bigram），英文/数字按连续串，全部小写。
 * 双字分词对中文检索的召回明显优于逐字切分，且无需词典。
 */
export function tokenize(text: string): string[] {
  const normalized = text.toLowerCase();
  const tokens: string[] = [];
  const latinRuns = normalized.match(/[a-z0-9]+/g) ?? [];
  tokens.push(...latinRuns);
  // 去掉英文数字串后，剩余部分按双字切分
  const cjkPart = normalized.replace(/[a-z0-9]+/g, ' ');
  for (let i = 0; i < cjkPart.length - 1; i++) {
    const a = cjkPart[i];
    const b = cjkPart[i + 1];
    if (/[\u4e00-\u9fff]/.test(a) && /[\u4e00-\u9fff]/.test(b)) {
      tokens.push(a + b);
    }
  }
  return tokens;
}

/**
 * 单字分词（辅助信号）：问句措辞与教材原文不一致时（如"特点" vs 原文"特性"），
 * 双字词全部落空，单字命中可作为兜底信号。打分时按低权重（0.3）计入，避免噪声主导排序。
 */
export function tokenizeUnigrams(text: string): string[] {
  const cjkPart = text.toLowerCase().replace(/[a-z0-9]+/g, ' ');
  return [...new Set(cjkPart.match(/[\u4e00-\u9fff]/g) ?? [])];
}

/** 单块得分：双字/英文词命中 1 分权重，单字命中 0.3 分，均按 (1 + ln 词频) 计次 */
function scoreChunk(chunk: TextChunk, queryTokens: string[], queryUnigrams: string[]): number {
  if (queryTokens.length === 0 && queryUnigrams.length === 0) return 0;
  const content = chunk.content.toLowerCase();
  const chapter = (chunk.chapter ?? '').toLowerCase();
  let score = 0;
  for (const token of [...new Set(queryTokens)]) {
    let count = 0;
    let idx = content.indexOf(token);
    while (idx !== -1) {
      count++;
      idx = content.indexOf(token, idx + token.length);
    }
    if (count > 0) score += 1 + Math.log(count);
    // 章节名命中加成（用户问题常含章节线索）
    if (chapter && chapter.includes(token)) score += 0.5;
  }
  for (const ch of queryUnigrams) {
    if (content.includes(ch)) score += 0.3;
  }
  const denom = Math.sqrt(queryTokens.length + queryUnigrams.length) || 1;
  return score / denom;
}

/**
 * 检索最相关的 topK 个文本块（A10.md 十五节 步骤 26）。
 * 打分排序后取前 N；全部零分时返回前 topK 块作为兜底上下文。
 */
export async function retrieve(question: string, courseId?: string): Promise<TextChunk[]> {
  const chunks = getChunks(courseId);
  if (chunks.length === 0) return [];
  const tokens = tokenize(question);
  const unigrams = tokenizeUnigrams(question);
  const scored = chunks
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, tokens, unigrams) }))
    .sort((a, b) => b.score - a.score);
  const top = scored.slice(0, config.rag.topK);
  // 兜底：若问题与所有块都不匹配，仍给前 topK 块（LLM 可据此回答"教材中未涉及"）
  const meaningful = top.filter((t) => t.score > 0);
  return (meaningful.length > 0 ? meaningful : top).map((t) => t.chunk);
}

/** 把文本块拼成问答上下文（带章节标注） */
export function buildContext(chunks: TextChunk[]): string {
  return chunks
    .map((c) => `【${c.chapter ?? '未分类'}】${c.content}`)
    .join('\n\n');
}

/** 从 chunk 构造引用列表 */
export function buildReferences(chunks: TextChunk[]): QAResponse['references'] {
  return chunks.map((c) => ({
    chunkId: c.id,
    chapter: c.chapter,
    source: c.source,
    snippet: c.content.slice(0, 120),
  }));
}

/** 从文本块中挑出与问题最相关的 2-3 句话（离线抽取式回答用） */
function extractiveAnswer(question: string, chunks: TextChunk[]): string {
  const tokens = [...new Set(tokenize(question))];
  const unigrams = tokenizeUnigrams(question);
  const sentences: Array<{ text: string; score: number; chapter: string }> = [];
  for (const chunk of chunks) {
    for (const sentence of chunk.content.split(/(?<=[。！？!?])/)) {
      const s = sentence.trim();
      if (s.length < 6) continue;
      let score = 0;
      for (const token of tokens) {
        if (s.toLowerCase().includes(token)) score += 1;
      }
      for (const ch of unigrams) {
        if (s.includes(ch)) score += 0.3;
      }
      if (score > 0) sentences.push({ text: s, score, chapter: chunk.chapter ?? '未分类' });
    }
  }
  const top = sentences.sort((a, b) => b.score - a.score).slice(0, 3);
  if (top.length === 0) {
    return '（离线检索模式）教材库中暂未检索到与该问题直接相关的内容，请换个说法或先上传课程资料。';
  }
  const chapters = [...new Set(top.map((s) => s.chapter))];
  return [
    `（离线检索模式：以下内容摘自教材原文，供参考）`,
    '',
    ...top.map((s) => `- ${s.text}`),
    '',
    `参考章节：${chapters.join('、')}`,
  ].join('\n');
}

/**
 * 生成问答结果（A10.md 十五节 步骤 27-29，非流式版本）。
 * 有 LLM：检索上下文交给大模型生成，要求只依据教材回答并标注章节；
 * 无 LLM（离线模式）：返回抽取式答案（教材原句摘录），零 API Key 可演示。
 */
export async function answer(
  question: string,
  courseId?: string,
  courseName?: string,
): Promise<QAResponse> {
  const chunks = await retrieve(question, courseId);
  const references = buildReferences(chunks);

  if (!isLLMConfigured()) {
    return { answer: extractiveAnswer(question, chunks), references };
  }

  try {
    const { text } = await generateText({
      model: llm,
      system: buildQASystemPrompt(buildContext(chunks) || '（暂无检索到的教材内容）', courseName),
      prompt: question,
      temperature: 0.3,
    });
    return { answer: text, references };
  } catch (err) {
    console.warn('[rag.answer] LLM 调用失败，降级为离线抽取式回答：', err instanceof Error ? err.message : err);
    return { answer: extractiveAnswer(question, chunks), references };
  }
}

/**
 * RAG 向量索引：把教材文本块嵌入为向量并持久化到 data/store/embeddings.json。
 *
 * 设计要点：
 *  - 与 chunks.json 解耦（语料本身不变，向量单独成表，chunkId → {hash, vector}）；
 *  - 按「嵌入文本内容哈希」判断是否需要重嵌，内容改了才重算，幂等且省调用；
 *  - 未配置嵌入（isEmbeddingConfigured=false）时 ensureEmbeddings 直接返回空表，
 *    retrieve 据此回退纯关键词检索；网络/模型异常向上抛出，由 retrieve 捕获后回退。
 */
import path from 'node:path';
import crypto from 'node:crypto';
import type { TextChunk } from '@/types';
import { config } from '@/lib/config';
import { readJsonFile, writeJsonFile } from '@/lib/db/json-file';
import { isEmbeddingConfigured, embedTexts } from '@/lib/ai/provider';

interface EmbeddingEntry {
  /** 被嵌入文本的 sha1，用于失效判定 */
  hash: string;
  vector: number[];
}
type EmbeddingFile = Record<string, EmbeddingEntry>;

const globalForEmbed = globalThis as unknown as { __a10Embeddings?: EmbeddingFile };

/** 每批嵌入的最大条数（避免单次请求过大） */
const EMBED_BATCH = 32;

function embeddingFile(): string {
  return path.join(config.store.dataDir, 'embeddings.json');
}

function loadCache(): EmbeddingFile {
  if (!globalForEmbed.__a10Embeddings) {
    globalForEmbed.__a10Embeddings = readJsonFile<EmbeddingFile>(embeddingFile(), {});
  }
  return globalForEmbed.__a10Embeddings;
}

function persist(): void {
  writeJsonFile(embeddingFile(), globalForEmbed.__a10Embeddings ?? {});
}

/** 实际被嵌入的文本：章节线索 + 正文，提升语义区分度 */
function embedText(chunk: TextChunk): string {
  const chapter = chunk.chapter ? `${chunk.chapter}。` : '';
  return `${chapter}${chunk.content}`.trim();
}

function hashText(s: string): string {
  return crypto.createHash('sha1').update(s).digest('hex');
}

/**
 * 确保给定文本块都有向量（缺失或内容变更的批量嵌入并落盘）。
 * 返回 chunkId → 向量。未启用嵌入时返回空 Map（调用方据此走关键词检索）。
 * 注意：本函数可能抛错（网络/配额/模型端点异常），由调用方 retrieve 捕获并回退。
 */
export async function ensureEmbeddings(chunks: TextChunk[]): Promise<Map<string, number[]>> {
  if (!isEmbeddingConfigured()) return new Map();
  const cache = loadCache();
  const result = new Map<string, number[]>();

  // 命中缓存的直接收集，未命中的收集待嵌入
  const pending: { chunk: TextChunk; text: string; hash: string }[] = [];
  for (const chunk of chunks) {
    const text = embedText(chunk);
    const hash = hashText(text);
    const entry = cache[chunk.id];
    if (entry && entry.hash === hash && entry.vector?.length) {
      result.set(chunk.id, entry.vector);
    } else {
      pending.push({ chunk, text, hash });
    }
  }

  // 分批嵌入
  for (let i = 0; i < pending.length; i += EMBED_BATCH) {
    const batch = pending.slice(i, i + EMBED_BATCH);
    const vectors = await embedTexts(batch.map((p) => p.text));
    batch.forEach((p, j) => {
      const vector = vectors[j];
      if (!vector || vector.length === 0) return;
      cache[p.chunk.id] = { hash: p.hash, vector };
      result.set(p.chunk.id, vector);
    });
  }

  if (pending.length > 0) persist();
  return result;
}

/** 清除某些课程的向量缓存（删除课程 / 重新上传时可选调用，避免脏数据堆积） */
export function evictEmbeddings(chunkIds: string[]): void {
  if (chunkIds.length === 0) return;
  const cache = loadCache();
  let changed = false;
  for (const id of chunkIds) {
    if (cache[id]) {
      delete cache[id];
      changed = true;
    }
  }
  if (changed) persist();
}

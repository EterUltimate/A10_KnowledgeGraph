/**
 * RAG 向量检索纯函数与回退路径单元测试。
 * 覆盖：余弦相似度、归一化、混合打分融合，以及「未配置嵌入时 ensureEmbeddings 返回空表」的回退保证。
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';

// DATA_DIR 在模块加载前注入，避免向量缓存测试污染仓库 data/
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'a10-vec-test-'));

const { clamp01, cosineSimilarity, normalizeScores, hybridScores } = await import(
  '@/lib/rag/vector'
);
const { ensureEmbeddings } = await import('@/lib/rag/embedding-index');
import type { TextChunk } from '@/types';

describe('clamp01', () => {
  it('钳制越界与非法值', () => {
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(3)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
    expect(clamp01(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('cosineSimilarity', () => {
  it('同向=1，正交=0', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 6);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6);
  });
  it('维度不一致 / 空 / 零向量返回 0', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe('normalizeScores', () => {
  it('按最大值归一', () => {
    expect(normalizeScores([0, 2, 4])).toEqual([0, 0.5, 1]);
  });
  it('全 0（或负）返回全 0，保持顺序交由稳定排序', () => {
    expect(normalizeScores([0, 0, 0])).toEqual([0, 0, 0]);
  });
});

describe('hybridScores', () => {
  const kw = [3, 1, 0]; // 归一 → [1, 0.333, 0]

  it('无向量（全 null）→ 权重自动降 0，等价纯关键词归一', () => {
    const out = hybridScores(kw, [null, null, null], 0.6);
    expect(out[0]).toBeCloseTo(1, 6);
    expect(out[2]).toBe(0);
    expect(out[0]).toBeGreaterThan(out[1]);
  });

  it('权重 0 → 纯关键词（忽略向量）', () => {
    const out = hybridScores(kw, [0.9, 0.1, 0.8], 0);
    expect(out).toEqual(normalizeScores(kw));
  });

  it('向量可翻转弱关键词块的排名', () => {
    // 第 2 块关键词分低，但向量高度相关，权重拉满后应升到第一
    const out = hybridScores(kw, [0.1, 1.0, 0.0], 1);
    expect(out[1]).toBeCloseTo(1, 6);
    expect(out[1]).toBeGreaterThan(out[0]);
  });

  it('缺向量的块只按关键词分，不被向量项惩罚', () => {
    const out = hybridScores(kw, [0.5, null, 0.2], 0.5);
    // 第 2 块 vec=null → 结果 = 其归一关键词分
    expect(out[1]).toBeCloseTo(normalizeScores(kw)[1], 6);
  });
});

describe('ensureEmbeddings 回退', () => {
  it('未配置嵌入模型时返回空表（retrieve 据此走纯关键词）', async () => {
    // 测试环境无 LLM_API_KEY / LLM_EMBED_MODEL → isEmbeddingConfigured=false
    const chunks: TextChunk[] = [
      { id: 'c1', courseId: 'x', content: '栈是后进先出的结构。', chapter: '第3章' },
    ];
    const map = await ensureEmbeddings(chunks);
    expect(map.size).toBe(0);
  });
});

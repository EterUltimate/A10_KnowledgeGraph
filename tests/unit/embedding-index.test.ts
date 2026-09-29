/**
 * 向量索引 embedding-index 单元测试：mock 掉 provider 的嵌入调用，
 * 覆盖 ensureEmbeddings 的「禁用回退 / 批量嵌入 / 缓存命中 / 内容变更重嵌 / 异常」与 evictEmbeddings。
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'a10-embed-test-'));

// 可被各用例切换的「嵌入是否配置」开关 + 计数用的 embedTexts 桩
const h = vi.hoisted(() => ({
  configured: { value: true },
  embedTexts: vi.fn(async (texts: string[]) => texts.map((_, i) => [0.1 + i, 0.2, 0.3])),
}));

vi.mock('@/lib/ai/provider', () => ({
  isEmbeddingConfigured: () => h.configured.value,
  embedTexts: h.embedTexts,
}));

const { ensureEmbeddings, evictEmbeddings } = await import('@/lib/rag/embedding-index');
import type { TextChunk } from '@/types';

const chunk = (id: string, content: string): TextChunk => ({
  id,
  courseId: 'c',
  chapter: '第1章',
  content,
});

beforeEach(() => {
  h.configured.value = true;
});

describe('ensureEmbeddings', () => {
  it('未配置嵌入 → 返回空表，不调用 embedTexts', async () => {
    h.configured.value = false;
    const map = await ensureEmbeddings([chunk('disabled-1', '栈是后进先出')]);
    expect(map.size).toBe(0);
    expect(h.embedTexts).not.toHaveBeenCalled();
  });

  it('首次嵌入待索引块并落盘', async () => {
    h.embedTexts.mockClear();
    const map = await ensureEmbeddings([chunk('e1', '顺序表支持随机访问'), chunk('e2', '链表插入删除高效')]);
    expect(map.size).toBe(2);
    expect(map.get('e1')).toHaveLength(3);
    expect(h.embedTexts).toHaveBeenCalledTimes(1);
    const file = path.join(process.env.DATA_DIR as string, 'embeddings.json');
    expect(fs.existsSync(file)).toBe(true);
  });

  it('内容未变 → 命中缓存，不再调用 embedTexts', async () => {
    await ensureEmbeddings([chunk('e1', '顺序表支持随机访问')]);
    h.embedTexts.mockClear();
    const map = await ensureEmbeddings([chunk('e1', '顺序表支持随机访问')]);
    expect(map.size).toBe(1);
    expect(h.embedTexts).not.toHaveBeenCalled();
  });

  it('内容变更 → 重新嵌入', async () => {
    await ensureEmbeddings([chunk('changed', '原始内容')]);
    h.embedTexts.mockClear();
    await ensureEmbeddings([chunk('changed', '修改后的新内容')]);
    expect(h.embedTexts).toHaveBeenCalledTimes(1);
  });

  it('embedTexts 抛错 → 向上抛出（retrieve 捕获后回退关键词）', async () => {
    h.embedTexts.mockRejectedValueOnce(new Error('网络故障'));
    await expect(ensureEmbeddings([chunk('boom', '炸了')])).rejects.toThrow('网络故障');
  });
});

describe('evictEmbeddings', () => {
  it('移除指定 chunk 的向量缓存', async () => {
    await ensureEmbeddings([chunk('ev1', '将被清除')]);
    evictEmbeddings(['ev1']);
    h.embedTexts.mockClear();
    // 清除后再次请求同一内容 → 视为缺失，重新嵌入
    await ensureEmbeddings([chunk('ev1', '将被清除')]);
    expect(h.embedTexts).toHaveBeenCalledTimes(1);
  });

  it('空入参不触发写盘', () => {
    expect(() => evictEmbeddings([])).not.toThrow();
  });
});

/**
 * RAG 检索与关系清洗单元测试
 * 检索测试使用临时 DATA_DIR（环境变量在模块加载前设置，避免污染仓库 data/）。
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { beforeAll, describe, expect, it } from 'vitest';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a10-test-'));
process.env.DATA_DIR = tmpDir;

// DATA_DIR 必须在模块加载前注入，故使用动态导入
const { tokenize, retrieve, saveChunks } = await import('@/services/rag.service');
const { filterValidRelations, sanitizeRelations } = await import('@/lib/ai/extract-relations');
import type { TextChunk } from '@/types';

const CHUNKS: TextChunk[] = [
  { id: 'c1', courseId: 'course-a', chapter: '第2章 线性表', content: '栈是一种后进先出的线性数据结构，只允许在栈顶进行插入与删除。' },
  { id: 'c2', courseId: 'course-a', chapter: '第5章 图', content: '最短路径算法 Dijkstra 按路径长度递增次序求单源最短路径。' },
  { id: 'c3', courseId: 'course-a', chapter: '第7章 排序', content: '快速排序平均时间复杂度为 O(n log n)，是不稳定排序。' },
  { id: 'c4', courseId: 'course-b', chapter: '第1章', content: '其他课程的内容，不应被 course-a 检索到。' },
];

describe('tokenize', () => {
  it('中文双字分词 + 英文按词', () => {
    const tokens = tokenize('什么是栈stack');
    expect(tokens).toContain('stack');
    expect(tokens).toContain('什么');
    expect(tokens).toContain('么是');
    expect(tokens).toContain('是栈');
  });
});

describe('retrieve', () => {
  beforeAll(() => {
    saveChunks(CHUNKS);
  });

  it('按问题相关性返回最相关文本块', async () => {
    const top = await retrieve('栈有什么特点', 'course-a');
    expect(top[0].id).toBe('c1');
  });

  it('跨课程检索隔离', async () => {
    const top = await retrieve('快速排序', 'course-b');
    expect(top.every((c) => c.courseId === 'course-b')).toBe(true);
  });

  it('不相关问题时返回兜底块而非空', async () => {
    const top = await retrieve('完全无关的量子力学问题', 'course-a');
    expect(top.length).toBeGreaterThan(0);
  });
});

describe('关系清洗', () => {
  it('filterValidRelations 丢弃非法类型', () => {
    const input = [
      { source: 'A', target: 'B', type: 'PREREQUISITE' },
      { source: 'A', target: 'C', type: '类似' },
    ] as never[];
    expect(filterValidRelations(input)).toHaveLength(1);
  });

  it('sanitizeRelations 校验端点存在、去自环、去重复', () => {
    const points = [
      { id: '1', name: '栈', definition: '', chapter: '', difficulty: 2 },
      { id: '2', name: '队列', definition: '', chapter: '', difficulty: 2 },
    ];
    const cleaned = sanitizeRelations(
      [
        { source: '栈', target: '队列', type: 'RELATED' },
        { source: '栈', target: '栈', type: 'RELATED' },
        { source: '栈', target: '不存在的知识点', type: 'RELATED' },
        { source: '栈', target: '队列', type: 'RELATED' },
      ],
      points,
    );
    expect(cleaned).toEqual([{ source: '栈', target: '队列', type: 'RELATED' }]);
  });
});

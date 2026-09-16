/**
 * 文档解析服务单元测试：类型识别、编码探测、清洗、章节感知切块
 */
import { describe, expect, it } from 'vitest';
import { cleanText, chunkText, detectFileType, decodeText, splitByChapter } from '@/services/document.service';

describe('detectFileType', () => {
  it('识别 pdf/txt，其他返回 null', () => {
    expect(detectFileType('数据结构.pdf')).toBe('pdf');
    expect(detectFileType('notes.TXT')).toBe('txt');
    expect(detectFileType('课件.docx')).toBeNull();
  });
});

describe('decodeText', () => {
  it('UTF-8 正常解码', () => {
    expect(decodeText(Buffer.from('栈和队列', 'utf-8'))).toBe('栈和队列');
  });

  it('GBK 编码自动回退解码（UTF-8 非法字节触发回退）', () => {
    // GBK 双字节序列（"性表"），在 UTF-8 中是非法序列，应触发回退
    const gbkBytes = Buffer.from([0xd0, 0xd4, 0xb1, 0xed]);
    const decoded = decodeText(gbkBytes);
    // 回退后结果应与 TextDecoder('gbk') 一致，且不含替换符
    expect(decoded).toBe(new TextDecoder('gbk').decode(gbkBytes));
    expect(decoded).not.toContain('\uFFFD');
  });
});

describe('cleanText', () => {
  it('去除独立成行的页码', () => {
    const raw = '第一章 绪论\n12\n\n数据结构是核心课程\n3/45\n- 7 -';
    const cleaned = cleanText(raw);
    expect(cleaned).toContain('第一章 绪论');
    expect(cleaned).toContain('数据结构是核心课程');
    expect(cleaned).not.toMatch(/^\s*12\s*$/m);
    expect(cleaned).not.toMatch(/^\s*3\/45\s*$/m);
  });

  it('统一换行符并压缩多余空行', () => {
    const cleaned = cleanText('a\r\n\r\n\r\n\r\nb');
    expect(cleaned).toBe('a\n\nb');
  });
});

describe('splitByChapter / chunkText', () => {
  const sample = [
    '第1章 绪论',
    '数据结构研究数据的组织方式。算法是有限步骤的序列。',
    '第2章 线性表',
    '线性表是最基本的数据结构。顺序表用连续内存存储。',
  ].join('\n');

  it('按章节标题切分，段落归属正确', () => {
    const sections = splitByChapter(sample);
    expect(sections).toHaveLength(2);
    expect(sections[0].chapter).toBe('第1章 绪论');
    expect(sections[0].body).toContain('数据结构');
    expect(sections[1].chapter).toBe('第2章 线性表');
    expect(sections[1].body).toContain('顺序表');
  });

  it('无章节标题时整体归入"全文"', () => {
    const sections = splitByChapter('一段没有章节结构的文字。');
    expect(sections).toHaveLength(1);
    expect(sections[0].chapter).toBe('全文');
  });

  it('chunkText 按目标大小打包且不跨章节', () => {
    const longBody = '知识点内容。'.repeat(300); // ~1800 字
    const text = `第1章 A\n${longBody}\n第2章 B\n第二个章节内容。`;
    const chunks = chunkText(text, 400);
    expect(chunks.length).toBeGreaterThan(1);
    // 所有块都不跨章节：含"第2章"内容的块章节应为 B
    const chapterSet = new Set(chunks.map((c) => c.chapter));
    expect(chapterSet.has('第1章 A')).toBe(true);
    expect(chapterSet.has('第2章 B')).toBe(true);
    for (const c of chunks) {
      expect(c.content.length).toBeLessThanOrEqual(450); // 允许少量边界余量
    }
  });
});

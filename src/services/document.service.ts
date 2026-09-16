/**
 * 文档解析服务（A10.md 十二节：上传 → 解析 → 清洗 → 切块）
 * tier2 真实实现：
 *  - PDF：pdf-parse（Next 打包排除已配置，走 lib 子路径避免其调试入口）
 *  - TXT：UTF-8 优先、乱码自动回退 GBK（国内教材常见编码）
 *  - 清洗：去页码/页眉/控制字符、压缩空行
 *  - 切块：章节标题感知（第X章/节/讲），按段落打包至目标块大小
 */
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import type { TextChunk } from '@/types';
import { config } from '@/lib/config';

export type SupportedFileType = 'pdf' | 'txt';

/** 根据文件名推断类型（仅支持 PDF / TXT，A10.md 一节） */
export function detectFileType(filename: string): SupportedFileType | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.txt')) return 'txt';
  return null;
}

/**
 * 解析上传文件为纯文本（A10.md 十二节 步骤 10-11）。
 * @param buffer 文件二进制内容
 * @param filename 文件名（用于判断 PDF/TXT）
 */
export async function parseFile(buffer: Buffer, filename: string): Promise<string> {
  const type = detectFileType(filename);
  if (type === 'pdf') {
    // pdf-parse 需要至少 1 字节 buffer；空文件直接返回空文本
    if (buffer.length === 0) return '';
    const result = await pdfParse(buffer);
    return result.text;
  }
  if (type === 'txt') {
    return decodeText(buffer);
  }
  throw new Error(`不支持的文件类型：${filename}`);
}

/**
 * 文本解码：先按 UTF-8 解码；若出现替换符 U+FFFD（常见于 GBK 教材）则回退 GBK。
 */
export function decodeText(buffer: Buffer): string {
  const utf8 = buffer.toString('utf-8').replace(/^\uFEFF/, '');
  if (!utf8.includes('\uFFFD')) return utf8;
  try {
    const gbk = new TextDecoder('gbk').decode(buffer);
    return gbk.replace(/^\uFEFF/, '');
  } catch {
    // 运行环境无 GBK 解码器时退回 UTF-8 结果
    return utf8;
  }
}

/**
 * 清洗文本（A10.md 十二节 步骤 12）：
 *  1. 统一换行符，去除 \f 换页符等控制字符
 *  2. 去掉独立成行的页码（如 "12"、"3/45"、"- 12 -"）
 *  3. 压缩 3 个以上连续空行为 2 行，压缩行内多余空白
 */
export function cleanText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    // 去除换页符与零宽字符，保留制表符
    .replace(/[\f\v\u200b\u200e\u200f]/g, '')
    // 独立成行的页码 / 页码对 / 破折号包裹页码
    .split('\n')
    .filter((line) => !/^\s*[-—－]?\s*\d{1,4}\s*(?:[/－\-—]\s*\d{1,4})?\s*[-—－]?\s*$/.test(line))
    .join('\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** 带章节信息的文本块 */
export interface ChunkWithChapter {
  content: string;
  chapter: string;
}

/** 章节标题识别：第X章/节/讲/部分（可带标题名，如"第3章 栈和队列"）、数字编号标题（如 "3 栈和队列"） */
const CHAPTER_HEADING =
  /^\s*(第\s*[一二三四五六七八九十百千0-9]+\s*[章节讲部分](?:\s+\S.*)?|\d{1,2}(\.\d)?\s+\S{2,})\s*$/;

/**
 * 按章节切分：以章节标题为界拆成若干段，段内保留标题作为章节名。
 * 若全文没有识别到任何章节标题，整体归入"全文"单一章节。
 */
export function splitByChapter(text: string): Array<{ chapter: string; body: string }> {
  const lines = text.split('\n');
  const sections: Array<{ chapter: string; body: string }> = [];
  let current = { chapter: '前言', body: '' };
  let foundHeading = false;

  for (const line of lines) {
    if (CHAPTER_HEADING.test(line)) {
      if (current.body.trim()) sections.push({ ...current, body: current.body.trim() });
      current = { chapter: line.trim(), body: '' };
      foundHeading = true;
    } else {
      current.body += line + '\n';
    }
  }
  if (current.body.trim()) sections.push({ ...current, body: current.body.trim() });

  if (!foundHeading) {
    // 无章节结构：整篇作为单一章节处理
    return text.trim() ? [{ chapter: '全文', body: text.trim() }] : [];
  }
  return sections;
}

/**
 * 按段落打包切分为目标大小的文本块（A10.md 十二节 步骤 13 / 十五节 步骤 23）。
 * 切块尽量不拆散段落；超长单段按句号切分兜底。
 */
export function chunkText(text: string, size: number = config.rag.chunkSize): ChunkWithChapter[] {
  const chunks: ChunkWithChapter[] = [];
  for (const section of splitByChapter(text)) {
    const paragraphs = section.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    let buffer = '';

    const flush = () => {
      if (buffer.trim()) chunks.push({ content: buffer.trim(), chapter: section.chapter });
      buffer = '';
    };

    for (const paragraph of paragraphs) {
      // 单段超长：按句子切分再打包
      if (paragraph.length > size) {
        flush();
        for (const sentence of splitSentences(paragraph)) {
          if (buffer.length + sentence.length > size) flush();
          buffer += sentence;
        }
        flush();
        continue;
      }
      if (buffer.length + paragraph.length + 1 > size) flush();
      buffer += (buffer ? '\n' : '') + paragraph;
    }
    flush();
  }
  return chunks;
}

/** 按中文句号/问叹号切句（保留标点） */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[。！？；!?;])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * 将文本块封装为带元信息的 TextChunk（供 RAG 存储/检索）。
 */
export function buildChunks(text: string, courseId: string, source?: string): TextChunk[] {
  return chunkText(text).map((chunk, i) => ({
    id: `${courseId}-chunk${i}`,
    courseId,
    content: chunk.content,
    chapter: chunk.chapter,
    source,
  }));
}

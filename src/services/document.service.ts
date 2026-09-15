/**
 * 文档解析服务（A10.md 十二节：上传 → 解析 → 清洗 → 切块）
 * tier1：桩实现；tier2 用 pdf-parse 解析 PDF、fs 读取 TXT，并实现清洗与切块。
 */
import type { TextChunk } from '@/types';
import { config } from '@/lib/config';
// TODO(tier2): import pdfParse from 'pdf-parse';

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
  // TODO(tier2): 实现真实解析
  // if (type === 'pdf') {
  //   const result = await pdfParse(buffer);
  //   return result.text;
  // }
  // if (type === 'txt') {
  //   return buffer.toString('utf-8');
  // }
  void buffer;
  console.warn(`[parseFile] tier1 桩：filename=${filename}, type=${type}`);
  return '';
}

/**
 * 清洗文本：去除空行、页码与无意义符号（A10.md 十二节 步骤 12）。
 */
export function cleanText(raw: string): string {
  // TODO(tier2): 实现真实清洗（去页码、页眉页脚、多余空白）
  return raw.replace(/\r\n/g, '\n').trim();
}

/**
 * 按章节/段落切分为文本块（A10.md 十二节 步骤 13 / 十五节 步骤 23）。
 * @param text 清洗后的文本
 * @param size 每块目标字数（默认取 config.rag.chunkSize）
 */
export function chunkText(text: string, size: number = config.rag.chunkSize): string[] {
  // TODO(tier2): 实现按章节/段落的智能切分，此处仅按固定长度粗切占位
  void size;
  if (!text) return [];
  return [text];
}

/**
 * 将文本块封装为带元信息的 TextChunk（供 RAG 存储/检索）。
 */
export function buildChunks(text: string, courseId: string, source?: string): TextChunk[] {
  return chunkText(text).map((content, i) => ({
    id: `${courseId}-chunk${i}`,
    courseId,
    content,
    source,
  }));
}

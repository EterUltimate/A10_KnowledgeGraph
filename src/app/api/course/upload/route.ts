/**
 * POST /api/course/upload — 上传课程资料（A10.md 十二节完整流程）
 * 流程：接收 PDF/TXT → 解析文本 → 清洗 → 切块 → 知识抽取 → 关系抽取
 *      → 写入图存储 → 保存 RAG 文本块 → 登记课程 → 返回生成状态（含耗时分解）。
 * 未配置 LLM Key 时自动走内置演示数据集（demoMode=true），全流程仍可跑通。
 */
import type { NextRequest } from 'next/server';
import type { TextChunk, UploadResult } from '@/types';
import { ok, fail } from '@/lib/http';
import { requireTeacher } from '@/lib/auth-guard';
import { config, isLLMConfigured } from '@/lib/config';
import { detectFileType, parseFile, cleanText, buildChunks } from '@/services/document.service';
import { extractKnowledge } from '@/lib/ai/extract-knowledge';
import { extractRelations } from '@/lib/ai/extract-relations';
import { buildGraph } from '@/services/graph.service';
import { saveChunks } from '@/services/rag.service';
import { createCourse } from '@/services/course.service';
import { DEMO_COURSE_ID, DEMO_COURSE_NAME, demoTextbookChunks } from '@/lib/ai/demo-dataset';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const guard = await requireTeacher();
  if (guard) return guard;

  const t0 = Date.now();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return fail('请求体不是合法的 multipart/form-data');
  }

  const file = formData.get('file');
  const courseId = ((formData.get('courseId') as string) || '').trim() || DEMO_COURSE_ID;
  const courseName = ((formData.get('courseName') as string) || '').trim() || DEMO_COURSE_NAME;

  if (!(file instanceof File)) {
    return fail('未接收到上传文件（字段名应为 file）');
  }
  const fileType = detectFileType(file.name);
  if (!fileType) {
    return fail('仅支持 PDF 或 TXT 文件');
  }
  if (file.size > config.upload.maxFileSize) {
    return fail(`文件过大（上限 ${Math.floor(config.upload.maxFileSize / 1024 / 1024)}MB）`);
  }

  const demoMode = !isLLMConfigured();

  try {
    // 1. 解析文本（PDF/TXT）并清洗、切块
    const parseStart = Date.now();
    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await parseFile(buffer, file.name);
    const text = cleanText(rawText);
    let chunks: TextChunk[] = buildChunks(text, courseId, file.name);
    const parseMs = Date.now() - parseStart;

    // 解析结果为空（如扫描版 PDF）且处于离线模式：改用内置教材段落，保证问答链路可用
    if (chunks.length === 0 && demoMode) {
      chunks = demoTextbookChunks(courseId);
    }

    // 2. LLM 抽取知识点与关系（离线模式返回内置演示数据集）
    const extractStart = Date.now();
    const points = await extractKnowledge(text, courseId);
    const relations = await extractRelations(points);
    const extractMs = Date.now() - extractStart;

    // 3. 写入图谱 + 保存 RAG 文本块 + 登记课程
    await buildGraph(points, relations, courseId);
    if (chunks.length > 0) saveChunks(chunks);
    await createCourse({
      id: courseId,
      name: courseName,
      fileTypes: [fileType],
      knowledgeCount: points.length,
    });

    // 4. 返回生成完成状态
    const result: UploadResult = {
      courseId,
      courseName,
      fileName: file.name,
      knowledgeCount: points.length,
      relationCount: relations.length,
      chunkCount: chunks.length,
      status: 'completed',
      timing: { parseMs, extractMs, totalMs: Date.now() - t0 },
      demoMode,
      message: demoMode
        ? '未配置 LLM_API_KEY，本次使用内置《数据结构》演示数据集生成图谱（离线模式）。'
        : undefined,
    };
    return ok(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    console.error('[upload] 处理失败：', message);
    return fail(`文档处理失败：${message}`, 500);
  }
}

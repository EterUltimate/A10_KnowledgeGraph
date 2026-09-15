/**
 * POST /api/course/upload — 上传课程资料（A10.md 十二节完整流程）
 * 流程：接收 PDF/TXT → 解析文本 → 清洗 → 切块 → LLM 抽取知识点 → 抽取关系
 *      → 写入 Neo4j → 保存 RAG 文本块 → 返回生成完成状态
 * tier1：串起桩函数跑通空流程；tier2 各环节落地真实实现。
 */
import type { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/http';
import { detectFileType, parseFile, cleanText, buildChunks } from '@/services/document.service';
import { extractKnowledge } from '@/lib/ai/extract-knowledge';
import { extractRelations } from '@/lib/ai/extract-relations';
import { buildGraph } from '@/services/graph.service';
import { saveChunks } from '@/services/rag.service';
import { createCourse } from '@/services/course.service';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file');
  const courseId = (formData.get('courseId') as string) || 'data-structures';
  const courseName = (formData.get('courseName') as string) || '数据结构';

  if (!(file instanceof File)) {
    return fail('未接收到上传文件（字段名应为 file）');
  }
  if (!detectFileType(file.name)) {
    return fail('仅支持 PDF 或 TXT 文件');
  }

  // 1. 读取二进制并解析文本
  const buffer = Buffer.from(await file.arrayBuffer());
  const rawText = await parseFile(buffer, file.name);

  // 2. 清洗 + 切块
  const text = cleanText(rawText);
  const chunks = buildChunks(text, courseId, file.name);

  // 3. LLM 抽取知识点与关系
  const points = await extractKnowledge(text, courseId);
  const relations = await extractRelations(points);

  // 4. 写入图谱 + 保存 RAG 文本块 + 登记课程
  await buildGraph(points, relations);
  saveChunks(chunks);
  await createCourse({
    id: courseId,
    name: courseName,
    fileTypes: ['pdf', 'txt'],
    knowledgeCount: points.length,
  });

  // 5. 返回生成完成状态
  return ok({
    courseId,
    fileName: file.name,
    knowledgeCount: points.length,
    relationCount: relations.length,
    chunkCount: chunks.length,
    status: 'completed',
  });
}

/**
 * 管理员后台的图数据维护编排：课程级联删除 与 内置《数据结构》演示数据重种。
 * 复用既有 services 与内置演示数据集，与离线上传建图链路产出一致，双存储（Neo4j/JSON）通用。
 */
import { DEMO_COURSE_ID, DEMO_COURSE_NAME, DEMO_KNOWLEDGE, DEMO_RELATIONS, demoTextbookChunks } from '@/lib/ai/demo-dataset';
import { buildGraph, deleteCourseGraph } from '@/services/graph.service';
import { deleteChunks, saveChunks } from '@/services/rag.service';
import { createCourse, deleteCourseRegistry } from '@/services/course.service';

/**
 * 级联删除整门课程：图谱节点/关系 + RAG 语料/向量 + 注册表条目。
 * @returns 被删的知识点数量
 */
export async function deleteCourseFull(courseId: string): Promise<number> {
  const removedNodes = await deleteCourseGraph(courseId);
  deleteChunks(courseId);
  deleteCourseRegistry(courseId);
  return removedNodes;
}

export interface ReseedResult {
  courseId: string;
  courseName: string;
  knowledgeCount: number;
  relationCount: number;
  chunkCount: number;
}

/**
 * 重种内置《数据结构》演示数据到指定课程（默认 data-structures，即 UI 默认打开课程）。
 * 离线/在线均可用：直接取代码内置演示知识点与关系建图，并用演示教材段落填 RAG 语料。
 */
export async function seedDemoCourse(
  courseId: string = DEMO_COURSE_ID,
  courseName: string = DEMO_COURSE_NAME,
): Promise<ReseedResult> {
  const points = DEMO_KNOWLEDGE.map((k) => ({ ...k, courseId }));
  const relations = DEMO_RELATIONS.map((r) => ({ ...r, courseId }));
  await buildGraph(points, relations, courseId);
  const chunks = demoTextbookChunks(courseId);
  if (chunks.length > 0) saveChunks(chunks);
  await createCourse({
    id: courseId,
    name: courseName,
    fileTypes: ['txt'],
    knowledgeCount: points.length,
  });
  return {
    courseId,
    courseName,
    knowledgeCount: points.length,
    relationCount: relations.length,
    chunkCount: chunks.length,
  };
}

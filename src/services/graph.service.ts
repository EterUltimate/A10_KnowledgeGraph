/**
 * 知识图谱服务：GraphStore 门面层（A10.md 七、十三、十六节）
 * tier2：业务代码只依赖本模块，底层在 Neo4j / JSON 之间自动切换。
 * 职责：知识点与关系的 CRUD、图谱查询、前置关系查询。
 */
import {
  RELATION_TYPE_LABELS,
  type GraphData,
  type KnowledgePoint,
  type Relation,
  type RelationType,
} from '@/types';
import { getGraphStore, type RelationInput } from '@/lib/db/graph-store';

/** 关系类型的中文展示名（对齐 A10.md 十三节 edges.type "前置"） */
export function relationLabel(type: RelationType): string {
  return RELATION_TYPE_LABELS[type];
}

/** 写入/更新一个知识点节点（A10.md 七节 MERGE Knowledge） */
export async function upsertKnowledge(point: KnowledgePoint): Promise<void> {
  const store = await getGraphStore();
  await store.upsertKnowledge(point);
}

/** 写入一条关系（A10.md 七节 MERGE 关系） */
export async function upsertRelation(relation: RelationInput): Promise<void> {
  const store = await getGraphStore();
  await store.addRelation(relation);
}

/** 批量写入知识点与关系（自动建图闭环，A10.md 十二节 步骤 15） */
export async function buildGraph(
  points: KnowledgePoint[],
  relations: RelationInput[],
  courseId?: string,
): Promise<void> {
  const store = await getGraphStore();
  const cid = courseId ?? points[0]?.courseId ?? '';
  await store.buildGraph(points, relations, cid);
}

/**
 * 获得某课程的知识图谱（GET /api/graph/{courseId}，A10.md 十三节）。
 * 返回 nodes + edges 供前端 ECharts 渲染。
 */
export async function getGraph(courseId: string): Promise<GraphData> {
  const store = await getGraphStore();
  return store.getGraph(courseId);
}

/** 列出课程全部知识点（管理页/勾选列表用） */
export async function listKnowledge(courseId: string): Promise<KnowledgePoint[]> {
  const store = await getGraphStore();
  return store.listKnowledge(courseId);
}

/** 获得知识点详情（GET /api/knowledge/{id}，A10.md 十三节点击节点展示） */
export async function getKnowledgeById(
  id: string,
  courseId?: string,
): Promise<KnowledgePoint | null> {
  const store = await getGraphStore();
  return store.getKnowledgeById(id, courseId);
}

/** 教师新增知识点（POST /api/knowledge，A10.md 十六节） */
export async function addKnowledge(point: Omit<KnowledgePoint, 'id'>): Promise<KnowledgePoint> {
  const store = await getGraphStore();
  return store.addKnowledge(point);
}

/** 教师编辑知识点（PATCH /api/knowledge/{id}） */
export async function updateKnowledge(
  id: string,
  patch: Partial<Omit<KnowledgePoint, 'id'>>,
): Promise<KnowledgePoint | null> {
  const store = await getGraphStore();
  return store.updateKnowledge(id, patch);
}

/** 教师删除知识点及其关联关系（DELETE /api/knowledge/{id}） */
export async function deleteKnowledge(id: string): Promise<boolean> {
  const store = await getGraphStore();
  return store.deleteKnowledge(id);
}

/** 教师新增关系（POST /api/relation，A10.md 十六节） */
export async function addRelation(relation: RelationInput): Promise<Relation> {
  const store = await getGraphStore();
  return store.addRelation(relation);
}

/** 教师删除关系（DELETE /api/relation） */
export async function deleteRelation(relation: RelationInput): Promise<boolean> {
  const store = await getGraphStore();
  return store.deleteRelation(relation);
}

/** 课程全部关系（管理页列表用） */
export async function getRelations(courseId: string): Promise<Relation[]> {
  const store = await getGraphStore();
  return store.getRelations(courseId);
}

/** 查询某课程的所有 PREREQUISITE 后继（供学习路径使用，A10.md 十四节） */
export async function getPrerequisiteRelations(courseId: string): Promise<Relation[]> {
  const store = await getGraphStore();
  return store.getPrerequisiteRelations(courseId);
}

/** 课程知识点数量（课程列表展示用） */
export async function countKnowledge(courseId: string): Promise<number> {
  const store = await getGraphStore();
  return store.countKnowledge(courseId);
}

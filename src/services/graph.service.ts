/**
 * 知识图谱服务：Neo4j 节点/关系读写（A10.md 七、十三、十六节）
 * tier1：桩实现，返回示例图数据；tier2 用 Cypher 落地。
 */
import {
  RELATION_TYPE_LABELS,
  type GraphData,
  type KnowledgePoint,
  type Relation,
} from '@/types';
// TODO(tier2): import { getSession } from '@/lib/db/neo4j';

/** 写入/更新一个知识点节点（A10.md 七节 MERGE Knowledge） */
export async function upsertKnowledge(point: KnowledgePoint): Promise<void> {
  // TODO(tier2): MERGE (k:Knowledge {name:$name}) SET k += $props
  console.warn('[graph.upsertKnowledge] tier1 桩', point.name);
}

/** 写入一条关系（A10.md 七节 MERGE 关系） */
export async function upsertRelation(relation: Relation): Promise<void> {
  // TODO(tier2): MATCH (a),(b) MERGE (a)-[r:TYPE]->(b)
  console.warn('[graph.upsertRelation] tier1 桩', relation);
}

/** 批量写入知识点与关系（自动建图闭环，A10.md 十二节 步骤 15） */
export async function buildGraph(points: KnowledgePoint[], relations: Relation[]): Promise<void> {
  for (const p of points) await upsertKnowledge(p);
  for (const r of relations) await upsertRelation(r);
}

/**
 * 获得某课程的知识图谱（GET /api/graph/{courseId}，A10.md 十三节）。
 * 返回 nodes + edges 供前端 ECharts 渲染。
 */
export async function getGraph(courseId: string): Promise<GraphData> {
  // TODO(tier2): MATCH (k:Knowledge {courseId:$courseId}) 查询节点与关系
  console.warn('[graph.getGraph] tier1 桩：返回示例图数据', courseId);
  return {
    nodes: [
      { id: '1', name: '线性表', chapter: '线性表', difficulty: 1 },
      { id: '2', name: '栈', chapter: '线性表', difficulty: 2 },
      { id: '3', name: '队列', chapter: '线性表', difficulty: 2 },
    ],
    edges: [
      { source: '1', target: '2', type: RELATION_TYPE_LABELS.PREREQUISITE },
      { source: '1', target: '3', type: RELATION_TYPE_LABELS.PREREQUISITE },
    ],
  };
}

/** 获得知识点详情（GET /api/knowledge/{id}，A10.md 十三节点击节点展示） */
export async function getKnowledgeById(id: string): Promise<KnowledgePoint | null> {
  // TODO(tier2): MATCH (k:Knowledge) WHERE id(k)=$id OR k.name=$id RETURN k
  console.warn('[graph.getKnowledgeById] tier1 桩', id);
  return {
    id,
    name: '栈',
    definition: '一种后进先出（LIFO）的线性数据结构',
    chapter: '线性表',
    difficulty: 2,
    source: '《数据结构》第一章',
  };
}

/** 教师新增知识点（POST /api/knowledge，A10.md 十六节） */
export async function addKnowledge(point: Omit<KnowledgePoint, 'id'>): Promise<KnowledgePoint> {
  // TODO(tier2): CREATE/MERGE 节点并返回带 id 的结果
  console.warn('[graph.addKnowledge] tier1 桩', point.name);
  return { id: `tmp-${Date.now()}`, ...point };
}

/** 教师新增关系（POST /api/relation，A10.md 十六节） */
export async function addRelation(relation: Relation): Promise<Relation> {
  // TODO(tier2): MERGE 关系
  console.warn('[graph.addRelation] tier1 桩', relation);
  return relation;
}

/** 查询某知识点的所有 PREREQUISITE 后继（供学习路径使用，A10.md 十四节） */
export async function getPrerequisiteRelations(courseId: string): Promise<Relation[]> {
  // TODO(tier2): MATCH (a)-[:PREREQUISITE]->(b) 查询全部前置关系
  void courseId;
  return [{ source: '线性表', target: '栈', type: 'PREREQUISITE' }];
}

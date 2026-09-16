/**
 * JSON 文件图存储实现（轻量级方案，赛题允许的兜底路线）
 * 数据落在 DATA_DIR/graph.json，写入采用"读改写 + 原子替换"。
 * 适用：评审演示零配置环境、开发调试；数据量（每课程数十知识点）完全够用。
 */
import path from 'path';
import { readJsonFile, writeJsonFile } from '@/lib/db/json-file';
import { config } from '@/lib/config';
import { RELATION_TYPE_LABELS, type GraphData, type KnowledgePoint, type Relation } from '@/types';
import type { GraphStore, RelationInput } from '@/lib/db/graph-store';

/** graph.json 的持久化结构 */
interface GraphFileData {
  nodes: KnowledgePoint[];
  /** 存储按名称建立的关系，并挂 courseId（课程内名称唯一） */
  relations: Array<Relation & { courseId: string }>;
}

const globalForJson = globalThis as unknown as {
  __a10JsonGraph?: GraphFileData;
};

function emptyData(): GraphFileData {
  return { nodes: [], relations: [] };
}

export class JsonGraphStore implements GraphStore {
  readonly kind = 'json' as const;

  private filePath = path.join(config.store.dataDir, 'graph.json');
  private data: GraphFileData;

  constructor() {
    this.data = globalForJson.__a10JsonGraph ?? readJsonFile<GraphFileData>(this.filePath, emptyData());
    globalForJson.__a10JsonGraph = this.data;
  }

  /** 写穿到磁盘（每次变更后调用） */
  private flush(): void {
    writeJsonFile(this.filePath, this.data);
  }

  private findNode(courseId: string, name: string): KnowledgePoint | undefined {
    return this.data.nodes.find((n) => (n.courseId ?? '') === courseId && n.name === name);
  }

  async upsertKnowledge(point: KnowledgePoint): Promise<void> {
    const courseId = point.courseId ?? '';
    const existing = this.findNode(courseId, point.name);
    if (existing) {
      Object.assign(existing, point, { courseId: point.courseId });
    } else {
      this.data.nodes.push({ ...point, courseId: point.courseId });
    }
    this.flush();
  }

  async buildGraph(points: KnowledgePoint[], relations: RelationInput[], courseId: string): Promise<void> {
    for (const p of points) {
      const existing = this.findNode(courseId, p.name);
      if (existing) {
        Object.assign(existing, p);
      } else {
        this.data.nodes.push({ ...p });
      }
    }
    for (const rel of relations) {
      await this.addRelationRaw({ ...rel, courseId });
    }
    this.flush();
  }

  async getGraph(courseId: string): Promise<GraphData> {
    const nodes = this.data.nodes.filter((n) => (n.courseId ?? '') === courseId);
    const idByName = new Map(nodes.map((n) => [n.name, n.id]));
    const edges = this.data.relations
      .filter((r) => r.courseId === courseId)
      .filter((r) => idByName.has(r.source) && idByName.has(r.target))
      .map((r) => ({
        source: idByName.get(r.source) as string,
        target: idByName.get(r.target) as string,
        type: RELATION_TYPE_LABELS[r.type],
      }));
    return {
      nodes: nodes.map((n) => ({ id: n.id, name: n.name, chapter: n.chapter, difficulty: n.difficulty })),
      edges,
    };
  }

  async listKnowledge(courseId: string): Promise<KnowledgePoint[]> {
    return this.data.nodes
      .filter((n) => (n.courseId ?? '') === courseId)
      .sort((a, b) => a.chapter.localeCompare(b.chapter, 'zh-CN') || a.name.localeCompare(b.name, 'zh-CN'));
  }

  async getKnowledgeById(idOrName: string, courseId?: string): Promise<KnowledgePoint | null> {
    const found = this.data.nodes.find(
      (n) =>
        (n.id === idOrName || n.name === idOrName) &&
        (!courseId || (n.courseId ?? '') === courseId),
    );
    return found ?? null;
  }

  async addKnowledge(point: Omit<KnowledgePoint, 'id'>): Promise<KnowledgePoint> {
    const created: KnowledgePoint = { ...point, id: crypto.randomUUID() };
    const existing = this.findNode(point.courseId ?? '', point.name);
    if (existing) {
      Object.assign(existing, created);
      this.flush();
      return existing;
    }
    this.data.nodes.push(created);
    this.flush();
    return created;
  }

  async updateKnowledge(
    id: string,
    patch: Partial<Omit<KnowledgePoint, 'id'>>,
  ): Promise<KnowledgePoint | null> {
    const node = this.data.nodes.find((n) => n.id === id);
    if (!node) return null;
    // 定义为"仅传入字段被修改"：undefined 的字段不覆盖
    (['name', 'definition', 'chapter', 'difficulty', 'source'] as const).forEach((key) => {
      if (patch[key] !== undefined) {
        (node as unknown as Record<string, unknown>)[key] = patch[key];
      }
    });
    this.flush();
    return node;
  }

  async deleteKnowledge(id: string): Promise<boolean> {
    const node = this.data.nodes.find((n) => n.id === id);
    if (!node) return false;
    const courseId = node.courseId ?? '';
    this.data.nodes = this.data.nodes.filter((n) => n.id !== id);
    this.data.relations = this.data.relations.filter(
      (r) => !(r.courseId === courseId && (r.source === node.name || r.target === node.name)),
    );
    this.flush();
    return true;
  }

  async addRelation(relation: RelationInput): Promise<Relation> {
    const courseId = relation.courseId ?? '';
    const result = await this.addRelationRaw({ ...relation, courseId });
    this.flush();
    return result;
  }

  /** 内部方法：只改内存，flush 由外层控制（buildGraph 批量场景） */
  private addRelationRaw(relation: Relation & { courseId: string }): Relation {
    const exists = this.data.relations.some(
      (r) =>
        r.courseId === relation.courseId &&
        r.source === relation.source &&
        r.target === relation.target &&
        r.type === relation.type,
    );
    if (!exists) {
      this.data.relations.push({ ...relation });
    }
    // 教师手工加关系时若知识点尚不存在，创建占位节点保证闭环
    for (const name of [relation.source, relation.target]) {
      if (!this.findNode(relation.courseId, name)) {
        this.data.nodes.push({
          id: crypto.randomUUID(),
          name,
          definition: '（教师手工创建，待补充定义）',
          chapter: '未分类',
          difficulty: 3,
          courseId: relation.courseId,
        });
      }
    }
    return { source: relation.source, target: relation.target, type: relation.type };
  }

  async deleteRelation(relation: RelationInput): Promise<boolean> {
    const courseId = relation.courseId ?? '';
    const before = this.data.relations.length;
    this.data.relations = this.data.relations.filter(
      (r) =>
        !(
          r.courseId === courseId &&
          r.source === relation.source &&
          r.target === relation.target &&
          r.type === relation.type
        ),
    );
    const deleted = this.data.relations.length < before;
    if (deleted) this.flush();
    return deleted;
  }

  async getRelations(courseId: string): Promise<Relation[]> {
    return this.data.relations
      .filter((r) => r.courseId === courseId)
      .map(({ source, target, type }) => ({ source, target, type }));
  }

  async getPrerequisiteRelations(courseId: string): Promise<Relation[]> {
    return (await this.getRelations(courseId)).filter((r) => r.type === 'PREREQUISITE');
  }

  async countKnowledge(courseId: string): Promise<number> {
    return this.data.nodes.filter((n) => (n.courseId ?? '') === courseId).length;
  }
}

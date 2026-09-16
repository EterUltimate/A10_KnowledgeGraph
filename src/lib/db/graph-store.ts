/**
 * 图存储抽象层（tier2 架构核心）
 *
 * 赛题允许 Neo4j 或"轻量级方案"。为保证：
 *  1) 评审环境零配置可跑（无需安装 Neo4j）；
 *  2) 生产/演示可切换真实图数据库；
 * 这里抽象统一的 GraphStore 接口，提供 Neo4j 与 JSON 文件两套实现，
 * 由工厂按 GRAPH_STORE 配置（auto/neo4j/json）自动选择。
 *
 * 业务层（services/graph.service.ts）只依赖本接口，不感知底层实现。
 */
import type { GraphData, KnowledgePoint, Relation, RelationType } from '@/types';
import { config } from '@/lib/config';
import { verifyConnectivity } from '@/lib/db/neo4j';
import { Neo4jGraphStore } from '@/lib/db/neo4j-store';
import { JsonGraphStore } from '@/lib/db/json-store';

/** 关系写入的最小结构（source/target 为课程内知识点名称） */
export type RelationInput = Pick<Relation, 'source' | 'target' | 'type'> & {
  courseId?: string;
};

/** 统一的图存储接口（所有方法按 courseId 隔离，天然支持多课程） */
export interface GraphStore {
  readonly kind: 'neo4j' | 'json';

  /** 写入/更新一个知识点节点（按 courseId+name 幂等） */
  upsertKnowledge(point: KnowledgePoint): Promise<void>;

  /** 批量写入知识点与关系（上传后自动建图闭环，单事务） */
  buildGraph(points: KnowledgePoint[], relations: RelationInput[], courseId: string): Promise<void>;

  /** 获得某课程的知识图谱（nodes + edges 供 ECharts 渲染） */
  getGraph(courseId: string): Promise<GraphData>;

  /** 列出课程全部知识点（按章节、名称排序） */
  listKnowledge(courseId: string): Promise<KnowledgePoint[]>;

  /** 按 id 或名称取知识点详情 */
  getKnowledgeById(idOrName: string, courseId?: string): Promise<KnowledgePoint | null>;

  /** 新增知识点（自动生成 id，同名则更新） */
  addKnowledge(point: Omit<KnowledgePoint, 'id'>): Promise<KnowledgePoint>;

  /** 按 id 更新知识点字段（仅传入的字段会被修改） */
  updateKnowledge(
    id: string,
    patch: Partial<Omit<KnowledgePoint, 'id'>>,
  ): Promise<KnowledgePoint | null>;

  /** 删除知识点及其全部关联关系 */
  deleteKnowledge(id: string): Promise<boolean>;

  /** 新增/更新一条关系（幂等） */
  addRelation(relation: RelationInput): Promise<Relation>;

  /** 删除一条关系；返回是否确实删除 */
  deleteRelation(relation: RelationInput): Promise<boolean>;

  /** 列出课程全部关系 */
  getRelations(courseId: string): Promise<Relation[]>;

  /** 列出课程全部 PREREQUISITE 关系（学习路径专用） */
  getPrerequisiteRelations(courseId: string): Promise<Relation[]>;

  /** 课程知识点总数 */
  countKnowledge(courseId: string): Promise<number>;
}

const globalForStore = globalThis as unknown as { __a10GraphStore?: Promise<GraphStore> };

/** 存储工厂：进程内单例（dev 热重载安全），auto 模式带连通性探测降级 */
export function getGraphStore(): Promise<GraphStore> {
  if (!globalForStore.__a10GraphStore) {
    globalForStore.__a10GraphStore = createStore().catch((err) => {
      globalForStore.__a10GraphStore = undefined;
      throw err;
    });
  }
  return globalForStore.__a10GraphStore;
}

async function createStore(): Promise<GraphStore> {
  const mode = config.store.mode;

  if (mode === 'json') {
    console.log('[store] 使用 JSON 文件存储（GRAPH_STORE=json）');
    return new JsonGraphStore();
  }

  if (mode === 'neo4j') {
    console.log('[store] 使用 Neo4j 存储（GRAPH_STORE=neo4j）');
    return new Neo4jGraphStore();
  }

  // auto：配置了 Neo4j 且真实可连则用 Neo4j，否则降级 JSON 兜底
  const neo4jConfigured = Boolean(config.neo4j.uri && config.neo4j.user && config.neo4j.password);
  if (neo4jConfigured && (await verifyConnectivity())) {
    console.log('[store] 使用 Neo4j 存储（auto 模式探测成功）');
    return new Neo4jGraphStore();
  }
  console.log('[store] 使用 JSON 文件存储（auto 模式：Neo4j 未配置或不可达，已自动降级）');
  return new JsonGraphStore();
}

/** 校验关系类型白名单，非法类型返回 null（抽取结果清洗用） */
export function normalizeRelationType(type: string): RelationType | null {
  return (['PREREQUISITE', 'CONTAINS', 'RELATED'] as const).find((t) => t === type) ?? null;
}

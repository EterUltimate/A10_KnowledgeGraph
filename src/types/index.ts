/**
 * A10 领域类型定义
 * 对应 A10.md 十（知识点）、十一（关系）、十三（图谱返回）、十五（RAG）、十六（接口）节
 */

/** 关系类型：A10.md 十一节，只允许三类，其他关系一律丢弃 */
export const RELATION_TYPES = ['PREREQUISITE', 'CONTAINS', 'RELATED'] as const;
export type RelationType = (typeof RELATION_TYPES)[number];

/** 关系类型的中文展示名（对齐 A10.md 十三节 edges.type "前置"） */
export const RELATION_TYPE_LABELS: Record<RelationType, string> = {
  PREREQUISITE: '前置',
  CONTAINS: '包含',
  RELATED: '相关',
};

/** 知识点（A10.md 十节：名称、定义、章节、难度；额外含来源与 id） */
export interface KnowledgePoint {
  id: string;
  name: string;
  definition: string;
  chapter: string;
  /** 难度 1-5 */
  difficulty: number;
  /** 教材来源（文件名/章节页码） */
  source?: string;
  courseId?: string;
}

/** 知识点之间的关系 */
export interface Relation {
  /** 起点知识点名称或 id */
  source: string;
  /** 终点知识点名称或 id */
  target: string;
  type: RelationType;
}

/** 图可视化节点（A10.md 十三节 nodes） */
export interface GraphNode {
  id: string;
  name: string;
  chapter?: string;
  difficulty?: number;
}

/** 图可视化边（A10.md 十三节 edges） */
export interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

/** GET /api/graph 返回结构（A10.md 十三节） */
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** 课程 */
export interface Course {
  id: string;
  name: string;
  /** 支持的文件格式：pdf / txt */
  fileTypes: Array<'pdf' | 'txt'>;
  createdAt: string;
  knowledgeCount?: number;
}

/** 学生 */
export interface Student {
  id: string;
  name: string;
  courseId?: string;
}

/** 学生掌握状态 */
export interface MasteryState {
  studentId: string;
  /** 已掌握的知识点名称/ id 集合 */
  mastered: string[];
}

/** 学习路径推荐结果（A10.md 十四节：推荐前 3 个知识点） */
export interface PathRecommendation {
  studentId: string;
  recommendations: Array<{
    knowledge: KnowledgePoint;
    /** 推荐理由，例如"前置知识 线性表 已掌握" */
    reason: string;
  }>;
}

/** 文本块（RAG 切块结果，A10.md 十五节） */
export interface TextChunk {
  id: string;
  courseId: string;
  content: string;
  chapter?: string;
  /** 来源文件与位置 */
  source?: string;
}

/** 智能问答请求 */
export interface QARequest {
  question: string;
  courseId?: string;
  studentId?: string;
}

/** 智能问答响应（A10.md 十五节：答案 + 参考教材章节） */
export interface QAResponse {
  answer: string;
  /** 引用的教材章节/文本块 */
  references: Array<{
    chunkId: string;
    chapter?: string;
    source?: string;
    snippet: string;
  }>;
}

/** 统一 API 响应包装 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

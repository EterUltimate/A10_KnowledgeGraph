/**
 * Neo4j 图存储实现（A10.md 七节）
 * 节点：(:Knowledge {id, name, definition, chapter, difficulty, source, courseId})
 * 关系：三类真实关系类型 PREREQUISITE / CONTAINS / RELATED（类型已过白名单，可安全内插）
 * 幂等：节点按 (courseId, name) MERGE；关系按 (起点, 终点, 类型) MERGE。
 */
import { getSession } from '@/lib/db/neo4j';
import { RELATION_TYPE_LABELS, type GraphData, type KnowledgePoint, type Relation } from '@/types';
import type { GraphStore, RelationInput } from '@/lib/db/graph-store';

/** neo4j-driver 返回的整数为 Integer 对象，统一转回 number */
function toNum(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'toNumber' in value) {
    return (value as { toNumber(): number }).toNumber();
  }
  return Number(value ?? 0);
}

interface Neo4jKnowledgeProps {
  id: string;
  name: string;
  definition: string;
  chapter: string;
  difficulty: number;
  source?: string;
  courseId?: string;
}

function recordToKnowledge(props: Record<string, unknown>): KnowledgePoint {
  return {
    id: String(props.id ?? ''),
    name: String(props.name ?? ''),
    definition: String(props.definition ?? ''),
    chapter: String(props.chapter ?? ''),
    difficulty: toNum(props.difficulty),
    source: props.source ? String(props.source) : undefined,
    courseId: props.courseId ? String(props.courseId) : undefined,
  };
}

export class Neo4jGraphStore implements GraphStore {
  readonly kind = 'neo4j' as const;

  async upsertKnowledge(point: KnowledgePoint): Promise<void> {
    const session = getSession('WRITE');
    try {
      await session.run(
        `MERGE (k:Knowledge {courseId: $courseId, name: $name})
         SET k.id = $id, k.definition = $definition, k.chapter = $chapter,
             k.difficulty = $difficulty, k.source = $source`,
        {
          courseId: point.courseId ?? '',
          name: point.name,
          id: point.id,
          definition: point.definition,
          chapter: point.chapter,
          difficulty: point.difficulty,
          source: point.source ?? null,
        },
      );
    } finally {
      await session.close();
    }
  }

  async buildGraph(points: KnowledgePoint[], relations: RelationInput[], courseId: string): Promise<void> {
    const session = getSession('WRITE');
    try {
      await session.executeWrite(async (tx) => {
        // 批量 MERGE 知识点节点
        if (points.length > 0) {
          await tx.run(
            `UNWIND $rows AS row
             MERGE (k:Knowledge {courseId: row.courseId, name: row.name})
             SET k.id = row.id, k.definition = row.definition, k.chapter = row.chapter,
                 k.difficulty = row.difficulty, k.source = row.source`,
            {
              rows: points.map((p) => ({
                courseId: p.courseId ?? courseId,
                name: p.name,
                id: p.id,
                definition: p.definition,
                chapter: p.chapter,
                difficulty: p.difficulty,
                source: p.source ?? null,
              })),
            },
          );
        }
        // 逐条 MERGE 关系（类型来自白名单，可安全内插为关系类型）
        for (const rel of relations) {
          await tx.run(
            `MATCH (a:Knowledge {courseId: $courseId, name: $source})
             MATCH (b:Knowledge {courseId: $courseId, name: $target})
             MERGE (a)-[r:${rel.type}]->(b)`,
            { courseId, source: rel.source, target: rel.target },
          );
        }
      });
    } finally {
      await session.close();
    }
  }

  async getGraph(courseId: string): Promise<GraphData> {
    const session = getSession('READ');
    try {
      const nodesResult = await session.run(
        'MATCH (k:Knowledge {courseId: $courseId}) RETURN k ORDER BY k.chapter, k.name',
        { courseId },
      );
      const edgesResult = await session.run(
        `MATCH (a:Knowledge {courseId: $courseId})-[r]->(b:Knowledge {courseId: $courseId})
         RETURN a.id AS source, b.id AS target, type(r) AS type`,
        { courseId },
      );
      return {
        nodes: nodesResult.records.map((r) => {
          const p = r.get('k').properties as unknown as Neo4jKnowledgeProps;
          return {
            id: p.id,
            name: p.name,
            chapter: p.chapter,
            difficulty: toNum(p.difficulty),
          };
        }),
        edges: edgesResult.records.map((r) => ({
          source: String(r.get('source')),
          target: String(r.get('target')),
          type: RELATION_TYPE_LABELS[String(r.get('type')) as keyof typeof RELATION_TYPE_LABELS] ?? String(r.get('type')),
        })),
      };
    } finally {
      await session.close();
    }
  }

  async listKnowledge(courseId: string): Promise<KnowledgePoint[]> {
    const session = getSession('READ');
    try {
      const result = await session.run(
        'MATCH (k:Knowledge {courseId: $courseId}) RETURN k ORDER BY k.chapter, k.name',
        { courseId },
      );
      return result.records.map((r) =>
        recordToKnowledge(r.get('k').properties as unknown as Record<string, unknown>),
      );
    } finally {
      await session.close();
    }
  }

  async getKnowledgeById(idOrName: string, courseId?: string): Promise<KnowledgePoint | null> {
    const session = getSession('READ');
    try {
      const result = await session.run(
        `MATCH (k:Knowledge)
         WHERE (k.id = $idOrName OR k.name = $idOrName)
           AND ($courseId IS NULL OR k.courseId = $courseId)
         RETURN k LIMIT 1`,
        { idOrName, courseId: courseId ?? null },
      );
      const record = result.records[0];
      return record
        ? recordToKnowledge(record.get('k').properties as unknown as Record<string, unknown>)
        : null;
    } finally {
      await session.close();
    }
  }

  async addKnowledge(point: Omit<KnowledgePoint, 'id'>): Promise<KnowledgePoint> {
    const created: KnowledgePoint = { ...point, id: crypto.randomUUID() };
    await this.upsertKnowledge(created);
    return created;
  }

  async updateKnowledge(
    id: string,
    patch: Partial<Omit<KnowledgePoint, 'id'>>,
  ): Promise<KnowledgePoint | null> {
    const session = getSession('WRITE');
    try {
      const result = await session.run(
        `MATCH (k:Knowledge {id: $id})
         SET k.name = COALESCE($name, k.name),
             k.definition = COALESCE($definition, k.definition),
             k.chapter = COALESCE($chapter, k.chapter),
             k.difficulty = COALESCE($difficulty, k.difficulty),
             k.source = COALESCE($source, k.source)
         RETURN k`,
        {
          id,
          name: patch.name ?? null,
          definition: patch.definition ?? null,
          chapter: patch.chapter ?? null,
          difficulty: patch.difficulty ?? null,
          source: patch.source ?? null,
        },
      );
      const record = result.records[0];
      return record
        ? recordToKnowledge(record.get('k').properties as Record<string, unknown>)
        : null;
    } finally {
      await session.close();
    }
  }

  async deleteKnowledge(id: string): Promise<boolean> {
    const session = getSession('WRITE');
    try {
      const result = await session.run(
        'MATCH (k:Knowledge {id: $id}) DETACH DELETE k RETURN count(k) AS deleted',
        { id },
      );
      return toNum(result.records[0]?.get('deleted')) > 0;
    } finally {
      await session.close();
    }
  }

  async addRelation(relation: RelationInput): Promise<Relation> {
    const courseId = relation.courseId ?? '';
    const session = getSession('WRITE');
    try {
      // 知识点不存在则先创建占位节点，保证教师手工加关系不会失败
      await session.run(
        `MERGE (a:Knowledge {courseId: $courseId, name: $source})
         ON CREATE SET a.id = $idA, a.definition = '（教师手工创建，待补充定义）', a.chapter = '未分类', a.difficulty = 3
         MERGE (b:Knowledge {courseId: $courseId, name: $target})
         ON CREATE SET b.id = $idB, b.definition = '（教师手工创建，待补充定义）', b.chapter = '未分类', b.difficulty = 3`,
        { courseId, source: relation.source, target: relation.target, idA: crypto.randomUUID(), idB: crypto.randomUUID() },
      );
      await session.run(
        `MATCH (a:Knowledge {courseId: $courseId, name: $source})
         MATCH (b:Knowledge {courseId: $courseId, name: $target})
         MERGE (a)-[r:${relation.type}]->(b)`,
        { courseId, source: relation.source, target: relation.target },
      );
      return { source: relation.source, target: relation.target, type: relation.type };
    } finally {
      await session.close();
    }
  }

  async deleteRelation(relation: RelationInput): Promise<boolean> {
    const courseId = relation.courseId ?? '';
    const session = getSession('WRITE');
    try {
      const result = await session.run(
        `MATCH (a:Knowledge {courseId: $courseId, name: $source})-[r:${relation.type}]->(b:Knowledge {courseId: $courseId, name: $target})
         DELETE r
         RETURN count(r) AS deleted`,
        { courseId, source: relation.source, target: relation.target },
      );
      return toNum(result.records[0]?.get('deleted')) > 0;
    } finally {
      await session.close();
    }
  }

  async getRelations(courseId: string): Promise<Relation[]> {
    const session = getSession('READ');
    try {
      const result = await session.run(
        `MATCH (a:Knowledge {courseId: $courseId})-[r]->(b:Knowledge {courseId: $courseId})
         RETURN a.name AS source, b.name AS target, type(r) AS type`,
        { courseId },
      );
      return result.records.map((r) => ({
        source: String(r.get('source')),
        target: String(r.get('target')),
        type: String(r.get('type')) as Relation['type'],
      }));
    } finally {
      await session.close();
    }
  }

  async getPrerequisiteRelations(courseId: string): Promise<Relation[]> {
    const session = getSession('READ');
    try {
      const result = await session.run(
        `MATCH (a:Knowledge {courseId: $courseId})-[r:PREREQUISITE]->(b:Knowledge {courseId: $courseId})
         RETURN a.name AS source, b.name AS target, 'PREREQUISITE' AS type`,
        { courseId },
      );
      return result.records.map((r) => ({
        source: String(r.get('source')),
        target: String(r.get('target')),
        type: 'PREREQUISITE' as const,
      }));
    } finally {
      await session.close();
    }
  }

  async countKnowledge(courseId: string): Promise<number> {
    const session = getSession('READ');
    try {
      const result = await session.run(
        'MATCH (k:Knowledge {courseId: $courseId}) RETURN count(k) AS count',
        { courseId },
      );
      return toNum(result.records[0]?.get('count'));
    } finally {
      await session.close();
    }
  }
}

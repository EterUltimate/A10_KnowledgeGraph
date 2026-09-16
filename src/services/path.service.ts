/**
 * 学习路径推荐服务（A10.md 十四节）
 * 算法：基于已掌握集合 + PREREQUISITE 关系的图遍历（赛题明确不要求机器学习模型）。
 *
 * 推荐逻辑：
 *  1. 候选 = 未掌握，且其全部前置（PREREQUISITE 来源）都已掌握的知识点；
 *  2. 排序 = 解锁价值（学完它能解锁多少后继）降序 → 难度升序 → 章节升序；
 *  3. 取前 limit 个，附推荐理由。
 * 复杂度：O(V + E)，普通课程规模（<100 点）瞬时完成。
 */
import type { KnowledgePoint, PathRecommendation, Relation } from '@/types';
import { listKnowledge, getPrerequisiteRelations } from '@/services/graph.service';
import { getMastery } from '@/services/course.service';

/**
 * 计算推荐结果（纯函数，便于单元测试）。
 * @param allPoints 课程全部知识点
 * @param prereqRelations 课程全部 PREREQUISITE 关系（source 先修 → target 后学）
 * @param masteredSet 已掌握知识点名称集合
 * @param limit 推荐数量
 */
export function computeRecommendations(
  allPoints: KnowledgePoint[],
  prereqRelations: Relation[],
  masteredSet: Set<string>,
  limit: number,
): PathRecommendation['recommendations'] {
  const names = new Set(allPoints.map((p) => p.name));
  // target -> 其全部前置
  const prereqsOf = new Map<string, string[]>();
  for (const rel of prereqRelations) {
    if (!names.has(rel.source) || !names.has(rel.target)) continue;
    const list = prereqsOf.get(rel.target) ?? [];
    list.push(rel.source);
    prereqsOf.set(rel.target, list);
  }

  // 未掌握的知识点集合
  const unmastered = allPoints.filter((p) => !masteredSet.has(p.name));

  // 候选：未掌握且全部前置已掌握（无前置的知识点也算候选，可直接开始）
  const candidates = unmastered.filter((p) => {
    const prereqs = prereqsOf.get(p.name) ?? [];
    return prereqs.every((pre) => masteredSet.has(pre));
  });

  // 解锁价值：若学完该候选，有多少未掌握知识点的前置条件将全部满足
  const unlockValue = new Map<string, number>();
  for (const candidate of candidates) {
    const learned = new Set([...masteredSet, candidate.name]);
    let unlocked = 0;
    for (const p of unmastered) {
      if (p.name === candidate.name) continue;
      const prereqs = prereqsOf.get(p.name) ?? [];
      if (prereqs.length > 0 && prereqs.every((pre) => learned.has(pre))) unlocked++;
    }
    unlockValue.set(candidate.name, unlocked);
  }

  const sorted = [...candidates].sort((a, b) => {
    const ua = unlockValue.get(a.name) ?? 0;
    const ub = unlockValue.get(b.name) ?? 0;
    if (ua !== ub) return ub - ua; // 解锁价值高的先学
    if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty; // 简单的先学
    return a.chapter.localeCompare(b.chapter, 'zh-CN'); // 章节靠前的先学
  });

  return sorted.slice(0, limit).map((knowledge) => {
    const prereqs = (prereqsOf.get(knowledge.name) ?? []).filter((pre) => masteredSet.has(pre));
    const reason =
      prereqs.length === 0
        ? '无前置依赖，可以直接开始学习'
        : `前置知识「${prereqs.join('、')}」已掌握`;
    return { knowledge, reason };
  });
}

/**
 * 为某学生推荐下一步学习内容（GET /api/path/{studentId}）。
 * 步骤（A10.md 十四节 18-22）：
 *  1. 获得学生已掌握知识点集合
 *  2. 查询课程全部 PREREQUISITE 关系
 *  3. 找出"前置已满足、自身未掌握"的候选
 *  4. 按解锁价值 / 难度 / 章节排序
 *  5. 取前 limit 个
 */
export async function recommendPath(
  studentId: string,
  courseId: string,
  limit = 3,
): Promise<PathRecommendation> {
  const [mastery, allPoints, prereqRelations] = await Promise.all([
    getMastery(studentId, courseId),
    listKnowledge(courseId),
    getPrerequisiteRelations(courseId),
  ]);
  const recommendations = computeRecommendations(
    allPoints,
    prereqRelations,
    new Set(mastery.mastered),
    limit,
  );
  return { studentId, recommendations };
}

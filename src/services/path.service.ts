/**
 * 学习路径推荐服务（A10.md 十四节）
 * 最简单算法：基于已掌握集合 + PREREQUISITE 关系做图遍历，推荐前 3 个知识点。
 * tier1：桩实现；tier2 落地真实图遍历。赛题明确不要求训练推荐模型。
 */
import type { KnowledgePoint, PathRecommendation } from '@/types';
import { getKnowledgeById, getPrerequisiteRelations } from '@/services/graph.service';
import { getMastery } from '@/services/course.service';

/**
 * 为某学生推荐下一步学习内容（GET /api/path/{studentId}）。
 * 步骤（A10.md 十四节 18-22）：
 * 1. 获得学生已掌握知识点集合
 * 2. 查询所有 PREREQUISITE 关系
 * 3. 找出"前置已掌握、目标未掌握"的知识点
 * 4. 按章节顺序/难度排序
 * 5. 推荐前 3 个
 */
export async function recommendPath(
  studentId: string,
  courseId: string,
  limit = 3,
): Promise<PathRecommendation> {
  const mastery = await getMastery(studentId);
  const mastered = new Set(mastery.mastered);
  const prereqRelations = await getPrerequisiteRelations(courseId);

  // TODO(tier2): 完善排序（章节顺序 + 难度）与去重，并处理多前置依赖
  const candidateNames = prereqRelations
    .filter((r) => mastered.has(r.source) && !mastered.has(r.target))
    .map((r) => r.target);

  const recommendations: PathRecommendation['recommendations'] = [];
  for (const name of candidateNames.slice(0, limit)) {
    const knowledge: KnowledgePoint | null = await getKnowledgeById(name);
    if (knowledge) {
      recommendations.push({
        knowledge,
        reason: `前置知识已掌握，建议学习「${knowledge.name}」`,
      });
    }
  }

  return { studentId, recommendations };
}

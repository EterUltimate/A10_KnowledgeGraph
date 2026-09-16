/**
 * 学习路径推荐单元测试：验证"前置已满足才推荐"与排序策略
 */
import { describe, expect, it } from 'vitest';
import { computeRecommendations } from '@/services/path.service';
import type { KnowledgePoint, Relation } from '@/types';

function point(name: string, chapter: string, difficulty: number): KnowledgePoint {
  return { id: `k-${name}`, name, definition: `${name} 的测试定义`, chapter, difficulty };
}

const POINTS: KnowledgePoint[] = [
  point('数据结构', '绪论', 1),
  point('线性表', '线性表', 1),
  point('栈', '栈和队列', 2),
  point('队列', '栈和队列', 2),
  point('二叉树', '树与二叉树', 3),
];

const RELATIONS: Relation[] = [
  { source: '数据结构', target: '线性表', type: 'PREREQUISITE' },
  { source: '线性表', target: '栈', type: 'PREREQUISITE' },
  { source: '线性表', target: '队列', type: 'PREREQUISITE' },
  { source: '栈', target: '二叉树', type: 'PREREQUISITE' },
];

describe('computeRecommendations', () => {
  it('零基础时只推荐无前置依赖的知识点', () => {
    const recs = computeRecommendations(POINTS, RELATIONS, new Set(), 3);
    const names = recs.map((r) => r.knowledge.name);
    // 无前置的数据结构、二叉树（无前置边指向它? 二叉树有前置"栈"→ 不应出现）
    expect(names).toContain('数据结构');
    expect(names).not.toContain('栈');
    expect(names).not.toContain('二叉树');
    expect(recs[0].reason).toContain('无前置');
  });

  it('掌握前置后解锁后继，且理由说明前置', () => {
    const recs = computeRecommendations(POINTS, RELATIONS, new Set(['数据结构', '线性表']), 3);
    const names = recs.map((r) => r.knowledge.name);
    expect(names).toEqual(expect.arrayContaining(['栈', '队列']));
    expect(names).not.toContain('线性表'); // 已掌握不再推荐
    const stack = recs.find((r) => r.knowledge.name === '栈');
    expect(stack?.reason).toContain('线性表');
  });

  it('解锁价值高的知识点优先（学完能解锁更多后继）', () => {
    // 掌握 数据结构+线性表+队列 后：栈 可解锁二叉树，解锁价值更高，应排在前
    const recs = computeRecommendations(
      POINTS,
      RELATIONS,
      new Set(['数据结构', '线性表', '队列']),
      2,
    );
    expect(recs[0].knowledge.name).toBe('栈');
  });

  it('limit 限制返回数量', () => {
    const recs = computeRecommendations(POINTS, RELATIONS, new Set(['数据结构']), 1);
    expect(recs).toHaveLength(1);
  });
});

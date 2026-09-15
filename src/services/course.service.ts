/**
 * 课程与用户服务（A10.md 二节：用户与课程模块）
 * tier1：桩实现，内存态数据；tier2 可迁移至持久化存储。
 * 覆盖：课程列表、课程创建、学生掌握状态读写。
 */
import type { Course, MasteryState } from '@/types';

/** 内存态课程存储（tier1 占位） */
const courseStore: Course[] = [
  {
    id: 'data-structures',
    name: '数据结构',
    fileTypes: ['pdf', 'txt'],
    createdAt: new Date().toISOString(),
    knowledgeCount: 0,
  },
];

/** 内存态学生掌握状态（tier1 占位） */
const masteryStore: Record<string, MasteryState> = {};

/** 课程列表（GET /api/course/list，A10.md 十六节） */
export async function listCourses(): Promise<Course[]> {
  return [...courseStore];
}

/** 按 id 获取课程 */
export async function getCourse(courseId: string): Promise<Course | null> {
  return courseStore.find((c) => c.id === courseId) ?? null;
}

/** 创建课程（上传资料时可自动创建/更新，A10.md 十二节） */
export async function createCourse(course: Omit<Course, 'createdAt'>): Promise<Course> {
  const existing = courseStore.find((c) => c.id === course.id);
  if (existing) {
    Object.assign(existing, course);
    return existing;
  }
  const created: Course = { ...course, createdAt: new Date().toISOString() };
  courseStore.push(created);
  return created;
}

/** 获取学生掌握状态（A10.md 十四节 步骤 18） */
export async function getMastery(studentId: string): Promise<MasteryState> {
  return masteryStore[studentId] ?? { studentId, mastered: [] };
}

/** 标记某知识点为已掌握（A10.md 十九节 步骤 35：标记"线性表"已掌握） */
export async function markMastered(studentId: string, knowledgeName: string): Promise<MasteryState> {
  const state = masteryStore[studentId] ?? { studentId, mastered: [] };
  if (!state.mastered.includes(knowledgeName)) {
    state.mastered.push(knowledgeName);
  }
  masteryStore[studentId] = state;
  return state;
}

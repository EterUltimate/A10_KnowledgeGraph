/**
 * 课程与用户服务（A10.md 二节：用户与课程模块）
 * tier2：课程注册表持久化到 JSON 文件（data/store/courses.json），重启不丢数据；
 * 学生掌握状态走 MasteryStore 抽象（A-4：JSON 实现 + 写队列 + 文件锁，可扩展 SQL）。
 * 多课程：掌握状态按 学生+课程 维度隔离（key = studentId::courseId）。
 */
import path from 'path';
import type { Course, MasteryState } from '@/types';
import { readJsonFile, writeJsonFile } from '@/lib/db/json-file';
import { config } from '@/lib/config';
import { getMasteryStore } from '@/lib/db/mastery-store';
import { countKnowledge } from '@/services/graph.service';

/** 课程注册表持久化路径 */
function coursesFile(): string {
  return path.join(config.store.dataDir, 'courses.json');
}

const globalForCourse = globalThis as unknown as {
  __a10Courses?: Course[];
};

function loadCourses(): Course[] {
  if (!globalForCourse.__a10Courses) {
    globalForCourse.__a10Courses = readJsonFile<Course[]>(coursesFile(), []);
  }
  return globalForCourse.__a10Courses;
}

function saveCourses(): void {
  writeJsonFile(coursesFile(), globalForCourse.__a10Courses ?? []);
}

/** 课程列表（GET /api/course/list，A10.md 十六节），实时统计知识点数量 */
export async function listCourses(): Promise<Course[]> {
  const courses = loadCourses();
  const withCounts = await Promise.all(
    courses.map(async (c) => ({ ...c, knowledgeCount: await countKnowledge(c.id) })),
  );
  return withCounts;
}

/** 按 id 获取课程 */
export async function getCourse(courseId: string): Promise<Course | null> {
  return loadCourses().find((c) => c.id === courseId) ?? null;
}

/** 创建/更新课程（上传资料时自动登记，A10.md 十二节） */
export async function createCourse(course: Omit<Course, 'createdAt'>): Promise<Course> {
  const courses = loadCourses();
  const existing = courses.find((c) => c.id === course.id);
  if (existing) {
    Object.assign(existing, course);
    saveCourses();
    return existing;
  }
  const created: Course = { ...course, createdAt: new Date().toISOString() };
  courses.push(created);
  saveCourses();
  return created;
}

/** 获取学生某课程的掌握状态（A10.md 十四节 步骤 18） */
export async function getMastery(studentId: string, courseId: string): Promise<MasteryState> {
  return (await getMasteryStore()).get(studentId, courseId);
}

/** 标记某知识点为已掌握（A10.md 十九节 步骤 35） */
export async function markMastered(
  studentId: string,
  courseId: string,
  knowledgeName: string,
): Promise<MasteryState> {
  const store = await getMasteryStore();
  const current = await store.get(studentId, courseId);
  const mastered = current.mastered.includes(knowledgeName)
    ? current.mastered
    : [...current.mastered, knowledgeName];
  return store.set(studentId, courseId, mastered);
}

/** 取消掌握标记（学生误勾时可用） */
export async function unmarkMastered(
  studentId: string,
  courseId: string,
  knowledgeName: string,
): Promise<MasteryState> {
  const store = await getMasteryStore();
  const current = await store.get(studentId, courseId);
  return store.set(
    studentId,
    courseId,
    current.mastered.filter((n) => n !== knowledgeName),
  );
}

/** 直接覆盖整份掌握集合（前端勾选面板批量同步用） */
export async function setMastery(
  studentId: string,
  courseId: string,
  mastered: string[],
): Promise<MasteryState> {
  return (await getMasteryStore()).set(studentId, courseId, mastered);
}

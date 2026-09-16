/**
 * 课程与用户服务（A10.md 二节：用户与课程模块）
 * tier2：课程注册表与学生掌握状态持久化到 JSON 文件（data/store/），
 * 重启不丢数据；图数据本体在 GraphStore（Neo4j/JSON）中。
 * 多课程：掌握状态按 学生+课程 维度隔离（key = studentId::courseId）。
 */
import path from 'path';
import type { Course, MasteryState } from '@/types';
import { readJsonFile, writeJsonFile } from '@/lib/db/json-file';
import { config } from '@/lib/config';
import { countKnowledge } from '@/services/graph.service';

/** 课程注册表持久化路径 */
function coursesFile(): string {
  return path.join(config.store.dataDir, 'courses.json');
}

/** 掌握状态持久化路径 */
function masteryFile(): string {
  return path.join(config.store.dataDir, 'mastery.json');
}

const globalForCourse = globalThis as unknown as {
  __a10Courses?: Course[];
  __a10Mastery?: Record<string, string[]>;
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

function masteryKey(studentId: string, courseId: string): string {
  return `${studentId}::${courseId}`;
}

function loadMastery(): Record<string, string[]> {
  if (!globalForCourse.__a10Mastery) {
    globalForCourse.__a10Mastery = readJsonFile<Record<string, string[]>>(masteryFile(), {});
  }
  return globalForCourse.__a10Mastery;
}

function saveMastery(): void {
  writeJsonFile(masteryFile(), globalForCourse.__a10Mastery ?? {});
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
  const mastered = loadMastery()[masteryKey(studentId, courseId)] ?? [];
  return { studentId, courseId, mastered: [...mastered] };
}

/** 标记某知识点为已掌握（A10.md 十九节 步骤 35） */
export async function markMastered(
  studentId: string,
  courseId: string,
  knowledgeName: string,
): Promise<MasteryState> {
  const store = loadMastery();
  const key = masteryKey(studentId, courseId);
  const mastered = store[key] ?? [];
  if (!mastered.includes(knowledgeName)) {
    mastered.push(knowledgeName);
    store[key] = mastered;
    saveMastery();
  }
  return { studentId, courseId, mastered: [...mastered] };
}

/** 取消掌握标记（学生误勾时可用） */
export async function unmarkMastered(
  studentId: string,
  courseId: string,
  knowledgeName: string,
): Promise<MasteryState> {
  const store = loadMastery();
  const key = masteryKey(studentId, courseId);
  store[key] = (store[key] ?? []).filter((n) => n !== knowledgeName);
  saveMastery();
  return { studentId, courseId, mastered: [...store[key]] };
}

/** 直接覆盖整份掌握集合（前端勾选面板批量同步用） */
export async function setMastery(
  studentId: string,
  courseId: string,
  mastered: string[],
): Promise<MasteryState> {
  const store = loadMastery();
  const key = masteryKey(studentId, courseId);
  store[key] = [...new Set(mastered)];
  saveMastery();
  return { studentId, courseId, mastered: store[key] };
}

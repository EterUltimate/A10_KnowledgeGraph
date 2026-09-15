/**
 * GET /api/course/list — 课程列表（A10.md 十六节）
 */
import { ok } from '@/lib/http';
import { listCourses } from '@/services/course.service';

export async function GET() {
  const courses = await listCourses();
  return ok(courses);
}

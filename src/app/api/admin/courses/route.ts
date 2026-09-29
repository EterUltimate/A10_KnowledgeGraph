/**
 * 管理员：课程（图数据）维护列表
 * GET /api/admin/courses — 全部课程（含实时知识点数）
 */
import { ok, fail } from '@/lib/http';
import { requireAdmin } from '@/lib/auth-guard';
import { listCourses } from '@/services/course.service';

export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;
  try {
    return ok(await listCourses());
  } catch (err) {
    return fail(err instanceof Error ? err.message : '课程列表查询失败', 500);
  }
}

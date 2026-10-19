/**
 * 管理员：删除整门课程（级联清理图谱 + 语料 + 向量 + 注册表）
 * DELETE /api/admin/courses/{id}
 */
import type { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/http';
import { requireAdmin } from '@/lib/auth-guard';
import { getCourse } from '@/services/course.service';
import { deleteCourseFull } from '@/services/demo-seed.service';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await params;
  const course = await getCourse(id);
  if (!course) return fail(`课程不存在：${id}`, 404);
  try {
    const removedNodes = await deleteCourseFull(id);
    return ok({ id, removedNodes });
  } catch (err) {
    return fail(err instanceof Error ? err.message : '删除课程失败', 500);
  }
}

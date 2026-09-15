/**
 * GET /api/path/{studentId} — 获得学习路径（A10.md 十四、十六节）
 * query: courseId（可选，默认 data-structures）、limit（可选，默认 3）
 */
import type { NextRequest } from 'next/server';
import { ok } from '@/lib/http';
import { recommendPath } from '@/services/path.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;
  const courseId = request.nextUrl.searchParams.get('courseId') ?? 'data-structures';
  const limitParam = request.nextUrl.searchParams.get('limit');
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 3;

  const path = await recommendPath(studentId, courseId, Number.isNaN(limit) ? 3 : limit);
  return ok(path);
}

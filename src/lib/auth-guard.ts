/**
 * 教师写操作统一鉴权守卫（A-1）。
 * 纯逻辑判定在 @/lib/auth-roles（可单测）；本模块负责接入 Auth.js 会话并生成响应。
 * 用法：const guard = await requireTeacher(); if (guard) return guard;
 */
import { auth } from '@/auth';
import { fail } from '@/lib/http';
import { decideTeacherAccess } from '@/lib/auth-roles';

/** 返回 null 表示放行；否则返回应直接短路返回的 401/403 响应 */
export async function requireTeacher() {
  const session = await auth();
  const verdict = decideTeacherAccess(session?.user);
  if (verdict === 'unauthorized') {
    return fail('未登录：教师操作需要先登录（teacher 账号）', 401);
  }
  if (verdict === 'forbidden') {
    return fail('禁止访问：该操作需要教师角色', 403);
  }
  return null;
}

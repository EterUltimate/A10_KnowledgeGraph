/**
 * 角色鉴权纯逻辑（A-1）：与 Next 运行时解耦，便于单元测试。
 * 角色可见性采用「向下兼容」：admin ⊇ teacher ⊇ student。
 */
export type Role = 'teacher' | 'student' | 'admin';

export interface SessionUserLike {
  role?: Role;
}

/**
 * 判定教师接口/页面访问权限（teacher 或 admin 放行）。
 * 返回 null=放行；'unauthorized'=未登录（401）；'forbidden'=已登录但角色不足（403）。
 */
export function decideTeacherAccess(
  user: SessionUserLike | null | undefined,
): 'unauthorized' | 'forbidden' | null {
  if (!user) return 'unauthorized';
  return user.role === 'teacher' || user.role === 'admin' ? null : 'forbidden';
}

/** 判定管理员后台访问权限（仅 admin 放行；其余按登录态区分 401/403）。 */
export function decideAdminAccess(
  user: SessionUserLike | null | undefined,
): 'unauthorized' | 'forbidden' | null {
  if (!user) return 'unauthorized';
  return user.role === 'admin' ? null : 'forbidden';
}

/** 角色中文名（UI 徽章/提示复用）。 */
export const ROLE_LABELS: Record<Role, string> = {
  student: '学生',
  teacher: '教师',
  admin: '管理员',
};

/**
 * 角色鉴权纯逻辑（A-1）：与 Next 运行时解耦，便于单元测试。
 */
export type Role = 'teacher' | 'student';

export interface SessionUserLike {
  role?: Role;
}

/**
 * 判定教师接口访问权限。
 * 返回 null=放行；'unauthorized'=未登录（401）；'forbidden'=已登录但角色不足（403）。
 */
export function decideTeacherAccess(
  user: SessionUserLike | null | undefined,
): 'unauthorized' | 'forbidden' | null {
  if (!user) return 'unauthorized';
  return user.role === 'teacher' ? null : 'forbidden';
}

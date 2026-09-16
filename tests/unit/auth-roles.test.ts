/**
 * 角色鉴权纯逻辑单元测试（A-1）
 */
import { describe, expect, it } from 'vitest';
import { decideTeacherAccess } from '@/lib/auth-roles';

describe('decideTeacherAccess', () => {
  it('未登录（无会话）返回 unauthorized', () => {
    expect(decideTeacherAccess(null)).toBe('unauthorized');
    expect(decideTeacherAccess(undefined)).toBe('unauthorized');
  });

  it('学生角色或无角色会话返回 forbidden', () => {
    expect(decideTeacherAccess({ role: 'student' })).toBe('forbidden');
    expect(decideTeacherAccess({})).toBe('forbidden');
  });

  it('教师角色放行（返回 null）', () => {
    expect(decideTeacherAccess({ role: 'teacher' })).toBeNull();
  });
});

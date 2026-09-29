/**
 * 角色鉴权纯逻辑单元测试（A-1）
 */
import { describe, expect, it } from 'vitest';
import { ROLE_LABELS, decideAdminAccess, decideTeacherAccess } from '@/lib/auth-roles';

describe('decideTeacherAccess', () => {
  it('未登录（无会话）返回 unauthorized', () => {
    expect(decideTeacherAccess(null)).toBe('unauthorized');
    expect(decideTeacherAccess(undefined)).toBe('unauthorized');
  });

  it('学生角色或无角色会话返回 forbidden', () => {
    expect(decideTeacherAccess({ role: 'student' })).toBe('forbidden');
    expect(decideTeacherAccess({})).toBe('forbidden');
  });

  it('教师与管理员均放行（向下兼容）', () => {
    expect(decideTeacherAccess({ role: 'teacher' })).toBeNull();
    expect(decideTeacherAccess({ role: 'admin' })).toBeNull();
  });
});

describe('decideAdminAccess', () => {
  it('未登录 unauthorized；教师/学生 forbidden；仅 admin 放行', () => {
    expect(decideAdminAccess(null)).toBe('unauthorized');
    expect(decideAdminAccess({ role: 'teacher' })).toBe('forbidden');
    expect(decideAdminAccess({ role: 'student' })).toBe('forbidden');
    expect(decideAdminAccess({ role: 'admin' })).toBeNull();
  });
});

describe('ROLE_LABELS', () => {
  it('三种角色均有中文名', () => {
    expect(ROLE_LABELS.admin).toBe('管理员');
    expect(ROLE_LABELS.teacher).toBe('教师');
    expect(ROLE_LABELS.student).toBe('学生');
  });
});

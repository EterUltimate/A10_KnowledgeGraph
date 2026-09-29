/**
 * 用户账号服务单元测试：scrypt 哈希/校验、默认播种、增删改与「最后管理员保护」。
 * 通过独立 DATA_DIR + 重置 globalThis 缓存隔离用例。
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { beforeEach, describe, expect, it } from 'vitest';

const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'a10-users-'));
process.env.DATA_DIR = DATA_DIR;

const svc = await import('@/services/user.service');
const { hashPassword, verifyPassword, verifyUser, listUsers, createUser, removeUser, setUserPassword } = svc;

function resetStore(): void {
  (globalThis as unknown as { __a10Users?: unknown }).__a10Users = undefined;
  const f = path.join(DATA_DIR, 'users.json');
  if (fs.existsSync(f)) fs.rmSync(f);
}

beforeEach(() => resetStore());

describe('hashPassword / verifyPassword', () => {
  it('正确口令通过、错误口令失败；哈希非明文', () => {
    const salt = 'deadbeef';
    const hash = hashPassword('s3cret', salt);
    expect(hash).not.toContain('s3cret');
    expect(verifyPassword('s3cret', salt, hash)).toBe(true);
    expect(verifyPassword('wrong', salt, hash)).toBe(false);
  });
});

describe('默认播种与登录校验', () => {
  it('首次加载播种 admin/teacher/student 三个账号', () => {
    const users = listUsers();
    expect(users.map((u) => u.username).sort()).toEqual(['admin', 'student', 'teacher']);
    expect(users.find((u) => u.username === 'admin')?.role).toBe('admin');
  });

  it('安全视图不含 salt/passwordHash 字段', () => {
    const [u] = listUsers();
    expect(u).not.toHaveProperty('passwordHash');
    expect(u).not.toHaveProperty('salt');
  });

  it('verifyUser 接受演示口令、拒绝错误口令', () => {
    expect(verifyUser('teacher', 'teach123456')?.role).toBe('teacher');
    expect(verifyUser('admin', 'admin123456')?.role).toBe('admin');
    expect(verifyUser('teacher', 'nope')).toBeNull();
    expect(verifyUser('ghost', 'x')).toBeNull();
  });
});

describe('createUser / removeUser / setUserPassword', () => {
  it('新增用户后可登录，重复用户名抛错', () => {
    const created = createUser({ username: 'newbie', password: 'pw123456', name: '新人', role: 'teacher' });
    expect(created.role).toBe('teacher');
    expect(verifyUser('newbie', 'pw123456')?.name).toBe('新人');
    expect(() => createUser({ username: 'newbie', password: 'pw123456', role: 'student' })).toThrow(/已存在/);
  });

  it('重置口令后旧口令失效', () => {
    const u = createUser({ username: 'rot', password: 'oldpass1', role: 'student' });
    expect(setUserPassword(u.id, 'newpass2')).toBe(true);
    expect(verifyUser('rot', 'oldpass1')).toBeNull();
    expect(verifyUser('rot', 'newpass2')?.username).toBe('rot');
  });

  it('禁止删除最后一个管理员；其余可删', () => {
    const admin = listUsers().find((u) => u.role === 'admin')!;
    expect(() => removeUser(admin.id)).toThrow(/管理员/);
    const student = listUsers().find((u) => u.username === 'student')!;
    expect(removeUser(student.id)).toBe(true);
    expect(listUsers().some((u) => u.username === 'student')).toBe(false);
  });
});

/**
 * 用户账号服务（管理员后台 A-1 扩展）：
 * - 持久化到 data/store/users.json（与课程/掌握状态同款 JSON 文件存储，重启不丢）；
 * - 口令用 scrypt 加盐哈希存储（随机盐 + timingSafeEqual 比对），绝不落明文；
 * - 首次加载自动播种三个默认账号（admin/teacher/student，口令沿用 .env 演示账号约定）；
 * - 对外读取（listUsers / 会话返回值）一律剔除 salt/passwordHash，防泄露。
 */
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '@/lib/config';
import { readJsonFile, writeJsonFile } from '@/lib/db/json-file';
import type { Role } from '@/lib/auth-roles';

interface StoredUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  salt: string;
  passwordHash: string;
  createdAt: string;
}

/** 对外安全视图（不含凭据字段） */
export type SafeUser = Omit<StoredUser, 'salt' | 'passwordHash'>;

export interface AuthenticatedUser {
  id: string;
  username: string;
  name: string;
  role: Role;
}

const globalForUsers = globalThis as unknown as { __a10Users?: StoredUser[] };

function usersFile(): string {
  return path.join(config.store.dataDir, 'users.json');
}

/** scrypt 哈希：随机 16 字节盐，输出 64 字节十六进制 */
export function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

/** 常数时间比对，避免时序侧信道 */
export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashPassword(password, salt), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function toSafe(u: StoredUser): SafeUser {
  return { id: u.id, username: u.username, name: u.name, role: u.role, createdAt: u.createdAt };
}

function makeUser(username: string, password: string, name: string, role: Role): StoredUser {
  const salt = crypto.randomBytes(16).toString('hex');
  return {
    id: crypto.randomUUID(),
    username,
    name,
    role,
    salt,
    passwordHash: hashPassword(password, salt),
    createdAt: new Date().toISOString(),
  };
}

/** 默认账号：口令可被 .env 覆盖，与既有演示/e2e 登录保持一致 */
function defaultUserSpecs(): { username: string; password: string; name: string; role: Role }[] {
  const e = process.env;
  return [
    { username: e.DEMO_ADMIN_USER ?? 'admin', password: e.DEMO_ADMIN_PASS ?? 'admin123456', name: '系统管理员', role: 'admin' },
    { username: e.DEMO_TEACHER_USER ?? 'teacher', password: e.DEMO_TEACHER_PASS ?? 'teach123456', name: '教师（演示）', role: 'teacher' },
    { username: e.DEMO_STUDENT_USER ?? 'student', password: e.DEMO_STUDENT_PASS ?? 'study123456', name: '学生（演示）', role: 'student' },
  ];
}

function persist(users: StoredUser[]): void {
  writeJsonFile(usersFile(), users);
}

/** 读取全部用户；文件不存在时播种默认账号并落盘 */
function loadUsers(): StoredUser[] {
  if (!globalForUsers.__a10Users) {
    const file = usersFile();
    const existing = readJsonFile<StoredUser[] | null>(file, null);
    if (existing && Array.isArray(existing) && existing.length > 0) {
      globalForUsers.__a10Users = existing;
    } else {
      globalForUsers.__a10Users = defaultUserSpecs().map((s) =>
        makeUser(s.username, s.password, s.name, s.role),
      );
      persist(globalForUsers.__a10Users);
    }
  }
  return globalForUsers.__a10Users;
}

/** 登录校验：成功返回不含凭据的用户，失败返回 null */
export function verifyUser(username: string, password: string): AuthenticatedUser | null {
  const u = loadUsers().find((x) => x.username === username.trim());
  if (!u || !verifyPassword(password, u.salt, u.passwordHash)) return null;
  return { id: u.id, username: u.username, name: u.name, role: u.role };
}

/** 用户列表（安全视图，按创建时间） */
export function listUsers(): SafeUser[] {
  return loadUsers().map(toSafe);
}

/** 新增用户；用户名重复或角色非法抛错 */
export function createUser(input: {
  username: string;
  password: string;
  name?: string;
  role: Role;
}): SafeUser {
  const users = loadUsers();
  const username = input.username.trim();
  if (!username || !input.password) throw new Error('用户名与密码不能为空');
  if (!['admin', 'teacher', 'student'].includes(input.role)) throw new Error('非法角色');
  if (users.some((u) => u.username === username)) throw new Error(`用户名已存在：${username}`);
  const created = makeUser(username, input.password, input.name?.trim() || username, input.role);
  users.push(created);
  persist(users);
  return toSafe(created);
}

/** 删除用户；禁止删除系统中最后一个管理员 */
export function removeUser(id: string): boolean {
  const users = loadUsers();
  const target = users.find((u) => u.id === id);
  if (!target) return false;
  if (target.role === 'admin' && users.filter((u) => u.role === 'admin').length <= 1) {
    throw new Error('至少保留一个管理员账号，无法删除');
  }
  globalForUsers.__a10Users = users.filter((u) => u.id !== id);
  persist(globalForUsers.__a10Users);
  return true;
}

/** 重置某用户口令（管理员维护用） */
export function setUserPassword(id: string, password: string): boolean {
  const users = loadUsers();
  const target = users.find((u) => u.id === id);
  if (!target) return false;
  const salt = crypto.randomBytes(16).toString('hex');
  target.salt = salt;
  target.passwordHash = hashPassword(password, salt);
  persist(users);
  return true;
}

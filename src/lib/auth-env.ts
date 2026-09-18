/**
 * 鉴权环境读取（A-1）：middleware（Edge Runtime）与 src/auth.ts 共用。
 * 注意：本模块被 Edge Runtime 加载，禁止引入 Node 内置模块（path/fs 等）。
 * 演示账号与密钥的缺省值仅用于本地演示与 e2e，生产环境必须通过环境变量覆盖。
 */

export const AUTH_SECRET_FALLBACK = 'a10-demo-secret-change-me-in-production';

export function readAuthSecret(): string {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? AUTH_SECRET_FALLBACK;
}

export const DEMO_ACCOUNTS = {
  teacher: {
    username: process.env.DEMO_TEACHER_USER ?? 'teacher',
    password: process.env.DEMO_TEACHER_PASS ?? 'teach123456',
  },
  student: {
    username: process.env.DEMO_STUDENT_USER ?? 'student',
    password: process.env.DEMO_STUDENT_PASS ?? 'study123456',
  },
} as const;

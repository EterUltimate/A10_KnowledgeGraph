/**
 * Auth.js v5 配置（A-1）：Credentials Provider + JWT 会话，无数据库依赖。
 * 角色模型：teacher（教师端写操作）/ student（学生端默认角色）。
 * 演示账号见 src/lib/auth-env.ts；生产环境必须覆盖（见 README「登录与角色」）。
 */
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { DEMO_ACCOUNTS, readAuthSecret } from '@/lib/auth-env';

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: readAuthSecret(),
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      name: '演示账号登录',
      credentials: {
        username: { label: '用户名', type: 'text' },
        password: { label: '密码', type: 'password' },
      },
      authorize(credentials) {
        const username = String(credentials?.username ?? '').trim();
        const password = String(credentials?.password ?? '');
        if (
          username === DEMO_ACCOUNTS.teacher.username &&
          password === DEMO_ACCOUNTS.teacher.password
        ) {
          return { id: 'teacher', name: '教师（演示）', role: 'teacher' as const };
        }
        if (
          username === DEMO_ACCOUNTS.student.username &&
          password === DEMO_ACCOUNTS.student.password
        ) {
          return { id: 'student', name: '学生（演示）', role: 'student' as const };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = (token.role as 'teacher' | 'student' | undefined) ?? 'student';
      }
      return session;
    },
  },
});

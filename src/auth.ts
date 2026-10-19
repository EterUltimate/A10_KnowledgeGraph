/**
 * Auth.js v5 配置（A-1）：Credentials Provider + JWT 会话，无数据库依赖。
 * 角色模型：student（学生端）/ teacher（教师端）/ admin（管理后台），向下兼容。
 * 账号存于 data/store/users.json（scrypt 哈希），首次自动播种演示账号，见 user.service。
 */
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { readAuthSecret } from '@/lib/auth-env';
import { verifyUser } from '@/services/user.service';

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: readAuthSecret(),
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      name: '账号登录',
      credentials: {
        username: { label: '用户名', type: 'text' },
        password: { label: '密码', type: 'password' },
      },
      authorize(credentials) {
        const username = String(credentials?.username ?? '').trim();
        const password = String(credentials?.password ?? '');
        const user = verifyUser(username, password);
        if (!user) return null;
        return { id: user.id, name: user.name, email: user.username, role: user.role };
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
        session.user.role =
          (token.role as 'teacher' | 'student' | 'admin' | undefined) ?? 'student';
      }
      return session;
    },
  },
});

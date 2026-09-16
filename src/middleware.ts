/**
 * 路由级角色守卫（A-1，配合 src/lib/auth-guard.ts 形成纵深防御）：
 * - /teacher/* 页面：未登录跳转 /login（带 callbackUrl），非教师跳转 /login?error=forbidden
 * - 教师写 API（POST/PATCH/PUT/DELETE）：未登录 401，非教师 403（route handler 内二次校验）
 * - 其余路径（学生端页面、读接口、登录端点 /api/auth/*）不拦截
 *
 * 注意：middleware 运行在 Edge Runtime，这里使用独立的最小 NextAuth 配置
 * （只做 JWT 会话校验，不引入凭证认证与 Node 依赖），密钥与 src/auth.ts 保持一致。
 */
import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { readAuthSecret } from '@/lib/auth-env';

const TEACHER_WRITE_API = [
  /^\/api\/knowledge(\/|$)/,
  /^\/api\/relation\/?$/,
  /^\/api\/course\/upload\/?$/,
];
const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

const { auth } = NextAuth({
  secret: readAuthSecret(),
  session: { strategy: 'jwt' },
  providers: [],
  callbacks: {
    session({ session, token }) {
      if (session.user) {
        session.user.role = (token.role as 'teacher' | 'student' | undefined) ?? 'student';
      }
      return session;
    },
  },
});

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const role = session?.user?.role;

  if (pathname.startsWith('/teacher')) {
    if (!session) {
      const url = new URL('/login', req.url);
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
    if (role !== 'teacher') {
      const url = new URL('/login', req.url);
      url.searchParams.set('error', 'forbidden');
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (TEACHER_WRITE_API.some((re) => re.test(pathname)) && WRITE_METHODS.has(req.method)) {
    if (!session) {
      return NextResponse.json(
        { success: false, error: '未登录：教师操作需要先登录（teacher 账号）' },
        { status: 401 },
      );
    }
    if (role !== 'teacher') {
      return NextResponse.json(
        { success: false, error: '禁止访问：该操作需要教师角色' },
        { status: 403 },
      );
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/teacher/:path*', '/api/knowledge/:path*', '/api/relation', '/api/course/upload'],
};

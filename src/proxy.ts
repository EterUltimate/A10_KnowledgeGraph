/**
 * 路由级角色守卫（A-1，配合 src/lib/auth-guard.ts 形成纵深防御）：
 * - /teacher/* ：未登录跳转 /login，非教师/管理员跳 forbidden
 * - /admin/*   ：未登录跳转 /login，非管理员跳 forbidden（仅 admin）
 * - 教师写 API（knowledge/relation/course.upload/llm）：teacher 或 admin 放行
 * - 管理员 API（/api/admin/*）：仅 admin 放行
 * - 其余（学生端页面、读接口、/api/auth/*）不拦截
 *
 * proxy（Next 16 中由 middleware 更名）运行 Edge Runtime，使用最小 NextAuth 配置（仅校验 JWT）。
 */
import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { readAuthSecret } from '@/lib/auth-env';
import { decideAdminAccess, decideTeacherAccess } from '@/lib/auth-roles';

const TEACHER_WRITE_API = [
  /^\/api\/knowledge(\/|$)/,
  /^\/api\/relation\/?$/,
  /^\/api\/course\/upload\/?$/,
  /^\/api\/llm\/(config|models|test)\/?$/,
];
const ADMIN_API = [/^\/api\/admin(\/|$)/];
const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

const { auth } = NextAuth({
  secret: readAuthSecret(),
  session: { strategy: 'jwt' },
  providers: [],
  callbacks: {
    session({ session, token }) {
      if (session.user) {
        session.user.role =
          (token.role as 'teacher' | 'student' | 'admin' | undefined) ?? 'student';
      }
      return session;
    },
  },
});

function redirectToLogin(req: Request, pathname: string, forbidden = false) {
  const url = new URL('/login', req.url);
  if (forbidden) url.searchParams.set('error', 'forbidden');
  else url.searchParams.set('callbackUrl', pathname);
  return NextResponse.redirect(url);
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  // 管理员后台页面：仅 admin（未登录跳登录，已登录非管理员 forbidden）
  if (pathname.startsWith('/admin')) {
    if (!user) return redirectToLogin(req, pathname);
    if (decideAdminAccess(user) === 'forbidden') return redirectToLogin(req, pathname, true);
    return NextResponse.next();
  }

  // 教师端页面：teacher 或 admin
  if (pathname.startsWith('/teacher')) {
    if (!user) return redirectToLogin(req, pathname);
    if (decideTeacherAccess(user) === 'forbidden') return redirectToLogin(req, pathname, true);
    return NextResponse.next();
  }

  // API：管理员写端点仅 admin；教师写端点 teacher 或 admin
  const isWrite = WRITE_METHODS.has(req.method);
  if (isWrite && ADMIN_API.some((re) => re.test(pathname))) {
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录：管理后台需要先登录（admin 账号）' },
        { status: 401 },
      );
    }
    if (decideAdminAccess(user) === 'forbidden') {
      return NextResponse.json(
        { success: false, error: '禁止访问：该操作需要管理员角色' },
        { status: 403 },
      );
    }
  } else if (isWrite && TEACHER_WRITE_API.some((re) => re.test(pathname))) {
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录：教师操作需要先登录（teacher 账号）' },
        { status: 401 },
      );
    }
    if (decideTeacherAccess(user) === 'forbidden') {
      return NextResponse.json(
        { success: false, error: '禁止访问：该操作需要教师角色' },
        { status: 403 },
      );
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/teacher/:path*',
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/knowledge/:path*',
    '/api/relation',
    '/api/course/upload',
    '/api/llm/:path*',
  ],
};

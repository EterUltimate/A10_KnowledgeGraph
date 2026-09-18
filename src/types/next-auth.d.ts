/**
 * Auth.js 类型扩展（A-1）：会话与 JWT 中携带角色信息
 */
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      role: 'teacher' | 'student';
    } & DefaultSession['user'];
  }

  interface User {
    role?: 'teacher' | 'student';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: 'teacher' | 'student';
  }
}

'use client';

/**
 * 客户端 Provider 聚合：SessionProvider（登录态）+ ThemeProvider（深/浅主题）。
 * next-themes 用 class 策略切换主题，配合 tailwind darkMode:'class' 与 CSS 变量。
 */
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { ToastProvider } from '@/components/ui/Toast';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}

import type { Metadata } from 'next';
import './globals.css';
import { NavBar } from '@/components/layout/NavBar';

export const metadata: Metadata = {
  title: 'A10 课程知识图谱智能构建与学习导航系统',
  description: '课程资料上传 → 知识图谱构建 → 个性化学习导航 → 智能问答',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-surface-muted">
        <NavBar />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}

import Link from 'next/link';

/** 页脚：品牌 + 快速入口 + 技术栈标注，发丝线分隔收尾。 */
export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <div className="flex items-center gap-2">
            <LogoMark className="h-5 w-5" />
            <span className="text-sm font-semibold tracking-tight">A10 知识图谱</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-fg-subtle">
            课程知识图谱智能构建与学习导航系统。上传教材，自动抽取知识点与前置关系，为师生提供图谱浏览、学习路径与
            RAG 问答。
          </p>
        </div>
        <nav aria-label="页脚导航" className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
          <div className="col-span-2 mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
            快速入口
          </div>
          <Link href="/student/graph" className="text-fg-muted transition-colors hover:text-fg">
            知识图谱
          </Link>
          <Link href="/student/qa" className="text-fg-muted transition-colors hover:text-fg">
            智能问答
          </Link>
          <Link href="/student/path" className="text-fg-muted transition-colors hover:text-fg">
            学习路径
          </Link>
          <Link href="/teacher/upload" className="text-fg-muted transition-colors hover:text-fg">
            上传资料
          </Link>
          <Link href="/teacher/knowledge" className="text-fg-muted transition-colors hover:text-fg">
            知识点管理
          </Link>
          <Link href="/teacher/settings" className="text-fg-muted transition-colors hover:text-fg">
            模型接入设置
          </Link>
        </nav>
        <div className="flex flex-col gap-2 text-xs text-fg-subtle md:items-end">
          <span className="font-mono">Next.js 16 · AI SDK v7 · Tailwind v4</span>
          <span>© {new Date().getFullYear()} A10 小组 · MIT License</span>
        </div>
      </div>
    </footer>
  );
}

/** 品牌标：三层堆叠的知识图谱结构（节点 + 连线），blue 强调。 */
export function LogoMark({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="5" cy="5" r="2.2" fill="var(--acc-blue)" />
      <circle cx="19" cy="5" r="2.2" fill="var(--acc-violet)" />
      <circle cx="12" cy="12" r="2.4" fill="var(--acc-cyan)" />
      <circle cx="5" cy="19" r="2.2" fill="var(--acc-amber)" />
      <circle cx="19" cy="19" r="2.2" fill="var(--acc-green)" />
      <path
        d="M6.6 6.6l4 4M17.4 6.6l-4 4M6.6 17.4l4-4M17.4 17.4l-4-4M7.2 5h9.6"
        stroke="currentColor"
        className="text-fg-subtle"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

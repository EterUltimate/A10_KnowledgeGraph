/**
 * 首页：Vercel 风格 hero（点阵网格 + 渐变强调）→ 六步流水线 → bento 能力磁贴 → 角色入口。
 * 服务端组件；Tile/Reveal 为客户端交互层（聚光、倾斜、进场动效）。
 */
import Link from 'next/link';
import { Tile } from '@/components/ui/Tile';
import { Reveal } from '@/components/fx/Reveal';

const FLOW = ['课程资料上传', '文档解析', '知识点抽取', '图谱构建', '学习导航', '智能问答'];

const FEATURES: {
  title: string;
  desc: string;
  accent: 'blue' | 'cyan' | 'violet' | 'amber' | 'green' | 'neutral';
  icon: React.ReactNode;
  href?: string;
  wide?: boolean;
}[] = [
  {
    title: '课程资料上传',
    desc: 'PDF / TXT 一键上传，自动清洗文本并按章节切块，全链路耗时 60s 内。',
    accent: 'blue',
    href: '/teacher/upload',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 15V4m0 0L8 8m4-4l4 4" />
        <path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" strokeWidth="2.2" />
      </svg>
    ),
  },
  {
    title: '知识智能抽取',
    desc: 'LLM 结构化抽取知识点名称、定义、章节与难度，zod schema 双保险。',
    accent: 'violet',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 3v4M4 5h4M8 11l9 9M17 11l-9 9" />
        <path d="M17 3l1.2 2.8L21 7l-2.8 1.2L17 11l-1.2-2.8L13 7l2.8-1.2L17 3z" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    title: '图谱可视化',
    desc: '力导向布局呈现知识点网络：前置（红实线）/ 包含（蓝虚线）/ 相关（灰点线），节点点击探查详情。',
    accent: 'cyan',
    href: '/student/graph',
    wide: true,
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="6" cy="6" r="2.4" strokeWidth="2" />
        <circle cx="18" cy="8" r="2" />
        <circle cx="9" cy="17" r="2" />
        <circle cx="18.5" cy="17.5" r="1.5" strokeWidth="1.2" />
        <path d="M8.2 7.2l7.6.7M7 8.2l1.4 6.6M11 16.2l5.6 1" strokeDasharray="0" />
        <path d="M17 9.9l1.2 6.1" strokeDasharray="2 2.4" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    title: '学习路径导航',
    desc: '基于前置关系图遍历，按解锁价值 / 难度 / 章节推荐下一步。',
    accent: 'amber',
    href: '/student/path',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="5.5" cy="18.5" r="2" strokeWidth="2" />
        <circle cx="18.5" cy="5.5" r="2" strokeWidth="2" />
        <path d="M7.5 17.5C11 15 9 9 14.5 7.2" strokeDasharray="1.5 3" />
      </svg>
    ),
  },
  {
    title: '课程 RAG 问答',
    desc: 'AI 仅依据检索到的教材片段作答，答案附带「参考章节」引用块，可展开溯源原文。',
    accent: 'green',
    href: '/student/qa',
    wide: true,
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 4V6z" />
        <path d="M8.5 9h7M8.5 12.5h4.5" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    title: '离线演示模式',
    desc: '未配置 API Key 时自动回落内置《数据结构》数据集，开箱即可体验全流程。',
    accent: 'neutral',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
        <path d="M7.5 9.5L10 12l-2.5 2.5M12.5 15h4" strokeWidth="1.9" />
      </svg>
    ),
  },
];

const ENTRIES: {
  role: string;
  en: string;
  desc: string;
  accent: 'blue' | 'violet';
  cta: { href: string; label: string };
  links: { href: string; label: string; meta: string }[];
}[] = [
  {
    role: '教师端',
    en: 'TEACHER',
    desc: '上传课程资料、自动生成知识图谱、人工修正知识点与关系、接入自有 LLM。',
    accent: 'blue',
    cta: { href: '/teacher/upload', label: '开始上传 →' },
    links: [
      { href: '/teacher/upload', label: '上传课程资料', meta: 'PDF / TXT' },
      { href: '/teacher/knowledge', label: '知识点 / 关系管理', meta: 'CRUD' },
      { href: '/teacher/settings', label: '模型接入设置', meta: '5 种协议' },
    ],
  },
  {
    role: '学生端',
    en: 'STUDENT',
    desc: '浏览知识图谱、标记已掌握知识点、获取学习路径、基于教材智能问答。',
    accent: 'violet',
    cta: { href: '/student/graph', label: '浏览图谱 →' },
    links: [
      { href: '/student/graph', label: '知识图谱浏览', meta: '可视化' },
      { href: '/student/path', label: '学习路径推荐', meta: '图遍历' },
      { href: '/student/qa', label: '课程智能问答', meta: 'RAG' },
    ],
  },
];

export default function HomePage() {
  return (
    <div className="-mt-8">
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden pb-14 pt-16 sm:pt-20">
        <div aria-hidden="true" className="dot-grid pointer-events-none absolute inset-0 -z-10" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-64 w-[42rem] max-w-full -translate-x-1/2 rounded-full"
          style={{ background: 'radial-gradient(closest-side, var(--glow), transparent)' }}
        />
        <Reveal className="mx-auto max-w-3xl text-center">
          <span className="badge">
            <span className="badge-dot text-acc-green" aria-hidden="true" />
            系统在线 · 支持离线演示
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-[1.15] tracking-[-0.03em] sm:text-5xl">
            A10 课程知识图谱
            <br />
            <span className="text-gradient">智能构建与学习导航</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-fg-muted">
            上传教材 → 自动抽取知识点与前置关系 → 生成可交互知识图谱，
            为学生规划学习路径、提供带引用的智能问答。
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/teacher/upload" className="btn btn-primary !px-5 !py-2.5 !text-[15px]">
              教师端 · 上传建图
            </Link>
            <Link href="/student/qa" className="btn btn-ghost !px-5 !py-2.5 !text-[15px]">
              学生端 · 开始问答
            </Link>
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono text-xs text-fg-subtle">
            <span>主课程《数据结构》</span>
            <span aria-hidden="true" className="h-3 w-px bg-line-strong" />
            <span>20–50 知识点 / 课程</span>
            <span aria-hidden="true" className="h-3 w-px bg-line-strong" />
            <span>Neo4j / JSON 双存储</span>
            <span aria-hidden="true" className="h-3 w-px bg-line-strong" />
            <span>多提供商 LLM</span>
          </div>
        </Reveal>
      </section>

      {/* ---------- 六步流水线 ---------- */}
      <Reveal delay={80}>
        <ol className="flex flex-wrap items-center gap-y-3 border-y border-line py-5 text-sm">
          {FLOW.map((step, i) => (
            <li key={step} className="flex items-center">
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs text-acc-blue">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-medium">{step}</span>
              </span>
              {i < FLOW.length - 1 && (
                <span
                  aria-hidden="true"
                  className="mx-4 h-px w-8 sm:w-12"
                  style={{
                    background: `linear-gradient(90deg, var(--line-strong), transparent)`,
                    // 首段连接线加重，收尾减细——线条粗细节奏
                    height: i === 0 ? 2 : 1,
                  }}
                />
              )}
            </li>
          ))}
        </ol>
      </Reveal>

      {/* ---------- Bento 能力磁贴 ---------- */}
      <section className="mt-14">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-acc-blue">
            Capabilities
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            一条流水线，<span className="text-fg-muted">六个核心能力</span>
          </h2>
        </Reveal>
        <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 70} className={f.wide ? 'lg:col-span-2' : ''}>
              <Tile accent={f.accent} interactive className="group h-full p-6">
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{
                    background: 'var(--surface-muted)',
                    color: `var(--acc-${f.accent === 'neutral' ? 'blue' : f.accent})`,
                  }}
                >
                  {f.icon}
                </span>
                <h3 className="mt-4 text-[15px] font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{f.desc}</p>
                {f.href && (
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-acc-blue opacity-0 transition-all duration-300 [transition-timing-function:var(--ease-spring)] group-hover:translate-x-0.5 group-hover:opacity-100">
                    前往体验 →
                  </span>
                )}
              </Tile>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- 角色入口 ---------- */}
      <section className="mt-14 grid gap-4 md:grid-cols-2">
        {ENTRIES.map((entry, i) => (
          <Reveal key={entry.role} delay={i * 90}>
            <Tile accent={entry.accent} interactive className="h-full p-7">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">{entry.role}</h2>
                <span
                  className={`font-mono text-[10px] uppercase tracking-[0.16em] ${
                    entry.accent === 'blue' ? 'text-acc-blue' : 'text-acc-violet'
                  }`}
                >
                  {entry.en}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{entry.desc}</p>
              <ul className="mt-5 space-y-1">
                {entry.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="group/link flex items-center justify-between rounded-lg border border-transparent px-3 py-2.5 text-sm transition-all duration-200 hover:border-line hover:bg-surface-muted"
                    >
                      <span className="font-medium">{l.label}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                          {l.meta}
                        </span>
                        <span
                          aria-hidden="true"
                          className="text-fg-subtle transition-transform duration-300 [transition-timing-function:var(--ease-spring)] group-hover/link:translate-x-1"
                        >
                          →
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={entry.cta.href}
                className={`mt-5 inline-flex items-center gap-1.5 text-sm font-medium ${
                  entry.accent === 'blue' ? 'text-acc-blue' : 'text-acc-violet'
                }`}
              >
                {entry.cta.label}
              </Link>
            </Tile>
          </Reveal>
        ))}
      </section>

      <Reveal>
        <p className="mt-12 text-center font-mono text-xs text-fg-subtle">
          支持多课程管理 · PDF/TXT 上传 · 离线演示（无需 API Key）· 图存储可切换 Neo4j / 内置 JSON
        </p>
      </Reveal>
    </div>
  );
}

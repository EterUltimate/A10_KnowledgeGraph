/**
 * 首页 / 角色入口
 * 展示系统流程与教师端、学生端入口（A10.md 一节核心流程）。
 */
import Link from 'next/link';

const FLOW = ['课程资料上传', '文档解析', '知识点抽取与关系构建', '知识图谱可视化', '个性化学习导航', '课程智能问答'];

const ENTRIES = [
  {
    role: '教师端',
    desc: '上传课程资料、自动生成知识图谱、人工修改知识点与关系',
    links: [
      { href: '/teacher/upload', label: '上传课程资料' },
      { href: '/teacher/knowledge', label: '知识点/关系管理' },
    ],
  },
  {
    role: '学生端',
    desc: '浏览知识图谱、查看知识点详情、获取学习路径、智能问答',
    links: [
      { href: '/student/graph', label: '知识图谱浏览' },
      { href: '/student/path', label: '学习路径推荐' },
      { href: '/student/qa', label: '课程智能问答' },
    ],
  },
];

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="card">
        <h1 className="text-2xl font-semibold">A10 课程知识图谱智能构建与学习导航系统</h1>
        <p className="mt-2 text-sm text-gray-600">
          14 天版本 · 主课程《数据结构》 · 支持 PDF/TXT · 知识图谱 20–50 个知识点 · 三类关系（前置/包含/相关）
        </p>
        <ol className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          {FLOW.map((step, i) => (
            <li key={step} className="flex items-center gap-2">
              <span className="rounded-full bg-brand-50 px-3 py-1 text-brand-700">{step}</span>
              {i < FLOW.length - 1 && (
                <span className="text-gray-400" aria-hidden="true">
                  →
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {ENTRIES.map((entry) => (
          <div key={entry.role} className="card">
            <h2 className="text-lg font-semibold">{entry.role}</h2>
            <p className="mt-1 text-sm text-gray-600">{entry.desc}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {entry.links.map((l) => (
                <Link key={l.href} href={l.href} className="btn-ghost">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      <p className="text-center text-xs text-gray-500">
        支持多课程管理 · PDF/TXT 上传 · 离线演示模式（无需 API Key）· 图存储可切换 Neo4j / 内置 JSON 存储
      </p>
    </div>
  );
}

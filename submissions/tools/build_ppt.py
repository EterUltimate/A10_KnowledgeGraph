# -*- coding: utf-8 -*-
"""A10 项目简介 PPT 生成脚本（python-pptx，16:9，13 页）。

设计约定：
- 保守排版：正文字号 13-16pt，每页要点不超过 6 条，卡片高度按最长文案预留，防溢出；
- 中文字体统一微软雅黑（同时设置 a:latin 与 a:ea，避免回退宋体）；
- 配色：深蓝主色 + 浅蓝填充 + 灰色辅助，简洁正式；
- 生成后由 PowerPoint COM 逐页导出 PNG 自查（见 render_ppt_png.py）。

用法：python build_ppt.py
输出：A10项目简介PPT.pptx（与本脚本同级的 submissions/ 目录）
"""
import os
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # submissions/
OUT = os.path.join(BASE, "A10项目简介PPT.pptx")

PRIMARY = RGBColor(0x1F, 0x4E, 0x79)
ACCENT = RGBColor(0x2E, 0x75, 0xB6)
LIGHT = RGBColor(0xDE, 0xEB, 0xF7)
LIGHTER = RGBColor(0xF2, 0xF7, 0xFC)
GRAY = RGBColor(0x59, 0x59, 0x59)
TEXT = RGBColor(0x26, 0x26, 0x26)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
GREEN = RGBColor(0x54, 0x82, 0x35)
ORANGE = RGBColor(0xBF, 0x8F, 0x00)
FONT = "微软雅黑"

SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)


def set_font(run, size, bold=False, color=TEXT, name=FONT):
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = name
    rPr = run._r.get_or_add_rPr()
    latin = rPr.find(qn("a:latin"))
    for tag in ("a:ea", "a:cs"):
        el = rPr.find(qn(tag))
        if el is not None:
            rPr.remove(el)
    if latin is not None:
        ea = rPr.makeelement(qn("a:ea"), {"typeface": name})
        latin.addnext(ea)


def add_text(slide, x, y, w, h, lines, align=PP_ALIGN.LEFT,
             anchor=MSO_ANCHOR.TOP, line_spacing=1.12):
    """lines: list of (text, size, bold, color) 或 list of list[...]（同段多 run）。"""
    box = slide.shapes.add_textbox(x, y, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = Emu(0)
    tf.margin_top = tf.margin_bottom = Emu(0)
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = line_spacing
        runs = line if isinstance(line, list) else [line]
        for text, size, bold, color in runs:
            r = p.add_run()
            r.text = text
            set_font(r, size, bold, color)
    return box


def add_rect(slide, x, y, w, h, fill=None, line=None, shape=MSO_SHAPE.ROUNDED_RECTANGLE,
             line_w=1.0, shadow_off=True, radius=None):
    sp = slide.shapes.add_shape(shape, x, y, w, h)
    if fill is None:
        sp.fill.background()
    else:
        sp.fill.solid()
        sp.fill.fore_color.rgb = fill
    if line is None:
        sp.line.fill.background()
    else:
        sp.line.color.rgb = line
        sp.line.width = Pt(line_w)
    if shadow_off:
        sp.shadow.inherit = False
    if radius is not None and shape == MSO_SHAPE.ROUNDED_RECTANGLE:
        try:
            sp.adjustments[0] = radius
        except Exception:
            pass
    sp.text_frame.margin_left = sp.text_frame.margin_right = Emu(0)
    return sp


def add_slide(prs, title=None, subtitle=None, page=None):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    if title:
        add_rect(slide, Inches(0.55), Inches(0.32), Inches(0.09), Inches(0.52), fill=ACCENT,
                 shape=MSO_SHAPE.RECTANGLE)
        add_text(slide, Inches(0.78), Inches(0.28), Inches(9.5), Inches(0.6),
                 [(title, 27, True, PRIMARY)], anchor=MSO_ANCHOR.MIDDLE)
        if subtitle:
            add_text(slide, Inches(0.80), Inches(0.88), Inches(11.8), Inches(0.36),
                     [(subtitle, 13, False, GRAY)])
    if page is not None:
        add_text(slide, Inches(12.35), Inches(7.08), Inches(0.7), Inches(0.3),
                 [(f"{page:02d}", 11, False, GRAY)], align=PP_ALIGN.RIGHT)
        add_text(slide, Inches(0.55), Inches(7.08), Inches(8.0), Inches(0.3),
                 [("基于 AIGC 的课程知识图谱智能构建与学习导航系统", 10, False, RGBColor(0xA6, 0xA6, 0xA6))])
    return slide


def card(slide, x, y, w, h, title, body_lines, title_color=PRIMARY,
         fill=LIGHTER, line=RGBColor(0xBD, 0xD7, 0xEE), title_size=15, body_size=13):
    add_rect(slide, x, y, w, h, fill=fill, line=line)
    add_text(slide, x + Inches(0.16), y + Inches(0.12), w - Inches(0.32), Inches(0.42),
             [(title, title_size, True, title_color)])
    add_text(slide, x + Inches(0.16), y + Inches(0.58), w - Inches(0.32),
             h - Inches(0.7), body_lines, line_spacing=1.15)


def arrow(slide, x, y, w=Inches(0.32), h=Inches(0.26)):
    add_rect(slide, x, y, w, h, fill=ACCENT, shape=MSO_SHAPE.RIGHT_ARROW)


prs = Presentation()
prs.slide_width = SLIDE_W
prs.slide_height = SLIDE_H

# ---------- S1 封面 ----------
s = add_slide(prs)
add_rect(s, Inches(0), Inches(0), SLIDE_W, Inches(2.5), fill=PRIMARY, shape=MSO_SHAPE.RECTANGLE)
add_rect(s, Inches(0), Inches(2.5), SLIDE_W, Inches(0.06), fill=ACCENT, shape=MSO_SHAPE.RECTANGLE)
add_text(s, Inches(0.9), Inches(0.62), Inches(11.5), Inches(1.3),
         [("基于 AIGC 的课程知识图谱", 40, True, WHITE),
          ("智能构建与学习导航系统", 40, True, WHITE)], line_spacing=1.1)
add_text(s, Inches(0.9), Inches(3.0), Inches(11.5), Inches(0.9),
         [("上传课程资料，自动生成可交互的知识图谱；", 18, False, GRAY),
          ("勾选已掌握知识点，获得可解释的个性化学习路径。", 18, False, GRAY)], line_spacing=1.3)
for i, (label, sub) in enumerate([
        ("教师端", "上传即建图 · 手动可修正"),
        ("学生端", "图谱浏览 · 掌握勾选 · 路径推荐"),
        ("智能问答", "依据教材 · 引用可溯源 · 不编造")]):
    x = Inches(0.9 + i * 4.0)
    add_rect(s, x, Inches(4.35), Inches(3.6), Inches(1.15), fill=LIGHTER,
             line=RGBColor(0xBD, 0xD7, 0xEE))
    add_text(s, x + Inches(0.2), Inches(4.5), Inches(3.2), Inches(0.4),
             [(label, 16, True, PRIMARY)])
    add_text(s, x + Inches(0.2), Inches(4.92), Inches(3.2), Inches(0.45),
             [(sub, 12, False, GRAY)])
add_text(s, Inches(0.9), Inches(6.15), Inches(11.5), Inches(0.9),
         [("浙江师范大学服务外包大赛 A 类企业命题 A10 ｜ 命题企业：杭州金扬智能科技有限公司", 14, False, GRAY),
          ("参赛团队：【待填】　指导老师：【待填】　2026-09", 13, False, GRAY)], line_spacing=1.4)

# ---------- S2 背景与痛点 ----------
s = add_slide(prs, "背景与痛点", "为什么课程知识图谱“图很好、建图难”", 2)
items = [
    ("知识孤岛", ["课程内容散落在教材、课件、教案等", "非结构化文档中，知识点分散、", "缺乏显式关联，学生难见全局。"]),
    ("学习易迷路", ["学生不知道“现在该学什么、", "接下来能学什么”，学习顺序", "全凭感觉，容易走弯路。"]),
    ("建图门槛高", ["传统图谱构建依赖教师/专家手工", "整理，工作量大、周期长、", "难以规模化推广。"]),
]
for i, (t, body) in enumerate(items):
    card(s, Inches(0.7 + i * 4.15), Inches(1.55), Inches(3.75), Inches(2.15), t,
         [(b, 14, False, TEXT) for b in body], title_size=17)
add_rect(s, Inches(0.7), Inches(4.15), Inches(11.95), Inches(1.9), fill=LIGHT,
         line=ACCENT)
add_text(s, Inches(1.0), Inches(4.38), Inches(11.4), Inches(1.5),
         [("AIGC 带来的机遇", 16, True, PRIMARY),
          ("大语言模型具备从自然语言文档中自动抽取知识点实体与语义关系的能力——把“数周级手工建图”", 14, False, TEXT),
          ("压缩为“上传即得的一分钟级自动流程”；再辅以基于图谱的问答与路径推荐，教学从“经验驱动”走向“数据驱动”。", 14, False, TEXT)],
         line_spacing=1.25)

# ---------- S3 方案总览 ----------
s = add_slide(prs, "方案总览：一条完整的自动化链路", "课程资料上传 → 文档解析 → 知识抽取与关系构建 → 图谱生成与可视化 → 智能学习导航", 3)
steps = ["资料上传", "文档解析", "知识抽取", "图谱可视化", "智能导航"]
subs = ["PDF / TXT", "清洗·切块", "实体+关系", "ECharts", "问答+路径"]
for i, (t, sub) in enumerate(zip(steps, subs)):
    x = Inches(0.62 + i * 2.5)
    add_rect(s, x, Inches(1.7), Inches(2.1), Inches(1.0), fill=PRIMARY if i in (0, 4) else ACCENT)
    tf = s.shapes[-1].text_frame if False else None
    add_text(s, x, Inches(1.86), Inches(2.1), Inches(0.4), [(t, 16, True, WHITE)], align=PP_ALIGN.CENTER)
    add_text(s, x, Inches(2.28), Inches(2.1), Inches(0.32), [(sub, 11, False, WHITE)], align=PP_ALIGN.CENTER)
    if i < 4:
        arrow(s, x + Inches(2.14), Inches(2.07))
add_text(s, Inches(0.62), Inches(3.05), Inches(12.1), Inches(0.4),
         [("教师上传一份教材，系统一分钟内自动产出结构化知识图谱；无大模型 Key 时自动进入离线演示模式，全流程照常可跑。", 13, False, GRAY)])
card(s, Inches(0.62), Inches(3.7), Inches(6.0), Inches(2.9), "教师端：把建图门槛降到“会上传文件”",
     [("• 上传 PDF/TXT，自动解析（GBK 编码自动回退）", 13.5, False, TEXT),
      ("• 章节感知切块 → 大模型分批抽取（结构化约束）", 13.5, False, TEXT),
      ("• 三类关系：前置 / 包含 / 相关，三重清洗入图", 13.5, False, TEXT),
      ("• 图谱实时预览，节点与关系可增删改（赛题加分项）", 13.5, False, TEXT),
      ("• 多课程独立管理，耗时分解透明可查", 13.5, False, TEXT)])
card(s, Inches(6.95), Inches(3.7), Inches(6.0), Inches(2.9), "学生端：每一步都有依据、有推荐、可溯源",
     [("• ECharts 力导向图谱：缩放、拖拽、点击看详情", 13.5, False, TEXT),
      ("• 按章节勾选“已掌握”，进度按学生×课程隔离", 13.5, False, TEXT),
      ("• 图遍历推荐下一步学什么，附推荐理由", 13.5, False, TEXT),
      ("• 智能问答严格依据教材，标注参考章节与引用片段", 13.5, False, TEXT),
      ("• 教材未涉及的问题明确拒答，不编造", 13.5, False, TEXT)])

# ---------- S4 总体架构 ----------
s = add_slide(prs, "总体架构：四层单向依赖，存储可插拔", "Next.js 15 全栈同构 · TypeScript 全程类型约束 · zod 运行时校验", 4)
layers = [
    ("前端层", "教师端 2 页（上传 / 图谱管理） + 学生端 3 页（图谱 / 问答 / 路径） + 登录页；ECharts 图谱、流式对话、课程切换等组件", PRIMARY, WHITE),
    ("接口层", "13 个 REST 端点：上传建图、图谱、知识点、关系、问答、掌握、推荐；统一响应包装；NextAuth 角色守卫区分 401/403", ACCENT, WHITE),
    ("服务层", "文档解析（PDF/TXT·GBK 回退·章节切块）｜ RAG（bigram 检索·离线兜底）｜ 路径推荐（图遍历）｜ 知识抽取（AI SDK + zod）", RGBColor(0x2E, 0x75, 0xB6), WHITE),
    ("存储层", "GraphStore 统一接口（14 方法，按课程隔离）：Neo4j（Cypher）与 JSON 文件双实现，auto 模式探测连通性自动降级", RGBColor(0x54, 0x82, 0x35), WHITE),
]
for i, (name, desc, fill, fg) in enumerate(layers):
    y = Inches(1.6 + i * 1.06)
    add_rect(s, Inches(0.7), y, Inches(1.7), Inches(0.92), fill=fill)
    add_text(s, Inches(0.7), y + Inches(0.28), Inches(1.7), Inches(0.4),
             [(name, 16, True, fg)], align=PP_ALIGN.CENTER)
    add_rect(s, Inches(2.4), y, Inches(10.25), Inches(0.92), fill=LIGHTER,
             line=RGBColor(0xBD, 0xD7, 0xEE))
    add_text(s, Inches(2.62), y + Inches(0.1), Inches(9.85), Inches(0.75),
             [(desc, 13, False, TEXT)], anchor=MSO_ANCHOR.MIDDLE, line_spacing=1.12)
add_text(s, Inches(0.7), Inches(6.0), Inches(12.0), Inches(0.75),
         [("关键架构约束：业务层只依赖 GraphStore 接口，不感知底层实现——评审机器没有 Neo4j 时自动降级 JSON 存储，", 13.5, False, GRAY),
          ("零配置即可跑通全流程；配置 Neo4j 后无缝切换真实图数据库，代码零改动。", 13.5, False, GRAY)], line_spacing=1.25)

# ---------- S5 教师端 ----------
s = add_slide(prs, "教师端：上传即建图，图谱可修正", "赛题加分项“教师手动修正图谱”已完整实现", 5)
card(s, Inches(0.62), Inches(1.55), Inches(6.0), Inches(4.9), "自动建图流水线（上传 → 图谱）",
     [("1. 选择课程并上传 PDF/TXT（白名单校验，≤20MB）", 14, False, TEXT),
      ("2. 文档解析：PDF 走 pdf-parse；TXT 按 UTF-8 解码，", 14, False, TEXT),
      ("    检测到乱码替换符自动回退 GBK（国内教材友好）", 14, False, TEXT),
      ("3. 清洗页码页眉 → 章节标题感知切块（尽量不拆段落）", 14, False, TEXT),
      ("4. 大模型分批抽取：块数上限 6、并发 3、单块失败跳过", 14, False, TEXT),
      ("    zod schema 强约束输出，名称归一化去重", 14, False, TEXT),
      ("5. 关系三重清洗：类型白名单 → 端点校验 → 去自环去重", 14, False, TEXT),
      ("6. 单事务批量建图；返回知识点/关系/文本块数量与", 14, False, TEXT),
      ("    解析/抽取/合计耗时分解，供 60 秒指标逐次核查", 14, False, TEXT)], title_size=16)
card(s, Inches(6.95), Inches(1.55), Inches(6.0), Inches(4.9), "手动修正（实时预览联动）",
     [("• 知识点：新增 / 编辑 / 删除（删除级联清理关联关系）", 14, False, TEXT),
      ("• 关系：新增 / 删除，类型限定前置 / 包含 / 相关", 14, False, TEXT),
      ("• ECharts 图谱实时预览，改动即刻反映到图上", 14, False, TEXT),
      ("• 全量知识点列表管理（名称/章节/难度/定义）", 14, False, TEXT),
      ("", 6, False, TEXT),
      ("多课程管理", 15, True, PRIMARY),
      ("• 上传时自定义课程 ID 与名称，可同时维护多门课程", 14, False, TEXT),
      ("• 图谱 / 语料 / 掌握状态按课程全链路隔离，切换即生效", 14, False, TEXT)], title_size=16)

# ---------- S6 学生端 ----------
s = add_slide(prs, "学生端：浏览 · 勾选 · 被推荐", "以“学生×课程”维度的掌握状态驱动个性化学习导航", 6)
items = [
    ("图谱浏览与详情", ["ECharts 力导向图：缩放、拖拽；", "三类关系分色 + 中文边标签；", "节点大小映射难度；点击节点", "弹出详情卡（定义/章节/难度/来源）。"]),
    ("掌握勾选", ["按章节分组的知识点清单；", "勾选“已掌握”即持久化保存；", "支持多课程独立进度，", "互不干扰。"]),
    ("路径推荐", ["只推荐“前置已全部掌握”的知识点；", "解锁价值 / 难度 / 章节三重排序；", "每条附推荐理由；", "勾选后推荐列表实时刷新。"]),
]
for i, (t, body) in enumerate(items):
    card(s, Inches(0.62 + i * 4.15), Inches(1.6), Inches(3.78), Inches(2.5), t,
         [(b, 13.5, False, TEXT) for b in body], title_size=16)
add_rect(s, Inches(0.62), Inches(4.45), Inches(12.35), Inches(1.75), fill=LIGHT, line=ACCENT)
add_text(s, Inches(0.92), Inches(4.65), Inches(11.8), Inches(1.4),
         [("设计要点", 15, True, PRIMARY),
          ("推荐算法是纯函数（O(V+E) 图遍历），行为被 4 个单元测试精确固定；“学一个 → 勾一个 → 推荐立即更新”", 13.5, False, TEXT),
          ("形成学习闭环，完全符合赛题“允许简单图遍历、不要求复杂机器学习模型”的定位。", 13.5, False, TEXT)],
         line_spacing=1.25)

# ---------- S7 RAG 问答 ----------
s = add_slide(prs, "智能问答：检索增强 + 引用先行的流式生成", "自研轻量 RAG，零向量库依赖，行为确定可测试", 7)
flow = ["学生提问", "bigram 检索", "流式生成", "引用标注"]
fsubs = ["课程语料内", "词频打分 Top4", "只依据教材", "章节+片段"]
for i, (t, sub) in enumerate(zip(flow, fsubs)):
    x = Inches(0.62 + i * 3.25)
    add_rect(s, x, Inches(1.6), Inches(2.75), Inches(0.95), fill=ACCENT)
    add_text(s, x, Inches(1.74), Inches(2.75), Inches(0.4), [(t, 15, True, WHITE)], align=PP_ALIGN.CENTER)
    add_text(s, x, Inches(2.16), Inches(2.75), Inches(0.3), [(sub, 11, False, WHITE)], align=PP_ALIGN.CENTER)
    if i < 3:
        arrow(s, x + Inches(2.79), Inches(1.94))
card(s, Inches(0.62), Inches(2.95), Inches(6.0), Inches(3.5), "检索算法（中文友好，零外部依赖）",
     [("• 中文按相邻双字（bigram）分词，英文按单词；", 13.5, False, TEXT),
      ("  “循环链表”生成“循环/环链/链表”，无需词典", 13.5, False, TEXT),
      ("• 命中计 1+ln(词频)，章节名命中额外加成", 13.5, False, TEXT),
      ("• 单字命中作低权重兜底信号（措辞不一致时防漏召回）", 13.5, False, TEXT),
      ("• 总分按查询词数平方根归一化，取 Top4 为上下文", 13.5, False, TEXT),
      ("• 全部零分仍回退 Top4，让模型能答“教材未涉及”", 13.5, False, TEXT)], title_size=16)
card(s, Inches(6.95), Inches(2.95), Inches(6.0), Inches(3.5), "防幻觉与可溯源",
     [("• 系统提示词强约束：只依据教材内容回答，", 13.5, False, TEXT),
      ("  教材未涉及则明确拒答，结尾标注参考章节", 13.5, False, TEXT),
      ("• 引用数据部件先于正文返回：“参考章节”徽标", 13.5, False, TEXT),
      ("  即刻出现，正文随后流式呈现，感知延迟低", 13.5, False, TEXT),
      ("• 引用片段（120 字摘要）可展开核对教材原文", 13.5, False, TEXT),
      ("• 离线模式返回教材原句摘录式回答；模型调用失败", 13.5, False, TEXT),
      ("  自动降级离线回答，问答功能永不中断", 13.5, False, TEXT)], title_size=16)

# ---------- S8 技术亮点 ----------
s = add_slide(prs, "技术亮点", "四个“评审友好”的工程决策", 8)
items = [
    ("双引擎图存储自动降级", ["GraphStore 接口 14 方法，", "Neo4j 与 JSON 文件双实现；", "auto 模式连通性探测失败", "自动降级，业务层零感知。"]),
    ("零依赖中文 RAG", ["bigram+单字词频检索替代", "向量库；中文召回经测试集", "验证；行为完全确定，", "6 个专项单元测试固化。"]),
    ("引用先行流式问答", ["参考章节与引用片段先于", "正文到达前端，可溯源、", "抗幻觉；流式输出显著", "降低感知延迟。"]),
    ("离线演示模式一等公民", ["无 Key 时内置《数据结构》", "演示数据集（37 知识点/", "51 关系）全流程可演示；", "demoMode 标志明示数据来源。"]),
]
for i, (t, body) in enumerate(items):
    card(s, Inches(0.62 + (i % 2) * 6.33), Inches(1.6 + (i // 2) * 2.55),
         Inches(6.0), Inches(2.3), t, [(b, 13.5, False, TEXT) for b in body], title_size=16)

# ---------- S9 测试与质量 ----------
s = add_slide(prs, "测试与质量保障", "测试驱动开发：曾暴露并修复 3 个真实缺陷", 9)
nums = [("18", "单元测试全绿", "解析/清洗/切块 8 例\n检索/引用/兜底 6 例\n路径推荐算法 4 例"),
        ("7", "端到端场景全绿", "教师建图 → 学生浏览 →\n掌握勾选 → 路径推荐 →\n问答引用 → 图谱修正 → 多课程"),
        ("15", "生产构建路由零错误", "typecheck ✓\nnext build ✓\nPlaywright 离线驱动真实浏览器 ✓")]
for i, (n, t, d) in enumerate(nums):
    x = Inches(0.62 + i * 4.15)
    add_rect(s, x, Inches(1.6), Inches(3.78), Inches(3.0), fill=LIGHTER, line=RGBColor(0xBD, 0xD7, 0xEE))
    add_text(s, x, Inches(1.8), Inches(3.78), Inches(0.8), [(n, 40, True, ACCENT)], align=PP_ALIGN.CENTER)
    add_text(s, x, Inches(2.62), Inches(3.78), Inches(0.4), [(t, 15, True, PRIMARY)], align=PP_ALIGN.CENTER)
    add_text(s, x + Inches(0.25), Inches(3.1), Inches(3.28), Inches(1.4),
             [(line, 13, False, TEXT) for line in d.split("\n")], align=PP_ALIGN.CENTER, line_spacing=1.2)
add_rect(s, Inches(0.62), Inches(4.9), Inches(12.35), Inches(1.35), fill=LIGHT, line=ACCENT)
add_text(s, Inches(0.92), Inches(5.05), Inches(11.8), Inches(1.05),
         [("测试发现并修复的真实缺陷（人工验收难以发现）", 14, True, PRIMARY),
          ("① useChat 不响应 transport 更换导致流式失效　② bigram 分词未先剔除英文串导致中文双字错位漏召回　", 13, False, TEXT),
          ("③ 章节标题正则对“第12章”等多位数字形态漏匹配", 13, False, TEXT)], line_spacing=1.25)

# ---------- S10 指标对照 ----------
s = add_slide(prs, "赛题指标达成对照", "全部结论可复核：要么有自动化验证，要么如实标注“待实测”", 10)
rows = [
    ("文档格式（四种选二）", "PDF + TXT，白名单校验 + GBK 自动回退", "✅ 达成"),
    ("一章内容 ≥20 个知识点", "离线演示集 37 个（e2e 断言通过）", "✅ 离线达成"),
    ("≥3 种关系类型", "前置 29 / 包含 12 / 相关 10（演示集）", "✅ 达成"),
    ("抽取准确率 ≥70%", "测试方案与标注基准已就绪，实测待接入真实 Key", "🟡 待实测"),
    ("图谱交互 + 卡片列表", "缩放/拖拽/点击详情；详情卡 + 按章节清单", "✅ 达成"),
    ("问答 ≤15s / 建图 ≤60s", "流式输出 + 抽取预算封顶；离线问答实测 <1s", "✅ 机制保障"),
    ("教师端 + 学生端 + 多课程", "五页面全功能；按 courseId 全链路隔离", "✅ 达成"),
]
tbl_shape = s.shapes.add_table(len(rows) + 1, 3, Inches(0.62), Inches(1.55), Inches(12.35), Inches(4.6))
tbl = tbl_shape.table
tbl.columns[0].width = Inches(3.3)
tbl.columns[1].width = Inches(7.15)
tbl.columns[2].width = Inches(1.9)
headers = ["赛题要求", "实现情况（摘要）", "状态"]
for j, h in enumerate(headers):
    c = tbl.cell(0, j)
    c.text = ""
    p = c.text_frame.paragraphs[0]
    r = p.add_run(); r.text = h
    set_font(r, 14, True, WHITE)
    c.fill.solid(); c.fill.fore_color.rgb = PRIMARY
    c.vertical_anchor = MSO_ANCHOR.MIDDLE
for i, (a, b, st) in enumerate(rows, 1):
    for j, val in enumerate((a, b, st)):
        c = tbl.cell(i, j)
        c.text = ""
        p = c.text_frame.paragraphs[0]
        r = p.add_run(); r.text = val
        color = GREEN if st.startswith("✅") else ORANGE
        set_font(r, 12.5, j == 2, TEXT if j < 2 else color)
        c.fill.solid()
        c.fill.fore_color.rgb = WHITE if i % 2 else LIGHTER
        c.vertical_anchor = MSO_ANCHOR.MIDDLE
add_text(s, Inches(0.62), Inches(6.35), Inches(12.3), Inches(0.55),
         [("诚实性原则：未实测指标在材料中一律标注“待实测”并附验证路径，不出现虚构数字；上传响应携带 demoMode 标志区分演示数据与真实抽取。", 12.5, False, GRAY)])

# ---------- S11 限制与展望 ----------
s = add_slide(prs, "已知限制与改进方向", "如实披露，迭代路线清晰", 11)
card(s, Inches(0.62), Inches(1.55), Inches(6.0), Inches(4.9), "已知限制（诚实清单）",
     [("• 仅支持 PDF/TXT（赛题“四种选二”已达标），", 13.5, False, TEXT),
      ("  DOCX/Markdown 解析器待扩展", 13.5, False, TEXT),
      ("• 抽取准确率暂无在线实测数字——宁缺毋假，", 13.5, False, TEXT),
      ("  待真实 Key 按报告流程回填", 13.5, False, TEXT),
      ("• 知识消歧为词面级去重，语义级同义合并", 13.5, False, TEXT),
      ("  （embedding）列入改进方向", 13.5, False, TEXT),
      ("• 路径推荐为编号列表，图形化连线待做", 13.5, False, TEXT),
      ("• 图谱截图待运行系统人工截取，不虚构", 13.5, False, TEXT)], title_size=16)
card(s, Inches(6.95), Inches(1.55), Inches(6.0), Inches(4.9), "改进路线",
     [("• 接入 DeepSeek/通义 Key：按《抽取准确率测试", 13.5, False, TEXT),
      ("  报告》人工抽样实测，回填全部待实测指标", 13.5, False, TEXT),
      ("• 知识点名称向量化，相似度阈值合并 + 人工", 13.5, False, TEXT),
      ("  确认队列，实现语义级消歧", 13.5, False, TEXT),
      ("• DOCX（mammoth）/ Markdown 解析器接入，", 13.5, False, TEXT),
      ("  架构无需改动，仅扩展类型白名单", 13.5, False, TEXT),
      ("• 上传改造为异步任务（任务 id + 进度轮询）", 13.5, False, TEXT),
      ("• 推荐结果以 ECharts 树图呈现学习链", 13.5, False, TEXT)], title_size=16)

# ---------- S12 结尾 ----------
s = add_slide(prs)
add_rect(s, Inches(0), Inches(0), SLIDE_W, Inches(2.2), fill=PRIMARY, shape=MSO_SHAPE.RECTANGLE)
add_text(s, Inches(0.9), Inches(0.7), Inches(11.5), Inches(1.0),
         [("把建图谱的门槛降到“上传一个文件”，", 26, True, WHITE),
          ("把学习的主动权交给“每一步都有依据”的学生。", 26, True, WHITE)], line_spacing=1.2)
for i, (n, d) in enumerate([("1", "npm install"), ("2", "npm run build"), ("3", "npm start")]):
    x = Inches(0.9 + i * 4.0)
    add_rect(s, x, Inches(2.85), Inches(3.6), Inches(1.5), fill=LIGHTER, line=RGBColor(0xBD, 0xD7, 0xEE))
    add_text(s, x, Inches(3.02), Inches(3.6), Inches(0.5), [(f"第 {n} 步", 13, False, GRAY)], align=PP_ALIGN.CENTER)
    add_text(s, x, Inches(3.45), Inches(3.6), Inches(0.6), [(d, 20, True, PRIMARY)], align=PP_ALIGN.CENTER)
add_text(s, Inches(0.9), Inches(4.75), Inches(11.5), Inches(0.8),
         [("三步部署，无需安装数据库、无需大模型 Key 即可评审体验（离线演示模式）；", 15, False, GRAY),
          ("配置 Key 与 Neo4j 后无缝切换在线模式与生产图数据库。", 15, False, GRAY)], line_spacing=1.35)
add_text(s, Inches(0.9), Inches(6.15), Inches(11.5), Inches(0.8),
         [("谢谢观看　｜　参赛团队：【待填】　｜　完整材料：项目详细方案 · 概要介绍 · 演示视频 · 合规对照表", 14, False, GRAY)])

prs.save(OUT)
print("saved:", OUT, "slides:", len(prs.slides._sldIdLst))

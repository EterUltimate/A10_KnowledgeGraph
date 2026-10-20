# -*- coding: utf-8 -*-
"""A10 项目汇报 PPT 生成脚本（python-pptx，16:9，14 页）。

设计体系（借鉴 Linear 现代设计语言，适配正式汇报的浅色版式）：
- 配色 token：Linear 靛蓝 #5E6AD2 / 紫罗兰 #7170FF 作为强调色，深靛蓝 hero 块，
  冷调墨黑正文层级 + 中性灰辅助，柔和卡片底与细描边（8px 栅格节奏）；
- 排版层级：标题 / kicker / 副标题 / 卡片标题 / 正文 / 注释 五级字号；
- 组件化：编号流程条、大数字指标卡、指标对照表、达成徽标、统一页脚；
- 中文字体统一微软雅黑（同时写 a:latin/a:ea，避免回退宋体）；
- 内容以合并后的 main 代码与 docs/需求分析文档.md（SRS）为准，指标为真实 DeepSeek 在线实测；
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

# ---------------- 设计 token（Linear 现代浅色体系）----------------
INK = RGBColor(0x1B, 0x1F, 0x24)        # 标题近黑
BODY = RGBColor(0x2C, 0x31, 0x38)       # 正文
MUTED = RGBColor(0x6B, 0x72, 0x80)      # 次要
FAINT = RGBColor(0x9A, 0xA1, 0xAC)      # 注释/页脚
PRIMARY = RGBColor(0x5E, 0x6A, 0xD2)    # Linear 靛蓝
ACCENT = RGBColor(0x71, 0x70, 0xFF)     # 紫罗兰强调
ACCENT_LT = RGBColor(0x8E, 0x96, 0xFF)  # 浅紫
DARK = RGBColor(0x16, 0x1B, 0x3A)       # 深靛蓝 hero 块
DARK2 = RGBColor(0x22, 0x28, 0x56)      # hero 次层
CARD_BG = RGBColor(0xF5, 0xF7, 0xFB)    # 卡片底
CARD_BR = RGBColor(0xE3, 0xE8, 0xF0)    # 卡片细描边
CARD_BR2 = RGBColor(0xD6, 0xDC, 0xE7)   # 强描边
TINT = RGBColor(0xEE, 0xF0, 0xFB)        # 靛蓝浅底带
TINT_BR = RGBColor(0xC9, 0xCE, 0xEE)     # 浅底带描边
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
GOOD = RGBColor(0x0F, 0x9D, 0x5E)        # 达成 绿
WARN = RGBColor(0xB4, 0x53, 0x09)        # 部分 琥珀
LINE = RGBColor(0xE6, 0xE9, 0xEF)        # 分隔线
FONT = "微软雅黑"

SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)
MX = Inches(0.62)                          # 左右页边距
CW = Inches(12.093)                        # 内容宽度 = SLIDE_W - 2*MX

PROJECT = "基于 AIGC 的课程知识图谱智能构建与学习导航系统"


# ---------------- 基础绘制工具 ----------------
def set_font(run, size, bold=False, color=BODY, name=FONT, spacing=None):
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = name
    rPr = run._r.get_or_add_rPr()
    for tag in ("a:ea", "a:cs"):
        el = rPr.find(qn(tag))
        if el is not None:
            rPr.remove(el)
    latin = rPr.find(qn("a:latin"))
    if latin is not None:
        ea = rPr.makeelement(qn("a:ea"), {"typeface": name})
        latin.addnext(ea)
    if spacing is not None:  # 字距（单位 1/100 pt），负值收紧
        rPr.set("spc", str(int(spacing * 100)))


def add_text(slide, x, y, w, h, lines, align=PP_ALIGN.LEFT,
             anchor=MSO_ANCHOR.TOP, line_spacing=1.15, space_after=None, spacing=None):
    """lines: [(text,size,bold,color[,spacing])] 或 [[(..),(..)], ...] 同段多 run。
    spacing 为整框默认字距（1/100 pt），可被单个 run 元组的第 5 项覆盖。"""
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
        if space_after is not None:
            p.space_after = Pt(space_after)
        runs = line if isinstance(line, list) else [line]
        for spec in runs:
            text, size, bold, color = spec[0], spec[1], spec[2], spec[3]
            sp = spec[4] if len(spec) > 4 else spacing
            r = p.add_run()
            r.text = text
            set_font(r, size, bold, color, spacing=sp)
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
    sp.text_frame.margin_top = sp.text_frame.margin_bottom = Emu(0)
    return sp


def add_line(slide, x, y, w, color=LINE, weight=1.0):
    return add_rect(slide, x, y, w, Pt(weight), fill=color, shape=MSO_SHAPE.RECTANGLE)


def chip(slide, x, y, w, h, text, fill, fg, size=12, bold=True):
    add_rect(slide, x, y, w, h, fill=fill, radius=0.5)
    add_text(slide, x, y, w, h, [(text, size, bold, fg)],
             align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)


def kicker(slide, label):
    """页顶小标签（强调竖条 + 大写风格文案）。"""
    add_rect(slide, MX, Inches(0.42), Inches(0.08), Inches(0.26),
             fill=ACCENT, shape=MSO_SHAPE.RECTANGLE)
    add_text(slide, MX + Inches(0.18), Inches(0.42), Inches(6.0), Inches(0.26),
             [(label, 11.5, True, PRIMARY)], anchor=MSO_ANCHOR.MIDDLE, spacing=0.6)


def title_block(slide, title, subtitle=None):
    kicker(slide, "A10 · 浙师大服务外包大赛 · 金扬智能")
    add_text(slide, MX, Inches(0.72), CW, Inches(0.56),
             [(title, 25, True, INK)], anchor=MSO_ANCHOR.MIDDLE, spacing=0.2)
    yy = Inches(1.34)
    if subtitle:
        add_text(slide, MX, yy, CW, Inches(0.34), [(subtitle, 12.5, False, MUTED)])
        yy = Inches(1.68)
    add_line(slide, MX, yy, CW, color=LINE, weight=1.2)
    return yy + Inches(0.2)


def footer(slide, page):
    add_line(slide, MX, Inches(7.02), CW, color=LINE, weight=0.8)
    add_text(slide, MX, Inches(7.1), Inches(9.2), Inches(0.3),
             [(PROJECT, 9, False, FAINT)])
    add_text(slide, Inches(11.3), Inches(7.1), Inches(1.4), Inches(0.3),
             [(f"{page:02d} / 14", 9, True, MUTED)], align=PP_ALIGN.RIGHT)


def new_slide(prs, title=None, subtitle=None, page=None):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    top = Inches(1.0)
    if title:
        top = title_block(slide, title, subtitle)
    if page is not None:
        footer(slide, page)
    return slide, top


def card(slide, x, y, w, h, title, body_lines, title_color=INK,
         fill=CARD_BG, line=CARD_BR, title_size=14.5, body_size=12.3,
         accent=True):
    add_rect(slide, x, y, w, h, fill=fill, line=line, radius=0.06)
    if accent:
        add_rect(slide, x, y + Inches(0.16), Inches(0.055), Inches(0.3),
                 fill=ACCENT, shape=MSO_SHAPE.RECTANGLE)
    add_text(slide, x + Inches(0.2), y + Inches(0.15), w - Inches(0.36), Inches(0.4),
             [(title, title_size, True, title_color)])
    add_text(slide, x + Inches(0.2), y + Inches(0.62), w - Inches(0.4),
             h - Inches(0.78), body_lines, line_spacing=1.2)


def B(text, size=12.3, color=BODY):  # 常规要点行
    return (text, size, False, color)


def Bb(text, size=12.3, color=INK):  # 强调要点行
    return (text, size, True, color)


def stat_card(slide, x, y, w, h, big, unit, label, sub, color=PRIMARY):
    add_rect(slide, x, y, w, h, fill=WHITE, line=CARD_BR2, radius=0.08)
    add_rect(slide, x, y, w, Inches(0.09), fill=color, shape=MSO_SHAPE.RECTANGLE)
    runs = [[(big, 33, True, color)] + ([(unit, 14, True, color)] if unit else [])]
    add_text(slide, x + Inches(0.16), y + Inches(0.24), w - Inches(0.32), Inches(0.7),
             runs, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    add_text(slide, x + Inches(0.16), y + Inches(1.0), w - Inches(0.32), Inches(0.4),
             [(label, 13.5, True, INK)], align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    if sub:
        add_text(slide, x + Inches(0.16), y + Inches(1.44), w - Inches(0.32),
                 h - Inches(1.5), [(sub, 10.5, False, MUTED)],
                 align=PP_ALIGN.CENTER, line_spacing=1.12)


def process_row(slide, steps, y, box_w, box_h, gap, dark_idx=()):
    """横向流程条：steps = [(主标题, 副标题)]，返回各框右缘。"""
    x = MX
    for i, (t, sub) in enumerate(steps):
        fill = DARK if i in dark_idx else PRIMARY
        add_rect(slide, x, y, box_w, box_h, fill=fill, radius=0.12)
        add_text(slide, x, y + Inches(0.12), box_w, Inches(0.4),
                 [(t, 14.5, True, WHITE)], align=PP_ALIGN.CENTER)
        add_text(slide, x, y + Inches(0.52), box_w, Inches(0.34),
                 [(sub, 10, False, RGBColor(0xD5, 0xDA, 0xFF))], align=PP_ALIGN.CENTER)
        if i < len(steps) - 1:
            add_rect(slide, x + box_w + Emu(20000), y + box_h / 2 - Inches(0.11),
                     Inches(0.28), Inches(0.22), fill=ACCENT_LT, shape=MSO_SHAPE.RIGHT_ARROW)
        x += box_w + gap
    return x


prs = Presentation()
prs.slide_width = SLIDE_W
prs.slide_height = SLIDE_H


def cols(n, gap):
    w = (CW - Inches(gap) * (n - 1)) / n
    return w, gap


# ============================================================ S1 封面
s = prs.slides.add_slide(prs.slide_layouts[6])
add_rect(s, Inches(0), Inches(0), SLIDE_W, Inches(3.7), fill=DARK, shape=MSO_SHAPE.RECTANGLE)
add_rect(s, Inches(0), Inches(3.7), SLIDE_W, Inches(0.07), fill=ACCENT, shape=MSO_SHAPE.RECTANGLE)
add_text(s, Inches(0.9), Inches(0.72), Inches(6.4), Inches(0.32),
         [("ETERU · 项目汇报", 12.5, True, ACCENT_LT)], spacing=1.0)
add_text(s, Inches(0.9), Inches(1.22), Inches(11.6), Inches(1.9),
         [("基于 AIGC 的课程知识图谱", 37, True, WHITE, 0.2),
          ("智能构建与学习导航系统", 37, True, WHITE, 0.2)], line_spacing=1.12)
add_text(s, Inches(0.9), Inches(3.02), Inches(11.6), Inches(0.5),
         [[("上传即建图", 15, True, ACCENT_LT),
           (" · ", 15, False, RGBColor(0x9A, 0xA3, 0xD0)),
           ("可解释学习路径", 15, True, ACCENT_LT),
           (" · ", 15, False, RGBColor(0x9A, 0xA3, 0xD0)),
           ("有据不编造的教材问答", 15, True, ACCENT_LT)]])
cap = [("教师端", "上传即建图 · 手动可修正 · 自定义模型接入"),
       ("学生端", "图谱浏览 · 掌握勾选 · 路径推荐 · 智能问答"),
       ("管理员后台", "角色权限 · API 密钥池 · 图数据与课程维护")]
w, gap = cols(3, 0.4)
for i, (t, d) in enumerate(cap):
    x = MX + (w + Inches(gap)) * i
    add_rect(s, x, Inches(4.15), w, Inches(1.3), fill=CARD_BG, line=CARD_BR, radius=0.08)
    add_rect(s, x, Inches(4.15), Inches(0.07), Inches(1.3), fill=PRIMARY, shape=MSO_SHAPE.RECTANGLE)
    add_text(s, x + Inches(0.24), Inches(4.34), w - Inches(0.4), Inches(0.4),
             [(t, 15.5, True, PRIMARY)])
    add_text(s, x + Inches(0.24), Inches(4.82), w - Inches(0.4), Inches(0.55),
             [(d, 11.5, False, BODY)], line_spacing=1.2)
add_line(s, MX, Inches(6.15), CW, color=RGBColor(0xC9, 0xCD, 0xE0), weight=1.0)
add_text(s, MX, Inches(6.32), CW, Inches(0.9),
         [[("参赛团队  EterU", 13, True, INK), ("     指导老师  袁汉春", 13, True, INK)],
          ("浙江师范大学第九届服务外包大赛 · 赛题 A10【杭州金扬智能科技有限公司】 · 2026", 11.5, False, MUTED)],
         line_spacing=1.5)

# ============================================================ S2 背景与痛点
s, top = new_slide(prs, "背景与痛点：图谱“看得懂、建不起”", "课程知识图谱教学价值明确，但人工建图与个性化导航长期难以落地", 2)
pains = [("知识孤岛", [B("知识点散落在教材、课件、教案等"), B("非结构化文档中，彼此关联隐式，"), B("学生难以纵览课程全貌。")]),
         ("学习易迷路", [B("“现在该学什么、接下来能学什么”"), B("缺乏显式先修指引，学习顺序"), B("凭感觉，常在先修关系上走弯路。")]),
         ("建图门槛高", [B("传统图谱依赖教师/专家手工整理，"), B("工作量大、周期长、更新难，"), B("无法规模化推广到多门课程。")])]
w, gap = cols(3, 0.28)
for i, (t, body) in enumerate(pains):
    x = MX + (w + Inches(gap)) * i
    card(s, x, top, w, Inches(2.35), t, body, title_size=15.5)
add_rect(s, MX, top + Inches(2.6), CW, Inches(1.85), fill=TINT, line=TINT_BR, radius=0.06)
add_text(s, MX + Inches(0.3), top + Inches(2.8), CW - Inches(0.6), Inches(1.5),
         [("AIGC 带来的破局点", 15, True, PRIMARY),
          B("大语言模型能从自然语言教材中自动抽取知识点实体与语义关系，把“数周级手工建图”压缩为“上传即得的一分钟级自动流程”；", 12.8),
          B("再叠加基于图谱的学习路径推荐与严格依据教材的检索问答，教学从“经验驱动”走向“数据驱动、可解释、可溯源”。", 12.8)],
         line_spacing=1.35)

# ============================================================ S3 方案总览
s, top = new_slide(prs, "方案总览：一条端到端的自动化链路", "上传课程资料 → 解析 → 抽取建图 → 交互可视化 → 个性化导航与问答", 3)
process_row(s, [("资料上传", "PDF / TXT"), ("文档解析", "清洗·章节切块"), ("知识抽取", "实体 + 三类关系"),
                ("图谱可视化", "ECharts 力导向"), ("智能导航", "问答 + 路径")],
            top, Inches(2.16), Inches(1.0), Inches(0.32), dark_idx=(0, 4))
add_text(s, MX, top + Inches(1.16), CW, Inches(0.42),
         [B("教师上传一份教材，系统分钟级产出结构化知识图谱；未配置 API Key 时自动进入离线演示模式，全流程照常可跑通。", 12.3, MUTED)])
w2 = (CW - Inches(0.3)) / 2
yb = top + Inches(1.72)
card(s, MX, yb, w2, Inches(2.35), "教师端 · 学生端 · 管理员端",
     [Bb("• 教师：上传即建图，图谱与关系可手动增删改（赛题加分项）"),
      Bb("• 学生：缩放拖拽浏览图谱、按章节勾选“已掌握”，获得带理由的路径推荐"),
      Bb("• 管理员：角色权限、多模型 API 密钥池、课程与图数据维护"),
      B("• 多课程按 courseId 全链路隔离，一次部署服务多门课")], title_size=15)
card(s, MX + w2 + Inches(0.3), yb, w2, Inches(2.35), "两种运行模式，随时无缝切换",
     [[Bb("在线模式：", 12.3, BODY), B("配置 DeepSeek/通义等 Key，LLM 真实抽取 + 流式问答", 12.3, BODY)],
      [Bb("离线模式：", 12.3, BODY), B("无 Key 自动启用内置演示图谱与教材摘录式问答", 12.3, BODY)],
      B("• 零配置即可评审；填 Key 即切在线，代码零改动"),
      B("• 上传响应携带数据来源标志，演示数据与真实抽取清晰可辨")], title_size=15)

# ============================================================ S4 总体架构
s, top = new_slide(prs, "总体架构：四层单向依赖，存储可插拔", "Next.js 15 全栈同构 · TypeScript 全程约束 · zod 运行时校验 · 依赖已全面升级", 4)
layers = [("前端层", "角色化多端：教师端 3 页 / 学生端 3 页 / 管理员后台 / 登录；ECharts 图谱、流式对话、深浅主题、课程切换", DARK),
          ("接口层", "20+ REST 端点（上传/图谱/知识/关系/问答/掌握/路径 + 管理/密钥/模型/健康）；NextAuth 角色守卫区分 401/403", PRIMARY),
          ("服务层", "文档解析（PDF/TXT·GBK 回退）｜ 混合检索 RAG（bigram + 向量）｜ 路径图遍历 ｜ AI SDK 抽取 + 密钥池/多提供商", ACCENT),
          ("存储层", "GraphStore 统一接口：Neo4j(Cypher) 与 JSON 双实现按连通性自动降级；向量索引与语料按课程隔离存储", RGBColor(0x0F, 0x9D, 0x5E))]
rowh = Inches(0.86)
for i, (name, desc, col) in enumerate(layers):
    y = top + rowh * i + Inches(0.08) * i
    add_rect(s, MX, y, Inches(1.62), rowh, fill=col, radius=0.08)
    add_text(s, MX, y, Inches(1.62), rowh, [(name, 15, True, WHITE)],
             align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    add_rect(s, MX + Inches(1.78), y, CW - Inches(1.78), rowh, fill=CARD_BG, line=CARD_BR, radius=0.05)
    add_text(s, MX + Inches(2.0), y + Inches(0.08), CW - Inches(2.2), rowh - Inches(0.16),
             [(desc, 12.3, False, BODY)], anchor=MSO_ANCHOR.MIDDLE, line_spacing=1.14)
yb = top + rowh * 4 + Inches(0.08) * 3 + Inches(0.18)
add_rect(s, MX, yb, CW, Inches(0.9), fill=TINT, line=TINT_BR, radius=0.06)
add_text(s, MX + Inches(0.26), yb + Inches(0.08), CW - Inches(0.52), Inches(0.74),
         [[Bb("关键约束：", 12.3, BODY),
           B("业务层只依赖 GraphStore / RAG 接口，不感知底层实现——评审机没有 Neo4j 自动降级 JSON、没有向量库自动回退关键词，",
             12.3, BODY)],
          B("配置到位后无缝切换真实图数据库与向量检索，代码零改动。", 12.3, BODY)],
         anchor=MSO_ANCHOR.MIDDLE, line_spacing=1.28)

# ============================================================ S5 教师端
s, top = new_slide(prs, "教师端：上传即建图，抽取结果可修正", "覆盖“解析→抽取→入图→手动修正”，并支持教师自助接入自定义大模型", 5)
w2 = (CW - Inches(0.3)) / 2
card(s, MX, top, w2, Inches(4.9), "自动建图流水线（上传 → 图谱）",
     [B("1. 选课程上传 PDF/TXT：白名单 + 魔数校验，≤20MB"),
      B("2. 解析：PDF 走 pdf-parse；TXT 优先 UTF-8，乱码自动回退 GBK"),
      B("3. 清洗页码页眉 → 章节标题感知切块（不拆语义段落）"),
      B("4. 分批抽取：块数上限 6、并发 3、单块失败跳过不中断"),
      B("5. zod schema 强约束输出信封，名称归一化去重"),
      B("6. 关系三重清洗：类型白名单 → 端点校验 → 去自环去重"),
      B("7. 单事务批量建图，返回知识点/关系/文本块数量与耗时分解")], title_size=15)
card(s, MX + w2 + Inches(0.3), top, w2, Inches(2.35), "手动修正（图谱实时联动）",
     [B("• 知识点增删改（删除级联清理关联关系）"),
      B("• 关系增删，类型限定 前置 / 包含 / 相关"),
      B("• 编辑即刻反映到 ECharts 预览，全量列表管理")], title_size=15)
card(s, MX + w2 + Inches(0.3), top + Inches(2.55), w2, Inches(2.35), "自定义模型接入（加分）",
     [B("• 五种协议：OpenAI 兼容(Chat/Responses)、Anthropic、Gemini"),
      B("• 可填自定义 BaseURL/Key，拉取模型列表、一键测连通"),
      B("• 保存后免重启即时生效；内网/非法地址被 SSRF 防护拦截")], title_size=15)

# ============================================================ S6 学生端
s, top = new_slide(prs, "学生端：浏览 · 勾选 · 被推荐", "以“学生 × 课程”维度的掌握状态驱动可解释的个性化学习导航", 6)
stu = [("图谱浏览与详情", [B("ECharts 力导向：缩放/拖拽；三类关系分色 + 中文边标签；"),
                          B("节点大小映射难度，文字内嵌提升可读；点击节点弹出定义/章节/难度")]),
       ("掌握勾选", [B("按章节分组的知识点清单；勾选“已掌握”即持久化；"),
                     B("多课程独立进度互不干扰，按 学生×课程 隔离存储")]),
       ("路径推荐", [B("仅推荐“前置已全部掌握”的知识点；"),
                     B("解锁价值 / 难度 / 章节三重排序，每条附推荐理由；勾选后即时刷新")])]
w, gap = cols(3, 0.28)
for i, (t, body) in enumerate(stu):
    x = MX + (w + Inches(gap)) * i
    card(s, x, top, w, Inches(2.9), t, body, title_size=15.5)
yb = top + Inches(3.16)
add_rect(s, MX, yb, CW, Inches(1.5), fill=TINT, line=TINT_BR, radius=0.06)
add_text(s, MX + Inches(0.3), yb + Inches(0.16), CW - Inches(0.6), Inches(1.2),
         [("设计要点", 14.5, True, PRIMARY),
          B("推荐算法为纯函数（O(V+E) 图遍历），行为被单元测试精确固定；“学一个 → 勾一个 → 推荐立即更新”形成学习闭环，",
            12.5),
          B("完全契合赛题“允许简单图遍历、不要求复杂机器学习模型”的定位。", 12.5)],
         line_spacing=1.3)

# ============================================================ S7 智能问答
s, top = new_slide(prs, "智能问答：混合检索 + 引用先行的流式生成", "bigram 关键词 与 embedding 向量 融合打分，任一环节不可用自动回退关键词", 7)
process_row(s, [("学生提问", "课程语料内"), ("混合检索", "关键词 + 向量"), ("打分融合", "权重可配·回退"),
                ("流式生成", "只依据教材"), ("引用标注", "章节 + 片段")],
            top, Inches(2.16), Inches(1.0), Inches(0.32), dark_idx=(1,))
w2 = (CW - Inches(0.3)) / 2
yb = top + Inches(1.28)
card(s, MX, yb, w2, Inches(3.25), "混合检索（中文友好，零外部向量库）",
     [B("• 中文相邻双字 bigram + 英文单词，命中计 1+ln(词频)，章节名加成"),
      B("• 配置嵌入模型后叠加余弦向量分，按权重(默认 0.5)与关键词分融合"),
      B("• 某块缺向量或嵌入失败 → 该块仅按关键词排序，不被惩罚"),
      B("• 全部零分仍回退 Top4，保证模型能对“教材未涉及”作答而非乱引")], title_size=15)
card(s, MX + w2 + Inches(0.3), yb, w2, Inches(3.25), "防幻觉与可溯源",
     [B("• 系统提示词强约束：只依据教材回答，未涉及则明确拒答并标注章节"),
      B("• “参考章节”引用部件先于正文返回，徽标即刻出现、正文流式呈现"),
      B("• 引用片段可展开核对教材原文；感知延迟低（实测首响 0.53–0.98s）"),
      B("• 无 Key 或调用失败自动降级离线摘录式回答，问答功能永不中断")], title_size=15)

# ============================================================ S8 角色化前端与管理员后台
s, top = new_slide(prs, "角色化前端与管理员后台", "三角色向下兼容（admin ⊇ teacher ⊇ student），权限、密钥、数据统一管理", 8)
items = [("角色与权限", [B("• 学生只见学生端；教师见教师端+学生端；管理员另含后台"),
                         B("• Auth.js v5 JWT 会话，scrypt 口令哈希播种账号"),
                         B("• proxy 中间件 + 路由内 requireTeacher/requireAdmin 双层校验")]),
         ("API 密钥池", [B("• 维护多套 provider/Key/模型（含嵌入模型），一键设为生效"),
                          B("• 生效优先级 profile > runtime > env，掩码回显绝不下发明文"),
                          B("• 生效密钥带 embedModel 即自动启用 RAG 向量检索")]),
         ("图数据维护", [B("• 课程列表、级联删除（图 + 语料 + 向量 + 注册表）"),
                          B("• 用户管理：增删账号、重置口令，禁删最后一个管理员"),
                          B("• 一键重种内置《数据结构》演示数据，清理 e2e 污染")]),
         ("安全与合规", [B("• BaseURL 协议/内网白名单、Cypher 标识符白名单、文件魔数校验"),
                          B("• 接口限流；密钥仅存服务端，.env 与运行时配置均 gitignore"),
                          B("• 完整安全审计报告与密钥掩码策略")])]
w2, g2 = cols(2, 0.3)
rowh2 = Inches(2.24)
for i, (t, body) in enumerate(items):
    x = MX + (w2 + Inches(g2)) * (i % 2)
    y = top + rowh2 * (i // 2) + Inches(0.16) * (i // 2)
    card(s, x, y, w2, rowh2, t, body, title_size=15)

# ============================================================ S9 技术亮点
s, top = new_slide(prs, "技术亮点：四个“评审友好”的工程决策", "零配置可跑通 · 行为确定可测试 · 结果可溯源", 9)
hi = [("双引擎图存储自动降级", [B("GraphStore 统一抽象，Neo4j 与 JSON 双实现；"), B("auto 探测连通性失败即降级，"), B("业务层零感知、服务不中断。")]),
      ("混合向量 RAG + 回退保障", [B("bigram 关键词 + embedding 向量加权融合；"), B("缺向量/嵌入失败/全零分逐层回退，"), B("检索链路永不因依赖缺失而中断。")]),
      ("引用先行流式问答", [B("参考章节与引用片段先于正文到达前端，"), B("可溯源、抗幻觉；"), B("流式输出显著降低感知延迟。")]),
      ("离线演示 + 一键启动", [B("无 Key 走内置演示集全流程可演示；"), B("start.ps1 自检环境→装依赖→"), B("健康检查→开浏览器，docker 模式一键起。")])]
for i, (t, body) in enumerate(hi):
    x = MX + (w2 + Inches(g2)) * (i % 2)
    y = top + rowh2 * (i // 2) + Inches(0.16) * (i // 2)
    card(s, x, y, w2, rowh2, t, body, title_size=15.5)

# ============================================================ S10 关键成效数据
s, top = new_slide(prs, "关键成效：真实 DeepSeek 在线实测", "以《数据结构》自编教材全量核对，非离线推定（详见准确率测试报告）", 10)
stats = [("90.3", "%", "实体准确率", "严格 65/72·零幻觉 72/72", PRIMARY),
         ("84.6", "%", "关系准确率", "严格 88/104·语义可接受≈100%", PRIMARY),
         ("12.1", "s", "解析+抽取耗时", "预算 60s·知识点5.5s+关系6.6s", ACCENT),
         ("0.53", "–0.98s", "问答单次响应", "预算 15s·8/8 含 2 题正确拒答", ACCENT),
         ("72", "·104", "知识点 / 关系", "三类齐全 45/42/17", RGBColor(0x0F, 0x9D, 0x5E)),
         ("17", "/17", "前置关系方向全对", "端点编号+方向语义约束", RGBColor(0x0F, 0x9D, 0x5E)),
         ("9.7", "%", "冗余率", "7/72 过细条目·低于阈值", WARN),
         ("72", "/72", "零幻觉", "每条均可在教材原文定位", PRIMARY)]
w3 = (CW - Inches(0.24) * 3) / 4
rh = Inches(2.28)
for i, (big, unit, label, sub, col) in enumerate(stats):
    x = MX + (w3 + Inches(0.24)) * (i % 4)
    y = top + rh * (i // 4) + Inches(0.18) * (i // 4)
    stat_card(s, x, y, w3, rh, big, unit, label, sub, color=col)
add_text(s, MX, top + rh * 2 + Inches(0.3), CW, Inches(0.4),
         [B("口径说明：单次全文抽取得 72 点远超“一章 ≥20”，按章均摊偏低源于示例教材每章篇幅被刻意压缩；真实完整章节单章即达 20+。", 11, MUTED)])

# ============================================================ S11 工程与质量
s, top = new_slide(prs, "工程与质量：测试驱动 + 持续集成", "行为由测试固化，质量门禁在 CI 强制执行", 11)
nums = [("125", "单元测试全绿", "13 个测试文件：解析/清洗/编码、\n混合检索/向量/回退、路径推荐、\n密钥池/角色/用户服务/契约"),
        ("9", "端到端场景全绿", "Playwright 离线驱动真实浏览器：\n建图→浏览→勾选→推荐→\n问答引用→教师修正→多课程"),
        ("70%", "覆盖率强制门禁", "CI 对 services/lib 强制 vitest\n覆盖率阈值；typecheck✓ build✓\n无障碍 Lighthouse 5 页 100 分")]
w, gap = cols(3, 0.28)
for i, (n, t, d) in enumerate(nums):
    x = MX + (w + Inches(gap)) * i
    add_rect(s, x, top, w, Inches(2.85), fill=WHITE, line=CARD_BR2, radius=0.08)
    add_rect(s, x, top, w, Inches(0.09), fill=ACCENT, shape=MSO_SHAPE.RECTANGLE)
    add_text(s, x, top + Inches(0.28), w, Inches(0.85), [(n, 40, True, PRIMARY)],
             align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    add_text(s, x, top + Inches(1.12), w, Inches(0.4), [(t, 14, True, INK)],
             align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    add_text(s, x + Inches(0.2), top + Inches(1.6), w - Inches(0.4), Inches(1.15),
             [(l, 11, False, MUTED) for l in d.split("\n")], align=PP_ALIGN.CENTER, line_spacing=1.2)
yb = top + Inches(3.1)
add_rect(s, MX, yb, CW, Inches(1.6), fill=TINT, line=TINT_BR, radius=0.06)
add_text(s, MX + Inches(0.3), yb + Inches(0.16), CW - Inches(0.6), Inches(1.3),
         [("测试发现并修复的真实缺陷（纯离线演示无法暴露）", 14, True, PRIMARY),
          B("① 真实 DeepSeek 下 json_object 模式返回裸数组致抽取 0 条 → 提示词显式声明输出信封；",
            12.3),
          B("② useChat 不响应 transport 更换致流式失效；③ bigram 未先剔除英文串致中文错位漏召回。", 12.3)],
         line_spacing=1.32)

# ============================================================ S12 赛题指标对照
s, top = new_slide(prs, "赛题指标达成对照", "全部结论可复核：以真实大模型在线实测数据为准（非离线推定）", 12)
rows = [("文档格式（四种选二）", "PDF + TXT；白名单 + 魔数校验 + GBK 自动回退", "达成"),
        ("一章内容 ≥20 个知识点", "在线抽取 72 个（第 1–6 章）", "达成"),
        ("≥3 种关系类型", "CONTAINS 45 / RELATED 42 / PREREQUISITE 17", "达成"),
        ("抽取准确率 ≥70%", "实体 90.3% · 关系 84.6%（真实 DeepSeek）", "达成"),
        ("图谱交互 + 卡片列表", "缩放/拖拽/点击详情；详情卡 + 按章节清单", "达成"),
        ("问答≤15s / 建图≤60s", "问答 0.53–0.98s · 抽取 12.1s", "达成"),
        ("教师端 + 学生端 + 多课程", "角色化多端 + courseId 全链路隔离", "达成"),
        ("可解释路径推荐", "前置图遍历 + 三重排序 + 逐条理由", "达成"),
        ("自定义模型接入（加分）", "五种协议 · 密钥池热生效 · SSRF 防护", "达成")]
tbl = s.shapes.add_table(len(rows) + 1, 3, MX, top, CW, Inches(4.9)).table
tbl.columns[0].width = Inches(3.5)
tbl.columns[1].width = Inches(6.793)
tbl.columns[2].width = Inches(1.8)
hdrs = ["赛题要求", "实现情况（实测）", "状态"]
for j, h in enumerate(hdrs):
    c = tbl.cell(0, j); c.text = ""
    r = c.text_frame.paragraphs[0].add_run(); r.text = h
    set_font(r, 12.5, True, WHITE)
    c.fill.solid(); c.fill.fore_color.rgb = DARK
    c.vertical_anchor = MSO_ANCHOR.MIDDLE
for i, (a, b, st) in enumerate(rows, 1):
    for j, val in enumerate((a, b, st)):
        c = tbl.cell(i, j); c.text = ""
        r = c.text_frame.paragraphs[0].add_run(); r.text = ("● " + val) if j == 2 else val
        set_font(r, 11.5, j == 2, GOOD if j == 2 else (INK if j == 0 else BODY))
        c.fill.solid(); c.fill.fore_color.rgb = WHITE if i % 2 else CARD_BG
        c.vertical_anchor = MSO_ANCHOR.MIDDLE

# ============================================================ S13 限制与改进路线
s, top = new_slide(prs, "已知限制与改进路线", "如实披露边界，迭代方向清晰", 13)
w2 = (CW - Inches(0.3)) / 2
card(s, MX, top, w2, Inches(4.75), "已知限制（诚实清单）",
     [B("• 仅支持 PDF/TXT（赛题“四种选二”已达标），"),
      B("  DOCX / Markdown 解析器待扩展"),
      B("• CONTAINS 存在类型偏松（16/104 泛化），"),
      B("  为关系准确率主要失分点，语义仍可接受"),
      B("• 知识点消歧为词面级去重；向量已用于 RAG 召回，"),
      B("  名称语义级同义合并仍未落地"),
      B("• 路径推荐为编号列表，图形化学习链待做"),
      B("• 在线准确率基于浓缩自编示例，真实整章篇幅更长")], title_size=15.5)
card(s, MX + w2 + Inches(0.3), top, w2, Inches(4.75), "改进路线",
     [Bb("• 两阶段关系抽取：先召回候选对再判定类型与方向"),
      Bb("• 章节级停用词与“了解/掌握”课程目标句过滤"),
      Bb("• embedding 辅助长尾概念合并 + 人工确认队列，"),
      B("  实现语义级知识融合（赛题鼓励方向）"),
      Bb("• DOCX(mammoth)/Markdown 解析器接入，仅扩白名单"),
      Bb("• 上传改造为异步任务（任务 id + 进度轮询）"),
      Bb("• 推荐结果以 ECharts 树图呈现学习链")], title_size=15.5)

# ============================================================ S14 结尾
s = prs.slides.add_slide(prs.slide_layouts[6])
add_rect(s, Inches(0), Inches(0), SLIDE_W, Inches(2.4), fill=DARK, shape=MSO_SHAPE.RECTANGLE)
add_rect(s, Inches(0), Inches(2.4), SLIDE_W, Inches(0.06), fill=ACCENT, shape=MSO_SHAPE.RECTANGLE)
add_text(s, MX, Inches(0.72), CW, Inches(1.4),
         [("把建图谱的门槛降到“上传一个文件”，", 24, True, WHITE, 0.2),
          ("把学习的主动权交给“每一步都有依据”的学生。", 24, True, WHITE, 0.2)], line_spacing=1.25)
steps = [("一键启动", "start.ps1 / start.bat"), ("零配置评审", "离线演示 + JSON 存储"), ("按需升级", "填 Key / 启 Neo4j 无缝切换")]
w, gap = cols(3, 0.4)
for i, (t, d) in enumerate(steps):
    x = MX + (w + Inches(gap)) * i
    add_rect(s, x, Inches(2.95), w, Inches(1.4), fill=CARD_BG, line=CARD_BR, radius=0.08)
    add_rect(s, x, Inches(2.95), Inches(0.07), Inches(1.4), fill=PRIMARY, shape=MSO_SHAPE.RECTANGLE)
    add_text(s, x + Inches(0.26), Inches(3.15), w - Inches(0.42), Inches(0.4), [(t, 15.5, True, PRIMARY)])
    add_text(s, x + Inches(0.26), Inches(3.62), w - Inches(0.42), Inches(0.55), [(d, 12, False, BODY)])
add_text(s, MX, Inches(4.75), CW, Inches(1.0),
         [B("普通电脑即可部署：无 GPU 依赖、无 Neo4j、无 API Key 也能跑通全流程；配置到位后自动切换在线与生产图数据库。", 13),
          B("赛题全部强制指标已达成，并以真实 DeepSeek 在线实测数据支撑；材料含需求分析(SRS)、架构设计、准确率报告、安全审计、e2e 与单测。", 12.5, MUTED)],
         line_spacing=1.4)
add_line(s, MX, Inches(6.2), CW, color=RGBColor(0xC9, 0xCD, 0xE0), weight=1.0)
add_text(s, MX, Inches(6.4), CW, Inches(0.7),
         [[("谢谢观看", 15, True, INK), ("     参赛团队  EterU", 13, True, BODY),
           ("     指导老师  袁汉春", 13, True, BODY)],
          ("EterU 小队 · 浙江师范大学第九届服务外包大赛 · 赛题 A10【杭州金扬智能科技有限公司】", 11, False, MUTED)],
         line_spacing=1.4)

prs.save(OUT)
print("saved:", OUT, "slides:", len(prs.slides._sldIdLst))

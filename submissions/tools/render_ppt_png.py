# -*- coding: utf-8 -*-
"""用 PowerPoint COM 把 pptx 逐页导出 PNG（1280x720），供视觉自查/评审预览。"""
import os, sys
import win32com.client
import pythoncom

PPTX = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "A10项目简介PPT.pptx")
OUTDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ppt-preview")
os.makedirs(OUTDIR, exist_ok=True)

pythoncom.CoInitialize()
app = win32com.client.DispatchEx("PowerPoint.Application")
try:
    pres = app.Presentations.Open(PPTX, ReadOnly=True, Untitled=False, WithWindow=False)
    n = pres.Slides.Count
    for i in range(1, n + 1):
        out = os.path.join(OUTDIR, f"slide-{i:02d}.png")
        pres.Slides(i).Export(out, "PNG", 1280, 720)
        print("exported", out)
    pres.Close()
    print("total", n)
finally:
    app.Quit()
    pythoncom.CoUninitialize()

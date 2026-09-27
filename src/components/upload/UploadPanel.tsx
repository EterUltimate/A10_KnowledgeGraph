/**
 * 上传面板（A10.md 十二节：教师上传课程资料）
 * tier2：支持自定义课程 ID 与名称（多课程管理），展示耗时分解与离线模式提示。
 * 视觉：dropzone 式文件选择（2px 虚线 + blue 悬浮），结果卡 mono 计时。
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { UploadResult } from '@/types';

export function UploadPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [courseId, setCourseId] = useState('data-structures');
  const [courseName, setCourseName] = useState('数据结构');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) {
      setError('请先选择 PDF 或 TXT 文件');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('courseId', courseId.trim());
      form.append('courseName', courseName.trim() || courseId.trim());
      const res = await fetch('/api/course/upload', { method: 'POST', body: form });
      const json = await res.json();
      if (json.success) {
        setResult(json.data as UploadResult);
      } else {
        setError(json.error ?? '上传失败');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card space-y-5 !p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="course-id">
            课程 ID（英文标识）
          </label>
          <input
            id="course-id"
            className="input font-mono"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            placeholder="如 data-structures（英文小写+连字符）"
          />
        </div>
        <div>
          <label className="label" htmlFor="course-name">
            课程名称
          </label>
          <input
            id="course-name"
            className="input"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="数据结构"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="course-file">
          课程资料（PDF / TXT）
        </label>
        {/* dropzone 外观：原生 file input 保持可访问性与 e2e 兼容，视觉覆盖为 2px 虚线区 */}
        <label
          htmlFor="course-file"
          className="group flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line-strong px-4 py-8 text-center transition-all duration-300 [transition-timing-function:var(--ease-spring)] hover:border-acc-blue hover:bg-acc-blue-soft"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="h-6 w-6 text-fg-subtle transition-colors group-hover:text-acc-blue"
          >
            <path d="M12 15V4m0 0L8 8m4-4l4 4" />
            <path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" strokeWidth="2.4" />
          </svg>
          <span className="text-sm font-medium">
            {file ? file.name : '点击选择文件，或拖拽到此处'}
          </span>
          <span className="font-mono text-xs text-fg-subtle">.pdf / .txt · ≤ 10MB</span>
        </label>
        <input
          id="course-file"
          type="file"
          accept=".pdf,.txt"
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <button className="btn btn-primary !py-2.5" onClick={handleUpload} disabled={loading}>
        {loading ? '正在解析并生成知识图谱…（最长约 60 秒）' : '上传并生成知识图谱'}
      </button>

      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-line bg-acc-red-soft px-3 py-2 text-sm text-fg"
        >
          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-acc-red" />
          {error}
        </p>
      )}

      {result && (
        <div
          role="status"
          aria-live="polite"
          className="space-y-2.5 rounded-xl border border-line bg-surface-muted p-5 text-sm"
          style={{ animation: 'fade-up 320ms var(--ease-spring-soft)' }}
        >
          <p className="flex items-center gap-2 font-medium text-acc-green">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-acc-green" />
            知识图谱生成完成 ✓
          </p>
          <ul className="space-y-1 text-fg-muted">
            <li>
              课程：
              <span className="font-medium text-fg">{result.courseName ?? result.courseId}</span>{' '}
              <span className="font-mono text-xs">({result.courseId})</span>
            </li>
            <li>
              文件：<span className="font-mono text-xs">{result.fileName}</span>
            </li>
            <li>
              知识点：<span className="font-semibold text-acc-blue">{result.knowledgeCount}</span>{' '}
              个 · 关系：
              <span className="font-semibold text-acc-violet">{result.relationCount}</span> 条 ·
              文本块：<span className="font-semibold text-acc-cyan">{result.chunkCount}</span> 个
            </li>
            <li className="font-mono text-xs">
              耗时：解析 {result.timing.parseMs}ms · 抽取 {result.timing.extractMs}ms · 合计{' '}
              {result.timing.totalMs}ms
            </li>
          </ul>
          {result.demoMode && (
            <p className="flex items-start gap-2 rounded-lg bg-acc-amber-soft p-2.5 text-xs leading-relaxed text-fg">
              <span
                aria-hidden="true"
                className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-acc-amber"
              />
              {result.message}
            </p>
          )}
          <div className="flex gap-2 pt-1.5">
            <Link
              href={`/student/graph?courseId=${encodeURIComponent(result.courseId)}`}
              className="btn btn-ghost"
            >
              查看知识图谱
            </Link>
            <Link href="/teacher/knowledge" className="btn btn-ghost">
              修正图谱
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

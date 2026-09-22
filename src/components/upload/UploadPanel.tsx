/**
 * 上传面板（A10.md 十二节：教师上传课程资料）
 * tier2：支持自定义课程 ID 与名称（多课程管理），展示耗时分解与离线模式提示。
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
    <div className="card space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="course-id">课程 ID（英文标识）</label>
          <input
            id="course-id"
            className="input"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            placeholder="data-structures"
          />
        </div>
        <div>
          <label className="label" htmlFor="course-name">课程名称</label>
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
        <input
          id="course-file"
          type="file"
          accept=".pdf,.txt"
          className="input"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <button className="btn-primary" onClick={handleUpload} disabled={loading}>
        {loading ? '正在解析并生成知识图谱…（最长约 60 秒）' : '上传并生成知识图谱'}
      </button>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {result && (
        <div
          role="status"
          aria-live="polite"
          className="space-y-2 rounded-lg border border-brand-200 bg-brand-50/40 p-4 text-sm text-gray-700"
        >
          <p className="font-medium text-brand-700">知识图谱生成完成 ✓</p>
          <ul className="space-y-1">
            <li>课程：{result.courseName ?? result.courseId}（{result.courseId}）</li>
            <li>文件：{result.fileName}</li>
            <li>知识点：{result.knowledgeCount} 个 · 关系：{result.relationCount} 条 · 文本块：{result.chunkCount} 个</li>
            <li>
              耗时：解析 {result.timing.parseMs}ms · 抽取 {result.timing.extractMs}ms · 合计{' '}
              {result.timing.totalMs}ms
            </li>
          </ul>
          {result.demoMode && (
            <p className="rounded bg-amber-50 p-2 text-xs text-amber-700">
              ⚠️ {result.message}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <Link href={`/student/graph?courseId=${encodeURIComponent(result.courseId)}`} className="btn-ghost">
              查看知识图谱
            </Link>
            <Link href="/teacher/knowledge" className="btn-ghost">
              修正图谱
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 上传面板（A10.md 十二节：前端点击"上传课程资料"）
 * tier1：表单 + 调用 /api/course/upload，展示返回的生成状态。
 */
'use client';

import { useState } from 'react';

interface UploadResult {
  courseId: string;
  fileName: string;
  knowledgeCount: number;
  relationCount: number;
  chunkCount: number;
  status: string;
}

export function UploadPanel() {
  const [file, setFile] = useState<File | null>(null);
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
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('courseId', 'data-structures');
      form.append('courseName', '数据结构');
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
        {loading ? '正在生成知识图谱…' : '上传并生成知识图谱'}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && (
        <ul className="space-y-1 text-sm text-gray-700">
          <li>课程：{result.courseId}</li>
          <li>文件：{result.fileName}</li>
          <li>知识点数：{result.knowledgeCount}</li>
          <li>关系数：{result.relationCount}</li>
          <li>文本块数：{result.chunkCount}</li>
          <li>状态：{result.status}</li>
        </ul>
      )}
    </div>
  );
}

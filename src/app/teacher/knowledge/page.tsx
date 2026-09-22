/**
 * 教师端 - 图谱预览与知识点/关系管理页（A10.md 十一、十六节）
 * tier2 完整实现：图谱实时预览、知识点列表（编辑/删除）、关系列表（删除）、
 * 手工新增知识点与关系（赛题加分项：教师手动修正图谱）。
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { GraphView } from '@/components/graph/GraphView';
import { CourseSelect } from '@/components/course/CourseSelect';
import { RELATION_TYPES, type GraphData, type KnowledgePoint, type Relation, type RelationType } from '@/types';

const DEFAULT_COURSE = 'data-structures';

export default function TeacherKnowledgePage() {
  const [courseId, setCourseId] = useState(DEFAULT_COURSE);
  const [graph, setGraph] = useState<GraphData>({ nodes: [], edges: [] });
  const [points, setPoints] = useState<KnowledgePoint[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<KnowledgePoint | null>(null);

  const reload = useCallback((cid: string) => {
    fetch(`/api/graph/${encodeURIComponent(cid)}`)
      .then((r) => r.json())
      .then((json) => json.success && setGraph(json.data as GraphData));
    fetch(`/api/knowledge?courseId=${encodeURIComponent(cid)}`)
      .then((r) => r.json())
      .then((json) => json.success && setPoints(json.data as KnowledgePoint[]));
    fetch(`/api/relation?courseId=${encodeURIComponent(cid)}`)
      .then((r) => r.json())
      .then((json) => json.success && setRelations(json.data as Relation[]));
  }, []);

  useEffect(() => {
    reload(courseId);
  }, [courseId, reload]);

  async function api(url: string, method: string, body?: unknown): Promise<Record<string, unknown>> {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  }

  // ---------- 知识点编辑 ----------
  const [kName, setKName] = useState('');
  const [kDefinition, setKDefinition] = useState('');
  const [kChapter, setKChapter] = useState('');
  const [kDifficulty, setKDifficulty] = useState(2);

  function fillForm(p: KnowledgePoint) {
    setEditing(p);
    setKName(p.name);
    setKDefinition(p.definition);
    setKChapter(p.chapter);
    setKDifficulty(p.difficulty);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setEditing(null);
    setKName('');
    setKDefinition('');
    setKChapter('');
    setKDifficulty(2);
  }

  async function submitKnowledge() {
    const payload = {
      name: kName.trim(),
      definition: kDefinition.trim(),
      chapter: kChapter.trim() || '未分类',
      difficulty: kDifficulty,
      courseId,
    };
    if (!payload.name || !payload.definition) {
      setMessage('失败：知识点名称与定义不能为空');
      return;
    }
    const json = editing
      ? await api(`/api/knowledge/${editing.id}`, 'PATCH', {
          name: payload.name,
          definition: payload.definition,
          chapter: payload.chapter,
          difficulty: payload.difficulty,
        })
      : await api('/api/knowledge', 'POST', payload);
    setMessage(json.success ? `已${editing ? '更新' : '新增'}知识点：${kName}` : `失败：${json.error}`);
    if (json.success) {
      resetForm();
      reload(courseId);
    }
  }

  async function deletePoint(p: KnowledgePoint) {
    const json = await api(`/api/knowledge/${p.id}`, 'DELETE');
    setMessage(json.success ? `已删除知识点「${p.name}」及其关联关系` : `失败：${json.error}`);
    if (json.success) reload(courseId);
  }

  // ---------- 关系管理 ----------
  const [rSource, setRSource] = useState('');
  const [rTarget, setRTarget] = useState('');
  const [rType, setRType] = useState<RelationType>('PREREQUISITE');

  async function submitRelation() {
    const json = await api('/api/relation', 'POST', {
      source: rSource.trim(),
      target: rTarget.trim(),
      type: rType,
      courseId,
    });
    setMessage(json.success ? `已新增关系：${rSource} →（${rType}）→ ${rTarget}` : `失败：${json.error}`);
    if (json.success) reload(courseId);
  }

  async function deleteRelation(rel: Relation) {
    const json = await api(
      `/api/relation?source=${encodeURIComponent(rel.source)}&target=${encodeURIComponent(rel.target)}&type=${rel.type}&courseId=${encodeURIComponent(courseId)}`,
      'DELETE',
    );
    setMessage(json.success ? `已删除关系：${rel.source} → ${rel.target}` : `失败：${json.error}`);
    if (json.success) reload(courseId);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">图谱预览与知识点 / 关系管理</h1>
          <p className="mt-1 text-sm text-gray-600">
            自动生成后可人工修正：编辑或删除知识点、增删关系（前置 / 包含 / 相关）。
          </p>
        </div>
        <CourseSelect value={courseId} onChange={setCourseId} />
      </div>

      {message && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{message}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {/* 知识点新增 / 编辑表单 */}
        <div className="card space-y-3">
          <h2 className="font-semibold">{editing ? `编辑知识点：${editing.name}` : '新增知识点'}</h2>
          <div>
            <label className="label" htmlFor="k-name">名称</label>
            <input id="k-name" className="input" value={kName} onChange={(e) => setKName(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="k-def">定义</label>
            <input id="k-def" className="input" value={kDefinition} onChange={(e) => setKDefinition(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="k-chapter">章节</label>
            <input id="k-chapter" className="input" value={kChapter} onChange={(e) => setKChapter(e.target.value)} placeholder="如：栈和队列" />
          </div>
          <div>
            <label className="label" htmlFor="k-diff">难度（1-5）</label>
            <input
              id="k-diff"
              type="number"
              min={1}
              max={5}
              className="input"
              value={kDifficulty}
              onChange={(e) => setKDifficulty(Number(e.target.value))}
            />
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={submitKnowledge}>
              {editing ? '保存修改' : '提交知识点'}
            </button>
            {editing && (
              <button className="btn-ghost" onClick={resetForm}>
                取消编辑
              </button>
            )}
          </div>
        </div>

        {/* 关系新增表单 */}
        <div className="card space-y-3">
          <h2 className="font-semibold">新增关系</h2>
          <div>
            <label className="label" htmlFor="r-source">起点知识点（PREREQUISITE 为先修方 / CONTAINS 为整体方）</label>
            <input id="r-source" className="input" value={rSource} onChange={(e) => setRSource(e.target.value)} list="point-names" />
            <datalist id="point-names">
              {points.map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="label" htmlFor="r-target">终点知识点</label>
            <input id="r-target" className="input" value={rTarget} onChange={(e) => setRTarget(e.target.value)} list="point-names" />
          </div>
          <div>
            <label className="label" htmlFor="r-type">关系类型</label>
            <select id="r-type" className="input" value={rType} onChange={(e) => setRType(e.target.value as RelationType)}>
              {RELATION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <button className="btn-primary" onClick={submitRelation}>提交关系</button>
        </div>
      </div>

      {/* 图谱实时预览 */}
      <div className="card">
        <h2 className="mb-2 font-semibold">图谱实时预览</h2>
        {graph.nodes.length === 0 ? (
          <p className="text-sm text-gray-500">暂无图谱数据，请先上传课程资料。</p>
        ) : (
          <GraphView data={graph} />
        )}
      </div>

      {/* 知识点列表 */}
      <div className="card">
        <h2 className="mb-3 font-semibold">知识点列表（{points.length}）</h2>
        <ul className="divide-y divide-surface-border text-sm">
          {points.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2">
              <div>
                <span className="font-medium">{p.name}</span>
                <span className="ml-2 text-xs text-gray-500">{p.chapter} · 难度 {p.difficulty}/5</span>
                <p className="text-xs text-gray-600">{p.definition}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button className="btn-ghost px-3 py-1" onClick={() => fillForm(p)}>编辑</button>
                <button className="btn-ghost px-3 py-1 text-red-600" onClick={() => deletePoint(p)}>删除</button>
              </div>
            </li>
          ))}
          {points.length === 0 && <li className="py-2 text-gray-500">暂无知识点，请先上传资料。</li>}
        </ul>
      </div>

      {/* 关系列表 */}
      <div className="card">
        <h2 className="mb-3 font-semibold">关系列表（{relations.length}）</h2>
        <ul className="divide-y divide-surface-border text-sm">
          {relations.map((r, i) => (
            <li key={`${r.source}-${r.target}-${r.type}-${i}`} className="flex items-center justify-between gap-3 py-2">
              <span>
                {r.source} <span className="mx-1 rounded bg-brand-50 px-1.5 py-0.5 text-xs text-brand-700">{r.type}</span> {r.target}
              </span>
              <button className="btn-ghost shrink-0 px-3 py-1 text-red-600" onClick={() => deleteRelation(r)}>
                删除
              </button>
            </li>
          ))}
          {relations.length === 0 && <li className="py-2 text-gray-500">暂无关系。</li>}
        </ul>
      </div>
    </div>
  );
}

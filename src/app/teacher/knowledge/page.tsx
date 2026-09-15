/**
 * 教师端 - 知识点/关系管理页（A10.md 十一、十六节）
 * tier1：新增知识点(POST /api/knowledge) 与新增关系(POST /api/relation) 表单。
 * TODO(tier2)：补充编辑/删除、图谱实时刷新（对应演示流程步骤 39）。
 */
'use client';

import { useState } from 'react';
import { RELATION_TYPES, type RelationType } from '@/types';

export default function TeacherKnowledgePage() {
  const [message, setMessage] = useState<string | null>(null);

  // 知识点表单
  const [kName, setKName] = useState('');
  const [kDefinition, setKDefinition] = useState('');
  const [kChapter, setKChapter] = useState('');
  const [kDifficulty, setKDifficulty] = useState(2);

  // 关系表单
  const [rSource, setRSource] = useState('');
  const [rTarget, setRTarget] = useState('');
  const [rType, setRType] = useState<RelationType>('PREREQUISITE');

  async function submitKnowledge() {
    const res = await fetch('/api/knowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: kName,
        definition: kDefinition,
        chapter: kChapter,
        difficulty: kDifficulty,
        courseId: 'data-structures',
      }),
    });
    const json = await res.json();
    setMessage(json.success ? `已新增知识点：${json.data.name}` : `失败：${json.error}`);
  }

  async function submitRelation() {
    const res = await fetch('/api/relation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: rSource, target: rTarget, type: rType }),
    });
    const json = await res.json();
    setMessage(json.success ? `已新增关系：${rSource} → ${rTarget}` : `失败：${json.error}`);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">知识点 / 关系管理</h1>
        <p className="mt-1 text-sm text-gray-600">教师可人工新增知识点与三类关系（前置/包含/相关）。</p>
      </div>

      {message && <p className="text-sm text-brand-700">{message}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-3">
          <h2 className="font-semibold">新增知识点</h2>
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
            <input id="k-chapter" className="input" value={kChapter} onChange={(e) => setKChapter(e.target.value)} />
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
          <button className="btn-primary" onClick={submitKnowledge}>提交知识点</button>
        </div>

        <div className="card space-y-3">
          <h2 className="font-semibold">新增关系</h2>
          <div>
            <label className="label" htmlFor="r-source">起点知识点</label>
            <input id="r-source" className="input" value={rSource} onChange={(e) => setRSource(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="r-target">终点知识点</label>
            <input id="r-target" className="input" value={rTarget} onChange={(e) => setRTarget(e.target.value)} />
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
    </div>
  );
}

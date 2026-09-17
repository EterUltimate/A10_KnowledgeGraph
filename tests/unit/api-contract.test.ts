/**
 * API 契约测试（B-2）：10 个 REST 端点的正例/反例/鉴权/校验/错误码。
 * 直接调用 Next 路由处理函数（vitest node 环境），鉴权通过 vi.mock('@/auth') 注入会话。
 * 数据目录由 tests/setup.ts 指向临时位置，测试互不污染。
 */
import fs from 'fs';
import path from 'path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/* ── 鉴权会话注入（requireTeacher 走 @/auth） ─────────────────────────── */
const authState: { user: null | { role: 'teacher' | 'student'; name?: string } } = { user: null };
vi.mock('@/auth', () => ({
  auth: async () => (authState.user ? { user: authState.user } : null),
}));

import { GET as knowledgeGET, POST as knowledgePOST } from '@/app/api/knowledge/route';
import { PATCH as knowledgePATCH, DELETE as knowledgeDELETE } from '@/app/api/knowledge/[id]/route';
import { GET as relationGET, POST as relationPOST, DELETE as relationDELETE } from '@/app/api/relation/route';
import { GET as masteryGET, POST as masteryPOST } from '@/app/api/mastery/route';
import { GET as pathGET } from '@/app/api/path/[studentId]/route';
import { POST as qaPOST } from '@/app/api/qa/route';
import { GET as courseListGET } from '@/app/api/course/list/route';
import { POST as uploadPOST } from '@/app/api/course/upload/route';
import { GET as healthGET } from '@/app/api/health/route';

const BASE = 'http://localhost:3000';
const jsonReq = (url: string, method: string, body?: unknown) =>
  new NextRequest(BASE + url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
  });

const asTeacher = () => {
  authState.user = { role: 'teacher', name: '教师' };
};
const asStudent = () => {
  authState.user = { role: 'student' };
};
const asAnonymous = () => {
  authState.user = null;
};

let createdKnowledgeId = '';
const COURSE = 'contract-test-course';
const SAMPLE_TXT = path.resolve(__dirname, '../../assets/数据结构-示例教材.txt');

beforeAll(async () => {
  asTeacher();
});

describe('POST /api/knowledge（教师新增知识点）', () => {
  it('反例：未登录 → 401', async () => {
    asAnonymous();
    const res = await knowledgePOST(jsonReq('/api/knowledge', 'POST', { name: 'x' }));
    expect(res.status).toBe(401);
  });

  it('反例：学生角色 → 403', async () => {
    asStudent();
    const res = await knowledgePOST(
      jsonReq('/api/knowledge', 'POST', { name: 'x', definition: 'x', chapter: 'x', difficulty: 1 }),
    );
    expect(res.status).toBe(403);
  });

  it('反例：参数不合法 → 400', async () => {
    asTeacher();
    const res = await knowledgePOST(
      jsonReq('/api/knowledge', 'POST', { name: 'x', definition: 'x', difficulty: 99 }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(false);
  });

  it('正例：教师合法新增 → 201 并返回 id', async () => {
    asTeacher();
    const res = await knowledgePOST(
      jsonReq('/api/knowledge', 'POST', {
        name: '契约测试知识点',
        definition: '契约测试定义',
        chapter: '测试章节',
        difficulty: 3,
        courseId: COURSE,
      }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { success: boolean; data: { id: string } };
    expect(body.success).toBe(true);
    createdKnowledgeId = body.data.id;
    expect(createdKnowledgeId).toBeTruthy();
  });
});

describe('PATCH/DELETE /api/knowledge/{id}', () => {
  it('正例：教师编辑 → 200 字段更新', async () => {
    const res = await knowledgePATCH(
      jsonReq(`/api/knowledge/${createdKnowledgeId}`, 'PATCH', { definition: '修改后的定义' }),
      { params: Promise.resolve({ id: createdKnowledgeId }) },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { definition: string } };
    expect(body.data.definition).toBe('修改后的定义');
  });

  it('反例：PATCH 不存在的 id → 404', async () => {
    const res = await knowledgePATCH(
      jsonReq('/api/knowledge/no-such-id', 'PATCH', { definition: 'x' }),
      { params: Promise.resolve({ id: 'no-such-id' }) },
    );
    expect(res.status).toBe(404);
  });

  it('正例：教师删除 → 200；重复删除 → 404', async () => {
    const res = await knowledgeDELETE(new NextRequest(BASE + `/api/knowledge/${createdKnowledgeId}`), {
      params: Promise.resolve({ id: createdKnowledgeId }),
    });
    expect(res.status).toBe(200);
    const again = await knowledgeDELETE(new NextRequest(BASE + `/api/knowledge/${createdKnowledgeId}`), {
      params: Promise.resolve({ id: createdKnowledgeId }),
    });
    expect(again.status).toBe(404);
  });
});

describe('POST/GET/DELETE /api/relation（教师关系管理）', () => {
  it('反例：POST 非白名单关系类型 → 400', async () => {
    asTeacher();
    const res = await relationPOST(
      jsonReq('/api/relation', 'POST', { source: 'a', target: 'b', type: 'HACKED' }),
    );
    expect(res.status).toBe(400);
  });

  it('正例：POST 合法关系 → 201（自动补占位节点）', async () => {
    asTeacher();
    const res = await relationPOST(
      jsonReq('/api/relation', 'POST', {
        source: '契约起点',
        target: '契约终点',
        type: 'PREREQUISITE',
        courseId: COURSE,
      }),
    );
    expect(res.status).toBe(201);
  });

  it('反例：GET 缺 courseId → 400；正例带 courseId → 200', async () => {
    asTeacher();
    expect((await relationGET(new NextRequest(BASE + '/api/relation'))).status).toBe(400);
    const res = await relationGET(new NextRequest(BASE + `/api/relation?courseId=${COURSE}`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('正例：DELETE 已有关系 → 200；再删 → 404', async () => {
    asTeacher();
    const del = (t: string) =>
      relationDELETE(
        new NextRequest(BASE + `/api/relation?source=契约起点&target=契约终点&type=${t}&courseId=${COURSE}`),
      );
    expect((await del('PREREQUISITE')).status).toBe(200);
    expect((await del('PREREQUISITE')).status).toBe(404);
  });
});

describe('GET/POST /api/mastery（学生掌握状态）', () => {
  it('反例：GET 缺参数 → 400；POST 非法 action → 400', async () => {
    expect((await masteryGET(new NextRequest(BASE + '/api/mastery'))).status).toBe(400);
    expect((await masteryPOST(jsonReq('/api/mastery', 'POST', { action: 'nope' }))).status).toBe(400);
  });

  it('正例：set → GET 读回一致', async () => {
    const set = await masteryPOST(
      jsonReq('/api/mastery', 'POST', {
        action: 'set',
        studentId: 'contract-student',
        courseId: COURSE,
        mastered: ['栈', '队列'],
      }),
    );
    expect(set.status).toBe(200);
    const got = await masteryGET(
      new NextRequest(BASE + '/api/mastery?studentId=contract-student&courseId=' + COURSE),
    );
    expect(got.status).toBe(200);
    const body = (await got.json()) as { data: { mastered: string[] } };
    expect(new Set(body.data.mastered)).toEqual(new Set(['栈', '队列']));
  });
});

describe('GET /api/path/{studentId}（学习路径）', () => {
  it('正例：默认参数返回推荐结构', async () => {
    const res = await pathGET(
      new NextRequest(BASE + `/api/path/contract-student?courseId=${COURSE}`),
      { params: Promise.resolve({ studentId: 'contract-student' }) },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: unknown };
    expect(body.success).toBe(true);
  });

  it('反例：limit 非数字按默认 3 处理（不 500）', async () => {
    const res = await pathGET(
      new NextRequest(BASE + `/api/path/contract-student?limit=abc`),
      { params: Promise.resolve({ studentId: 'contract-student' }) },
    );
    expect([200, 400]).toContain(res.status);
    expect(res.status).not.toBe(500);
  });
});

describe('POST /api/qa（智能问答，离线模式）', () => {
  it('正例：离线模式返回流式回答（200 + 非空流）', async () => {
    const res = await qaPOST(
      new Request(BASE + '/api/qa', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: '栈有什么特点？' }] }],
          courseId: COURSE,
        }),
      }),
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text.length).toBeGreaterThan(0);
  });

  it('反例：请求体不是合法 JSON → 不应 500（400/200 由实现容错决定，禁止崩溃）', async () => {
    const res = await qaPOST(
      new Request(BASE + '/api/qa', { method: 'POST', body: 'not-json' }),
    );
    expect(res.status).toBeLessThan(500);
  });
});

describe('GET /api/course/list', () => {
  it('正例：返回课程数组', async () => {
    const res = await courseListGET(new NextRequest(BASE + '/api/course/list'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('POST /api/course/upload（上传建图）', () => {
  it('反例：未登录 → 401', async () => {
    asAnonymous();
    const fd = new FormData();
    fd.set('file', new File([Buffer.from('%PDF-fake')], 'x.pdf', { type: 'application/pdf' }));
    const res = await uploadPOST(new NextRequest(BASE + '/api/course/upload', { method: 'POST', body: fd }));
    expect(res.status).toBe(401);
  });

  it('反例：TXT 名字但二进制内容（魔数不符）→ 400', async () => {
    asTeacher();
    const fd = new FormData();
    fd.set('file', new File([Buffer.from([0x4d, 0x00, 0x5a, 0x90])], 'evil.txt', { type: 'text/plain' }));
    fd.set('courseId', 'contract-evil');
    const res = await uploadPOST(new NextRequest(BASE + '/api/course/upload', { method: 'POST', body: fd }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('二进制');
  });

  it('正例：教师上传示例教材（离线演示模式）→ 200 且 ≥20 知识点', async () => {
    asTeacher();
    const fd = new FormData();
    fd.set(
      'file',
      new File([fs.readFileSync(SAMPLE_TXT)], 'sample.txt', { type: 'text/plain' }),
    );
    fd.set('courseId', COURSE);
    fd.set('courseName', '契约测试课程');
    const res = await uploadPOST(new NextRequest(BASE + '/api/course/upload', { method: 'POST', body: fd }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { knowledgeCount: number; demoMode: boolean; status: string };
    };
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('completed');
    expect(body.data.knowledgeCount).toBeGreaterThanOrEqual(20);
    expect(body.data.demoMode).toBe(true);
  });
});

describe('GET /api/health（A-3）', () => {
  it('正例：200 且三自检结构完整', async () => {
    const res = await healthGET(new NextRequest(BASE + '/api/health'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      status: string;
      checks: { graph: unknown; llm: unknown; parser: { ok: boolean } };
    };
    expect(body.status).toBe('ok');
    expect(body.checks.parser.ok).toBe(true);
  });
});

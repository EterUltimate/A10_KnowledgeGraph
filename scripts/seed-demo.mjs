/**
 * 一键重准备演示数据（seed:demo）
 *
 * 背景：项目支持 Neo4j / JSON 双图存储（auto 模式）。切库或 e2e 测试后，
 * UI 默认课程 `data-structures` 可能为空或被 `e2e-*` 测试数据污染。
 * 本脚本以「内置《数据结构》演示数据集」为唯一来源，重建一份干净的演示数据：
 *   1) 图谱（37 知识点 / 51 关系）写入 Neo4j（镜像 neo4j-store 的 MERGE schema 与 Cypher）；
 *   2) 同步刷新文件侧存储：data/store/graph.json、courses.json、chunks.json，
 *      并剔除 e2e-* 测试课程，只保留 data-structures（保证切回 json 模式同样干净）。
 *
 * Neo4j 连接取自 .env（NEO4J_URI / NEO4J_USER / NEO4J_PASSWORD），缺省本地 compose 默认值。
 * Neo4j 不可达时仅跳过图库步骤，文件侧演示数据仍会重建（离线 JSON 模式可用）。
 *
 * 用法：
 *   npm run seed:demo
 *   node scripts/seed-demo.mjs --course=data-structures --name=数据结构
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import neo4j from 'neo4j-driver';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const STORE_DIR = path.join(ROOT, 'data', 'store');

// ---------- 参数与环境 ----------
const argv = process.argv.slice(2);
function argVal(prefix, dflt) {
  const hit = argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : dflt;
}
const TARGET_ID = argVal('--course=', 'data-structures');
const TARGET_NAME = argVal('--name=', '数据结构');
const DEMO_SOURCE = '内置演示数据集《数据结构》';

/** 读取 .env 中的 NEO4J_* （不引入 dotenv，纯本地解析） */
function readNeo4jEnv() {
  const env = {};
  const file = path.join(ROOT, '.env');
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m) env[m[1]] = m[2].trim();
    }
  }
  return {
    uri: process.env.NEO4J_URI || env.NEO4J_URI || 'bolt://localhost:7687',
    user: process.env.NEO4J_USER || env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || env.NEO4J_PASSWORD || 'a10devpassword',
  };
}

function readJson(file, fallback) {
  const p = path.join(STORE_DIR, file);
  if (!fs.existsSync(p)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}
function writeJson(file, data) {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  fs.writeFileSync(path.join(STORE_DIR, file), JSON.stringify(data, null, 2), 'utf8');
}
const isE2E = (id) => typeof id === 'string' && id.startsWith('e2e-');

// ---------- 从既有数据提取「内置演示集」模板（不硬编码内容）----------
const graph = readJson('graph.json', { nodes: [], relations: [] });

// 知识点：取 source 为内置演示集的节点，按名称去重（e2e 多次上传产生重复）
const demoPoints = [];
const seenName = new Set();
for (const n of graph.nodes || []) {
  if (n.source !== DEMO_SOURCE) continue;
  if (seenName.has(n.name)) continue;
  seenName.add(n.name);
  demoPoints.push({
    name: n.name,
    definition: n.definition ?? '',
    chapter: n.chapter ?? '未分类',
    difficulty: Number.isFinite(n.difficulty) ? n.difficulty : 3,
    source: DEMO_SOURCE,
  });
}
const knownNames = new Set(demoPoints.map((p) => p.name.replace(/\s+/g, '')));

// 关系：按 (source,target,type) 去重，端点必须落在演示知识点内
const demoRelations = [];
const seenRel = new Set();
for (const r of graph.relations || []) {
  if (!knownNames.has(String(r.source).replace(/\s+/g, ''))) continue;
  if (!knownNames.has(String(r.target).replace(/\s+/g, ''))) continue;
  const key = `${r.source}=>${r.target}:${r.type}`;
  if (seenRel.has(key)) continue;
  seenRel.add(key);
  demoRelations.push({ source: r.source, target: r.target, type: r.type });
}

// 语料：取任意一个课程的 chunks 作为演示教材模板（e2e 均源自同一份教材）
const chunkStore = readJson('chunks.json', {});
const templateCourseId = Object.keys(chunkStore).find((k) => (chunkStore[k] || []).length > 0);
const templateChunks = templateCourseId ? chunkStore[templateCourseId] : [];
const targetChunks = templateChunks.map((c, i) => ({
  ...c,
  id: `${TARGET_ID}-chunk${i}`,
  courseId: TARGET_ID,
}));

if (demoPoints.length === 0) {
  console.error('[seed] 未从 graph.json 找到内置演示集节点，无法重建。请先上传一次示例教材或检查 data/store。');
  process.exit(1);
}

// 为演示知识点分配「全局唯一」且稳定的 id（避免与库中其它课程 demo-kN 撞 id 约束）
const pointsWithId = demoPoints.map((p, i) => ({
  ...p,
  id: `ds-${TARGET_ID}-${i}`,
  courseId: TARGET_ID,
}));

console.log(
  `[seed] 演示集：${pointsWithId.length} 知识点 / ${demoRelations.length} 关系 / ${targetChunks.length} 语料块 → 课程「${TARGET_NAME}」(${TARGET_ID})`,
);

// ---------- 1. 写入 Neo4j（镜像 neo4j-store schema；不可达则跳过）----------
async function seedNeo4j() {
  const { uri, user, password } = readNeo4jEnv();
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
    connectionTimeout: 5000,
  });
  try {
    await driver.verifyConnectivity();
    const session = driver.session({ defaultAccessMode: neo4j.session.WRITE });
    try {
      await session.run(
        'CREATE CONSTRAINT a10_knowledge_id IF NOT EXISTS FOR (k:Knowledge) REQUIRE k.id IS UNIQUE',
      );
      // 先清空目标课程旧图，保证幂等
      await session.run('MATCH (k:Knowledge {courseId: $cid}) DETACH DELETE k', { cid: TARGET_ID });
      // 批量 MERGE 节点
      await session.run(
        `UNWIND $rows AS row
         MERGE (k:Knowledge {courseId: row.courseId, name: row.name})
         SET k.id = row.id, k.definition = row.definition, k.chapter = row.chapter,
             k.difficulty = row.difficulty, k.source = row.source`,
        {
          rows: pointsWithId.map((p) => ({
            courseId: TARGET_ID,
            name: p.name,
            id: p.id,
            definition: p.definition,
            chapter: p.chapter,
            difficulty: p.difficulty,
            source: p.source,
          })),
        },
      );
      // 逐条 MERGE 关系（类型白名单内插，安全）
      const ALLOWED = new Set(['PREREQUISITE', 'CONTAINS', 'RELATED']);
      for (const rel of demoRelations) {
        const safeType = ALLOWED.has(rel.type) ? rel.type : null;
        if (!safeType) continue;
        await session.run(
          `MATCH (a:Knowledge {courseId: $cid, name: $source})
           MATCH (b:Knowledge {courseId: $cid, name: $target})
           MERGE (a)-[r:\`${safeType}\`]->(b)`,
          { cid: TARGET_ID, source: rel.source, target: rel.target },
        );
      }
      const cnt = await session.run(
        'MATCH (k:Knowledge {courseId: $cid}) RETURN count(k) AS n',
        { cid: TARGET_ID },
      );
      const edge = await session.run(
        `MATCH (:Knowledge {courseId: $cid})-[r]->(:Knowledge {courseId: $cid}) RETURN count(r) AS n`,
        { cid: TARGET_ID },
      );
      const n = cnt.records[0].get('n');
      const e = edge.records[0].get('n');
      const toNum = (v) => (v && typeof v.toNumber === 'function' ? v.toNumber() : Number(v));
      console.log(`[seed] ✓ Neo4j 已写入：节点 ${toNum(n)} / 关系 ${toNum(e)}（${uri}）`);
    } finally {
      await session.close();
    }
    return true;
  } catch (err) {
    console.warn(`[seed] ! Neo4j 不可达，跳过图库写入（${uri}）：${err.message}`);
    return false;
  } finally {
    await driver.close();
  }
}

// ---------- 2. 刷新文件侧存储（去 e2e 污染，仅保留干净演示课）----------
function seedFiles() {
  // graph.json：重建为目标课程
  writeJson('graph.json', {
    nodes: pointsWithId,
    relations: demoRelations.map((r) => ({ ...r, courseId: TARGET_ID })),
  });

  // courses.json：剔除 e2e-*，确保目标课程存在且计数正确
  const courses = readJson('courses.json', []);
  const cleaned = (Array.isArray(courses) ? courses : []).filter((c) => !isE2E(c.id));
  const now = new Date().toISOString();
  const existing = cleaned.find((c) => c.id === TARGET_ID);
  if (existing) {
    Object.assign(existing, {
      name: TARGET_NAME,
      fileTypes: existing.fileTypes?.length ? existing.fileTypes : ['txt'],
      knowledgeCount: pointsWithId.length,
    });
  } else {
    cleaned.push({
      id: TARGET_ID,
      name: TARGET_NAME,
      fileTypes: ['txt'],
      knowledgeCount: pointsWithId.length,
      createdAt: now,
    });
  }
  writeJson('courses.json', cleaned);

  // chunks.json：剔除 e2e-*，写入目标课程演示语料
  const nextChunks = {};
  for (const [cid, list] of Object.entries(readJson('chunks.json', {}))) {
    if (isE2E(cid)) continue;
    if (cid === TARGET_ID) continue; // 稍后统一覆盖
    nextChunks[cid] = list;
  }
  if (targetChunks.length > 0) nextChunks[TARGET_ID] = targetChunks;
  writeJson('chunks.json', nextChunks);

  console.log(
    `[seed] ✓ 文件存储已刷新：graph.json / courses.json / chunks.json（课程数 ${cleaned.length}，已剔除 e2e 测试数据）`,
  );
}

// ---------- 主流程 ----------
const neo4jOk = await seedNeo4j();
seedFiles();
console.log(
  neo4jOk
    ? `[seed] 完成。Neo4j + 文件双侧一致。刷新页面即可在「${TARGET_NAME}」看到图谱。`
    : `[seed] 完成（仅文件侧）。当前 Neo4j 不可达；如以 auto/json 模式运行，刷新页面即可看到演示数据。`,
);

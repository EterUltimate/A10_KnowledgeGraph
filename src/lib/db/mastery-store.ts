/**
 * 学生掌握状态存储抽象层（A-4，仿 GraphStore 分层）
 *
 * 接口 + JSON 实现（生产可扩展 SQL 实现——如 better-sqlite3/Postgres，业务层无需改动）。
 * 并发安全设计（A-4 验收项「并发写不丢数据」）：
 *  1. 原子替换：写入走 json-file 的「临时文件 + rename」，任何时刻磁盘上都是完整文件；
 *  2. 进程内写队列：同一文件的写操作按到达顺序串行执行，单 Node 实例内不丢更新；
 *  3. 跨进程 mkdir 锁文件：多进程（如脚本与服务同时运行）互斥，锁超时自动接管（防死锁）。
 */
import fs from 'fs';
import path from 'path';
import type { MasteryState } from '@/types';
import { readJsonFile, writeJsonFile } from '@/lib/db/json-file';
import { config } from '@/lib/config';

/** 掌握状态存储统一接口（按 学生+课程 维度隔离） */
export interface MasteryStore {
  readonly kind: 'json' | 'sql';

  get(studentId: string, courseId: string): Promise<MasteryState>;
  /** 全量覆盖该学生该课程的掌握集合（去重） */
  set(studentId: string, courseId: string, mastered: string[]): Promise<MasteryState>;
}

type MasteryFileShape = Record<string, string[]>;

/** 默认持久化路径 */
export function masteryFilePath(): string {
  return path.join(config.store.dataDir, 'mastery.json');
}

function masteryKey(studentId: string, courseId: string): string {
  return `${studentId}::${courseId}`;
}

/* ── 进程内写队列：同一文件的写入串行化（模块级，跨实例生效） ─────────────── */
const writeQueues = new Map<string, Promise<unknown>>();

function enqueueWrite<T>(filePath: string, task: () => T): Promise<T> {
  const prev = writeQueues.get(filePath) ?? Promise.resolve();
  const next = prev.then(task, task);
  writeQueues.set(
    filePath,
    next.catch(() => undefined),
  );
  return next;
}

/* ── 跨进程 mkdir 锁文件 ─────────────────────────────────────────────── */
const LOCK_STALE_MS = 10_000;

function acquireLock(lockPath: string, timeoutMs = 5000): void {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      fs.mkdirSync(lockPath);
      return;
    } catch {
      // 目录已存在 = 有锁；检查是否为死锁残留
      try {
        const stat = fs.statSync(lockPath);
        if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
          fs.rmdirSync(lockPath);
          continue;
        }
      } catch {
        // stat 失败说明锁刚被释放，重试即可
      }
      if (Date.now() > deadline) {
        throw new Error(`[mastery-store] 获取文件锁超时：${lockPath}`);
      }
      // 自旋等待 25ms 后重试
      const waitUntil = Date.now() + 25;
      while (Date.now() < waitUntil) {
        /* busy wait（时长极短，可接受） */
      }
    }
  }
}

function releaseLock(lockPath: string): void {
  try {
    fs.rmdirSync(lockPath);
  } catch {
    // 锁已不存在（被 stale 接管清理）时忽略
  }
}

/** JSON 文件实现（默认） */
export class JsonMasteryStore implements MasteryStore {
  readonly kind = 'json' as const;

  constructor(private readonly filePath: string = masteryFilePath()) {}

  private readAll(): MasteryFileShape {
    return readJsonFile<MasteryFileShape>(this.filePath, {});
  }

  async get(studentId: string, courseId: string): Promise<MasteryState> {
    const mastered = this.readAll()[masteryKey(studentId, courseId)] ?? [];
    return { studentId, courseId, mastered: [...mastered] };
  }

  async set(studentId: string, courseId: string, mastered: string[]): Promise<MasteryState> {
    const result = await enqueueWrite(this.filePath, () => {
      const lockPath = `${this.filePath}.lock`;
      acquireLock(lockPath);
      try {
        // 锁内重读，合并其他进程的最新内容，避免覆盖丢失
        const all = this.readAll();
        all[masteryKey(studentId, courseId)] = [...new Set(mastered)];
        writeJsonFile(this.filePath, all);
        return all[masteryKey(studentId, courseId)];
      } finally {
        releaseLock(lockPath);
      }
    });
    return { studentId, courseId, mastered: [...result] };
  }
}

const globalForMastery = globalThis as unknown as { __a10MasteryStore?: Promise<MasteryStore> };

/**
 * 存储工厂：进程内单例。MASTERY_STORE=auto（默认）当前解析为 JSON 实现；
 * 预留 sql 值——引入 better-sqlite3/Postgres 时在此扩展，业务层零改动（A-4 验收项）。
 */
export function getMasteryStore(): Promise<MasteryStore> {
  if (!globalForMastery.__a10MasteryStore) {
    const mode = (process.env.MASTERY_STORE ?? 'auto').toLowerCase();
    if (mode === 'sql') {
      globalForMastery.__a10MasteryStore = Promise.reject(
        new Error('[mastery-store] MASTERY_STORE=sql 尚未实现（预留扩展点），请使用 json/auto'),
      );
      globalForMastery.__a10MasteryStore.catch(() => undefined);
    } else {
      if (mode !== 'auto' && mode !== 'json') {
        console.warn(`[mastery-store] 未知 MASTERY_STORE=${mode}，回退 json`);
      }
      globalForMastery.__a10MasteryStore = Promise.resolve(new JsonMasteryStore());
    }
  }
  return globalForMastery.__a10MasteryStore;
}

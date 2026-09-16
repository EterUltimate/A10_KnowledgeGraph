/**
 * 轻量 JSON 文件持久化辅助（tier2）
 * 用于：JSON 图存储兜底、课程注册表、学生掌握状态等本地持久化。
 * 设计约束：写入采用"临时文件 + rename"原子替换，避免进程中断导致文件损坏。
 */
import fs from 'fs';
import path from 'path';

/** 读取 JSON 文件；不存在或解析失败时返回 fallback */
export function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch (err) {
    console.warn(`[json-file] 读取失败，使用兜底值：${filePath}`, err);
    return fallback;
  }
}

/** 写入 JSON 文件（自动建目录、临时文件原子替换） */
export function writeJsonFile<T>(filePath: string, value: T): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(value, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

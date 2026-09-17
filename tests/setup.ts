/**
 * vitest 全局 setup（B-1/B-2）：在所有模块加载前设置环境。
 * - DATA_DIR 指向临时目录：单测不污染真实 data/store
 * - AUTH_SECRET 固定值：鉴权相关单测可复现
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

process.env.DATA_DIR ??= fs.mkdtempSync(path.join(os.tmpdir(), 'a10-unit-data-'));
process.env.AUTH_SECRET ??= 'a10-unit-test-secret';

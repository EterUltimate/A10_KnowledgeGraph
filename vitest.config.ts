import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * 单元测试配置（vitest）
 * 只覆盖纯逻辑（解析/切块/检索打分/路径推荐/关系清洗），
 * 端到端流程见 playwright（npm run test:e2e）。
 */
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});

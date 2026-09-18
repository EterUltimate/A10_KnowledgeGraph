import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 单元测试配置（vitest）
 * 只覆盖纯逻辑（解析/切块/检索打分/路径推荐/关系清洗/鉴权/存储抽象），
 * 端到端流程见 playwright（npm run test:e2e）。
 * 覆盖率（B-1）：`npm run test:coverage`，services/lib 阈值 70%
 * （neo4j 相关实现需要真实实例，单测环境排除——其安全与契约由集成/e2e 覆盖）。
 */
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDir: 'coverage',
      include: ['src/services/**', 'src/lib/**'],
      exclude: [
        'src/lib/db/neo4j.ts',
        'src/lib/db/neo4j-store.ts',
        'src/lib/ai/demo-dataset.ts',
        'src/lib/ai/prompts.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        statements: 70,
        branches: 55,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});

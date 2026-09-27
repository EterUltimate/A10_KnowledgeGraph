import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // eslint 10 移除了 context.getFilename()，而 eslint-plugin-react 的版本探测
    // （settings.react.version === 'detect' 时）依赖它。显式指定 React 版本绕过探测。
    settings: { react: { version: '19.2.1' } },
  },
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'coverage/**',
      'playwright-report/**',
    ],
  },
];

export default eslintConfig;

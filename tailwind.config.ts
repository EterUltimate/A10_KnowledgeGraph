import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // 设计 token：遵循 frontend-design 规范，集中管理品牌色与语义色
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe6fe',
          500: '#4f6ef7',
          600: '#3b55e0',
          700: '#3143b8',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f6f7fb',
          border: '#e5e7eb',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;

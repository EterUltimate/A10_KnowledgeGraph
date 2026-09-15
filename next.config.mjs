import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 显式指定 workspace 根，避免多 lockfile 导致的推断告警
  outputFileTracingRoot: __dirname,
  // Neo4j driver 与 pdf-parse 含 Node 原生依赖，需排除在 server 端打包之外
  serverExternalPackages: ['neo4j-driver', 'pdf-parse'],
};

export default nextConfig;

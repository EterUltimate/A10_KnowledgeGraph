/**
 * 集中式配置读取（对应 A10.md 六、八节的 .env 配置）
 * 所有环境变量在此统一读取与校验，业务代码不直接访问 process.env。
 */

function readEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  return value ?? '';
}

function readIntEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isNaN(parsed) ? fallback : parsed;
}

export const config = {
  neo4j: {
    uri: readEnv('NEO4J_URI', 'bolt://localhost:7687'),
    user: readEnv('NEO4J_USER', 'neo4j'),
    password: readEnv('NEO4J_PASSWORD', ''),
  },
  llm: {
    apiKey: readEnv('LLM_API_KEY', ''),
    baseURL: readEnv('LLM_BASE_URL', 'https://api.deepseek.com/v1'),
    model: readEnv('LLM_MODEL', 'deepseek-chat'),
  },
  rag: {
    /** 检索返回的最相关文本块数量（A10.md 十五节建议 3-5） */
    topK: readIntEnv('RAG_TOP_K', 4),
    /** 文本切块大小（字） */
    chunkSize: readIntEnv('RAG_CHUNK_SIZE', 800),
  },
} as const;

/**
 * 校验关键配置是否就绪。
 * TODO(tier2)：在应用启动或 Day1 连通性测试中调用，缺失时给出明确报错。
 */
export function assertConfigReady(): { neo4j: boolean; llm: boolean } {
  return {
    neo4j: Boolean(config.neo4j.uri && config.neo4j.user && config.neo4j.password),
    llm: Boolean(config.llm.apiKey && config.llm.baseURL && config.llm.model),
  };
}

/**
 * 集中式配置读取（对应 A10.md 六、八节的 .env 配置）
 * 所有环境变量在此统一读取与校验，业务代码不直接访问 process.env。
 */
import path from 'path';

function readEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  return value ?? '';
}

function readIntEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isNaN(parsed) ? fallback : parsed;
}

/** 图存储模式：auto=有 Neo4j 密码则用 Neo4j（连不上自动降级 JSON），neo4j/json 强制指定 */
export type StoreMode = 'auto' | 'neo4j' | 'json';

function readStoreMode(): StoreMode {
  const raw = readEnv('GRAPH_STORE', 'auto').toLowerCase();
  return raw === 'neo4j' || raw === 'json' ? raw : 'auto';
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
  store: {
    mode: readStoreMode(),
    /** JSON 兜底存储目录（课程注册表、掌握状态、图数据兜底都在这里） */
    dataDir: readEnv('DATA_DIR', path.join(process.cwd(), 'data', 'store')),
  },
  upload: {
    /** 上传文件大小上限（字节），默认 20MB */
    maxFileSize: readIntEnv('MAX_FILE_SIZE', 20 * 1024 * 1024),
  },
} as const;

/**
 * LLM 是否已配置可用。
 * 把示例占位值（your_api_key_here）也视为未配置，避免"填了模板忘了换"的隐性故障。
 */
export function isLLMConfigured(): boolean {
  const key = config.llm.apiKey.trim();
  return Boolean(key) && key !== 'your_api_key_here';
}

/**
 * 校验关键配置是否就绪（Day1 连通性测试 A10.md 二十二节）。
 * neo4j 项为 true 表示"配置了 Neo4j"，最终是否可用由存储工厂探测降级保证。
 */
export function assertConfigReady(): { neo4j: boolean; llm: boolean } {
  return {
    neo4j: Boolean(config.neo4j.uri && config.neo4j.user && config.neo4j.password),
    llm: isLLMConfigured(),
  };
}

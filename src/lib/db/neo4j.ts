/**
 * Neo4j driver 单例（对应 A10.md 七节 Python 连接 Neo4j 的 TS 版本）
 * 提供连接管理、连通性测试与唯一性约束初始化；
 * 具体 Cypher 读写在 neo4j-store.ts 落地。
 */
import neo4j, { Driver, Session } from 'neo4j-driver';
import { config } from '@/lib/config';

const globalForNeo4j = globalThis as unknown as { __a10Neo4jDriver?: Driver };

/** 获取（并惰性创建）全局唯一的 Neo4j driver 实例（dev 热重载安全） */
export function getDriver(): Driver {
  if (!globalForNeo4j.__a10Neo4jDriver) {
    globalForNeo4j.__a10Neo4jDriver = neo4j.driver(
      config.neo4j.uri,
      neo4j.auth.basic(config.neo4j.user, config.neo4j.password),
      { connectionTimeout: 5000 },
    );
  }
  return globalForNeo4j.__a10Neo4jDriver;
}

/** 获取一个会话；调用方负责关闭（或用 runInSession 辅助函数） */
export function getSession(accessMode: 'READ' | 'WRITE' = 'WRITE'): Session {
  const mode = accessMode === 'READ' ? neo4j.session.READ : neo4j.session.WRITE;
  return getDriver().session({ defaultAccessMode: mode });
}

/** 3 秒超时包裹，防止无 Neo4j 环境下启动探测长时间挂起 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`连接超时（${ms}ms）`)), ms)),
  ]);
}

/**
 * Day1 连通性测试（A10.md 二十二节 测试2）：
 * 验证能否连接 Neo4j；成功则同时初始化知识点 id 唯一性约束。
 */
export async function verifyConnectivity(): Promise<boolean> {
  try {
    const driver = getDriver();
    await withTimeout(driver.verifyConnectivity(), 3000);
    const session = getSession('WRITE');
    try {
      await session.run(
        'CREATE CONSTRAINT a10_knowledge_id IF NOT EXISTS FOR (k:Knowledge) REQUIRE k.id IS UNIQUE',
      );
    } finally {
      await session.close();
    }
    return true;
  } catch (err) {
    console.warn('[neo4j] 连接失败：', err instanceof Error ? err.message : err);
    return false;
  }
}

/** 关闭 driver（应用退出时调用） */
export async function closeDriver(): Promise<void> {
  const driver = globalForNeo4j.__a10Neo4jDriver;
  if (driver) {
    await driver.close();
    globalForNeo4j.__a10Neo4jDriver = undefined;
  }
}

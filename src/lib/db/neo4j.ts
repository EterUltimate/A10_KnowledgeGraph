/**
 * Neo4j driver 单例（对应 A10.md 七节 Python 连接 Neo4j 的 TS 版本）
 * tier1：仅提供连接管理与连通性测试桩，具体 Cypher 读写在 services/graph.service.ts 落地。
 */
import neo4j, { Driver, Session } from 'neo4j-driver';
import { config } from '@/lib/config';

let driver: Driver | null = null;

/** 获取（并惰性创建）全局唯一的 Neo4j driver 实例 */
export function getDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(
      config.neo4j.uri,
      neo4j.auth.basic(config.neo4j.user, config.neo4j.password),
    );
  }
  return driver;
}

/** 获取一个会话；调用方负责关闭（或用 runInSession 辅助函数） */
export function getSession(accessMode: 'READ' | 'WRITE' = 'WRITE'): Session {
  const mode = accessMode === 'READ' ? neo4j.session.READ : neo4j.session.WRITE;
  return getDriver().session({ defaultAccessMode: mode });
}

/**
 * Day1 连通性测试（A10.md 二十二节 测试2）：
 * 验证能否连接 Neo4j 并创建一个 Knowledge 节点。
 * TODO(tier2)：实现真实 verifyConnectivity + MERGE 节点。
 */
export async function verifyConnectivity(): Promise<boolean> {
  // TODO(tier2): 取消注释并实现
  // const d = getDriver();
  // await d.verifyConnectivity();
  // const session = getSession('WRITE');
  // try {
  //   await session.run('MERGE (k:Knowledge {name:$name})', { name: '线性表' });
  //   return true;
  // } finally {
  //   await session.close();
  // }
  console.warn('[neo4j] verifyConnectivity 尚未实现（tier1 桩），返回 false');
  return false;
}

/** 关闭 driver（应用退出时调用） */
export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

/**
 * 内存令牌桶限流（A-5）：无外部依赖，适用于单机演示/单实例部署。
 * 固定窗口计数；key 建议 `bucket:ip`。生产多实例部署应换 Redis 等集中式限流
 * （部署文档已注明此限制）。
 */
export interface RateLimitOptions {
  /** 窗口时长（毫秒） */
  windowMs: number;
  /** 窗口内最大请求数 */
  max: number;
  /** 注入当前时间（测试用），默认 Date.now() */
  now?: number;
}

export interface RateLimitResult {
  ok: boolean;
  /** 窗口内剩余可用次数 */
  remaining: number;
  /** 被拒绝时，距窗口重置的秒数 */
  retryAfterSec: number;
}

const buckets = new Map<string, { count: number; resetAt: number }>();

/** 桶数量上限，防止内存膨胀（超过时清理过期桶） */
const MAX_BUCKETS = 5000;

export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = opts.now ?? Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    if (buckets.size > MAX_BUCKETS) {
      for (const [k, v] of buckets) {
        if (now >= v.resetAt) buckets.delete(k);
      }
    }
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.max - 1, retryAfterSec: 0 };
  }

  if (bucket.count >= opts.max) {
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true, remaining: opts.max - bucket.count, retryAfterSec: 0 };
}

/** 从请求头解析客户端 IP（x-forwarded-for 优先，供部署在反代后时使用） */
export function clientIp(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-real-ip') ?? 'unknown';
}

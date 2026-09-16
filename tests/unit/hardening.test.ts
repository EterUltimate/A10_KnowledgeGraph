/**
 * A-5 安全硬化单元测试：魔数校验 / 内存限流 / SSRF Base URL 防护 / Cypher 标识符内插
 */
import { afterEach, describe, expect, it } from 'vitest';
import { verifyFileMagic } from '@/services/document.service';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';
import { assertLLMBaseURLSafe } from '@/lib/ai/provider';
import { cypherSafeIdentifier } from '@/lib/db/graph-store';

describe('verifyFileMagic（魔数校验）', () => {
  it('合法 PDF（%PDF- 开头）通过，伪装 PDF 拒绝', () => {
    expect(verifyFileMagic(Buffer.from('%PDF-1.7 fake body'), 'pdf')).toBeNull();
    const reason = verifyFileMagic(Buffer.from('MZ executable disguised as pdf'), 'pdf');
    expect(reason).toContain('%PDF-');
  });

  it('TXT 含 NUL 字节（二进制伪装）拒绝，纯文本通过', () => {
    expect(verifyFileMagic(Buffer.from('栈是线性表'), 'txt')).toBeNull();
    const reason = verifyFileMagic(Buffer.from([0x25, 0x00, 0x50, 0x44]), 'txt');
    expect(reason).toContain('二进制');
  });
});

describe('checkRateLimit（内存令牌桶）', () => {
  const opts = { windowMs: 60_000, max: 3 };

  it('窗口内允许 max 次，超出被拒并给出重试秒数', () => {
    const t0 = 1_000_000;
    expect(checkRateLimit('k1', { ...opts, now: t0 }).ok).toBe(true);
    expect(checkRateLimit('k1', { ...opts, now: t0 }).ok).toBe(true);
    const third = checkRateLimit('k1', { ...opts, now: t0 });
    expect(third.ok).toBe(true);
    expect(third.remaining).toBe(0);
    const blocked = checkRateLimit('k1', { ...opts, now: t0 + 1000 });
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it('窗口滑过后重新计数（注入时间验证）', () => {
    const t0 = 2_000_000;
    checkRateLimit('k2', { ...opts, now: t0 });
    checkRateLimit('k2', { ...opts, now: t0 });
    checkRateLimit('k2', { ...opts, now: t0 });
    expect(checkRateLimit('k2', { ...opts, now: t0 }).ok).toBe(false);
    expect(checkRateLimit('k2', { ...opts, now: t0 + 60_000 }).ok).toBe(true);
  });

  it('不同 key 相互隔离', () => {
    expect(checkRateLimit('a', { windowMs: 1000, max: 1, now: 3_000_000 }).ok).toBe(true);
    expect(checkRateLimit('b', { windowMs: 1000, max: 1, now: 3_000_000 }).ok).toBe(true);
    expect(checkRateLimit('a', { windowMs: 1000, max: 1, now: 3_000_100 }).ok).toBe(false);
  });

  it('clientIp 取 x-forwarded-for 首个并回退 x-real-ip / unknown', () => {
    const mk = (map: Record<string, string>) => ({ get: (n: string) => map[n] ?? null });
    expect(clientIp(mk({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))).toBe('1.2.3.4');
    expect(clientIp(mk({ 'x-real-ip': '9.9.9.9' }))).toBe('9.9.9.9');
    expect(clientIp(mk({}))).toBe('unknown');
  });
});

describe('assertLLMBaseURLSafe（SSRF 防护）', () => {
  const ENV_BACKUP = { ...process.env };
  afterEach(() => {
    process.env = { ...ENV_BACKUP };
  });

  it('合法 https 公网地址通过', () => {
    expect(assertLLMBaseURLSafe('https://api.deepseek.com/v1')).toBeNull();
    expect(assertLLMBaseURLSafe('https://dashscope.aliyuncs.com/compatible-mode/v1')).toBeNull();
  });

  it('非 https 与内网地址被拒', () => {
    expect(assertLLMBaseURLSafe('http://api.deepseek.com/v1')).toContain('https');
    expect(assertLLMBaseURLSafe('https://127.0.0.1:8080/v1')).toContain('SSRF');
    expect(assertLLMBaseURLSafe('https://192.168.1.10/v1')).toContain('SSRF');
    expect(assertLLMBaseURLSafe('https://metadata.internal/v1')).toContain('SSRF');
    expect(assertLLMBaseURLSafe('not a url')).toContain('合法 URL');
  });

  it('显式放开本地推理（LLM_ALLOW_LOCAL_LLM=1）后 localhost 可用', () => {
    process.env.LLM_ALLOW_LOCAL_LLM = '1';
    expect(assertLLMBaseURLSafe('http://localhost:11434/v1')).toContain('https');
    process.env.LLM_ALLOW_INSECURE_BASEURL = '1';
    expect(assertLLMBaseURLSafe('http://localhost:11434/v1')).toBeNull();
  });
});

describe('cypherSafeIdentifier（Cypher 标识符内插防护）', () => {
  it('白名单标识符加反引号返回', () => {
    expect(cypherSafeIdentifier('PREREQUISITE')).toBe('`PREREQUISITE`');
    expect(cypherSafeIdentifier('RELATED')).toBe('`RELATED`');
  });

  it('注入载荷与非法字符直接抛错', () => {
    expect(() => cypherSafeIdentifier('PREREQUISITE] DELETE a //')).toThrow();
    expect(() => cypherSafeIdentifier('lower-case')).toThrow();
    expect(() => cypherSafeIdentifier('')).toThrow();
  });
});

/**
 * 多提供商 LLM 运行时配置（教师端可自助接入自定义模型）。
 *
 * 支持四种协议格式（对应赛题"接入大模型"的扩展，便于评委用任意 Key 演示）：
 * - openai-compatible：通用 OpenAI 兼容接口（DeepSeek/Qwen/Moonshot 等，默认）
 * - openai-chat     ：OpenAI Chat Completions（POST {baseURL}/chat/completions）
 * - openai-responses：OpenAI Responses（POST {baseURL}/responses）
 * - anthropic       ：Anthropic Messages（POST {baseURL}/v1/messages）
 * - gemini          ：Google Gemini（{baseURL}/models/{model}:generateContent）
 *
 * 配置来源优先级：运行时覆盖（教师在设置页保存，持久化到 data/llm-config.json）
 * > 环境变量 .env（LLM_*）。密钥仅存服务端，前端一律掩码回显。
 */
import path from 'path';
import crypto from 'node:crypto';
import { config } from '@/lib/config';
import { readJsonFile, writeJsonFile } from '@/lib/db/json-file';

export type LLMProviderKind =
  'openai-compatible' | 'openai-chat' | 'openai-responses' | 'anthropic' | 'gemini';

export const PROVIDER_KINDS: { value: LLMProviderKind; label: string; hint: string }[] = [
  {
    value: 'openai-compatible',
    label: 'OpenAI 兼容（DeepSeek/Qwen 等）',
    hint: 'POST /chat/completions，最通用',
  },
  {
    value: 'openai-chat',
    label: 'OpenAI Chat',
    hint: 'POST /chat/completions（官方 api.openai.com）',
  },
  { value: 'openai-responses', label: 'OpenAI Responses', hint: 'POST /responses（新格式）' },
  { value: 'anthropic', label: 'Anthropic（Claude）', hint: 'POST /v1/messages' },
  { value: 'gemini', label: 'Google Gemini', hint: ':generateContent' },
];

export interface LLMConfig {
  kind: LLMProviderKind;
  baseURL: string;
  apiKey: string;
  model: string;
  /** 可选：向量检索嵌入模型名（缺省取环境变量 LLM_EMBED_MODEL） */
  embedModel?: string;
}

/** 支持嵌入端点的协议格式（Anthropic 无 embeddings API，故不支持向量检索） */
const EMBEDDING_CAPABLE_KINDS: ReadonlySet<LLMProviderKind> = new Set([
  'openai-compatible',
  'openai-chat',
  'openai-responses',
  'gemini',
]);

/** 密钥池中的一套命名配置（管理员维护，可切换为当前生效） */
export interface LLMKeyProfile extends LLMConfig {
  id: string;
  name: string;
}

interface RuntimeConfigFile {
  /** 旧的单一运行时覆盖（教师设置页写入），与密钥池并存以向下兼容 */
  override: LLMConfig | null;
  /** 管理员维护的命名密钥池 */
  profiles: LLMKeyProfile[];
  /** 当前生效的密钥池 id（null = 不启用池，回退 override/env） */
  activeId: string | null;
}

const globalForLLM = globalThis as unknown as { __a10LLMRuntime?: RuntimeConfigFile };

function configFile(): string {
  return path.join(config.store.dataDir, 'llm-config.json');
}

function validKind(kinds: Set<LLMProviderKind>, kind: unknown): kind is LLMProviderKind {
  return typeof kind === 'string' && kinds.has(kind as LLMProviderKind);
}

function loadRuntime(): RuntimeConfigFile {
  const cached = globalForLLM.__a10LLMRuntime;
  // 热重载兼容：旧版本可能缓存了缺 profiles/activeId 的形状，视为无效从盘重建
  if (cached && Array.isArray(cached.profiles) && 'activeId' in cached) return cached;
  const raw = readJsonFile<Partial<RuntimeConfigFile>>(configFile(), {});
  // 容错：kind 非法的条目丢弃（兼容旧文件缺 profiles/activeId 字段）
  const kinds = new Set<LLMProviderKind>(PROVIDER_KINDS.map((k) => k.value));
  const override = raw.override && validKind(kinds, raw.override.kind) ? raw.override : null;
  const profiles = Array.isArray(raw.profiles)
    ? raw.profiles.filter((p) => p && validKind(kinds, p.kind))
    : [];
  const activeId =
    raw.activeId && profiles.some((p) => p.id === raw.activeId) ? raw.activeId : null;
  globalForLLM.__a10LLMRuntime = { override, profiles, activeId };
  return globalForLLM.__a10LLMRuntime;
}

function saveRuntime(store: RuntimeConfigFile): void {
  globalForLLM.__a10LLMRuntime = store;
  writeJsonFile(configFile(), store);
}

/** 环境变量默认配置（openai-compatible） */
function envDefault(): LLMConfig {
  return {
    kind: 'openai-compatible',
    baseURL: config.llm.baseURL,
    apiKey: config.llm.apiKey,
    model: config.llm.model,
  };
}

/** 当前生效的密钥池条目（activeId 指向且密钥非空/占位）；否则 undefined */
function activeProfile(): LLMKeyProfile | undefined {
  const rt = loadRuntime();
  if (!rt.activeId) return undefined;
  const p = rt.profiles.find((x) => x.id === rt.activeId);
  const key = p?.apiKey.trim();
  return p && key && key !== 'your_api_key_here' ? p : undefined;
}

/** 生效配置优先级：密钥池生效项 > 运行时单覆盖 > .env */
export function getEffectiveLLMConfig(): LLMConfig & { source: 'profile' | 'runtime' | 'env' } {
  const active = activeProfile();
  if (active) {
    return {
      kind: active.kind,
      baseURL: active.baseURL,
      apiKey: active.apiKey,
      model: active.model,
      embedModel: active.embedModel,
      source: 'profile',
    };
  }
  const runtime = loadRuntime().override;
  if (runtime && runtime.apiKey.trim()) {
    return { ...runtime, source: 'runtime' };
  }
  return { ...envDefault(), source: 'env' };
}

/** 是否有运行时覆盖（用于设置页显示"已自定义"标记） */
export function hasRuntimeOverride(): boolean {
  return Boolean(loadRuntime().override?.apiKey.trim());
}

/** 保存运行时覆盖（密钥不再返回，见 maskApiKey） */
export function setRuntimeLLMConfig(cfg: LLMConfig): void {
  const store = loadRuntime();
  saveRuntime({ ...store, override: { ...cfg } });
}

/** 清除运行时覆盖，回退 .env */
export function clearRuntimeLLMConfig(): void {
  const store = loadRuntime();
  saveRuntime({ ...store, override: null });
}

/** 密钥掩码：只留前 4 位，其余打码，避免泄露到前端 */
export function maskApiKey(key: string): string {
  const k = key.trim();
  if (!k) return '';
  if (k.length <= 4) return '****';
  return `${k.slice(0, 4)}${'*'.repeat(Math.min(8, k.length - 4))}`;
}

/** 对外返回的安全视图（不含明文 key） */
export function publicLLMConfigView() {
  const eff = getEffectiveLLMConfig();
  const embed = getEffectiveEmbedConfig();
  return {
    kind: eff.kind,
    baseURL: eff.baseURL,
    model: eff.model,
    source: eff.source,
    configured: isLLMConfigured(),
    maskedApiKey: maskApiKey(eff.apiKey),
    /** 向量检索（嵌入）是否可用与生效模型 */
    embeddingConfigured: embed !== null,
    embedModel: embed?.model ?? '',
  };
}

/** LLM 是否可用（生效配置含非占位密钥） */
export function isLLMConfigured(): boolean {
  const key = getEffectiveLLMConfig().apiKey.trim();
  return Boolean(key) && key !== 'your_api_key_here';
}

/** 向量检索生效的嵌入配置（null = 未启用，RAG 回退纯关键词） */
export interface EmbedConfig {
  kind: LLMProviderKind;
  baseURL: string;
  apiKey: string;
  model: string;
}

/**
 * 解析生效的嵌入配置：模型名取环境变量或运行时 embedModel；
 * baseURL / apiKey / 协议缺省沿用主 LLM 生效配置（允许单独覆盖）。
 * 任一前置不满足（无模型名 / provider 不支持嵌入 / 无密钥 / 无地址）则返回 null。
 */
export function getEffectiveEmbedConfig(): EmbedConfig | null {
  const eff = getEffectiveLLMConfig();
  const model = (config.embed.model || eff.embedModel || '').trim();
  if (!model) return null;
  const kind = (config.embed.kind as LLMProviderKind) || eff.kind;
  if (!EMBEDDING_CAPABLE_KINDS.has(kind)) return null;
  const baseURL = (config.embed.baseURL || eff.baseURL).trim();
  const apiKey = (config.embed.apiKey || eff.apiKey).trim();
  if (!baseURL || !apiKey || apiKey === 'your_api_key_here') return null;
  return { kind, baseURL, apiKey, model };
}

/** 向量检索是否可用（已配置且 provider 支持嵌入） */
export function isEmbeddingConfigured(): boolean {
  return getEffectiveEmbedConfig() !== null;
}

/* ============================ 密钥池（管理员） ============================ */

/** 密钥池对外安全视图（绝不回显明文 apiKey） */
export interface SafeKeyProfile {
  id: string;
  name: string;
  kind: LLMProviderKind;
  baseURL: string;
  model: string;
  embedModel: string;
  maskedApiKey: string;
  active: boolean;
}

function toSafeProfile(p: LLMKeyProfile, activeId: string | null): SafeKeyProfile {
  return {
    id: p.id,
    name: p.name,
    kind: p.kind,
    baseURL: p.baseURL,
    model: p.model,
    embedModel: p.embedModel ?? '',
    maskedApiKey: maskApiKey(p.apiKey),
    active: p.id === activeId,
  };
}

function assertValidKind(kind: unknown): LLMProviderKind {
  const kinds = new Set<LLMProviderKind>(PROVIDER_KINDS.map((k) => k.value));
  if (!kinds.has(kind as LLMProviderKind)) throw new Error(`不支持的协议格式：${String(kind)}`);
  return kind as LLMProviderKind;
}

/** 列出密钥池（含当前生效 id，密钥均掩码） */
export function listKeyProfiles(): { activeId: string | null; profiles: SafeKeyProfile[] } {
  const rt = loadRuntime();
  return {
    activeId: rt.activeId,
    profiles: rt.profiles.map((p) => toSafeProfile(p, rt.activeId)),
  };
}

export interface KeyProfileInput {
  name: string;
  kind: LLMProviderKind;
  baseURL: string;
  apiKey: string;
  model: string;
  embedModel?: string;
}

/** 新增一套密钥（校验非空；返回安全视图） */
export function addKeyProfile(input: KeyProfileInput): SafeKeyProfile {
  const kind = assertValidKind(input.kind);
  const name = input.name.trim();
  const baseURL = input.baseURL.trim();
  const model = input.model.trim();
  const apiKey = input.apiKey.trim();
  if (!name) throw new Error('密钥名称不能为空');
  if (!baseURL) throw new Error('baseURL 不能为空');
  if (!model) throw new Error('模型名不能为空');
  if (!apiKey) throw new Error('API Key 不能为空');
  const rt = loadRuntime();
  const profile: LLMKeyProfile = {
    id: crypto.randomUUID(),
    name,
    kind,
    baseURL,
    apiKey,
    model,
    embedModel: input.embedModel?.trim() || undefined,
  };
  saveRuntime({ ...rt, profiles: [...rt.profiles, profile] });
  return toSafeProfile(profile, rt.activeId);
}

/** 更新一套密钥（apiKey 留空表示沿用现有密钥） */
export function updateKeyProfile(id: string, patch: Partial<KeyProfileInput>): SafeKeyProfile {
  const rt = loadRuntime();
  const idx = rt.profiles.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error(`密钥不存在：${id}`);
  const prev = rt.profiles[idx];
  const next: LLMKeyProfile = {
    ...prev,
    name: patch.name?.trim() || prev.name,
    kind: patch.kind ? assertValidKind(patch.kind) : prev.kind,
    baseURL: patch.baseURL?.trim() || prev.baseURL,
    model: patch.model?.trim() || prev.model,
    embedModel: patch.embedModel !== undefined ? patch.embedModel.trim() || undefined : prev.embedModel,
    apiKey: patch.apiKey?.trim() || prev.apiKey,
  };
  const profiles = [...rt.profiles];
  profiles[idx] = next;
  saveRuntime({ ...rt, profiles });
  return toSafeProfile(next, rt.activeId);
}

/** 删除一套密钥（若为当前生效项则同时取消生效） */
export function removeKeyProfile(id: string): boolean {
  const rt = loadRuntime();
  if (!rt.profiles.some((p) => p.id === id)) return false;
  saveRuntime({
    ...rt,
    profiles: rt.profiles.filter((p) => p.id !== id),
    activeId: rt.activeId === id ? null : rt.activeId,
  });
  return true;
}

/** 设置当前生效密钥（传 null 取消启用，回退 override/env） */
export function setActiveKey(id: string | null): void {
  const rt = loadRuntime();
  if (id !== null && !rt.profiles.some((p) => p.id === id)) {
    throw new Error(`密钥不存在：${id}`);
  }
  saveRuntime({ ...rt, activeId: id });
}

/**
 * RAG 向量检索的纯数学工具（无 I/O、无网络，便于单元测试与覆盖率）。
 *
 * 混合检索打分融合策略（retrieve 调用）：
 *  - 关键词分先按最大值归一到 [0,1]（max=0 时全部为 0）；
 *  - 向量分用余弦相似度并钳制到 [0,1]（嵌入向量夹角通常为非负，负相关记 0）；
 *  - 某块缺向量（未索引 / 嵌入失败）时，该块只按关键词分排序，不因缺向量被惩罚。
 */

/** 钳制到 [0,1]；NaN/Infinity 记 0 */
export function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/**
 * 余弦相似度：∑ab / (‖a‖·‖b‖)。
 * 任一向量为空、维度不一致或零向量返回 0（无法比较，交由关键词兜底）。
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** 按最大值归一到 [0,1]；max<=0 时返回全 0（保持原有相对顺序由稳定排序保证） */
export function normalizeScores(scores: number[]): number[] {
  let max = 0;
  for (const s of scores) if (Number.isFinite(s) && s > max) max = s;
  if (max <= 0) return scores.map(() => 0);
  return scores.map((s) => (Number.isFinite(s) ? s / max : 0));
}

/**
 * 融合关键词分与向量分为统一最终分（逐下标对齐）。
 * @param kwRaw     关键词原始分（可 >1，内部归一）
 * @param vecCos    每块向量余弦分；null 表示该块无向量（跳过向量项）
 * @param weight    向量权重 0..1；若所有 vecCos 均为 null 则自动降为 0（纯关键词）
 * @returns         每块最终分（越大越靠前）
 */
export function hybridScores(
  kwRaw: number[],
  vecCos: Array<number | null>,
  weight: number,
): number[] {
  const hasVector = vecCos.some((v) => v !== null);
  const w = hasVector ? clamp01(weight) : 0;
  const kw = normalizeScores(kwRaw);
  return kwRaw.map((_, i) => {
    const vec = vecCos[i];
    if (vec === null || vec === undefined) return kw[i];
    return (1 - w) * kw[i] + w * clamp01(vec);
  });
}

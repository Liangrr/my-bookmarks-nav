/**
 * 棋类共用的可复现随机数：无 Math.random 依赖，种子随棋局存档一起保存。
 * Web 与小程序共用，保证同一局面 / 同一 AI 难度走法可复现。
 */

/** FNV-1a：把日期字符串等任意文本变成稳定种子（game1024 的 hashSeed 是同一算法） */
export function hashGameSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h | 0) || 1;
}

export type Rng = () => number;

/** xorshift32，返回 [0,1) */
export function createRng(seed: number): Rng {
  let x = (seed | 0) || 0x9e3779b9;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    x = x | 0;
    return (x >>> 0) / 4294967296;
  };
}

/** Fisher-Yates，返回新数组，不改动入参 */
export function shuffle<T>(list: readonly T[], rng: Rng): T[] {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

import { describe, expect, it } from "vitest";
import {
  canMove,
  cloneState,
  createGame,
  emptyCount,
  hashSeed,
  move,
  reviveState,
  scoreSheet,
  WIN_VALUE,
  type GameState,
} from "@shared-lib/game1024";

const Z = [0, 0, 0, 0];

/** 用数字矩阵造局，方便精确断言；id 从 100 递增 */
function fromMatrix(rows: number[][], nextTile: 2 | 4 = 2): GameState {
  const s = createGame(12345);
  let id = 100;
  s.grid = rows.map((row) =>
    row.map((v) => (v ? { id: ++id, value: v } : null)),
  );
  s.score = 0;
  s.best = 0;
  s.moves = 0;
  s.seq = 1000;
  s.rngState = 987654321;
  s.nextTile = nextTile;
  s.maxTile = Math.max(...rows.flat());
  s.won = false;
  s.keepPlaying = false;
  s.over = false;
  s.celebrated = [];
  return s;
}

function vals(s: GameState): number[][] {
  return s.grid.map((row) => row.map((t) => (t ? t.value : 0)));
}

/** 抹掉本次新生成的那一格，便于只断言合并后的布局 */
function withoutSpawn(s: GameState, spawn: { r: number; c: number } | null): number[][] {
  const v = vals(s);
  if (spawn) v[spawn.r][spawn.c] = 0;
  return v;
}

describe("四向移动与合并规则", () => {
  it("左移 2 2 2 2 → 4 4，得分 8，两组连击额外加分", () => {
    const s = fromMatrix([[2, 2, 2, 2], Z, Z, Z]);
    const res = move(s, "left");
    expect(withoutSpawn(s, res.spawn)[0]).toEqual([4, 4, 0, 0]);
    expect(res.mergeCount).toBe(2);
    expect(res.gained).toBe(8);
    expect(res.comboBonus).toBe(2);
    expect(s.score).toBe(10);
    expect(res.mergedIds).toHaveLength(2);
  });

  it("右移 / 上移 / 下移方向正确", () => {
    const right = fromMatrix([[2, 2, 2, 2], Z, Z, Z]);
    expect(withoutSpawn(right, move(right, "right").spawn)[0]).toEqual([0, 0, 4, 4]);

    const col = () => fromMatrix([
      [2, 0, 0, 0], [2, 0, 0, 0], [4, 0, 0, 0], [4, 0, 0, 0],
    ]);
    const up = col();
    expect(withoutSpawn(up, move(up, "up").spawn).map((r) => r[0])).toEqual([4, 8, 0, 0]);
    const down = col();
    expect(withoutSpawn(down, move(down, "down").spawn).map((r) => r[0])).toEqual([0, 0, 4, 8]);
  });

  it("同一步禁止链式合并：4 4 8 0 → 8 8 0 0", () => {
    const s = fromMatrix([[4, 4, 8, 0], Z, Z, Z]);
    const res = move(s, "left");
    expect(withoutSpawn(s, res.spawn)[0]).toEqual([8, 8, 0, 0]);
    expect(res.mergeCount).toBe(1);
    expect(res.gained).toBe(8);
  });

  it("无效移动返回 moved:false，且状态完全不变", () => {
    const s = fromMatrix([
      [2, 4, 8, 16], [4, 8, 16, 2], [8, 16, 2, 4], [16, 2, 4, 8],
    ]);
    const before = JSON.stringify(s);
    const res = move(s, "left");
    expect(res.moved).toBe(false);
    expect(res.paths).toEqual([]);
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe("生成、确定性与存档", () => {
  it("同种子开局一致，同序列操作结果一致", () => {
    const a = createGame(777);
    const b = createGame(777);
    expect(a).toEqual(b);
    const seq = ["left", "up", "right", "down", "left", "up"] as const;
    for (const d of seq) { move(a, d); move(b, d); }
    expect(a).toEqual(b);
  });

  it("不同种子开局不同；50 个种子的初始块只出 2 / 4", () => {
    expect(createGame(1).grid).not.toEqual(createGame(999999).grid);
    for (let i = 1; i <= 50; i++) {
      const s = createGame(i * 7919);
      const all = vals(s).flat().filter(Boolean).concat(s.nextTile);
      expect(all.every((v) => v === 2 || v === 4)).toBe(true);
    }
  });

  it("新块数值等于移动前预览的下一块，且一次移动只多一块", () => {
    const s = fromMatrix([[2, 0, 0, 0], Z, Z, Z], 4);
    const before = emptyCount(s);
    const res = move(s, "right");
    expect(res.moved).toBe(true);
    expect(res.spawn?.value).toBe(4);
    expect(emptyCount(s)).toBe(before - 1);
    expect(s.nextTile === 2 || s.nextTile === 4).toBe(true);
  });

  it("cloneState 是深拷贝；撤销后随机序列与原局一致", () => {
    const s = createGame(424242);
    const snap = cloneState(s);
    s.grid[0][0] = { id: 999, value: 999 };
    s.score = 500;
    s.celebrated.push(64);
    expect(snap.grid[0][0]?.value).not.toBe(999);
    expect(snap.score).toBe(0);
    expect(snap.celebrated).toEqual([]);

    const a = createGame(424242);
    const b = cloneState(a);
    move(a, "left"); move(a, "up");
    move(b, "left"); move(b, "up");
    expect(a).toEqual(b);
  });

  it("reviveState 拒绝坏数据、补齐缺失字段", () => {
    expect(reviveState(null)).toBeNull();
    expect(reviveState({ grid: [[1]] })).toBeNull();
    const s = createGame(1);
    const revived = reviveState(JSON.parse(JSON.stringify(s)));
    expect(revived?.grid).toHaveLength(4);
    expect(revived?.maxTile).toBe(s.maxTile);
  });
});

describe("里程碑、胜负与死局", () => {
  it("首次合成 64 触发里程碑，不重复触发", () => {
    const s = fromMatrix([[32, 32, 0, 0], Z, Z, Z]);
    expect(move(s, "left").milestone).toBe(64);
    const r2 = move(s, "up");
    if (r2.moved) expect(r2.milestone).not.toBe(64);
  });

  it(`合成 ${WIN_VALUE} 通关后锁定，继续挑战后可再动`, () => {
    const s = fromMatrix([[512, 512, 0, 0], Z, Z, Z]);
    const res = move(s, "left");
    expect(res.wonFirst).toBe(true);
    expect(s.won).toBe(true);
    expect(s.over).toBe(false);
    expect(move(s, "right").moved).toBe(false);
    s.keepPlaying = true;
    expect(move(s, "right").moved).toBe(true);
  });

  it("填满最后一格且无可合并对 → over:true", () => {
    const s = fromMatrix([
      [2, 2, 8, 16],
      [8, 16, 2, 4],
      [16, 2, 4, 8],
      [2, 4, 8, 16],
    ]);
    const res = move(s, "left");
    expect(res.moved).toBe(true);
    expect(emptyCount(s)).toBe(0);
    expect(res.over).toBe(true);
    expect(canMove(s)).toBe(false);
  });

  it("canMove：有空格为 true，满格且无相邻同值为 false", () => {
    const s = fromMatrix([
      [2, 4, 8, 16], [4, 8, 16, 2], [8, 16, 2, 4], [16, 2, 4, 0],
    ]);
    expect(canMove(s)).toBe(true);
    s.grid[3][3] = { id: 999, value: 8 };
    expect(canMove(s)).toBe(false);
  });
});

describe("成绩单与种子哈希", () => {
  it("scoreSheet 是 4 行纯文本，含分数与最大块", () => {
    const s = createGame(1);
    s.score = 3284;
    s.maxTile = 256;
    const text = scoreSheet(s, "1024 网页版");
    expect(text).toContain("分数 3284 · 最大 256");
    expect(text.split("\n")).toHaveLength(9); // 标题 + 分数 + 上下框 + 4 行棋盘 + 尾句
    expect(text).toContain("敢不敢来合到 1024？");
  });

  it("hashSeed 稳定且不为 0", () => {
    expect(hashSeed("2026-11-12")).toBe(hashSeed("2026-11-12"));
    expect(hashSeed("2026-11-12")).not.toBe(hashSeed("2026-11-13"));
    expect(hashSeed("")).not.toBe(0);
  });
});

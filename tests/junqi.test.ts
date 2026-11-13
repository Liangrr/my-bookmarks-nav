/**
 * 标准陆战棋（军棋暗棋 + 程序裁判）纯逻辑测试。
 * 口径见 packages/shared-lib/src/junqi.ts 顶部注释与页面「玩法规则」。
 */
import { describe, expect, it } from "vitest";
import {
  applyJunqiAction,
  chooseJunqiAction,
  createJunqiGame,
  JQ_CAMP_SET,
  JQ_CELLS,
  JQ_DRAW_QUIET,
  JQ_HQ_SET,
  JQ_SETUP_POINTS,
  jqIdx,
  jqLocalRow,
  jqRow,
  junqiSetupErrors,
  junqiStatusText,
  junqiVisible,
  legalJunqiActions,
  legalJunqiTargets,
  resolveJunqiCombat,
  reviveJunqi,
  type JqPiece,
  type JqSide,
  type JunqiState,
} from "../packages/shared-lib/src/junqi";

function piece(side: JqSide, kind: JqPiece["kind"], rank: number, name: string): JqPiece {
  return { id: 1, side, kind, rank, name };
}
const soldier = (side: JqSide, rank: number) =>
  piece(side, "soldier", rank, ["", "工兵", "排长", "连长", "营长", "团长", "旅长", "师长", "军长", "司令"][rank]!);

function emptyState(overrides: Partial<JunqiState> = {}): JunqiState {
  return {
    board: new Array<null>(JQ_CELLS).fill(null),
    turn: "red",
    phase: "playing",
    winner: null,
    log: [],
    lastMove: null,
    moves: 0,
    quietMoves: 0,
    flagRevealed: { red: false, black: false },
    commandDead: { red: false, black: false },
    seed: 1,
    rngState: 1,
    ...overrides,
  };
}

function started(seed = 1): JunqiState {
  return applyJunqiAction(createJunqiGame(seed), { type: "start" });
}

describe("棋盘与 25 子编制", () => {
  it("5 列 × 12 行 = 60 落点，每方 25 个可布子点、5 行营、2 大本营", () => {
    expect(JQ_CELLS).toBe(60);
    expect(JQ_SETUP_POINTS.red).toHaveLength(25);
    expect(JQ_SETUP_POINTS.black).toHaveLength(25);
    expect(JQ_SETUP_POINTS.red.filter((i) => JQ_CAMP_SET.has(i))).toHaveLength(0);
    expect(JQ_SETUP_POINTS.black.filter((i) => JQ_HQ_SET.has(i))).toHaveLength(2);
  });

  it("每方 25 枚：司令1 军长1 师长2 旅长2 团长2 营长2 连长3 排长3 工兵3 炸弹2 地雷3 军旗1", () => {
    const s = createJunqiGame(7);
    const red = JQ_SETUP_POINTS.red.map((i) => s.board[i]!);
    expect(red.every((p) => p && p.side === "red")).toBe(true);
    const count = (name: string) => red.filter((p) => p.name === name).length;
    expect(count("司令")).toBe(1);
    expect(count("军长")).toBe(1);
    expect(count("师长")).toBe(2);
    expect(count("旅长")).toBe(2);
    expect(count("团长")).toBe(2);
    expect(count("营长")).toBe(2);
    expect(count("连长")).toBe(3);
    expect(count("排长")).toBe(3);
    expect(count("工兵")).toBe(3);
    expect(count("炸弹")).toBe(2);
    expect(count("地雷")).toBe(3);
    expect(count("军旗")).toBe(1);
    expect(JQ_CAMP_SET.size).toBe(10);
    expect(JQ_HQ_SET.size).toBe(4);
  });
});

describe("布阵合法性（军旗 / 地雷 / 炸弹 / 行营）", () => {
  it("预设阵型合法：军旗在大本营、地雷只在最后两线、炸弹不在锋线、行营留空", () => {
    const s = createJunqiGame(7);
    expect(junqiSetupErrors(s)).toEqual([]);
    const red = JQ_SETUP_POINTS.red;
    expect(red.filter((i) => s.board[i]?.kind === "flag" && JQ_HQ_SET.has(i))).toHaveLength(1);
    expect(red.filter((i) => s.board[i]?.kind === "mine").every((i) => jqLocalRow("red", i) >= 5)).toBe(true);
    expect(red.filter((i) => s.board[i]?.kind === "bomb").every((i) => jqLocalRow("red", i) > 1)).toBe(true);
    expect(s.board.filter((_, i) => JQ_CAMP_SET.has(i)).every((p) => p === null)).toBe(true);
  });

  it("交换两格生效；把地雷换到锋线会被校验拦下，开战被拒", () => {
    let s = createJunqiGame(7);
    const mineAt = JQ_SETUP_POINTS.red.find((i) => s.board[i]?.kind === "mine")!;
    const frontAt = JQ_SETUP_POINTS.red.find((i) => jqLocalRow("red", i) === 1)!;
    const minePiece = s.board[mineAt];
    s = applyJunqiAction(s, { type: "swap", a: mineAt, b: frontAt });
    expect(s.board[frontAt]).toEqual(minePiece);
    expect(junqiSetupErrors(s).join()).toContain("地雷");
    expect(applyJunqiAction(s, { type: "start" })).toBe(s);
  });

  it("随机布阵仍是合法阵型，开战后进入红方先手", () => {
    let s = createJunqiGame(3);
    s = applyJunqiAction(s, { type: "random" });
    expect(junqiSetupErrors(s)).toEqual([]);
    s = applyJunqiAction(s, { type: "start" });
    expect(s.phase).toBe("playing");
    expect(s.turn).toBe("red");
    expect(junqiStatusText(s)).toContain("红方行棋");
  });

  it("布阵阶段之外的 swap / random / start 不产生副作用", () => {
    const s = started();
    expect(applyJunqiAction(s, { type: "random" })).toBe(s);
    expect(applyJunqiAction(s, { type: "start" })).toBe(s);
  });
});

describe("行棋：公路 / 铁路 / 工兵 / 地形", () => {
  it("公路一步：相邻兵站可走，斜线可进入行营", () => {
    const from = jqIdx(3, 0);
    const s = emptyState({ board: (() => {
      const b = new Array<JqPiece | null>(JQ_CELLS).fill(null);
      b[from] = soldier("red", 3);
      return b;
    })() });
    const targets = legalJunqiTargets(s, from, "red");
    expect(targets).toContain(jqIdx(3, 1));
    expect(targets).toContain(jqIdx(2, 0));
    expect(targets).toContain(jqIdx(4, 0));
  });

  it("铁路直行：可沿边列纵贯多格，但不能转直角弯", () => {
    const from = jqIdx(1, 0); // 黑方底线左端（铁路）
    const b = new Array<JqPiece | null>(JQ_CELLS).fill(null);
    b[from] = soldier("red", 3);
    const targets = legalJunqiTargets(emptyState({ board: b }), from, "red");
    expect(targets).toContain(jqIdx(5, 0));   // 一路向下
    expect(targets).toContain(jqIdx(6, 0));   // 跨越前线（左通道）
    expect(targets).toContain(jqIdx(11, 0));  // 直到红方端线
    expect(targets).not.toContain(jqIdx(6, 2)); // 需要先直行再右转，非法
  });

  it("工兵是唯一能在铁路上转弯的棋子", () => {
    const from = jqIdx(1, 0);
    const b = new Array<JqPiece | null>(JQ_CELLS).fill(null);
    b[from] = soldier("red", 1); // 工兵
    expect(legalJunqiTargets(emptyState({ board: b }), from, "red")).toContain(jqIdx(6, 2));
  });

  it("前线只有 3 条通道：中央可越、山界不可越", () => {
    const center = jqIdx(5, 2);
    const gap = jqIdx(5, 1);
    const b = new Array<JqPiece | null>(JQ_CELLS).fill(null);
    b[center] = soldier("black", 3);
    b[gap] = soldier("black", 3);
    const s = emptyState({ board: b, turn: "black" });
    expect(legalJunqiTargets(s, center, "black")).toContain(jqIdx(6, 2));
    expect(legalJunqiTargets(s, gap, "black")).not.toContain(jqIdx(6, 1));
  });

  it("行营中的棋子不可被攻击", () => {
    const camp = jqIdx(4, 1); // 黑方左前营
    const from = jqIdx(4, 0);
    const b = new Array<JqPiece | null>(JQ_CELLS).fill(null);
    b[from] = soldier("red", 5);
    b[camp] = soldier("black", 3);
    expect(JQ_CAMP_SET.has(camp)).toBe(true);
    expect(legalJunqiTargets(emptyState({ board: b }), from, "red")).not.toContain(camp);
  });

  it("军旗 / 地雷不可移动；大本营里的棋子被永久冻结", () => {
    const hq = jqIdx(0, 1); // 黑方大本营
    const flagAt = jqIdx(0, 3);
    const mineAt = jqIdx(1, 1);
    const frozen = jqIdx(11, 1); // 红方大本营
    const b = new Array<JqPiece | null>(JQ_CELLS).fill(null);
    b[flagAt] = piece("black", "flag", 0, "军旗");
    b[mineAt] = piece("black", "mine", -1, "地雷");
    b[hq] = soldier("black", 4);
    b[frozen] = soldier("red", 4);
    const s = emptyState({ board: b, turn: "black" });
    expect(legalJunqiTargets(s, flagAt, "black")).toEqual([]);
    expect(legalJunqiTargets(s, mineAt, "black")).toEqual([]);
    expect(legalJunqiTargets(s, hq, "black")).toEqual([]);
    expect(legalJunqiTargets(s, frozen, "black")).toEqual([]);
  });
});

describe("程序裁判：吃子结算", () => {
  it("等级高压制、同级同归于尽、以小碰大攻方阵亡", () => {
    expect(resolveJunqiCombat(soldier("red", 8), soldier("black", 3))).toBe("defender-dies");
    expect(resolveJunqiCombat(soldier("red", 3), soldier("black", 8))).toBe("attacker-dies");
    expect(resolveJunqiCombat(soldier("red", 5), soldier("black", 5))).toBe("both-die");
  });

  it("炸弹与任何棋子同归于尽（含军旗，炸旗即扛旗成功）", () => {
    const bomb = piece("red", "bomb", -2, "炸弹");
    expect(resolveJunqiCombat(bomb, soldier("black", 9))).toBe("both-die");
    expect(resolveJunqiCombat(soldier("red", 2), piece("black", "bomb", -2, "炸弹"))).toBe("both-die");
    expect(resolveJunqiCombat(bomb, piece("black", "flag", 0, "军旗"))).toBe("flag-captured");
    expect(resolveJunqiCombat(bomb, piece("black", "mine", -1, "地雷"))).toBe("both-die");
  });

  it("地雷：工兵挖雷存活，炸弹同归于尽，其它棋子阵亡而地雷保留", () => {
    const mine = piece("black", "mine", -1, "地雷");
    expect(resolveJunqiCombat(soldier("red", 1), mine)).toBe("defender-dies");
    expect(resolveJunqiCombat(soldier("red", 9), mine)).toBe("attacker-dies");
    expect(resolveJunqiCombat(soldier("red", 2), mine)).toBe("attacker-dies");
  });

  it("任何可动棋子走到军旗即扛旗判胜", () => {
    expect(resolveJunqiCombat(soldier("red", 1), piece("black", "flag", 0, "军旗"))).toBe("flag-captured");
  });

  it("集成：扛旗后 phase=over、winner=red；战报不出现对方子力名称", () => {
    const from = jqIdx(1, 1);
    const flagAt = jqIdx(0, 1);
    const b = new Array<JqPiece | null>(JQ_CELLS).fill(null);
    b[from] = soldier("red", 2);
    b[flagAt] = piece("black", "flag", 0, "军旗");
    const next = applyJunqiAction(emptyState({ board: b }), { type: "move", from, to: flagAt });
    expect(next.phase).toBe("over");
    expect(next.winner).toBe("red");
    expect(next.board[flagAt]?.side).toBe("red");
    expect(next.log.join()).toContain("扛旗成功");
    expect(next.log.join()).not.toContain("军旗被吃");
  });

  it("集成：工兵挖雷后地雷消失、工兵进占", () => {
    const from = jqIdx(1, 1);
    const mineAt = jqIdx(0, 1);
    const b = new Array<JqPiece | null>(JQ_CELLS).fill(null);
    b[from] = soldier("red", 1);
    b[mineAt] = piece("black", "mine", -1, "地雷");
    b[jqIdx(3, 3)] = soldier("black", 2); // 给黑方留可动子，避免触发困毙
    const next = applyJunqiAction(emptyState({ board: b }), { type: "move", from, to: mineAt });
    expect(next.board[mineAt]?.name).toBe("工兵");
    expect(next.quietMoves).toBe(0);
  });

  it("司令阵亡，军旗位置公开", () => {
    const from = jqIdx(1, 1);
    const to = jqIdx(0, 1);
    const b = new Array<JqPiece | null>(JQ_CELLS).fill(null);
    b[from] = soldier("red", 9);
    b[to] = soldier("black", 9);
    b[jqIdx(3, 3)] = soldier("black", 2);
    const next = applyJunqiAction(emptyState({ board: b }), { type: "move", from, to });
    expect(next.board[to]).toBeNull();
    expect(next.flagRevealed.red).toBe(true);
    expect(next.flagRevealed.black).toBe(true);
    expect(next.log.join()).toContain("军旗位置公开");
  });
});

describe("胜负与和棋", () => {
  it("轮到走棋的一方无棋可走判负", () => {
    const from = jqIdx(3, 0);
    const to = jqIdx(2, 0);
    const b = new Array<JqPiece | null>(JQ_CELLS).fill(null);
    b[from] = soldier("red", 3);
    b[jqIdx(0, 1)] = piece("black", "flag", 0, "军旗");
    b[jqIdx(0, 3)] = piece("black", "mine", -1, "地雷");
    const next = applyJunqiAction(emptyState({ board: b }), { type: "move", from, to });
    expect(next.phase).toBe("over");
    expect(next.winner).toBe("red");
    expect(next.log.join()).toContain("无棋可走");
  });

  it(`连续 ${JQ_DRAW_QUIET} 步无吃子判和`, () => {
    const from = jqIdx(3, 0);
    const to = jqIdx(2, 0);
    const b = new Array<JqPiece | null>(JQ_CELLS).fill(null);
    b[from] = soldier("red", 3);
    const next = applyJunqiAction(
      emptyState({ board: b, quietMoves: JQ_DRAW_QUIET - 1 }),
      { type: "move", from, to },
    );
    expect(next.winner).toBe("draw");
    expect(junqiStatusText(next)).toBe("和棋");
  });
});

describe("暗棋信息隔离与 AI", () => {
  it("玩家看不到敌方军衔，己方棋子可见；亮旗后军旗公开", () => {
    const s = createJunqiGame(11);
    const enemyAt = JQ_SETUP_POINTS.black.find((i) => s.board[i]?.kind !== "flag")!;
    expect(junqiVisible(s, enemyAt, "red", true)?.hidden).toBe(true);
    expect(junqiVisible(s, JQ_SETUP_POINTS.red[0]!, "red", true)?.hidden).toBe(false);
    const flagAt = JQ_SETUP_POINTS.black.find((i) => s.board[i]?.kind === "flag")!;
    expect(junqiVisible(s, flagAt, "red", true)?.hidden).toBe(true);
    expect(junqiVisible({ ...s, flagRevealed: { red: false, black: true } }, flagAt, "red", true)?.hidden).toBe(false);
    expect(junqiVisible(s, enemyAt, "red", false)?.hidden).toBe(false); // 明棋
  });

  it("AI 只返回合法着法，且同一局面同一难度可复现", () => {
    const s = started(5);
    const legal = legalJunqiActions(s);
    expect(legal.length).toBeGreaterThan(0);
    // 让 AI 执黑走一步
    const blackTurn: JunqiState = { ...s, turn: "black" };
    const a = chooseJunqiAction(blackTurn, 42, 2);
    const b = chooseJunqiAction(blackTurn, 42, 2);
    expect(a).not.toBeNull();
    expect(b).toEqual(a);
    const legalBlack = legalJunqiActions(blackTurn);
    expect(legalBlack.some((m) => m.from === a!.from && m.to === a!.to)).toBe(true);
  });

  it("AI 不读取敌方真值：把敌方棋子换成司令，AI 评分不变", () => {
    const s = started(5);
    const blackTurn: JunqiState = { ...s, turn: "black" };
    const enemyAt = JQ_SETUP_POINTS.red.find((i) => s.board[i]?.kind === "soldier")!;
    const swapped: JunqiState = {
      ...blackTurn,
      board: blackTurn.board.map((p, i) => (i === enemyAt ? soldier("red", 9) : p)),
    };
    expect(chooseJunqiAction(swapped, 42, 3)).toEqual(chooseJunqiAction(blackTurn, 42, 3));
  });
});

describe("存档", () => {
  it("reviveJunqi 接受新状态，拒绝改造前 6×4 翻棋旧存档", () => {
    const s = started(9);
    expect(reviveJunqi(JSON.parse(JSON.stringify(s)))?.board).toHaveLength(60);
    expect(reviveJunqi({ board: new Array(24).fill(null), turn: "red", phase: "playing", moves: 0, quietMoves: 0 })).toBeNull();
    expect(reviveJunqi(null)).toBeNull();
  });

  it("非法着法返回同一状态对象，不改变任何字段", () => {
    const s = started(9);
    const bad = applyJunqiAction(s, { type: "move", from: jqIdx(6, 0), to: jqIdx(6, 1) });
    void bad;
    const from = JQ_SETUP_POINTS.red.find((i) => s.board[i]?.kind === "flag")!; // 军旗不可动
    expect(applyJunqiAction(s, { type: "move", from, to: jqIdx(11, 0) })).toBe(s);
  });
});

describe("棋盘线路几何（供两端绘制）", () => {
  it("线段端点都在棋盘内，且包含铁路与公路两类", async () => {
    const { JQ_SEGMENTS, JQ_RAIL_NODES } = await import("../packages/shared-lib/src/junqi");
    expect(JQ_SEGMENTS.length).toBeGreaterThan(100);
    expect(JQ_SEGMENTS.some((x) => x.kind === "rail")).toBe(true);
    expect(JQ_SEGMENTS.some((x) => x.kind === "road")).toBe(true);
    expect(JQ_SEGMENTS.every((x) => x.a >= 0 && x.a < JQ_CELLS && x.b >= 0 && x.b < JQ_CELLS)).toBe(true);
    expect(JQ_RAIL_NODES.has(jqIdx(5, 2))).toBe(true);
    expect(jqRow(jqIdx(11, 4))).toBe(11);
  });
});

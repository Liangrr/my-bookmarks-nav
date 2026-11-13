/**
 * 陆战棋「翻翻棋」共享纯逻辑测试。
 * 规则口径见 packages/shared-lib/src/junqi-flip.ts 顶部注释与两端页面「玩法规则」。
 */
import { describe, expect, it } from "vitest";
import {
  applyJunqiFlipAction,
  chooseJunqiFlipAction,
  createJunqiFlipGame,
  JF_DRAW_QUIET,
  JF_MINES,
  JF_SPAWN_POINTS,
  junqiFlipMinesLeft,
  junqiFlipStats,
  junqiFlipStatusText,
  junqiFlipVisible,
  legalJunqiFlipActions,
  legalJunqiFlipTargets,
  otherSeat,
  reviveJunqiFlip,
  type JfAction,
  type JfCell,
  type JfSeat,
  type JunqiFlipState,
} from "../packages/shared-lib/src/junqi-flip";
import {
  JQ_CAMPS,
  JQ_CAMP_SET,
  JQ_CELLS,
  JQ_COLS,
  JQ_HQ_SET,
  jqIdx,
  type JqPiece,
  type JqSide,
} from "../packages/shared-lib/src/junqi";

const RANK_NAMES = ["", "工兵", "排长", "连长", "营长", "团长", "旅长", "师长", "军长", "司令"];
function piece(side: JqSide, kind: JqPiece["kind"], rank: number, name: string, id = rank + 1): JqPiece {
  return { id, side, kind, rank, name };
}
const soldier = (side: JqSide, rank: number, id = rank + 1) =>
  piece(side, "soldier", rank, RANK_NAMES[rank]!, id);
const mine = (side: JqSide, id = 50) => piece(side, "mine", -1, "地雷", id);
const bomb = (side: JqSide, id = 60) => piece(side, "bomb", -2, "炸弹", id);
const flag = (side: JqSide, id = 70) => piece(side, "flag", 0, "军旗", id);

const cell = (p: JqPiece, faceUp = true): JfCell => ({ piece: p, faceUp });
const hidden = (p: JqPiece): JfCell => ({ piece: p, faceUp: false });

function state(overrides: Partial<JunqiFlipState> = {}): JunqiFlipState {
  return {
    v: 1,
    board: new Array<JfCell>(JQ_CELLS).fill(null),
    turn: "player",
    phase: "playing",
    owner: { player: "red", ai: "black" },
    winner: null,
    result: "",
    prevFlipColor: null,
    log: [],
    lastFlip: null,
    lastMove: null,
    moves: 0,
    quietMoves: 0,
    seed: 1,
    ...overrides,
  };
}

function put(s: JunqiFlipState, i: number, c: JfCell): JunqiFlipState {
  const board = s.board.slice();
  board[i] = c;
  return { ...s, board };
}

describe("开局与编制", () => {
  it("50 枚暗子铺满非行营格，行营留空，双方各 25 子且编制正确", () => {
    const s = createJunqiFlipGame(20261113);
    expect(s.phase).toBe("assign");
    expect(s.owner.player).toBeNull();
    expect(s.owner.ai).toBeNull();
    expect(JF_SPAWN_POINTS).toHaveLength(50);
    expect(JQ_CAMPS).toHaveLength(10);
    for (const i of JQ_CAMPS) expect(s.board[i]).toBeNull();
    for (const i of JF_SPAWN_POINTS) {
      expect(s.board[i]).not.toBeNull();
      expect(s.board[i]!.faceUp).toBe(false);
      expect(junqiFlipVisible(s, i)).toEqual({ hidden: true });
    }
    const red = s.board.filter((c) => c?.piece.side === "red") as JfCell[];
    const black = s.board.filter((c) => c?.piece.side === "black") as JfCell[];
    expect(red).toHaveLength(25);
    expect(black).toHaveLength(25);
    expect(red.filter((c) => c!.piece.kind === "mine")).toHaveLength(JF_MINES);
    expect(red.filter((c) => c!.piece.kind === "flag")).toHaveLength(1);
    expect(new Set(s.board.filter(Boolean).map((c) => c!.piece.id)).size).toBe(50);
  });

  it("同一种子生成完全相同的局面，不同种子不同", () => {
    const a = createJunqiFlipGame(7);
    const b = createJunqiFlipGame(7);
    const c = createJunqiFlipGame(8);
    expect(a.board.map((x) => x?.piece.id)).toEqual(b.board.map((x) => x?.piece.id));
    expect(a.board.map((x) => x?.piece.id)).not.toEqual(c.board.map((x) => x?.piece.id));
  });

  it("开棋座位由种子决定，但一定是两个合法座位之一", () => {
    const seats = new Set<JfSeat>();
    for (let n = 1; n <= 20; n++) seats.add(createJunqiFlipGame(n).turn);
    expect([...seats].sort()).toEqual(["ai", "player"]);
    expect(otherSeat("player")).toBe("ai");
    expect(otherSeat("ai")).toBe("player");
  });
});

describe("定色阶段（连续两张同色）", () => {
  const at0 = JF_SPAWN_POINTS[0]!;
  const at1 = JF_SPAWN_POINTS[1]!;
  const at2 = JF_SPAWN_POINTS[2]!;
  const mk = () => {
    let s = state({ phase: "assign", owner: { player: null, ai: null }, turn: "player" });
    s = put(s, at0, hidden(soldier("red", 5)));
    s = put(s, at1, hidden(soldier("black", 3)));
    s = put(s, at2, hidden(soldier("black", 2)));
    return s;
  };

  it("异色不定色，只记录上次翻出的颜色并交换座位", () => {
    const s = mk();
    const s1 = applyJunqiFlipAction(s, { type: "flip", at: at0 });
    expect(s1.phase).toBe("assign");
    expect(s1.prevFlipColor).toBe("red");
    expect(s1.owner.player).toBeNull();
    expect(s1.turn).toBe("ai");
    expect(s1.board[at0]!.faceUp).toBe(true);

    const s2 = applyJunqiFlipAction(s1, { type: "flip", at: at1 });
    expect(s2.phase).toBe("assign");
    expect(s2.prevFlipColor).toBe("black");
    expect(s2.turn).toBe("player");
  });

  it("连续同色完成定色：最后翻子者执该色，对手执另一色", () => {
    let s = mk();
    s = applyJunqiFlipAction(s, { type: "flip", at: at0 }); // 红
    s = applyJunqiFlipAction(s, { type: "flip", at: at1 }); // 黑（异色）
    s = applyJunqiFlipAction(s, { type: "flip", at: at2 }); // 黑（与上一张同色）
    expect(s.phase).toBe("playing");
    expect(s.owner.player).toBe("black");
    expect(s.owner.ai).toBe("red");
    expect(s.prevFlipColor).toBeNull();
    expect(s.log.join(" / ")).toContain("阵营确定");
  });

  it("定色阶段只能翻子，翻已翻开的格子是非法动作", () => {
    const s = mk();
    expect(legalJunqiFlipActions(s).every((a) => a.type === "flip")).toBe(true);
    const s1 = applyJunqiFlipAction(s, { type: "flip", at: at0 });
    expect(applyJunqiFlipAction(s1, { type: "flip", at: at0 })).toBe(s1);
    expect(applyJunqiFlipAction(s, { type: "move", from: at0, to: at1 })).toBe(s);
  });
});

describe("公开信息与暗子隔离", () => {
  it("暗子只暴露背面，明子才暴露颜色与军衔", () => {
    let s = state();
    s = put(s, 0, hidden(soldier("black", 9)));
    s = put(s, 1, cell(soldier("red", 3)));
    expect(junqiFlipVisible(s, 0)).toEqual({ hidden: true });
    expect(junqiFlipVisible(s, 1)).toEqual({ hidden: false, piece: s.board[1]!.piece });
    expect(junqiFlipVisible(s, 2)).toBeNull();
  });

  it("AI 不偷看暗子：公开信息相同、暗子真值不同的两个局面走法完全一致", () => {
    const base = () => {
      let s = state({ turn: "player", phase: "playing" });
      s = put(s, jqIdx(2, 2), cell(soldier("red", 9, 901)));
      s = put(s, jqIdx(3, 2), cell(soldier("black", 2, 902)));
      return s;
    };
    const a = base();
    const b = base();
    const h1 = jqIdx(0, 0), h2 = jqIdx(4, 4);
    const A = put(put(a, h1, hidden(soldier("red", 1, 911))), h2, hidden(soldier("black", 1, 912)));
    const B = put(put(b, h1, hidden(soldier("black", 8, 913))), h2, hidden(soldier("red", 8, 914)));
    for (const level of [1, 2, 3]) {
      for (const seed of [1, 17, 999]) {
        expect(chooseJunqiFlipAction(A, seed, level)).toEqual(chooseJunqiFlipAction(B, seed, level));
      }
    }
  });

  it("AI 只返回合法动作", () => {
    const s = createJunqiFlipGame(31);
    const a = chooseJunqiFlipAction(s, 5, 2);
    expect(a).not.toBeNull();
    expect(legalJunqiFlipActions(s).some((x) => JSON.stringify(x) === JSON.stringify(a))).toBe(true);
  });
});

describe("移动拓扑", () => {
  it("公路一步：非铁路格只能到相邻格", () => {
    const from = jqIdx(2, 2);
    const s = put(state(), from, cell(soldier("red", 9)));
    const t = legalJunqiFlipTargets(s, from);
    expect(t).toContain(jqIdx(1, 2));
    expect(t).toContain(jqIdx(3, 2));
    expect(t).toContain(jqIdx(2, 1));
    expect(t).toContain(jqIdx(2, 3));
    expect(t).not.toContain(jqIdx(2, 4));
  });

  it("铁路直行不可转直角弯，工兵可沿铁路任意转弯", () => {
    const from = jqIdx(1, 1);
    const corner = jqIdx(2, 0);
    const sNormal = put(state(), from, cell(soldier("red", 7)));
    expect(legalJunqiFlipTargets(sNormal, from)).toContain(jqIdx(1, 4));
    expect(legalJunqiFlipTargets(sNormal, from)).not.toContain(corner);
    const sEngineer = put(state(), from, cell(soldier("red", 1)));
    expect(legalJunqiFlipTargets(sEngineer, from)).toContain(corner);
  });

  it("暗子不可攻击也不可越过，会截断铁路直行", () => {
    const from = jqIdx(1, 1);
    let s = put(state(), from, cell(soldier("red", 7)));
    s = put(s, jqIdx(1, 2), hidden(soldier("black", 3)));
    const t = legalJunqiFlipTargets(s, from);
    expect(t).not.toContain(jqIdx(1, 2));
    expect(t).not.toContain(jqIdx(1, 3));
    expect(t).not.toContain(jqIdx(1, 4));
  });

  it("行营是安全区，其中的敌子不可被攻击", () => {
    const camp = JQ_CAMPS.find((i) => i === jqIdx(2, 1))!;
    const from = jqIdx(2, 0);
    let s = put(state(), from, cell(soldier("red", 9)));
    s = put(s, camp, cell(soldier("black", 2)));
    expect(legalJunqiFlipTargets(s, from)).not.toContain(camp);
  });

  it("翻棋里大本营不冻结棋子（与标准暗棋不同）", () => {
    const hq = [...JQ_HQ_SET][0]!;
    const s = put(state(), hq, cell(soldier("red", 6)));
    expect(JQ_HQ_SET.has(hq)).toBe(true);
    expect(legalJunqiFlipTargets(s, hq).length).toBeGreaterThan(0);
  });

  it("军旗与地雷不可移动", () => {
    const a = jqIdx(2, 2), b = jqIdx(2, 3);
    let s = put(state(), a, cell(flag("red")));
    s = put(s, b, cell(mine("red")));
    expect(legalJunqiFlipTargets(s, a)).toEqual([]);
    expect(legalJunqiFlipTargets(s, b)).toEqual([]);
  });
});

describe("裁判战斗结算", () => {
  const from = jqIdx(3, 0);
  const to = jqIdx(4, 0);
  const duel = (attacker: JqPiece, defender: JqPiece) => {
    let s = put(state(), from, cell(attacker));
    s = put(s, to, cell(defender));
    return s;
  };

  it("大吃小：攻方占领；小撞大：攻方阵亡；同级：同归于尽", () => {
    let s = duel(soldier("red", 9), soldier("black", 3));
    s = applyJunqiFlipAction(s, { type: "move", from, to });
    expect(s.board[from]).toBeNull();
    expect(s.board[to]!.piece.rank).toBe(9);
    expect(s.log.join(" ")).toContain("守方阵亡");

    s = duel(soldier("red", 2), soldier("black", 8));
    s = applyJunqiFlipAction(s, { type: "move", from, to });
    expect(s.board[to]!.piece.rank).toBe(8);
    expect(s.log.join(" ")).toContain("攻方阵亡");

    s = duel(soldier("red", 5), soldier("black", 5));
    s = applyJunqiFlipAction(s, { type: "move", from, to });
    expect(s.board[to]).toBeNull();
    expect(s.log.join(" ")).toContain("同归于尽");
  });

  it("炸弹与任何棋子同归于尽（含地雷）", () => {
    let s = duel(bomb("red"), soldier("black", 9));
    s = applyJunqiFlipAction(s, { type: "move", from, to });
    expect(s.board[to]).toBeNull();
    s = duel(bomb("red"), mine("black"));
    s = applyJunqiFlipAction(s, { type: "move", from, to });
    expect(s.board[to]).toBeNull();
  });

  it("工兵挖雷存活，其它棋子撞雷阵亡且地雷保留", () => {
    let s = duel(soldier("red", 1), mine("black"));
    s = applyJunqiFlipAction(s, { type: "move", from, to });
    expect(s.board[to]!.piece.rank).toBe(1);
    expect(junqiFlipMinesLeft(s, "black")).toBe(0);

    s = duel(soldier("red", 9), mine("black"));
    s = applyJunqiFlipAction(s, { type: "move", from, to });
    expect(s.board[to]!.piece.kind).toBe("mine");
    expect(junqiFlipMinesLeft(s, "black")).toBe(1);
  });

  it("对方 3 雷未清时军旗不可碰；清完后任意棋子扛旗即胜", () => {
    let s = put(state(), from, cell(soldier("red", 9)));
    s = put(s, to, cell(flag("black")));
    s = put(s, jqIdx(0, 4), hidden(mine("black", 81)));
    s = put(s, jqIdx(0, 3), hidden(mine("black", 82)));
    s = put(s, jqIdx(0, 2), hidden(mine("black", 83)));
    expect(junqiFlipMinesLeft(s, "black")).toBe(3);
    expect(legalJunqiFlipTargets(s, from)).not.toContain(to);
    expect(applyJunqiFlipAction(s, { type: "move", from, to })).toBe(s);

    let cleared = state();
    cleared = put(cleared, from, cell(soldier("red", 9)));
    cleared = put(cleared, to, cell(flag("black")));
    expect(legalJunqiFlipTargets(cleared, from)).toContain(to);
    const won = applyJunqiFlipAction(cleared, { type: "move", from, to });
    expect(won.phase).toBe("over");
    expect(won.winner).toBe("player");
    expect(won.result).toContain("扛旗");
  });

  it("非法动作原样返回同一引用", () => {
    const s = duel(soldier("red", 9), soldier("black", 3));
    expect(applyJunqiFlipAction(s, { type: "move", from, to: jqIdx(11, 4) })).toBe(s);
    expect(applyJunqiFlipAction(s, { type: "flip", at: jqIdx(0, 0) })).toBe(s);
  });
});

describe("回合与终局", () => {
  it("每回合翻子 / 走子二选一，翻子后明子可被选中", () => {
    const at = jqIdx(0, 0);
    let s = put(state(), at, hidden(soldier("red", 4)));
    s = put(s, jqIdx(11, 2), cell(soldier("black", 2, 990))); // 给对手留一枚可动子，避免立即终局
    const actions = legalJunqiFlipActions(s);
    expect(actions).toContainEqual({ type: "flip", at });
    s = applyJunqiFlipAction(s, { type: "flip", at });
    expect(s.board[at]!.faceUp).toBe(true);
    expect(s.turn).toBe("ai");
    expect(legalJunqiFlipActions(s, "ai").length).toBeGreaterThan(0);
  });

  it("轮到走棋方无任何合法着法判负", () => {
    const from = jqIdx(2, 2), to = jqIdx(1, 2);
    let s = put(state(), from, cell(soldier("red", 9)));
    s = put(s, jqIdx(11, 1), cell(flag("black")));
    s = put(s, jqIdx(11, 3), cell(mine("black", 51)));
    s = put(s, jqIdx(10, 1), cell(mine("black", 52)));
    s = put(s, jqIdx(10, 3), cell(mine("black", 53)));
    const after = applyJunqiFlipAction(s, { type: "move", from, to });
    expect(after.phase).toBe("over");
    expect(after.winner).toBe("player");
    expect(after.result).toContain("无棋可走");
  });

  it(`连续 ${JF_DRAW_QUIET} 步无交战判和`, () => {
    const at = jqIdx(0, 0);
    let s = put(state({ quietMoves: JF_DRAW_QUIET - 1 }), at, hidden(soldier("red", 3)));
    s = applyJunqiFlipAction(s, { type: "flip", at });
    expect(s.phase).toBe("over");
    expect(s.winner).toBe("draw");
    expect(s.result).toContain(String(JF_DRAW_QUIET));
  });

  it("交战会把无交战计数清零，状态文案区分定色 / 行棋 / 终局", () => {
    const from = jqIdx(3, 0), to = jqIdx(4, 0);
    let s = put(state({ quietMoves: 40 }), from, cell(soldier("red", 9)));
    s = put(s, to, cell(soldier("black", 2)));
    s = put(s, jqIdx(11, 2), cell(soldier("black", 3, 991))); // 对手仍有可动子
    s = applyJunqiFlipAction(s, { type: "move", from, to });
    expect(s.quietMoves).toBe(0);
    expect(junqiFlipStatusText(s)).toContain("行棋");
    expect(junqiFlipStatusText(createJunqiFlipGame(3))).toContain("定色阶段");
    expect(junqiFlipStatusText({ ...s, phase: "over", winner: "draw", result: "和棋" })).toContain("和棋");
  });

  it("统计：暗子数 / 明子数 / 双方剩余地雷", () => {
    let s = state();
    s = put(s, 0, hidden(soldier("red", 3)));
    s = put(s, 1, cell(soldier("red", 9)));
    s = put(s, 2, cell(mine("black", 51)));
    s = put(s, 3, cell(mine("black", 52)));
    expect(junqiFlipStats(s)).toEqual({ hidden: 1, red: 1, black: 2, redMines: 0, blackMines: 2 });
  });
});

describe("整局可玩性", () => {
  it("AI 自我对弈能在有限步内终局，全程动作合法且暗子数单调不增", () => {
    const outcomes: string[] = [];
    for (const seed of [1, 2, 3, 4, 5, 17, 99]) {
      let s = createJunqiFlipGame(seed);
      let prevHidden = junqiFlipStats(s).hidden;
      let steps = 0;
      while (s.phase !== "over" && steps < 500) {
        const a = chooseJunqiFlipAction(s, seed * 1000 + steps, 2);
        expect(a).not.toBeNull();
        const next = applyJunqiFlipAction(s, a!);
        expect(next).not.toBe(s); // 每步都必须真的推进
        s = next;
        const hidden = junqiFlipStats(s).hidden;
        expect(hidden).toBeLessThanOrEqual(prevHidden);
        prevHidden = hidden;
        steps++;
        expect(reviveJunqiFlip(JSON.parse(JSON.stringify(s)))).not.toBeNull();
      }
      expect(s.phase).toBe("over");
      expect(s.winner === "draw" || s.winner === "player" || s.winner === "ai").toBe(true);
      outcomes.push(`${seed}:${s.winner}/${s.result}/${steps}步`);
    }
    console.log("  自我对弈结果:", outcomes.join(" | "));
  });
});

describe("存档反序列化", () => {
  it("合法局面可完整往返", () => {
    const s = createJunqiFlipGame(55);
    const revived = reviveJunqiFlip(JSON.parse(JSON.stringify(s)));
    expect(revived).toEqual(s);
  });

  it("拒绝旧格式 / 脏数据 / 非法 owner", () => {
    const s = createJunqiFlipGame(9);
    expect(reviveJunqiFlip(null)).toBeNull();
    expect(reviveJunqiFlip({})).toBeNull();
    expect(reviveJunqiFlip({ ...s, v: 0 })).toBeNull();
    expect(reviveJunqiFlip({ ...s, board: s.board.slice(1) })).toBeNull();
    expect(reviveJunqiFlip({ ...s, turn: "nobody" })).toBeNull();
    expect(reviveJunqiFlip({ ...s, phase: "setup" })).toBeNull();
    expect(reviveJunqiFlip({ ...s, owner: { player: "red", ai: "red" } })).toBeNull();
    expect(reviveJunqiFlip({ ...s, phase: "assign", owner: { player: "red", ai: null } })).toBeNull();
    expect(reviveJunqiFlip({ ...s, winner: "nobody" })).toBeNull();
    expect(reviveJunqiFlip({ ...s, log: "oops" })).toBeNull();
    const badPiece = JSON.parse(JSON.stringify(s));
    badPiece.board[JF_SPAWN_POINTS[0]!].piece.kind = "wizard";
    expect(reviveJunqiFlip(badPiece)).toBeNull();
    const dupId = JSON.parse(JSON.stringify(s));
    dupId.board[JF_SPAWN_POINTS[1]!].piece.id = dupId.board[JF_SPAWN_POINTS[0]!].piece.id;
    expect(reviveJunqiFlip(dupId)).toBeNull();
  });

  it("终局局面可存档并拒绝继续落子", () => {
    let s = createJunqiFlipGame(2);
    s = { ...s, phase: "over", winner: "player", result: "扛旗成功" };
    expect(reviveJunqiFlip(JSON.parse(JSON.stringify(s)))).not.toBeNull();
    const action: JfAction = { type: "flip", at: JF_SPAWN_POINTS[0]! };
    expect(applyJunqiFlipAction(s, action)).toBe(s);
  });
});

describe("棋盘常量一致性", () => {
  it("5×12 共 60 格，10 个行营，50 个铺子点", () => {
    expect(JQ_COLS).toBe(5);
    expect(JQ_CELLS).toBe(60);
    expect(JQ_CAMPS).toHaveLength(10);
    expect(JF_SPAWN_POINTS).toHaveLength(50);
    for (const i of JQ_CAMPS) expect(JQ_CAMP_SET.has(i)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  applyXiangqiMove,
  at,
  chooseXiangqiMove,
  createXiangqiGame,
  findKing,
  isInCheck,
  legalMovesFor,
  moveNotation,
  pseudoMoves,
  reviveXiangqi,
  xiangqiStatusText,
  XQ_COLS,
  XQ_ROWS,
  type PieceType,
  type XiangqiBoard,
  type XiangqiSide,
  type XiangqiState,
} from "@shared-lib/xiangqi";

function empty(): XiangqiBoard {
  return new Array(XQ_ROWS * XQ_COLS).fill(null);
}
let seq = 0;
function put(b: XiangqiBoard, r: number, c: number, side: XiangqiSide, type: PieceType) {
  b[at(r, c)] = { id: ++seq, side, type };
}
function stateOf(board: XiangqiBoard, turn: XiangqiSide = "red"): XiangqiState {
  return { ...createXiangqiGame(7), board, turn, status: "playing", check: false };
}

describe("中国象棋 · 初始局面", () => {
  it("10×9 棋盘共 32 子，红黑各 16，红先", () => {
    const s = createXiangqiGame();
    expect(s.board).toHaveLength(90);
    expect(s.board.filter(Boolean)).toHaveLength(32);
    expect(s.board.filter((p) => p?.side === "red")).toHaveLength(16);
    expect(s.board.filter((p) => p?.side === "black")).toHaveLength(16);
    expect(s.turn).toBe("red");
    expect(s.status).toBe("playing");
    expect(findKing(s.board, "red")).toBe(at(9, 4));
    expect(findKing(s.board, "black")).toBe(at(0, 4));
  });

  it("开局有足够多的合法着法，且不含非法越界", () => {
    const s = createXiangqiGame();
    const moves = legalMovesFor(s.board, "red");
    expect(moves.length).toBeGreaterThan(30);
    expect(moves.every((m) => m.from >= 0 && m.to >= 0 && m.to < 90)).toBe(true);
  });

  it("经典开局「炮二平五」记谱正确且棋盘不可变", () => {
    const s = createXiangqiGame();
    const m = { from: at(7, 7), to: at(7, 4) };
    expect(moveNotation(s.board, m)).toBe("炮二平五");
    expect(legalMovesFor(s.board, "red").some((x) => x.from === m.from && x.to === m.to)).toBe(true);
    const next = applyXiangqiMove(s, m);
    expect(next.notes[0]).toBe("炮二平五");
    expect(next.turn).toBe("black");
    expect(next.board[at(7, 4)]?.type).toBe("C");
    expect(s.board[at(7, 7)]?.type).toBe("C"); // 原状态未被改动
    expect(s.history).toHaveLength(0);
  });

  it("黑方记谱用自己的列号体系，如「炮８平５」用中文数字", () => {
    const b = empty();
    put(b, 2, 1, "black", "C");
    put(b, 0, 4, "black", "K");
    put(b, 9, 4, "red", "K");
    expect(moveNotation(b, { from: at(2, 1), to: at(2, 4) })).toBe("炮二平五");
  });
});

describe("中国象棋 · 各兵种走法", () => {
  it("炮：空格可走、必须隔一个炮架才能吃子", () => {
    const b = empty();
    put(b, 7, 1, "red", "C");
    put(b, 5, 1, "red", "P"); // 炮架
    put(b, 2, 1, "black", "P");
    const moves = pseudoMoves(b, at(7, 1));
    expect(moves).toContain(at(6, 1));
    expect(moves).toContain(at(2, 1));
    expect(moves).not.toContain(at(5, 1));
    expect(moves).not.toContain(at(4, 1)); // 越架后的空格不可走
    expect(moves).not.toContain(at(1, 1)); // 吃掉第一个敌子后不再继续
  });

  it("车：遇己方子停，可吃第一个敌子", () => {
    const b = empty();
    put(b, 9, 0, "red", "R");
    put(b, 7, 0, "red", "P");
    put(b, 4, 0, "black", "P");
    const moves = pseudoMoves(b, at(9, 0));
    expect(moves).toContain(at(8, 0));
    expect(moves).not.toContain(at(7, 0));
    expect(moves).not.toContain(at(4, 0));
  });

  it("马：蹩马腿时两个目标被挡，其它方向仍可走", () => {
    const b = empty();
    put(b, 5, 4, "red", "N");
    put(b, 4, 4, "black", "P"); // (4,4) 是向上两格的马腿
    const moves = pseudoMoves(b, at(5, 4));
    expect(moves).not.toContain(at(3, 3));
    expect(moves).not.toContain(at(3, 5));
    expect(moves).toContain(at(4, 2));
    expect(moves).toContain(at(7, 3));
  });

  it("相：塞象眼被挡，且不能过河", () => {
    const b = empty();
    put(b, 9, 2, "red", "B");
    put(b, 8, 3, "black", "P"); // (7,4) 的象眼
    const moves = pseudoMoves(b, at(9, 2));
    expect(moves).toContain(at(7, 0));
    expect(moves).not.toContain(at(7, 4));
    const b2 = empty();
    put(b2, 5, 2, "red", "B"); // 已在河边，再向上就过河
    expect(pseudoMoves(b2, at(5, 2))).not.toContain(at(3, 0));
  });

  it("兵：未过河只能前进，过河后可横走但不可后退", () => {
    const b = empty();
    put(b, 6, 0, "red", "P");
    expect(pseudoMoves(b, at(6, 0))).toEqual([at(5, 0)]);
    const b2 = empty();
    put(b2, 4, 0, "red", "P");
    const moves = pseudoMoves(b2, at(4, 0));
    expect(moves).toContain(at(3, 0));
    expect(moves).toContain(at(4, 1));
    expect(moves).not.toContain(at(5, 0));
  });

  it("将帅照面互相视为将军，且可直接飞将", () => {
    const b = empty();
    put(b, 9, 4, "red", "K");
    put(b, 0, 4, "black", "K");
    expect(isInCheck(b, "red")).toBe(true);
    expect(isInCheck(b, "black")).toBe(true);
    expect(pseudoMoves(b, at(9, 4))).toContain(at(0, 4));
    b[at(5, 4)] = { id: 999, side: "red", type: "P" };
    expect(isInCheck(b, "red")).toBe(false);
  });

  it("被将军时只允许应将，己方其它子不能乱走", () => {
    const b = empty();
    put(b, 9, 4, "red", "K");
    put(b, 0, 3, "black", "K");
    put(b, 8, 4, "black", "R"); // 直接威胁红帅
    put(b, 9, 0, "red", "R");
    const moves = legalMovesFor(b, "red");
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.every((m) => m.from === at(9, 4))).toBe(true);
    expect(isInCheck(b, "red")).toBe(true);
  });
});

describe("中国象棋 · 落子、胜负与 AI", () => {
  it("吃子会记入 captured 并重置无吃子计数", () => {
    const b = empty();
    put(b, 9, 4, "red", "K");
    put(b, 0, 3, "black", "K"); // 不同列，避免将帅照面让这步棋变成非法
    put(b, 7, 0, "red", "R");
    put(b, 4, 0, "black", "P");
    const s = { ...stateOf(b), quietMoves: 9 };
    const next = applyXiangqiMove(s, { from: at(7, 0), to: at(4, 0) });
    expect(next.captured.red).toContain("P");
    expect(next.quietMoves).toBe(0);
    expect(next.board[at(4, 0)]?.type).toBe("R");
  });

  it("非法着法原样返回，不改变状态", () => {
    const s = createXiangqiGame();
    const illegal = applyXiangqiMove(s, { from: at(7, 7), to: at(2, 7) });
    expect(illegal).toBe(s);
  });

  it("将死局面：黑方无合法着法，红方走完即判红胜", () => {
    const b = empty();
    put(b, 0, 4, "black", "K");
    put(b, 9, 3, "red", "K");
    put(b, 2, 8, "red", "R");
    put(b, 1, 3, "red", "R");
    const dead = empty();
    for (let i = 0; i < 90; i++) dead[i] = b[i];
    dead[at(0, 8)] = dead[at(2, 8)];
    dead[at(2, 8)] = null;
    expect(isInCheck(dead, "black")).toBe(true);
    expect(legalMovesFor(dead, "black")).toHaveLength(0);

    const s = stateOf(b);
    const finished = applyXiangqiMove(s, { from: at(2, 8), to: at(0, 8) });
    expect(finished.status).toBe("red");
    expect(xiangqiStatusText(finished)).toContain("红方胜");
  });

  it("AI 只返回合法着法，且能抓住吃将机会", () => {
    const opening = createXiangqiGame();
    const m = chooseXiangqiMove(opening, 1, 42);
    expect(m).not.toBeNull();
    expect(legalMovesFor(opening.board, "red").some((x) => x.from === m!.from && x.to === m!.to)).toBe(true);

    const b = empty();
    put(b, 0, 4, "black", "K");
    put(b, 9, 4, "red", "K");
    put(b, 0, 0, "red", "R");
    const s = stateOf(b);
    expect(chooseXiangqiMove(s, 1, 1)?.to).toBe(at(0, 4));
  });

  it("AI 难度 2/3 也能在合理节点内返回着法", () => {
    const s = createXiangqiGame();
    for (const level of [2, 3]) {
      const m = chooseXiangqiMove(s, level, 9);
      expect(m).not.toBeNull();
      expect(legalMovesFor(s.board, "red").some((x) => x.from === m!.from && x.to === m!.to)).toBe(true);
    }
  });

  it("读档校验：坏结构返回 null，合法存档可往返", () => {
    expect(reviveXiangqi(null)).toBeNull();
    expect(reviveXiangqi({ board: [] })).toBeNull();
    expect(reviveXiangqi({ board: new Array(90).fill({ id: 1, side: "green", type: "R" }) })).toBeNull();
    const s = applyXiangqiMove(createXiangqiGame(), { from: at(7, 7), to: at(7, 4) });
    const revived = reviveXiangqi(JSON.parse(JSON.stringify(s)));
    expect(revived?.turn).toBe("black");
    expect(revived?.notes[0]).toBe("炮二平五");
  });
});

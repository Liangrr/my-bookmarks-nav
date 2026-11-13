import { describe, expect, it } from "vitest";
import {
  applyGomokuMove,
  chooseGomokuMove,
  createGomokuGame,
  gomokuStatusText,
  GOMOKU_CELLS,
  GOMOKU_SIZE,
  reviveGomoku,
  winningLine,
  type GomokuState,
  type Stone,
} from "@shared-lib/gomoku";

const at = (r: number, c: number) => r * GOMOKU_SIZE + c;

function stateWith(stones: Array<[number, Stone]>, turn: 1 | 2 = 1): GomokuState {
  const board = new Array<Stone>(GOMOKU_CELLS).fill(0);
  for (const [i, v] of stones) board[i] = v;
  return { ...createGomokuGame(3), board, turn, status: "playing" };
}

describe("五子棋 · 局面与胜负", () => {
  it("初始 15×15 全空、黑先", () => {
    const s = createGomokuGame();
    expect(s.board).toHaveLength(225);
    expect(s.board.every((v) => v === 0)).toBe(true);
    expect(s.turn).toBe(1);
    expect(s.status).toBe("playing");
  });

  it("落子后交换行棋方、记录手数，非法落子原样返回", () => {
    const s = createGomokuGame();
    const moved = applyGomokuMove(s, at(7, 7));
    expect(moved.board[at(7, 7)]).toBe(1);
    expect(moved.turn).toBe(2);
    expect(moved.history).toEqual([at(7, 7)]);
    expect(s.board[at(7, 7)]).toBe(0); // 不可变
    expect(applyGomokuMove(moved, at(7, 7))).toBe(moved); // 已占用
    expect(applyGomokuMove(moved, -1)).toBe(moved); // 越界
  });

  it("横向五连判胜并返回完整连线", () => {
    // 四连由黑方持有，轮到黑落第五子
    const s = stateWith([[0, 1], [1, 1], [2, 1], [3, 1]], 1);
    const win = applyGomokuMove(s, 4);
    expect(win.status).toBe("black");
    expect(win.winnerLine).toHaveLength(5);
    expect(win.winnerLine).toContain(4);
    expect(gomokuStatusText(win)).toContain("黑方五连胜");
    expect(applyGomokuMove(win, 20)).toBe(win); // 终局后不再落子
  });

  it("斜向五连也能判胜", () => {
    const diag = [0, 1, 2, 3].map((n) => at(n, n));
    const board = new Array<Stone>(GOMOKU_CELLS).fill(0);
    for (const i of diag) board[i] = 1;
    expect(winningLine(board, at(0, 0), 1)).toBeNull(); // 四连还不算胜
    board[at(4, 4)] = 1;
    expect(winningLine(board, at(4, 4), 1)).toHaveLength(5);
  });

  it("棋盘下满且无五连判和", () => {
    // (r + 2c) % 4 的花色在四个方向上最长连子都不超过 2
    const board = new Array<Stone>(GOMOKU_CELLS).fill(0);
    for (let r = 0; r < GOMOKU_SIZE; r++) {
      for (let c = 0; c < GOMOKU_SIZE; c++) {
        if (r === 0 && c === 0) continue;
        board[at(r, c)] = ((r + 2 * c) % 4 < 2 ? 1 : 2) as Stone;
      }
    }
    const s: GomokuState = { ...createGomokuGame(), board, turn: 1, status: "playing" };
    const last = applyGomokuMove(s, 0);
    expect(last.status).toBe("draw");
    expect(last.winnerLine).toHaveLength(0);
  });
});

describe("五子棋 · AI 与存档", () => {
  it("空盘 AI 下天元，且落点合法", () => {
    const s = createGomokuGame();
    expect(chooseGomokuMove(s, 1, 5)).toBe(at(7, 7));
    const m = chooseGomokuMove(s, 2, 5);
    expect(m).not.toBeNull();
    expect(s.board[m!]).toBe(0);
  });

  it("自己能成五时优先成五", () => {
    const s = stateWith([[0, 2], [1, 2], [2, 2], [3, 2], [at(7, 7), 1]], 2);
    expect(chooseGomokuMove(s, 1, 1)).toBe(4);
  });

  it("对手活四时会主动堵截", () => {
    const s = stateWith([[0, 1], [1, 1], [2, 1], [3, 1], [at(7, 7), 2]], 2);
    expect(chooseGomokuMove(s, 2, 1)).toBe(4); // 左端越界，唯一堵点是 (0,4)
  });

  it("读档校验：坏结构返回 null，合法存档可往返", () => {
    expect(reviveGomoku(null)).toBeNull();
    expect(reviveGomoku({ board: [0, 1] })).toBeNull();
    expect(reviveGomoku({ board: new Array(225).fill(9) })).toBeNull();
    const s = applyGomokuMove(createGomokuGame(), at(3, 3));
    expect(reviveGomoku(JSON.parse(JSON.stringify(s)))?.turn).toBe(2);
  });
});

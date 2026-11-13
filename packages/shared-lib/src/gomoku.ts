/**
 * 五子棋（15×15，自由规则无禁手）：连五判定 + 启发式 AI。
 * 纯函数、无 DOM / 无框架依赖，Web 与小程序共用。
 *
 * 棋盘为长度 225 的一维数组，0 空 / 1 黑 / 2 白，黑先。
 * AI 用「四方向连子 + 两端开放度」评分，默认档会对 Top 候选做一层对手反制，
 * 因此会主动堵活三、抢活四，但计算量恒定，小程序也不会卡顿。
 */
import { createRng } from "./game-rng";

export const GOMOKU_SIZE = 15;
export const GOMOKU_CELLS = GOMOKU_SIZE * GOMOKU_SIZE;

export type Stone = 0 | 1 | 2; // 0 空 1 黑 2 白
export type GomokuStatus = "playing" | "black" | "white" | "draw";

export type GomokuState = {
  board: Stone[];
  turn: 1 | 2;
  status: GomokuStatus;
  winnerLine: number[];
  last: number | null;
  history: number[];
  seed: number;
};

export const otherStone = (s: 1 | 2): 1 | 2 => (s === 1 ? 2 : 1);
export const gRow = (i: number) => Math.floor(i / GOMOKU_SIZE);
export const gCol = (i: number) => i % GOMOKU_SIZE;
export const stoneName = (s: Stone) => (s === 1 ? "黑" : s === 2 ? "白" : "");

export function createGomokuGame(seed = 1): GomokuState {
  return {
    board: new Array<Stone>(GOMOKU_CELLS).fill(0),
    turn: 1,
    status: "playing",
    winnerLine: [],
    last: null,
    history: [],
    seed: seed | 0,
  };
}

export function reviveGomoku(raw: unknown): GomokuState | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<GomokuState>;
  if (!Array.isArray(s.board) || s.board.length !== GOMOKU_CELLS) return null;
  if (!s.board.every((v) => v === 0 || v === 1 || v === 2)) return null;
  const status: GomokuStatus =
    s.status === "black" || s.status === "white" || s.status === "draw" ? s.status : "playing";
  return {
    board: s.board.slice() as Stone[],
    turn: s.turn === 2 ? 2 : 1,
    status,
    winnerLine: Array.isArray(s.winnerLine) ? s.winnerLine.slice() : [],
    last: typeof s.last === "number" ? s.last : null,
    history: Array.isArray(s.history) ? s.history.slice() : [],
    seed: typeof s.seed === "number" ? s.seed : 1,
  };
}

const DIRS: ReadonlyArray<readonly [number, number]> = [[1, 0], [0, 1], [1, 1], [1, -1]];

function step(i: number, dr: number, dc: number, n: number): number {
  const r = gRow(i) + dr * n;
  const c = gCol(i) + dc * n;
  if (r < 0 || r >= GOMOKU_SIZE || c < 0 || c >= GOMOKU_SIZE) return -1;
  return r * GOMOKU_SIZE + c;
}

/** 落在 idx 后是否成五，返回整条连线（可能长于 5） */
export function winningLine(board: Stone[], idx: number, stone: Stone): number[] | null {
  if (board[idx] !== stone) return null;
  for (const [dr, dc] of DIRS) {
    const line = [idx];
    for (let n = 1; n < GOMOKU_SIZE; n++) {
      const j = step(idx, dr, dc, n);
      if (j < 0 || board[j] !== stone) break;
      line.push(j);
    }
    for (let n = 1; n < GOMOKU_SIZE; n++) {
      const j = step(idx, dr, dc, -n);
      if (j < 0 || board[j] !== stone) break;
      line.unshift(j);
    }
    if (line.length >= 5) return line;
  }
  return null;
}

export function applyGomokuMove(s: GomokuState, idx: number): GomokuState {
  if (s.status !== "playing" || idx < 0 || idx >= GOMOKU_CELLS || s.board[idx] !== 0) return s;
  const board = s.board.slice();
  const stone = s.turn;
  board[idx] = stone;
  const line = winningLine(board, idx, stone) ?? [];
  const full = board.every((v) => v !== 0);
  return {
    board,
    turn: otherStone(stone),
    status: line.length ? (stone === 1 ? "black" : "white") : full ? "draw" : "playing",
    winnerLine: line,
    last: idx,
    history: s.history.concat([idx]),
    seed: s.seed,
  };
}

export function gomokuStatusText(s: GomokuState): string {
  if (s.status === "draw") return "和棋 · 棋盘已满";
  if (s.status !== "playing") return `${s.status === "black" ? "黑" : "白"}方五连胜`;
  return `${s.turn === 1 ? "黑" : "白"}方落子 · 第 ${s.history.length + 1} 手`;
}

function lineScore(count: number, open: number): number {
  if (count >= 5) return 10_000_000;
  if (open === 0) return 0;
  if (count === 4) return open === 2 ? 1_000_000 : 100_000;
  if (count === 3) return open === 2 ? 50_000 : 5_000;
  if (count === 2) return open === 2 ? 500 : 50;
  return open === 2 ? 10 : 1;
}

/** 假设在 idx 落 stone，评估该点的进攻价值 */
function pointScore(board: Stone[], idx: number, stone: Stone): number {
  if (board[idx] !== 0) return -1;
  const b = board.slice();
  b[idx] = stone;
  let total = 0;
  let best = 0;
  for (const [dr, dc] of DIRS) {
    let count = 1;
    let f = 1;
    while (f < GOMOKU_SIZE) {
      const j = step(idx, dr, dc, f);
      if (j < 0 || b[j] !== stone) break;
      count++;
      f++;
    }
    const frontPos = step(idx, dr, dc, f);
    const frontOpen = frontPos >= 0 && b[frontPos] === 0;
    let bk = 1;
    while (bk < GOMOKU_SIZE) {
      const j = step(idx, dr, dc, -bk);
      if (j < 0 || b[j] !== stone) break;
      count++;
      bk++;
    }
    const backPos = step(idx, dr, dc, -bk);
    const backOpen = backPos >= 0 && b[backPos] === 0;
    const open = (frontOpen ? 1 : 0) + (backOpen ? 1 : 0);
    const sc = lineScore(count, open);
    total += sc;
    if (sc > best) best = sc;
  }
  // 同时形成两个活三 / 冲四活三这类组合，额外加权
  if (best >= 50_000 && total >= 100_000) total += 200_000;
  return total;
}

/** 候选点：已有棋子半径 2 内的空格（空盘返回天元） */
function candidateCells(board: Stone[]): number[] {
  let stones = 0;
  const seen = new Set<number>();
  for (let i = 0; i < board.length; i++) {
    if (board[i] === 0) continue;
    stones++;
    const r = gRow(i);
    const c = gCol(i);
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || rr >= GOMOKU_SIZE || cc < 0 || cc >= GOMOKU_SIZE) continue;
        const j = rr * GOMOKU_SIZE + cc;
        if (board[j] === 0) seen.add(j);
      }
    }
  }
  if (!stones) return [Math.floor(GOMOKU_SIZE / 2) * GOMOKU_SIZE + Math.floor(GOMOKU_SIZE / 2)];
  return Array.from(seen);
}

/** level 1 直接启发式 / 2 对 Top 候选做一层对手反制（默认） */
export function chooseGomokuMove(s: GomokuState, level = 2, seed = 1): number | null {
  if (s.status !== "playing") return null;
  const cells = candidateCells(s.board);
  if (!cells.length) return null;
  const rng = createRng(seed);
  const me = s.turn;
  const opp = otherStone(me);

  const ranked = cells
    .map((i) => ({ i, score: pointScore(s.board, i, me) + pointScore(s.board, i, opp) * 0.85 }))
    .sort((a, b) => b.score - a.score);

  if (level <= 1) return ranked[0]!.i;

  const pool = ranked.slice(0, 6);
  let best = -Infinity;
  let picks: number[] = [];
  for (const c of pool) {
    const b = s.board.slice();
    b[c.i] = me;
    // 对手在自己上也用同一套评分，取它最想下的一点作为反制力度
    let oppBest = 0;
    for (const j of candidateCells(b)) {
      const sc = pointScore(b, j, opp) + pointScore(b, j, me) * 0.5;
      if (sc > oppBest) oppBest = sc;
    }
    const v = c.score - oppBest * 0.55;
    if (v > best + 1) { best = v; picks = [c.i]; }
    else if (v >= best - 1) picks.push(c.i);
  }
  return picks[Math.floor(rng() * picks.length)] ?? pool[0]!.i;
}

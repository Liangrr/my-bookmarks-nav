/**
 * 中国象棋：完整走子规则 + 将军/将死判定 + 中文棋谱 + Alpha-Beta AI。
 * 纯函数、无 DOM / 无框架依赖，Web 与小程序共用。
 *
 * 棋盘用长度 90 的一维数组，index = row * 9 + col；row 0 在上方（黑方底线），
 * row 9 在下方（红方底线），红先。所有状态都是可 JSON 序列化的普通对象。
 *
 * 规则覆盖：车直线、马蹩腿、象塞眼且不过河、士/将九宫、炮隔子吃、
 * 兵过河可横走、将帅照面（飞将）、走后不得自将被将、将死与困毙判负、
 * 连续 120 回合无吃子判和。AI 用 negamax + alpha-beta + 吃子优先排序。
 */
import { createRng } from "./game-rng";

export const XQ_ROWS = 10;
export const XQ_COLS = 9;

export type XiangqiSide = "red" | "black";
/** K 将/帅 A 士/仕 B 象/相 N 马 R 车 C 炮 P 卒/兵 */
export type PieceType = "K" | "A" | "B" | "N" | "R" | "C" | "P";
export type XiangqiPiece = { id: number; side: XiangqiSide; type: PieceType };
export type XiangqiBoard = (XiangqiPiece | null)[];
export type XiangqiMove = { from: number; to: number };
/** playing | 红胜 | 黑胜 | 和棋 */
export type XiangqiStatus = "playing" | "red" | "black" | "draw";

export type XiangqiState = {
  board: XiangqiBoard;
  turn: XiangqiSide;
  status: XiangqiStatus;
  /** 当前行棋方是否被将军 */
  check: boolean;
  lastMove: XiangqiMove | null;
  history: XiangqiMove[];
  /** 中文棋谱（简化记法，与 history 一一对应） */
  notes: string[];
  captured: { red: PieceType[]; black: PieceType[] };
  quietMoves: number;
  seed: number;
};

const MATE = 1_000_000;
const VALUE: Record<PieceType, number> = {
  K: 100_000, R: 900, C: 450, N: 400, B: 210, A: 200, P: 100,
};
const CN = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const RED_NAME: Record<PieceType, string> = { K: "帅", A: "仕", B: "相", N: "马", R: "车", C: "炮", P: "兵" };
const BLACK_NAME: Record<PieceType, string> = { K: "将", A: "士", B: "象", N: "马", R: "车", C: "炮", P: "卒" };

export const at = (r: number, c: number) => r * XQ_COLS + c;
export const rowOf = (i: number) => Math.floor(i / XQ_COLS);
export const colOf = (i: number) => i % XQ_COLS;
export const otherSide = (s: XiangqiSide): XiangqiSide => (s === "red" ? "black" : "red");
export const pieceName = (p: XiangqiPiece): string =>
  p.side === "red" ? RED_NAME[p.type] : BLACK_NAME[p.type];

function inBoard(r: number, c: number): boolean {
  return r >= 0 && r < XQ_ROWS && c >= 0 && c < XQ_COLS;
}
function inPalace(side: XiangqiSide, r: number, c: number): boolean {
  return c >= 3 && c <= 5 && (side === "red" ? r >= 7 && r <= 9 : r >= 0 && r <= 2);
}
export function cloneBoard(b: XiangqiBoard): XiangqiBoard {
  return b.map((p) => (p ? { id: p.id, side: p.side, type: p.type } : null));
}

function initialBoard(): XiangqiBoard {
  const b: XiangqiBoard = new Array(XQ_ROWS * XQ_COLS).fill(null);
  const back: PieceType[] = ["R", "N", "B", "A", "K", "A", "B", "N", "R"];
  let id = 0;
  for (let c = 0; c < XQ_COLS; c++) {
    b[at(0, c)] = { id: ++id, side: "black", type: back[c]! };
    b[at(9, c)] = { id: ++id, side: "red", type: back[c]! };
  }
  b[at(2, 1)] = { id: ++id, side: "black", type: "C" };
  b[at(2, 7)] = { id: ++id, side: "black", type: "C" };
  b[at(7, 1)] = { id: ++id, side: "red", type: "C" };
  b[at(7, 7)] = { id: ++id, side: "red", type: "C" };
  for (const c of [0, 2, 4, 6, 8]) {
    b[at(3, c)] = { id: ++id, side: "black", type: "P" };
    b[at(6, c)] = { id: ++id, side: "red", type: "P" };
  }
  return b;
}

export function createXiangqiGame(seed = 1): XiangqiState {
  return {
    board: initialBoard(),
    turn: "red",
    status: "playing",
    check: false,
    lastMove: null,
    history: [],
    notes: [],
    captured: { red: [], black: [] },
    quietMoves: 0,
    seed: seed | 0,
  };
}

/** 读档兜底：结构不合法返回 null，调用方直接开新局 */
export function reviveXiangqi(raw: unknown): XiangqiState | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<XiangqiState>;
  if (!Array.isArray(s.board) || s.board.length !== XQ_ROWS * XQ_COLS) return null;
  const board = cloneBoard(s.board as XiangqiBoard);
  for (const p of board) {
    if (p && (typeof p.id !== "number" || (p.side !== "red" && p.side !== "black") || !VALUE[p.type])) return null;
  }
  const turn: XiangqiSide = s.turn === "black" ? "black" : "red";
  const status: XiangqiStatus =
    s.status === "red" || s.status === "black" || s.status === "draw" ? s.status : "playing";
  const history = Array.isArray(s.history) ? s.history.slice() : [];
  return {
    board,
    turn,
    status,
    check: !!s.check,
    lastMove: s.lastMove ?? null,
    history,
    notes: Array.isArray(s.notes) ? s.notes.slice() : [],
    captured: {
      red: Array.isArray(s.captured?.red) ? s.captured!.red.slice() : [],
      black: Array.isArray(s.captured?.black) ? s.captured!.black.slice() : [],
    },
    quietMoves: typeof s.quietMoves === "number" ? s.quietMoves : 0,
    seed: typeof s.seed === "number" ? s.seed : 1,
  };
}

/** 单个棋子的「伪合法」着法（不考虑走后自己被将军） */
export function pseudoMoves(b: XiangqiBoard, from: number): number[] {
  const p = b[from];
  if (!p) return [];
  const r = rowOf(from);
  const c = colOf(from);
  const out: number[] = [];
  const push = (rr: number, cc: number): boolean => {
    if (!inBoard(rr, cc)) return false;
    const t = b[at(rr, cc)];
    if (!t || t.side !== p.side) out.push(at(rr, cc));
    return !!t;
  };

  if (p.type === "R" || p.type === "C") {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      let rr = r + dr;
      let cc = c + dc;
      let jumped = false;
      while (inBoard(rr, cc)) {
        const t = b[at(rr, cc)];
        if (p.type === "R") {
          if (push(rr, cc)) break;
        } else if (!jumped) {
          if (!t) out.push(at(rr, cc));
          else jumped = true;
        } else if (t) {
          if (t.side !== p.side) out.push(at(rr, cc));
          break;
        }
        rr += dr;
        cc += dc;
      }
    }
  } else if (p.type === "N") {
    for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]] as const) {
      const legR = r + (Math.abs(dr) === 2 ? Math.sign(dr) : 0);
      const legC = c + (Math.abs(dc) === 2 ? Math.sign(dc) : 0);
      if (b[at(legR, legC)]) continue; // 蹩马腿
      push(r + dr, c + dc);
    }
  } else if (p.type === "B") {
    for (const [dr, dc] of [[-2, -2], [-2, 2], [2, -2], [2, 2]] as const) {
      if (b[at(r + dr / 2, c + dc / 2)]) continue; // 塞象眼
      const rr = r + dr;
      if (p.side === "red" ? rr < 5 : rr > 4) continue; // 象不过河
      push(rr, c + dc);
    }
  } else if (p.type === "A") {
    for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const) {
      if (inPalace(p.side, r + dr, c + dc)) push(r + dr, c + dc);
    }
  } else if (p.type === "K") {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      if (inPalace(p.side, r + dr, c + dc)) push(r + dr, c + dc);
    }
    // 将帅照面：同列且中间无子时可直接「飞将」吃对方将/帅
    for (let rr = 0; rr < XQ_ROWS; rr++) {
      const t = b[at(rr, c)];
      if (t && t.type === "K" && t.side !== p.side) {
        let blocked = false;
        const lo = Math.min(r, rr) + 1;
        const hi = Math.max(r, rr);
        for (let x = lo; x < hi; x++) if (b[at(x, c)]) { blocked = true; break; }
        if (!blocked) out.push(at(rr, c));
        break;
      }
    }
  } else {
    // 兵/卒：未过河只可向前；过河后可前、左、右，不可后退
    const forward = p.side === "red" ? -1 : 1;
    push(r + forward, c);
    const crossed = p.side === "red" ? r <= 4 : r >= 5;
    if (crossed) { push(r, c - 1); push(r, c + 1); }
  }
  return out;
}

export function findKing(b: XiangqiBoard, side: XiangqiSide): number {
  for (let i = 0; i < b.length; i++) {
    const p = b[i];
    if (p && p.type === "K" && p.side === side) return i;
  }
  return -1;
}
export function hasKing(b: XiangqiBoard, side: XiangqiSide): boolean {
  return findKing(b, side) >= 0;
}

/** 一方是否被将军（对方任一伪合法着法能吃到己方将/帅，含飞将） */
export function isInCheck(b: XiangqiBoard, side: XiangqiSide): boolean {
  const k = findKing(b, side);
  if (k < 0) return true;
  for (let i = 0; i < b.length; i++) {
    const p = b[i];
    if (!p || p.side === side) continue;
    const moves = pseudoMoves(b, i);
    for (const to of moves) if (to === k) return true;
  }
  return false;
}

/** 过滤掉「走完自己被将军」的着法 */
export function legalMovesFor(b: XiangqiBoard, side: XiangqiSide, from?: number): XiangqiMove[] {
  const out: XiangqiMove[] = [];
  for (let i = 0; i < b.length; i++) {
    const p = b[i];
    if (!p || p.side !== side) continue;
    if (from !== undefined && from !== i) continue;
    for (const to of pseudoMoves(b, i)) {
      const next = b.slice();
      next[to] = next[i];
      next[i] = null;
      if (!isInCheck(next, side)) out.push({ from: i, to });
    }
  }
  return out;
}

/** 某一列从该方视角的中文数字列号：红从右往左 9→1，黑从左往右 1→9 */
function colNumber(side: XiangqiSide, c: number): number {
  return side === "red" ? 9 - c : c + 1;
}

/** 简化中文棋谱：如「炮二平五」「马八进七」。同名子「前/后」不区分。 */
export function moveNotation(b: XiangqiBoard, m: XiangqiMove): string {
  const p = b[m.from];
  if (!p) return "";
  const r = rowOf(m.from);
  const c = colOf(m.from);
  const tr = rowOf(m.to);
  const tc = colOf(m.to);
  const name = pieceName(p);
  const start = CN[colNumber(p.side, c)] ?? "?";
  let action: string;
  if (tr === r) {
    action = "平" + (CN[colNumber(p.side, tc)] ?? "?");
  } else {
    const advancing = p.side === "red" ? tr < r : tr > r;
    const straight = p.type === "R" || p.type === "C" || p.type === "P" || p.type === "K";
    const n = straight ? Math.abs(tr - r) : colNumber(p.side, tc);
    action = (advancing ? "进" : "退") + (CN[n] ?? String(n));
  }
  return name + start + action;
}

/** 落子并返回全新状态（不可变，方便 React 渲染与撤销） */
export function applyXiangqiMove(s: XiangqiState, m: XiangqiMove): XiangqiState {
  if (s.status !== "playing") return s;
  const legal = legalMovesFor(s.board, s.turn, m.from);
  if (!legal.some((x) => x.from === m.from && x.to === m.to)) return s;

  const board = cloneBoard(s.board);
  const moving = board[m.from]!;
  const victim = board[m.to];
  const note = moveNotation(s.board, m);
  board[m.to] = moving;
  board[m.from] = null;

  const captured = { red: s.captured.red.slice(), black: s.captured.black.slice() };
  if (victim) captured[s.turn].push(victim.type);
  const quietMoves = victim ? 0 : s.quietMoves + 1;
  const next = otherSide(s.turn);
  const opponentHasKing = hasKing(board, next);
  const replies = opponentHasKing ? legalMovesFor(board, next) : [];
  let status: XiangqiStatus = "playing";
  if (!opponentHasKing || replies.length === 0) status = s.turn; // 将死 / 困毙
  else if (quietMoves >= 120) status = "draw";

  return {
    board,
    turn: next,
    status,
    check: isInCheck(board, next),
    lastMove: { from: m.from, to: m.to },
    history: s.history.concat([{ from: m.from, to: m.to }]),
    notes: s.notes.concat([note]),
    captured,
    quietMoves,
    seed: s.seed,
  };
}

export function xiangqiStatusText(s: XiangqiState): string {
  if (s.status === "draw") return "和棋 · 连续 120 回合无吃子";
  if (s.status !== "playing") return `${s.status === "red" ? "红方" : "黑方"}胜 · ${s.check ? "将死" : "困毙"}`;
  return `${s.turn === "red" ? "红方" : "黑方"}走棋${s.check ? " · 将军！" : ""}`;
}

function evaluate(b: XiangqiBoard, side: XiangqiSide): number {
  let score = 0;
  for (let i = 0; i < b.length; i++) {
    const p = b[i];
    if (!p) continue;
    let v = VALUE[p.type];
    const r = rowOf(i);
    const c = colOf(i);
    if (p.type === "P") {
      const crossed = p.side === "red" ? r <= 4 : r >= 5;
      if (crossed) v += 80 + (5 - Math.abs(r - 4.5)) * 12;
    } else if (p.type === "N" || p.type === "C") {
      v += (4 - Math.abs(c - 4)) * 5;
    }
    score += p.side === side ? v : -v;
  }
  return score;
}

type SearchCtx = { nodes: number; limit: number; aborted: boolean };

function orderedMoves(b: XiangqiBoard, side: XiangqiSide): XiangqiMove[] {
  return legalMovesFor(b, side).sort((a, z) => {
    const va = b[a.to] ? VALUE[b[a.to]!.type] : 0;
    const vz = b[z.to] ? VALUE[b[z.to]!.type] : 0;
    return vz - va;
  });
}

function negamax(b: XiangqiBoard, side: XiangqiSide, depth: number, alpha: number, beta: number, ctx: SearchCtx): number {
  ctx.nodes++;
  if (ctx.nodes > ctx.limit) { ctx.aborted = true; return evaluate(b, side); }
  if (!hasKing(b, side)) return -MATE + (10 - depth);
  if (depth === 0) return evaluate(b, side);
  const moves = orderedMoves(b, side);
  if (!moves.length) return -MATE + (10 - depth);
  let best = -Infinity;
  for (const m of moves) {
    const victim = b[m.to];
    const moving = b[m.from];
    b[m.to] = moving;
    b[m.from] = null;
    const v = victim && victim.type === "K"
      ? MATE
      : -negamax(b, otherSide(side), depth - 1, -beta, -alpha, ctx);
    b[m.from] = moving;
    b[m.to] = victim;
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta || ctx.aborted) break;
  }
  return best;
}

/**
 * AI 选点。level 1 贪心（深度1）/ 2 默认（深度2）/ 3 困难（深度3，带节点上限）。
 * 同分着法用 seed 打散，避免每局开局一模一样；小程序建议用 1~2 档控制耗时。
 */
export function chooseXiangqiMove(s: XiangqiState, level = 2, seed = 1): XiangqiMove | null {
  if (s.status !== "playing") return null;
  const depth = level <= 1 ? 1 : level === 2 ? 2 : 3;
  const ctx: SearchCtx = { nodes: 0, limit: level >= 3 ? 120_000 : 24_000, aborted: false };
  const rng = createRng(seed);
  const candidates = orderedMoves(s.board, s.turn);
  if (!candidates.length) return null;

  let alpha = -Infinity;
  let best = -Infinity;
  let picks: XiangqiMove[] = [];
  for (const m of candidates) {
    const b = cloneBoard(s.board);
    const victim = b[m.to];
    b[m.to] = b[m.from];
    b[m.from] = null;
    const v = victim && victim.type === "K"
      ? MATE
      : -negamax(b, otherSide(s.turn), depth - 1, -Infinity, -alpha, ctx);
    if (v > best + 1) { best = v; picks = [m]; }
    else if (v >= best - 1) picks.push(m);
    if (v > alpha) alpha = v;
    if (ctx.aborted) break;
  }
  return picks[Math.floor(rng() * picks.length)] ?? candidates[0]!;
}

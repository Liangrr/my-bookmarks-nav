/**
 * 陆战棋（军棋）· 翻翻棋 / 翻棋（字朝下摆）。
 * 纯函数、无 DOM / 无框架依赖，Web 与小程序共用；与标准暗棋 junqi.ts 共用同一张
 * 5×12 棋盘拓扑，但规则完全不同，两套玩法并列、互不替换。
 *
 * ⚠️ 规则口径：军棋没有官方统一规则，翻翻棋同样是民间玩法，各平台细节有差异。
 * 本实现取多源交叉验证后最通行的口径，逐条如下：
 *
 * 1. 棋盘沿用标准 5 列 × 12 行（60 格），含 10 个行营、4 个大本营标记、
 *    126 条公路/铁路连线。开局把双方共 50 枚棋子（各 25 枚）**全部背面朝上**
 *    随机铺满 50 个非行营格，行营留空；不区分上下阵地，不布阵。
 * 2. 棋子编制与等级同标准军棋：司令1 军长1 师长2 旅长2 团长2 营长2 连长3
 *    排长3 工兵3 炸弹2 地雷3 军旗1；司令>…>工兵，大吃小、同级同归于尽。
 * 3. 定色阶段：阵营未定，双方轮流**只能翻子**。当连续两张翻出的棋子颜色相同时，
 *    最后翻子的一方执该色、对手执另一色，随即进入行棋阶段。
 *    （腾讯 QQ 游戏《军旗翻翻棋》官方帮助口径；不采用「与自己上次翻出同色」、
 *    「首翻归对方」、「先翻出工兵者定色」等地方变体。）
 * 4. 行棋阶段每回合二选一：翻开一枚暗子，或移动一枚己方已翻开的可移动棋子
 *    （可同时完成进攻）。暗子不可被攻击、不可越过、不可穿过。
 * 5. 移动：公路一步（含行营四周斜线）；铁路直线任意格、中间不得有子、不能转
 *    直角弯；工兵是唯一可沿铁路任意转弯的棋子。行营是安全区，其中的棋子不可
 *    被攻击。**大本营在翻棋里仅是棋盘标记，规则等同普通格，不冻结棋子**
 *    （与标准暗棋的「进入大本营永久冻结」不同）；军旗、地雷不可移动。
 * 6. 战斗：炸弹与任何棋子（含地雷）同归于尽；工兵挖雷存活、其它棋子碰地雷
 *    阵亡而地雷保留；军旗不可移动，必须先把该方 3 颗地雷全部清除才允许被碰，
 *    夺旗立即获胜。
 * 7. 胜负：夺旗；轮到走棋一方无任何合法着法（含翻子）判负；双方均无合法着法
 *    或连续 60 步无交战判和。
 *
 * 参考来源（2026-11-13 检索）：
 * - 腾讯 QQ 游戏《军旗翻翻棋游戏帮助》：50 子编制、轮流翻子定色、行营无子、
 *   铁路/公路走法、地雷与炸弹、挖光 3 雷才能扛旗、无棋可走判负
 *   https://minigame.qq.com/help/rule222.html
 * - 百度百科《军棋》「字朝下摆（翻棋、明棋）」、百度百科《军棋》view/14786072
 *   https://baike.baidu.com/item/%E5%86%9B%E6%A3%8B
 * - 山东大学《军棋比赛规则》：「每方 23 个兵站（翻棋 25 个）」、翻棋开局与吃子规则
 *   http://glzx.sdu.edu.cn/system/_content/download.jsp?urltype=news.DownloadAttachUrl&wbfileid=16479894
 * - 网页版《军棋翻翻棋》：每回合二选一、暗子不可攻击、行营安全、大本营仅作标记、
 *   连续 60 步无交战判和  https://www.jqh5.com/
 * - 中文百科《軍棋(陸戰棋)》：暗棋 / 明棋 / 翻棋三种下法
 *   http://newton.com.tw/wiki/%E9%99%B8%E6%88%B0%E6%A3%8B
 *
 * 明确不采用的地方/平台变体：必须翻完全部棋子才可扛旗、超时/重复走棋判负、
 * 求和与积分结算、四人四国、「自己上次翻出同色」定色、首翻归对方。
 */
import { createRng, shuffle, type Rng } from "./game-rng";
import {
  JQ_CAMP_SET,
  JQ_CELLS,
  JQ_COLS,
  JQ_ROWS,
  JQ_SEGMENTS,
  jqCol,
  jqIdx,
  jqRow,
  otherJq,
  resolveJunqiCombat,
  sideName,
  type JqPiece,
  type JqSide,
} from "./junqi";

/* ---------------- 类型与常量 ---------------- */

/** 座位：player = 玩家1（人机模式下的人类），ai = 玩家2 / AI */
export type JfSeat = "player" | "ai";
export type JfPhase = "assign" | "playing" | "over";
export type JfCell = { piece: JqPiece; faceUp: boolean } | null;
export type JfAction =
  | { type: "flip"; at: number }
  | { type: "move"; from: number; to: number };

/** 连续多少步没有交战判和（取 jqh5 的 60 步，QQ 官方为 80 步） */
export const JF_DRAW_QUIET = 60;
/** 每方地雷数，全部清除后才可扛旗 */
export const JF_MINES = 3;

export type JunqiFlipState = {
  /** 存档格式版本，用于拒绝不兼容的旧存档 */
  v: 1;
  board: JfCell[];
  turn: JfSeat;
  phase: JfPhase;
  /** 定色后每个座位执子颜色；定色前均为 null */
  owner: Record<JfSeat, JqSide | null>;
  winner: JfSeat | "draw" | null;
  result: string;
  /** 定色阶段上一张翻出的颜色，用于「连续两张同色」判定 */
  prevFlipColor: JqSide | null;
  /** 战报：只公布翻出的明子与交战结果，不泄露暗子真值 */
  log: string[];
  lastFlip: number | null;
  lastMove: { from: number; to: number } | null;
  moves: number;
  quietMoves: number;
  seed: number;
};

export const otherSeat = (s: JfSeat): JfSeat => (s === "player" ? "ai" : "player");
export const seatName = (s: JfSeat) => (s === "player" ? "玩家1" : "玩家2");

/** 开局铺子的 50 个非行营格 */
export const JF_SPAWN_POINTS: number[] = [];
for (let i = 0; i < JQ_CELLS; i++) if (!JQ_CAMP_SET.has(i)) JF_SPAWN_POINTS.push(i);

/* ---------------- 棋盘拓扑（复用标准棋盘，不复制一份定义） ---------------- */

function buildAdj(segments: typeof JQ_SEGMENTS): number[][] {
  const adj: number[][] = Array.from({ length: JQ_CELLS }, () => []);
  for (const seg of segments) {
    if (!adj[seg.a]!.includes(seg.b)) {
      adj[seg.a]!.push(seg.b);
      adj[seg.b]!.push(seg.a);
    }
  }
  return adj;
}
/** 一步可到达的连线（公路 + 铁路重叠处只保留一条） */
const JF_ROAD_ADJ = buildAdj(JQ_SEGMENTS);
/** 铁路连线，供直行 / 工兵转弯 BFS */
const JF_RAIL_ADJ = buildAdj(JQ_SEGMENTS.filter((s) => s.kind === "rail"));
const JF_RAIL_NODES = new Set<number>();
for (const seg of JQ_SEGMENTS) {
  if (seg.kind === "rail") { JF_RAIL_NODES.add(seg.a); JF_RAIL_NODES.add(seg.b); }
}
function railNeighbor(i: number, dr: number, dc: number): number {
  const r = jqRow(i) + dr;
  const c = jqCol(i) + dc;
  if (r < 0 || r >= JQ_ROWS || c < 0 || c >= JQ_COLS) return -1;
  const j = jqIdx(r, c);
  return JF_RAIL_ADJ[i]!.includes(j) ? j : -1;
}

/* ---------------- 棋子与开局 ---------------- */

/** 25 子编制，与标准军棋一致；id 全局唯一，便于存档与调试 */
const JF_PIECE_SPEC: ReadonlyArray<{ kind: JqPiece["kind"]; rank: number; name: string; count: number }> = [
  { kind: "soldier", rank: 9, name: "司令", count: 1 },
  { kind: "soldier", rank: 8, name: "军长", count: 1 },
  { kind: "soldier", rank: 7, name: "师长", count: 2 },
  { kind: "soldier", rank: 6, name: "旅长", count: 2 },
  { kind: "soldier", rank: 5, name: "团长", count: 2 },
  { kind: "soldier", rank: 4, name: "营长", count: 2 },
  { kind: "soldier", rank: 3, name: "连长", count: 3 },
  { kind: "soldier", rank: 2, name: "排长", count: 3 },
  { kind: "soldier", rank: 1, name: "工兵", count: 3 },
  { kind: "bomb", rank: -2, name: "炸弹", count: 2 },
  { kind: "mine", rank: -1, name: "地雷", count: 3 },
  { kind: "flag", rank: 0, name: "军旗", count: 1 },
];

function makePieces(side: JqSide, offset: number): JqPiece[] {
  const out: JqPiece[] = [];
  for (const spec of JF_PIECE_SPEC) {
    for (let n = 0; n < spec.count; n++) {
      out.push({ id: offset + out.length + 1, side, kind: spec.kind, rank: spec.rank, name: spec.name });
    }
  }
  return out;
}

/** 新局：50 枚暗子随机铺满非行营格，开棋座位由种子随机决定 */
export function createJunqiFlipGame(seed = 1): JunqiFlipState {
  const rng = createRng(seed);
  const pool = shuffle([...makePieces("red", 0), ...makePieces("black", 100)], rng);
  const board: JfCell[] = new Array<JfCell>(JQ_CELLS).fill(null);
  JF_SPAWN_POINTS.forEach((p, k) => { board[p] = { piece: pool[k]!, faceUp: false }; });
  const turn: JfSeat = rng() < 0.5 ? "player" : "ai";
  return {
    v: 1,
    board,
    turn,
    phase: "assign",
    owner: { player: null, ai: null },
    winner: null,
    result: "",
    prevFlipColor: null,
    log: [`开局：50 枚暗子已铺满棋盘（行营留空）· ${seatName(turn)} 先翻子`],
    lastFlip: null,
    lastMove: null,
    moves: 0,
    quietMoves: 0,
    seed: seed | 0,
  };
}

/* ---------------- 公开信息（暗子真值不出共享层） ---------------- */

export type JfViewCell =
  | { hidden: true }
  | { hidden: false; piece: JqPiece };

/**
 * 视图层 / AI 唯一可读的格子信息。暗子只暴露「这里有一枚未翻开的棋」，
 * 不暴露颜色与军衔；state 内部保存全量真值仅用于存档与裁判结算。
 */
export function junqiFlipVisible(s: JunqiFlipState, i: number): JfViewCell | null {
  const cell = s.board[i];
  if (!cell) return null;
  if (!cell.faceUp) return { hidden: true };
  return { hidden: false, piece: cell.piece };
}

/** 某方尚存的地雷数（隐藏的地雷也算未清除，必须翻开后才能真正排掉） */
export function junqiFlipMinesLeft(s: JunqiFlipState, side: JqSide): number {
  let n = 0;
  for (const cell of s.board) {
    if (cell && cell.piece.side === side && cell.piece.kind === "mine") n++;
  }
  return n;
}

export type JfStats = {
  hidden: number;
  red: number;
  black: number;
  redMines: number;
  blackMines: number;
};
export function junqiFlipStats(s: JunqiFlipState): JfStats {
  let hidden = 0, red = 0, black = 0;
  for (const cell of s.board) {
    if (!cell) continue;
    if (!cell.faceUp) { hidden++; continue; }
    if (cell.piece.side === "red") red++; else black++;
  }
  return {
    hidden, red, black,
    redMines: junqiFlipMinesLeft(s, "red"),
    blackMines: junqiFlipMinesLeft(s, "black"),
  };
}

/* ---------------- 合法着法 ---------------- */

function canLand(s: JunqiFlipState, to: number, side: JqSide): boolean {
  const cell = s.board[to];
  if (!cell) return true;
  if (!cell.faceUp) return false;              // 不能攻击暗子
  if (cell.piece.side === side) return false;  // 不能吃己方
  if (JQ_CAMP_SET.has(to)) return false;       // 行营安全区
  if (cell.piece.kind === "flag" && junqiFlipMinesLeft(s, cell.piece.side) > 0) return false;
  return true;
}

function pieceMovable(s: JunqiFlipState, from: number, side: JqSide): boolean {
  const cell = s.board[from];
  if (!cell || !cell.faceUp || cell.piece.side !== side) return false;
  if (cell.piece.kind === "mine" || cell.piece.kind === "flag") return false;
  return true; // 翻棋不冻结大本营
}

/** 从某格出发的全部合法落点（公路一步 + 铁路直行 / 工兵转弯） */
export function legalJunqiFlipTargets(s: JunqiFlipState, from: number, seat: JfSeat = s.turn): number[] {
  if (s.phase !== "playing" || s.turn !== seat) return [];
  const side = s.owner[seat];
  if (!side || !pieceMovable(s, from, side)) return [];
  const p = s.board[from]!.piece;
  const out = new Set<number>();
  const land = (to: number): boolean => {
    if (to < 0 || !canLand(s, to, side)) return false;
    out.add(to);
    return !s.board[to]; // 落点有敌子就不能继续穿过
  };

  for (const to of JF_ROAD_ADJ[from]!) land(to);

  if (JF_RAIL_NODES.has(from)) {
    if (p.kind === "soldier" && p.rank === 1) {
      const seen = new Set<number>([from]);
      const queue = [from];
      while (queue.length) {
        const cur = queue.shift()!;
        for (const nb of JF_RAIL_ADJ[cur]!) {
          if (seen.has(nb)) continue;
          seen.add(nb);
          if (!s.board[nb]) queue.push(nb); // 空格才能作中转
          land(nb);
        }
      }
    } else {
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        let cur = from;
        for (let step = 0; step < JQ_ROWS; step++) {
          const nb = railNeighbor(cur, dr, dc);
          if (nb < 0) break;
          const clear = land(nb);
          if (!clear) break;
          cur = nb;
        }
      }
    }
  }
  return [...out];
}

/** 当前座位的全部合法动作：定色阶段只能翻子，行棋阶段翻子 / 走子二选一 */
export function legalJunqiFlipActions(s: JunqiFlipState, seat: JfSeat = s.turn): JfAction[] {
  if (s.phase === "over" || s.turn !== seat) return [];
  const out: JfAction[] = [];
  for (let i = 0; i < JQ_CELLS; i++) {
    const cell = s.board[i];
    if (cell && !cell.faceUp) out.push({ type: "flip", at: i });
  }
  if (s.phase === "playing") {
    const side = s.owner[seat];
    if (side) {
      for (let i = 0; i < JQ_CELLS; i++) {
        if (!pieceMovable(s, i, side)) continue;
        for (const to of legalJunqiFlipTargets(s, i, seat)) out.push({ type: "move", from: i, to });
      }
    }
  }
  return out;
}

const COMBAT_TEXT: Record<ReturnType<typeof resolveJunqiCombat>, string> = {
  "attacker-dies": "攻方阵亡",
  "defender-dies": "守方阵亡，攻方占领",
  "both-die": "双方同归于尽",
  "flag-captured": "扛旗成功",
};

/* ---------------- 状态推进 ---------------- */

function isLegal(s: JunqiFlipState, a: JfAction): boolean {
  if (a.type === "flip") {
    const cell = s.board[a.at];
    return !!cell && !cell.faceUp;
  }
  return legalJunqiFlipTargets(s, a.from).includes(a.to);
}

/** 结算后检查终局；返回更新后的 winner / phase / result */
function settle(s: JunqiFlipState, flagCaptured: boolean): JunqiFlipState {
  if (flagCaptured) {
    return {
      ...s, phase: "over", winner: s.turn,
      result: "扛旗成功",
    };
  }
  // 注意：这里 s.turn 仍是刚行动的一方，胜负要按「轮到走棋的一方」判断
  const nextSeat = otherSeat(s.turn);
  if (s.quietMoves >= JF_DRAW_QUIET) {
    return { ...s, phase: "over", winner: "draw", result: `连续 ${JF_DRAW_QUIET} 步无交战` };
  }
  const probe: JunqiFlipState = { ...s, turn: nextSeat };
  if (legalJunqiFlipActions(probe, nextSeat).length > 0) return s;
  const selfProbe: JunqiFlipState = { ...s, turn: s.turn };
  if (legalJunqiFlipActions(selfProbe, s.turn).length === 0) {
    return { ...s, phase: "over", winner: "draw", result: "双方均无合法着法" };
  }
  return {
    ...s, phase: "over", winner: s.turn,
    result: `${seatName(nextSeat)} 无棋可走`,
  };
}

/** 应用一个动作；非法动作原样返回（引用不变，便于 hook 判定） */
export function applyJunqiFlipAction(s: JunqiFlipState, a: JfAction): JunqiFlipState {
  if (s.phase === "over" || !isLegal(s, a)) return s;
  const board = s.board.slice();
  const log = s.log.slice();
  const owner = { ...s.owner };
  let phase = s.phase;
  let prevFlipColor = s.prevFlipColor;
  let flagCaptured = false;
  let quietMoves = s.quietMoves + 1;
  let lastFlip = s.lastFlip;
  let lastMove = s.lastMove;

  if (a.type === "flip") {
    const cell = board[a.at]!;
    board[a.at] = { piece: cell.piece, faceUp: true };
    lastFlip = a.at;
    log.push(`${seatName(s.turn)} 翻出 ${sideName(cell.piece.side)}方${cell.piece.name}`);
    if (phase === "assign") {
      if (prevFlipColor === cell.piece.side) {
        owner[s.turn] = cell.piece.side;
        owner[otherSeat(s.turn)] = otherJq(cell.piece.side);
        phase = "playing";
        prevFlipColor = null;
        log.push(`阵营确定：${seatName(s.turn)} 执${sideName(cell.piece.side)}，${seatName(otherSeat(s.turn))} 执${sideName(otherJq(cell.piece.side))}`);
      } else {
        prevFlipColor = cell.piece.side;
      }
    }
  } else {
    const attacker = board[a.from]!.piece;
    const target = board[a.to];
    board[a.from] = null;
    lastMove = { from: a.from, to: a.to };
    if (!target) {
      board[a.to] = { piece: attacker, faceUp: true };
      log.push(`${seatName(s.turn)} 行棋`);
    } else {
      const combat = resolveJunqiCombat(attacker, target.piece);
      quietMoves = 0;
      if (combat === "attacker-dies") board[a.to] = target;
      else if (combat === "defender-dies" || combat === "flag-captured") {
        board[a.to] = { piece: attacker, faceUp: true };
      } else board[a.to] = null;
      log.push(`${seatName(s.turn)} 交战 · ${COMBAT_TEXT[combat]}`);
      if (combat === "flag-captured") flagCaptured = true;
    }
  }

  const beforeSwap: JunqiFlipState = {
    ...s,
    board, log, owner, phase, prevFlipColor,
    lastFlip, lastMove,
    moves: s.moves + 1,
    quietMoves,
  };
  // settle 里按「上一手方」判定胜负，所以先保留 turn，再统一交换
  const settled = settle(beforeSwap, flagCaptured);
  return { ...settled, turn: otherSeat(s.turn), log: settled.log.slice(-40) };
}

/** 状态条文案 */
export function junqiFlipStatusText(s: JunqiFlipState, humanSeat: JfSeat | null = "player"): string {
  if (s.phase === "over") {
    if (s.winner === "draw") return `和棋 · ${s.result}`;
    const won = humanSeat !== null && s.winner === humanSeat;
    return `${seatName(s.winner!)} 获胜 · ${s.result}${won ? "（你赢了）" : ""}`;
  }
  const hidden = junqiFlipStats(s).hidden;
  if (s.phase === "assign") {
    return `定色阶段 · 第 ${s.moves + 1} 手 · ${seatName(s.turn)} 翻子` +
      ` · 上次翻出${s.prevFlipColor ? sideName(s.prevFlipColor) + "方" : "无"} · 未翻 ${hidden}`;
  }
  const side = s.owner[s.turn];
  return `${seatName(s.turn)} 行棋 · 第 ${s.moves + 1} 手 · ${side ? sideName(side) + "方" : ""} · 未翻 ${hidden}`;
}

/* ---------------- AI（只读公开信息，绝不偷看暗子真值） ---------------- */

/** 从公开视图重建一份「只看得见明子」的棋盘，AI 评分只基于此 */
function publicBoard(s: JunqiFlipState): (JqPiece | "hidden" | null)[] {
  return s.board.map((_, i) => {
    const v = junqiFlipVisible(s, i);
    if (!v) return null;
    return v.hidden ? "hidden" : v.piece;
  });
}

function captureScore(attacker: JqPiece, defender: JqPiece): number {
  const combat = resolveJunqiCombat(attacker, defender);
  const value = (p: JqPiece) => (p.kind === "soldier" ? 4 + p.rank * 2 : p.kind === "bomb" ? 16 : p.kind === "mine" ? 12 : 40);
  if (combat === "flag-captured") return 100000;
  if (combat === "defender-dies") return 60 + value(defender);
  if (combat === "both-die") return value(defender) - value(attacker) + 8;
  return -(50 + value(attacker));
}

/**
 * AI 选着：定色阶段随机翻子；行棋阶段用启发式评分（吃子收益 / 子力交换 /
 * 靠近对方军旗 / 进行营避险 / 翻子补充信息）。全程不读取暗子真值。
 */
export function chooseJunqiFlipAction(s: JunqiFlipState, seed: number, level = 2): JfAction | null {
  if (s.phase === "over") return null;
  const actions = legalJunqiFlipActions(s, s.turn);
  if (!actions.length) return null;
  const rng: Rng = createRng(seed);
  if (s.phase === "assign" || level <= 0) {
    return actions[Math.floor(rng() * actions.length)]!;
  }
  if (level === 1) {
    // 简单档：偏随机，但白送的亏本进攻会降低权重
    const flips = actions.filter((a) => a.type === "flip");
    const moves = actions.filter((a) => a.type === "move");
    if (rng() < 0.55 || !moves.length) {
      const pool = flips.length ? flips : actions;
      return pool[Math.floor(rng() * pool.length)]!;
    }
    return moves[Math.floor(rng() * moves.length)]!;
  }

  const pub = publicBoard(s);
  const side = s.owner[s.turn];
  if (!side) return actions[Math.floor(rng() * actions.length)]!;
  const enemySide = otherJq(side);
  const flagAt = pub.findIndex((p) => p && p !== "hidden" && p.side === enemySide && p.kind === "flag");
  const hiddenCount = pub.filter((p) => p === "hidden").length;

  let best: JfAction | null = null;
  let bestScore = -Infinity;
  for (const a of actions) {
    let score = rng() * 2.5;
    if (a.type === "flip") {
      // 暗子多时优先翻（获取信息 + 补充子力），暗子少时优先走棋
      score += 5 + Math.min(hiddenCount, 20) * 0.42;
      if (JQ_CAMP_SET.has(a.at)) score -= 100; // 行营开局本就没有暗子
    } else {
      const attacker = pub[a.from];
      if (!attacker || attacker === "hidden") continue;
      const defender = pub[a.to];
      if (defender === "hidden") continue;
      if (!defender) {
        // 向对方军旗靠拢 + 走进行营避险
        if (JQ_CAMP_SET.has(a.to)) score += 7;
        if (JQ_CAMP_SET.has(a.from)) score -= 3;
        if (flagAt >= 0) {
          const d0 = Math.abs(jqRow(a.from) - jqRow(flagAt)) + Math.abs(jqCol(a.from) - jqCol(flagAt));
          const d1 = Math.abs(jqRow(a.to) - jqRow(flagAt)) + Math.abs(jqCol(a.to) - jqCol(flagAt));
          score += (d0 - d1) * 1.6;
        }
        if (attacker.kind === "soldier" && attacker.rank === 1) score += 1.5; // 工兵留着挖雷
      } else if (defender.side === enemySide) {
        score += captureScore(attacker, defender);
        // 困难档：避免把大子送到已翻开的敌方更大子旁边
        if (level >= 3 && attacker.kind === "soldier" && defender.kind === "soldier" && defender.rank >= attacker.rank) {
          score -= 6;
        }
      } else continue;
    }
    if (score > bestScore) { bestScore = score; best = a; }
  }
  return best ?? actions[0]!;
}

/* ---------------- 存档反序列化（严格校验，拒绝旧格式 / 脏数据） ---------------- */

const KINDS = new Set<JqPiece["kind"]>(["soldier", "mine", "bomb", "flag"]);
const SEATS = new Set<JfSeat>(["player", "ai"]);
const SIDES = new Set<JqSide>(["red", "black"]);

export function reviveJunqiFlip(raw: unknown): JunqiFlipState | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<JunqiFlipState>;
  if (s.v !== 1 || !Array.isArray(s.board) || s.board.length !== JQ_CELLS) return null;
  if (!SEATS.has(s.turn as JfSeat)) return null;
  if (s.phase !== "assign" && s.phase !== "playing" && s.phase !== "over") return null;
  if (!s.owner || typeof s.owner !== "object") return null;
  for (const seat of ["player", "ai"] as JfSeat[]) {
    const v = s.owner![seat];
    if (v !== null && !SIDES.has(v as JqSide)) return null;
  }
  if (s.phase === "playing" && (s.owner.player === null || s.owner.ai === null ||
      s.owner.player === s.owner.ai)) return null;
  if (s.phase === "assign" && (s.owner.player !== null || s.owner.ai !== null)) return null;
  if (s.winner !== null && s.winner !== "draw" && !SEATS.has(s.winner as JfSeat)) return null;
  if (!Array.isArray(s.log) || typeof s.result !== "string") return null;
  if (typeof s.moves !== "number" || typeof s.quietMoves !== "number" || typeof s.seed !== "number") return null;
  if (s.prevFlipColor !== null && !SIDES.has(s.prevFlipColor as JqSide)) return null;
  if (s.lastFlip !== null && typeof s.lastFlip !== "number") return null;
  if (s.lastMove !== null && (typeof s.lastMove !== "object" ||
      typeof s.lastMove!.from !== "number" || typeof s.lastMove!.to !== "number")) return null;

  const board: JfCell[] = [];
  const ids = new Set<number>();
  for (const rawCell of s.board) {
    if (rawCell === null) { board.push(null); continue; }
    if (!rawCell || typeof rawCell !== "object") return null;
    const c = rawCell as JfCell;
    if (typeof c!.faceUp !== "boolean" || !c!.piece || typeof c!.piece !== "object") return null;
    const p = c!.piece;
    if (!Number.isInteger(p.id) || ids.has(p.id)) return null;
    ids.add(p.id);
    if (!SIDES.has(p.side) || !KINDS.has(p.kind) || typeof p.rank !== "number" || typeof p.name !== "string") return null;
    board.push({ piece: p, faceUp: c!.faceUp });
  }
  return {
    v: 1,
    board,
    turn: s.turn!,
    phase: s.phase,
    owner: { player: s.owner!.player, ai: s.owner!.ai },
    winner: s.winner ?? null,
    result: s.result,
    prevFlipColor: s.prevFlipColor ?? null,
    log: s.log.filter((x): x is string => typeof x === "string").slice(-40),
    lastFlip: s.lastFlip ?? null,
    lastMove: s.lastMove ?? null,
    moves: s.moves,
    quietMoves: s.quietMoves,
    seed: s.seed,
  };
}

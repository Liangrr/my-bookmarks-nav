/**
 * 陆战棋（军棋）· 标准两人「暗棋 + 程序裁判」规则。
 * 纯函数、无 DOM / 无框架依赖，Web 与小程序共用。
 *
 * ⚠️ 规则口径：军棋至今没有官方统一规则（百度百科《四国军棋》原文：
 * 「由于没有官方制定的军棋规则，而各游戏平台和实战团体自行制定的规则差别又较大，
 * 因此建议取较为流行的规则作为暂定规则」）。本实现取最通行的竞赛口径，逐条如下：
 *
 * 1. 棋盘 5 列 × 12 行，双方各 6 行（锋线→端线）× 5 列：5 个行营、23 个兵站、
 *    2 个大本营（司令部），共 30 个落点；开局只有 25 个非行营落点可布子。
 *    两军之间为前线，仅左 / 中 / 右 3 条铁路通道可越，另 2 处是山界。
 * 2. 每方 25 子：司令1 军长1 师长2 旅长2 团长2 营长2 连长3 排长3 工兵3
 *    炸弹2 地雷3 军旗1。等级：司令>…>工兵，大吃小、同级同归于尽。
 * 3. 布阵：军旗必须放大本营；地雷只能放最后两线；炸弹不能放锋线；行营开局留空。
 *    （腾讯 QQ 军棋帮助 / 百度百科《四国军棋》布局规则）
 * 4. 行棋：公路线一步（含行营四周斜线）；铁路线直线任意格、中间不得有子、
 *    不能转直角弯；工兵是唯一可沿铁路任意转弯行走的棋子。
 *    行营是安全区，其中的棋子不可被攻击；进入任何大本营的棋子永久冻结；
 *    军旗、地雷不可移动。
 * 5. 吃子：炸弹与敌方任何棋子同归于尽（包括军旗，即炸旗也算扛旗成功）；
 *    地雷不能移动，工兵可排除地雷且存活，炸弹与地雷同归于尽，
 *    其它棋子碰地雷阵亡而地雷保留；军旗被吃即全军覆没；司令阵亡则军旗亮开。
 * 6. 胜负：军旗被扛、轮到走棋一方无棋可走判负；连续 70 步无吃子判和。
 * 7. 暗棋：棋子立起互不可见，由第三人（程序）担任裁判，只宣布交战结果、
 *    不透露军衔。本实现的 state 保存全量真值用于存档，视图层通过
 *    junqiVisible() 做信息隔离，AI 评分也只按「未知敌方子力」估算，不偷看。
 *
 * 参考来源（2026-11-13 检索）：
 * - 维基百科《陸軍棋》：25 子编制、棋子特例、先夺军旗者胜
 *   https://www.fbrowser.org/wikipedia/wiki/%E8%BB%8D%E6%A3%8B
 * - 百度百科《四国军棋》：六行阵地 / 布局规则 / 胜负判决 / 70 步判和 / 司令阵亡亮旗
 *   https://wapbaike.baidu.com/view/44484.htm
 * - 腾讯 QQ 军棋官方帮助：铁路与公路、地雷小于工兵、炸弹同归于尽、布局限制
 *   https://game.qq.com/new05/help/sgjq.htm
 * - 边锋游戏《四国军棋规则(二)》：行营 / 大本营 / 布局 / 胜负
 *   https://www.gameabc.com/news/201704/3334.html
 * - AppFreeGame《军棋对战电脑》：5×12 棋盘、前线 3 通道与山界、布阵限制
 *   https://appfreegame.games/zh-cn/play/luzhanqiai
 * - 中文百科《軍棋(陸戰棋)》：暗棋 / 明棋 / 翻棋三种下法与阵位命名
 *   http://newton.com.tw/wiki/%E9%99%B8%E6%88%B0%E6%A3%8B/914535
 *
 * 明确不采用的地方变体：翻棋（本次改造前的旧实现）、挖光 3 雷才能扛旗、
 * 任何棋子撞地雷同归于尽、炸弹可摆锋线、进入大本营后仍可移动。
 */
import { createRng, shuffle, type Rng } from "./game-rng";

export const JQ_ROWS = 12;
export const JQ_COLS = 5;
export const JQ_CELLS = JQ_ROWS * JQ_COLS;
/** 连续多少步没有吃子判和（QQ 军棋 / 四国军棋通行口径） */
export const JQ_DRAW_QUIET = 70;

export type JqSide = "red" | "black";
export type JqKind = "soldier" | "mine" | "bomb" | "flag";
export type JqPiece = { id: number; side: JqSide; kind: JqKind; rank: number; name: string };
export type JqCell = JqPiece | null;
export type JqPhase = "setup" | "playing" | "over";
export type JqMove = { type: "move"; from: number; to: number };
export type JqAction =
  | { type: "swap"; a: number; b: number }
  | { type: "random" }
  | { type: "start" }
  | JqMove;

export type JunqiState = {
  board: JqCell[];
  turn: JqSide;
  phase: JqPhase;
  winner: JqSide | "draw" | null;
  /** 战报：只公布交战结果，不透露暗棋子力 */
  log: string[];
  lastMove: { from: number; to: number } | null;
  moves: number;
  quietMoves: number;
  /** 司令阵亡后该方军旗位置公开 */
  flagRevealed: Record<JqSide, boolean>;
  commandDead: Record<JqSide, boolean>;
  seed: number;
  rngState: number;
};

export type JqSegment = { a: number; b: number; kind: "road" | "rail" };

const RANK_NAMES = [
  "", "工兵", "排长", "连长", "营长", "团长", "旅长", "师长", "军长", "司令",
];
export const JQ_RANK_NAMES = RANK_NAMES;
export const jqRow = (i: number) => Math.floor(i / JQ_COLS);
export const jqCol = (i: number) => i % JQ_COLS;
export const jqIdx = (r: number, c: number) => r * JQ_COLS + c;
export const otherJq = (s: JqSide): JqSide => (s === "red" ? "black" : "red");
export const sideName = (s: JqSide) => (s === "red" ? "红" : "黑");

/** 本地行 l=1..6（锋线→端线）映射为全局行 */
const localToGlobal = (side: JqSide, l: number, c: number) =>
  side === "black" ? jqIdx(6 - l, c) : jqIdx(5 + l, c);
/** 全局格在某方视角下的本地行 */
export function jqLocalRow(side: JqSide, i: number): number {
  return side === "black" ? 6 - jqRow(i) : jqRow(i) - 5;
}
export const jqSideOfCell = (i: number): JqSide => (jqRow(i) < 6 ? "black" : "red");

const CAMP_LOCAL: ReadonlyArray<readonly [number, number]> = [
  [2, 1], [2, 3], [3, 2], [4, 1], [4, 3],
];
const HQ_LOCAL: ReadonlyArray<readonly [number, number]> = [[6, 1], [6, 3]];

export const JQ_CAMPS: number[] = [];
export const JQ_HQS: number[] = [];
for (const side of ["red", "black"] as JqSide[]) {
  for (const [l, c] of CAMP_LOCAL) JQ_CAMPS.push(localToGlobal(side, l, c));
  for (const [l, c] of HQ_LOCAL) JQ_HQS.push(localToGlobal(side, l, c));
}
export const JQ_CAMP_SET = new Set(JQ_CAMPS);
export const JQ_HQ_SET = new Set(JQ_HQS);
/** 前线两侧不可通行的山界列（0-based） */
export const JQ_FRONT_GAPS = [1, 3];

/** 每方可布子的 25 个落点（30 个落点扣除 5 个行营） */
export const JQ_SETUP_POINTS: Record<JqSide, number[]> = {
  red: [],
  black: [],
};
for (const side of ["red", "black"] as JqSide[]) {
  for (let l = 1; l <= 6; l++) {
    for (let c = 0; c < JQ_COLS; c++) {
      const i = localToGlobal(side, l, c);
      if (!JQ_CAMP_SET.has(i)) JQ_SETUP_POINTS[side].push(i);
    }
  }
}
export const JQ_SETUP_SET: Record<JqSide, Set<number>> = {
  red: new Set(JQ_SETUP_POINTS.red),
  black: new Set(JQ_SETUP_POINTS.black),
};

export function jqCellKind(i: number): "camp" | "hq" | "node" {
  if (JQ_CAMP_SET.has(i)) return "camp";
  if (JQ_HQ_SET.has(i)) return "hq";
  return "node";
}

/* ---------------- 棋盘线路拓扑 ---------------- */

const ROAD_ADJ: number[][] = Array.from({ length: JQ_CELLS }, () => []);
const RAIL_ADJ: number[][] = Array.from({ length: JQ_CELLS }, () => []);
export const JQ_RAIL_NODES = new Set<number>();
export const JQ_SEGMENTS: JqSegment[] = [];
const roadSeen = new Set<string>();
const railSeen = new Set<string>();
const edgeKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

function addEdge(adj: number[][], seen: Set<string>, a: number, b: number, kind: "road" | "rail") {
  const key = edgeKey(a, b);
  if (seen.has(key)) return;
  seen.add(key);
  if (!adj[a]!.includes(b)) {
    adj[a]!.push(b);
    adj[b]!.push(a);
  }
  JQ_SEGMENTS.push({ a, b, kind });
  if (kind === "rail") {
    RAIL_ADJ[a]!.push(b);
    RAIL_ADJ[b]!.push(a);
    JQ_RAIL_NODES.add(a);
    JQ_RAIL_NODES.add(b);
  }
}

// 公路：竖线（前线不连）、横线（端线不横贯）、行营四角斜线
for (let r = 0; r < JQ_ROWS; r++) {
  for (let c = 0; c < JQ_COLS; c++) {
    if (r < JQ_ROWS - 1 && r !== 5) addEdge(ROAD_ADJ, roadSeen, jqIdx(r, c), jqIdx(r + 1, c), "road");
    if (c < JQ_COLS - 1 && r !== 0 && r !== JQ_ROWS - 1) {
      addEdge(ROAD_ADJ, roadSeen, jqIdx(r, c), jqIdx(r, c + 1), "road");
    }
  }
}
for (const i of JQ_CAMPS) {
  const r = jqRow(i);
  const c = jqCol(i);
  for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= JQ_ROWS || nc < 0 || nc >= JQ_COLS) continue;
    if ((r < 6) !== (nr < 6)) continue; // 斜线不跨方
    addEdge(ROAD_ADJ, roadSeen, i, jqIdx(nr, nc), "road");
  }
}
// 铁路：双方锋线 / 底线横贯、两侧边列纵贯、前线中央通道
for (const r of [1, 5, 6, 10]) {
  for (let c = 0; c < JQ_COLS - 1; c++) {
    addEdge(ROAD_ADJ, railSeen, jqIdx(r, c), jqIdx(r, c + 1), "rail");
  }
}
for (const c of [0, JQ_COLS - 1]) {
  for (let r = 0; r < JQ_ROWS - 1; r++) {
    addEdge(ROAD_ADJ, railSeen, jqIdx(r, c), jqIdx(r + 1, c), "rail");
  }
}
addEdge(ROAD_ADJ, railSeen, jqIdx(5, 2), jqIdx(6, 2), "rail");

// 铁路与公路重叠的边只保留一条线（粗线覆盖细线），供视图绘制
{
  const merged = new Map<string, JqSegment>();
  for (const seg of JQ_SEGMENTS) merged.set(edgeKey(seg.a, seg.b), seg);
  JQ_SEGMENTS.length = 0;
  JQ_SEGMENTS.push(...merged.values());
}

/** 铁路邻居（用于工兵转弯 BFS 与非工兵直行） */
function railNeighbor(i: number, dr: number, dc: number): number {
  const r = jqRow(i) + dr;
  const c = jqCol(i) + dc;
  if (r < 0 || r >= JQ_ROWS || c < 0 || c >= JQ_COLS) return -1;
  const j = jqIdx(r, c);
  return railSeen.has(edgeKey(i, j)) ? j : -1;
}

/* ---------------- 棋子与布阵 ---------------- */

const PIECE_SPEC: ReadonlyArray<{ kind: JqKind; rank: number; name: string; count: number }> = [
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
  for (const spec of PIECE_SPEC) {
    for (let n = 0; n < spec.count; n++) {
      out.push({ id: offset + out.length + 1, side, kind: spec.kind, rank: spec.rank, name: spec.name });
    }
  }
  return out;
}

/** 生成一方合法布阵。preset=true 时给出「地雷护旗、工兵在锋线、炸弹居中」的预设阵型 */
function buildSetup(side: JqSide, rng: Rng, preset: boolean): JqCell[] {
  const points = JQ_SETUP_POINTS[side];
  const slots: JqCell[] = new Array(points.length).fill(null);
  const pool = makePieces(side, side === "red" ? 0 : 100);
  const freeSlots = () => slots.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0);
  const take = (pred: (p: JqPiece) => boolean): JqPiece => {
    const k = pool.findIndex(pred);
    if (k < 0) throw new Error("junqi: piece pool exhausted");
    return pool.splice(k, 1)[0]!;
  };
  const put = (piece: JqPiece, slot: number) => { slots[slot] = piece; };

  // 军旗必须占两个大本营之一
  const hqSlots = freeSlots().filter((k) => JQ_HQ_SET.has(points[k]!));
  const flagSlot = preset ? hqSlots[0]! : hqSlots[Math.floor(rng() * hqSlots.length)]!;
  put(take((p) => p.kind === "flag"), flagSlot);
  const flagPoint = points[flagSlot]!;

  // 地雷只在最后两线；预设阵型优先贴着军旗布三角雷
  let mineSlots = freeSlots().filter((k) => jqLocalRow(side, points[k]!) >= 5);
  if (preset) {
    mineSlots = mineSlots
      .slice()
      .sort((x, y) => {
        const d = (k: number) => {
          const a = points[k]!;
          return Math.abs(jqRow(a) - jqRow(flagPoint)) + Math.abs(jqCol(a) - jqCol(flagPoint));
        };
        return d(x) - d(y);
      })
      .slice(0, 3);
  } else {
    mineSlots = shuffle(mineSlots, rng).slice(0, 3);
  }
  for (const k of mineSlots) put(take((p) => p.kind === "mine"), k);

  // 炸弹不得放锋线
  let bombSlots = freeSlots().filter((k) => jqLocalRow(side, points[k]!) >= 2);
  if (preset) {
    bombSlots = bombSlots
      .slice()
      .sort((x, y) => jqLocalRow(side, points[x]!) - jqLocalRow(side, points[y]!))
      .slice(0, 2);
  } else {
    bombSlots = shuffle(bombSlots, rng).slice(0, 2);
  }
  for (const k of bombSlots) put(take((p) => p.kind === "bomb"), k);

  // 预设阵型把工兵摆到锋线 / 铁路上，方便开局抢行营
  if (preset) {
    const front = freeSlots()
      .filter((k) => jqLocalRow(side, points[k]!) === 1 || JQ_RAIL_NODES.has(points[k]!))
      .sort((x, y) => jqLocalRow(side, points[x]!) - jqLocalRow(side, points[y]!))
      .slice(0, 3);
    for (const k of front) put(take((p) => p.kind === "soldier" && p.rank === 1), k);
  }

  // 其余棋子填满剩余落点
  const rest = shuffle(pool, rng);
  for (const piece of rest) {
    const k = freeSlots()[0];
    if (k === undefined) break;
    put(piece, k);
  }
  return slots;
}

function nextSeed(x: number): number {
  return (Math.imul(x, 1664525) + 1013904223) | 0;
}

export function createJunqiGame(seed = 1): JunqiState {
  const rng = createRng(seed);
  const board: JqCell[] = new Array(JQ_CELLS).fill(null);
  const red = buildSetup("red", rng, true);
  const black = buildSetup("black", rng, false);
  JQ_SETUP_POINTS.red.forEach((p, k) => { board[p] = red[k] ?? null; });
  JQ_SETUP_POINTS.black.forEach((p, k) => { board[p] = black[k] ?? null; });
  return {
    board,
    turn: "red",
    phase: "setup",
    winner: null,
    log: ["布阵阶段：红方 25 子已就位（可点两格互换，或一键随机布阵）", "黑方由程序秘密布阵完成，红方先手"],
    lastMove: null,
    moves: 0,
    quietMoves: 0,
    flagRevealed: { red: false, black: false },
    commandDead: { red: false, black: false },
    seed: seed | 0,
    rngState: nextSeed(seed | 0),
  };
}

/** 校验玩家（红方）布阵，返回错误文案；空数组表示可开战 */
export function junqiSetupErrors(s: JunqiState): string[] {
  const errors: string[] = [];
  const points = JQ_SETUP_POINTS.red;
  const cells = points.map((i) => s.board[i]);
  if (cells.some((p) => !p || p.side !== "red")) errors.push("25 个落点必须全部放上红方棋子");
  const flagAt = points.filter((i) => s.board[i]?.kind === "flag");
  if (flagAt.length !== 1 || !JQ_HQ_SET.has(flagAt[0]!)) errors.push("军旗必须放在两个大本营之一");
  if (points.some((i) => s.board[i]?.kind === "mine" && jqLocalRow("red", i) < 5)) {
    errors.push("地雷只能放在最后两线（底线 / 端线）");
  }
  if (points.some((i) => s.board[i]?.kind === "bomb" && jqLocalRow("red", i) === 1)) {
    errors.push("炸弹不能放在锋线（第一线）");
  }
  if (JQ_CAMPS.some((i) => jqSideOfCell(i) === "red" && s.board[i])) {
    errors.push("行营开局必须留空");
  }
  return errors;
}

/* ---------------- 行棋与裁判 ---------------- */

function canLand(s: JunqiState, to: number, side: JqSide): boolean {
  const target = s.board[to];
  if (!target) return true;
  if (target.side === side) return false;
  if (JQ_CAMP_SET.has(to)) return false; // 行营中的棋子不可被攻击
  return true;
}

function pieceMovable(s: JunqiState, from: number, side: JqSide): boolean {
  const p = s.board[from];
  if (!p || p.side !== side) return false;
  if (p.kind === "mine" || p.kind === "flag") return false;
  if (JQ_HQ_SET.has(from)) return false; // 进入大本营的棋子永久冻结
  return true;
}

/** 从某格出发的全部合法落点（公路一步 + 铁路直行 / 工兵转弯） */
export function legalJunqiTargets(s: JunqiState, from: number, side = s.turn): number[] {
  if (s.phase !== "playing" || s.turn !== side || !pieceMovable(s, from, side)) return [];
  const p = s.board[from]!;
  const out = new Set<number>();
  const land = (to: number): boolean => {
    if (to < 0 || !canLand(s, to, side)) return false;
    out.add(to);
    return !s.board[to]; // 终点有敌子则不能再往前穿
  };

  for (const to of ROAD_ADJ[from]!) land(to);

  if (JQ_RAIL_NODES.has(from)) {
    if (p.kind === "soldier" && p.rank === 1) {
      // 工兵：沿铁路图 BFS，可任意转弯，路径中间不得有棋子
      const seen = new Set<number>([from]);
      const queue = [from];
      while (queue.length) {
        const cur = queue.shift()!;
        for (const nb of RAIL_ADJ[cur]!) {
          if (seen.has(nb)) continue;
          seen.add(nb);
          if (!s.board[nb]) queue.push(nb); // 空站才可作为中转
          land(nb);
        }
      }
    } else {
      // 其余棋子：只能沿铁路直线行进，不能转直角弯
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

export function legalJunqiActions(s: JunqiState): JqMove[] {
  if (s.phase !== "playing") return [];
  const out: JqMove[] = [];
  for (let i = 0; i < JQ_CELLS; i++) {
    if (!pieceMovable(s, i, s.turn)) continue;
    for (const to of legalJunqiTargets(s, i, s.turn)) out.push({ type: "move", from: i, to });
  }
  return out;
}

type CombatResult = "attacker-dies" | "defender-dies" | "both-die" | "flag-captured";

/** 程序裁判：只依赖两枚棋子的真值，结果对外只以文字公布 */
export function resolveJunqiCombat(attacker: JqPiece, defender: JqPiece): CombatResult {
  if (defender.kind === "flag") return "flag-captured"; // 含炸弹炸旗：同归于尽但扛旗成功
  if (attacker.kind === "bomb" || defender.kind === "bomb") return "both-die";
  if (defender.kind === "mine") {
    if (attacker.kind === "soldier" && attacker.rank === 1) return "defender-dies"; // 工兵挖雷
    return "attacker-dies"; // 其它棋子踩雷阵亡，地雷保留
  }
  if (attacker.rank > defender.rank) return "defender-dies";
  if (attacker.rank === defender.rank) return "both-die";
  return "attacker-dies";
}

const COMBAT_TEXT: Record<CombatResult, string> = {
  "attacker-dies": "攻方阵亡",
  "defender-dies": "守方阵亡，攻方占领",
  "both-die": "双方同归于尽",
  "flag-captured": "扛旗成功",
};

function applyMove(s: JunqiState, from: number, to: number): JunqiState {
  const legal = legalJunqiTargets(s, from, s.turn);
  if (!legal.includes(to)) return s;
  const board = s.board.slice();
  const attacker = board[from]!;
  const defender = board[to];
  board[from] = null;
  let combat: CombatResult | null = null;
  let winner: JqSide | "draw" | null = null;
  let quietMoves = s.quietMoves + 1;
  const flagRevealed = { ...s.flagRevealed };
  const commandDead = { ...s.commandDead };
  const notes: string[] = [`${sideName(s.turn)}方 行棋`];

  if (!defender) {
    board[to] = attacker;
  } else {
    combat = resolveJunqiCombat(attacker, defender);
    quietMoves = 0;
    if (combat === "attacker-dies") board[to] = defender;
    else if (combat === "defender-dies" || combat === "flag-captured") board[to] = attacker;
    else board[to] = null;
    notes.push(`${sideName(s.turn)}方 交战 · ${COMBAT_TEXT[combat]}`);
    if (combat === "flag-captured") {
      winner = attacker.side;
      notes.push(`${sideName(winner)}方夺得军旗，对局结束`);
    }
    // 司令阵亡，军旗亮开
    const attackerDead = combat === "attacker-dies" || combat === "both-die";
    const defenderDead = combat !== "attacker-dies";
    if (attackerDead && attacker.kind === "soldier" && attacker.rank === 9) {
      commandDead[attacker.side] = true;
      flagRevealed[attacker.side] = true;
      notes.push(`${sideName(attacker.side)}方司令阵亡，军旗位置公开`);
    }
    if (defenderDead && defender.kind === "soldier" && defender.rank === 9) {
      commandDead[defender.side] = true;
      flagRevealed[defender.side] = true;
      notes.push(`${sideName(defender.side)}方司令阵亡，军旗位置公开`);
    }
  }

  const next: JunqiState = {
    ...s,
    board,
    turn: otherJq(s.turn),
    winner,
    phase: winner ? "over" : "playing",
    log: s.log.concat(notes).slice(-40),
    lastMove: { from, to },
    moves: s.moves + 1,
    quietMoves,
    flagRevealed,
    commandDead,
  };
  if (next.phase === "playing") {
    if (quietMoves >= JQ_DRAW_QUIET) {
      next.winner = "draw";
      next.phase = "over";
      next.log = next.log.concat([`连续 ${JQ_DRAW_QUIET} 步无吃子，判和`]).slice(-40);
    } else if (legalJunqiActions(next).length === 0) {
      // 轮到走棋的一方无棋可走判负
      next.winner = otherJq(next.turn);
      next.phase = "over";
      next.log = next.log.concat([`${sideName(next.turn)}方无棋可走，判负`]).slice(-40);
    }
  }
  return next;
}

export function applyJunqiAction(s: JunqiState, action: JqAction): JunqiState {
  if (action.type === "move") return applyMove(s, action.from, action.to);
  if (s.phase !== "setup") return s;

  if (action.type === "swap") {
    const { a, b } = action;
    if (a === b || !JQ_SETUP_SET.red.has(a) || !JQ_SETUP_SET.red.has(b)) return s;
    const board = s.board.slice();
    const tmp = board[a] ?? null;
    board[a] = board[b] ?? null;
    board[b] = tmp;
    return { ...s, board, log: s.log.concat(["布阵：交换两枚棋子的位置"]).slice(-40) };
  }
  if (action.type === "random") {
    const rng = createRng(s.rngState);
    const red = buildSetup("red", rng, false);
    const board = s.board.slice();
    JQ_SETUP_POINTS.red.forEach((p, k) => { board[p] = red[k] ?? null; });
    return {
      ...s,
      board,
      rngState: nextSeed(s.rngState),
      log: s.log.concat(["布阵：已重新随机生成合法阵型"]).slice(-40),
    };
  }
  if (action.type === "start") {
    if (junqiSetupErrors(s).length) return s;
    return {
      ...s,
      phase: "playing",
      turn: "red",
      log: s.log.concat(["布阵完成，红方先手，程序担任裁判"]).slice(-40),
    };
  }
  return s;
}

/* ---------------- 暗棋信息隔离 ---------------- */

export type JqVisible = { piece: JqPiece; hidden: boolean };

/**
 * 视图取子：暗棋模式下只公开己方棋子与「司令阵亡后亮开的军旗」，
 * 敌方其余棋子一律返回 hidden=true（不暴露军衔 / 兵种）。
 */
export function junqiVisible(s: JunqiState, i: number, viewer: JqSide, dark: boolean): JqVisible | null {
  const p = s.board[i];
  if (!p) return null;
  if (!dark || p.side === viewer) return { piece: p, hidden: false };
  if (p.kind === "flag" && s.flagRevealed[p.side]) return { piece: p, hidden: false };
  return { piece: p, hidden: true };
}

/* ---------------- AI ---------------- */

/** AI 一律把敌方未公开的子当作「未知子力」估算，不读取其真实军衔 */
const UNKNOWN_RANK = 5;

function pieceValue(p: JqPiece): number {
  if (p.kind === "flag") return 1000;
  if (p.kind === "mine") return 6;
  if (p.kind === "bomb") return 12;
  return 2 + p.rank * 1.6;
}

function scoreMove(s: JunqiState, m: JqMove, rng: Rng, level: number): number {
  const attacker = s.board[m.from]!;
  const target = s.board[m.to];
  const toRow = jqRow(m.to);
  const advance = toRow - jqRow(m.from); // AI 执黑时向下推进；执红时取反
  const dir = attacker.side === "black" ? 1 : -1;
  let score = 0;

  // 位置价值：向前推进、靠近对方端线、占据行营 / 铁路
  score += advance * dir * 0.7;
  score += (attacker.side === "black" ? toRow : 11 - toRow) * 0.35;
  if (JQ_CAMP_SET.has(m.to)) score += 2.5;
  if (JQ_RAIL_NODES.has(m.to)) score += 1.2;
  if (JQ_HQ_SET.has(m.to)) score += 4;

  if (target) {
    // 暗棋隔离：只有「司令阵亡后公开的军旗」才是已知目标（裁判已公开的信息），
    // 其余敌方棋子一律按 UNKNOWN_RANK 估算，绝不读取真实军衔 / 兵种。
    const publicFlag = s.flagRevealed[target.side] && JQ_HQ_SET.has(m.to) && target.kind === "flag";
    const estimated = publicFlag ? 0 : UNKNOWN_RANK;
    const myRank = attacker.kind === "soldier" ? attacker.rank : UNKNOWN_RANK;
    if (publicFlag) score += 400;
    if (attacker.kind === "bomb") {
      score += publicFlag ? 200 : 4 - pieceValue(attacker) * 0.5; // 炸弹留给大子 / 军旗
    } else if (myRank >= 7) {
      score += 5 + (estimated <= 5 ? 3 : 0); // 大子主动试探
    } else if (attacker.kind === "soldier" && attacker.rank === 1) {
      // 工兵：敌方后两线的未明子疑似地雷，值得挖；其余不硬碰
      const enemySide = attacker.side === "black" ? "red" : "black";
      const suspectMine = jqLocalRow(enemySide, m.to) >= 5;
      score += suspectMine ? 9 : -3;
    } else {
      score += publicFlag ? 100 : -1 + (myRank - estimated) * 0.6;
    }
    if (JQ_HQ_SET.has(m.to) && !publicFlag) score += 6; // 大本营可能是军旗
  }
  // 避免把军旗旁的地雷 / 大子无谓送掉
  if (attacker.kind === "soldier" && attacker.rank === 9 && target) score -= 2;
  const noise = level === 1 ? 14 : level === 2 ? 4 : 1.2;
  return score + rng() * noise;
}

/**
 * AI 走子。level 1 偏随机、2 启发式、3 更贪心且带一层「送子」惩罚。
 * 只读取公开信息（棋子是否存在、公开的军旗、己方真值），不偷看暗棋。
 */
export function chooseJunqiAction(s: JunqiState, seed = 1, level = 2): JqMove | null {
  if (s.phase !== "playing") return null;
  const moves = legalJunqiActions(s);
  if (!moves.length) return null;
  const rng = createRng((s.rngState ^ Math.imul(seed | 0, 2654435761) ^ Math.imul(s.moves + 1, 40503)) | 0);
  let best = -Infinity;
  let picks: JqMove[] = [];
  for (const m of moves) {
    let score = scoreMove(s, m, rng, level);
    if (level >= 3 && s.board[m.to]) {
      // 困难档更保守：不拿大子 / 炸弹去撞未知子（仍不读取敌方真值）
      const a = s.board[m.from]!;
      if (a.kind === "soldier" && a.rank >= 8) score -= 3;
      if (a.kind === "bomb") score -= 2;
    }
    if (score > best + 0.001) { best = score; picks = [m]; }
    else if (score >= best - 0.001) picks.push(m);
  }
  return picks[Math.floor(rng() * picks.length)] ?? moves[0]!;
}

/* ---------------- 状态与存档 ---------------- */

export function junqiStatusText(s: JunqiState): string {
  if (s.phase === "setup") return "布阵阶段 · 摆放 25 枚棋子后开战";
  if (s.phase === "over") {
    if (s.winner === "draw") return "和棋";
    return `${sideName(s.winner as JqSide)}方获胜`;
  }
  return `${sideName(s.turn)}方行棋 · 第 ${s.moves + 1} 手`;
}

export function reviveJunqi(raw: unknown): JunqiState | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<JunqiState>;
  if (!Array.isArray(s.board) || s.board.length !== JQ_CELLS) return null;
  if (s.turn !== "red" && s.turn !== "black") return null;
  if (s.phase !== "setup" && s.phase !== "playing" && s.phase !== "over") return null;
  if (typeof s.moves !== "number" || typeof s.quietMoves !== "number") return null;
  const validPiece = (p: unknown): p is JqPiece => {
    if (!p || typeof p !== "object") return false;
    const x = p as Partial<JqPiece>;
    return (x.side === "red" || x.side === "black") &&
      (x.kind === "soldier" || x.kind === "mine" || x.kind === "bomb" || x.kind === "flag") &&
      typeof x.rank === "number" && typeof x.name === "string";
  };
  if (!s.board.every((p) => p === null || validPiece(p))) return null;
  return {
    board: s.board,
    turn: s.turn,
    phase: s.phase,
    winner: s.winner === "red" || s.winner === "black" || s.winner === "draw" ? s.winner : null,
    log: Array.isArray(s.log) ? s.log.filter((x): x is string => typeof x === "string").slice(-40) : [],
    lastMove: s.lastMove && typeof s.lastMove.from === "number" && typeof s.lastMove.to === "number"
      ? s.lastMove : null,
    moves: s.moves,
    quietMoves: s.quietMoves,
    flagRevealed: { red: !!s.flagRevealed?.red, black: !!s.flagRevealed?.black },
    commandDead: { red: !!s.commandDead?.red, black: !!s.commandDead?.black },
    seed: typeof s.seed === "number" ? s.seed : 1,
    rngState: typeof s.rngState === "number" ? s.rngState : 1,
  };
}

/**
 * 1024 数字合并：无 DOM / 无框架依赖的纯逻辑，Web 与小程序共用。
 *
 * 约定：
 * - 状态是可 JSON 序列化的普通对象，随机数种子 rngState 随状态一起保存，
 *   因此撤销 / 读档之后的生成序列与原始局完全一致（每日固定种子可复现）。
 * - move() 就地修改 state，返回本次移动的事件描述（供 Web 做位移动画、做连击反馈）。
 *   调用方要撤销时，先 cloneState(state) 存快照，再调用 move()。
 * - 不依赖 localStorage / wx.* / window.*，存储与输入由各端自己接。
 */

export const GAME_SIZE = 4;
export const WIN_VALUE = 1024;
export const MILESTONES = [64, 128, 256, 512, 1024, 2048, 4096];
export const MAX_UNDOS = 3;

export type Direction = "left" | "right" | "up" | "down";
export type Tile = { id: number; value: number };
export type Grid = (Tile | null)[][];
export type Position = { r: number; c: number };

/** 一块旧数字从 from 滑到 to；merged=true 表示它参与合并，旧块会在动画后移除 */
export type TilePath = { id: number; value: number; from: Position; to: Position; merged: boolean };
export type SpawnInfo = { id: number; value: number; r: number; c: number };

export type GameState = {
  size: number;
  grid: Grid;
  score: number;
  best: number;
  moves: number;
  maxTile: number;
  won: boolean;
  keepPlaying: boolean;
  over: boolean;
  nextTile: 2 | 4;
  rngState: number;
  seq: number;
  celebrated: number[];
  seed: number;
};

export type MoveResult = {
  moved: boolean;
  paths: TilePath[];
  mergedIds: number[];
  spawn: SpawnInfo | null;
  gained: number;
  comboBonus: number;
  total: number;
  mergeCount: number;
  milestone: number | null;
  wonFirst: boolean;
  over: boolean;
};

const DIRECTIONS: Direction[] = ["left", "right", "up", "down"];

function emptyGrid(size: number): Grid {
  return Array.from({ length: size }, () => new Array<Tile | null>(size).fill(null));
}

function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => row.map((t) => (t ? { id: t.id, value: t.value } : null)));
}

export function cloneState(s: GameState): GameState {
  return {
    size: s.size,
    grid: cloneGrid(s.grid),
    score: s.score,
    best: s.best,
    moves: s.moves,
    maxTile: s.maxTile,
    won: s.won,
    keepPlaying: s.keepPlaying,
    over: s.over,
    nextTile: s.nextTile,
    rngState: s.rngState,
    seq: s.seq,
    celebrated: s.celebrated.slice(),
    seed: s.seed,
  };
}

/** xorshift32：比 Math.random 好，因为状态可序列化、可撤销、可复现 */
function nextRandom(s: GameState): number {
  let x = s.rngState | 0;
  if (x === 0) x = 0x9e3779b9;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  s.rngState = x | 0;
  return (x >>> 0) / 4294967296;
}

/** FNV-1a：把日期字符串等任意文本变成稳定种子 */
export function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h | 0) || 1;
}

function emptyCells(grid: Grid): Position[] {
  const out: Position[] = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid.length; c++) {
      if (!grid[r][c]) out.push({ r, c });
    }
  }
  return out;
}

export function emptyCount(s: GameState): number {
  return emptyCells(s.grid).length;
}

export function maxValue(grid: Grid): number {
  let m = 0;
  for (const row of grid) {
    for (const t of row) if (t && t.value > m) m = t.value;
  }
  return m;
}

export function canMove(s: GameState): boolean {
  const g = s.grid;
  const n = s.size;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const t = g[r][c];
      if (!t) return true;
      if (c + 1 < n && g[r][c + 1] && g[r][c + 1]!.value === t.value) return true;
      if (r + 1 < n && g[r + 1][c] && g[r + 1][c]!.value === t.value) return true;
    }
  }
  return false;
}

function spawn(s: GameState, value: number): SpawnInfo | null {
  const cells = emptyCells(s.grid);
  if (!cells.length) return null;
  let pick = Math.floor(nextRandom(s) * cells.length);
  if (pick >= cells.length) pick = cells.length - 1;
  const pos = cells[pick];
  const id = ++s.seq;
  s.grid[pos.r][pos.c] = { id, value };
  return { id, value, r: pos.r, c: pos.c };
}

/** 90% 出 2，10% 出 4 —— 与 2048 的经典手感一致 */
function rollNext(s: GameState): 2 | 4 {
  return nextRandom(s) < 0.9 ? 2 : 4;
}

export function createGame(seed: number, best = 0): GameState {
  const initial = (seed | 0) || 1;
  const s: GameState = {
    size: GAME_SIZE,
    grid: emptyGrid(GAME_SIZE),
    score: 0,
    best,
    moves: 0,
    maxTile: 0,
    won: false,
    keepPlaying: false,
    over: false,
    nextTile: 2,
    rngState: initial,
    seq: 0,
    celebrated: [],
    seed: initial,
  };
  spawn(s, rollNext(s));
  spawn(s, rollNext(s));
  s.nextTile = rollNext(s);
  s.maxTile = maxValue(s.grid);
  return s;
}

/** 读档兜底：结构不合法就返回 null，调用方直接开新局 */
export function reviveState(raw: unknown): GameState | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<GameState>;
  if (!Array.isArray(s.grid) || s.grid.length !== GAME_SIZE) return null;
  if (!s.grid.every((row) => Array.isArray(row) && row.length === GAME_SIZE)) return null;
  if (typeof s.score !== "number" || typeof s.rngState !== "number") return null;
  return {
    size: GAME_SIZE,
    grid: cloneGrid(s.grid as Grid),
    score: s.score,
    best: typeof s.best === "number" ? s.best : 0,
    moves: typeof s.moves === "number" ? s.moves : 0,
    maxTile: maxValue(s.grid as Grid),
    won: !!s.won,
    keepPlaying: !!s.keepPlaying,
    over: !!s.over,
    nextTile: s.nextTile === 4 ? 4 : 2,
    rngState: s.rngState,
    seq: typeof s.seq === "number" ? s.seq : 999,
    celebrated: Array.isArray(s.celebrated) ? s.celebrated.slice() : [],
    seed: typeof s.seed === "number" ? s.seed : s.rngState,
  };
}

/** 每条 line 从「移动方向指向的那一侧」开始遍历 */
function traversal(dir: Direction, size: number): Position[][] {
  const out: Position[][] = [];
  for (let i = 0; i < size; i++) {
    const line: Position[] = [];
    for (let j = 0; j < size; j++) {
      let r: number;
      let c: number;
      if (dir === "left") { r = i; c = j; }
      else if (dir === "right") { r = i; c = size - 1 - j; }
      else if (dir === "up") { r = j; c = i; }
      else { r = size - 1 - j; c = i; }
      line.push({ r, c });
    }
    out.push(line);
  }
  return out;
}

function emptyResult(): MoveResult {
  return {
    moved: false, paths: [], mergedIds: [], spawn: null,
    gained: 0, comboBonus: 0, total: 0, mergeCount: 0,
    milestone: null, wonFirst: false, over: false,
  };
}

/**
 * 执行一次移动。无效方向 / 无效移动 / 已结束的局都返回 moved:false，
 * 且保证 state 完全不变（分数、随机序列、seq 都不动）。
 */
export function move(s: GameState, dir: Direction): MoveResult {
  const res = emptyResult();
  if (s.over || (s.won && !s.keepPlaying)) return res;
  if (DIRECTIONS.indexOf(dir) < 0) return res;

  const size = s.size;
  const before = cloneGrid(s.grid);
  const grid = emptyGrid(size);
  let seq = s.seq;
  let gained = 0;
  let mergeCount = 0;
  const paths: TilePath[] = [];
  const mergedIds: number[] = [];

  traversal(dir, size).forEach((line) => {
    const tiles: Array<{ id: number; value: number; from: Position }> = [];
    line.forEach((p) => {
      const t = before[p.r][p.c];
      if (t) tiles.push({ id: t.id, value: t.value, from: p });
    });

    let target = 0;
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      const dest = line[target];
      let cell: Tile = { id: t.id, value: t.value };
      let merged = false;

      // 一对只合并一次：新生成的块本回合不参与下一次判定（禁止链式合并）
      if (i + 1 < tiles.length && tiles[i + 1].value === t.value) {
        const other = tiles[i + 1];
        cell = { id: ++seq, value: t.value * 2 };
        mergedIds.push(cell.id);
        gained += cell.value;
        mergeCount++;
        merged = true;
        paths.push({ id: other.id, value: other.value, from: other.from, to: dest, merged: true });
        i++;
      }
      grid[dest.r][dest.c] = cell;
      paths.push({ id: t.id, value: t.value, from: t.from, to: dest, merged });
      target++;
    }
  });

  const moved = paths.some(
    (p) => p.merged || p.from.r !== p.to.r || p.from.c !== p.to.c,
  );
  if (!moved) return res;

  const comboBonus = mergeCount >= 2 ? Math.round(gained * 0.2 * (mergeCount - 1)) : 0;
  const total = gained + comboBonus;

  s.grid = grid;
  s.seq = seq;
  s.score += total;
  s.best = Math.max(s.best, s.score);
  s.moves += 1;

  res.spawn = spawn(s, s.nextTile);
  s.nextTile = rollNext(s);
  s.maxTile = maxValue(s.grid);

  for (const m of MILESTONES) {
    if (s.maxTile >= m && s.celebrated.indexOf(m) < 0) {
      s.celebrated.push(m);
      res.milestone = m;
      break;
    }
  }
  if (s.maxTile >= WIN_VALUE && !s.won) {
    s.won = true;
    res.wonFirst = true;
  }
  s.over = !canMove(s);

  res.moved = true;
  res.paths = paths;
  res.mergedIds = mergedIds;
  res.gained = gained;
  res.comboBonus = comboBonus;
  res.total = total;
  res.mergeCount = mergeCount;
  res.over = s.over;
  return res;
}

/** 可复制的成绩单（Wordle 式纯文本方格），Web 剪贴板与小程序 setClipboardData 共用 */
export function scoreSheet(s: GameState, title: string): string {
  const lines = [
    `【${title}】`,
    `分数 ${s.score} · 最大 ${s.maxTile} · ${s.moves} 步${s.won ? " · 已通关" : ""}`,
    `┌${"─".repeat(20)}┐`,
  ];
  for (const row of s.grid) {
    lines.push(`│${row.map((t) => `${String(t ? t.value : ".").padStart(4, " ")} `).join("")}│`);
  }
  lines.push(`└${"─".repeat(20)}┘`, "敢不敢来合到 1024？");
  return lines.join("\n");
}

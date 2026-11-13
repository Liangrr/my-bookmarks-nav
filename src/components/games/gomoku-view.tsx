"use client";

import {
  applyGomokuMove,
  chooseGomokuMove,
  createGomokuGame,
  gCol,
  gomokuStatusText,
  gRow,
  reviveGomoku,
  stoneName,
  GOMOKU_CELLS,
  GOMOKU_SIZE,
  type GomokuState,
} from "@shared-lib/gomoku";
import { GameFrame } from "./game-frame";
import { useBoardGame, type BoardGameAdapter } from "./use-board-game";

const ADAPTER: BoardGameAdapter<GomokuState, number> = {
  storageKey: "games.gomoku.web.v1",
  playerSide: "1",
  aiSide: "2",
  create: (seed) => createGomokuGame(seed),
  revive: reviveGomoku,
  isOver: (s) => s.status !== "playing",
  turnOf: (s) => String(s.turn),
  apply: applyGomokuMove,
  ai: (s, level, seed) => chooseGomokuMove(s, level <= 1 ? 1 : 2, seed),
};

const STARS = new Set(
  [3, 7, 11].flatMap((r) => [3, 7, 11].map((c) => r * GOMOKU_SIZE + c)),
);

export default function GomokuView() {
  const g = useBoardGame(ADAPTER);
  const { state, mode } = g;
  const winSet = new Set(state.winnerLine);

  function onCell(i: number) {
    if (!g.playerTurn || state.status !== "playing" || state.board[i] !== 0) return;
    g.commit(i);
  }

  const cells = [];
  for (let i = 0; i < GOMOKU_CELLS; i++) {
    const v = state.board[i];
    cells.push(
      <button
        key={i}
        className="go-cell"
        onClick={() => onCell(i)}
        aria-label={`${gRow(i)}行${gCol(i)}列${v ? stoneName(v) + "子" : "空"}`}
      >
        {STARS.has(i) ? <span className="go-star" /> : null}
        {v !== 0 ? (
          <span className={`go-stone ${v === 1 ? "black" : "white"}${state.last === i ? " last" : ""}${winSet.has(i) ? " win" : ""}`} />
        ) : null}
      </button>,
    );
  }

  const status = gomokuStatusText(state) + (mode === "ai" ? " · 你执黑" : " · 双人轮下");

  return (
    <GameFrame
      title="五子棋"
      subtitle="15×15 自由规则 · 连五判胜 · 会堵活三的 AI"
      status={status}
      mode={g.mode}
      onMode={g.setMode}
      level={g.level}
      onLevel={g.setLevel}
      canUndo={g.canUndo}
      onUndo={g.undo}
      onRestart={g.restart}
      aiThinking={g.aiThinking}
      overText={state.status === "playing" ? "" : gomokuStatusText(state)}
      aside={
        <>
          <h3>对局信息</h3>
          <p className="games-captured">
            已下 {state.history.length} 手<br />
            最后一手：{state.last === null ? "—" : `${gRow(state.last) + 1} 行 ${gCol(state.last) + 1} 列`}<br />
            当前：<b>{state.turn === 1 ? "黑" : "白"}</b> 方
          </p>
          <h3>提示</h3>
          <p className="games-captured">先连成五子者胜。AI 会同时权衡自己的进攻与你的威胁，普通档还会预演你下一手的最强反击。</p>
        </>
      }
      rules={
        <ul>
          <li>15×15 棋盘，黑先白后，任意方向（横、竖、斜）先连成 5 子以上即获胜。</li>
          <li>采用自由规则：无禁手，黑方三三、四四、长连均允许；棋盘下满未分胜负则和棋。</li>
          <li>人机模式你执黑；切换「双人」可同屏轮流落子。撤销在人机模式会退回你的上一手。</li>
          <li>AI 依据连子数与两端开放度评分，并对候选点做一层对手反制；简单档只看直接评分。</li>
        </ul>
      }
    >
      <div className="go-board">
        <div className="go-grid">{cells}</div>
      </div>
    </GameFrame>
  );
}

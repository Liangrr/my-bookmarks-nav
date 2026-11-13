"use client";

import { useState, type ReactNode } from "react";
import {
  applyXiangqiMove,
  chooseXiangqiMove,
  createXiangqiGame,
  legalMovesFor,
  pieceName,
  reviveXiangqi,
  xiangqiStatusText,
  XQ_COLS,
  XQ_ROWS,
  type XiangqiMove,
  type XiangqiState,
} from "@shared-lib/xiangqi";
import { GameFrame } from "./game-frame";
import { useBoardGame, type BoardGameAdapter } from "./use-board-game";

const ADAPTER: BoardGameAdapter<XiangqiState, XiangqiMove> = {
  storageKey: "games.xiangqi.web.v1",
  playerSide: "red",
  aiSide: "black",
  create: (seed) => createXiangqiGame(seed),
  revive: reviveXiangqi,
  isOver: (s) => s.status !== "playing",
  turnOf: (s) => s.turn,
  apply: applyXiangqiMove,
  ai: (s, level, seed) => chooseXiangqiMove(s, level, seed),
};

/** 棋盘线：viewBox 与 9 列×10 行的格子中心对齐（x=c+0.5, y=r+0.5） */
function BoardLines() {
  const lines: ReactNode[] = [];
  for (let r = 0; r < XQ_ROWS; r++) {
    lines.push(<line key={`h${r}`} x1={0.5} y1={r + 0.5} x2={8.5} y2={r + 0.5} />);
  }
  for (let c = 0; c < XQ_COLS; c++) {
    if (c === 0 || c === 8) {
      lines.push(<line key={`v${c}`} x1={c + 0.5} y1={0.5} x2={c + 0.5} y2={9.5} />);
    } else {
      lines.push(<line key={`v${c}a`} x1={c + 0.5} y1={0.5} x2={c + 0.5} y2={4.5} />);
      lines.push(<line key={`v${c}b`} x1={c + 0.5} y1={5.5} x2={c + 0.5} y2={9.5} />);
    }
  }
  lines.push(<line key="p1" x1={3.5} y1={0.5} x2={5.5} y2={2.5} className="xq-palace" />);
  lines.push(<line key="p2" x1={5.5} y1={0.5} x2={3.5} y2={2.5} className="xq-palace" />);
  lines.push(<line key="p3" x1={3.5} y1={7.5} x2={5.5} y2={9.5} className="xq-palace" />);
  lines.push(<line key="p4" x1={5.5} y1={7.5} x2={3.5} y2={9.5} className="xq-palace" />);
  return (
    <svg className="xq-lines" viewBox="0 0 9 10" preserveAspectRatio="none" aria-hidden="true">
      <g>{lines}</g>
    </svg>
  );
}

export default function XiangqiView() {
  const g = useBoardGame(ADAPTER);
  const [selected, setSelected] = useState<number | null>(null);
  const { state, mode } = g;
  const activeSide = mode === "ai" ? "red" : state.turn;
  const targets = selected === null
    ? []
    : legalMovesFor(state.board, state.turn, selected).map((m) => m.to);
  const targetSet = new Set(targets);
  const last = state.lastMove;

  function onCell(i: number) {
    if (!g.playerTurn || state.status !== "playing") return;
    const p = state.board[i];
    if (selected !== null && targetSet.has(i)) {
      g.commit({ from: selected, to: i });
      setSelected(null);
      return;
    }
    setSelected(p && p.side === activeSide ? i : null);
  }

  const cells = [];
  for (let r = 0; r < XQ_ROWS; r++) {
    for (let c = 0; c < XQ_COLS; c++) {
      const i = r * XQ_COLS + c;
      const p = state.board[i];
      const hint = targetSet.has(i);
      cells.push(
        <button
          key={i}
          className={`xq-cell${hint ? " hint" : ""}`}
          style={{ gridRow: r + 1, gridColumn: c + 1 }}
          onClick={() => onCell(i)}
          aria-label={`${r}行${c}列${p ? pieceName(p) : "空"}`}
        >
          {!p && hint ? <span className="xq-dot" /> : null}
          {p ? (
            <span className={`xq-piece ${p.side}${selected === i ? " sel" : ""}${last?.to === i ? " last" : ""}`}>
              {pieceName(p)}
            </span>
          ) : null}
          {p && hint ? <span className="xq-capture" /> : null}
        </button>,
      );
    }
  }

  const status = xiangqiStatusText(state) +
    (mode === "ai" ? " · 你执红" : " · 双人轮下") +
    (state.check ? "（被将军）" : "");

  return (
    <GameFrame
      title="中国象棋"
      subtitle="完整走法 · 将死判定 · 中文棋谱 · 三档 AI"
      status={status}
      mode={g.mode}
      onMode={(m) => { g.setMode(m); setSelected(null); }}
      level={g.level}
      onLevel={g.setLevel}
      canUndo={g.canUndo}
      onUndo={() => { g.undo(); setSelected(null); }}
      onRestart={() => { g.restart(); setSelected(null); }}
      aiThinking={g.aiThinking}
      overText={state.status === "playing" ? "" : xiangqiStatusText(state)}
      aside={
        <>
          <h3>棋谱 · 第 {state.history.length} 手</h3>
          <div className="games-notes">
            {state.notes.length === 0 ? <span className="games-empty">尚无着法，红方先走</span> :
              state.notes.slice(-16).map((n, k) => (
                <span key={k} className={k % 2 === 0 ? "red" : "black"}>{n}</span>
              ))}
          </div>
          <h3>被吃棋子</h3>
          <p className="games-captured">
            红 {state.captured.red.map(pieceLabel).join(" ") || "—"}<br />
            黑 {state.captured.black.map(pieceLabel).join(" ") || "—"}
          </p>
        </>
      }
      rules={
        <ul>
          <li>红先黑后，点击己方棋子后高亮可落点，再点目标落子；人机模式你执红。</li>
          <li>车走直线、马蹩腿、象塞眼且不过河、士将限九宫、炮须隔一子才能吃、兵过河可横走。</li>
          <li>将帅照面（飞将）判将军；走后自己被将军的着法一律禁止。将死或困毙即告负。</li>
          <li>棋谱为简化中文记法（如「炮二平五」），不区分同名子的前/后；连续 120 回合无吃子判和。</li>
          <li>AI 用 Alpha-Beta 搜索，困难档思考更久；人机模式撤销会一次性退回你的上一手。</li>
        </ul>
      }
    >
      <div className="xq-board">
        <BoardLines />
        <span className="xq-river">楚 河 · 汉 界</span>
        <div className="xq-grid">{cells}</div>
      </div>
    </GameFrame>
  );
}

function pieceLabel(t: string): string {
  const map: Record<string, string> = {
    K: "帅/将", A: "仕/士", B: "相/象", N: "马", R: "车", C: "炮", P: "兵/卒",
  };
  return map[t] ?? t;
}


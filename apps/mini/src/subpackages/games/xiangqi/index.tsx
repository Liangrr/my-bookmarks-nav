import { View, Text } from "@tarojs/components";
import { useState } from "react";
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
import { GameFrame } from "../frame";
import { useBoardGame, type BoardGameAdapter } from "../use-board-game";

const ADAPTER: BoardGameAdapter<XiangqiState, XiangqiMove> = {
  storageKey: "games.xiangqi.mini.v1",
  playerSide: "red",
  aiSide: "black",
  create: (seed) => createXiangqiGame(seed),
  revive: reviveXiangqi,
  isOver: (s) => s.status !== "playing",
  turnOf: (s) => s.turn,
  apply: applyXiangqiMove,
  // 小程序 JS 线程没有 Web Worker，困难档搜索会卡 UI，这里封顶普通档
  ai: (s, level, seed) => chooseXiangqiMove(s, Math.min(level, 2), seed),
};

const RULES = [
  "红先黑后，点己方棋子后高亮可落点，再点目标落子；人机模式你执红。",
  "车走直线、马蹩腿、象塞眼且不过河、士将限九宫、炮须隔一子才能吃、兵过河可横走。",
  "将帅照面判将军；走后自己被将军的着法一律禁止。将死或困毙即告负。",
  "棋谱为简化中文记法（如「炮二平五」），不区分同名子的前 / 后。",
  "小程序端为控制耗时，AI 最高开放到普通档；网页端另有困难档。",
];

export default function XiangqiPage() {
  const g = useBoardGame(ADAPTER);
  const [selected, setSelected] = useState<number | null>(null);
  const { state, mode } = g;
  const activeSide = mode === "ai" ? "red" : state.turn;
  const targets = selected === null
    ? []
    : legalMovesFor(state.board, state.turn, selected).map((m) => m.to);
  const targetSet = new Set(targets);

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

  // 按列渲染 flex，避免依赖小程序对 CSS Grid 的兼容性
  const columns = [];
  for (let c = 0; c < XQ_COLS; c++) {
    const rows = [];
    for (let r = 0; r < XQ_ROWS; r++) {
      const i = r * XQ_COLS + c;
      const p = state.board[i];
      const hint = targetSet.has(i);
      rows.push(
        <View key={i} className="gm-xq-cell" onClick={() => onCell(i)}>
          <View className="gm-xq-hline" />
          <View className="gm-xq-vline" />
          {hint && !p ? <View className="gm-xq-dot" /> : null}
          {p ? (
            <View className={`gm-xq-piece ${p.side}${selected === i ? " sel" : ""}${state.lastMove?.to === i ? " last" : ""}`}>
              <Text className="gm-xq-piece-text">{pieceName(p)}</Text>
            </View>
          ) : null}
          {hint && p ? <View className="gm-xq-cap" /> : null}
        </View>,
      );
    }
    columns.push(<View key={c} className="gm-xq-col">{rows}</View>);
  }

  const status = xiangqiStatusText(state) + (mode === "ai" ? " · 你执红" : " · 双人轮下");

  return (
    <GameFrame
      title="中国象棋"
      subtitle="完整走法 · 将死判定 · 中文棋谱 · AI"
      status={status}
      rules={RULES}
      mode={g.mode}
      onMode={(m) => { g.setMode(m); setSelected(null); }}
      level={g.level}
      onLevel={g.setLevel}
      levels={[1, 2]}
      canUndo={g.canUndo}
      onUndo={() => { g.undo(); setSelected(null); }}
      onRestart={() => { g.restart(); setSelected(null); }}
      aiThinking={g.aiThinking}
      overText={state.status === "playing" ? "" : xiangqiStatusText(state)}
      aside={
        <View>
          <Text className="gm-aside-title">棋谱 · 第 {state.history.length} 手</Text>
          <View className="gm-notes">
            {state.notes.length === 0
              ? <Text className="gm-muted">尚无着法，红方先走</Text>
              : state.notes.slice(-14).map((n, k) => (
                <Text key={k} className={k % 2 === 0 ? "gm-note red" : "gm-note black"}>{n}</Text>
              ))}
          </View>
        </View>
      }
    >
      <View className="gm-xq-board">
        {columns}
        <View className="gm-xq-river"><Text className="gm-xq-river-text">楚 河 · 汉 界</Text></View>
      </View>
    </GameFrame>
  );
}

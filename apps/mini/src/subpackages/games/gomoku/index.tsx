import { View, Text } from "@tarojs/components";
import {
  applyGomokuMove,
  chooseGomokuMove,
  createGomokuGame,
  gCol,
  gomokuStatusText,
  gRow,
  reviveGomoku,
  GOMOKU_CELLS,
  GOMOKU_SIZE,
  type GomokuState,
} from "@shared-lib/gomoku";
import { GameFrame } from "../frame";
import { useBoardGame, type BoardGameAdapter } from "../use-board-game";

const ADAPTER: BoardGameAdapter<GomokuState, number> = {
  storageKey: "games.gomoku.mini.v1",
  playerSide: "1",
  aiSide: "2",
  create: (seed) => createGomokuGame(seed),
  revive: reviveGomoku,
  isOver: (s) => s.status !== "playing",
  turnOf: (s) => String(s.turn),
  apply: applyGomokuMove,
  ai: (s, level, seed) => chooseGomokuMove(s, level <= 1 ? 1 : 2, seed),
};

const RULES = [
  "15×15 棋盘，黑先白后，横、竖、斜任意方向先连成 5 子以上即获胜。",
  "自由规则：无禁手，黑方三三、四四、长连均允许；棋盘下满未分胜负判和。",
  "人机模式你执黑；切换双人可同屏轮流落子，撤销会退回你的上一手。",
  "AI 依据连子数与两端开放度评分并预演你的反击；简单档只看直接评分。",
];

const STARS = new Set([3, 7, 11].flatMap((r) => [3, 7, 11].map((c) => r * GOMOKU_SIZE + c)));

export default function GomokuPage() {
  const g = useBoardGame(ADAPTER);
  const { state, mode } = g;
  const winSet = new Set(state.winnerLine);

  function onCell(i: number) {
    if (!g.playerTurn || state.status !== "playing" || state.board[i] !== 0) return;
    g.commit(i);
  }

  const lines = [];
  for (let k = 0; k < GOMOKU_SIZE; k++) {
    const pos = ((k + 0.5) / GOMOKU_SIZE) * 100;
    lines.push(<View key={`h${k}`} className="gm-go-hline" style={{ top: `${pos}%` }} />);
    lines.push(<View key={`v${k}`} className="gm-go-vline" style={{ left: `${pos}%` }} />);
  }

  const cells = [];
  for (let i = 0; i < GOMOKU_CELLS; i++) {
    const v = state.board[i];
    cells.push(
      <View key={i} className="gm-go-cell" onClick={() => onCell(i)}>
        {STARS.has(i) ? <View className="gm-go-star" /> : null}
        {v !== 0 ? (
          <View className={`gm-go-stone ${v === 1 ? "black" : "white"}${state.last === i ? " last" : ""}${winSet.has(i) ? " win" : ""}`} />
        ) : null}
      </View>,
    );
  }

  const status = gomokuStatusText(state) + (mode === "ai" ? " · 你执黑" : " · 双人轮下");

  return (
    <GameFrame
      title="五子棋"
      subtitle="15×15 自由规则 · 连五判胜 · AI"
      status={status}
      rules={RULES}
      mode={g.mode}
      onMode={g.setMode}
      level={g.level}
      onLevel={g.setLevel}
      levels={[1, 2]}
      canUndo={g.canUndo}
      onUndo={g.undo}
      onRestart={g.restart}
      aiThinking={g.aiThinking}
      overText={state.status === "playing" ? "" : gomokuStatusText(state)}
      aside={
        <View>
          <Text className="gm-aside-title">对局信息</Text>
          <Text className="gm-aside-line">已下 {state.history.length} 手</Text>
          <Text className="gm-aside-line">
            最后一手：{state.last === null ? "—" : `${gRow(state.last) + 1} 行 ${gCol(state.last) + 1} 列`}
          </Text>
          <Text className="gm-aside-line">当前：{state.turn === 1 ? "黑" : "白"} 方</Text>
        </View>
      }
    >
      <View className="gm-go-board">
        {lines}
        <View className="gm-go-cells">{cells}</View>
      </View>
    </GameFrame>
  );
}

import { View, Text } from "@tarojs/components";
import { useState } from "react";
import {
  applyJunqiAction,
  chooseJunqiAction,
  createJunqiGame,
  JQ_CAMP_SET,
  JQ_CELLS,
  JQ_SETUP_SET,
  jqCol,
  jqRow,
  junqiSetupErrors,
  junqiStatusText,
  junqiVisible,
  legalJunqiTargets,
  reviveJunqi,
  type JqAction,
  type JqSide,
  type JunqiState,
} from "@shared-lib/junqi";
import { GameFrame } from "../frame";
import {
  BOARD_H,
  BOARD_W,
  CELL_H,
  CELL_W,
  JunqiBoardLines,
  px,
} from "../junqi-board-lines";
import { useBoardGame, type BoardGameAdapter } from "../use-board-game";

/** v2 存档键：改造前 6×4 翻棋的旧存档不会被误读 */
const ADAPTER: BoardGameAdapter<JunqiState, JqAction> = {
  storageKey: "games.junqi.mini.v2",
  playerSide: "red",
  aiSide: "black",
  create: (seed) => createJunqiGame(seed),
  revive: reviveJunqi,
  isOver: (s) => s.phase === "over",
  turnOf: (s) => s.turn,
  apply: applyJunqiAction,
  ai: (s, level, seed) => chooseJunqiAction(s, seed, level),
};

const RULES = [
  "标准两人陆战棋（军棋）· 暗棋 + 程序裁判，不是翻棋。军棋没有官方统一规则，本页采用最通行的竞赛口径（维基《陸軍棋》25 子编制、百度百科《四国军棋》布局与胜负、腾讯 QQ 军棋帮助的铁路/吃子规则）。",
  "棋盘 5 列 × 12 行，双方各 6 行：每方 5 个行营、23 个兵站、2 个大本营。前线只有左 / 中 / 右 3 条铁路通道可越，另 2 处是山界。",
  "每方 25 子：司令1 军长1 师长2 旅长2 团长2 营长2 连长3 排长3 工兵3 炸弹2 地雷3 军旗1；大吃小、同级同归于尽。",
  "布阵：行营留空；军旗必须放大本营；地雷只在最后两线；炸弹不在锋线。点两格互换，也可一键随机布阵。",
  "行棋：公路一步（含行营斜线）；铁路直线任意格、中间不得有子、不能转直角弯；工兵是唯一可沿铁路任意转弯的棋子。行营中的棋子不可被攻击；进入大本营的棋子永久冻结；军旗、地雷不可移动。",
  "开局节奏：双方 25 子摆满 25 个落点，除 10 个行营外没有空格，多数棋子开局只能先进相邻行营；前线只有左 / 中 / 右 3 条通道能接触敌方，需先把子力推到前线才会交战。带「攻」角标的格子＝可进攻的敌方棋子，「营」＝可进入的行营。",
  "裁判吃子：炸弹与任何棋子同归于尽（含军旗，炸旗即扛旗成功）；工兵挖雷存活、炸弹与地雷同归于尽、其它棋子碰地雷阵亡而地雷保留；司令阵亡亮开军旗。",
  "胜负：军旗被扛、轮到走棋一方无棋可走判负；连续 70 步无吃子判和。",
  "人机为暗棋，程序裁判只公布交战结果、不透露对方军衔，AI 也只按未知子力估算；双人模式为明棋。",
  "不采用的地方变体：翻棋、必须挖光 3 雷才能扛旗、任何棋子撞地雷同归于尽、炸弹可摆锋线、进入大本营后仍可移动。",
];

export default function JunqiPage() {
  const g = useBoardGame(ADAPTER);
  const [selected, setSelected] = useState<number | null>(null);
  const [swapFirst, setSwapFirst] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { state, mode } = g;
  const dark = mode === "ai";
  const viewer: JqSide = "red";
  const activeSide: JqSide = dark ? "red" : state.turn;
  const setup = state.phase === "setup";
  const errors = setup ? junqiSetupErrors(state) : [];
  const targets = selected === null || setup ? [] : legalJunqiTargets(state, selected, activeSide);
  const targetSet = new Set(targets);
  const attackSet = new Set(targets.filter((i) => !!state.board[i]));
  const campSet = new Set(targets.filter((i) => !state.board[i] && JQ_CAMP_SET.has(i)));
  const plainMoves = targets.length - attackSet.size - campSet.size;
  const picked = selected === null ? null : junqiVisible(state, selected, viewer, dark);
  const pickedName = picked && !picked.hidden ? picked.piece.name : "棋子";

  function resetSelection() {
    setSelected(null);
    setSwapFirst(null);
    setNotice(null);
  }

  function onCell(i: number) {
    if (!g.playerTurn || state.phase === "over") return;
    setNotice(null);
    if (setup) {
      if (!JQ_SETUP_SET.red.has(i)) return;
      if (swapFirst === null) { setSwapFirst(i); return; }
      if (swapFirst !== i) g.commit({ type: "swap", a: swapFirst, b: i });
      setSwapFirst(null);
      return;
    }
    if (selected !== null && targetSet.has(i)) {
      g.commit({ type: "move", from: selected, to: i });
      setSelected(null);
      return;
    }
    const v = junqiVisible(state, i, viewer, dark);
    const canPick = !!v && !v.hidden && v.piece.side === activeSide &&
      legalJunqiTargets(state, i, activeSide).length > 0;
    if (!canPick && v && !v.hidden && v.piece.side === activeSide) {
      setNotice("这枚棋子当前没有合法落点：周围被己方棋子挡住，或在大本营 / 行营内。先挪开周围的子，或改走锋线上的棋子。");
    }
    setSelected(canPick ? i : null);
  }

  const cells = [];
  for (let i = 0; i < JQ_CELLS; i++) {
    const v = junqiVisible(state, i, viewer, dark);
    const cls = [
      "gm-jq2-cell",
      targetSet.has(i) ? "hint" : "",
      attackSet.has(i) ? "attack" : "",
      campSet.has(i) ? "camp-hint" : "",
      selected === i || swapFirst === i ? "sel" : "",
      state.lastMove && (state.lastMove.from === i || state.lastMove.to === i) ? "last" : "",
      setup && JQ_SETUP_SET.red.has(i) ? "editable" : "",
    ].filter(Boolean).join(" ");
    cells.push(
      <View
        key={i}
        className={cls}
        style={{
          left: px(jqCol(i) * CELL_W),
          top: px(jqRow(i) * CELL_H),
          width: px(CELL_W),
          height: px(CELL_H),
        }}
        onClick={() => onCell(i)}
      >
        {!v ? null : v.hidden ? (
          <View className="gm-jq2-piece hidden">
            <Text className="gm-jq2-name">？</Text>
            <Text className="gm-jq2-sub">暗子</Text>
          </View>
        ) : (
          <View className={`gm-jq2-piece ${v.piece.side} k-${v.piece.kind}`}>
            <Text className="gm-jq2-name">{v.piece.name}</Text>
            <Text className="gm-jq2-sub">
              {v.piece.kind === "soldier" ? String(v.piece.rank) : v.piece.side === "red" ? "红" : "黑"}
            </Text>
          </View>
        )}
        {attackSet.has(i) ? <Text className="gm-jq2-badge attack">攻</Text> : null}
        {campSet.has(i) ? <Text className="gm-jq2-badge camp">营</Text> : null}
      </View>,
    );
  }

  const alive = { red: 0, black: 0 };
  for (const p of state.board) if (p) alive[p.side]++;
  const status = junqiStatusText(state) +
    (setup ? ` · ${errors.length ? errors[0] : "阵型合法，可以开战"}` : dark ? " · 你执红（暗棋）" : " · 双人明棋");

  return (
    <GameFrame
      title="陆战棋"
      subtitle="标准军棋暗棋 · 5×12 棋盘 / 25 子布阵 / 铁路行营 / 程序裁判"
      status={status}
      rules={RULES}
      mode={g.mode}
      onMode={(m) => { g.setMode(m); resetSelection(); }}
      level={g.level}
      onLevel={g.setLevel}
      levels={[1, 2]}
      canUndo={g.canUndo}
      onUndo={() => { g.undo(); resetSelection(); }}
      onRestart={() => { g.restart(); resetSelection(); }}
      aiThinking={g.aiThinking}
      overText={state.phase === "over" ? junqiStatusText(state) : ""}
      aside={
        <View>
          <Text className="gm-aside-title">战报（裁判只公布结果）</Text>
          {state.log.slice(-10).reverse().map((line, k) => (
            <Text key={k} className="gm-aside-line">{line}</Text>
          ))}
          <Text className="gm-aside-line">
            存活 红 {alive.red} / 黑 {alive.black} · 第 {state.moves} 手 · 无吃子 {state.quietMoves} 步
          </Text>
        </View>
      }
    >
      {setup ? (
        <View className="gm-jq2-setup">
          <Text className="gm-jq2-setup-tip">
            布阵：点两个红方格子互换 · 军旗须在大本营 / 地雷只在最后两线 / 炸弹不在锋线
          </Text>
          <View className="gm-jq2-setup-actions">
            <Text className="gm-jq2-btn" onClick={() => { g.commit({ type: "random" }); resetSelection(); }}>随机布阵</Text>
            <Text
              className={`gm-jq2-btn primary${errors.length ? " off" : ""}`}
              onClick={errors.length ? undefined : () => { g.commit({ type: "start" }); resetSelection(); }}
            >
              开战
            </Text>
          </View>
          {errors.length ? <Text className="gm-jq2-setup-err">{errors.join("；")}</Text> : null}
        </View>
      ) : null}
      <View className="gm-jq2-board" style={{ width: px(BOARD_W), height: px(BOARD_H) }}>
        <JunqiBoardLines />
        {cells}
      </View>
      <Text className={`gm-jq2-tip${notice ? " notice" : ""}`}>
        {notice ?? (setup
          ? "上方黑方秘密布阵 · 下方红方可自由调整（行营留空）"
          : selected === null
            ? "点己方棋子 → 圆点=可走空格 ·「营」=可入行营 ·「攻」=可进攻的敌方棋子"
            : `已选 ${pickedName}：可走 ${plainMoves} 格 · 可入营 ${campSet.size} 格 · 可进攻 ${attackSet.size} 格${attackSet.size > 0 ? " · 点带「攻」角标的敌子由裁判结算" : " · 该子暂接触不到敌方，需先推进"}`)}
      </Text>
    </GameFrame>
  );
}

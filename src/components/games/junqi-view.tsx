"use client";

import { useState } from "react";
import {
  applyJunqiAction,
  chooseJunqiAction,
  createJunqiGame,
  JQ_CAMP_SET,
  JQ_CELLS,
  JQ_COLS,
  JQ_ROWS,
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
import { GameFrame } from "./game-frame";
import { JunqiBoardLines } from "./junqi-board-lines";
import { useBoardGame, type BoardGameAdapter } from "./use-board-game";

/** 换 v2 存档键：改造前 6×4 翻棋的旧存档不会被误读 */
const ADAPTER: BoardGameAdapter<JunqiState, JqAction> = {
  storageKey: "games.junqi.web.v2",
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
  <b key="lead">标准两人陆战棋（军棋）· 暗棋 + 程序裁判，不是翻棋。</b>,
  "军棋没有官方统一规则（百度百科《四国军棋》原文说明各平台差异较大），本页采用最通行的竞赛口径：维基百科《陸軍棋》25 子编制、百度百科《四国军棋》布局与胜负、腾讯 QQ 军棋帮助的铁路/吃子规则、AppFreeGame 的 5×12 棋盘拓扑。",
  "棋盘 5 列 × 12 行，双方各 6 行（锋线→端线）：每方 5 个行营、23 个兵站、2 个大本营。前线只有左 / 中 / 右 3 条铁路通道可越，另 2 处是山界。",
  "每方 25 子：司令1 军长1 师长2 旅长2 团长2 营长2 连长3 排长3 工兵3 炸弹2 地雷3 军旗1。等级 司令>…>工兵，大吃小、同级同归于尽。",
  "布阵：行营开局留空；军旗必须放在两个大本营之一；地雷只能放最后两线；炸弹不能放锋线。点两格可互换，也可一键随机生成合法阵型。",
  "行棋：公路线一步（含行营四周斜线）；铁路线直线任意格、中间不得有子、不能转直角弯；工兵是唯一可沿铁路任意转弯行走的棋子。铁路按直线段处理，不采用部分棋盘的弧形连线变体。",
  "行营是安全区，其中的棋子不可被攻击；进入任何大本营的棋子永久冻结；军旗、地雷不可移动。",
  "开局节奏：双方 25 子摆满各自 25 个落点，除 10 个行营外没有空格，所以大多数棋子开局只能先进相邻行营；前线只有左 / 中 / 右 3 条通道能接触敌方，需先沿公路 / 铁路把子力推到前线，或等对方进入射程才会发生交战。棋盘上带「攻」角标的格子就是当前可进攻的敌方棋子。",
  "裁判吃子：炸弹与敌方任何棋子同归于尽（含军旗，炸旗即扛旗成功）；地雷不能移动，工兵挖雷存活、炸弹与地雷同归于尽、其它棋子碰地雷阵亡而地雷保留；军旗被扛即负；司令阵亡则亮开军旗位置。",
  "胜负：军旗被扛、轮到走棋一方无棋可走判负；连续 70 步无吃子判和。",
  "暗棋：人机模式由程序担任裁判，只公布「攻方阵亡 / 守方阵亡 / 同归于尽」等结果，不透露对方军衔，AI 也只按未知子力估算；双人模式为明棋，双方棋子全部可见。",
  "明确不采用的地方变体：翻棋（本页改造前的旧玩法）、必须挖光 3 雷才能扛旗、任何棋子撞地雷同归于尽、炸弹可摆锋线、进入大本营后仍可移动。",
];

export default function JunqiView() {
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
  /** 区分三类落点：带敌子=可进攻，空行营=可入营，其余空格=普通移动 */
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
      setNotice("这枚棋子当前没有合法落点：周围被己方棋子挡住，或位于大本营 / 行营内。先挪开周围的子，或改走锋线上的棋子。");
    }
    setSelected(canPick ? i : null);
  }

  const cells = [];
  for (let i = 0; i < JQ_CELLS; i++) {
    const v = junqiVisible(state, i, viewer, dark);
    const isRedSetup = setup && JQ_SETUP_SET.red.has(i);
    const cls = [
      "jq2-cell",
      targetSet.has(i) ? "hint" : "",
      attackSet.has(i) ? "attack" : "",
      campSet.has(i) ? "camp-hint" : "",
      selected === i || swapFirst === i ? "sel" : "",
      state.lastMove && (state.lastMove.from === i || state.lastMove.to === i) ? "last" : "",
      isRedSetup ? "editable" : "",
    ].filter(Boolean).join(" ");
    cells.push(
      <button
        key={i}
        className={cls}
        style={{ left: `${(jqCol(i) / JQ_COLS) * 100}%`, top: `${(jqRow(i) / JQ_ROWS) * 100}%` }}
        onClick={() => onCell(i)}
        aria-label={v ? (v.hidden ? "暗子" : `${v.piece.side === "red" ? "红" : "黑"}方${v.piece.name}`) : "空格"}
      >
        {!v ? null : v.hidden ? (
          <span className="jq2-piece hidden"><b>？</b><i>暗子</i></span>
        ) : (
          <span className={`jq2-piece ${v.piece.side} k-${v.piece.kind}`}>
            <b>{v.piece.name}</b>
            <i>{v.piece.kind === "soldier" ? String(v.piece.rank) : v.piece.side === "red" ? "红" : "黑"}</i>
          </span>
        )}
        {attackSet.has(i) ? <span className="jq2-badge jq2-badge-attack">攻</span> : null}
        {campSet.has(i) ? <span className="jq2-badge jq2-badge-camp">营</span> : null}
      </button>,
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
      mode={g.mode}
      onMode={(m) => { g.setMode(m); resetSelection(); }}
      level={g.level}
      onLevel={g.setLevel}
      canUndo={g.canUndo}
      onUndo={() => { g.undo(); resetSelection(); }}
      onRestart={() => { g.restart(); resetSelection(); }}
      aiThinking={g.aiThinking}
      overText={state.phase === "over" ? junqiStatusText(state) : ""}
      aside={
        <>
          <h3>战报（裁判公布结果，不透露军衔）</h3>
          <div className="games-log">
            {state.log.slice(-12).reverse().map((line, k) => <p key={k}>{line}</p>)}
          </div>
          <h3>局面</h3>
          <p className="games-captured">
            存活：红 {alive.red} / 黑 {alive.black}<br />
            已行动：{state.moves} 手 · 无吃子 {state.quietMoves} 步<br />
            亮旗：{state.flagRevealed.red ? "红方已亮 " : ""}{state.flagRevealed.black ? "黑方已亮" : !state.flagRevealed.red && !state.flagRevealed.black ? "无" : ""}
          </p>
        </>
      }
      rules={<ul>{RULES.map((r, k) => <li key={k}>{r}</li>)}</ul>}
    >
      {setup ? (
        <div className="jq2-setup">
          <span className="jq2-setup-tip">
            布阵：点两个红方格子互换 · 军旗须在大本营 / 地雷只在最后两线 / 炸弹不在锋线
          </span>
          <div className="jq2-setup-actions">
            <button onClick={() => { g.commit({ type: "random" }); resetSelection(); }}>随机布阵</button>
            <button className="games-primary" disabled={errors.length > 0} onClick={() => { g.commit({ type: "start" }); resetSelection(); }}>
              开战
            </button>
          </div>
          {errors.length ? <p className="jq2-setup-err">{errors.join("；")}</p> : null}
        </div>
      ) : null}
      <div className="jq2-board">
        <JunqiBoardLines />
        {cells}
      </div>
      <p className={`jq2-tip${notice ? " jq2-notice" : ""}`}>
        {notice ?? (setup
          ? "上方为黑方秘密布阵 · 下方红方可自由调整（行营必须留空）"
          : selected === null
            ? "点己方棋子 → 圆点=可走空格 ·「营」=可入行营 ·「攻」=可进攻的敌方棋子；点带角标的格子即落子或交战"
            : <>
                已选 <b>{pickedName}</b>：可走 {plainMoves} 格 · 可入营 {campSet.size} 格 · <em>可进攻 {attackSet.size} 格</em>
                {attackSet.size > 0
                  ? " · 点带「攻」角标的敌方棋子即由裁判结算（不公开军衔）"
                  : " · 该子暂接触不到敌方，需先沿公路 / 铁路推进"}
              </>)}
      </p>
    </GameFrame>
  );
}

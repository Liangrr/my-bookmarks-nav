"use client";

import { useState } from "react";
import { JQ_CAMP_SET, JQ_CELLS, JQ_COLS, JQ_ROWS, jqCol, jqRow, sideName, type JqSide } from "@shared-lib/junqi";
import {
  applyJunqiFlipAction,
  chooseJunqiFlipAction,
  createJunqiFlipGame,
  junqiFlipStats,
  junqiFlipStatusText,
  junqiFlipVisible,
  legalJunqiFlipTargets,
  reviveJunqiFlip,
  seatName,
  type JfAction,
  type JfSeat,
  type JunqiFlipState,
} from "@shared-lib/junqi-flip";
import { GameFrame } from "./game-frame";
import { JunqiBoardLines } from "./junqi-board-lines";
import { useBoardGame, type BoardGameAdapter } from "./use-board-game";

/** 翻翻棋是独立玩法，与标准军棋暗棋并列；单独存档键，互不干扰 */
const ADAPTER: BoardGameAdapter<JunqiFlipState, JfAction> = {
  storageKey: "games.junqi-flip.web.v1",
  playerSide: "player",
  aiSide: "ai",
  create: (seed) => createJunqiFlipGame(seed),
  revive: reviveJunqiFlip,
  isOver: (s) => s.phase === "over",
  turnOf: (s) => s.turn,
  apply: applyJunqiFlipAction,
  ai: (s, level, seed) => chooseJunqiFlipAction(s, seed, level),
};

const RULES = [
  <b key="lead">陆战棋 · 翻翻棋（字朝下摆），与「标准军棋暗棋」并列的另一种下法，不是布阵暗棋。</b>,
  "军棋没有官方统一规则，翻翻棋也是民间玩法。本页口径交叉取自腾讯 QQ 游戏《军旗翻翻棋》官方帮助、百度百科《军棋》「字朝下摆」、山东大学《军棋比赛规则》翻棋条目、网页版《军棋翻翻棋》与中文百科《軍棋(陸戰棋)》。",
  "沿用标准 5 列 × 12 行棋盘（铁路 / 公路 / 行营 / 大本营标记 / 前线）。开局把双方共 50 枚棋子全部背面朝上，随机铺满 50 个非行营格；10 个行营开局留空，不布阵、不分上下阵地。",
  "每方 25 子：司令1 军长1 师长2 旅长2 团长2 营长2 连长3 排长3 工兵3 炸弹2 地雷3 军旗1。等级 司令>…>工兵，大吃小、同级同归于尽。",
  "定色阶段：阵营未定，双方轮流只能翻子；当连续两张翻出的棋子颜色相同时，最后翻子的一方执该色、对手执另一色，随即进入行棋阶段。不采用「与自己上次翻出同色」「首翻归对方」「先翻出工兵者定色」等地方变体。",
  "行棋阶段每回合二选一：翻开一枚暗子，或移动 / 进攻一枚己方已翻开的棋子。暗子不可被攻击、不可越过、不可穿过；已翻开的军旗与地雷不可移动。",
  "开局节奏：50 枚暗子铺满非行营格，只有 10 个行营是空的。点暗子永远是「翻子」而不是「进攻」；已翻开的明子只能吃同样已翻开的敌方明子，或进入留空的行营，因此开局一段时间以翻子为主是正常的。棋盘上「攻」角标=可进攻的明子，「营」角标=可进入的行营。",
  "移动：公路一步（含行营四周斜线）；铁路直线任意格、中间不得有子、不能转直角弯；工兵是唯一可沿铁路任意转弯的棋子。行营是安全区，其中的棋子不可被攻击。翻棋里大本营只是棋盘标记、不冻结棋子（与标准暗棋不同）。",
  "战斗：炸弹与任何棋子同归于尽（含地雷）；工兵挖雷且存活，其它棋子碰地雷阵亡而地雷保留；对方 3 颗地雷全部清除后才允许碰军旗，任意棋子扛旗立即获胜（炸弹碰旗按标准军棋的炸旗口径结算为扛旗成功）。",
  "胜负：扛旗；轮到走棋一方无任何合法着法（含翻子）判负；连续 60 步无交战、或双方均无合法着法判和。",
  "暗子真值只存在本地存档与程序裁判里：视图层与 AI 都只能看到「这里有一枚未翻开的棋」，看不到颜色与军衔；战报只公布翻出的明子和交战结果。",
  "不采用的地方 / 平台变体：必须翻完全部棋子才可扛旗、超时或重复走棋判负、求和与积分结算、四人四国。人机模式开棋座位随机，双人模式为同屏轮流。",
];

export default function JunqiFlipView() {
  const g = useBoardGame(ADAPTER);
  const [selected, setSelected] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { state, mode } = g;
  const activeSeat: JfSeat = mode === "ai" ? "player" : state.turn;
  const activeSide: JqSide | null = state.owner[activeSeat];
  const assign = state.phase === "assign";
  const targets = selected === null || assign ? [] : legalJunqiFlipTargets(state, selected, activeSeat);
  const targetSet = new Set(targets);
  /** 带子=可进攻的敌方明子，空行营=可入营；暗子永远不在合法落点里（只能翻） */
  const attackSet = new Set(targets.filter((i) => !!state.board[i]));
  const campSet = new Set(targets.filter((i) => !state.board[i] && JQ_CAMP_SET.has(i)));
  const plainMoves = targets.length - attackSet.size - campSet.size;
  const picked = selected === null ? null : junqiFlipVisible(state, selected);
  const pickedName = picked && picked.hidden === false ? picked.piece.name : "棋子";
  const stats = junqiFlipStats(state);
  const mySide: JqSide | null = mode === "ai" ? state.owner.player : activeSide;

  function clearSelection() { setSelected(null); setNotice(null); }

  function onCell(i: number) {
    if (!g.playerTurn || state.phase === "over") return;
    setNotice(null);
    if (selected !== null && targetSet.has(i)) {
      g.commit({ type: "move", from: selected, to: i });
      clearSelection();
      return;
    }
    const v = junqiFlipVisible(state, i);
    if (v?.hidden) {
      g.commit({ type: "flip", at: i });
      clearSelection();
      return;
    }
    if (assign || !v || v.hidden || !activeSide || v.piece.side !== activeSide) {
      clearSelection();
      return;
    }
    if (legalJunqiFlipTargets(state, i, activeSeat).length === 0) {
      clearSelection();
      setNotice("这枚明子四周都是暗子或己方棋子：暗子按规则不能攻击、不能越过，请先点暗子翻开，或选挨着空行营的明子。");
      return;
    }
    setSelected(i);
  }

  const cells = [];
  for (let i = 0; i < JQ_CELLS; i++) {
    const v = junqiFlipVisible(state, i);
    const own = !!v && !v.hidden && !!activeSide && v.piece.side === activeSide;
    const cls = [
      "jq2-cell",
      targetSet.has(i) ? "hint" : "",
      attackSet.has(i) ? "attack" : "",
      campSet.has(i) ? "camp-hint" : "",
      selected === i ? "sel" : "",
      state.lastMove && (state.lastMove.from === i || state.lastMove.to === i) ? "last" : "",
      state.lastFlip === i ? "last" : "",
      v?.hidden ? "jf-flippable" : "",
      own ? "jf-own" : "",
    ].filter(Boolean).join(" ");
    cells.push(
      <button
        key={i}
        className={cls}
        style={{ left: `${(jqCol(i) / JQ_COLS) * 100}%`, top: `${(jqRow(i) / JQ_ROWS) * 100}%` }}
        onClick={() => onCell(i)}
        aria-label={v ? (v.hidden ? "未翻开的暗子" : `${sideName(v.piece.side)}方${v.piece.name}`) : "空格"}
      >
        {!v ? null : v.hidden ? (
          <span className="jq2-piece hidden"><b>？</b><i>翻子</i></span>
        ) : (
          <span className={`jq2-piece ${v.piece.side} k-${v.piece.kind}`}>
            <b>{v.piece.name}</b>
            <i>{v.piece.kind === "soldier" ? String(v.piece.rank) : sideName(v.piece.side)}</i>
          </span>
        )}
        {attackSet.has(i) ? <span className="jq2-badge jq2-badge-attack">攻</span> : null}
        {campSet.has(i) ? <span className="jq2-badge jq2-badge-camp">营</span> : null}
      </button>,
    );
  }

  const status = junqiFlipStatusText(state, mode === "ai" ? "player" : null) +
    (assign
      ? " · 先翻到两张同色即定阵营"
      : mySide
        ? ` · ${mode === "ai" ? "你" : seatName(activeSeat)}执${sideName(mySide)}`
        : "");

  return (
    <GameFrame
      title="陆战棋 · 翻翻棋"
      subtitle="字朝下摆 · 50 枚暗子 / 轮流翻子定阵营 / 挖雷扛旗"
      status={status}
      mode={g.mode}
      onMode={(m) => { g.setMode(m); clearSelection(); }}
      level={g.level}
      onLevel={g.setLevel}
      canUndo={g.canUndo}
      onUndo={() => { g.undo(); clearSelection(); }}
      onRestart={() => { g.restart(); clearSelection(); }}
      aiThinking={g.aiThinking}
      overText={state.phase === "over" ? junqiFlipStatusText(state, mode === "ai" ? "player" : null) : ""}
      aside={
        <>
          <h3>战报（只公布明子与交战结果）</h3>
          <div className="games-log">
            {state.log.slice(-12).reverse().map((line, k) => <p key={k}>{line}</p>)}
          </div>
          <h3>局面</h3>
          <p className="games-captured">
            未翻暗子：{stats.hidden} / 50<br />
            明子：红 {stats.red} / 黑 {stats.black}<br />
            地雷未清：红 {stats.redMines} · 黑 {stats.blackMines}（清完 3 雷才能扛旗）<br />
            已行动：{state.moves} 手 · 无交战 {state.quietMoves} 步
          </p>
        </>
      }
      rules={<ul>{RULES.map((r, k) => <li key={k}>{r}</li>)}</ul>}
    >
      <div className="jf-bar">
        <span className={`jf-bar-tip${notice ? " jf-notice" : ""}`}>
          {notice ?? (assign
            ? "定色阶段：双方轮流翻子 · 连续翻出两张同色时，最后翻子者执该色"
            : selected === null
              ? "每回合二选一：点暗子=翻子（不是进攻）；点己方明子 →「营」可入行营 ·「攻」可进攻敌方明子"
              : `已选 ${pickedName}：可走 ${plainMoves} 格 · 可入营 ${campSet.size} 格 · 可进攻 ${attackSet.size} 格${attackSet.size > 0 ? " · 点带「攻」角标的明子交战" : " · 周围暗子不可攻击或越过，请先翻子"}`)}
        </span>
        <span className="jf-bar-chips">
          <i>阵营 {assign ? "未定" : `${mode === "ai" ? "你" : "玩家1"}执${sideName(state.owner.player!)}`}</i>
          <i>未翻 {stats.hidden}</i>
          <i>红雷 {stats.redMines} / 黑雷 {stats.blackMines}</i>
          {assign && state.prevFlipColor ? <i>上张 {sideName(state.prevFlipColor)}方</i> : null}
        </span>
      </div>
      <div className="jq2-board">
        <JunqiBoardLines />
        {cells}
      </div>
      <p className="jq2-tip">
        翻翻棋不分阵地：前线 / 大本营只是棋盘标记 · <b>暗子只能翻、不能打也不能越过</b>；明子只能吃已翻开的敌方明子，或进入留空的行营。开局 50 格全是暗子，前期以翻子为主属正常节奏。
      </p>
    </GameFrame>
  );
}

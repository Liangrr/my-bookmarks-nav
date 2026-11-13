"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { GameMode } from "./use-board-game";

type Props = {
  title: string;
  subtitle: string;
  status: string;
  rules: ReactNode;
  mode: GameMode;
  onMode: (m: GameMode) => void;
  level: number;
  onLevel: (n: number) => void;
  showLevel?: boolean;
  canUndo: boolean;
  onUndo: () => void;
  onRestart: () => void;
  aiThinking: boolean;
  overText: string;
  aside?: ReactNode;
  children: ReactNode;
};

/** 三个棋类共用的页面骨架：状态条、模式/难度、撤销重开、规则折叠、终局浮层、侧栏 */
export function GameFrame({
  title, subtitle, status, rules, mode, onMode, level, onLevel, showLevel = true,
  canUndo, onUndo, onRestart, aiThinking, overText, aside, children,
}: Props) {
  return (
    <section className="games-page">
      <header className="games-head">
        <Link href="/games" className="games-back">← 游戏中心</Link>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </header>

      <div className={`games-status${aiThinking ? " thinking" : ""}`}>
        <span>{status}</span>
        {aiThinking ? <em>AI 思考中…</em> : null}
      </div>

      <div className="games-toolbar">
        <div className="games-seg" aria-label="对局模式">
          <button className={mode === "ai" ? "on" : ""} onClick={() => onMode("ai")}>人机</button>
          <button className={mode === "pvp" ? "on" : ""} onClick={() => onMode("pvp")}>双人</button>
        </div>
        {showLevel ? (
          <div className="games-seg" aria-label="AI 难度">
            {[1, 2, 3].map((n) => (
              <button key={n} className={level === n ? "on" : ""} onClick={() => onLevel(n)}>
                {n === 1 ? "简单" : n === 2 ? "普通" : "困难"}
              </button>
            ))}
          </div>
        ) : null}
        <div className="games-actions">
          <button onClick={onUndo} disabled={!canUndo}>撤销</button>
          <button onClick={onRestart}>重开</button>
        </div>
      </div>

      <div className="games-body">
        <div className="games-board-wrap">
          {children}
          {overText ? (
            <div className="games-overlay">
              <div className="games-overlay-card">
                <h2>{overText}</h2>
                <button className="games-primary" onClick={onRestart}>再来一局</button>
              </div>
            </div>
          ) : null}
        </div>
        {aside ? <aside className="games-aside">{aside}</aside> : null}
      </div>

      <details className="games-rules">
        <summary>玩法规则（点击展开）</summary>
        <div className="games-rules-body">{rules}</div>
      </details>
    </section>
  );
}

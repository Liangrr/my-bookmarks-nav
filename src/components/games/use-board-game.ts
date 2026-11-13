"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 三个棋类共用的对局壳：人机/双人、难度、AI 自动走子、撤销、重开、自动存档。
 * 具体规则由各游戏传入 adapter，纯逻辑仍全部来自 @shared-lib/*。
 * 本 hook 只在浏览器运行（视图由 dynamic({ssr:false}) 加载）。
 */

export type GameMode = "ai" | "pvp";

export type BoardGameAdapter<S, M> = {
  storageKey: string;
  /** 人机模式下玩家控制的一方 */
  playerSide: string;
  /** 人机模式下 AI 控制的一方 */
  aiSide: string;
  create: (seed: number) => S;
  revive: (raw: unknown) => S | null;
  isOver: (s: S) => boolean;
  turnOf: (s: S) => string;
  apply: (s: S, m: M) => S;
  ai: (s: S, level: number, seed: number) => M | null;
};

type Session<S> = { state: S; history: S[] };

function lsGet(key: string): string | null {
  try { return typeof window === "undefined" ? null : localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, value: string) {
  try { if (typeof window !== "undefined") localStorage.setItem(key, value); } catch { /* 隐私模式忽略 */ }
}
function freshSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 1e9)) | 0 || 1;
}

export function useBoardGame<S, M>(adapter: BoardGameAdapter<S, M>) {
  const [session, setSession] = useState<Session<S>>(() => {
    const raw = lsGet(adapter.storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { state?: unknown; history?: unknown };
        const state = adapter.revive(parsed.state);
        if (state) {
          const history = Array.isArray(parsed.history)
            ? parsed.history.map(adapter.revive).filter((x): x is S => x !== null)
            : [];
          return { state, history };
        }
      } catch { /* 坏存档直接开新局 */ }
    }
    return { state: adapter.create(freshSeed()), history: [] };
  });

  const [mode, setMode] = useState<GameMode>(() =>
    lsGet(`${adapter.storageKey}.mode`) === "pvp" ? "pvp" : "ai",
  );
  const [level, setLevel] = useState<number>(() => {
    const v = Number(lsGet(`${adapter.storageKey}.level`));
    return v === 1 || v === 3 ? v : 2;
  });
  const seedRef = useRef(freshSeed());

  useEffect(() => { lsSet(`${adapter.storageKey}.mode`, mode); }, [mode, adapter.storageKey]);
  useEffect(() => { lsSet(`${adapter.storageKey}.level`, String(level)); }, [level, adapter.storageKey]);
  useEffect(() => {
    lsSet(adapter.storageKey, JSON.stringify({ state: session.state, history: session.history }));
  }, [session, adapter.storageKey]);

  const commit = useCallback((m: M) => {
    setSession((prev) => {
      const next = adapter.apply(prev.state, m);
      if (next === prev.state) return prev; // 非法着法：不改变任何状态
      return { state: next, history: prev.history.concat([prev.state]).slice(-40) };
    });
  }, [adapter]);

  const state = session.state;
  const aiThinking = mode === "ai" && !adapter.isOver(state) && adapter.turnOf(state) === adapter.aiSide;

  // AI 回合：延后一点执行，让玩家的落子动画先渲染完
  useEffect(() => {
    if (!aiThinking) return;
    const timer = setTimeout(() => {
      const move = adapter.ai(state, level, ++seedRef.current);
      if (move) commit(move);
    }, 280);
    return () => clearTimeout(timer);
  }, [aiThinking, state, level, adapter, commit]);

  const undo = useCallback(() => {
    setSession((prev) => {
      if (!prev.history.length) return prev;
      if (mode === "pvp") {
        const last = prev.history[prev.history.length - 1]!;
        return { state: last, history: prev.history.slice(0, -1) };
      }
      // 人机模式一撤销就回到「上一次轮到玩家」，把玩家与 AI 两步一起退回
      let idx = prev.history.length - 1;
      while (idx >= 0 && adapter.turnOf(prev.history[idx]!) !== adapter.playerSide) idx--;
      if (idx < 0) idx = prev.history.length - 1;
      return { state: prev.history[idx]!, history: prev.history.slice(0, idx) };
    });
  }, [mode, adapter]);

  const restart = useCallback(() => {
    setSession({ state: adapter.create(freshSeed()), history: [] });
  }, [adapter]);

  return {
    state,
    mode,
    setMode,
    level,
    setLevel,
    commit,
    undo,
    restart,
    canUndo: session.history.length > 0,
    aiThinking,
    /** 人机模式下玩家此刻能否操作 */
    playerTurn: mode === "pvp" || !aiThinking,
  };
}

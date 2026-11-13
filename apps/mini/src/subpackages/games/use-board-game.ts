import Taro from "@tarojs/taro";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 小程序端棋类通用对局壳（Taro React）：模式、难度、AI 走子、撤销、重开、Storage 存档。
 * 与 Web 端同构，但存储换成 Taro.setStorageSync；棋类规则仍全部来自 @shared-lib/*。
 */

export type GameMode = "ai" | "pvp";

export type BoardGameAdapter<S, M> = {
  storageKey: string;
  playerSide: string;
  aiSide: string;
  create: (seed: number) => S;
  revive: (raw: unknown) => S | null;
  isOver: (s: S) => boolean;
  turnOf: (s: S) => string;
  apply: (s: S, m: M) => S;
  ai: (s: S, level: number, seed: number) => M | null;
};

type Session<S> = { state: S; history: S[] };

function storageGet(key: string): string | null {
  try {
    const v = Taro.getStorageSync(key);
    return typeof v === "string" && v ? v : null;
  } catch { return null; }
}
function storageSet(key: string, value: string) {
  try { Taro.setStorageSync(key, value); } catch { /* 存储不可用时仍能玩 */ }
}
function freshSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 1e9)) | 0 || 1;
}

export function useBoardGame<S, M>(adapter: BoardGameAdapter<S, M>) {
  const [session, setSession] = useState<Session<S>>(() => {
    const raw = storageGet(adapter.storageKey);
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
    storageGet(`${adapter.storageKey}.mode`) === "pvp" ? "pvp" : "ai",
  );
  const [level, setLevel] = useState<number>(() =>
    Number(storageGet(`${adapter.storageKey}.level`)) === 1 ? 1 : 2,
  );
  const seedRef = useRef(freshSeed());

  useEffect(() => { storageSet(`${adapter.storageKey}.mode`, mode); }, [mode, adapter.storageKey]);
  useEffect(() => { storageSet(`${adapter.storageKey}.level`, String(level)); }, [level, adapter.storageKey]);
  useEffect(() => {
    storageSet(adapter.storageKey, JSON.stringify({ state: session.state, history: session.history }));
  }, [session, adapter.storageKey]);

  const commit = useCallback((m: M) => {
    setSession((prev) => {
      const next = adapter.apply(prev.state, m);
      if (next === prev.state) return prev;
      return { state: next, history: prev.history.concat([prev.state]).slice(-40) };
    });
  }, [adapter]);

  const state = session.state;
  const aiThinking = mode === "ai" && !adapter.isOver(state) && adapter.turnOf(state) === adapter.aiSide;

  useEffect(() => {
    if (!aiThinking) return;
    const timer = setTimeout(() => {
      const move = adapter.ai(state, level, ++seedRef.current);
      if (move) commit(move);
    }, 260);
    return () => clearTimeout(timer);
  }, [aiThinking, state, level, adapter, commit]);

  const undo = useCallback(() => {
    setSession((prev) => {
      if (!prev.history.length) return prev;
      if (mode === "pvp") {
        const last = prev.history[prev.history.length - 1]!;
        return { state: last, history: prev.history.slice(0, -1) };
      }
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
    state, mode, setMode, level, setLevel, commit, undo, restart,
    canUndo: session.history.length > 0,
    aiThinking,
    playerTurn: mode === "pvp" || !aiThinking,
  };
}

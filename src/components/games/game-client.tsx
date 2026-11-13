"use client";

// 三个棋盘都要读 localStorage 存档，统一走客户端按需加载，避免 SSR 水合不一致。
import dynamic from "next/dynamic";

const loading = <div className="games-loading">正在载入棋盘…</div>;

const VIEWS = {
  xiangqi: dynamic(() => import("./xiangqi-view"), { ssr: false, loading: () => loading }),
  gomoku: dynamic(() => import("./gomoku-view"), { ssr: false, loading: () => loading }),
  junqi: dynamic(() => import("./junqi-view"), { ssr: false, loading: () => loading }),
  junqiflip: dynamic(() => import("./junqi-flip-view"), { ssr: false, loading: () => loading }),
} as const;

export type GameKind = keyof typeof VIEWS;

export function GameClient({ kind }: { kind: GameKind }) {
  const View = VIEWS[kind];
  return <View />;
}

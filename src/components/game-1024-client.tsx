"use client";

// 游戏要读 localStorage 存档，且用动态棋盘做动画，交给客户端按需加载即可，
// 避免 SSR 阶段拿不到本地存档、以及服务端与客户端棋盘种子不一致导致的水合告警。
import dynamic from "next/dynamic";

const Game1024 = dynamic(() => import("./game-1024"), {
  ssr: false,
  loading: () => <div className="g1024-loading">正在载入 1024…</div>,
});

export function Game1024Client() {
  return <Game1024 />;
}

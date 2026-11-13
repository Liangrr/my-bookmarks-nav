import type { Metadata } from "next";
import { GameClient } from "@/components/games/game-client";

export const metadata: Metadata = {
  title: "五子棋 - 星轨游戏中心",
  description:
    "在线五子棋：15×15 自由规则无禁手，横竖斜连五判胜，AI 会堵活三抢活四并预演反击，支持人机/双人、撤销与自动存档。",
};

export default function GomokuPage() {
  return (
    <div className="container" style={{ maxWidth: 1000, paddingTop: 16, paddingBottom: 48 }}>
      <GameClient kind="gomoku" />
    </div>
  );
}

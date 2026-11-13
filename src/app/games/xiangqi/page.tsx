import type { Metadata } from "next";
import { GameClient } from "@/components/games/game-client";

export const metadata: Metadata = {
  title: "中国象棋 - 星轨游戏中心",
  description:
    "在线中国象棋：车马炮相士兵完整走法、蹩马腿与塞象眼、将帅照面、将死与困毙判定、中文棋谱、三档 Alpha-Beta AI，支持人机/双人、撤销与自动存档。",
};

export default function XiangqiPage() {
  return (
    <div className="container" style={{ maxWidth: 1000, paddingTop: 16, paddingBottom: 48 }}>
      <GameClient kind="xiangqi" />
    </div>
  );
}

import type { Metadata } from "next";
import { GameClient } from "@/components/games/game-client";

export const metadata: Metadata = {
  title: "陆战棋 · 翻翻棋（字朝下摆） - 星轨游戏中心",
  description:
    "军棋翻翻棋：50 枚棋子背面朝上铺满 5×12 棋盘，轮流翻子确定阵营，翻子或走子二选一，工兵挖雷、炸弹同归于尽、挖光 3 雷才能扛军旗。支持人机 / 双人、撤销、战报与自动存档。",
};

export default function JunqiFlipPage() {
  return (
    <div className="container" style={{ maxWidth: 1000, paddingTop: 16, paddingBottom: 48 }}>
      <GameClient kind="junqiflip" />
    </div>
  );
}

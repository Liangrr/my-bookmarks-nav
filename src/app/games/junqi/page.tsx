import type { Metadata } from "next";
import { GameClient } from "@/components/games/game-client";

export const metadata: Metadata = {
  title: "陆战棋（标准军棋暗棋） - 星轨游戏中心",
  description:
    "标准两人陆战棋（军棋）暗棋：5×12 棋盘、25 子布阵、铁路与行营、程序裁判、工兵挖雷、炸弹同归于尽、扛军旗判胜，支持人机 / 双人、撤销、战报与自动存档。",
};

export default function JunqiPage() {
  return (
    <div className="container" style={{ maxWidth: 1000, paddingTop: 16, paddingBottom: 48 }}>
      <GameClient kind="junqi" />
    </div>
  );
}

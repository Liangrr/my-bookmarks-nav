import type { Metadata } from "next";
import { Game1024Client } from "@/components/game-1024-client";

export const metadata: Metadata = {
  title: "1024 数字合并 - 星轨",
  description:
    "经典 4×4 数字合并小游戏：滑动相加，合到 1024 通关。含下一块预览、连击加分、里程碑、有限撤销与成绩单分享，与小程序端共用同一套合并逻辑。",
};

export default function Game1024Page() {
  return (
    <div className="container" style={{ maxWidth: 720, paddingTop: 16, paddingBottom: 48 }}>
      <Game1024Client />
    </div>
  );
}

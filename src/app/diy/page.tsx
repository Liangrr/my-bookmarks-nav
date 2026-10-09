import type { Metadata } from "next";
import { DiyGuide } from "@/components/diy-guide";

export const metadata: Metadata = {
  title: "DIY 手作工坊 - 星轨",
  description:
    "生活好物自制方法：手工皂、润唇膏、酸奶、果酱、香薰蜡烛、驱蚊除湿等，写清材料、配比与一步步流程，支持搜索与筛选。",
};

export default function DiyPage() {
  return (
    <div
      className="container"
      style={{ maxWidth: 900, paddingTop: 16, paddingBottom: 48 }}
    >
      <DiyGuide />
    </div>
  );
}
import type { Metadata } from "next";
import { SurvivalGuide } from "@/components/survival-guide";

export const metadata: Metadata = {
  title: "野外求生知识手册 - 星轨",
  description:
    "野外求生 11 章 65 条知识点：找水、生火、搭棚、辨向、天气、觅食、急救、求救信号与 EDC 装备，支持搜索与筛选。",
};

export default function SurvivalPage() {
  return (
    <div
      className="container"
      style={{ maxWidth: 900, paddingTop: 16, paddingBottom: 48 }}
    >
      <SurvivalGuide />
    </div>
  );
}

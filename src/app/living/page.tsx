import type { Metadata } from "next";
import { LivingGuide } from "@/components/living-guide";

export const metadata: Metadata = {
  title: "高性价比人生指南 - 星轨",
  description:
    "《高性价比人生指南》全书 33 节 615 条建议：每条标注成本、收益、证据等级（A/B/C）与原始文献，支持搜索与筛选。",
};

export default function LivingPage() {
  return (
    <div
      className="container"
      style={{ maxWidth: 900, paddingTop: 16, paddingBottom: 48 }}
    >
      <LivingGuide />
    </div>
  );
}

import type { Metadata } from "next";
import { SeasonalFruits } from "@/components/seasonal-fruits";

export const metadata: Metadata = {
  title: "应季水果 - 星轨",
  description:
    "应季水果选购指南：按月份列出当季水果，详解口感、产地、甜度与功效，吃对季节更营养更划算。",
};

export default function FruitsPage() {
  return (
    <div
      className="container"
      style={{ maxWidth: 900, paddingTop: 16, paddingBottom: 48 }}
    >
      <SeasonalFruits />
    </div>
  );
}
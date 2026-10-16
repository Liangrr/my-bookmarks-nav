import type { Metadata } from "next";
import { MealPlanner } from "@/components/meal-planner";

export const metadata: Metadata = {
  title: "今天吃什么 - 星轨",
  description:
    "个人 / 聚餐两种场合切换：个人吃才考虑 🍳 自己做 与 🛵 点外卖，近三天三餐 + 应季水果（汤隔天安排），日常目标 50 元、每天最多不超过 70 元；聚餐只考虑去店里吃，范围深圳岗厦 → 大剧院一带，3~5 人，每天给 3 家不同价位的真实餐馆候选（带来源链接），按「人均 × 人数」估总花费。",
};

export default function MealsPage() {
  return (
    <div
      className="container"
      style={{ maxWidth: 900, paddingTop: 16, paddingBottom: 48 }}
    >
      <MealPlanner />
    </div>
  );
}

import type { Metadata } from "next";
import { MealPlanner } from "@/components/meal-planner";

export const metadata: Metadata = {
  title: "今天吃什么 - 星轨",
  description:
    "近三天营养套餐：每天三餐 + 一汤 + 应季水果，蛋白质/蔬菜/主食/汤/水果齐全；含 🍳 自己做与 🛵 点外卖两套方案，日预算100元内。",
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

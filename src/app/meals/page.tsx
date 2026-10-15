import type { Metadata } from "next";
import { MealPlanner } from "@/components/meal-planner";

export const metadata: Metadata = {
  title: "今天吃什么 - 星轨",
  description:
    "近三天营养套餐：每天三餐 + 应季水果，汤按天间隔安排；含 🍳 自己做与 🛵 点外卖两套方案，花费日常目标50元、每天最多不超过70元，超目标时给出省钱组合与混搭建议。",
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

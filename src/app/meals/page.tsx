import type { Metadata } from "next";
import { MealPlanner } from "@/components/meal-planner";

export const metadata: Metadata = {
  title: "今天吃什么 - 星轨",
  description:
    "个人 / 聚餐两种场合切换：个人是近三天三餐 + 应季水果（汤按天间隔安排），聚餐是 4~6 人一桌（凉菜、硬菜、时蔬、主食、一锅汤、果盘）。含 🍳 自己做与 🛵 点外卖两套方案，个人花费日常目标50元、每天最多不超过70元；聚餐按整份价折算人均，同样对标 50 / 70。",
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

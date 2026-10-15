import type { Metadata } from "next";
import { MealPlanner } from "@/components/meal-planner";

export const metadata: Metadata = {
  title: "今天吃什么 - 星轨",
  description: "单人一日三餐推荐，日预算100元内，早餐不超过10元。",
};

export default function MealsPage() {
  return (
    <>
      <MealPlanner />
      <footer style={{ textAlign: "center", fontSize: 12, color: "var(--text-tertiary)", marginTop: 24, paddingBottom: 24 }}>
        星轨 · 今天吃什么 · 预算内吃饱吃好
      </footer>
    </>
  );
}

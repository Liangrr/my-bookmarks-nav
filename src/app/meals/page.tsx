import type { Metadata } from "next";
import { MealPlanner } from "@/components/meal-planner";

export const metadata: Metadata = {
  title: "今天吃什么 - 星轨",
  description:
    "个人 / 聚餐两种场合切换：个人吃才考虑 🍳 自己做 与 🛵 点外卖，近三天三餐 + 应季水果（汤隔天安排），日常目标 50 元、每天最多不超过 70 元；聚餐只考虑去店里吃，范围深圳岗厦 → 大剧院一带，3~5 人，一次按综合评价排名列出 46 家区内餐馆（口味 40% + 环境 20% + 服务 20% + 性价比 20%，含好评点、踩坑与性价比判断，带来源链接），按「人均 × 人数」估总花费。",
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

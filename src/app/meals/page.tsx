import type { Metadata } from "next";
import { MealPlanner } from "@/components/meal-planner";

export const metadata: Metadata = {
  title: "今天吃什么 - 星轨",
  description:
    "个人 / 聚餐两种场合切换：个人吃才考虑 🍳 自己做 与 🛵 点外卖，近三天三餐 + 应季水果（汤隔天安排），日常目标 50 元、每天最多不超过 70 元；聚餐只考虑去店里吃，覆盖深圳全城（福田 / 罗湖 / 南山 / 宝安 / 龙华 / 龙岗 / 盐田 / 光明 / 坪山 / 大鹏），门店统一按「适合 3~5 人」收录，一次按综合评价排名列出（口味 40% + 环境 20% + 服务 20% + 性价比 20%），含好评点、踩坑与性价比判断，带来源链接与详细地址（含商场楼层 / 铺位）；可按地区下拉 + 菜系下拉筛选，也能直接搜店名 / 商圈 / 招牌菜，花费按人均估。",
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

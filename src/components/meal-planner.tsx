"use client";

import dynamic from "next/dynamic";

// meal-planner-view 里静态 import 了 449KB 的 meal-planner.json 与应季水果数据。
// 直接放在 /meals 页面里会让这些数据整份进页面 chunk（构建后约 394KB）。
// 用 next/dynamic + ssr:false 把它拆成独立异步 chunk，进入 /meals 时才按需拉取。
const MealPlannerView = dynamic(
  () => import("./meal-planner-view").then((m) => m.MealPlanner),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          padding: "48px 16px",
          textAlign: "center",
          color: "var(--text-tertiary)",
          fontSize: 14,
        }}
      >
        正在加载菜单…
      </div>
    ),
  }
);

export function MealPlanner() {
  return <MealPlannerView />;
}

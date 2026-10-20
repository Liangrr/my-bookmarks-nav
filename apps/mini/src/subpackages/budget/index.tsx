import { useMemo, useState } from "react";
import { Text, View } from "@tarojs/components";
import plannerData from "@shared-data/meal-planner.json";
import { cheapest, fitBudget, priciest, shouldSuggestSaving, type Budget } from "@shared-lib/meal-budget";

// 数据与预算兜底逻辑都来自 packages/shared-*，与 Web 端 /meals 用的是同一份实现
type Meal = { id: string; name: string; price: number };
type SetData = {
  id: string;
  label: string;
  icon: string;
  breakfast: Meal[];
  lunch: Meal[];
  dinner: Meal[];
  soups: Meal[];
};

const PLANNER = plannerData as unknown as { budget: Budget; sets: SetData[] };
const SLOTS = ["早餐", "午餐", "晚餐", "汤品"];

export default function BudgetPage() {
  const [setId, setSetId] = useState(PLANNER.sets[0].id);
  const set = PLANNER.sets.find((s) => s.id === setId) ?? PLANNER.sets[0];

  /** 先取每档最贵项，再用 fitBudget 压回硬上限内，展示的正是兜底后的结果 */
  const picks = useMemo(() => {
    const raw = [
      { meal: priciest(set.breakfast), floor: cheapest(set.breakfast) },
      { meal: priciest(set.lunch), floor: cheapest(set.lunch) },
      { meal: priciest(set.dinner), floor: cheapest(set.dinner) },
      { meal: priciest(set.soups), floor: cheapest(set.soups) },
    ];
    return fitBudget(raw, PLANNER.budget.dailyMax).map((m, i) => ({ slot: SLOTS[i], meal: m, floor: raw[i].floor }));
  }, [set]);

  const total = picks.reduce((n, p) => n + p.meal.price, 0);
  const needSaving = shouldSuggestSaving(total, PLANNER.budget);

  return (
    <View className="page">
      <View className="title">三餐预算</View>
      <View className="sub">
        日常目标 ¥{PLANNER.budget.dailyTarget}，硬上限 ¥{PLANNER.budget.dailyMax}/天。下面展示的是「按档取最贵 + 预算兜底」后的组合。
      </View>

      <View className="filter-sticky">
        <View className="chips">
          {PLANNER.sets.map((s) => (
            <View
              key={s.id}
              className={`chip${s.id === setId ? " chip-on" : ""}`}
              onClick={() => setSetId(s.id)}
            >
              {s.icon} {s.label}
            </View>
          ))}
        </View>
      </View>

      {picks.map((p) => (
        <View key={p.slot} className="card">
          <View className="card-head">
            <Text className="name">{p.slot}</Text>
            <Text className="tag">¥{p.meal.price}</Text>
          </View>
          <View className="line">{p.meal.name}</View>
          <View className="line">同档最低：{p.floor.name}（¥{p.floor.price}）</View>
        </View>
      ))}

      <View className="total">
        <View className="sub">当日合计（含汤）</View>
        <Text className="total-value">¥{total}</Text>
      </View>

      {needSaving ? (
        <View className="warn">
          合计高于日常目标 ¥{PLANNER.budget.dailyTarget}，建议把最贵的一档换成本档最低价项，可压到 ¥
          {picks
            .reduce((n, p) => n + p.floor.price, 0)
            .toString()}
          。
        </View>
      ) : (
        <View className="sub">当前组合已在日常目标内。</View>
      )}
    </View>
  );
}

// /meals 个人模式的预算兜底与省钱建议：从 meal-planner-view 抽出的纯逻辑，行为保持不变。

export type Priced = { name: string; price: number };

export type MealSlots<T extends Priced = Priced> = {
  breakfast: T[];
  lunch: T[];
  dinner: T[];
  soups: T[];
};

export type Budget = {
  dailyTarget: number;
  dailyMax: number;
  breakfastMax: number;
  lunchMax: number;
  dinnerMax: number;
};

export function cheapest<T extends Priced>(list: T[]): T {
  return list.reduce((x, y) => (y.price < x.price ? y : x));
}

export function priciest<T extends Priced>(list: T[]): T {
  return list.reduce((x, y) => (y.price > x.price ? y : x));
}

// 预算兜底：合计超上限时，把最贵的一档换成本档最低价项，直到合计不超上限
export function fitBudget<T extends Priced>(picks: { meal: T; floor: T }[], max: number): T[] {
  const list = [...picks];
  let sum = list.reduce((n, p) => n + p.meal.price, 0);
  while (sum > max && list.length > 0) {
    let idx = 0;
    for (let i = 1; i < list.length; i++) {
      if (list[i].meal.price > list[idx].meal.price) idx = i;
    }
    if (list[idx].meal.price <= list[idx].floor.price) break;
    sum -= list[idx].meal.price - list[idx].floor.price;
    list[idx] = { meal: list[idx].floor, floor: list[idx].floor };
  }
  return list.map((p) => p.meal);
}

// 是否给出省钱替换建议：当日合计高于日常目标时展示（≤ 上限属正常区间，也照给建议）
export function shouldSuggestSaving(total: number, budget: Budget): boolean {
  return total > budget.dailyTarget;
}

export type SavingPlan = {
  /** 全取低价档的合计（三餐 + 当日有汤时的汤） */
  total: number;
  /** 低价档组合的菜名 */
  items: string[];
  /** 早晚自制 + 午餐外卖混搭的下限 */
  mixLo: number;
  /** 早晚自制 + 午餐外卖混搭的上限（同样守在 dailyMax 内） */
  mixHi: number;
};

// 省钱组合（全取低价档）与「早晚自制 + 午餐外卖」混搭区间；混搭上限同样守在预算内
export function computeSavingPlan<T extends Priced>(params: {
  set: MealSlots<T>;
  homecook: MealSlots<T>;
  takeout: MealSlots<T>;
  hasSoup: boolean;
  budget: Budget;
}): SavingPlan {
  const { set, homecook, takeout, hasSoup, budget } = params;
  const b = cheapest(set.breakfast);
  const l = cheapest(set.lunch);
  const d = cheapest(set.dinner);
  const sp = cheapest(set.soups);
  const soupCost = hasSoup ? sp.price : 0;
  // 混搭上限同样守在预算内：从最贵档起步，超了就往下换
  const mixHiPicks = fitBudget(
    [
      { meal: priciest(homecook.breakfast), floor: cheapest(homecook.breakfast) },
      { meal: priciest(takeout.lunch), floor: cheapest(takeout.lunch) },
      { meal: priciest(homecook.dinner), floor: cheapest(homecook.dinner) },
      ...(hasSoup ? [{ meal: priciest(homecook.soups), floor: cheapest(homecook.soups) }] : []),
    ],
    budget.dailyMax
  );
  return {
    total: b.price + l.price + d.price + soupCost,
    items: hasSoup ? [b.name, l.name, d.name, sp.name] : [b.name, l.name, d.name],
    mixLo:
      cheapest(homecook.breakfast).price +
      cheapest(takeout.lunch).price +
      cheapest(homecook.dinner).price +
      (hasSoup ? cheapest(homecook.soups).price : 0),
    mixHi: mixHiPicks.reduce((n, m) => n + m.price, 0),
  };
}

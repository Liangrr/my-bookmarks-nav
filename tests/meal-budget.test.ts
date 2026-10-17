import { describe, expect, it } from "vitest";
import RAW from "../src/data/meal-planner.json";
import {
  cheapest,
  computeSavingPlan,
  fitBudget,
  priciest,
  shouldSuggestSaving,
  type Budget,
  type MealSlots,
} from "../src/lib/meal-budget";

// 真实数据按最小必要类型读入（断言只用到 name / price）
type Meal = { name: string; price: number };
type PlacedSet = MealSlots & { id: string };

const PLANNER = RAW as unknown as { budget: Budget; sets: PlacedSet[] };
const BUDGET = PLANNER.budget;
const HOME_COOK = PLANNER.sets.find((s) => s.id === "homecook")!;
const TAKEOUT = PLANNER.sets.find((s) => s.id === "takeout")!;

const sumPrices = (list: Meal[]) => list.reduce((n, m) => n + m.price, 0);

describe("预算常量来自真实数据（不是测试里臆造的规则）", () => {
  it("日常目标 ¥50、硬上限 ¥70", () => {
    expect(BUDGET.dailyTarget).toBe(50);
    expect(BUDGET.dailyMax).toBe(70);
  });

  it("每套方案「全取最低价档」的合计本身就在硬上限内（兜底才有解）", () => {
    for (const set of PLANNER.sets) {
      for (const withSoup of [false, true]) {
        const floors = withSoup
          ? [cheapest(set.breakfast), cheapest(set.lunch), cheapest(set.dinner), cheapest(set.soups)]
          : [cheapest(set.breakfast), cheapest(set.lunch), cheapest(set.dinner)];
        expect(sumPrices(floors), `${set.id} 最省组合`).toBeLessThanOrEqual(BUDGET.dailyMax);
      }
    }
  });
});

describe("fitBudget：预算兜底（把最贵的一档换成本档最低价项）", () => {
  it("合计刚好 ¥70 → 边界上不触发替换，仍恰好 ¥70", () => {
    const picks = [
      { meal: { name: "贵的午餐", price: 30 }, floor: { name: "低价午餐", price: 9 } },
      { meal: { name: "贵的晚餐", price: 40 }, floor: { name: "低价晚餐", price: 8 } },
    ];
    const out = fitBudget(picks, BUDGET.dailyMax);
    expect(out.map((m) => m.name)).toEqual(["贵的午餐", "贵的晚餐"]);
    expect(sumPrices(out)).toBe(70);
  });

  it("合计 ¥100 > ¥70 → 兜底后 ≤ ¥70，且不删档只换档", () => {
    const picks = [
      { meal: { name: "a", price: 20 }, floor: { name: "a低价", price: 10 } },
      { meal: { name: "b", price: 40 }, floor: { name: "b低价", price: 15 } },
      { meal: { name: "c", price: 40 }, floor: { name: "c低价", price: 20 } },
    ];
    const out = fitBudget(picks, BUDGET.dailyMax);
    expect(out).toHaveLength(3);
    expect(sumPrices(out)).toBeLessThanOrEqual(BUDGET.dailyMax);
    expect(out.map((m) => m.name)).toEqual(["a", "b低价", "c低价"]);
  });

  it("真实数据：三档全取最贵时会被兜底压回 ≤ ¥70", () => {
    for (const set of PLANNER.sets) {
      const withSoup = [
        { meal: priciest(set.breakfast), floor: cheapest(set.breakfast) },
        { meal: priciest(set.lunch), floor: cheapest(set.lunch) },
        { meal: priciest(set.dinner), floor: cheapest(set.dinner) },
        { meal: priciest(set.soups), floor: cheapest(set.soups) },
      ];
      const before = withSoup.reduce((n, p) => n + p.meal.price, 0);
      const out = fitBudget(withSoup, BUDGET.dailyMax);
      expect(out).toHaveLength(4);
      expect(sumPrices(out), `${set.id} 兜底后`).toBeLessThanOrEqual(BUDGET.dailyMax);
      if (before > BUDGET.dailyMax) {
        // 被兜底的实际发生了压缩（而不是原样返回）
        expect(sumPrices(out)).toBeLessThan(before);
      }
    }
  });

  it("换无可换时不会死循环（最低价档仍超上限就停手）", () => {
    const picks = [{ meal: { name: "a", price: 80 }, floor: { name: "a底线", price: 80 } }];
    expect(fitBudget(picks, BUDGET.dailyMax).map((m) => m.name)).toEqual(["a"]);
  });
});

describe("省钱替换建议的产出条件（组件里 total > dailyTarget 才展示）", () => {
  it("总价 ≤ ¥50 → 不给建议", () => {
    expect(shouldSuggestSaving(50, BUDGET)).toBe(false);
    expect(shouldSuggestSaving(49, BUDGET)).toBe(false);
    // 真实数据里「自己做」全取低价档只有 ¥18，属于达标区间
    const plan = computeSavingPlan({ set: HOME_COOK, homecook: HOME_COOK, takeout: TAKEOUT, hasSoup: true, budget: BUDGET });
    expect(plan.total).toBe(18);
    expect(shouldSuggestSaving(plan.total, BUDGET)).toBe(false);
  });

  it("总价在 ¥50～¥70 之间 → 给出可执行的省钱替换建议", () => {
    // 真实数据：点外卖全取低价档 = 早餐 6 + 午餐 22 + 晚餐 20 + 汤 8 = ¥56
    const plan = computeSavingPlan({ set: TAKEOUT, homecook: HOME_COOK, takeout: TAKEOUT, hasSoup: true, budget: BUDGET });
    expect(shouldSuggestSaving(plan.total, BUDGET)).toBe(true);
    expect(plan.total).toBe(56);
    // 建议可执行：有具体菜名、混搭区间下限不高于上限、上限也守在 ¥70 内
    expect(plan.items).toHaveLength(4);
    expect(plan.items.every((n) => typeof n === "string" && n.length > 0)).toBe(true);
    expect(plan.mixLo).toBeLessThanOrEqual(plan.mixHi);
    expect(plan.mixHi).toBeLessThanOrEqual(BUDGET.dailyMax);
  });

  it("真实数据：当日合计落在 50~70 的区间时，建议同样给出且混搭上限 ≤ ¥70", () => {
    const picks = [
      { meal: priciest(TAKEOUT.breakfast), floor: cheapest(TAKEOUT.breakfast) },
      { meal: priciest(TAKEOUT.lunch), floor: cheapest(TAKEOUT.lunch) },
      { meal: priciest(TAKEOUT.dinner), floor: cheapest(TAKEOUT.dinner) },
      { meal: priciest(TAKEOUT.soups), floor: cheapest(TAKEOUT.soups) },
    ];
    const total = sumPrices(fitBudget(picks, BUDGET.dailyMax));
    expect(total).toBeGreaterThan(BUDGET.dailyTarget);
    expect(total).toBeLessThanOrEqual(BUDGET.dailyMax);
    expect(shouldSuggestSaving(total, BUDGET)).toBe(true);
    const plan = computeSavingPlan({ set: TAKEOUT, homecook: HOME_COOK, takeout: TAKEOUT, hasSoup: false, budget: BUDGET });
    expect(plan.mixHi).toBeLessThanOrEqual(BUDGET.dailyMax);
  });
});

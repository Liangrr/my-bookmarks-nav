import { beforeEach, describe, expect, it } from "vitest";
import {
  checkFruits,
  checkIds,
  checkLiving,
  checkMealPlanner,
  problems,
  validateDataDir,
  warnings,
} from "../scripts/validate-data.mjs";

beforeEach(() => {
  problems.length = 0;
  warnings.length = 0;
});

const place = (over = {}) => ({
  name: "测试店",
  category: "粤菜 · 点心",
  cuisine: "粤菜·早茶",
  district: "福田",
  subArea: "测试商圈",
  station: "地铁1号线测试站",
  address: "福田区测试路 1 号",
  perPerson: 60,
  perText: "约 ¥60",
  level: 1,
  fit: "3~5 人",
  signature: ["招牌菜"],
  tips: "地铁直达",
  verdict: "值得去",
  source: "https://example.com/source",
  sourceNote: "示例来源",
  rank: 1,
  subs: { taste: 4, vibe: 4, service: 4, value: 4 },
  ...over,
});

describe("checkIds：id 缺失 / 重复", () => {
  it("重复 id 会被记成问题", () => {
    checkIds("x.json", [{ id: "a" }, { id: "a" }]);
    expect(problems.some((p) => p.includes("出现重复 id：a"))).toBe(true);
  });

  it("id 缺失或非字符串会被记成问题", () => {
    checkIds("x.json", [{ id: "a" }, { name: "没有 id" }]);
    expect(problems.some((p) => p.includes("id 缺失或非字符串"))).toBe(true);
  });

  it("数字 id 正常，不报问题", () => {
    checkIds("x.json", { list: [{ id: 1 }, { id: 2 }] });
    expect(problems).toEqual([]);
  });
});

describe("checkMealPlanner：聚餐门店体检", () => {
  it("合法数据不报问题", () => {
    checkMealPlanner("meal-planner.json", { feast: { places: [place(), place({ name: "另一家", rank: 2 })] } });
    expect(problems).toEqual([]);
  });

  it("人均越界 / level 与人均不符 / 同名同商圈重复 / 缺 signature / rank 不连续 都能拦下", () => {
    checkMealPlanner("meal-planner.json", {
      feast: {
        places: [
          place({ perPerson: 30 }), // 人均越界（<40），level=1 本身没错
          place({ name: "甲", rank: 2 }),
          place({ name: "乙", rank: 4, perPerson: 100, level: 1 }), // level 应为 2
          place({ name: "甲", rank: 5, signature: [] }), // 同名同商圈重复 + 缺 signature
        ],
      },
    });
    const hits = (kw) => problems.some((p) => p.includes(kw));
    expect(hits("人均应在 40~200：30")).toBe(true);
    expect(hits("level 与人均不符")).toBe(true);
    expect(hits("同名同商圈重复收录")).toBe(true);
    expect(hits("缺 signature 招牌菜")).toBe(true);
    expect(hits("rank 不是 1..n 的连续编号")).toBe(true);
  });

  it("缺 feast.places 直接报缺字段", () => {
    checkMealPlanner("meal-planner.json", {});
    expect(problems.some((p) => p.includes("缺少 feast.places"))).toBe(true);
  });
});

describe("checkFruits / checkLiving：其余专项体检", () => {
  it("水果的 months 必须是 1~12 整数", () => {
    checkFruits("seasonal-fruits.json", {
      fruits: [
        { name: "苹果", kcal: 52, sugar: 10, fat: 0, fiber: 2, months: [1, 13] },
        { name: "梨", kcal: 44, sugar: 9, fat: 0, fiber: 3, months: [8, 9] },
      ],
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("months 应为 1~12 的整数数组");
  });

  it("living：grade 非法 → 问题；缺 sources → 仅警告", () => {
    checkLiving("living-guide.json", {
      sections: [
        {
          title: "测试节",
          items: [
            { title: "坏档", grade: "D", ratio: "高", plain: "p", cost: "c", benefit: "b", sources: [] },
            { title: "缺来源", grade: "A", ratio: "一般", plain: "p", cost: "c", benefit: "b" },
          ],
        },
      ],
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("grade 非 A/B/C：D");
    expect(warnings.some((w) => w.includes("缺 sources"))).toBe(true);
  });
});

describe("validateDataDir：跑真实数据", () => {
  it("真实数据无硬性问题（数据文件），警告不阻断", () => {
    const result = validateDataDir();
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.problems).toEqual([]);
    expect(result.entities).toBeGreaterThan(0);
    expect(result.statsLines).toHaveLength(result.files.length);
  });

  it("重复调用不会累积历史问题", () => {
    checkMealPlanner("meal-planner.json", {});
    expect(problems.length).toBeGreaterThan(0);
    const result = validateDataDir();
    expect(result.problems).toEqual([]);
  });
});

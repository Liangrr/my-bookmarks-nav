"use client";

import { useEffect, useMemo, useState } from "react";
import DATA from "@/data/meal-planner.json";
import FRUIT_DATA from "@/data/seasonal-fruits.json";

type Meal = {
  id: string;
  name: string;
  price: number;
  cookTime: string;
  tags: string[];
  desc: string;
  portion?: string;
  ingredients?: string;
  steps?: string[];
};

type Soup = Meal;

// 聚餐：一桌菜，按整份计价、按人均算花费
type Feast = {
  label: string;
  cold: Meal[];
  main: Meal[];
  veg: Meal[];
  staple: Meal[];
  soups: Meal[];
};

type MealSet = {
  id: string;
  label: string;
  icon: string;
  priceLabel: string;
  timeLabel: string;
  desc: string;
  breakfast: Meal[];
  lunch: Meal[];
  dinner: Meal[];
  soups: Soup[];
  feast?: Feast;
};

type PlannerData = {
  version: string;
  budget: {
    dailyTarget: number;
    dailyMax: number;
    breakfastMax: number;
    lunchMax: number;
    dinnerMax: number;
  };
  sets: MealSet[];
};

type Fruit = {
  id: string;
  name: string;
  icon: string;
  kcal: number;
  sugar: number;
  fat: number;
  fiber: number;
  diet: string;
  benefit: string;
  months: number[];
  tags: string[];
};

type Ymd = { y: number; m: number; d: number };

const PLANNER = DATA as PlannerData;
const FRUITS = (FRUIT_DATA as { fruits: Fruit[] }).fruits;
const BUDGET = PLANNER.budget;

const MAX_MAP: Record<string, number> = {
  breakfast: BUDGET.breakfastMax,
  lunch: BUDGET.lunchMax,
  dinner: BUDGET.dinnerMax,
};

const SLOTS = [
  { key: "breakfast", label: "早餐", icon: "🌅", color: "#f59e0b" },
  { key: "lunch", label: "午餐", icon: "☀️", color: "#3b82f6" },
  { key: "dinner", label: "晚餐", icon: "🌙", color: "#8b5cf6" },
] as const;

const DAYS = [
  { offset: 0, label: "今天" },
  { offset: 1, label: "明天" },
  { offset: 2, label: "后天" },
];

const SALT: Record<string, number> = {
  breakfast: 11,
  lunch: 23,
  dinner: 37,
  soup: 53,
  fruit: 71,
};
const ROUND_STEP = 7919;

// 场合：个人（一人份三餐） / 聚餐（一桌分享菜，按人均算）
const SCENES = [
  { key: "solo", label: "个人", icon: "👤", desc: "一人份：三餐按份计价" },
  { key: "feast", label: "聚餐", icon: "👥", desc: "4~6 人一桌：整份计价、按人均算" },
] as const;
type SceneKey = (typeof SCENES)[number]["key"];

// 聚餐按 4 人桌折算人均
const PEOPLE = 4;

const FEAST_SALT: Record<string, number> = {
  cold: 13,
  main: 29,
  veg: 43,
  staple: 59,
  soup: 67,
  fruit: 79,
};

// 用于推导「营养均衡」的关键词（不手写营养字段，按实际选中项推导）
const NUTRI_KEYS = {
  protein: ["鸡蛋", "鸡腿", "鸡胸", "鸡肉", "牛腩", "牛肉", "排骨", "肉", "虾", "鱼", "豆腐", "酸奶", "牛奶", "猪肚"],
  veg: ["菜", "西兰花", "包菜", "黄瓜", "番茄", "菌菇", "香菇", "山药", "冬瓜", "南瓜", "丝瓜", "萝卜", "紫菜", "豆芽"],
  staple: ["饭", "面", "粥", "馒头", "吐司", "饺", "包", "米线", "粉丝", "红薯", "玉米", "疙瘩", "手抓饼", "煎饼"],
};

function mulberry32(seed: number) {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(list: T[], seed: number): T[] {
  const rnd = mulberry32(seed);
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 同一餐位按同一种子洗牌，再用「天次」作下标取，保证今天/明天/后天不重样
function pickBy<T>(list: T[], seed: number, offset: number): T {
  const arr = shuffle(list, seed);
  return arr[offset % arr.length];
}

// 预算兜底：合计超上限时，把最贵的一档换成本档最低价项，直到合计不超上限
function fitBudget(picks: { meal: Meal; floor: Meal }[], max: number): Meal[] {
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

function monthAfter(t: Ymd, offset: number) {
  const d = new Date(t.y, t.m - 1, t.d + offset);
  return d.getMonth() + 1;
}

function dateLabel(t: Ymd, offset: number) {
  const d = new Date(t.y, t.m - 1, t.d + offset);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function matchNames(text: string, keys: string[]) {
  return keys.some((k) => text.includes(k));
}

export function MealPlanner() {
  const [round, setRound] = useState(0);
  const [setIdx, setSetIdx] = useState(0);
  const [dayIdx, setDayIdx] = useState(0);
  const [sceneIdx, setSceneIdx] = useState(0);
  // 日期状态挂载后再置入，避免服务端/客户端跨时区 hydration 不一致
  const [today, setToday] = useState<Ymd | null>(null);
  useEffect(() => {
    const d = new Date();
    setToday({ y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() });
  }, []);

  const base = today ? today.y * 10000 + today.m * 100 + today.d : 1;

  const plans = useMemo(() => {
    const month = today ? monthAfter(today, DAYS[dayIdx].offset) : null;
    const seasonal = month ? FRUITS.filter((f) => f.months.includes(month)) : FRUITS;
    const pool = seasonal.length > 0 ? seasonal : FRUITS;
    // 汤非每日必需：三天里固定一天不配汤（同一天结果固定，「换一批」会换位置）
    const soupDays = shuffle([true, true, false], base + round * ROUND_STEP + 977);
    const cheapest = (a: Meal[]) => a.reduce((x, y) => (y.price < x.price ? y : x));
    return PLANNER.sets.map((s, si) => {
      const sb = base + round * ROUND_STEP + si * 101;
      const offset = DAYS[dayIdx].offset;
      const hasSoup = soupDays[offset % soupDays.length];
      // 先按种子选，再经预算兜底，保证当日合计不超 ¥BUDGET.dailyMax
      const [breakfast, lunch, dinner, pickedSoup] = fitBudget(
        [
          { meal: pickBy(s.breakfast, sb + SALT.breakfast, offset), floor: cheapest(s.breakfast) },
          { meal: pickBy(s.lunch, sb + SALT.lunch, offset), floor: cheapest(s.lunch) },
          { meal: pickBy(s.dinner, sb + SALT.dinner, offset), floor: cheapest(s.dinner) },
          ...(hasSoup ? [{ meal: pickBy(s.soups, sb + SALT.soup, offset), floor: cheapest(s.soups) }] : []),
        ],
        BUDGET.dailyMax
      );
      return {
        breakfast,
        lunch,
        dinner,
        soup: pickedSoup ?? pickBy(s.soups, sb + SALT.soup, offset),
        hasSoup,
        fruit: pickBy(pool, sb + SALT.fruit, offset),
        month,
      };
    });
  }, [base, round, dayIdx, today]);

  const totals = plans.map(
    (p) => p.breakfast.price + p.lunch.price + p.dinner.price + (p.hasSoup ? p.soup.price : 0)
  );

  // 聚餐：1 凉菜 + 2 硬菜 + 1 时蔬 + 1 主食 + 1 锅汤，整份价合计后按 4 人折算人均
  const feasts = useMemo(() => {
    const month = today ? monthAfter(today, DAYS[dayIdx].offset) : null;
    const seasonal = month ? FRUITS.filter((f) => f.months.includes(month)) : FRUITS;
    const pool = seasonal.length > 0 ? seasonal : FRUITS;
    const cheapest = (a: Meal[]) => a.reduce((x, y) => (y.price < x.price ? y : x));
    return PLANNER.sets.map((s, si) => {
      if (!s.feast) return null;
      const f = s.feast;
      const sb = base + round * ROUND_STEP + si * 101;
      const offset = DAYS[dayIdx].offset;
      const picks = fitBudget(
        [
          { meal: pickBy(f.cold, sb + FEAST_SALT.cold, offset), floor: cheapest(f.cold) },
          { meal: pickBy(f.main, sb + FEAST_SALT.main, offset), floor: cheapest(f.main) },
          { meal: pickBy(f.main, sb + FEAST_SALT.main, offset + 1), floor: cheapest(f.main) },
          { meal: pickBy(f.veg, sb + FEAST_SALT.veg, offset), floor: cheapest(f.veg) },
          { meal: pickBy(f.staple, sb + FEAST_SALT.staple, offset), floor: cheapest(f.staple) },
          { meal: pickBy(f.soups, sb + FEAST_SALT.soup, offset), floor: cheapest(f.soups) },
        ],
        BUDGET.dailyMax * PEOPLE
      );
      // 兜底后两道硬菜可能撞成同一道：换一道不涨价的替补，保证一桌不重样
      if (picks[1].id === picks[2].id) {
        const alt =
          f.main.find((m) => m.id !== picks[1].id && m.price <= picks[2].price) ??
          f.main.find((m) => m.id !== picks[1].id);
        if (alt) picks[2] = alt;
      }
      return {
        label: f.label,
        dishes: [
          { slot: "凉菜", meal: picks[0] },
          { slot: "硬菜", meal: picks[1] },
          { slot: "硬菜", meal: picks[2] },
          { slot: "时蔬", meal: picks[3] },
          { slot: "主食", meal: picks[4] },
        ],
        soup: picks[5],
        fruits: [pickBy(pool, sb + FEAST_SALT.fruit, offset), pickBy(pool, sb + FEAST_SALT.fruit, offset + 1)],
        month,
      };
    });
  }, [base, round, dayIdx, today]);

  const set = PLANNER.sets[setIdx];
  const plan = plans[setIdx];
  const total = totals[setIdx];
  const day = DAYS[dayIdx];
  const budgetState =
    total > BUDGET.dailyMax
      ? { text: "✗ 超上限", color: "#ef4444", bg: "rgba(239,68,68,0.12)" }
      : total > BUDGET.dailyTarget
        ? { text: "⚠ 高于日常目标", color: "#f59e0b", bg: "rgba(245,158,11,0.14)" }
        : { text: `✓ 达标 ≤¥${BUDGET.dailyTarget}`, color: "#22c55e", bg: "rgba(34,197,94,0.12)" };

  const scene: SceneKey = SCENES[sceneIdx].key;
  const feast = feasts[setIdx];
  const feastTotals = feasts.map((f) =>
    f ? f.dishes.reduce((n, d) => n + d.meal.price, 0) + f.soup.price : 0
  );
  const feastTotal = feastTotals[setIdx];
  const feastPer = Math.round(feastTotal / PEOPLE);
  const feastBudgetState =
    feastPer > BUDGET.dailyMax
      ? { text: "✗ 人均超上限", color: "#ef4444", bg: "rgba(239,68,68,0.12)" }
      : feastPer > BUDGET.dailyTarget
        ? { text: "⚠ 高于人均目标", color: "#f59e0b", bg: "rgba(245,158,11,0.14)" }
        : { text: `✓ 人均 ≤¥${BUDGET.dailyTarget}`, color: "#22c55e", bg: "rgba(34,197,94,0.12)" };

  // 同样三餐 + 汤的最省组合；以及「早晚自制 + 午餐外卖」混搭区间（该天不配汤则不计汤价）
  const saving = useMemo(() => {
    const cheapest = (a: Meal[]) => a.reduce((x, y) => (y.price < x.price ? y : x));
    const priciest = (a: Meal[]) => a.reduce((x, y) => (y.price > x.price ? y : x));
    const b = cheapest(set.breakfast);
    const l = cheapest(set.lunch);
    const d = cheapest(set.dinner);
    const sp = cheapest(set.soups);
    const hc = PLANNER.sets.find((s) => s.id === "homecook")!;
    const to = PLANNER.sets.find((s) => s.id === "takeout")!;
    const soupCost = plan.hasSoup ? sp.price : 0;
    // 混搭上限同样守在预算内：从最贵档起步，超了就往下换
    const mixHiPicks = fitBudget(
      [
        { meal: priciest(hc.breakfast), floor: cheapest(hc.breakfast) },
        { meal: priciest(to.lunch), floor: cheapest(to.lunch) },
        { meal: priciest(hc.dinner), floor: cheapest(hc.dinner) },
        ...(plan.hasSoup ? [{ meal: priciest(hc.soups), floor: cheapest(hc.soups) }] : []),
      ],
      BUDGET.dailyMax
    );
    return {
      total: b.price + l.price + d.price + soupCost,
      items: plan.hasSoup ? [b.name, l.name, d.name, sp.name] : [b.name, l.name, d.name],
      mixLo:
        cheapest(hc.breakfast).price +
        cheapest(to.lunch).price +
        cheapest(hc.dinner).price +
        (plan.hasSoup ? cheapest(hc.soups).price : 0),
      mixHi: mixHiPicks.reduce((n, m) => n + m.price, 0),
    };
  }, [set, plan.hasSoup]);

  // 营养均衡：按当日实际选中的三餐（+ 有汤时的汤）推导
  const balance = useMemo(() => {
    const items = [plan.breakfast.name, plan.lunch.name, plan.dinner.name];
    if (plan.hasSoup) items.push(plan.soup.name);
    const collect = (keys: string[]) =>
      items.filter((n) => matchNames(n, keys)).map((n) => n.split(/[+（(]/)[0].trim());
    return {
      protein: collect(NUTRI_KEYS.protein),
      veg: collect(NUTRI_KEYS.veg),
      staple: collect(NUTRI_KEYS.staple),
    };
  }, [plan]);

  const balanced = balance.protein.length >= 2 && balance.veg.length >= 2 && balance.staple.length >= 1;

  // 聚餐营养均衡：按整桌 6 道菜（含汤）推导
  const feastBalance = useMemo(() => {
    if (!feast) return null;
    const items = [...feast.dishes.map((d) => d.meal.name), feast.soup.name];
    const collect = (keys: string[]) =>
      items.filter((n) => matchNames(n, keys)).map((n) => n.split(/[+（(]/)[0].trim());
    return {
      protein: collect(NUTRI_KEYS.protein),
      veg: collect(NUTRI_KEYS.veg),
      staple: collect(NUTRI_KEYS.staple),
    };
  }, [feast]);

  const feastBalanced =
    !!feastBalance &&
    feastBalance.protein.length >= 2 &&
    feastBalance.veg.length >= 2 &&
    feastBalance.staple.length >= 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header style={{ marginTop: 4 }}>
        <h1
          style={{
            fontSize: 30,
            fontWeight: 800,
            margin: 0,
            background: "linear-gradient(135deg, #f59e0b, #ec4899)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          今天吃什么
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "8px 0 0", lineHeight: 1.7 }}>
          {scene === "solo" ? (
            <>
              近三天营养套餐：每天三餐 + 🍎 应季水果，🍲 汤按天间隔安排（不是每天都有）。
              两套方案可选：🍳 自己做（成本约为外卖一半）或 🛵 点外卖。花费日常目标 ¥{BUDGET.dailyTarget}
              左右，最多不超过 ¥{BUDGET.dailyMax}，同一天结果固定。
            </>
          ) : (
            <>
              聚餐模式：4~6 人一桌，1 凉菜 + 2 硬菜 + 1 时蔬 + 1 主食 + 一锅汤 + 果盘，按整份价合计后折算人均。
              两套方案可选：🍳 自己做（成本约为外卖一半）或 🛵 点外卖。人均目标 ¥{BUDGET.dailyTarget}
              左右，最多不超过 ¥{BUDGET.dailyMax}，同一天结果固定。
            </>
          )}
        </p>
      </header>

      {/* 场合：个人 / 聚餐 */}
      <div style={{ display: "flex", gap: 8 }}>
        {SCENES.map((s, i) => {
          const on = i === sceneIdx;
          return (
            <button
              key={s.key}
              onClick={() => setSceneIdx(i)}
              style={{
                flex: 1,
                padding: "12px 10px",
                borderRadius: "var(--radius-lg)",
                cursor: "pointer",
                textAlign: "left",
                border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
                background: on
                  ? "color-mix(in srgb, var(--accent) 12%, var(--bg-card))"
                  : "var(--bg-card)",
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 800, color: on ? "var(--accent)" : "var(--text-primary)" }}>
                {s.icon} {s.label}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>{s.desc}</div>
            </button>
          );
        })}
      </div>

      {/* 天次：今天 / 明天 / 后天 */}
      <div style={{ display: "flex", gap: 8 }}>
        {DAYS.map((d, i) => {
          const on = i === dayIdx;
          return (
            <button
              key={d.offset}
              onClick={() => setDayIdx(i)}
              style={{
                flex: 1,
                padding: "10px 8px",
                borderRadius: "var(--radius-lg)",
                cursor: "pointer",
                border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
                background: on
                  ? "color-mix(in srgb, var(--accent) 12%, var(--bg-card))"
                  : "var(--bg-card)",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 800, color: on ? "var(--accent)" : "var(--text-primary)" }}>
                {d.label}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
                {today ? dateLabel(today, d.offset) : "—"}
              </div>
            </button>
          );
        })}
      </div>

      {/* 两套方案切换 */}
      <div style={{ display: "flex", gap: 8 }}>
        {PLANNER.sets.map((s, i) => {
          const on = i === setIdx;
          return (
            <button
              key={s.id}
              onClick={() => setSetIdx(i)}
              style={{
                flex: 1,
                padding: "12px 10px",
                borderRadius: "var(--radius-lg)",
                cursor: "pointer",
                textAlign: "left",
                border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
                background: on
                  ? "color-mix(in srgb, var(--accent) 12%, var(--bg-card))"
                  : "var(--bg-card)",
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 800, color: on ? "var(--accent)" : "var(--text-primary)" }}>
                {s.icon} {s.label}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>
                {scene === "solo"
                  ? `${day.label} ${s.priceLabel} ¥${totals[i]}`
                  : `${day.label} 整桌 ¥${feastTotals[i]} · 人均 ¥${Math.round(feastTotals[i] / PEOPLE)}`}
              </div>
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: 0, lineHeight: 1.6 }}>{set.desc}</p>

      {scene === "solo" ? (
        <>
      {/* 当日预算：目标 ≤50，最多不超过 70 */}
      <div
        style={{
          padding: "14px 16px",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          background: "var(--bg-card)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
              {day.label} · {set.icon} {set.label} · {plan.hasSoup ? "含汤含果" : "含果（不配汤）"}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, marginTop: 2 }}>
              ¥{total}
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-tertiary)", marginLeft: 8 }}>
                目标 ¥{BUDGET.dailyTarget} · 上限 ¥{BUDGET.dailyMax}
              </span>
            </div>
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              padding: "6px 12px",
              borderRadius: 999,
              background: budgetState.bg,
              color: budgetState.color,
            }}
          >
            {budgetState.text}
          </div>
        </div>

        {total > BUDGET.dailyTarget && (
          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: "1px solid var(--border)",
              fontSize: 12,
              color: "var(--text-secondary)",
              lineHeight: 1.75,
            }}
          >
            {total > saving.total && (
              <div>
                <span style={{ color: "var(--text-tertiary)" }}>省钱组合：</span>
                全取低价档（{saving.items.join(" + ")}）可压到{" "}
                <b style={{ color: "var(--accent)" }}>¥{saving.total}</b>，比当前省 ¥{total - saving.total}
              </div>
            )}
            <div>
              <span style={{ color: "var(--text-tertiary)" }}>混搭建议：</span>
              早/晚自己做 + 午餐外卖，一天约 ¥{saving.mixLo}～{saving.mixHi}，最容易守在 ¥
              {BUDGET.dailyTarget} 上下
            </div>
          </div>
        )}
      </div>

      {/* 三餐卡片 */}
      {SLOTS.map((slot) => {
        const data = plan[slot.key];
        const max = MAX_MAP[slot.key];
        return (
          <div
            key={slot.key}
            style={{
              padding: 16,
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              borderLeft: `4px solid ${slot.color}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 22 }}>{slot.icon}</span>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{slot.label}</span>
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "var(--bg-card-hover)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  ≤ ¥{max}
                </span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: slot.color }}>¥{data.price}</div>
            </div>

            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{data.name}</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 8 }}>{data.desc}</div>

            {data.ingredients && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-secondary)",
                  marginBottom: 8,
                }}
              >
                <span style={{ color: "var(--text-tertiary)" }}>食材：</span>
                {data.ingredients}
              </div>
            )}

            {data.steps && data.steps.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                {data.steps.map((st, i) => (
                  <div
                    key={i}
                    style={{ display: "flex", gap: 6, fontSize: 12, lineHeight: 1.6, color: "var(--text-secondary)" }}
                  >
                    <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                    <span>{st}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 11,
                  padding: "3px 8px",
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  color: "var(--text-tertiary)",
                }}
              >
                {set.id === "homecook" ? "⏱" : "🛵"} {data.cookTime}
              </span>
              {data.tags.map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 11,
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: "var(--bg-card-hover)",
                    color: "var(--text-secondary)",
                  }}
                >
                  #{t}
                </span>
              ))}
            </div>
          </div>
        );
      })}

      {/* 汤品（非每日必需，按天间隔安排） */}
      {plan.hasSoup ? (
      <div
        style={{
          padding: 16,
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          background: "var(--bg-card)",
          borderLeft: "4px solid #14b8a6",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 22 }}>🍲</span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{day.label}汤品</span>
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 999,
                background: "var(--bg-card-hover)",
                color: "var(--text-tertiary)",
              }}
            >
              共 {set.soups.length} 款可换
            </span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#14b8a6" }}>¥{plan.soup.price}</div>
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{plan.soup.name}</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 8 }}>
          {plan.soup.desc}
        </div>
        {plan.soup.ingredients && (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              padding: "8px 10px",
              borderRadius: "var(--radius-sm)",
              background: "var(--bg-secondary)",
              marginBottom: 8,
            }}
          >
            <span style={{ color: "var(--text-tertiary)" }}>食材：</span>
            {plan.soup.ingredients}
          </div>
        )}
        {plan.soup.steps && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
            {plan.soup.steps.map((st, i) => (
              <div key={i} style={{ display: "flex", gap: 6, fontSize: 12, lineHeight: 1.6, color: "var(--text-secondary)" }}>
                <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                <span>{st}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 11,
              padding: "3px 8px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              color: "var(--text-tertiary)",
            }}
          >
            {set.id === "homecook" ? "⏱" : "🛵"} {plan.soup.cookTime}
          </span>
          {plan.soup.tags.map((t) => (
            <span
              key={t}
              style={{
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 999,
                background: "var(--bg-card-hover)",
                color: "var(--text-secondary)",
              }}
            >
              #{t}
            </span>
          ))}
        </div>
      </div>
      ) : (
        <div
          style={{
            padding: 16,
            borderRadius: "var(--radius-lg)",
            border: "1px dashed var(--border)",
            background: "var(--bg-card)",
            borderLeft: "4px solid #14b8a6",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 22 }}>🍲</span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{day.label}不配汤</span>
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 999,
                background: "var(--bg-card-hover)",
                color: "var(--text-tertiary)",
              }}
            >
              隔天喝更合理
            </span>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 8 }}>
            汤不是每天必需。这天可用 300ml 温水、一杯无糖豆浆或一碗杂粮粥替代，补水同样够；三餐蛋白质与蔬菜吃够就行。
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              lineHeight: 1.7,
              padding: "8px 10px",
              borderRadius: "var(--radius-sm)",
              background: "var(--bg-secondary)",
            }}
          >
            想喝的话，本套可加：{plan.soup.name}（¥{plan.soup.price}，{plan.soup.cookTime}）——加后当日约 ¥
            {total + plan.soup.price}
          </div>
        </div>
      )}

      {/* 应季水果搭配 */}
      <div
        style={{
          padding: 16,
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          background: "var(--bg-card)",
          borderLeft: "4px solid #ec4899",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 22 }}>🍎</span>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{day.label}水果搭配</span>
          <span
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 999,
              background: "var(--bg-card-hover)",
              color: "var(--text-tertiary)",
            }}
          >
            {plan.month ? `${plan.month} 月当季` : "按季节推荐"} · 建议 200～300g
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: plan.fruit.icon ? 24 : 16,
              fontWeight: 800,
              color: "var(--accent)",
              background: "var(--bg-secondary)",
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            {plan.fruit.icon || plan.fruit.name[0]}
          </span>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{plan.fruit.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
              {plan.fruit.kcal} kcal · 糖 {plan.fruit.sugar}g · 纤维 {plan.fruit.fiber}g · {plan.fruit.diet}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 8 }}>
          {plan.fruit.benefit}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {plan.fruit.tags.map((t) => (
            <span
              key={t}
              style={{
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 999,
                background: "var(--bg-card-hover)",
                color: "var(--text-secondary)",
              }}
            >
              #{t}
            </span>
          ))}
        </div>
      </div>

      {/* 营养均衡汇总 */}
      <div
        style={{
          padding: 16,
          borderRadius: "var(--radius-lg)",
          border: `1px solid ${balanced ? "rgba(34,197,94,0.4)" : "var(--border)"}`,
          background: "var(--bg-card)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>
            {balanced ? "✅" : "⚠️"} {day.label}营养均衡
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: 999,
              background: balanced ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.14)",
              color: balanced ? "#22c55e" : "#f59e0b",
            }}
          >
            {balanced ? "结构完整" : "建议加一份蔬菜或蛋白"}
          </span>
        </div>
        {[
          { label: "蛋白质", list: balance.protein },
          { label: "蔬菜", list: balance.veg },
          { label: "主食 / 碳水", list: balance.staple },
          { label: "汤", list: plan.hasSoup ? [plan.soup.name] : [] },
          { label: "水果", list: [`${plan.fruit.name}（${plan.fruit.kcal} kcal / 纤维 ${plan.fruit.fiber}g）`] },
        ].map((row) => (
          <div
            key={row.label}
            style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", fontSize: 13 }}
          >
            <span style={{ width: 82, flexShrink: 0, color: "var(--text-tertiary)" }}>{row.label}</span>
            <span style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {row.list.length > 0
                ? row.list.join(" · ")
                : row.label === "汤"
                  ? "— 今天不配（隔天喝更合理）"
                  : "—（今日这份偏少，可加一份）"}
            </span>
          </div>
        ))}
      </div>
        </>
      ) : (
        <>
          {/* 聚餐预算卡：整桌价 + 人均 */}
          <div
            style={{
              padding: "14px 16px",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  {day.label} · {set.icon} {set.label} · {feast ? feast.label : "聚餐"} · 按 {PEOPLE} 人摊
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 2 }}>
                  ¥{feastTotal}
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-tertiary)", marginLeft: 8 }}>
                    人均 ¥{feastPer} · 目标 ¥{BUDGET.dailyTarget} · 上限 ¥{BUDGET.dailyMax}
                  </span>
                </div>
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "6px 12px",
                  borderRadius: 999,
                  background: feastBudgetState.bg,
                  color: feastBudgetState.color,
                }}
              >
                {feastBudgetState.text}
              </div>
            </div>
            <div
              style={{
                marginTop: 10,
                paddingTop: 10,
                borderTop: "1px solid var(--border)",
                fontSize: 12,
                color: "var(--text-secondary)",
                lineHeight: 1.75,
              }}
            >
              <span style={{ color: "var(--text-tertiary)" }}>点菜思路：</span>
              两道硬菜定人数感，凉菜和时蔬压成本，主食点大份分着吃；菜品数比人数少一道最不容易剩。
            </div>
          </div>

          {/* 聚餐菜单：一桌 6 道 */}
          {feast && (
            <div
              style={{
                padding: 16,
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                borderLeft: "4px solid #3b82f6",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 22 }}>🍽️</span>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{day.label}聚餐菜单</span>
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "var(--bg-card-hover)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  6 道 · 4~6 人 · 整份价
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {feast.dishes.map((d, i) => (
                  <div
                    key={`${d.meal.id}-${i}`}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "var(--radius-md)",
                      background: "var(--bg-secondary)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "var(--bg-card-hover)",
                            color: "var(--text-tertiary)",
                            flexShrink: 0,
                          }}
                        >
                          {d.slot}
                        </span>
                        <span style={{ fontSize: 16, fontWeight: 700 }}>{d.meal.name}</span>
                        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                          {d.meal.portion ?? "4~6 人份"} · {d.meal.cookTime}
                        </span>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--accent)", flexShrink: 0 }}>
                        ¥{d.meal.price}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginTop: 4 }}>
                      {d.meal.desc}
                    </div>
                    {d.meal.ingredients && (
                      <div style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.6, marginTop: 4 }}>
                        食材：{d.meal.ingredients}
                      </div>
                    )}
                    {d.meal.steps && d.meal.steps.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
                        {d.meal.steps.map((st, si) => (
                          <div
                            key={si}
                            style={{
                              display: "flex",
                              gap: 6,
                              fontSize: 12,
                              lineHeight: 1.6,
                              color: "var(--text-secondary)",
                            }}
                          >
                            <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>{si + 1}.</span>
                            <span>{st}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 聚餐汤：一大锅 */}
          {feast && (
            <div
              style={{
                padding: 16,
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                borderLeft: "4px solid #14b8a6",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 22 }}>🍲</span>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{day.label}聚餐汤</span>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "var(--bg-card-hover)",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    一大锅 · 够 4~6 人
                  </span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#14b8a6" }}>¥{feast.soup.price}</div>
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{feast.soup.name}</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 8 }}>
                {feast.soup.desc}
              </div>
              {feast.soup.ingredients && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                    padding: "8px 10px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-secondary)",
                    marginBottom: 8,
                  }}
                >
                  <span style={{ color: "var(--text-tertiary)" }}>食材：</span>
                  {feast.soup.ingredients}
                </div>
              )}
              {feast.soup.steps && feast.soup.steps.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {feast.soup.steps.map((st, si) => (
                    <div
                      key={si}
                      style={{ display: "flex", gap: 6, fontSize: 12, lineHeight: 1.6, color: "var(--text-secondary)" }}
                    >
                      <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>{si + 1}.</span>
                      <span>{st}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 果盘 */}
          {feast && (
            <div
              style={{
                padding: 16,
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                borderLeft: "4px solid #ec4899",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 22 }}>🍎</span>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{day.label}果盘</span>
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "var(--bg-card-hover)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  切块拼盘 · 约 1kg · 够 4~6 人
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {feast.fruits.map((f) => (
                  <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "var(--radius-sm)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: f.icon ? 20 : 15,
                        fontWeight: 800,
                        color: "var(--accent)",
                        background: "var(--bg-secondary)",
                        flexShrink: 0,
                      }}
                      aria-hidden="true"
                    >
                      {f.icon || f.name[0]}
                    </span>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{f.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                        {f.kcal} kcal · 糖 {f.sugar}g · 纤维 {f.fiber}g · {f.diet}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginTop: 8 }}>
                果盘先摆上桌，等菜的时候垫肚子，比薯片和含糖饮料健康。
              </div>
            </div>
          )}

          {/* 整桌营养均衡 */}
          {feast && feastBalance && (
            <div
              style={{
                padding: 16,
                borderRadius: "var(--radius-lg)",
                border: `1px solid ${feastBalanced ? "rgba(34,197,94,0.4)" : "var(--border)"}`,
                background: "var(--bg-card)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>
                  {feastBalanced ? "✅" : "⚠️"} {day.label}整桌营养均衡
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: feastBalanced ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.14)",
                    color: feastBalanced ? "#22c55e" : "#f59e0b",
                  }}
                >
                  {feastBalanced ? "荤素齐了" : "建议加一道蔬菜"}
                </span>
              </div>
              {[
                { label: "蛋白质", list: feastBalance.protein },
                { label: "蔬菜", list: feastBalance.veg },
                { label: "主食 / 碳水", list: feastBalance.staple },
                { label: "汤", list: [feast.soup.name] },
                { label: "水果", list: feast.fruits.map((f) => f.name) },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", fontSize: 13 }}
                >
                  <span style={{ width: 82, flexShrink: 0, color: "var(--text-tertiary)" }}>{row.label}</span>
                  <span style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    {row.list.length > 0 ? row.list.join(" · ") : "—（这桌偏少，可加一道）"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <button
        onClick={() => setRound((r) => r + 1)}
        style={{
          height: 44,
          borderRadius: "var(--radius-lg)",
          border: "none",
          cursor: "pointer",
          background: "linear-gradient(135deg, #f59e0b, #ec4899)",
          color: "#fff",
          fontSize: 15,
          fontWeight: 700,
        }}
      >
        🎲 换一批推荐（三天 × 两套同时）
      </button>
    </div>
  );
}

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

// 聚餐：只去店里吃，按「人均 × 人数」算花费
type Place = {
  id: string;
  name: string;
  category: string;
  district: string;
  station: string;
  perPerson: number;
  perText: string;
  level: number;
  fit: string;
  signature: string[];
  tips: string;
  source: string;
  sourceNote: string;
};

type FeastData = {
  label: string;
  area: string;
  note: string;
  people: number[];
  places: Place[];
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
  feast?: FeastData;
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

// 场合：个人（自己做 / 点外卖） / 聚餐（只去店里吃）
const SCENES = [
  { key: "solo", label: "个人", icon: "👤", desc: "一人份：自己做或点外卖" },
  { key: "feast", label: "聚餐", icon: "👥", desc: "3~5 人：去店里吃" },
] as const;
type SceneKey = (typeof SCENES)[number]["key"];

// 聚餐数据（单一：只去店里吃），人数在数据里可配
const FEAST = (PLANNER.feast ?? null) as FeastData | null;
const FEAST_PEOPLE: number[] = FEAST && FEAST.people.length > 0 ? FEAST.people : [3, 4, 5];
const LEVEL_LABEL: Record<number, string> = { 1: "平价", 2: "中档", 3: "稍贵", 4: "高档" };
const LEVEL_SALT: Record<number, number> = { 1: 17, 2: 31, 3: 47, 4: 61 };

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
  // 聚餐人数，默认取数据里的中间档（3/4/5 → 4）
  const [people, setPeople] = useState(FEAST_PEOPLE[Math.min(1, FEAST_PEOPLE.length - 1)] ?? 3);
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

  // 聚餐：只去店里吃。按价位档各取一家，不分天次；「换一批」换的是别家
  const feastPicks = useMemo(() => {
    if (!FEAST || FEAST.places.length === 0) return null;
    const seed = base + round * ROUND_STEP;
    const levels = Array.from(new Set(FEAST.places.map((p) => p.level))).sort((a, b) => a - b);
    const picked: Place[] = [];
    levels.forEach((lv) => {
      const pool = FEAST.places.filter((p) => p.level === lv);
      if (pool.length === 0) return;
      picked.push(pickBy(pool, seed + (LEVEL_SALT[lv] ?? 0), 0));
    });
    // 档位不够 3 家时，用剩余店铺补齐
    if (picked.length < 3) {
      FEAST.places.forEach((p) => {
        if (picked.length < 3 && !picked.some((x) => x.id === p.id)) picked.push(p);
      });
    }
    picked.sort((a, b) => a.level - b.level);
    return picked.slice(0, 3);
  }, [base, round]);

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
  const feastPerMin = FEAST ? Math.min(...FEAST.places.map((p) => p.perPerson)) : 0;
  const feastPerMax = FEAST ? Math.max(...FEAST.places.map((p) => p.perPerson)) : 0;

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

  // 聚餐只看餐馆：这里直接进入渲染
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
              聚餐模式：只去店里吃。范围 {FEAST ? FEAST.area : "深圳 · 岗厦 → 大剧院"}，
              {FEAST_PEOPLE[0]}~{FEAST_PEOPLE[FEAST_PEOPLE.length - 1]} 人，给 3 家不同价位的候选，
              按「人均 × 人数」估总花费。人均与门店来自公开点评 / 榜单，点来源可核验，价格会变动。
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

      {/* 天次：今天 / 明天 / 后天（仅个人；聚餐是去店里吃的候选名单，不分天次） */}
      {scene === "solo" && (
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
      )}

      {/* 两套方案（仅个人：自己做 / 点外卖）；聚餐只去店里吃，没有这一层 */}
      {scene === "solo" && (
        <>
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
                    {day.label} {s.priceLabel} ¥{totals[i]}
                  </div>
                </button>
              );
            })}
          </div>

          <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: 0, lineHeight: 1.6 }}>{set.desc}</p>
        </>
      )}

      {/* 聚餐人数 */}
      {scene === "feast" && (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--text-tertiary)", flexShrink: 0 }}>人数</span>
          {FEAST_PEOPLE.map((n) => {
            const on = n === people;
            return (
              <button
                key={n}
                onClick={() => setPeople(n)}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  borderRadius: "var(--radius-lg)",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 800,
                  border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
                  background: on
                    ? "color-mix(in srgb, var(--accent) 12%, var(--bg-card))"
                    : "var(--bg-card)",
                  color: on ? "var(--accent)" : "var(--text-primary)",
                }}
              >
                {n} 人
              </button>
            );
          })}
        </div>
      )}

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
          {/* 聚餐：区域 + 人数 + 人均区间 */}
          <div
            style={{
              padding: "14px 16px",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  {people} 人 · 去店里吃
                </div>
                <div style={{ fontSize: 21, fontWeight: 800, marginTop: 2 }}>
                  {FEAST ? FEAST.area : "深圳 · 岗厦 → 大剧院"}
                </div>
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "6px 12px",
                  borderRadius: 999,
                  background: "color-mix(in srgb, var(--accent) 12%, var(--bg-card))",
                  color: "var(--accent)",
                  flexShrink: 0,
                }}
              >
                人均 ¥{feastPerMin}~{feastPerMax}
              </div>
            </div>
            {FEAST && (
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
                {FEAST.note}
              </div>
            )}
          </div>

          {/* 3 家候选：按价位档各取一家 */}
          {feastPicks &&
            feastPicks.map((p) => (
              <div
                key={p.id}
                style={{
                  padding: 16,
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--border)",
                  background: "var(--bg-card)",
                  borderLeft: `4px solid ${p.level === 1 ? "#22c55e" : p.level === 2 ? "#3b82f6" : "#f59e0b"}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 17, fontWeight: 800 }}>{p.name}</span>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{p.category}</span>
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
                      {LEVEL_LABEL[p.level] ?? "参考"}
                    </span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--accent)", flexShrink: 0 }}>
                    {people} 人约 ¥{p.perPerson * people}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>
                  📍 {p.district} · {p.station} · {p.perText} · {p.fit}
                </div>
                {p.signature.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                    {p.signature.map((sig) => (
                      <span
                        key={sig}
                        style={{
                          fontSize: 12,
                          padding: "3px 10px",
                          borderRadius: 999,
                          background: "var(--bg-secondary)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {sig}
                      </span>
                    ))}
                  </div>
                )}
                {p.tips && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      lineHeight: 1.7,
                      marginTop: 8,
                      padding: "8px 10px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--bg-secondary)",
                    }}
                  >
                    {p.tips}
                  </div>
                )}
                <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 8 }}>
                  来源：
                  <a href={p.source} target="_blank" rel="noreferrer noopener" style={{ color: "var(--accent)" }}>
                    {p.sourceNote}
                  </a>
                </div>
              </div>
            ))}

          {/* 人数对应的点菜结构 */}
          <div
            style={{
              padding: 16,
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>🧾 {people} 人点菜怎么配</div>
            {[
              { label: "菜数", value: `${people} 道：凉菜 1 + 荤 ${Math.max(2, people - 2)} + 素 2` },
              { label: "主食", value: people >= 5 ? "1~2 份大份，分着吃比每人一份省" : "1 份大份即可（或按人数份）" },
              { label: "汤", value: "1 锅，3~5 人一锅就够，不必按人头点" },
              { label: "买单", value: "先按人均估：人均 × 人数，酒水通常另算且最容易超支" },
              { label: "避坑", value: "晚市比午市贵；能订位就先订，多人到店排队最耗时" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", gap: 8, padding: "6px 0", fontSize: 13 }}>
                <span style={{ width: 56, flexShrink: 0, color: "var(--text-tertiary)" }}>{row.label}</span>
                <span style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{row.value}</span>
              </div>
            ))}
          </div>
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
        {scene === "solo" ? "🎲 换一批推荐（三天 × 两套同时）" : "🎲 换一批餐馆（三天同时换）"}
      </button>
    </div>
  );
}

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
  ingredients?: string;
  steps?: string[];
};

type Soup = Meal;

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
    return PLANNER.sets.map((s, si) => {
      const sb = base + round * ROUND_STEP + si * 101;
      const offset = DAYS[dayIdx].offset;
      return {
        breakfast: pickBy(s.breakfast, sb + SALT.breakfast, offset),
        lunch: pickBy(s.lunch, sb + SALT.lunch, offset),
        dinner: pickBy(s.dinner, sb + SALT.dinner, offset),
        soup: pickBy(s.soups, sb + SALT.soup, offset),
        fruit: pickBy(pool, sb + SALT.fruit, offset),
        month,
      };
    });
  }, [base, round, dayIdx, today]);

  const totals = plans.map(
    (p) => p.breakfast.price + p.lunch.price + p.dinner.price + p.soup.price
  );

  const set = PLANNER.sets[setIdx];
  const plan = plans[setIdx];
  const total = totals[setIdx];
  const over = total > BUDGET.dailyMax;
  const day = DAYS[dayIdx];

  // 营养均衡：按当日实际选中的三餐 + 汤推导
  const balance = useMemo(() => {
    const items = [plan.breakfast.name, plan.lunch.name, plan.dinner.name, plan.soup.name];
    const collect = (keys: string[]) =>
      items.filter((n) => matchNames(n, keys)).map((n) => n.split(/[+（(]/)[0].trim());
    return {
      protein: collect(NUTRI_KEYS.protein),
      veg: collect(NUTRI_KEYS.veg),
      staple: collect(NUTRI_KEYS.staple),
    };
  }, [plan]);

  const balanced = balance.protein.length >= 2 && balance.veg.length >= 2 && balance.staple.length >= 1;

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
          近三天营养套餐：每天三餐 + 🍲 一汤 + 🍎 应季水果，蛋白质 / 蔬菜 / 主食 / 汤 / 水果五件齐全。
          两套方案可选：🍳 自己做（成本约为外卖一半）或 🛵 点外卖。日预算 ≤ {BUDGET.dailyMax} 元，同一天结果固定。
        </p>
      </header>

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
                {day.label} {s.priceLabel} ¥{totals[i]}
              </div>
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: 0, lineHeight: 1.6 }}>{set.desc}</p>

      {/* 当日预算总览 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          background: "var(--bg-card)",
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            {day.label} · {set.icon} {set.label} · 含汤含果
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 2 }}>
            ¥{total}
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-tertiary)", marginLeft: 8 }}>
              / 预算 ¥{BUDGET.dailyMax}
            </span>
          </div>
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            padding: "6px 12px",
            borderRadius: 999,
            background: over ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
            color: over ? "#ef4444" : "#22c55e",
          }}
        >
          {over ? "✗ 超预算" : "✓ 在预算内"}
        </div>
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

      {/* 汤品 */}
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
          { label: "汤", list: [plan.soup.name] },
          { label: "水果", list: [`${plan.fruit.name}（${plan.fruit.kcal} kcal / 纤维 ${plan.fruit.fiber}g）`] },
        ].map((row) => (
          <div
            key={row.label}
            style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", fontSize: 13 }}
          >
            <span style={{ width: 82, flexShrink: 0, color: "var(--text-tertiary)" }}>{row.label}</span>
            <span style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {row.list.length > 0 ? row.list.join(" · ") : "—（今日这份偏少，可加一份）"}
            </span>
          </div>
        ))}
      </div>

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

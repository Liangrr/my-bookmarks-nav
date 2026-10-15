"use client";

import { useEffect, useMemo, useState } from "react";
import DATA from "@/data/meal-planner.json";

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

const PLANNER = DATA as PlannerData;
const BUDGET = PLANNER.budget;

const SLOTS = [
  { key: "breakfast", label: "早餐", icon: "🌅", color: "#f59e0b" },
  { key: "lunch", label: "午餐", icon: "☀️", color: "#3b82f6" },
  { key: "dinner", label: "晚餐", icon: "🌙", color: "#8b5cf6" },
] as const;

const MAX_MAP: Record<string, number> = {
  breakfast: BUDGET.breakfastMax,
  lunch: BUDGET.lunchMax,
  dinner: BUDGET.dinnerMax,
};

// 用日期做种子，同一天打开推荐结果固定
function daySeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

// mulberry32：确定性伪随机，保证同一 seed 在服务端与客户端结果一致
function mulberry32(seed: number) {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(list: Meal[], seed: number): Meal {
  const rnd = mulberry32(seed);
  return list[Math.floor(rnd() * list.length)];
}

export function MealPlanner() {
  const [round, setRound] = useState(0);
  const [active, setActive] = useState(0);
  // day=0 时首屏（含 SSR）取固定种子，挂载后再切到本机日期，避免跨时区 hydration 不一致
  const [day, setDay] = useState(0);
  useEffect(() => {
    setDay(daySeed());
  }, []);

  const seed = day + round * 7919;

  const plans = useMemo(
    () =>
      PLANNER.sets.map((s, si) => {
        const base = seed + si * 131;
        return {
          breakfast: pick(s.breakfast, base + 3),
          lunch: pick(s.lunch, base + 5),
          dinner: pick(s.dinner, base + 7),
        };
      }),
    [seed]
  );

  const totals = plans.map(
    (p) => p.breakfast.price + p.lunch.price + p.dinner.price
  );

  const set = PLANNER.sets[active];
  const plan = plans[active];
  const total = totals[active];
  const over = total > BUDGET.dailyMax;

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
          每日两套推荐：🍳 自己做 & 🛵 点外卖，各含一日三餐，日预算 ≤ {BUDGET.dailyMax} 元（早餐 ≤ {BUDGET.breakfastMax} 元）。
          同一天打开结果固定，点「换一批」两套同时重摇。
        </p>
      </header>

      {/* 两套方案切换 */}
      <div style={{ display: "flex", gap: 8 }}>
        {PLANNER.sets.map((s, i) => {
          const on = i === active;
          return (
            <button
              key={s.id}
              onClick={() => setActive(i)}
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
                今日 {s.priceLabel} ¥{totals[i]}
              </div>
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: 0, lineHeight: 1.6 }}>
        {set.desc}
      </p>

      {/* 预算总览 */}
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
            {set.icon} {set.label} · 今日{set.priceLabel}
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
            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 8 }}>
              {data.desc}
            </div>

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

      {/* 操作按钮 */}
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
        🎲 换一批推荐（两套同时）
      </button>
    </div>
  );
}

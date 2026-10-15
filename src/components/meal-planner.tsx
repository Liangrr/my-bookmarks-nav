"use client";

import { useState, useMemo } from "react";
import DATA from "@/data/meal-planner.json";

type Meal = {
  id: string;
  name: string;
  price: number;
  cookTime: string;
  tags: string[];
  desc: string;
};

// 用日期做种子，同一天打开推荐结果固定
function daySeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function pickRandom(list: Meal[], seed: number, salt: number): Meal {
  let s = seed + salt;
  return list[Math.floor(Math.random() * list.length)];
}

export function MealPlanner() {
  const [round, setRound] = useState(0);
  const seed = daySeed() + round * 7;

  const today = useMemo(() => {
    return {
      breakfast: pickRandom(DATA.breakfast as Meal[], seed, 1),
      lunch: pickRandom(DATA.lunch as Meal[], seed, 2),
      dinner: pickRandom(DATA.dinner as Meal[], seed, 3),
    };
  }, [seed]);

  const total = today.breakfast.price + today.lunch.price + today.dinner.price;
  const budget = DATA.budget;

  const meals = [
    { key: "breakfast", label: "早餐", icon: "🌅", color: "#f59e0b", data: today.breakfast, max: budget.breakfastMax },
    { key: "lunch", label: "午餐", icon: "☀️", color: "#3b82f6", data: today.lunch, max: budget.lunchMax },
    { key: "dinner", label: "晚餐", icon: "🌙", color: "#8b5cf6", data: today.dinner, max: budget.dinnerMax },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header style={{ marginTop: 4 }}>
        <h1 style={{
          fontSize: 30, fontWeight: 800, margin: 0,
          background: "linear-gradient(135deg, #f59e0b, #ec4899)",
          WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          今天吃什么
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "8px 0 0", lineHeight: 1.7 }}>
          单人一日三餐推荐，日预算 ≤ {budget.dailyMax} 元（早餐 ≤ {budget.breakfastMax} 元）。
          同一天打开推荐结果固定，点"换一批"重新随机。
        </p>
      </header>

      {/* 预算总览 */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px", borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)", background: "var(--bg-card)",
      }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>今日预计花费</div>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 2 }}>
            ¥{total}
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-tertiary)", marginLeft: 8 }}>
              / 预算 ¥{budget.dailyMax}
            </span>
          </div>
        </div>
        <div style={{
          fontSize: 13, fontWeight: 600, padding: "6px 12px", borderRadius: 999,
          background: total <= budget.dailyMax ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
          color: total <= budget.dailyMax ? "#22c55e" : "#ef4444",
        }}>
          {total <= budget.dailyMax ? "✓ 在预算内" : "✗ 超预算"}
        </div>
      </div>

      {/* 三餐卡片 */}
      {meals.map((m) => (
        <div key={m.key} style={{
          padding: 16, borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)", background: "var(--bg-card)",
          borderLeft: `4px solid ${m.color}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 22 }}>{m.icon}</span>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{m.label}</span>
              <span style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 999,
                background: "var(--bg-hover)", color: "var(--text-tertiary)",
              }}>
                ≤ ¥{m.max}
              </span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: m.color }}>¥{m.data.price}</div>
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{m.data.name}</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 8 }}>{m.data.desc}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 11, padding: "3px 8px", borderRadius: 999,
              border: "1px solid var(--border)", color: "var(--text-tertiary)",
            }}>
              ⏱ {m.data.cookTime}
            </span>
            {m.data.tags.map((t) => (
              <span key={t} style={{
                fontSize: 11, padding: "3px 8px", borderRadius: 999,
                background: "var(--bg-hover)", color: "var(--text-secondary)",
              }}>
                #{t}
              </span>
            ))}
          </div>
        </div>
      ))}

      {/* 操作按钮 */}
      <button
        onClick={() => setRound((r) => r + 1)}
        style={{
          height: 44, borderRadius: "var(--radius-lg)", border: "none", cursor: "pointer",
          background: "linear-gradient(135deg, #f59e0b, #ec4899)", color: "#fff",
          fontSize: 15, fontWeight: 700,
        }}
      >
        🎲 换一批推荐
      </button>
    </div>
  );
}

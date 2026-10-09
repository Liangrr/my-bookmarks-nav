"use client";
import { useEffect, useMemo, useState } from "react";
import fruitsData from "@/data/seasonal-fruits.json";
import FilterBtn from "@/components/filter-btn";

interface Fruit {
  id: string;
  name: string;
  icon: string;
  taste: string;
  origin: string;
  sweetness: number;
  kcal: number;
  sugar: number;
  fat: number;
  fiber: number;
  diet: string;
  benefit: string;
  months: number[];
  tags: string[];
}

interface FruitsData {
  intro: string;
  fruits: Fruit[];
}

const DATA = fruitsData as FruitsData;
const MONTH_LABELS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
const TOTAL = DATA.fruits.length;

/** 当前所在的月份（1-12），用于「当季」高亮 */
const currentMonth = new Date().getMonth() + 1;

const SWEET_LABEL: Record<number, string> = {
  1: "微甜",
  2: "清甜",
  3: "爽甜",
  4: "甘甜",
  5: "浓甜",
};

const SEASON_COLOR: Record<number, string> = {
  3: "#22d3ee", // 春
  6: "#4ade80", // 夏
  9: "#fbbf24", // 秋
  12: "#f87171", // 冬
};

function seasonOf(month: number) {
  if (month >= 3 && month <= 5) return { label: "春", color: SEASON_COLOR[3] };
  if (month >= 6 && month <= 8) return { label: "夏", color: SEASON_COLOR[6] };
  if (month >= 9 && month <= 11) return { label: "秋", color: SEASON_COLOR[9] };
  return { label: "冬", color: SEASON_COLOR[12] };
}

export function SeasonalFruits() {
  const [query, setQuery] = useState("");
  const [monthFilter, setMonthFilter] = useState<number | "全部">("全部");
  const [showTop, setShowTop] = useState(false);

  const q = query.trim().toLowerCase();

  const isSeason = (f: Fruit) => f.months.includes(currentMonth);

  const filtered = useMemo(() => {
    return DATA.fruits.filter((f) => {
      if (monthFilter !== "全部" && !f.months.includes(monthFilter)) return false;
      if (!q) return true;
      const hay = [f.name, f.taste, f.origin, f.benefit, f.tags.join(" ")].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [q, monthFilter]);

  const seasonCount = useMemo(() => DATA.fruits.filter(isSeason).length, []);

  // 默认高亮「当季」
  useEffect(() => {
    setMonthFilter(currentMonth);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 头部 */}
      <header style={{ marginTop: 4 }}>
        <h1
          style={{
            fontSize: 30,
            fontWeight: 800,
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 26 }}>🍓</span>
          <span
            style={{
              background: "linear-gradient(135deg, #f87171, #fbbf24)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            应季水果
          </span>
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary)",
            margin: "8px 0 0",
            lineHeight: 1.7,
          }}
        >
          {DATA.intro}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              color: "var(--text-secondary)",
            }}
          >
            共 {TOTAL} 种
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              color: "var(--text-secondary)",
            }}
          >
            本月当季 {seasonCount} 种
          </span>
          {(Object.keys(SEASON_COLOR) as unknown as number[]).map((m) => (
            <span
              key={m}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                color: seasonOf(m).color,
              }}
            >
              {seasonOf(m).label}季 {DATA.fruits.filter((f) => f.months.some((mm) => mm >= m - 2 && mm <= m)).length} 种
            </span>
          ))}
        </div>
      </header>

      {/* 工具条：搜索 + 月份筛选 */}
      <div
        style={{
          position: "sticky",
          top: 76,
          zIndex: 10,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          background: "var(--bg-glass)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索，如：草莓、车厘子、雪梨、维C…"
          aria-label="搜索应季水果"
          style={{
            flex: 1,
            minWidth: 160,
            height: 34,
            padding: "0 12px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            font: "inherit",
            fontSize: 13,
            outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
          <FilterBtn
            active={monthFilter === "全部"}
            label="全部月份"
            onClick={() => setMonthFilter("全部")}
          />
          {MONTH_LABELS.map((m, i) => (
            <FilterBtn
              key={m}
              active={monthFilter === i + 1}
              label={m}
              onClick={() => setMonthFilter(i + 1)}
            />
          ))}
        </div>
        <span
          style={{
            fontSize: 12,
            color: "var(--text-tertiary)",
            whiteSpace: "nowrap",
          }}
        >
          命中 {filtered.length} 种
        </span>
      </div>

      {/* 卡片列表 */}
      {filtered.length === 0 ? (
        <div
          style={{
            padding: "48px 16px",
            textAlign: "center",
            color: "var(--text-tertiary)",
            fontSize: 14,
          }}
        >
          没有找到匹配的水果，换个关键词或月份试试。
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((f) => (
            <FruitCard key={f.id} item={f} />
          ))}
        </div>
      )}

      {/* 回到顶部 */}
      {showTop && (
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            setShowTop(false);
          }}
          aria-label="回到顶部"
          title="回到顶部"
          style={{
            position: "fixed",
            right: 20,
            bottom: 24,
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "1px solid var(--border)",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            cursor: "pointer",
            boxShadow: "var(--shadow-card)",
            zIndex: 20,
          }}
        >
          ↑
        </button>
      )}
      <ScrollWatcher onShow={(v) => setShowTop(v)} />
    </div>
  );
}

function FruitCard({ item }: { item: Fruit }) {
  const sweet = item.sweetness;
  const isSeason = item.months.includes(currentMonth);
  const monthBars = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <article
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        transition: "var(--transition)",
      }}
    >
      {/* 标题行 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 24 }} aria-hidden="true">
          {item.icon}
        </span>
        <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, flex: 1, minWidth: 120 }}>
          {item.name}
        </h3>
        {isSeason && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#0a0a0f",
              background: "var(--accent)",
              borderRadius: 6,
              padding: "2px 8px",
            }}
          >
            当季
          </span>
        )}
        {/* 甜度星标 */}
        <div
          title={`甜度 ${SWEET_LABEL[sweet]}（${sweet}/5）`}
          style={{ display: "flex", alignItems: "center", gap: 2 }}
        >
          {Array.from({ length: 5 }, (_, i) => (
            <span
              key={i}
              style={{
                fontSize: 12,
                color: i < sweet ? "var(--holiday, #fbbf24)" : "var(--border)",
              }}
            >
              ★
            </span>
          ))}
          <span
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              marginLeft: 4,
              whiteSpace: "nowrap",
            }}
          >
            甜度 {SWEET_LABEL[sweet]}
          </span>
        </div>
      </div>

      {/* 标签 */}
      {item.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {item.tags.map((t) => (
            <span
              key={t}
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                border: "1px solid var(--border)",
                borderRadius: 999,
                padding: "2px 8px",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* 月份分布在时间轴 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: 3,
          }}
        >
          {monthBars.map((m) => {
            const active = item.months.includes(m);
            const isCu = m === currentMonth;
            const se = seasonOf(m);
            return (
              <div
                key={m}
                title={`${m}月${active ? " · 应季" : ""}`}
                style={{
                  height: 10,
                  borderRadius: 3,
                  background: active ? se.color : "var(--border)",
                  opacity: active ? (isCu ? 1 : 0.7) : 0.4,
                  outline: isCu ? `1.5px solid var(--accent)` : "none",
                }}
              />
            );
          })}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: 3,
          }}
        >
          {MONTH_LABELS.map((m) => (
            <span
              key={m}
              style={{
                fontSize: 9,
                color: "var(--text-tertiary)",
                textAlign: "center",
                lineHeight: 1,
              }}
            >
              {m.replace("月", "")}
            </span>
          ))}
        </div>
      </div>

      {/* 详细字段 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <FieldRow k="口感" v={item.taste} />
        <FieldRow k="产地" v={item.origin} />
        <FieldRow k="功效" v={item.benefit} />
      </div>

      {/* 营养参数：每 100g 典型值 */}
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          background: "var(--bg-secondary)",
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--accent)",
              letterSpacing: 1,
            }}
          >
            营养参数（每 100g）
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: dietColor(item.diet).fg,
              background: dietColor(item.diet).bg,
              borderRadius: 6,
              padding: "2px 8px",
            }}
          >
            {item.diet}
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 6,
          }}
        >
          <Nutrient label="热量" value={`${item.kcal}`} unit="kcal" />
          <Nutrient label="糖分" value={`${item.sugar}`} unit="g" />
          <Nutrient label="脂肪" value={`${item.fat}`} unit="g" />
          <Nutrient label="膳食纤维" value={`${item.fiber}`} unit="g" />
        </div>
      </div>
    </article>
  );
}

/** 减脂评级配色 */
function dietColor(d: string) {
  if (d === "减脂友好") return { fg: "#18794e", bg: "rgba(16,185,129,.13)" };
  if (d === "减脂慎选") return { fg: "#b8272c", bg: "rgba(244,63,94,.12)" };
  return { fg: "#915930", bg: "rgba(234,179,8,.15)" };
}

/** 单项营养数值块 */
function Nutrient({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "8px 6px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.3 }}>
        {value}
        <span style={{ fontSize: 9, fontWeight: 600, color: "var(--text-tertiary)", marginLeft: 2 }}>
          {unit}
        </span>
      </div>
      <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 3 }}>{label}</div>
    </div>
  );
}

function FieldRow({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", gap: 10, fontSize: 13, lineHeight: 1.7 }}>
      <span
        style={{
          flexShrink: 0,
          width: 40,
          fontWeight: 700,
          color: "var(--text-tertiary)",
        }}
      >
        {k}
      </span>
      <span style={{ color: "var(--text-primary)" }}>{v}</span>
    </div>
  );
}

/** 滚动监听：超过一屏显示回到顶部按钮 */
function ScrollWatcher({ onShow }: { onShow: (v: boolean) => void }) {
  const [last, setLast] = useState(false);
  useEffect(() => {
    const cb = () => {
      const v = window.scrollY > window.innerHeight;
      if (v !== last) {
        setLast(v);
        onShow(v);
      }
    };
    window.addEventListener("scroll", cb, { passive: true });
    cb();
    return () => window.removeEventListener("scroll", cb);
  }, [last, onShow]);
  return null;
}
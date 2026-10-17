"use client";

import { useEffect, useMemo, useState } from "react";
import DATA from "@/data/meal-planner.json";
import FRUIT_DATA from "@/data/seasonal-fruits.json";
import { cheapest, computeSavingPlan, fitBudget, shouldSuggestSaving } from "@/lib/meal-budget";
import { filterFeastPlaces } from "@/lib/feast-filter";

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

// 聚餐：只去店里吃，门店统一按「适合 3~5 人」收录，花费按人均估
type Place = {
  id: string;
  name: string;
  category: string;
  // 行政区：福田 / 罗湖 / 南山 / 宝安 / 龙华 / 龙岗 / 盐田 / 光明 / 坪山 / 大鹏
  district: string;
  // 商圈 / 片区，如「星河 COCO Park」「车公庙」
  subArea?: string;
  station: string;
  // 详细地址（含商场楼层 / 铺位，可直接拿去导航）
  address?: string;
  // 菜系分组（用于筛选），如「潮汕菜」「火锅·烤肉」
  cuisine?: string;
  perPerson: number;
  perText: string;
  level: number;
  fit: string;
  signature: string[];
  tips: string;
  source: string;
  sourceNote: string;
  // 综合评价排名相关（可选：数据没填就不展示对应模块）
  rank?: number;
  score?: number;
  subs?: { taste: number; vibe: number; service: number; value: number };
  rating?: string;
  ratingSrc?: string;
  pros?: string[];
  cons?: string[];
  value?: string;
  verdict?: string;
};

type FeastData = {
  label: string;
  area: string;
  note: string;
  // 排名口径说明（可选）
  rankNote?: string;
  updated?: string;
  // 菜系分组（可选：缺省则不展示筛选栏）
  cuisines?: string[];
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

// 聚餐数据（单一：只去店里吃），门店统一按「适合 3~5 人」收录
const FEAST = (PLANNER.feast ?? null) as FeastData | null;
const LEVEL_LABEL: Record<number, string> = { 1: "平价", 2: "中档", 3: "稍贵", 4: "高档" };

// 聚餐：一次性列全部餐馆，按综合排名（rank）升序；没填 rank 的排在末尾
const FEAST_RANKED: Place[] = FEAST
  ? [...FEAST.places].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || a.perPerson - b.perPerson)
  : [];

// 菜系分组：只保留数据里真实有门店的分组，保证每个筛选项点下去都有结果
const FEAST_CUISINES: string[] = FEAST
  ? (FEAST.cuisines ?? []).filter((c) => FEAST.places.some((p) => p.cuisine === c))
  : [];

// 行政区下拉：按常用顺序排，只保留数据里真有门店的区，避免选了空结果
const DISTRICT_ORDER = ["福田", "罗湖", "南山", "宝安", "龙华", "龙岗", "盐田", "光明", "坪山", "大鹏"];
const ALL_DISTRICTS = FEAST ? Array.from(new Set(FEAST.places.map((p) => p.district))) : [];
const FEAST_DISTRICTS: string[] = [
  ...DISTRICT_ORDER.filter((d) => ALL_DISTRICTS.includes(d)),
  ...ALL_DISTRICTS.filter((d) => !DISTRICT_ORDER.includes(d)),
];

// 全城门店较多，一次只渲染前 N 家，其余用「加载更多」逐段展开
const FEAST_PAGE = 24;

const LEVEL_COLOR: Record<number, string> = { 1: "#22c55e", 2: "#3b82f6", 3: "#f59e0b", 4: "#ef4444" };
const TOP3 = new Set([1, 2, 3]);

// 综合分：口味 40% + 环境 20% + 服务 20% + 性价比 20%，满分 100（仅用于横向比较）
const SUB_WEIGHT = { taste: 0.4, vibe: 0.2, service: 0.2, value: 0.2 };

function scoreOf(p: Place): number | undefined {
  if (p.score !== undefined) return p.score;
  if (!p.subs) return undefined;
  const { taste, vibe, service, value } = p.subs;
  const raw = taste * SUB_WEIGHT.taste + vibe * SUB_WEIGHT.vibe + service * SUB_WEIGHT.service + value * SUB_WEIGHT.value;
  return Math.round((raw / 5) * 100);
}

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

// 两套方案（自己做 / 点外卖）固定取用，用于「早晚自制 + 午餐外卖」混搭区间的推荐
const HC_SET = PLANNER.sets.find((s) => s.id === "homecook")!;
const TO_SET = PLANNER.sets.find((s) => s.id === "takeout")!;

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
  // 聚餐筛选：地区（行政区）+ 菜系 + 关键词搜索；空串 = 全部
  const [district, setDistrict] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [query, setQuery] = useState("");
  // 已展开的家数（切换筛选条件时重置）
  const [shown, setShown] = useState(FEAST_PAGE);
  // 日期状态挂载后再置入，避免服务端/客户端跨时区 hydration 不一致
  const [today, setToday] = useState<Ymd | null>(null);
  useEffect(() => {
    const d = new Date();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 时区 hydration 守卫：挂载后才落地本地日期，不能放进 useState 初始化
    setToday({ y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() });
  }, []);

  const base = today ? today.y * 10000 + today.m * 100 + today.d : 1;

  // 聚餐筛选：地区 + 菜系 + 关键词（店名 / 商圈 / 车站 / 地址 / 招牌菜）三重过滤
  const feastList = useMemo(
    () => filterFeastPlaces(FEAST_RANKED, { district, cuisine, query }),
    [district, cuisine, query]
  );

  // 切换筛选条件后从头展示，避免停在「已经加载了很多」的状态
  function applyFilter(next: { district?: string; cuisine?: string; query?: string }) {
    if (next.district !== undefined) setDistrict(next.district);
    if (next.cuisine !== undefined) setCuisine(next.cuisine);
    if (next.query !== undefined) setQuery(next.query);
    setShown(FEAST_PAGE);
  }

  const plans = useMemo(() => {
    const month = today ? monthAfter(today, DAYS[dayIdx].offset) : null;
    const seasonal = month ? FRUITS.filter((f) => f.months.includes(month)) : FRUITS;
    const pool = seasonal.length > 0 ? seasonal : FRUITS;
    // 汤非每日必需：三天里固定一天不配汤（同一天结果固定，「换一批」会换位置）
    const soupDays = shuffle([true, true, false], base + round * ROUND_STEP + 977);
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

  // 聚餐：一次性列出全部餐馆，不随机、不换批

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
  const saving = useMemo(
    () => computeSavingPlan({ set, homecook: HC_SET, takeout: TO_SET, hasSoup: plan.hasSoup, budget: BUDGET }),
    [set, plan.hasSoup]
  );

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
              聚餐模式：只去店里吃。范围 {FEAST ? FEAST.area : "深圳 · 全城"}，
              门店统一按「适合 3~5 人」收录，一次按综合评价排名列出全部餐馆
              （口味 / 环境 / 服务 / 性价比 加权，附好评点、踩坑与性价比判断），
              每家带详细地址（含商场楼层 / 铺位）与菜系分类，可按地区 + 菜系筛选，也能直接搜店名 / 商圈 / 招牌菜，
              花费按人均估。门店与人均来自公开点评 / 工商登记 / 商场官网，点来源可核验，价格会变动。
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

      {/* 聚餐筛选：地区下拉 + 菜系下拉 + 关键词搜索（门店统一按「适合 3~5 人」收录，不再选人数） */}
      {scene === "feast" && (
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
          <select
            value={district}
            onChange={(e) => applyFilter({ district: e.target.value })}
            aria-label="按地区筛选"
            style={{
              height: 34,
              padding: "0 8px",
              borderRadius: "var(--radius-md)",
              border: `1px solid ${district ? "var(--accent)" : "var(--border)"}`,
              background: "var(--bg-card)",
              color: district ? "var(--accent)" : "var(--text-primary)",
              font: "inherit",
              fontSize: 13,
              fontWeight: 600,
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="">全部地区（{FEAST_RANKED.length}）</option>
            {FEAST_DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}（{FEAST_RANKED.filter((p) => p.district === d).length}）
              </option>
            ))}
          </select>

          <select
            value={cuisine}
            onChange={(e) => applyFilter({ cuisine: e.target.value })}
            aria-label="按菜系筛选"
            style={{
              height: 34,
              padding: "0 8px",
              borderRadius: "var(--radius-md)",
              border: `1px solid ${cuisine ? "var(--accent)" : "var(--border)"}`,
              background: "var(--bg-card)",
              color: cuisine ? "var(--accent)" : "var(--text-primary)",
              font: "inherit",
              fontSize: 13,
              fontWeight: 600,
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="">全部菜系（{FEAST_RANKED.length}）</option>
            {FEAST_CUISINES.map((c) => (
              <option key={c} value={c}>
                {c}（{FEAST_RANKED.filter((p) => p.cuisine === c).length}）
              </option>
            ))}
          </select>

          <input
            type="search"
            value={query}
            onChange={(e) => applyFilter({ query: e.target.value })}
            placeholder="搜索店名 / 商圈 / 车站 / 招牌菜，如：早茶、潮汕、鸽"
            aria-label="搜索聚餐餐馆"
            style={{
              flex: 1,
              minWidth: 200,
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

          {(district || cuisine || query) && (
            <button
              onClick={() => applyFilter({ district: "", cuisine: "", query: "" })}
              style={{
                height: 34,
                padding: "0 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                color: "var(--text-secondary)",
                fontSize: 13,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              ✕ 清空
            </button>
          )}
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

        {shouldSuggestSaving(total, BUDGET) && (
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
                  适合 3~5 人 · 去店里吃
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
                {FEAST.rankNote && (
                  <div style={{ marginTop: 8, color: "var(--text-tertiary)" }}>{FEAST.rankNote}</div>
                )}
              </div>
            )}
          </div>

          {/* 全部餐馆：按综合排名列出，不随机、不换批；可按地区 + 菜系筛选、可搜索 */}
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "0 2px" }}>
            命中 {feastList.length} 家
            {district ? ` · ${district}` : ""}
            {cuisine ? ` · ${cuisine}` : ""}
            {query.trim() ? ` · 关键词「${query.trim()}」` : ""}
            {feastList.length > shown ? `，已显示前 ${shown} 家` : ""}
          </div>

          {feastList.slice(0, shown).map((p) => {
            const lvColor = LEVEL_COLOR[p.level] ?? "#94a3b8";
            const top = p.rank !== undefined && TOP3.has(p.rank);
            const pScore = scoreOf(p);
            return (
              <div
                key={p.id}
                style={{
                  padding: 16,
                  borderRadius: "var(--radius-lg)",
                  border: `1px solid ${top ? "color-mix(in srgb, var(--accent) 35%, var(--border))" : "var(--border)"}`,
                  background: "var(--bg-card)",
                  borderLeft: `4px solid ${lvColor}`,
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
                    {p.rank !== undefined && (
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          flexShrink: 0,
                          color: top ? "var(--accent)" : "var(--text-tertiary)",
                        }}
                      >
                        #{p.rank}
                      </span>
                    )}
                    <span style={{ fontSize: 17, fontWeight: 800 }}>{p.name}</span>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{p.category}</span>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "var(--bg-card-hover)",
                        color: lvColor,
                        flexShrink: 0,
                      }}
                    >
                      {LEVEL_LABEL[p.level] ?? "参考"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexShrink: 0 }}>
                    {pScore !== undefined && (
                      <span style={{ fontSize: 17, fontWeight: 800, color: "var(--accent)" }}>
                        {pScore}
                        <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", marginLeft: 2 }}>
                          分
                        </span>
                      </span>
                    )}
                    <span style={{ fontSize: 15, fontWeight: 800 }}>
                      人均 ¥{p.perPerson}
                      <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", marginLeft: 2 }}>
                        · 适合 3~5 人
                      </span>
                    </span>
                  </div>
                </div>

                {p.address && (
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6, lineHeight: 1.6 }}>
                    📍 {p.address}
                  </div>
                )}
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: p.address ? 2 : 6 }}>
                  {p.cuisine ? `${p.cuisine} · ` : ""}
                  {p.district}
                  {p.subArea ? ` · ${p.subArea}` : ""}
                  {` · ${p.station} · ${p.perText} · ${p.fit}`}
                </div>
                {p.rating && (
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
                    ⭐ {p.rating}
                    {p.ratingSrc ? ` · ${p.ratingSrc}` : ""}
                  </div>
                )}

                {p.verdict && (
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      lineHeight: 1.65,
                      marginTop: 8,
                      padding: "8px 10px",
                      borderRadius: "var(--radius-sm)",
                      background: "color-mix(in srgb, var(--accent) 10%, var(--bg-card))",
                      color: "var(--text-primary)",
                    }}
                  >
                    {p.verdict}
                  </div>
                )}

                {p.subs && (
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                    {[
                      { k: "口味", v: p.subs.taste },
                      { k: "环境", v: p.subs.vibe },
                      { k: "服务", v: p.subs.service },
                      { k: "性价比", v: p.subs.value },
                    ].map((s) => (
                      <span
                        key={s.k}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: 11,
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {s.k}
                        <span
                          style={{
                            display: "inline-block",
                            width: 46,
                            height: 5,
                            borderRadius: 999,
                            background: "var(--bg-secondary)",
                            overflow: "hidden",
                          }}
                        >
                          <span
                            style={{
                              display: "block",
                              width: `${(s.v / 5) * 100}%`,
                              height: "100%",
                              background: "var(--accent)",
                            }}
                          />
                        </span>
                        <span style={{ color: "var(--text-secondary)", fontWeight: 700 }}>{s.v}</span>
                      </span>
                    ))}
                  </div>
                )}

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

                {p.pros && p.pros.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 10 }}>
                    {p.pros.map((t) => (
                      <div
                        key={t}
                        style={{
                          display: "flex",
                          gap: 6,
                          fontSize: 12,
                          lineHeight: 1.6,
                          color: "var(--text-secondary)",
                        }}
                      >
                        <span style={{ flexShrink: 0 }}>👍</span>
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                )}

                {p.cons && p.cons.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6 }}>
                    {p.cons.map((t) => (
                      <div
                        key={t}
                        style={{
                          display: "flex",
                          gap: 6,
                          fontSize: 12,
                          lineHeight: 1.6,
                          color: "var(--text-secondary)",
                        }}
                      >
                        <span style={{ flexShrink: 0 }}>⚠️</span>
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                )}

                {p.value && (
                  <div
                    style={{
                      fontSize: 12,
                      lineHeight: 1.7,
                      marginTop: 8,
                      padding: "8px 10px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--bg-secondary)",
                    }}
                  >
                    <span style={{ color: "var(--text-tertiary)" }}>💰 性价比：</span>
                    <span style={{ color: "var(--text-secondary)" }}>{p.value}</span>
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
                    <span style={{ color: "var(--text-tertiary)" }}>🪑 怎么去：</span>
                    {p.tips}
                  </div>
                )}

                <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 8 }}>
                  来源：
                  {p.source ? (
                    <a href={p.source} target="_blank" rel="noreferrer noopener" style={{ color: "var(--accent)" }}>
                      {p.sourceNote}
                    </a>
                  ) : (
                    <span>{p.sourceNote}</span>
                  )}
                </div>
              </div>
            );
          })}

          {feastList.length === 0 && (
            <div
              style={{
                padding: 16,
                borderRadius: "var(--radius-lg)",
                border: "1px dashed var(--border)",
                background: "var(--bg-card)",
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.7,
              }}
            >
              这个组合暂时没有收录的店。可以换个地区 / 菜系，或清空关键词再试；没找到的店宁可不收录，也不编数据。
            </div>
          )}

          {feastList.length > shown && (
            <button
              onClick={() => setShown((s) => s + FEAST_PAGE)}
              style={{
                height: 44,
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ↓ 加载更多（还有 {feastList.length - shown} 家）
            </button>
          )}

          {/* 3~5 人的点菜结构（不随人数切换，门店统一按 3~5 人收录） */}
          <div
            style={{
              padding: 16,
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>🧾 3~5 人点菜怎么配</div>
            {[
              { label: "菜数", value: "3 人 5 道 / 4 人 6 道 / 5 人 7 道：凉菜 1 + 荤 2~4 + 素 2" },
              { label: "主食", value: "1~2 份大份，分着吃比每人一份省（5 人建议点 2 份）" },
              { label: "汤", value: "1 锅，3~5 人一锅就够，不必按人头点" },
              { label: "买单", value: "先按人均估：人均 × 人数；酒水通常另算，且最容易超支" },
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
      {/* 换一批仅个人模式；聚餐是一次性列全部餐馆，没有这一层 */}
      {scene === "solo" && (
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
      )}
    </div>
  );
}

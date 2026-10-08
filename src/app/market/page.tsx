"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type IntlQuote = { name: string; price: number; chg: number; pct: number; usdTon?: number; unit: string };

// 数据源：Yahoo Finance 国际金属价 + USD/CNY 汇率，人民币价为折算值（沪金/沪银/沪铜无稳定免费直连源，见开发规范 3.24）
const METALS = [
  {
    id: "xau", name: "黄金", symbol: "Au", color: "#f59e0b",
    intl: "hf_XAU", intlName: "纽约金", usdUnit: "美元/盎司",
    cnyUnit: "元/克", cnyDiv: 31.1034768, cnyMult: 1, cnyDigits: 2,
  },
  {
    id: "xag", name: "白银", symbol: "Ag", color: "#94a3b8",
    intl: "hf_XAG", intlName: "纽约银", usdUnit: "美元/盎司",
    cnyUnit: "元/克", cnyDiv: 31.1034768, cnyMult: 1, cnyDigits: 3,
  },
  {
    id: "hg", name: "铜", symbol: "Cu", color: "#d97706",
    intl: "hf_HG", intlName: "美铜", usdUnit: "美元/磅",
    // 铜取 usdTon（美元/吨，接口已 ×2204.62），故 cnyMult 为 1，直接 ×汇率
    cnyUnit: "元/吨", cnyDiv: 1, cnyMult: 1, cnyDigits: 0,
  },
];

const UP = "#ef4444";
const DOWN = "#22c55e";

function fmtPrice(v: number | undefined, digits = 2) {
  if (v == null || Number.isNaN(v)) return "--";
  return v.toLocaleString("zh-CN", { maximumFractionDigits: digits });
}

function fmtPct(pct: number | undefined) {
  if (pct == null || Number.isNaN(pct)) return "--";
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

// ---- 行情本地缓存（localStorage）：进入页面先展示缓存，后台更新后替换 ----
const CACHE_KEY = "bookmark-nav-market-v2";

type MarketCache = {
  intl: Record<string, IntlQuote>;
  usdCny?: number | null;
  ts: number; // 缓存时间戳（毫秒）
};

function readCache(): MarketCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as MarketCache;
    if (!c || typeof c.ts !== "number" || !c.intl) return null;
    return c;
  } catch {
    return null;
  }
}

function writeCache(intl: Record<string, IntlQuote>, usdCny: number | null, ts: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ intl, usdCny, ts } satisfies MarketCache));
  } catch {
    /* 存储满/隐私模式时静默失败，不影响页面 */
  }
}

export default function MarketPage() {
  const [intl, setIntl] = useState<Record<string, IntlQuote>>({});
  const [usdCny, setUsdCny] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const intlRef = useRef<Record<string, IntlQuote>>({});
  const cnyRef = useRef<number | null>(null);

  const fetchQuotes = useCallback(async () => {
    try {
      const j = await fetch("/api/market/intl", { cache: "no-store" }).then((r) => r.json());
      if (!j?.ok || !j.data) throw new Error("intl proxy fail");
      intlRef.current = j.data;
      cnyRef.current = j.usdCny ?? null;
      setIntl(j.data);
      setUsdCny(j.usdCny ?? null);
      setFromCache(false);
      setLastUpdate(new Date());
      writeCache(j.data, j.usdCny ?? null, Date.now());
    } catch {
      // 有缓存则静默保留展示（时间戳停在旧值），无缓存才提示
      if (!intlRef.current || Object.keys(intlRef.current).length === 0) {
        // 无缓存时也静默：卡片显示 --，不弹错误横幅（避免刺眼）
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // 1) 先读缓存：命中则立即展示缓存数据与缓存时间
    const cache = readCache();
    if (cache) {
      intlRef.current = cache.intl;
      cnyRef.current = cache.usdCny ?? null;
      setIntl(cache.intl);
      setUsdCny(cache.usdCny ?? null);
      setLastUpdate(new Date(cache.ts));
      setFromCache(true);
      setLoading(false);
    }
    // 2) 再拉最新数据，拿到后替换（同时更新时间与缓存）
    fetchQuotes();
    timerRef.current = setInterval(fetchQuotes, 300000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchQuotes]);

  return (
    <div className="container">
      <header style={{ marginTop: 16, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              margin: 0,
              background: "linear-gradient(135deg, var(--accent), #f472b6)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            实时行情
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "8px 0 0" }}>
            国际金属价格（美元）与人民币折算价 · 5 分钟自动刷新
            {usdCny != null && ` · USD/CNY ${fmtPrice(usdCny, 4)}`}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            {lastUpdate
              ? `更新于 ${lastUpdate.toLocaleTimeString("zh-CN")}${fromCache ? "（缓存）" : ""}`
              : loading
                ? "加载中…"
                : ""}
          </span>
          <button
            onClick={() => { setLoading(true); fetchQuotes(); }}
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              padding: "6px 14px",
              borderRadius: "100px",
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "var(--transition)",
            }}
          >
            刷新
          </button>
        </div>
      </header>

      <div
        style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {METALS.map((m) => {
          const i = intl[m.intl];
          const usdPrice = m.intl === "hf_HG" && i?.usdTon != null ? i.usdTon : i?.price;
          const cny = cnyRef.current;
          // 人民币折算：美元价 ÷ 盎司克数（或 × 磅吨系数）× 汇率
          const cnyPrice = i && cny != null ? (usdPrice != null ? (usdPrice / m.cnyDiv) * m.cnyMult * cny : null) : null;
          const up = i ? i.pct >= 0 : false;
          return (
            <div
              key={m.id}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                transition: "var(--transition)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#fff",
                    background: m.color,
                  }}
                >
                  {m.symbol}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{m.cnyUnit}（折算）</div>
                </div>
              </div>

              {/* 人民币折算价（主行） */}
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: i ? (up ? UP : DOWN) : "var(--text-secondary)" }}>
                  {fmtPrice(cnyPrice ?? undefined, m.cnyDigits)}
                </div>
                <div style={{ fontSize: 12, fontVariantNumeric: "tabular-nums", color: i ? (up ? UP : DOWN) : "var(--text-tertiary)", marginTop: 2 }}>
                  {i ? `${i.chg >= 0 ? "+" : ""}${fmtPrice(i.chg, 1)}  ${fmtPct(i.pct)}` : "--"}
                </div>
              </div>

              {/* 国际价（副行） */}
              {i ? (
                <div
                  style={{
                    borderTop: "1px dashed var(--border)",
                    paddingTop: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                    {m.intlName} {i.usdTon != null ? "美元/吨" : m.usdUnit}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: up ? UP : DOWN }}>
                    {fmtPrice(usdPrice ?? undefined, i.usdTon != null ? 0 : 2)}
                  </div>
                  <div style={{ fontSize: 11, fontVariantNumeric: "tabular-nums", color: "var(--text-tertiary)" }}>
                    {cny != null && cnyPrice != null ? `≈ 按汇率 ${fmtPrice(cny, 4)} 折算` : "汇率暂不可用"}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    borderTop: "1px dashed var(--border)",
                    paddingTop: 10,
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                  }}
                >
                  行情暂不可用
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 20, textAlign: "center" }}>
        数据来源：Yahoo Finance · 人民币价 = 国际价 × USD/CNY 汇率折算（黄金白银按 1 金衡盎司 = 31.1035 克，铜按 1 短吨 = 2204.62 磅）
        · 仅供个人参考，不构成投资建议 · 交易时段外为最近收盘价
      </p>
    </div>
  );
}

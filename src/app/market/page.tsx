"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Quote = { id: string; name: string; price: number; change: number; pct: number };
type IntlQuote = { name: string; price: number; chg: number; pct: number; usdTon?: number; unit: string };

const METALS = [
  { id: "aum", name: "沪金", symbol: "Au", unit: "元/克", color: "#f59e0b", intl: "hf_XAU", intlName: "伦敦金" },
  { id: "agm", name: "沪银", symbol: "Ag", unit: "元/千克", color: "#94a3b8", intl: "hf_XAG", intlName: "伦敦银", gramDiv: 1000, gramDigits: 3 },
  { id: "cum", name: "沪铜", symbol: "Cu", unit: "元/吨", color: "#d97706", intl: "hf_HG", intlName: "美铜", gramDiv: 1000000, gramDigits: 4 },
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
const CACHE_KEY = "bookmark-nav-market-v1";

type MarketCache = {
  quotes: Record<string, Quote>;
  intl: Record<string, IntlQuote>;
  ts: number; // 缓存时间戳（毫秒）
};

function readCache(): MarketCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as MarketCache;
    if (!c || typeof c.ts !== "number" || !c.quotes) return null;
    return c;
  } catch {
    return null;
  }
}

function writeCache(quotes: Record<string, Quote>, intl: Record<string, IntlQuote>, ts: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ quotes, intl, ts } satisfies MarketCache));
  } catch {
    /* 存储满/隐私模式时静默失败，不影响页面 */
  }
}

export default function MarketPage() {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [intl, setIntl] = useState<Record<string, IntlQuote>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const quotesRef = useRef<Record<string, Quote>>({});
  const intlRef = useRef<Record<string, IntlQuote>>({});

  const fetchQuotes = useCallback(async () => {
    const secids = METALS.map((m) => `113.${m.id}`).join(",");
    const cnUrl = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&invt=2&fields=f2,f3,f4,f12,f14&secids=${secids}&ut=fa5fd1943c7b386f172d6893dbfba10b`;
    let cnOk = false;
    // 国内/国际独立容错：任一源失败不影响另一源展示
    try {
      const j = await fetch(cnUrl).then((r) => r.json());
      const diff = j?.data?.diff;
      if (!Array.isArray(diff) || diff.length === 0) throw new Error("empty cn");
      const map: Record<string, Quote> = {};
      for (const it of diff) {
        map[it.f12] = { id: it.f12, name: it.f14, price: it.f2, change: it.f4, pct: it.f3 };
      }
      quotesRef.current = map;
      setQuotes(map);
      cnOk = true;
    } catch {
      setError("国内行情获取失败，请检查网络后重试");
    }

    try {
      const j = await fetch("/api/market/intl", { cache: "no-store" }).then((r) => r.json());
      if (j?.ok && j.data) {
        intlRef.current = j.data;
        setIntl(j.data);
      }
    } catch {
      /* 国际价失败不报错，卡片显示 -- */
    }

    // 任一路径有数据（至少其一成功）即视为一次有效更新：刷新时间、清缓存标记、回写缓存
    if (cnOk || intlRef.current) {
      setFromCache(false);
      setLastUpdate(new Date());
      writeCache(quotesRef.current, intlRef.current, Date.now());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // 1) 先读缓存：命中则立即展示缓存数据与缓存时间
    const cache = readCache();
    if (cache) {
      quotesRef.current = cache.quotes;
      intlRef.current = cache.intl ?? {};
      setQuotes(cache.quotes);
      setIntl(cache.intl ?? {});
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
            国内：上海期货交易所主力合约（人民币） · 国际：伦敦/纽约金属（美元） · 5 分钟自动刷新
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

      {error && (
        <div
          style={{
            marginTop: 16,
            padding: "10px 16px",
            borderRadius: 10,
            fontSize: 13,
            color: "#f87171",
            background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.25)",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {METALS.map((m) => {
          const q = quotes[m.id];
          const i = m.intl ? intl[m.intl] : undefined;
          const cnUp = q && q.pct >= 0;
          const intlUp = i && i.pct >= 0;
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
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{m.unit}</div>
                </div>
              </div>

              {/* 国内价 */}
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: q ? (cnUp ? UP : DOWN) : "var(--text-secondary)" }}>
                  {fmtPrice(q?.price)}
                </div>
                <div style={{ fontSize: 12, fontVariantNumeric: "tabular-nums", color: q ? (cnUp ? UP : DOWN) : "var(--text-tertiary)", marginTop: 2 }}>
                  {q ? `${q.change >= 0 ? "+" : ""}${fmtPrice(q.change, 1)}  ${fmtPct(q.pct)}` : "--"}
                </div>
                {m.gramDiv && q && (
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontVariantNumeric: "tabular-nums", marginTop: 4 }}>
                    折合 {(q.price / m.gramDiv).toFixed(m.gramDigits)} 元/克
                  </div>
                )}
              </div>

              {/* 国际价 */}
              {m.intl ? (
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
                    {m.intlName} {i?.usdTon ? "· 美元/吨" : i?.unit ?? "美元/盎司"}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: i ? (intlUp ? UP : DOWN) : "var(--text-secondary)" }}>
                    {i ? (i.usdTon != null ? fmtPrice(i.usdTon, 0) : fmtPrice(i.price)) : "--"}
                  </div>
                  <div style={{ fontSize: 11, fontVariantNumeric: "tabular-nums", color: i ? (intlUp ? UP : DOWN) : "var(--text-tertiary)" }}>
                    {i ? `${i.chg >= 0 ? "+" : ""}${fmtPrice(i.chg, 1)}  ${fmtPct(i.pct)}` : "--"}
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
                  国际价暂不可用
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 20, textAlign: "center" }}>
        国内数据来源：东方财富 · 国际数据来源：Yahoo Finance · 仅供个人参考，不构成投资建议 · 交易时段外为最近收盘价
      </p>
    </div>
  );
}

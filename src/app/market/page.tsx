"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Quote = { id: string; name: string; price: number; change: number; pct: number };

const METALS = [
  { id: "aum", name: "沪金", symbol: "Au", unit: "元/克", color: "#f59e0b" },
  { id: "agm", name: "沪银", symbol: "Ag", unit: "元/千克", color: "#94a3b8" },
  { id: "cum", name: "沪铜", symbol: "Cu", unit: "元/吨", color: "#d97706" },
  { id: "alm", name: "沪铝", symbol: "Al", unit: "元/吨", color: "#a8a29e" },
  { id: "znm", name: "沪锌", symbol: "Zn", unit: "元/吨", color: "#64748b" },
  { id: "nim", name: "沪镍", symbol: "Ni", unit: "元/吨", color: "#14b8a6" },
  { id: "snm", name: "沪锡", symbol: "Sn", unit: "元/吨", color: "#8b5cf6" },
  { id: "pbm", name: "沪铅", symbol: "Pb", unit: "元/吨", color: "#6b7280" },
];

const UP = "#ef4444";
const DOWN = "#22c55e";

function fmtPrice(v: number) {
  if (v == null) return "--";
  return v.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

export default function MarketPage() {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQuotes = useCallback(async () => {
    const secids = METALS.map((m) => `113.${m.id}`).join(",");
    const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&invt=2&fields=f2,f3,f4,f12,f14&secids=${secids}&ut=fa5fd1943c7b386f172d6893dbfba10b`;
    try {
      const res = await fetch(url);
      const json = await res.json();
      const diff = json?.data?.diff;
      if (!Array.isArray(diff) || diff.length === 0) throw new Error("empty");
      const map: Record<string, Quote> = {};
      for (const it of diff) {
        map[it.f12] = {
          id: it.f12,
          name: it.f14,
          price: it.f2,
          change: it.f4,
          pct: it.f3,
        };
      }
      setQuotes(map);
      setLastUpdate(new Date());
      setError("");
    } catch (e) {
      setError("行情获取失败，请检查网络后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
    timerRef.current = setInterval(fetchQuotes, 30000);
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
            上海期货交易所主力合约 · 人民币计价 · 30 秒自动刷新
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            {lastUpdate ? `更新于 ${lastUpdate.toLocaleTimeString("zh-CN")}` : loading ? "加载中…" : ""}
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
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {METALS.map((m) => {
          const q = quotes[m.id];
          const up = q && q.pct >= 0;
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
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: q ? (up ? UP : DOWN) : "var(--text-secondary)" }}>
                  {fmtPrice(q?.price)}
                </div>
                <div style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", color: q ? (up ? UP : DOWN) : "var(--text-tertiary)", marginTop: 4 }}>
                  {q ? `${up ? "+" : ""}${fmtPrice(q.change)}  ${up ? "+" : ""}${q.pct.toFixed(2)}%` : "--"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 20, textAlign: "center" }}>
        数据来源：东方财富 · 仅供个人参考，不构成投资建议 · 交易时段外为最近收盘价
      </p>
    </div>
  );
}

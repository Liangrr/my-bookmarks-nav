import { NextResponse } from "next/server";

// 国际金属行情代理：Yahoo Finance（海外可达、免费、无 key）。
// 覆盖：黄金 GC=F / 白银 SI=F / 铜 HG=F（COMEX 期货，美元计价）。
// 备注：新浪/腾讯等国内行情接口从 Vercel 海外访问会超时，不可用于代理。
export const dynamic = "force-dynamic";

const SYMBOLS: { sym: string; key: string; name: string; unit: string }[] = [
  { sym: "GC=F", key: "hf_XAU", name: "纽约金", unit: "美元/盎司" },
  { sym: "SI=F", key: "hf_XAG", name: "纽约银", unit: "美元/盎司" },
  { sym: "HG=F", key: "hf_HG", name: "美铜", unit: "美元/磅" },
];

async function yahooQuote(sym: string) {
  const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`, {
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`yahoo ${sym} http ${res.status}`);
  const j = await res.json();
  const m = j?.chart?.result?.[0]?.meta;
  const price = m?.regularMarketPrice;
  if (price == null) throw new Error(`yahoo ${sym} no price`);
  const prev = m?.chartPreviousClose ?? m?.previousClose ?? price;
  const chg = prev ? price - prev : 0;
  const pct = prev ? (chg / prev) * 100 : 0;
  return { price, chg, pct };
}

// 东财港伦敦金（黄金国际价兜底）
async function eastmoneyGold() {
  const res = await fetch(
    "https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&invt=2&fields=f2,f3,f4,f12,f14&secids=123.HLAU&ut=fa5fd1943c7b386f172d6893dbfba10b",
    { cache: "no-store" }
  );
  const j = await res.json();
  const it = j?.data?.diff?.[0];
  if (!it?.f2) return null;
  const prev = it.f4 ? it.f2 - it.f4 : it.f2;
  return { price: it.f2, chg: it.f4, pct: it.f3, name: "港伦敦金" };
}

export async function GET() {
  const out: Record<string, { name: string; price: number; chg: number; pct: number; usdTon?: number; unit: string }> = {};
  try {
    // 并行拉 Yahoo 三品种，单个失败不拖垮整体
    const results = await Promise.allSettled(SYMBOLS.map((s) => yahooQuote(s.sym)));
    results.forEach((r, idx) => {
      const def = SYMBOLS[idx];
      if (r.status === "fulfilled") {
        out[def.key] = { name: def.name, price: r.value.price, chg: r.value.chg, pct: r.value.pct, unit: def.unit };
      }
    });

    // 黄金 Yahoo 失败时用东财港伦敦金兜底
    if (!out["hf_XAU"]) {
      const gold = await eastmoneyGold().catch(() => null);
      if (gold) out["hf_XAU"] = { ...gold, unit: "美元/盎司" };
    }

    // 美铜：美元/磅 → 美元/短吨（×2204.62）
    if (out["hf_HG"]) out["hf_HG"].usdTon = Math.round(out["hf_HG"].price * 2204.62);

    const ok = Object.keys(out).length > 0;
    return NextResponse.json({ ok, data: out }, { status: ok ? 200 : 502 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }
}

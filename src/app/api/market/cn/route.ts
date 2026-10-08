import { NextResponse } from "next/server";

// 国内金属行情代理：东方财富 push2（浏览器直连会被 CORS/反爬拒绝，见开发规范 3.24）。
// 覆盖：沪金 113.aum / 沪银 113.agm / 沪铜 113.cum（上期所主力连续，人民币计价）。
export const dynamic = "force-dynamic";

const SECIDS = "113.aum,113.agm,113.cum";
const URL = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&invt=2&fields=f2,f3,f4,f12,f14&secids=${SECIDS}&ut=fa5fd1943c7b386f172d6893dbfba10b`;

async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 6000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  try {
    const res = await fetchWithTimeout(URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
        "Referer": "https://quote.eastmoney.com/",
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`eastmoney http ${res.status}`);
    const j = await res.json();
    const diff = j?.data?.diff;
    if (!Array.isArray(diff) || diff.length === 0) throw new Error("eastmoney empty diff");

    const data: Record<string, { name: string; price: number; change: number; pct: number }> = {};
    for (const it of diff) {
      if (it?.f12 && it.f2 != null) {
        data[it.f12] = { name: it.f14 ?? it.f12, price: it.f2, change: it.f4 ?? 0, pct: it.f3 ?? 0 };
      }
    }
    if (Object.keys(data).length === 0) throw new Error("eastmoney no quote");
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }
}

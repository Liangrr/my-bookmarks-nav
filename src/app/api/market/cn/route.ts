import { NextResponse } from "next/server";

// 国内金属行情代理：东方财富 push2（浏览器直连会被 CORS/反爬拒绝，Vercel 海外出口偶发 502，见开发规范 3.24）。
// 覆盖：沪金 113.aum / 沪银 113.agm / 沪铜 113.cum（上期所主力连续，人民币计价）。
// 多节点并行 + 取首个成功：Vercel 函数每次请求可能分配不同 AWS 出口 IP，东财对海外 IP 间歇放行，多节点显著提高命中率。
export const dynamic = "force-dynamic";

const HOSTS = ["push2.eastmoney.com", "push2delay.eastmoney.com", "push2his.eastmoney.com"];
const SECIDS = "113.aum,113.agm,113.cum";
const PATH = `/api/qt/ulist.np/get?fltt=2&invt=2&fields=f2,f3,f4,f12,f14&secids=${SECIDS}&ut=fa5fd1943c7b386f172d6893dbfba10b`;

async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 7000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOne(host: string): Promise<{ ok: boolean; data: Record<string, { name: string; price: number; change: number; pct: number }> }> {
  const res = await fetchWithTimeout(`https://${host}${PATH}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
      "Referer": "https://quote.eastmoney.com/",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${host} http ${res.status}`);
  const j = await res.json();
  const diff = j?.data?.diff;
  if (!Array.isArray(diff) || diff.length === 0) throw new Error(`${host} empty diff`);

  const data: Record<string, { name: string; price: number; change: number; pct: number }> = {};
  for (const it of diff) {
    if (it?.f12 && it.f2 != null) {
      data[it.f12] = { name: it.f14 ?? it.f12, price: it.f2, change: it.f4 ?? 0, pct: it.f3 ?? 0 };
    }
  }
  if (Object.keys(data).length === 0) throw new Error(`${host} no quote`);
  return { ok: true, data };
}

export async function GET() {
  const settled = await Promise.allSettled(HOSTS.map((h) => fetchOne(h)));
  for (const r of settled) {
    if (r.status === "fulfilled") {
      return NextResponse.json({ ok: true, data: r.value.data });
    }
  }
  // 全部失败：汇总首个错误信息便于排查
  const first = settled.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
  return NextResponse.json(
    { ok: false, error: first ? String(first.reason) : "all hosts failed" },
    { status: 502 }
  );
}

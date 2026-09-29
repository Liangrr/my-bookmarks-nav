import { NextResponse } from "next/server";

// 国际金属行情代理：新浪财经外盘接口（GBK 编码，服务端解码，规避浏览器直连的
// Referer 限制与 CORS 问题）。覆盖：伦敦金/伦敦银（美元/盎司）、美铜（美分/磅）。
export const dynamic = "force-dynamic";

const CODES = ["hf_XAU", "hf_XAG", "hf_HG"];

export async function GET() {
  try {
    const res = await fetch(`https://hq.sinajs.cn/list=${CODES.join(",")}`, {
      headers: {
        Referer: "https://finance.sina.com.cn",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`sina http ${res.status}`);
    const buf = await res.arrayBuffer();
    // 新浪行情为 GBK 编码
    const text = new TextDecoder("gbk").decode(buf);

    const out: Record<string, { name: string; price: number; chg: number; pct: number; usdTon?: number; unit: string }> = {};
    for (const code of CODES) {
      const m = text.match(new RegExp(`hq_str_${code}="([^"]*)"`));
      if (!m) continue;
      const f = m[1].split(",");
      const price = parseFloat(f[0]) || 0;
      // 新浪外盘格式：现价,昨收(偶为空),今开,昨收兜底,...；昨收取 f[1]，空则取 f[3]
      const prev = parseFloat(f[1]) || parseFloat(f[3]) || 0;
      const chg = prev ? price - prev : 0;
      const pct = prev ? (chg / prev) * 100 : 0;
      out[code] = {
        name: (f[13] || code).replace(/\s+/g, ""),
        price,
        chg,
        pct,
        unit: "美元/盎司",
      };
    }
    // 美铜：新浪单位为美分/磅 → 美元/短吨 = ×2204.62/100
    if (out["hf_HG"]) {
      out["hf_HG"].unit = "美分/磅";
      out["hf_HG"].usdTon = Math.round(out["hf_HG"].price * 22.0462);
    }
    return NextResponse.json({ ok: true, data: out });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }
}

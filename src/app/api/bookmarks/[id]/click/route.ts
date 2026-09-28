import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * 点击计数：匿名访问者也可调用
 * 通过数据库 SECURITY DEFINER 函数 increment_bookmark_click 安全累加，
 * 无需暴露服务端密钥。
 *
 * 限流：同一 IP 对同一书签每 5 秒最多记录 1 次，防脚本刷热门排行。
 * 注意：Vercel serverless 多实例下内存不共享，此为 best-effort 防护。
 */
const RATE_LIMIT_MS = 5000;
const clickLog = new Map<string, number>();

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bookmarkId = Number(id);
  if (!Number.isInteger(bookmarkId) || bookmarkId <= 0) {
    return NextResponse.json({ error: "invalid bookmark id" }, { status: 400 });
  }

  // 限流：同 IP + 同书签 5 秒内只记 1 次
  const ip = getClientIp(req);
  const key = `${ip}:${bookmarkId}`;
  const now = Date.now();
  const last = clickLog.get(key) ?? 0;
  if (now - last < RATE_LIMIT_MS) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }
  clickLog.set(key, now);
  // 防 Map 无限增长：超过 1 万条时清理过期项
  if (clickLog.size > 10000) {
    for (const [k, t] of clickLog) {
      if (now - t > RATE_LIMIT_MS) clickLog.delete(k);
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("increment_bookmark_click", {
    bookmark_id: bookmarkId,
  });

  if (error) {
    console.error("increment_bookmark_click error:", error.message);
    return NextResponse.json({ error: "failed to increment" }, { status: 500 });
  }

  return NextResponse.json({ id: bookmarkId, count: data });
}

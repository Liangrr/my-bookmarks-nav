import { NextResponse } from "next/server";

// 轻量健康探测端点：保持 Vercel 函数实例热（防冷启动）。
// 不查库、不调外部服务，仅返回 ok，消耗可忽略。
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() });
}

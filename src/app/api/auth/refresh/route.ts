import { NextResponse, type NextRequest } from "next/server";
import { requestToken } from "@/lib/supabase/auth-proxy";

/** POST /api/auth/refresh —— 用 refresh_token 换新的 access_token（小程序端用） */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { refresh_token?: string } | null;
  const refreshToken = body?.refresh_token?.trim();

  if (!refreshToken) {
    return NextResponse.json({ error: "缺少 refresh_token" }, { status: 400 });
  }

  const result = await requestToken("refresh_token", { refresh_token: refreshToken });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ session: result.session });
}

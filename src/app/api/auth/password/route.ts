import { NextResponse, type NextRequest } from "next/server";
import { requestToken } from "@/lib/supabase/auth-proxy";

/** POST /api/auth/password —— 邮箱 + 密码登录（小程序端用） */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;
  const email = body?.email?.trim();
  const password = body?.password;

  if (!email || !password) {
    return NextResponse.json({ error: "请填写邮箱和密码" }, { status: 400 });
  }

  const result = await requestToken("password", { email, password });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ session: result.session });
}

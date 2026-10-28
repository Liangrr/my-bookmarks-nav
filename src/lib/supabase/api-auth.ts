import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export type ApiAuth = {
  supabase: SupabaseClient;
  user: User;
  token: string;
};

/**
 * 小程序端没有可靠的 Supabase SDK 直连能力（weapp 无 fetch），统一走后端代理。
 * 这里用请求头里的 access_token 建一个带 Authorization 的客户端，
 * 身份由该 token 决定，RLS 照常生效，不使用 service role。
 */
export async function authFromRequest(req: NextRequest): Promise<ApiAuth | null> {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  return { supabase, user: data.user, token };
}

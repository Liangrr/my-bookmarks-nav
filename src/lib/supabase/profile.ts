import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 查询当前用户 profile；若不存在（如旧账号、触发器未触发），
 * 基于 auth user 元数据自动创建一行后重查，保证个人中心不因 0 行报错。
 */
export async function getOrCreateProfile<T>(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (data) return data as T;

  // 无 profile：用 auth 用户信息自愈创建
  const { data: userData } = await supabase.auth.getUser();
  const meta = userData?.user?.user_metadata ?? {};
  const email = userData?.user?.email ?? "";
  const fallbackName = email.split("@")[0] || null;

  await supabase.from("profiles").upsert({
    id: userId,
    username: meta.username || meta.user_name || fallbackName,
    full_name: meta.full_name || meta.name || null,
  });

  const { data: created } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  return (created ?? null) as T | null;
}

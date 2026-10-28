// Supabase Auth REST 的服务端代理：小程序端无法直连 Supabase（weapp 没有 fetch），
// 且 anon key 不该出现在客户端产物里，这里把登录 / 刷新 token 收在服务端。

export type ProxySession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: unknown;
};

export type TokenResult =
  | { ok: true; session: ProxySession }
  | { ok: false; status: number; error: string };

export async function requestToken(
  grant: "password" | "refresh_token",
  body: Record<string, unknown>
): Promise<TokenResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { ok: false, status: 500, error: "服务端缺少 Supabase 配置" };
  }

  const res = await fetch(`${url}/auth/v1/token?grant_type=${grant}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    const message =
      (data.msg as string) ||
      (data.error_description as string) ||
      (data.error as string) ||
      "登录失败";
    return { ok: false, status: res.status, error: message };
  }

  const accessToken = data.access_token as string | undefined;
  const refreshToken = data.refresh_token as string | undefined;
  if (!accessToken || !refreshToken) {
    return { ok: false, status: 502, error: "认证服务返回异常" };
  }

  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 3600;
  return {
    ok: true,
    session: {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at:
        typeof data.expires_at === "number"
          ? data.expires_at
          : Math.floor(Date.now() / 1000) + expiresIn,
      user: data.user ?? null,
    },
  };
}

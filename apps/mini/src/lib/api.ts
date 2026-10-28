import Taro from "@tarojs/taro";
import type { Todo } from "@shared-lib/todos";

// 小程序端不直连 Supabase（weapp 没有 fetch，SDK 也不可靠），
// 统一走 Web 端的 /api/* 代理：anon key 只留在服务端，RLS 仍按 token 里的用户生效。
const API_BASE =
  process.env.TARO_APP_API_BASE ?? "https://bookmark-nav-site.vercel.app";

const SESSION_KEY = "starrail.session";

export type MiniSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: { id: string; email?: string } | null;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}

export function getSession(): MiniSession | null {
  try {
    const raw = Taro.getStorageSync(SESSION_KEY);
    if (!raw) return null;
    return typeof raw === "string" ? (JSON.parse(raw) as MiniSession) : (raw as MiniSession);
  } catch {
    return null;
  }
}

function saveSession(session: MiniSession | null) {
  if (session) Taro.setStorageSync(SESSION_KEY, JSON.stringify(session));
  else Taro.removeStorageSync(SESSION_KEY);
}

export function logout() {
  saveSession(null);
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

async function send(path: string, method: Method, data: unknown, token?: string) {
  const header: Record<string, string> = { "Content-Type": "application/json" };
  if (token) header.Authorization = `Bearer ${token}`;
  return Taro.request({
    url: `${API_BASE}${path}`,
    method,
    data: data as Record<string, unknown> | undefined,
    header,
  });
}

async function refresh(refreshToken: string): Promise<MiniSession | null> {
  try {
    const res = await send("/api/auth/refresh", "POST", { refresh_token: refreshToken });
    if (res.statusCode >= 400) return null;
    const session = (res.data as { session: MiniSession }).session;
    saveSession(session);
    return session;
  } catch {
    return null;
  }
}

export async function login(email: string, password: string): Promise<MiniSession> {
  const res = await send("/api/auth/password", "POST", { email, password });
  if (res.statusCode >= 400) {
    const message = (res.data as { error?: string })?.error ?? "登录失败";
    throw new ApiError(message, res.statusCode);
  }
  const session = (res.data as { session: MiniSession }).session;
  saveSession(session);
  return session;
}

/** 带自动续期的鉴权请求：401 时用 refresh_token 换一次再重试 */
async function authed<T>(path: string, method: Method, data?: unknown): Promise<T> {
  let session = getSession();
  if (!session) throw new ApiError("请先登录", 401);

  if (session.expires_at * 1000 < Date.now() + 60000) {
    session = await refresh(session.refresh_token);
    if (!session) {
      saveSession(null);
      throw new ApiError("登录已过期，请重新登录", 401);
    }
  }

  let res = await send(path, method, data, session.access_token);
  if (res.statusCode === 401) {
    session = await refresh(session.refresh_token);
    if (!session) {
      saveSession(null);
      throw new ApiError("登录已过期，请重新登录", 401);
    }
    res = await send(path, method, data, session.access_token);
  }

  if (res.statusCode >= 400) {
    const message = (res.data as { error?: string })?.error ?? "请求失败";
    throw new ApiError(message, res.statusCode);
  }
  return res.data as T;
}

export async function fetchTodos(): Promise<Todo[]> {
  const data = await authed<{ todos: Todo[] }>("/api/todos", "GET");
  return data.todos;
}

export type TodoWriteInput = {
  title: string;
  starts_at: string;
  all_day?: boolean;
  place?: string | null;
  due_at?: string | null;
  duration_min?: number | null;
  detail?: string | null;
  expect?: string | null;
  priority?: number;
};

export async function createTodo(input: TodoWriteInput): Promise<Todo> {
  const data = await authed<{ todo: Todo }>("/api/todos", "POST", input);
  return data.todo;
}

export async function patchTodo(
  id: string,
  patch: Partial<TodoWriteInput> & {
    status?: Todo["status"];
    result?: string | null;
    outcome?: Todo["outcome"];
    actual_min?: number | null;
    completed_at?: string | null;
  }
): Promise<Todo> {
  const data = await authed<{ todo: Todo }>(`/api/todos/${id}`, "PATCH", patch);
  return data.todo;
}

export async function deleteTodo(id: string): Promise<void> {
  await authed(`/api/todos/${id}`, "DELETE");
}

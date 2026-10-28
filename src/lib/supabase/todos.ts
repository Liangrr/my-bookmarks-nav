import type { SupabaseClient } from "@supabase/supabase-js";
import type { Todo } from "@shared-lib/todos";

// 显式列出列名：新增列时两边（select / insert）一起改，避免 select("*") 把无关字段带进前端
export const TODO_COLUMNS =
  "id,user_id,title,detail,place,starts_at,due_at,all_day,duration_min,expect,result,outcome,actual_min,priority,status,tags,remind_at,created_at,updated_at,completed_at";

export type TodoCreateInput = {
  title: string;
  starts_at: string;
  detail?: string | null;
  place?: string | null;
  due_at?: string | null;
  all_day?: boolean;
  duration_min?: number | null;
  expect?: string | null;
  priority?: number;
  tags?: string[];
  remind_at?: string | null;
};

export type TodoPatch = Partial<Omit<Todo, "id" | "user_id" | "created_at">>;

// 服务端写入口的白名单：客户端永远不能指定 user_id / id / created_at
const WRITABLE_FIELDS = [
  "title",
  "detail",
  "place",
  "starts_at",
  "due_at",
  "all_day",
  "duration_min",
  "expect",
  "result",
  "outcome",
  "actual_min",
  "priority",
  "status",
  "tags",
  "remind_at",
  "completed_at",
] as const;

export function pickTodoFields(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object") return {};
  const source = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of WRITABLE_FIELDS) {
    if (key in source) out[key] = source[key];
  }
  return out;
}

export async function listTodos(supabase: SupabaseClient): Promise<Todo[]> {
  const { data, error } = await supabase
    .from("todos")
    .select(TODO_COLUMNS)
    .order("starts_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Todo[];
}

export async function createTodo(
  supabase: SupabaseClient,
  userId: string,
  input: TodoCreateInput
): Promise<Todo> {
  const { data, error } = await supabase
    .from("todos")
    .insert({ ...input, user_id: userId })
    .select(TODO_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as Todo;
}

export async function updateTodo(
  supabase: SupabaseClient,
  id: string,
  patch: TodoPatch
): Promise<Todo> {
  const { data, error } = await supabase
    .from("todos")
    .update(patch)
    .eq("id", id)
    .select(TODO_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as Todo;
}

export async function removeTodo(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("todos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

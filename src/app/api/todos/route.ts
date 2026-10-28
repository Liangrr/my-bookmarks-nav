import { NextResponse, type NextRequest } from "next/server";
import { validateTodo } from "@shared-lib/todos";
import { authFromRequest } from "@/lib/supabase/api-auth";
import { pickTodoFields, TODO_COLUMNS } from "@/lib/supabase/todos";

const unauthorized = () => NextResponse.json({ error: "未登录或登录已过期" }, { status: 401 });

/** GET /api/todos —— 当前登录用户的全部待办（RLS 已按 user_id 收敛） */
export async function GET(req: NextRequest) {
  const auth = await authFromRequest(req);
  if (!auth) return unauthorized();

  const { data, error } = await auth.supabase
    .from("todos")
    .select(TODO_COLUMNS)
    .order("starts_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ todos: data ?? [] });
}

/** POST /api/todos —— 新建，最少只需 title + starts_at */
export async function POST(req: NextRequest) {
  const auth = await authFromRequest(req);
  if (!auth) return unauthorized();

  const body = await req.json().catch(() => null);
  const fields = pickTodoFields(body);

  const check = validateTodo({
    title: fields.title as string | undefined,
    starts_at: fields.starts_at as string | undefined,
    due_at: fields.due_at as string | undefined,
    duration_min: fields.duration_min as number | undefined,
    actual_min: fields.actual_min as number | undefined,
    priority: fields.priority as number | undefined,
    status: fields.status as string | undefined,
    outcome: fields.outcome as string | undefined,
  });
  if (!check.ok) {
    return NextResponse.json({ error: check.errors.join("；"), errors: check.errors }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("todos")
    .insert({ ...fields, user_id: auth.user.id })
    .select(TODO_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ todo: data }, { status: 201 });
}

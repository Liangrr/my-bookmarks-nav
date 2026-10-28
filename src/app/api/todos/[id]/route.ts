import { NextResponse, type NextRequest } from "next/server";
import { validateTodo } from "@shared-lib/todos";
import { authFromRequest } from "@/lib/supabase/api-auth";
import { pickTodoFields, TODO_COLUMNS } from "@/lib/supabase/todos";

const unauthorized = () => NextResponse.json({ error: "未登录或登录已过期" }, { status: 401 });

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/todos/[id] —— 改字段 / 改状态（完成、放弃、重新打开都走这里） */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await authFromRequest(req);
  if (!auth) return unauthorized();

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const fields = pickTodoFields(body);
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "没有要更新的字段" }, { status: 400 });
  }

  // 只校验本次带过来的字段，未传的保持库里原值
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
    .update(fields)
    .eq("id", id)
    .select(TODO_COLUMNS)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "待办不存在" }, { status: 404 });
  return NextResponse.json({ todo: data });
}

/** DELETE /api/todos/[id] */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await authFromRequest(req);
  if (!auth) return unauthorized();

  const { id } = await ctx.params;
  const { error } = await auth.supabase.from("todos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

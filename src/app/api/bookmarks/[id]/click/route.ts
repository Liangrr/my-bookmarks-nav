import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * 点击计数：匿名访问者也可调用
 * 通过数据库 SECURITY DEFINER 函数 increment_bookmark_click 安全累加，
 * 无需暴露服务端密钥。
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bookmarkId = Number(id);
  if (!Number.isInteger(bookmarkId) || bookmarkId <= 0) {
    return NextResponse.json({ error: "invalid bookmark id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("increment_bookmark_click", {
    bookmark_id: bookmarkId,
  });

  if (error) {
    console.error("increment_bookmark_click error:", error.message);
    return NextResponse.json({ error: "failed to increment" }, { status: 500 });
  }

  return NextResponse.json({ id: bookmarkId, count: data });
}

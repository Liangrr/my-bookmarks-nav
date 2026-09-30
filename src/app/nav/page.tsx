import { createClient } from "@/lib/supabase/server";
import HomeContent from "@/components/home-content";

export const metadata = {
  title: "网站导航 - 星轨",
  description: "星轨 · 日常在用的优质网站，都在这里。分类导航、热门排行、点击即达。",
};

// 每次请求实时渲染，保证点击计数/热门排行是最新数据
export const dynamic = "force-dynamic";

export default async function NavPage() {
  const supabase = await createClient();

  const [categoryRes, bookmarkRes] = await Promise.all([
    supabase
      .from("categories")
      .select("id,name,slug,color,icon,sort_order")
      .order("sort_order"),
    supabase
      .from("bookmarks")
      .select("id,title,url,description,icon,category_id,size,click_count,sort_order")
      .order("sort_order"),
  ]);

  return (
    <HomeContent
      categories={categoryRes.data ?? []}
      bookmarks={bookmarkRes.data ?? []}
    />
  );
}

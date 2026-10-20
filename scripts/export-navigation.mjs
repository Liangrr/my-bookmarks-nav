// 一次性导出：把 Supabase 的 categories + bookmarks 拉成本地 navigation.json（不再依赖数据库）
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const env = {};
for (const line of fs.readFileSync(path.resolve(".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error("缺少 SUPABASE_URL / ANON_KEY");

const sb = createClient(url, key);

const [catRes, bmRes] = await Promise.all([
  sb.from("categories").select("id,name,slug,color,icon,sort_order").order("sort_order"),
  sb
    .from("bookmarks")
    .select("id,title,url,description,icon,category_id,size,is_featured,sort_order")
    .order("sort_order"),
]);
if (catRes.error) throw catRes.error;
if (bmRes.error) throw bmRes.error;

const out = {
  version: "1.0.0",
  exportedAt: new Date().toISOString(),
  categories: catRes.data,
  bookmarks: bmRes.data,
};

const target = path.resolve("packages/shared-data/src/navigation.json");
fs.writeFileSync(target, JSON.stringify(out, null, 2), "utf8");
console.log(`categories=${catRes.data.length} bookmarks=${bmRes.data.length} -> ${target}`);

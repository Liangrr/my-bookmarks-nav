import { useMemo, useState } from "react";
import { Input, Text, View, ScrollView } from "@tarojs/components";
import Taro from "@tarojs/taro";
import data from "@shared-data/navigation.json";

type Category = { id: number; name: string; slug: string; color: string; icon: string | null; sort_order: number };
type Bookmark = {
  id: number;
  title: string;
  url: string;
  description: string | null;
  icon: string | null;
  category_id: number | null;
  size: string;
  sort_order: number;
};

const D = data as unknown as { categories: Category[]; bookmarks: Bookmark[] };

function hostOf(url: string) {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function copyLink(url: string) {
  Taro.setClipboardData({
    data: url,
    success: () => Taro.showToast({ title: "链接已复制，去浏览器打开", icon: "none" }),
  });
}

export default function Nav() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<number | "all">("all");
  const [showTop, setShowTop] = useState(false);

  // 页面滚动监听：超过一屏才显示回顶胶囊
  Taro.usePageScroll(({ scrollTop }) => setShowTop(scrollTop > 400));

  const goTop = () => Taro.pageScrollTo({ scrollTop: 0, duration: 300 });

  const catMap = useMemo(() => new Map(D.categories.map((c) => [c.id, c])), []);

  const list = useMemo(() => {
    const key = q.trim().toLowerCase();
    return D.bookmarks
      .filter((b) => (cat === "all" || b.category_id === cat))
      .filter((b) => {
        if (!key) return true;
        return (
          b.title.toLowerCase().includes(key) ||
          (b.description ?? "").toLowerCase().includes(key) ||
          b.url.toLowerCase().includes(key)
        );
      })
      .sort((a, b) => hostOf(a.url).localeCompare(hostOf(b.url), "en", { numeric: true }));
  }, [q, cat]);

  return (
    <View className="page">
      <View className="title">网站导航</View>
      <View className="sub">{D.bookmarks.length} 个常用网站，点按卡片复制链接</View>

      <View className="nav-sticky">
        <Input
          className="search"
          value={q}
          onInput={(e) => setQ(e.detail.value)}
          placeholder="搜索网站名称、域名或关键词"
          placeholderClass="sub"
        />

        <ScrollView scrollX enhanced showScrollbar={false} className="chips-scroll">
          <View className="chips">
            <View className={`chip${cat === "all" ? " chip-on" : ""}`} onClick={() => setCat("all")}>全部</View>
            {D.categories.map((c) => (
              <View key={c.id} className={`chip${cat === c.id ? " chip-on" : ""}`} onClick={() => setCat(c.id)}>
                {c.icon} {c.name}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <View className="sub">命中 {list.length} / {D.bookmarks.length} 个</View>

      {list.length === 0 ? (
        <View className="empty">没有找到匹配的网站</View>
      ) : (
        list.map((b) => {
          const c = b.category_id != null ? catMap.get(b.category_id) : undefined;
          return (
            <View key={b.id} className="card nav-card" onClick={() => copyLink(b.url)}>
              <View className="card-head">
                <View className="nav-avatar">{b.title.charAt(0).toUpperCase()}</View>
                <View className="nav-body">
                  <View className="nav-title">{b.title}</View>
                  <View className="nav-domain">{hostOf(b.url)}</View>
                </View>
                <Text className="tag">{c?.name ?? "未分类"}</Text>
              </View>
              {b.description ? <View className="line meta">{b.description}</View> : null}
            </View>
          );
        })
      )}

      {showTop ? (
        <View className="back-top" onClick={goTop}>
          <Text className="back-top-arrow">↑</Text>
        </View>
      ) : null}
    </View>
  );
}

"use client";

import { useState, useMemo } from "react";
import { BookmarkCard } from "@/components/bookmark-card";

export interface Category {
  id: number;
  name: string;
  slug: string;
  color: string;
  icon: string | null;
  sort_order: number;
}

export interface Bookmark {
  id: number;
  title: string;
  url: string;
  description: string | null;
  icon: string | null;
  category_id: number | null;
  size: string;
  sort_order: number;
}

interface HomeContentProps {
  categories: Category[];
  bookmarks: Bookmark[];
}

export default function HomeContent({ categories, bookmarks }: HomeContentProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | "all">("all");

  // 分类映射
  const categoryMap = useMemo(() => {
    const m = new Map<number, Category>();
    categories.forEach((c) => m.set(c.id, c));
    return m;
  }, [categories]);

  const getCategoryName = (id: number | null) => {
    if (id === null) return "未分类";
    return categoryMap.get(id)?.name ?? "未分类";
  };

  const getCategorySlug = (id: number | null) => {
    return categoryMap.get(id ?? -1)?.slug ?? "other";
  };

  // 标签列表
  const tabs = useMemo(
    () => [{ id: "all" as const, name: "全部" }, ...categories.map((c) => ({ id: c.id as number, name: c.name }))],
    [categories]
  );

  // 全部书签按域名（hostname）字母数字排序
  const sortedBookmarks = useMemo(() => {
    const hostOf = (b: Bookmark) => {
      try {
        return new URL(b.url.startsWith("http") ? b.url : `https://${b.url}`)
          .hostname.replace(/^www\./, "")
          .toLowerCase();
      } catch {
        return b.url.toLowerCase();
      }
    };
    return [...bookmarks].sort((a, b) =>
      hostOf(a).localeCompare(hostOf(b), "en", { numeric: true, sensitivity: "base" })
    );
  }, [bookmarks]);

  // 筛选（保持域名排序）
  const filteredBookmarks = useMemo(() => {
    return sortedBookmarks.filter((bookmark) => {
      const matchesCategory =
        activeCategory === "all" || bookmark.category_id === activeCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        bookmark.title.toLowerCase().includes(q) ||
        (bookmark.description ?? "").toLowerCase().includes(q) ||
        bookmark.url.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [sortedBookmarks, activeCategory, searchQuery]);

  return (
    <>
      <div className="container">
        {/* 搜索栏 */}
        <div className="search-bar">
          <span className="search-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            className="search-input"
            placeholder="搜索网站名称或关键词..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* 分类标签 */}
        <div className="category-tabs">
          {tabs.map((category) => {
            const isActive = activeCategory === category.id;
            return (
              <button
                key={category.id}
                className={`tab ${isActive ? "active" : ""}`}
                onClick={() => setActiveCategory(category.id)}
              >
                {category.name}
              </button>
            );
          })}
        </div>

        {/* 统计 */}
        <div className="stats-bar">共 {filteredBookmarks.length} 个网站</div>

        {/* Bento Grid 书签卡片 */}
        <div className="bento-grid">
          {filteredBookmarks.map((bookmark) => (
            <BookmarkCard
              key={bookmark.id}
              title={bookmark.title}
              url={bookmark.url}
              desc={bookmark.description || bookmark.title}
              icon={bookmark.icon || ""}
              category={getCategorySlug(bookmark.category_id)}
              categoryName={getCategoryName(bookmark.category_id)}
              size={(bookmark.size as "normal" | "large" | "wide" | "tall") || "normal"}
            />
          ))}
        </div>

        {/* 无结果 */}
        {filteredBookmarks.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-tertiary)" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.5 }}>🔍</div>
            <p style={{ fontSize: "16px", fontWeight: 500 }}>没有找到匹配的网站</p>
            <p style={{ fontSize: "14px", marginTop: "8px" }}>试试其他关键词吧</p>
          </div>
        )}
      </div>

      {/* 页脚 */}
      <footer className="footer">
        星轨 · 日常在用的优质网站，都在这里 · 粤ICP备2026050662号-1
      </footer>
    </>
  );
}

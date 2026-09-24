"use client";

import { useState, useMemo } from "react";
import { BookmarkCard } from "@/components/bookmark-card";
import reorganizedBookmarks from "@/data/bookmarks-reorganized.json";

// 生成图标（标题首字母）
const generateIcon = (title: string) => {
  return title.charAt(0).toUpperCase();
};

// 处理书签数据
const rawBookmarks = reorganizedBookmarks as any[];

// 提取所有分类
const categoryNames = [...new Set(rawBookmarks.map(b => b.category))];
const categories = [
  { id: "all", name: "全部" },
  ...categoryNames.map(name => ({ id: name, name })),
];

// 处理书签数据
const bookmarks = rawBookmarks.map(b => ({
  title: b.title,
  url: b.url,
  desc: b.notes || b.description || b.title,
  category: b.category,
  icon: b.icon || generateIcon(b.title),
  size: "normal" as const,
}));

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((bookmark) => {
      const matchesCategory =
        activeCategory === "all" || bookmark.category === activeCategory;
      const matchesSearch =
        searchQuery === "" ||
        bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bookmark.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bookmark.url.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, activeCategory]);

  const getCategoryName = (slug: string) => {
    return categories.find((c) => c.id === slug)?.name || slug;
  };

  return (
    <>
      <div className="container">
        {/* Hero 区 */}
        <div className="hero">
          <h1>Asuria精选网站收藏</h1>
          <p>影视、开发、设计、实用工具 —— 日常在用的优质网站，都在这里</p>
        </div>

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
          {categories.map((category) => {
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
          {filteredBookmarks.map((bookmark, index) => (
            <BookmarkCard
              key={`${bookmark.title}-${index}`}
              title={bookmark.title}
              url={bookmark.url}
              desc={bookmark.desc}
              icon={bookmark.icon}
              category={bookmark.category}
              categoryName={getCategoryName(bookmark.category)}
              size={bookmark.size || "normal"}
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
        我的收藏夹 · 个人网站导航 · Powered by Vercel
      </footer>
    </>
  );
}

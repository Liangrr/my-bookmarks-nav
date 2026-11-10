"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { BookmarkCard } from "@/components/bookmark-card";
import { StarMap, canUseStarMap } from "@/components/star-map";

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
  const [showTop, setShowTop] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "map">("cards");
  const [webglOK, setWebglOK] = useState(false);

  // 滚动超过阈值才显示「回到顶部」
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // WebGL2 能力在水合后探测，避免服务端 / 客户端首屏不一致
  useEffect(() => {
    const id = requestAnimationFrame(() => setWebglOK(canUseStarMap()));
    return () => cancelAnimationFrame(id);
  }, []);

  const scrollToTop = () =>
    window.scrollTo({ top: 0, behavior: "smooth" });

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
        {/* 特别企划：站内 3D 沉浸作品入口（样式用 inline 双保险，响应式方向交给 Tailwind） */}
        <Link
          href="/end-of-time"
          aria-label="进入《时间的尽头》交互式 3D 作品"
          className="eot-banner flex flex-col sm:flex-row items-start sm:items-center"
          style={{
            display: "flex",
            gap: 24,
            marginBottom: 32,
            padding: "20px 24px",
            minHeight: 132,
            borderRadius: "var(--radius-lg)",
            border: "1px solid rgba(232,196,138,.22)",
            background: "linear-gradient(100deg, rgba(9,10,20,.94), rgba(24,18,38,.68)), url('/end-of-time/banner.webp') center / cover no-repeat",
            textDecoration: "none",
            color: "var(--text-primary)",
            overflow: "hidden",
            position: "relative",
            boxShadow: "var(--shadow-card)",
            transition: "var(--transition)",
          }}
        >
          <div style={{ flex: "1 1 auto", minWidth: 0 }}>
            <div style={{ fontSize: 10, letterSpacing: ".34em", color: "rgba(232,196,138,.8)", marginBottom: 10 }}>
              星轨 · 特别企划 / INTERACTIVE ART
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: ".12em", marginBottom: 8 }}>
              时间的尽头
              <span style={{ fontSize: 11, letterSpacing: ".2em", color: "var(--text-tertiary)", fontWeight: 400, marginLeft: 12 }}>
                THE END OF TIME
              </span>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
              一件可交互的 Three.js 3D 作品 · 拖拽旋转视角 / 滚轮拨动时间 / 点击掀起涟漪
            </div>
          </div>
          <span
            className="eot-banner-cta"
            style={{
              flex: "0 0 auto",
              padding: "10px 18px",
              borderRadius: 999,
              border: "1px solid rgba(232,196,138,.45)",
              color: "#f0dcb8",
              fontSize: 12,
              letterSpacing: ".16em",
              whiteSpace: "nowrap",
            }}
          >
            进入体验 →
          </span>
        </Link>

        {/* 吸顶：搜索栏 + 分类标签，滚动时常驻顶部 */}
        <div className="nav-sticky">
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
        </div>

        {/* 统计 + 视图切换 */}
        <div className="view-bar">
          <div className="stats-bar">共 {filteredBookmarks.length} 个网站</div>
          {webglOK && (
            <div className="view-switch" role="group" aria-label="切换视图">
              <button
                type="button"
                className={`view-btn ${viewMode === "cards" ? "active" : ""}`}
                aria-pressed={viewMode === "cards"}
                onClick={() => setViewMode("cards")}
              >
                卡片
              </button>
              <button
                type="button"
                className={`view-btn ${viewMode === "map" ? "active" : ""}`}
                aria-pressed={viewMode === "map"}
                onClick={() => setViewMode("map")}
              >
                星图
              </button>
            </div>
          )}
        </div>

        {viewMode === "map" && webglOK ? (
          <>
            <div className="starmap-intro">
              拖拽旋转星图 · 滚轮缩放 · 悬停查看站点 · 点击星点直达 · 点星座名切换分类
            </div>
            <StarMap
              categories={categories}
              bookmarks={bookmarks}
              searchQuery={searchQuery}
              activeCategory={activeCategory}
              onCategory={setActiveCategory}
            />
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* 回到顶部 */}
      {showTop && (
        <button
          type="button"
          className="back-top"
          onClick={scrollToTop}
          aria-label="回到顶部"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5" />
            <path d="M5 12l7-7 7 7" />
          </svg>
        </button>
      )}

      {/* 页脚 */}
      <footer className="footer">
        星轨 · 日常在用的优质网站，都在这里 · 粤ICP备2026050662号-1
      </footer>
    </>
  );
}

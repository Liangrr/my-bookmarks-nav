"use client";

import { useState, useMemo } from "react";
import { BookmarkCard } from "@/components/bookmark-card";

const categories = [
  { id: "all", name: "全部" },
  { id: "video", name: "影视娱乐" },
  { id: "dev", name: "开发工具" },
  { id: "design", name: "设计灵感" },
  { id: "tool", name: "实用工具" },
  { id: "other", name: "其他" },
];

const bookmarks = [
  // 影视娱乐
  { title: "Netflix", url: "netflix.com", desc: "全球流媒体巨头，海量电影剧集，4K 画质，原创内容质量极高", category: "video", icon: "N", size: "large" as const },
  { title: "哔哩哔哩", url: "bilibili.com", desc: "国内最大年轻人文化社区，番剧、纪录片、知识区内容丰富", category: "video", icon: "B", size: "wide" as const },
  { title: "YouTube", url: "youtube.com", desc: "全球最大视频平台", category: "video", icon: "Y" },
  { title: "豆瓣电影", url: "movie.douban.com", desc: "电影评分与影评参考", category: "video", icon: "D" },

  // 开发工具
  { title: "GitHub", url: "github.com", desc: "全球最大代码托管平台，开源项目聚集地，Trending 每天都有新宝藏", category: "dev", icon: "G", size: "large" as const },
  { title: "GitHub Trending", url: "github.com/trending", desc: "每日/每周热门开源项目榜单，发现新工具新框架的最佳入口", category: "dev", icon: "T", size: "wide" as const },
  { title: "Stack Overflow", url: "stackoverflow.com", desc: "程序员问答社区，技术问题解答", category: "dev", icon: "S" },
  { title: "V2EX", url: "v2ex.com", desc: "创意工作者社区，程序员日常交流", category: "dev", icon: "V" },

  // 设计灵感
  { title: "Dribbble", url: "dribbble.com", desc: "全球设计师作品展示社区，UI/UX、插画、品牌设计灵感宝库", category: "design", icon: "Dr", size: "tall" as const },
  { title: "Behance", url: "behance.net", desc: "Adobe 旗下作品集平台，专业设计作品展示", category: "design", icon: "Be" },
  { title: "Figma", url: "figma.com", desc: "在线协作设计工具，组件库系统完善", category: "design", icon: "Fi" },
  { title: "Mobbin", url: "mobbin.com", desc: "移动端 UI 模式库，千万级截图参考", category: "design", icon: "M" },

  // 实用工具
  { title: "Notion", url: "notion.so", desc: "全能笔记与知识库工具，文档、数据库、项目管理一站搞定", category: "tool", icon: "Nt", size: "wide" as const },
  { title: "TinyPNG", url: "tinypng.com", desc: "图片压缩工具，PNG/JPG 智能压缩", category: "tool", icon: "TP" },
  { title: "Canva", url: "canva.com", desc: "在线平面设计，模板丰富易上手", category: "tool", icon: "Ca" },

  // 其他
  { title: "少数派", url: "sspai.com", desc: "高品质数字消费指南与效率工具分享，发现好用的 App 和工作流", category: "other", icon: "少", size: "wide" as const },
  { title: "知乎", url: "zhihu.com", desc: "中文问答社区，知识分享", category: "other", icon: "知" },
  { title: "微博", url: "weibo.com", desc: "社交媒体热点资讯", category: "other", icon: "微" },
];

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

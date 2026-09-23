"use client";

import { useState, useMemo } from "react";
import { BookmarkCard } from "@/components/bookmark-card";

// 临时数据，后面改成从数据库读取
const categories = [
  { id: 0, name: "全部", slug: "all", color: "#8b5cf6" },
  { id: 1, name: "影视娱乐", slug: "entertainment", color: "#ec4899" },
  { id: 2, name: "开发工具", slug: "development", color: "#3b82f6" },
  { id: 3, name: "设计灵感", slug: "design", color: "#8b5cf6" },
  { id: 4, name: "实用工具", slug: "tools", color: "#10b981" },
  { id: 5, name: "其他", slug: "other", color: "#f59e0b" },
];

const bookmarks = [
  // 影视娱乐
  { title: "Netflix", url: "netflix.com", description: "全球流媒体巨头，海量电影剧集，4K 画质，原创内容质量极高", category: "entertainment", icon: "N", size: "large" as const },
  { title: "哔哩哔哩", url: "bilibili.com", description: "国内最大年轻人文化社区，番剧、纪录片、知识区内容丰富", category: "entertainment", icon: "B", size: "wide" as const },
  { title: "YouTube", url: "youtube.com", description: "全球最大视频平台", category: "entertainment", icon: "Y" },
  { title: "豆瓣电影", url: "movie.douban.com", description: "电影评分与影评参考", category: "entertainment", icon: "D" },

  // 开发工具
  { title: "GitHub", url: "github.com", description: "全球最大代码托管平台，开源项目聚集地，Trending 每天都有新宝藏", category: "development", icon: "G", size: "large" as const },
  { title: "GitHub Trending", url: "github.com/trending", description: "每日/每周热门开源项目榜单，发现新工具新框架的最佳入口", category: "development", icon: "T", size: "wide" as const },
  { title: "Stack Overflow", url: "stackoverflow.com", description: "程序员问答社区，技术问题解答", category: "development", icon: "S" },
  { title: "V2EX", url: "v2ex.com", description: "创意工作者社区，程序员日常交流", category: "development", icon: "V" },

  // 设计灵感
  { title: "Dribbble", url: "dribbble.com", description: "全球设计师作品展示社区，UI/UX、插画、品牌设计灵感宝库", category: "design", icon: "Dr", size: "tall" as const },
  { title: "Behance", url: "behance.net", description: "Adobe 旗下作品集平台，专业设计作品展示", category: "design", icon: "Be" },
  { title: "Figma", url: "figma.com", description: "在线协作设计工具，组件库系统完善", category: "design", icon: "Fi" },
  { title: "Mobbin", url: "mobbin.com", description: "移动端 UI 模式库，千万级截图参考", category: "design", icon: "M" },

  // 实用工具
  { title: "Notion", url: "notion.so", description: "全能笔记与知识库工具，文档、数据库、项目管理一站搞定", category: "tools", icon: "Nt", size: "wide" as const },
  { title: "TinyPNG", url: "tinypng.com", description: "图片压缩工具，PNG/JPG 智能压缩", category: "tools", icon: "TP" },
  { title: "Canva", url: "canva.com", description: "在线平面设计，模板丰富易上手", category: "tools", icon: "Ca" },

  // 其他
  { title: "少数派", url: "sspai.com", description: "高品质数字消费指南与效率工具分享，发现好用的 App 和工作流", category: "other", icon: "少", size: "wide" as const },
  { title: "知乎", url: "zhihu.com", description: "中文问答社区，知识分享", category: "other", icon: "知" },
  { title: "微博", url: "weibo.com", description: "社交媒体热点资讯", category: "other", icon: "微" },
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
        bookmark.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bookmark.url.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, activeCategory]);

  const getCategoryColor = (slug: string) => {
    return categories.find((c) => c.slug === slug)?.color || "#8b5cf6";
  };

  const getCategoryName = (slug: string) => {
    return categories.find((c) => c.slug === slug)?.name || slug;
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 relative z-10">
      {/* Hero 区域 */}
      <div className="text-center mb-8 pt-5">
        <h1
          className="text-4xl md:text-[42px] font-extrabold mb-3 tracking-tight"
          style={{
            background: "linear-gradient(135deg, var(--foreground) 0%, var(--accent-light) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Asuria精选网站收藏
        </h1>
        <p
          className="text-base md:text-base max-w-xl mx-auto"
          style={{ color: "var(--text-secondary)" }}
        >
          影视、开发、设计、实用工具 —— 日常在用的优质网站，都在这里
        </p>
      </div>

      {/* 搜索框 */}
      <div className="max-w-xl mx-auto mb-6 relative">
        <input
          type="text"
          placeholder="搜索网站名称或关键词..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-6 py-3.5 pl-12 rounded-2xl outline-none text-base transition-all"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--accent)";
            e.currentTarget.style.boxShadow = "0 0 0 4px var(--accent-glow)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        <span
          className="absolute left-4 top-1/2 -translate-y-1/2 text-base"
          style={{ color: "var(--text-tertiary)" }}
        >
          🔍
        </span>
      </div>

      {/* 分类筛选 */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {categories.map((category) => (
          <button
            key={category.slug}
            onClick={() => setActiveCategory(category.slug)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
            style={{
              background:
                activeCategory === category.slug
                  ? category.color
                  : "var(--bg-card)",
              color: activeCategory === category.slug ? "white" : "var(--text-secondary)",
              border: `1px solid ${
                activeCategory === category.slug
                  ? category.color
                  : "var(--border)"
              }`,
              boxShadow: activeCategory === category.slug
                ? "0 4px 16px var(--accent-glow)"
                : "none",
            }}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* 结果计数 */}
      <p
        className="text-center text-sm mb-6"
        style={{ color: "var(--text-tertiary)" }}
      >
        共 {filteredBookmarks.length} 个网站
      </p>

      {/* 书签网格 - Bento Grid */}
      <div
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        style={{ gridAutoRows: "120px" }}
      >
        {filteredBookmarks.map((bookmark, index) => (
          <BookmarkCard
            key={`${bookmark.title}-${index}`}
            title={bookmark.title}
            url={bookmark.url}
            description={bookmark.description}
            icon={bookmark.icon}
            categoryColor={getCategoryColor(bookmark.category)}
            categoryName={getCategoryName(bookmark.category)}
            size={bookmark.size || "normal"}
          />
        ))}
      </div>

      {/* 空状态 */}
      {filteredBookmarks.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-4 opacity-50">🔍</p>
          <p style={{ color: "var(--text-secondary)" }}>没有找到匹配的网站</p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { BookmarkCard } from "@/components/bookmark-card";

const categories = [
  { id: "all", name: "全部", slug: "all" },
  { id: "video", name: "影视娱乐", slug: "video", color: "#ec4899" },
  { id: "dev", name: "开发工具", slug: "dev", color: "#3b82f6" },
  { id: "design", name: "设计灵感", slug: "design", color: "#8b5cf6" },
  { id: "tool", name: "实用工具", slug: "tool", color: "#10b981" },
  { id: "other", name: "其他", slug: "other", color: "#f59e0b" },
];

const bookmarks = [
  // 影视娱乐
  { title: "Netflix", url: "netflix.com", description: "全球流媒体巨头，海量电影剧集，4K 画质，原创内容质量极高", category: "video", icon: "N", size: "large" as const },
  { title: "哔哩哔哩", url: "bilibili.com", description: "国内最大年轻人文化社区，番剧、纪录片、知识区内容丰富", category: "video", icon: "B", size: "wide" as const },
  { title: "YouTube", url: "youtube.com", description: "全球最大视频平台", category: "video", icon: "Y" },
  { title: "豆瓣电影", url: "movie.douban.com", description: "电影评分与影评参考", category: "video", icon: "D" },

  // 开发工具
  { title: "GitHub", url: "github.com", description: "全球最大代码托管平台，开源项目聚集地，Trending 每天都有新宝藏", category: "dev", icon: "G", size: "large" as const },
  { title: "GitHub Trending", url: "github.com/trending", description: "每日/每周热门开源项目榜单，发现新工具新框架的最佳入口", category: "dev", icon: "T", size: "wide" as const },
  { title: "Stack Overflow", url: "stackoverflow.com", description: "程序员问答社区，技术问题解答", category: "dev", icon: "S" },
  { title: "V2EX", url: "v2ex.com", description: "创意工作者社区，程序员日常交流", category: "dev", icon: "V" },

  // 设计灵感
  { title: "Dribbble", url: "dribbble.com", description: "全球设计师作品展示社区，UI/UX、插画、品牌设计灵感宝库", category: "design", icon: "Dr", size: "tall" as const },
  { title: "Behance", url: "behance.net", description: "Adobe 旗下作品集平台，专业设计作品展示", category: "design", icon: "Be" },
  { title: "Figma", url: "figma.com", description: "在线协作设计工具，组件库系统完善", category: "design", icon: "Fi" },
  { title: "Mobbin", url: "mobbin.com", description: "移动端 UI 模式库，千万级截图参考", category: "design", icon: "M" },

  // 实用工具
  { title: "Notion", url: "notion.so", description: "全能笔记与知识库工具，文档、数据库、项目管理一站搞定", category: "tool", icon: "Nt", size: "wide" as const },
  { title: "TinyPNG", url: "tinypng.com", description: "图片压缩工具，PNG/JPG 智能压缩", category: "tool", icon: "TP" },
  { title: "Canva", url: "canva.com", description: "在线平面设计，模板丰富易上手", category: "tool", icon: "Ca" },

  // 其他
  { title: "少数派", url: "sspai.com", description: "高品质数字消费指南与效率工具分享", category: "other", icon: "少", size: "wide" as const },
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
    <div
      className="max-w-[1280px] mx-auto relative z-10"
      style={{ padding: "40px 32px 80px" }}
    >
      {/* Hero 区 */}
      <div className="text-center mb-8" style={{ paddingTop: "20px" }}>
        <h1
          className="font-extrabold mb-3 tracking-tight"
          style={{
            fontSize: "42px",
            background:
              "linear-gradient(135deg, var(--text-primary) 0%, var(--accent-light) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Asuria精选网站收藏
        </h1>
        <p
          className="mx-auto"
          style={{
            color: "var(--text-secondary)",
            fontSize: "16px",
            maxWidth: "500px",
          }}
        >
          影视、开发、设计、实用工具 —— 日常在用的优质网站，都在这里
        </p>
      </div>

      {/* 搜索栏 */}
      <div
        className="relative mx-auto mb-8"
        style={{ maxWidth: "640px" }}
      >
        <span
          className="absolute left-5 top-1/2 -translate-y-1/2"
          style={{ color: "var(--text-tertiary)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="搜索网站名称或关键词..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full outline-none font-inherit"
          style={{
            padding: "15px 24px 15px 52px",
            borderRadius: "24px",
            border: "1px solid var(--border)",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            fontSize: "15px",
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
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
      </div>

      {/* 分类标签 */}
      <div
        className="flex flex-wrap justify-center gap-2 mb-9"
      >
        {categories.map((category) => {
          const isActive = activeCategory === category.slug;
          return (
            <button
              key={category.slug}
              onClick={() => setActiveCategory(category.slug)}
              className="whitespace-nowrap font-inherit cursor-pointer transition-all"
              style={{
                padding: "8px 18px",
                borderRadius: "100px",
                border: "1px solid var(--border)",
                background: isActive ? "var(--accent)" : "var(--bg-card)",
                color: isActive ? "white" : "var(--text-secondary)",
                fontSize: "14px",
                boxShadow: isActive ? "0 4px 16px var(--accent-glow)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "var(--bg-card-hover)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "var(--bg-card)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }
              }}
            >
              {category.name}
            </button>
          );
        })}
      </div>

      {/* 统计 */}
      <p
        className="text-center mb-6"
        style={{
          fontSize: "13px",
          color: "var(--text-tertiary)",
        }}
      >
        共 {filteredBookmarks.length} 个网站
      </p>

      {/* Bento Grid */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        style={{ gridAutoRows: "130px" }}
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
        <div className="text-center py-12">
          <div className="text-4xl mb-4 opacity-50">🔍</div>
          <p className="text-base font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
            没有找到匹配的网站
          </p>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            试试其他关键词吧
          </p>
        </div>
      )}

      {/* 页脚 */}
      <footer
        className="text-center mt-15 pt-8"
        style={{
          borderTop: "1px solid var(--border)",
          color: "var(--text-tertiary)",
          fontSize: "13px",
        }}
      >
        我的收藏夹 · 个人网站导航 · Powered by Vercel
      </footer>
    </div>
  );
}

import type { MetadataRoute } from "next";

// 站点基础地址：环境变量优先，兜底生产域名；去掉可能残留的末尾 "/"
const BASE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://bookmark-nav-site.vercel.app"
).replace(/\/+$/, "");

// 只收录真实可访问的页面路由：
// - 不含 /calendar（仅 redirect 到 /）
// - 不含 /admin（后台，robots 已禁止抓取）
// - 不含 /profile（个人中心，robots 已禁止抓取）
// - 不含 /api/* 与 /icon.png、/apple-icon.png 等图片元数据路由
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    // 首页（星历日历）
    { url: `${BASE_URL}/`, lastModified, changeFrequency: "daily", priority: 1 },

    // 主要工具页
    { url: `${BASE_URL}/nav`, lastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/market`, lastModified, changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE_URL}/agents`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/meals`, lastModified, changeFrequency: "weekly", priority: 0.8 },

    // 学习路线 / 长内容手册
    { url: `${BASE_URL}/learn-agents`, lastModified, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/ai-ideas`, lastModified, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/learn-dev`, lastModified, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/flutter`, lastModified, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/living`, lastModified, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/tcm`, lastModified, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/ailments`, lastModified, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/emergency`, lastModified, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/survival`, lastModified, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/diy`, lastModified, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/fruits`, lastModified, changeFrequency: "weekly", priority: 0.6 },

    // 其它
    { url: `${BASE_URL}/indie-dev`, lastModified, changeFrequency: "weekly", priority: 0.5 },
  ];
}

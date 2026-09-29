"use client";

import { useState } from "react";

interface BookmarkCardProps {
  title: string;
  url: string;
  desc?: string;
  icon?: string;
  category: string;
  categoryName: string;
  size?: "normal" | "large" | "wide" | "tall";
  id?: number;
  clickCount?: number;
  onOpen?: (id: number) => void;
}

// 提取主域名
const getDomain = (url: string) => {
  try {
    const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url;
  }
};

// 纯 IP 域名（如内网地址），favicon 服务无法解析，用内联 SVG 地球图标兜底（data URI，全局可用、永不失败）
const isIpAddress = (host: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
const IP_FALLBACK_ICON = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="9"></circle>
  <path d="M3.5 12h17"></path>
  <path d="M12 3.5c3.2 2.6 3.2 14.4 0 17"></path>
  <path d="M12 3.5c-3.2 2.6-3.2 14.4 0 17"></path>
</svg>`)}`;

export function BookmarkCard({
  title,
  url,
  icon,
  category,
  categoryName,
  size = "normal",
  id,
  clickCount,
  onOpen,
}: BookmarkCardProps) {
  const sizeClass = size !== "normal" ? `card-${size}` : "";
  const fullUrl = url.startsWith("http") ? url : `https://${url}`;
  const domain = getDomain(fullUrl);

  // 图标三级兜底：数据库 icon（真实 favicon 地址）→ favicon.im 服务 → 文字图标
  // 纯 IP 域名直接用内联 SVG 地球图标
  const [srcIdx, setSrcIdx] = useState(0);
  const sources = isIpAddress(domain)
    ? [IP_FALLBACK_ICON]
    : [icon, `https://favicon.im/${domain}?larger=true`].filter(Boolean) as string[];
  const faviconUrl = sources[srcIdx] ?? IP_FALLBACK_ICON;
  const fallbackIcon = icon && icon.startsWith("http") ? "" : icon || title.charAt(0).toUpperCase();
  const iconFailed = srcIdx >= sources.length;

  const handleClick = () => {
    if (id && onOpen) onOpen(id);
  };

  return (
    <a
      href={fullUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`bookmark-card cat-${category} ${sizeClass}`}
      onClick={handleClick}
    >
      <div className="card-header">
        <div className="card-icon">
          {!iconFailed ? (
            // 外部 favicon 动态域名，无法走 next/image 优化，保留原生 img 并用 onError 逐级回退
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={faviconUrl}
              src={faviconUrl}
              alt={title}
              width="24"
              height="24"
              style={{ borderRadius: "4px" }}
              onError={() => setSrcIdx((i) => i + 1)}
            />
          ) : (
            fallbackIcon
          )}
        </div>
        <div className="card-content">
          <div className="card-title" title={title}>{title}</div>
          <div className="card-url">{domain}</div>
        </div>
        {typeof clickCount === "number" && clickCount > 0 && (
          <span className="card-count" title="点击次数">
            🔥{clickCount}
          </span>
        )}
      </div>
      <span className="card-tag">{categoryName}</span>
    </a>
  );
}

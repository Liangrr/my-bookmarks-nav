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

// 纯 IP 域名（如内网地址），favicon 服务无法解析，直接走文字图标
const isIpAddress = (host: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(host);

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

  // 用多个 favicon 源，按顺序尝试；纯 IP 域名不发请求，直接用文字图标
  const [imgError, setImgError] = useState(isIpAddress(domain));
  const faviconUrl = isIpAddress(domain)
    ? ""
    : `https://favicon.im/${domain}?larger=true`;
  const fallbackIcon = icon || title.charAt(0).toUpperCase();

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
          {!imgError ? (
            // 外部 favicon 动态域名，无法走 next/image 优化，保留原生 img 并用 onError 回退到文字图标
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={faviconUrl}
              alt={title}
              width="24"
              height="24"
              style={{ borderRadius: "4px" }}
              onError={() => setImgError(true)}
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

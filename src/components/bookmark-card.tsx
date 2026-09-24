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

export function BookmarkCard({
  title,
  url,
  desc,
  icon,
  category,
  categoryName,
  size = "normal",
}: BookmarkCardProps) {
  const sizeClass = size !== "normal" ? `card-${size}` : "";
  const fullUrl = url.startsWith("http") ? url : `https://${url}`;
  const domain = getDomain(fullUrl);
  
  // 用多个 favicon 源，按顺序尝试
  const [imgError, setImgError] = useState(false);
  const faviconUrl = `https://favicon.im/${domain}?larger=true`;
  const fallbackIcon = icon || title.charAt(0).toUpperCase();

  return (
    <a
      href={fullUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`bookmark-card cat-${category} ${sizeClass}`}
    >
      <div className="card-header">
        <div className="card-icon">
          {!imgError ? (
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
      </div>
      <span className="card-tag">{categoryName}</span>
    </a>
  );
}

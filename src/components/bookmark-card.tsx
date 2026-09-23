"use client";

interface BookmarkCardProps {
  title: string;
  url: string;
  desc?: string;
  icon?: string;
  category: string;
  categoryName: string;
  size?: "normal" | "large" | "wide" | "tall";
}

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

  return (
    <a
      href={fullUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`bookmark-card cat-${category} ${sizeClass}`}
    >
      <span className="card-tag">{categoryName}</span>
      <div className="card-header">
        <div className="card-icon">{icon || title.charAt(0)}</div>
        <div>
          <div className="card-title">{title}</div>
          <div className="card-url">{url}</div>
        </div>
      </div>
      {desc && <div className="card-desc">{desc}</div>}
    </a>
  );
}

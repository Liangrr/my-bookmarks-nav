"use client";

interface BookmarkCardProps {
  title: string;
  url: string;
  description?: string;
  icon?: string;
  categoryColor?: string;
  categoryName?: string;
  size?: "normal" | "large" | "wide" | "tall";
}

export function BookmarkCard({
  title,
  url,
  description,
  icon,
  categoryColor,
  categoryName,
  size = "normal",
}: BookmarkCardProps) {
  const sizeClass = {
    normal: "",
    large: "md:col-span-2 md:row-span-2",
    wide: "md:col-span-2",
    tall: "md:row-span-2",
  }[size];

  const fullUrl = url.startsWith("http") ? url : `https://${url}`;

  return (
    <a
      href={fullUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 overflow-hidden ${sizeClass}`}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        gridRowEnd: "span 1",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-card-hover)";
        e.currentTarget.style.borderColor = "var(--border-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--bg-card)";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      {/* 顶部彩色条 */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: categoryColor || "var(--accent)" }}
      />

      <div className="flex flex-col h-full justify-between">
        {/* 头部：图标 + 标题 */}
        <div>
          <div className="flex items-start gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold flex-shrink-0"
              style={{
                background: categoryColor
                  ? `${categoryColor}20`
                  : "var(--accent-glow)",
                color: categoryColor || "var(--accent-light)",
              }}
            >
              {icon || title.charAt(0)}
            </div>
            {categoryName && (
              <span
                className="absolute top-4 right-4 text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: "var(--bg-glass)",
                  color: "var(--text-tertiary)",
                }}
              >
                {categoryName}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-base truncate">{title}</h3>
          <p
            className="text-xs mt-0.5 truncate"
            style={{ color: "var(--text-tertiary)" }}
          >
            {url}
          </p>
        </div>

        {/* 描述 */}
        {description && (
          <p
            className="text-xs line-clamp-2 mt-3"
            style={{ color: "var(--text-secondary)" }}
          >
            {description}
          </p>
        )}
      </div>
    </a>
  );
}

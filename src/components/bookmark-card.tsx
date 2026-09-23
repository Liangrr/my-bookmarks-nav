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
    large: "sm:col-span-2 sm:row-span-2",
    wide: "sm:col-span-2",
    tall: "sm:row-span-2",
  }[size];

  const fullUrl = url.startsWith("http") ? url : `https://${url}`;

  return (
    <a
      href={fullUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-0.5 ${sizeClass}`}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        gridRowEnd: "span 1",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-card-hover)";
        e.currentTarget.style.borderColor = "var(--border-hover)";
        e.currentTarget.style.boxShadow = "var(--shadow-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--bg-card)";
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* 顶部彩色条 */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: categoryColor || "var(--accent)" }}
      />

      {/* 分类标签 */}
      {categoryName && (
        <span
          className="absolute top-4 right-4 text-[11px] px-2.5 py-0.5 rounded-full"
          style={{
            background: "var(--bg-glass)",
            color: "var(--text-tertiary)",
          }}
        >
          {categoryName}
        </span>
      )}

      <div className="flex items-start gap-3">
        <div
          className="w-[42px] h-[42px] rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0"
          style={{
            background: categoryColor
              ? `linear-gradient(135deg, ${categoryColor}33, ${categoryColor}14)`
              : "var(--bg-glass)",
            color: categoryColor || "var(--text-primary)",
          }}
        >
          {icon || title.charAt(0)}
        </div>
        <div>
          <div className="text-[15px] font-semibold mb-0.5">{title}</div>
          <div
            className="text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            {url}
          </div>
        </div>
      </div>

      {description && (
        <div
          className="text-[13px] leading-relaxed mt-2.5 line-clamp-3"
          style={{ color: "var(--text-secondary)" }}
        >
          {description}
        </div>
      )}
    </a>
  );
}

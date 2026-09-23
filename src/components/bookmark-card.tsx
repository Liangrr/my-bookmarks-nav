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
      className={`group relative rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 ${sizeClass}`}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
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
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0"
          style={{
            background: categoryColor
              ? `${categoryColor}20`
              : "var(--accent-glow)",
            color: categoryColor || "var(--accent-light)",
          }}
        >
          {icon || title.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-semibold text-lg truncate">{title}</h3>
            {categoryName && (
              <span
                className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                style={{
                  background: categoryColor ? `${categoryColor}20` : "var(--bg-card)",
                  color: categoryColor || "var(--text-secondary)",
                }}
              >
                {categoryName}
              </span>
            )}
          </div>
          <p
            className="text-sm line-clamp-2"
            style={{ color: "var(--text-secondary)" }}
          >
            {description || url}
          </p>
          <p
            className="text-xs mt-2 truncate"
            style={{ color: "var(--text-tertiary)" }}
          >
            {url}
          </p>
        </div>
      </div>
    </a>
  );
}

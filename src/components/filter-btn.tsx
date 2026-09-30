"use client";

interface FilterBtnProps {
  active: boolean;
  label: string;
  onClick: () => void;
}

/**
 * 手册筛选按钮（四个手册页共用）
 * 选中态：accent 边框 + 半透明 accent 底 + 高对比文字 + ✓ 确认标记 + 外发光
 * 未选中态：卡片底 + 边框，hover 时边框/文字向主题色过渡，给出可点击反馈
 */
export default function FilterBtn({ active, label, onClick }: FilterBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`filter-btn${active ? " filter-btn--active" : ""}`}
    >
      {active && (
        <span className="filter-btn__check" aria-hidden="true">
          ✓
        </span>
      )}
      {label}
    </button>
  );
}

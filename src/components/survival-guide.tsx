"use client";
import { useEffect, useMemo, useState } from "react";
import survivalData from "@/data/survival-guide.json";
import FilterBtn from "@/components/filter-btn";

interface SurvivalSource {
  text: string;
  url: string;
}

interface SurvivalItem {
  id: string;
  num: number;
  level: string;
  priority: string;
  title: string;
  plain: string;
  tags: string[];
  gear: string;
  effect: string;
  note: string;
  sources: SurvivalSource[];
}

interface SurvivalSection {
  id: string;
  num: number;
  title: string;
  count: string;
  intro: string;
  items: SurvivalItem[];
}

interface SurvivalData {
  sections: SurvivalSection[];
}

const DATA = (survivalData as SurvivalData).sections;

const LEVELS = ["入门", "进阶", "专家"] as const;
const PRIORITIES = ["必备", "重要", "选学"] as const;

/** 难度配色 */
const LEVEL_COLOR: Record<string, { fg: string; bg: string }> = {
  入门: { fg: "#18794e", bg: "rgba(16,185,129,.13)" },
  进阶: { fg: "#915930", bg: "rgba(234,179,8,.15)" },
  专家: { fg: "#b8272c", bg: "rgba(244,63,94,.12)" },
};

/** 优先级配色 */
const PRIORITY_COLOR: Record<string, { fg: string; bg: string }> = {
  必备: { fg: "#18794e", bg: "rgba(16,185,129,.13)" },
  重要: { fg: "#3451b2", bg: "rgba(100,108,255,.12)" },
  选学: { fg: "#565a5f", bg: "rgba(142,150,170,.15)" },
};

const TOTAL_ITEMS = DATA.reduce((n, s) => n + s.items.length, 0);
const LEVEL_COUNT = DATA.reduce<Record<string, number>>((m, s) => {
  for (const it of s.items) m[it.level] = (m[it.level] ?? 0) + 1;
  return m;
}, {});

export function SurvivalGuide() {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<string>("全部");
  const [priority, setPriority] = useState<string>("全部");
  const [showTop, setShowTop] = useState(false);

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return DATA.map((sec) => {
      const items = sec.items.filter((it) => {
        if (level !== "全部" && it.level !== level) return false;
        if (priority !== "全部" && it.priority !== priority) return false;
        if (!q) return true;
        const hay = [
          it.title,
          it.plain,
          it.effect,
          it.gear,
          it.note,
          it.tags.join(" "),
          sec.title,
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
      return { sec, items };
    }).filter(({ items }) => items.length > 0);
  }, [q, level, priority]);

  const matchedCount = filtered.reduce((n, f) => n + f.items.length, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 头部 */}
      <header style={{ marginTop: 4 }}>
        <h1
          style={{
            fontSize: 30,
            fontWeight: 800,
            margin: 0,
            background: "linear-gradient(135deg, #16a34a, #d97706)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          野外求生手册
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary)",
            margin: "8px 0 0",
            lineHeight: 1.7,
          }}
        >
          从心态、找水、生火、搭棚、辨向、天气、觅食、急救到求救，整理{" "}
          {DATA.length} 章 {TOTAL_ITEMS} 条野外求生硬知识：每条写清难度、优先级、
          需要什么装备、能解决什么问题、哪里容易踩坑。参考美军 FM 3-05.70
          生存手册、美国红十字会急救指南与国内应急科普。
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 12,
          }}
        >
          {[
            `${DATA.length} 章`,
            `${TOTAL_ITEMS} 条知识`,
            ...LEVELS.map((l) => `${l} ${LEVEL_COUNT[l] ?? 0} 条`),
          ].map((t) => (
            <span
              key={t}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                color: "var(--text-secondary)",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </header>

      {/* 工具条：搜索 + 筛选 */}
      <div
        style={{
          position: "sticky",
          top: 76,
          zIndex: 10,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          background: "var(--bg-glass)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索知识点，如：水、火、迷路、蛇、失温、雷暴…"
          aria-label="搜索知识点"
          style={{
            flex: 1,
            minWidth: 180,
            height: 34,
            padding: "0 12px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            font: "inherit",
            fontSize: 13,
            outline: "none",
          }}
        />
        <div
          style={{
            display: "flex",
            gap: 4,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              marginRight: 2,
            }}
          >
            难度
          </span>
          {["全部", ...LEVELS].map((l) => (
            <FilterBtn key={`l-${l}`} active={level === l} label={l} onClick={() => setLevel(l)} />
          ))}
          <span
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              margin: "0 2px 0 8px",
            }}
          >
            优先级
          </span>
          {["全部", ...PRIORITIES].map((p) => (
            <FilterBtn key={`p-${p}`} active={priority === p} label={p} onClick={() => setPriority(p)} />
          ))}
        </div>
        <span
          style={{
            fontSize: 12,
            color: "var(--text-tertiary)",
            whiteSpace: "nowrap",
          }}
        >
          命中 {matchedCount} 条
        </span>
      </div>

      {/* 章节与卡片 */}
      {filtered.length === 0 ? (
        <div
          style={{
            padding: "48px 16px",
            textAlign: "center",
            color: "var(--text-tertiary)",
            fontSize: 14,
          }}
        >
          没有匹配的知识点，换个关键词或筛选条件试试。
        </div>
      ) : (
        filtered.map(({ sec, items }) => (
          <section
            key={sec.id}
            id={sec.id}
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div>
              <h2
                style={{
                  fontSize: 21,
                  fontWeight: 800,
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ color: "var(--accent)" }}>{sec.num}.</span>
                {sec.title}
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--text-tertiary)",
                    border: "1px solid var(--border)",
                    borderRadius: 999,
                    padding: "2px 8px",
                    background: "var(--bg-card)",
                  }}
                >
                  命中 {items.length}/{sec.items.length}
                </span>
              </h2>
              {sec.intro && (
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    lineHeight: 1.7,
                    margin: "8px 0 0",
                  }}
                >
                  {sec.intro}
                </p>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {items.map((it) => (
                <SurvivalCard key={it.id} item={it} />
              ))}
            </div>
          </section>
        ))
      )}

      {/* 回到顶部 */}
      {showTop && (
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            setShowTop(false);
          }}
          aria-label="回到顶部"
          title="回到顶部"
          style={{
            position: "fixed",
            right: 20,
            bottom: 24,
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "1px solid var(--border)",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            cursor: "pointer",
            boxShadow: "var(--shadow-card)",
            zIndex: 20,
          }}
        >
          ↑
        </button>
      )}
      <ScrollWatcher onShow={(v) => setShowTop(v)} />
    </div>
  );
}



function SurvivalCard({ item }: { item: SurvivalItem }) {
  const lv = LEVEL_COLOR[item.level] ?? LEVEL_COLOR.进阶;
  const pc = PRIORITY_COLOR[item.priority] ?? PRIORITY_COLOR.选学;
  return (
    <article
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "var(--transition)",
      }}
    >
      {/* 标题行 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--text-tertiary)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "2px 6px",
            minWidth: 26,
            textAlign: "center",
          }}
        >
          {item.num}
        </span>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, flex: 1, minWidth: 200 }}>
          {item.title}
        </h3>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: lv.fg,
            background: lv.bg,
            borderRadius: 6,
            padding: "2px 8px",
          }}
        >
          {item.level}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: pc.fg,
            background: pc.bg,
            borderRadius: 6,
            padding: "2px 8px",
          }}
        >
          {item.priority}
        </span>
      </div>

      {/* 标签 */}
      {item.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {item.tags.map((t) => (
            <span
              key={t}
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                border: "1px solid var(--border)",
                borderRadius: 999,
                padding: "2px 8px",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* 核心要点高亮块 */}
      {item.plain && (
        <div
          style={{
            borderLeft: "3px solid #16a34a",
            background: "var(--bg-secondary)",
            borderRadius: "0 var(--radius-md) var(--radius-md) 0",
            padding: "10px 12px",
            fontSize: 13,
            lineHeight: 1.7,
            color: "var(--text-primary)",
          }}
        >
          <span
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 700,
              color: "#16a34a",
              marginBottom: 4,
            }}
          >
            怎么做
          </span>
          {item.plain}
        </div>
      )}

      {/* 装备 / 作用 / 注意 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {item.gear && <FieldRow k="装备" v={item.gear} />}
        {item.effect && <FieldRow k="作用" v={item.effect} />}
        {item.note && <FieldRow k="注意" v={item.note} />}
      </div>

      {/* 参考来源 */}
      {item.sources.length > 0 && (
        <details>
          <summary
            style={{
              fontSize: 12,
              color: "var(--accent)",
              cursor: "pointer",
              fontWeight: 600,
              userSelect: "none",
            }}
          >
            参考（{item.sources.length} 条）
          </summary>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
            {item.sources.map((s, i) => (
              <li key={i} style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.6 }}>
                {s.text && <span>{s.text}：</span>}
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent)", wordBreak: "break-all" }}
                >
                  {s.url}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}

function FieldRow({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", gap: 10, fontSize: 13, lineHeight: 1.7 }}>
      <span
        style={{
          flexShrink: 0,
          width: 40,
          fontWeight: 700,
          color: "var(--text-tertiary)",
        }}
      >
        {k}
      </span>
      <span style={{ color: "var(--text-primary)" }}>{v}</span>
    </div>
  );
}

/** 滚动监听：超过一屏显示回到顶部按钮 */
function ScrollWatcher({ onShow }: { onShow: (v: boolean) => void }) {
  const [last, setLast] = useState(false);
  useEffect(() => {
    const cb = () => {
      const v = window.scrollY > window.innerHeight;
      if (v !== last) {
        setLast(v);
        onShow(v);
      }
    };
    window.addEventListener("scroll", cb, { passive: true });
    cb();
    return () => window.removeEventListener("scroll", cb);
  }, [last, onShow]);
  return null;
}

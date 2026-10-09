"use client";
import { useEffect, useMemo, useState } from "react";
import diyData from "@/data/diy-guide.json";
import FilterBtn from "@/components/filter-btn";

interface Material {
  name: string;
  amount: string;
  ratio: string;
  note: string;
}

interface DiyItem {
  id: string;
  num: number;
  title: string;
  icon: string;
  difficulty: string;
  duration: string;
  time: string;
  yield: string;
  tags: string[];
  materials: Material[];
  steps: string[];
  note: string;
  save?: string;
}

interface DiySection {
  id: string;
  num: number;
  title: string;
  count: string;
  intro: string;
  items: DiyItem[];
}

interface DiyData {
  sections: DiySection[];
}

const DATA = (diyData as DiyData).sections;

const DIFFICULTIES = ["简单", "中等", "进阶"] as const;
const DURATIONS = ["快速", "数小时", "需等待"] as const;

/** 难度配色 */
const DIFF_COLOR: Record<string, { fg: string; bg: string }> = {
  简单: { fg: "#18794e", bg: "rgba(16,185,129,.13)" },
  中等: { fg: "#915930", bg: "rgba(234,179,8,.15)" },
  进阶: { fg: "#b8272c", bg: "rgba(244,63,94,.12)" },
};

/** 耗时配色 */
const DURATION_COLOR: Record<string, { fg: string; bg: string }> = {
  快速: { fg: "#18794e", bg: "rgba(16,185,129,.13)" },
  数小时: { fg: "#3451b2", bg: "rgba(100,108,255,.12)" },
  需等待: { fg: "#7c3aed", bg: "rgba(139,92,246,.14)" },
};

const TOTAL_ITEMS = DATA.reduce((n, s) => n + s.items.length, 0);
const DIFF_COUNT = DATA.reduce<Record<string, number>>((m, s) => {
  for (const it of s.items) m[it.difficulty] = (m[it.difficulty] ?? 0) + 1;
  return m;
}, {});

export function DiyGuide() {
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<string>("全部");
  const [duration, setDuration] = useState<string>("全部");
  const [showTop, setShowTop] = useState(false);

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return DATA.map((sec) => {
      const items = sec.items.filter((it) => {
        if (difficulty !== "全部" && it.difficulty !== difficulty) return false;
        if (duration !== "全部" && it.duration !== duration) return false;
        if (!q) return true;
        const hay = [
          it.title,
          it.note,
          it.save ?? "",
          it.tags.join(" "),
          it.materials.map((m) => `${m.name} ${m.note}`).join(" "),
          sec.title,
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
      return { sec, items };
    }).filter(({ items }) => items.length > 0);
  }, [q, difficulty, duration]);

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
            background: "linear-gradient(135deg, #22d3ee, #a78bfa)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          DIY 手作工坊
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary)",
            margin: "8px 0 0",
            lineHeight: 1.7,
          }}
        >
          收录 {DATA.length} 类 {TOTAL_ITEMS} 种日常好物的自制方法：手工皂、护肤品、酸奶果酱、
          香薰蜡烛、驱蚊除湿等，每一样都写清材料、配比和一步步流程。多数配方几块钱就能动手，
          比市售安心又省钱，看懂了再上手。
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
            `${DATA.length} 类`,
            `${TOTAL_ITEMS} 种`,
            ...DIFFICULTIES.map((d) => `${d} ${DIFF_COUNT[d] ?? 0} 种`),
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
          placeholder="搜索，如：肥皂、酸奶、蜡、精油、驱蚊…"
          aria-label="搜索制作项目"
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
          <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginRight: 2 }}>
            难度
          </span>
          {["全部", ...DIFFICULTIES].map((d) => (
            <FilterBtn
              key={`d-${d}`}
              active={difficulty === d}
              label={d}
              onClick={() => setDifficulty(d)}
            />
          ))}
          <span style={{ fontSize: 11, color: "var(--text-tertiary)", margin: "0 2px 0 8px" }}>
            耗时
          </span>
          {["全部", ...DURATIONS].map((r) => (
            <FilterBtn
              key={`r-${r}`}
              active={duration === r}
              label={r}
              onClick={() => setDuration(r)}
            />
          ))}
        </div>
        <span
          style={{
            fontSize: 12,
            color: "var(--text-tertiary)",
            whiteSpace: "nowrap",
          }}
        >
          命中 {matchedCount} 种
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
          没有匹配的制作项目，换个关键词或筛选条件试试。
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
                <DiyCard key={it.id} item={it} />
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

function DiyCard({ item }: { item: DiyItem }) {
  const dc = DIFF_COLOR[item.difficulty] ?? DIFF_COLOR.中等;
  const tc = DURATION_COLOR[item.duration] ?? DURATION_COLOR.数小时;
  return (
    <article
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
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
        <span style={{ fontSize: 18 }} aria-hidden="true">
          {item.icon}
        </span>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, flex: 1, minWidth: 200 }}>
          {item.title}
        </h3>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: dc.fg,
            background: dc.bg,
            borderRadius: 6,
            padding: "2px 8px",
          }}
        >
          {item.difficulty}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: tc.fg,
            background: tc.bg,
            borderRadius: 6,
            padding: "2px 8px",
          }}
        >
          {item.duration}
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

      {/* 元信息 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <FieldRow k="耗时" v={item.time} />
        <FieldRow k="成品" v={item.yield} />
      </div>

      {/* 材料与配比 */}
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          background: "var(--bg-secondary)",
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--accent)",
            letterSpacing: 1,
          }}
        >
          材料与配比
        </span>
        {item.materials.map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                {m.name}
              </span>
              {m.ratio && (
                <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{m.ratio}</span>
              )}
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--accent)",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "1px 8px",
                  whiteSpace: "nowrap",
                }}
              >
                {m.amount}
              </span>
            </div>
            {m.note && (
              <span style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {m.note}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* 制作步骤 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--accent)",
            letterSpacing: 1,
          }}
        >
          制作步骤
        </span>
        <ol
          style={{
            margin: 0,
            paddingLeft: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {item.steps.map((s, i) => (
            <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span
                style={{
                  flexShrink: 0,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  color: "#0a0a0f",
                  fontSize: 11,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 1,
                }}
              >
                {i + 1}
              </span>
              <span style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-primary)" }}>
                {s}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* 注意事项 */}
      {item.note && (
        <div
          style={{
            borderLeft: "3px solid #f59e0b",
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
              color: "#f59e0b",
              marginBottom: 4,
            }}
          >
            ⚠ 注意
          </span>
          {item.note}
        </div>
      )}

      {/* 省钱对比 */}
      {item.save && (
        <div
          style={{
            borderLeft: "3px solid #10b981",
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
              color: "#10b981",
              marginBottom: 4,
            }}
          >
            💰 省钱
          </span>
          {item.save}
        </div>
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
"use client";
import { useEffect, useMemo, useState } from "react";
import livingData from "@/data/living-guide.json";
import FilterBtn from "@/components/filter-btn";

interface LivingSource {
  text: string;
  url: string;
}

interface LivingItem {
  id: string;
  num: number;
  grade: string;
  ratio: string;
  title: string;
  plain: string;
  tags: string[];
  cost: string;
  benefit: string;
  note: string;
  sources: LivingSource[];
}

interface LivingSection {
  id: string;
  num: number;
  title: string;
  count: string;
  intro: string;
  items: LivingItem[];
}

interface LivingData {
  sections: LivingSection[];
}

const DATA = (livingData as LivingData).sections;

const GRADES = ["A", "B", "C"] as const;
const RATIOS = ["极高", "高", "一般"] as const;

/** 证据等级配色 */
const GRADE_COLOR: Record<string, { fg: string; bg: string }> = {
  A: { fg: "#18794e", bg: "rgba(16,185,129,.13)" },
  B: { fg: "#915930", bg: "rgba(234,179,8,.15)" },
  C: { fg: "#b8272c", bg: "rgba(244,63,94,.12)" },
};

/** 性价比配色 */
const RATIO_COLOR: Record<string, { fg: string; bg: string }> = {
  极高: { fg: "#18794e", bg: "rgba(16,185,129,.13)" },
  高: { fg: "#3451b2", bg: "rgba(100,108,255,.12)" },
  一般: { fg: "#565a5f", bg: "rgba(142,150,170,.15)" },
};

const TOTAL_ITEMS = DATA.reduce((n, s) => n + s.items.length, 0);
const GRADE_COUNT = DATA.reduce<Record<string, number>>((m, s) => {
  for (const it of s.items) m[it.grade] = (m[it.grade] ?? 0) + 1;
  return m;
}, {});

export function LivingGuide() {
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState<string>("全部");
  const [ratio, setRatio] = useState<string>("全部");
  const [showTop, setShowTop] = useState(false);

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return DATA.map((sec) => {
      const items = sec.items.filter((it) => {
        if (grade !== "全部" && it.grade !== grade) return false;
        if (ratio !== "全部" && it.ratio !== ratio) return false;
        if (!q) return true;
        const hay = [
          it.title,
          it.plain,
          it.benefit,
          it.cost,
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
  }, [q, grade, ratio]);

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
            background: "linear-gradient(135deg, var(--accent), #f472b6)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          高性价比人生手册
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary)",
            margin: "8px 0 0",
            lineHeight: 1.7,
          }}
        >
          开源书《高性价比人生手册》全书 34 节 631 条建议：每条写清花掉什么、换回什么、证据多硬，
          只引期刊论文和官方文件。内容来自{" "}
          <a
            href="https://github.com/eternity4719/HowToLiveBetter"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}
          >
            eternity4719/HowToLiveBetter
          </a>{" "}
          （公有领域）。
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
            `${DATA.length} 节`,
            `${TOTAL_ITEMS} 条建议`,
            ...GRADES.map((g) => `${g} 级 ${GRADE_COUNT[g] ?? 0} 条`),
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
          placeholder="搜索建议，如：睡眠、运动、疫苗、社保…"
          aria-label="搜索建议"
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
            证据
          </span>
          {["全部", ...GRADES].map((g) => (
            <FilterBtn key={`g-${g}`} active={grade === g} label={g} onClick={() => setGrade(g)} />
          ))}
          <span
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              margin: "0 2px 0 8px",
            }}
          >
            性价比
          </span>
          {["全部", ...RATIOS].map((r) => (
            <FilterBtn key={`r-${r}`} active={ratio === r} label={r} onClick={() => setRatio(r)} />
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
          没有匹配的建议，换个关键词或筛选条件试试。
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
                <LivingCard key={it.id} item={it} />
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



function LivingCard({ item }: { item: LivingItem }) {
  const g = GRADE_COLOR[item.grade] ?? GRADE_COLOR.B;
  const rc = RATIO_COLOR[item.ratio] ?? RATIO_COLOR.一般;
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
            color: g.fg,
            background: g.bg,
            borderRadius: 6,
            padding: "2px 8px",
          }}
        >
          {item.grade} 级
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: rc.fg,
            background: rc.bg,
            borderRadius: 6,
            padding: "2px 8px",
          }}
        >
          性价比 {item.ratio}
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

      {/* 说人话高亮块 */}
      {item.plain && (
        <div
          style={{
            borderLeft: "3px solid var(--accent)",
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
              color: "var(--accent)",
              marginBottom: 4,
            }}
          >
            说人话
          </span>
          {item.plain}
        </div>
      )}

      {/* 成本 / 收益 / 备注 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {item.cost && <FieldRow k="成本" v={item.cost} />}
        {item.benefit && <FieldRow k="收益" v={item.benefit} />}
        {item.note && <FieldRow k="备注" v={item.note} />}
      </div>

      {/* 文献来源 */}
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
            来源（{item.sources.length} 条文献）
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

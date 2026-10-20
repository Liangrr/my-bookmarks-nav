"use client";
import { useMemo, useState } from "react";
import data from "@shared-data/ai-ideas.json";

type Link = { text: string; url: string };
type Idea = {
  id: string;
  title: string;
  audience: string[];
  level: string;
  cost: string;
  desc: string;
  how: string;
  tags: string[];
  links: Link[];
};
type Category = { id: string; title: string; intro: string; items: Idea[] };
type Resource = { title: string; desc: string; url: string };
type IdeaData = {
  meta: { title: string; updated: string; desc: string };
  categories: Category[];
  resources: Resource[];
};

const DATA = (data as IdeaData).categories;
const RESOURCES = (data as IdeaData).resources;
const META = (data as IdeaData).meta;

const AUDIENCES = ["个人", "企业", "自由职业者"];
const LEVELS = ["低", "中", "高"];

/** 难度配色 */
const LEVEL_COLOR: Record<string, { fg: string; bg: string }> = {
  低: { fg: "#18794e", bg: "rgba(16,185,129,.13)" },
  中: { fg: "#915930", bg: "rgba(234,179,8,.15)" },
  高: { fg: "#b8272c", bg: "rgba(244,63,94,.12)" },
};
/** 受众配色 */
const AUD_COLOR: Record<string, { fg: string; bg: string }> = {
  个人: { fg: "#3451b2", bg: "rgba(100,108,255,.12)" },
  企业: { fg: "#7c3aed", bg: "rgba(139,92,246,.14)" },
  自由职业者: { fg: "#0e7490", bg: "rgba(34,211,238,.13)" },
};
/** 成本配色 */
const COST_COLOR: Record<string, { fg: string; bg: string }> = {
  低成本: { fg: "#18794e", bg: "rgba(16,185,129,.13)" },
  按量付费: { fg: "#3451b2", bg: "rgba(100,108,255,.12)" },
  需投入: { fg: "#915930", bg: "rgba(234,179,8,.15)" },
};

const TOTAL_ITEMS = DATA.reduce((n, c) => n + c.items.length, 0);

const SELECT_STYLE: React.CSSProperties = {
  height: 34,
  padding: "0 8px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border)",
  background: "var(--bg-card)",
  color: "var(--text-primary)",
  font: "inherit",
  fontSize: 13,
  outline: "none",
  cursor: "pointer",
};

export default function AiIdeas() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("全部");
  const [aud, setAud] = useState("全部");
  const [level, setLevel] = useState("全部");

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return DATA.map((c) => {
      const items = c.items.filter((it) => {
        if (cat !== "全部" && c.title !== cat) return false;
        if (aud !== "全部" && !it.audience.includes(aud)) return false;
        if (level !== "全部" && it.level !== level) return false;
        if (!q) return true;
        const hay = [it.title, it.desc, it.how, it.tags.join(" "), it.audience.join(" ")]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
      return { c, items };
    }).filter(({ items }) => items.length > 0);
  }, [q, cat, aud, level]);

  const matched = filtered.reduce((n, f) => n + f.items.length, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 头部 */}
      <header style={{ marginTop: 4 }}>
        <h1
          style={{
            fontSize: 30,
            fontWeight: 800,
            margin: 0,
            background: "linear-gradient(135deg, #34d399, #60a5fa, #a78bfa)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {META.title}
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary)",
            margin: "8px 0 0",
            lineHeight: 1.7,
          }}
        >
          {META.desc}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          <Chip>{TOTAL_ITEMS} 个方向</Chip>
          <Chip>{DATA.length} 大类</Chip>
          <Chip>更新于 {META.updated}</Chip>
        </div>
      </header>

      {/* 工具条 */}
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
          placeholder="搜索方向，如：客服、翻译、简历、跨境、报表…"
          aria-label="搜索 AI 项目方向"
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
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="分类筛选" style={SELECT_STYLE}>
            <option value="全部">全部分类</option>
            {DATA.map((c) => (
              <option key={c.id} value={c.title}>{c.title}</option>
            ))}
          </select>
          <select value={aud} onChange={(e) => setAud(e.target.value)} aria-label="受众筛选" style={SELECT_STYLE}>
            <option value="全部">全部受众</option>
            {AUDIENCES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select value={level} onChange={(e) => setLevel(e.target.value)} aria-label="难度筛选" style={SELECT_STYLE}>
            <option value="全部">全部难度</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>{l} 难度</option>
            ))}
          </select>
        </div>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
          命中 {matched} 个
        </span>
      </div>

      {/* 分类与卡片 */}
      {filtered.length === 0 ? (
        <div style={{ padding: "48px 16px", textAlign: "center", color: "var(--text-tertiary)", fontSize: 14 }}>
          没有匹配的方向，换个关键词或筛选条件试试。
        </div>
      ) : (
        filtered.map(({ c, items }) => (
          <section key={c.id} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 21, fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ color: "var(--accent)" }}>{c.title}</span>
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
                  {items.length} 个
                </span>
              </h2>
              {c.intro && (
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, margin: "8px 0 0" }}>
                  {c.intro}
                </p>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {items.map((it) => (
                <IdeaCard key={it.id} idea={it} />
              ))}
            </div>
          </section>
        ))
      )}

      {/* 开源参考资源 */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
        <h2 style={{ fontSize: 21, fontWeight: 800, margin: 0 }}>
          <span style={{ color: "var(--accent)" }}>GitHub 开源参考</span>
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
          可直接学习、Fork 或作为底座的开源项目与生态清单。
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
          {RESOURCES.map((r) => (
            <a
              key={r.url}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "14px 16px",
                textDecoration: "none",
                color: "var(--text-primary)",
                transition: "var(--transition)",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>{r.title}</span>
              <span style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.6 }}>{r.desc}</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
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
      {children}
    </span>
  );
}

function IdeaCard({ idea: it }: { idea: Idea }) {
  const lv = LEVEL_COLOR[it.level] ?? LEVEL_COLOR.中;
  const co = COST_COLOR[it.cost] ?? COST_COLOR.按量付费;
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
        <h3 style={{ fontSize: 15.5, fontWeight: 700, margin: 0, flex: 1, minWidth: 180 }}>{it.title}</h3>
        <span style={{ fontSize: 11, fontWeight: 700, color: lv.fg, background: lv.bg, borderRadius: 6, padding: "2px 8px" }}>
          {it.level}难度
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: co.fg, background: co.bg, borderRadius: 6, padding: "2px 8px" }}>
          {it.cost}
        </span>
      </div>

      {/* 受众 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {it.audience.map((a) => {
          const c = AUD_COLOR[a] ?? AUD_COLOR.个人;
          return (
            <span key={a} style={{ fontSize: 11, fontWeight: 700, color: c.fg, background: c.bg, borderRadius: 6, padding: "2px 8px" }}>
              {a}
            </span>
          );
        })}
      </div>

      <p style={{ fontSize: 13.5, color: "var(--text-primary)", lineHeight: 1.7, margin: 0 }}>{it.desc}</p>

      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          background: "var(--bg-secondary)",
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", letterSpacing: 1 }}>怎么做</span>
        <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>{it.how}</span>
      </div>

      {/* 标签 */}
      {it.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {it.tags.map((t) => (
            <span key={t} style={{ fontSize: 11, color: "var(--text-tertiary)", border: "1px solid var(--border)", borderRadius: 999, padding: "2px 8px" }}>
              {t}
            </span>
          ))}
        </div>
      )}

      {/* 参考链接 */}
      {it.links.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {it.links.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12.5, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}
            >
              {l.text} ↗
            </a>
          ))}
        </div>
      )}
    </article>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import emergencyData from "@/data/emergency-guide.json";

interface ESource {
  text: string;
  url?: string;
}

interface EItem {
  id: string;
  num: number;
  urgency: string;
  title: string;
  plain: string;
  steps: string;
  donts: string;
  goto: string;
  tags: string[];
  sources: ESource[];
}

interface ESection {
  id: string;
  num: number;
  title: string;
  intro: string;
  items: EItem[];
}

interface EData {
  sections: ESection[];
}

const DATA = (emergencyData as EData).sections;

const URGENCIES = ["立即", "尽快", "日常"] as const;

const URGENCY_STYLE: Record<string, { fg: string; bg: string }> = {
  立即: { fg: "#b8272c", bg: "rgba(244,63,94,.12)" },
  尽快: { fg: "#915930", bg: "rgba(234,179,8,.15)" },
  日常: { fg: "#18794e", bg: "rgba(16,185,129,.13)" },
};

const TOTAL_ITEMS = DATA.reduce((n, s) => n + s.items.length, 0);
const URGENCY_COUNT = DATA.reduce<Record<string, number>>((m, s) => {
  for (const it of s.items) m[it.urgency] = (m[it.urgency] ?? 0) + 1;
  return m;
}, {});

export function EmergencyGuide() {
  const [query, setQuery] = useState("");
  const [urgency, setUrgency] = useState<string>("全部");
  const [showTop, setShowTop] = useState(false);

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return DATA.map((sec) => {
      const items = sec.items.filter((it) => {
        if (urgency !== "全部" && it.urgency !== urgency) return false;
        if (!q) return true;
        const hay = [
          it.title,
          it.plain,
          it.steps,
          it.donts,
          it.goto,
          it.tags.join(" "),
          sec.title,
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
      return { sec, items };
    }).filter(({ items }) => items.length > 0);
  }, [q, urgency]);

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
          医学应急急救与常用小知识
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary)",
            margin: "8px 0 0",
            lineHeight: 1.7,
          }}
        >
          6 大场景 {TOTAL_ITEMS} 条知识：每条给出「关键动作、怎么做、别做错、何时就医」，
          内容依据中国心肺复苏专家共识、脑血管病防治指南、热射病指南等权威指南与统编教材整理，附来源可追溯。
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 12,
          }}
        >
          {[`${DATA.length} 大场景`, `${TOTAL_ITEMS} 条知识`, ...URGENCIES.map((u) => `${u} ${URGENCY_COUNT[u] ?? 0} 条`)].map(
            (t) => (
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
            )
          )}
        </div>
        {/* 免责声明 */}
        <div
          style={{
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            border: "1px solid rgba(234,179,8,.35)",
            background: "rgba(234,179,8,.08)",
            fontSize: 12.5,
            lineHeight: 1.7,
            color: "var(--text-primary)",
          }}
        >
          ⚠️ 本页为权威指南与教材的科普整理，用于日常参考与应急提示，<strong>不能替代专业医疗判断</strong>。
          突发意识丧失、无呼吸、大出血、剧烈胸痛、呼吸困难等急症，请立即拨打 120 或就近就医。
        </div>
      </header>

      {/* 工具条：搜索 + 紧急度筛选 */}
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
          placeholder="搜索：按压、海姆立克、烫伤、低血糖、退烧…"
          aria-label="搜索知识"
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
        <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginRight: 2 }}>
            紧急度
          </span>
          {["全部", ...URGENCIES].map((u) => (
            <FilterBtn key={`u-${u}`} active={urgency === u} label={u} onClick={() => setUrgency(u)} />
          ))}
        </div>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
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
          没有匹配的知识，换个关键词或筛选条件试试。
        </div>
      ) : (
        filtered.map(({ sec, items }) => (
          <section key={sec.id} id={sec.id} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, margin: "8px 0 0" }}>
                  {sec.intro}
                </p>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {items.map((it) => (
                <ECard key={it.id} item={it} />
              ))}
            </div>
          </section>
        ))
      )}

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

function FilterBtn({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        height: 28,
        padding: "0 10px",
        borderRadius: 999,
        border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
        background: active ? "var(--accent-light)" : "var(--bg-card)",
        color: active ? "var(--accent)" : "var(--text-secondary)",
        font: "500 12px/1 inherit",
        cursor: "pointer",
        transition: "var(--transition)",
      }}
    >
      {label}
    </button>
  );
}

function ECard({ item }: { item: EItem }) {
  const us = URGENCY_STYLE[item.urgency] ?? URGENCY_STYLE.日常;
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
            color: us.fg,
            background: us.bg,
            borderRadius: 6,
            padding: "2px 8px",
          }}
        >
          {item.urgency === "立即" ? "立即行动" : item.urgency === "尽快" ? "尽快处理" : "日常常识"}
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

      {/* 关键动作高亮块 */}
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
            关键动作
          </span>
          {item.plain}
        </div>
      )}

      {/* 怎么做 / 别做错 / 何时就医 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {item.steps && <FieldRow k="怎么做" v={item.steps} />}
        {item.donts && (
          <FieldRow
            k="别做错"
            v={item.donts}
            kColor="rgba(244,63,94,.85)"
          />
        )}
        {item.goto && <FieldRow k="就医/120" v={item.goto} />}
      </div>

      {/* 来源 */}
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
            来源（{item.sources.length} 条）
          </summary>
          <ul
            style={{
              margin: "8px 0 0",
              paddingLeft: 18,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {item.sources.map((src, i) => (
              <li key={i} style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.6 }}>
                {src.url ? (
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--accent)", wordBreak: "break-all" }}
                  >
                    {src.text}
                  </a>
                ) : (
                  <span>{src.text}</span>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}

function FieldRow({
  k,
  v,
  kColor,
}: {
  k: string;
  v: string;
  kColor?: string;
}) {
  return (
    <div style={{ display: "flex", gap: 10, fontSize: 13, lineHeight: 1.7 }}>
      <span
        style={{
          flexShrink: 0,
          width: 64,
          fontWeight: 700,
          color: kColor ?? "var(--text-tertiary)",
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

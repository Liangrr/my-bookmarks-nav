"use client";
import { useEffect, useMemo, useState } from "react";
import tcmData from "@/data/tcm-guide.json";
import FilterBtn from "@/components/filter-btn";

interface TcmItem {
  id: string;
  num: number;
  level: string;
  difficulty: string;
  title: string;
  plain: string;
  tags: string[];
  method: string;
  effect: string;
  caution: string;
  source: string;
}

interface TcmSection {
  id: string;
  num: number;
  title: string;
  intro: string;
  items: TcmItem[];
}

interface TcmData {
  sections: TcmSection[];
}

const DATA = (tcmData as TcmData).sections;

const LEVELS = ["经典明训", "经验效方", "民间参考"] as const;
const DIFFS = ["零成本", "易上手", "需坚持"] as const;

/** 经典出处等级配色（中医草木色系） */
const LEVEL_COLOR: Record<string, { fg: string; bg: string }> = {
  经典明训: { fg: "#3f7d5c", bg: "rgba(63,125,92,.14)" },
  经验效方: { fg: "#9a6b2f", bg: "rgba(217,164,65,.16)" },
  民间参考: { fg: "#a8503f", bg: "rgba(200,90,70,.13)" },
};

/** 上手难度配色 */
const DIFF_COLOR: Record<string, { fg: string; bg: string }> = {
  零成本: { fg: "#3f7d5c", bg: "rgba(63,125,92,.14)" },
  易上手: { fg: "#3a6ea8", bg: "rgba(70,130,190,.13)" },
  需坚持: { fg: "#7a6b5a", bg: "rgba(140,120,90,.15)" },
};

const TOTAL_ITEMS = DATA.reduce((n, s) => n + s.items.length, 0);
const LEVEL_COUNT = DATA.reduce<Record<string, number>>((m, s) => {
  for (const it of s.items) m[it.level] = (m[it.level] ?? 0) + 1;
  return m;
}, {});

export function TcmGuide() {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<string>("全部");
  const [diff, setDiff] = useState<string>("全部");
  const [showTop, setShowTop] = useState(false);

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return DATA.map((sec) => {
      const items = sec.items.filter((it) => {
        if (level !== "全部" && it.level !== level) return false;
        if (diff !== "全部" && it.difficulty !== diff) return false;
        if (!q) return true;
        const hay = [
          it.title,
          it.plain,
          it.method,
          it.effect,
          it.caution,
          it.source,
          it.tags.join(" "),
          sec.title,
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
      return { sec, items };
    }).filter(({ items }) => items.length > 0);
  }, [q, level, diff]);

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
            background: "linear-gradient(135deg, #5a9e78, #c08a3e)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          中医养生手册
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary)",
            margin: "8px 0 0",
            lineHeight: 1.7,
          }}
        >
          把《黄帝内经》《千金方》里的养生道理，拆成 7 章 {TOTAL_ITEMS} 条能今天就做的小事：
          每条写清怎么做、适合谁、什么情况下别做。保健自助，不替代就医。
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
            `${TOTAL_ITEMS} 条常识`,
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
          placeholder="搜一搜：失眠、痛经、足三里、泡脚、八段锦…"
          aria-label="搜索养生常识"
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
            出处
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
            上手
          </span>
          {["全部", ...DIFFS].map((d) => (
            <FilterBtn key={`d-${d}`} active={diff === d} label={d} onClick={() => setDiff(d)} />
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
          没有匹配的养生常识，换个关键词或筛选条件试试。
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
                <span style={{ color: "#7fb896" }}>{sec.num}.</span>
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
                <TcmCard key={it.id} item={it} />
              ))}
            </div>
          </section>
        ))
      )}

      {/* 底部提示 */}
      <div
        style={{
          marginTop: 24,
          padding: "14px 16px",
          borderRadius: "var(--radius-lg)",
          border: "1px dashed var(--border)",
          background: "var(--bg-secondary)",
          fontSize: 12,
          color: "var(--text-tertiary)",
          lineHeight: 1.8,
        }}
      >
        <strong style={{ color: "#c08a3e" }}>免责说明：</strong>
        本站内容为中医养生常识整理，不能替代执业医师的诊断与处方。
        出现持续疼痛、出血、高热、视力骤降、胸痛、意识改变等报警症状，请立刻前往医院。
        孕妇、慢性病患者、正在服药者，采用任何食疗或穴位方案前请先咨询医生。
      </div>

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



function TcmCard({ item }: { item: TcmItem }) {
  const lc = LEVEL_COLOR[item.level] ?? LEVEL_COLOR.民间参考;
  const dc = DIFF_COLOR[item.difficulty] ?? DIFF_COLOR.易上手;
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
            color: lc.fg,
            background: lc.bg,
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
            color: dc.fg,
            background: dc.bg,
            borderRadius: 6,
            padding: "2px 8px",
          }}
        >
          {item.difficulty}
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
            borderLeft: "3px solid #7fb896",
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
              color: "#7fb896",
              marginBottom: 4,
            }}
          >
            说人话
          </span>
          {item.plain}
        </div>
      )}

      {/* 怎么做 / 适合谁 / 注意 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {item.method && <FieldRow k="怎么做" v={item.method} accent="#7fb896" />}
        {item.effect && <FieldRow k="适合" v={item.effect} accent="#c0a25a" />}
        {item.caution && <FieldRow k="注意" v={item.caution} accent="#c07a6a" />}
      </div>

      {/* 出处 */}
      {item.source && (
        <div
          style={{
            fontSize: 12,
            color: "var(--text-tertiary)",
            lineHeight: 1.6,
            paddingTop: 8,
            borderTop: "1px dashed var(--border)",
          }}
        >
          <span style={{ fontWeight: 700, color: "var(--text-secondary)" }}>出处：</span>
          {item.source}
        </div>
      )}
    </article>
  );
}

function FieldRow({ k, v, accent }: { k: string; v: string; accent: string }) {
  return (
    <div style={{ display: "flex", gap: 10, fontSize: 13, lineHeight: 1.7 }}>
      <span
        style={{
          flexShrink: 0,
          width: 44,
          fontWeight: 700,
          color: accent,
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

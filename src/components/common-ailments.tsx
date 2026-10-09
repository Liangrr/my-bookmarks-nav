"use client";
import { useEffect, useMemo, useState } from "react";
import ailmentsData from "@/data/common-ailments.json";

interface Stage {
  phase: string;
  period: string;
  desc: string;
  do: string[];
  medicines: string[];
  foods: string[];
}

interface WaterGuide {
  amount: string;
  temp: string;
  when: string;
  note: string;
}

interface SpotCheck {
  title: string;
  aLabel: string;
  bLabel: string;
  rows: { k: string; a: string; b: string }[];
}

interface Group {
  label: string;
  items: string[];
}

interface Ailment {
  id: string;
  name: string;
  icon: string;
  short: string;
  duration: string;
  tags: string[];
  symptoms: string[];
  spotCheck?: SpotCheck;
  groups?: Group[];
  stages: Stage[];
  water: WaterGuide;
  avoid: string[];
  seeDoctor: string[];
}

interface KitItem {
  name: string;
  use: string;
  note: string;
}

interface KitCategory {
  name: string;
  icon: string;
  items: KitItem[];
}

interface Kit {
  title: string;
  subtitle: string;
  categories: KitCategory[];
}

interface AilmentsData {
  intro: string;
  disclaimer: string;
  kit: Kit;
  ailments: Ailment[];
}

const DATA = (ailmentsData as AilmentsData).ailments;
const KIT = (ailmentsData as AilmentsData).kit;
const DISCLAIMER = (ailmentsData as AilmentsData).disclaimer;

/** 症状 / 忌口 / 就医信号等列表小条 */
function ChipList({ items, color }: { items: string[]; color?: string }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((s, i) => (
        <li key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, lineHeight: 1.65, color: "var(--text-primary)" }}>
          <span
            style={{
              flexShrink: 0,
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: color ?? "var(--accent)",
              marginTop: 7,
            }}
          />
          <span>{s}</span>
        </li>
      ))}
    </ul>
  );
}

/** 区块标题（小字大写感） */
function BlockTitle({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "block",
        fontSize: 11,
        fontWeight: 700,
        color: "var(--accent)",
        letterSpacing: 1.5,
        marginBottom: 8,
      }}
    >
      {children}
    </span>
  );
}

/** 一个病种卡片 */
function AilmentCard({ item }: { item: Ailment }) {
  return (
    <article
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "18px 18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* 标题行 */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            background: "color-mix(in srgb, var(--accent) 14%, var(--bg-card))",
            border: "1px solid var(--border)",
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          {item.icon}
        </span>
        <div style={{ flex: 1, minWidth: 180 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {item.name}
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", border: "1px solid var(--border)", borderRadius: 999, padding: "2px 8px", background: "var(--bg-secondary)" }}>
              {item.duration}
            </span>
          </h3>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>{item.short}</p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {item.tags.map((t) => (
            <span key={t} style={{ fontSize: 11, color: "var(--text-tertiary)", border: "1px solid var(--border)", borderRadius: 999, padding: "2px 8px" }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* 症状识别 */}
      <div>
        <BlockTitle>症状识别</BlockTitle>
        <ChipList items={item.symptoms} />
      </div>

      {/* 快速鉴别表（风寒/风热、寒咳/热咳等） */}
      {item.spotCheck && (
        <div>
          <BlockTitle>{item.spotCheck.title}</BlockTitle>
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-secondary)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "92px 1fr 1fr",
                background: "color-mix(in srgb, var(--accent) 10%, var(--bg-card))",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              <span style={{ padding: "8px 10px", color: "var(--text-tertiary)" }}>观察项</span>
              <span style={{ padding: "8px 10px", color: "#38bdf8" }}>{item.spotCheck.aLabel}</span>
              <span style={{ padding: "8px 10px", color: "#f87171" }}>{item.spotCheck.bLabel}</span>
            </div>
            {item.spotCheck.rows.map((r, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "92px 1fr 1fr",
                  borderTop: "1px solid var(--border)",
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                <span style={{ padding: "8px 10px", fontWeight: 700, color: "var(--text-secondary)" }}>{r.k}</span>
                <span style={{ padding: "8px 10px", color: "var(--text-primary)" }}>{r.a}</span>
                <span style={{ padding: "8px 10px", color: "var(--text-primary)" }}>{r.b}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 人群差异（小孩 / 成人 / 老人 / 男女） */}
      {item.groups && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <BlockTitle>人群差异（剂量与方案）</BlockTitle>
          {item.groups.map((g, i) => (
            <div
              key={i}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                background: "var(--bg-secondary)",
              }}
            >
              <div
                style={{
                  padding: "8px 12px",
                  background: "color-mix(in srgb, var(--accent) 10%, var(--bg-card))",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {g.label}
              </div>
              <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6, fontSize: 12, lineHeight: 1.6 }}>
                {g.items.map((t, j) => (
                  <div key={j} style={{ display: "flex", gap: 8 }}>
                    <span style={{ color: "var(--accent)", fontWeight: 900, flexShrink: 0 }}>·</span>
                    <span style={{ color: "var(--text-primary)" }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 分阶段应对 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <BlockTitle>分阶段应对（哪一步到哪一步）</BlockTitle>
        {item.stages.map((st, i) => (
          <div
            key={i}
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-secondary)",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  flexShrink: 0,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  color: "#0a0a0f",
                  fontSize: 12,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {i + 1}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{st.phase}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)", borderRadius: 999, padding: "1px 8px" }}>
                {st.period}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: "var(--text-secondary)" }}>{st.desc}</p>
            <StageRow label="该做什么" items={st.do} color="#22d3ee" />
            {st.medicines.length > 0 && <StageRow label="用药参考" items={st.medicines} color="#a78bfa" />}
            <StageRow label="吃什么" items={st.foods} color="#34d399" />
          </div>
        ))}
      </div>

      {/* 饮水指导 */}
      <div
        style={{
          borderLeft: "3px solid #38bdf8",
          background: "var(--bg-secondary)",
          borderRadius: "0 var(--radius-md) var(--radius-md) 0",
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#38bdf8", letterSpacing: 1.5 }}>
          💧 喝水指南
        </span>
        <WaterRow k="喝多少" v={item.water.amount} />
        <WaterRow k="温水/凉水" v={item.water.temp} />
        <WaterRow k="什么时候喝" v={item.water.when} />
        <span style={{ fontSize: 12, lineHeight: 1.7, color: "var(--text-secondary)" }}>{item.water.note}</span>
      </div>

      {/* 忌口 */}
      <div>
        <BlockTitle>🚫 忌口与避免</BlockTitle>
        <ChipList items={item.avoid} color="#f59e0b" />
      </div>

      {/* 就医信号 */}
      <div
        style={{
          borderLeft: "3px solid #ef4444",
          background: "color-mix(in srgb, #ef4444 6%, var(--bg-card))",
          borderRadius: "0 var(--radius-md) var(--radius-md) 0",
          padding: "12px 14px",
        }}
      >
        <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#ef4444", letterSpacing: 1.5, marginBottom: 8 }}>
          ⚠ 出现这些信号要就医
        </span>
        <ChipList items={item.seeDoctor} color="#ef4444" />
      </div>
    </article>
  );
}

function StageRow({ label, items, color }: { label: string; items: string[]; color: string }) {
  return (
    <div>
      <span style={{ display: "block", fontSize: 11, fontWeight: 700, color, letterSpacing: 1, marginBottom: 6 }}>
        {label}
      </span>
      <ChipList items={items} color={color} />
    </div>
  );
}

function WaterRow({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", gap: 10, fontSize: 13, lineHeight: 1.7 }}>
      <span style={{ flexShrink: 0, width: 86, fontWeight: 700, color: "var(--text-tertiary)" }}>{k}</span>
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

export function CommonAilments() {
  const [query, setQuery] = useState("");
  const [showTop, setShowTop] = useState(false);
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return DATA;
    return DATA.filter((a) => {
      const hay = [
        a.name,
        a.short,
        a.tags.join(" "),
        a.symptoms.join(" "),
        a.stages.map((s) => `${s.phase} ${s.period} ${s.desc} ${s.do.join(" ")} ${s.medicines.join(" ")} ${s.foods.join(" ")}`).join(" "),
        a.water.amount + a.water.temp + a.water.when + a.water.note,
        a.avoid.join(" "),
        a.seeDoctor.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [q]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 头部 */}
      <header style={{ marginTop: 4 }}>
        <h1
          style={{
            fontSize: 30,
            fontWeight: 800,
            margin: 0,
            background: "linear-gradient(135deg, #38bdf8, #a78bfa)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          日常小病治理
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "8px 0 0", lineHeight: 1.7 }}>
          {ailmentsData.intro}
        </p>
        <div
          style={{
            marginTop: 12,
            borderLeft: "3px solid #f59e0b",
            background: "color-mix(in srgb, #f59e0b 8%, var(--bg-card))",
            borderRadius: "0 var(--radius-md) var(--radius-md) 0",
            padding: "10px 12px",
            fontSize: 12,
            lineHeight: 1.7,
            color: "var(--text-secondary)",
          }}
        >
          <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#f59e0b", marginBottom: 2 }}>
            ⚕ 健康提示
          </span>
          {DISCLAIMER}
        </div>
      </header>

      {/* 家庭常备药箱（置顶） */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>{KIT.title}</h2>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.6 }}>{KIT.subtitle}</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {KIT.categories.map((cat) => (
            <div
              key={cat.name}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                background: "var(--bg-card)",
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  paddingBottom: 6,
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span aria-hidden="true">{cat.icon}</span>
                <span>{cat.name}</span>
              </div>
              {cat.items.map((it) => (
                <div key={it.name} style={{ fontSize: 12, lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 700 }}>
                    <span style={{ color: "var(--accent)" }}>{it.name}</span>
                    <span style={{ color: "var(--text-tertiary)", fontWeight: 400, marginLeft: 6 }}>{it.use}</span>
                  </div>
                  <div style={{ color: "var(--text-secondary)" }}>{it.note}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* 搜索条 */}
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
          placeholder="搜索，如：感冒、发烧、腹泻、喝水、补液盐…"
          aria-label="搜索日常小病"
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
        <span style={{ fontSize: 12, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
          共 {DATA.length} 类 · 命中 {filtered.length} 类
        </span>
      </div>

      {/* 病种卡片 */}
      {filtered.length === 0 ? (
        <div style={{ padding: "48px 16px", textAlign: "center", color: "var(--text-tertiary)", fontSize: 14 }}>
          没有匹配的小病条目，换个关键词试试。
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filtered.map((a) => (
            <AilmentCard key={a.id} item={a} />
          ))}
        </div>
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

"use client";

import { useMemo, useState } from "react";
import data from "@/data/independent-developers.json";

type LinkItem = { text: string; url: string };
type Item = { title: string; url: string; status: string; desc: string; links: LinkItem[] };
type Author = { name: string; links: LinkItem[]; items: Item[] };
type Group = { date: string; authors: Author[] };
type Stats = { total: number; ok: number; dead: number; authors: number; dateGroups: number };

const stats = data.stats as Stats;
const groups = data.groups as Group[];
const updatedAt = data.updatedAt as string;

function matchItem(it: Item, authorName: string, q: string) {
  const s = q.toLowerCase();
  return (
    it.title.toLowerCase().includes(s) ||
    it.desc.toLowerCase().includes(s) ||
    authorName.toLowerCase().includes(s)
  );
}

export default function IndieDevList() {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return groups;
    return groups
      .map((g) => ({
        ...g,
        authors: g.authors
          .map((a) => ({ ...a, items: a.items.filter((it) => matchItem(it, a.name, q)) }))
          .filter((a) => a.items.length > 0),
      }))
      .filter((g) => g.authors.length > 0);
  }, [q]);

  const hitCount = useMemo(() => {
    if (!q.trim()) return stats.total;
    return filtered.reduce((n, g) => n + g.authors.reduce((m, a) => m + a.items.length, 0), 0);
  }, [filtered, q]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 概览统计 */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
        }}
      >
        {[
          { label: "收录项目", value: stats.total, unit: "个" },
          { label: "独立开发者", value: stats.authors, unit: "位" },
          { label: "失效标记", value: stats.dead, unit: "个" },
          { label: "更新于", value: updatedAt.split(" ")[0], unit: "" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "14px 16px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent)", marginTop: 4 }}>
              {s.value}
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}> {s.unit}</span>
            </div>
          </div>
        ))}
      </section>

      {/* 搜索 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "8px 14px",
        }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索项目名、描述或开发者…"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text-primary)",
            fontSize: 14,
          }}
        />
        <span style={{ fontSize: 12.5, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
          命中 {hitCount} / {stats.total}
        </span>
      </div>

      {/* 日期分组列表 */}
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filtered.map((g) => (
          <div
            key={g.date}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            {/* 组头 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 18px",
                background: "var(--bg-glass)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{g.date}</span>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {g.authors.reduce((n, a) => n + a.items.length, 0)} 个项目
              </span>
            </div>
            {/* 作者与条目 */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {g.authors.map((a) => (
                <div key={a.name} style={{ padding: "12px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--accent)" }}>{a.name}</span>
                    {a.links.map((l) => (
                      <a
                        key={l.url}
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: 11.5,
                          padding: "1px 8px",
                          borderRadius: 20,
                          background: "var(--bg-glass)",
                          border: "1px solid var(--border)",
                          color: "var(--text-secondary)",
                          textDecoration: "none",
                        }}
                      >
                        {l.text}
                      </a>
                    ))}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {a.items.map((it) => (
                      <div
                        key={it.url + it.title}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 3,
                          opacity: it.status === "dead" ? 0.55 : 1,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                          <a
                            href={it.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: it.status === "dead" ? "var(--text-secondary)" : "var(--text-primary)",
                              textDecoration: "none",
                              textDecorationLine: it.status === "dead" ? "line-through" : "none",
                            }}
                          >
                            {it.title}
                          </a>
                          {it.status === "dead" && (
                            <span
                              style={{
                                fontSize: 10.5,
                                padding: "1px 7px",
                                borderRadius: 20,
                                background: "rgba(239,68,68,0.12)",
                                border: "1px solid rgba(239,68,68,0.35)",
                                color: "#ef4444",
                              }}
                            >
                              已失效
                            </span>
                          )}
                          {it.links.map((l) => (
                            <a
                              key={l.url}
                              href={l.url}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                fontSize: 11,
                                padding: "1px 8px",
                                borderRadius: 20,
                                background: "var(--bg-glass)",
                                border: "1px solid var(--border)",
                                color: "var(--accent)",
                                textDecoration: "none",
                              }}
                            >
                              {l.text}
                            </a>
                          ))}
                        </div>
                        {it.desc && (
                          <p style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
                            {it.desc}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-secondary)", fontSize: 14 }}>
            没有找到匹配的项目，换个关键词试试
          </div>
        )}
      </section>

      {/* 数据说明 */}
      <section
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "14px 18px",
          fontSize: 12.5,
          color: "var(--text-secondary)",
          lineHeight: 1.8,
        }}
      >
        数据来源：{" "}
        <a
          href={data.source}
          target="_blank"
          rel="noreferrer"
          style={{ color: "var(--accent)", textDecoration: "none" }}
        >
          chinese-independent-developer（GitHub）
        </a>
        ，由定时任务每日自动拉取更新；列表按添加日期倒序分组，「已失效」为上游标记的 :x: 条目。
      </section>
    </div>
  );
}

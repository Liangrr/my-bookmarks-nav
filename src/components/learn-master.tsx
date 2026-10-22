"use client";
import { useMemo } from "react";
import devData from "@shared-data/dev-learning-guide.json";
import agentData from "@shared-data/agent-learning-guide.json";
import flutterData from "@shared-data/flutter-learning-guide.json";
import fsData from "@shared-data/fullstack-tutorial-guide.json";
import { GuideShell, type GuideData, type GuideTrack } from "@/components/guide-shell";

/** 把扁平的 AI Agent 数据包成一个轨道 */
const agentTrack: GuideTrack = {
  id: "ai-agent",
  title: "AI Agent",
  desc: "照着做入门智能体：最小 Loop、检索记忆、框架工程到多智能体实战。",
  color: "#a855f7",
  group: "方向三 · AI Agent",
  stages: agentData.stages,
  resources: agentData.resources,
  ladder: agentData.ladder,
};

/** 合并四份数据，并按「地基 → 选方向 → 专精」重排轨道顺序 */
function buildMaster(): GuideData {
  const pick = (list: unknown[], group: string) =>
    (list as GuideTrack[]).map((t) => ({ ...t, group }));

  const tracks: GuideTrack[] = [
    // ① 公共地基
    ...pick((fsData as { tracks: GuideTrack[] }).tracks.filter((t) => t.id === "fundamentals"), "公共地基 · 先打牢"),
    // ② 方向一 Web 全栈
    ...pick((devData as { tracks: GuideTrack[] }).tracks, "方向一 · Web 全栈"),
    // ② 方向二 Flutter 移动
    ...pick((flutterData as { tracks: GuideTrack[] }).tracks, "方向二 · Flutter 移动"),
    // ② 方向三 AI Agent
    agentTrack,
    // ③ 语言专精（选修）
    ...pick((fsData as { tracks: GuideTrack[] }).tracks.filter((t) => t.id !== "fundamentals"), "语言专精 · 按需选修"),
  ];

  // 术语去重（按 term），保留首次出现
  const seen = new Set<string>();
  const glossary: GuideData["glossary"] = [];
  for (const src of [fsData, devData, flutterData, agentData]) {
    for (const g of src.glossary ?? []) {
      if (!seen.has(g.term)) {
        seen.add(g.term);
        glossary.push(g);
      }
    }
  }

  return {
    meta: {
      title: "学习中心",
      updated: fsData.meta.updated,
      desc:
        "按「先打地基 → 选一个方向做出作品 → 再按需专精」的顺序学习：公共地基、Web 全栈、Flutter 移动、AI Agent 与 Java/Python 语言深入，全部可溯源、可勾选进度。",
    },
    tracks,
    glossary,
  };
}

/** 顶部学习路线图：三站递进 */
const ROADMAP = [
  {
    no: "①",
    title: "公共地基 · 先打牢",
    desc: "操作系统、计算机网络、数据库、Linux、算法、Docker、Git——不管走哪个方向都要先懂的底座。",
    tag: "必修",
    color: "#38bdf8",
  },
  {
    no: "②",
    title: "选一个方向做出作品",
    desc: "Web 全栈（前后端+部署）、Flutter 移动（一套代码多端）、AI Agent（智能体开发）三条任选其一，不必全学。",
    tag: "三选一",
    color: "#4ade80",
  },
  {
    no: "③",
    title: "语言专精 · 按需选修",
    desc: "Java 内功、Python 流畅表达，遇到具体工作或进阶需要时再深入，不用提前啃。",
    tag: "选修",
    color: "#f97316",
  },
];

export function LearnMaster() {
  const data = useMemo<GuideData>(() => buildMaster(), []);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 学习路线图 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
          padding: "14px 16px",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        {ROADMAP.map((s) => (
          <div key={s.no} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: s.color,
                }}
              >
                {s.no}
              </span>
              <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>
                {s.title}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 11,
                  fontWeight: 700,
                  color: s.color,
                  border: `1px solid ${s.color}55`,
                  borderRadius: 999,
                  padding: "2px 8px",
                }}
              >
                {s.tag}
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
              {s.desc}
            </p>
          </div>
        ))}
      </div>

      <GuideShell
        data={data}
        storageKeyPrefix="lm"
        defaultTrackId="fundamentals"
        gradientTo="#38bdf8"
        searchExamples="TCP、索引、并发、装饰器、React、Widget、RAG…"
        headerExtra={
          <>
            {" 内容分别整理自 "}
            <a
              href="https://github.com/frank-lam/fullstack-tutorial"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}
            >
              fullstack-tutorial
            </a>
            {"、roadmap.sh、Agent-Learning-Hub 与 flutter.dev 等官方资源。"}
          </>
        }
        footerSourceText="fullstack-tutorial / roadmap.sh / freeCodeCamp / flutter.dev / dart.dev / Agent-Learning-Hub / HuggingFace / OpenAI 等"
      />
    </div>
  );
}

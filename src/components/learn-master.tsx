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
  group: "AI Agent",
  stages: agentData.stages,
  resources: agentData.resources,
  ladder: agentData.ladder,
};

/** 合并四份数据：Web / AI / Flutter / 全栈内功 */
function buildMaster(): GuideData {
  const tracks: GuideTrack[] = [
    ...(devData.tracks as GuideTrack[]).map((t) => ({ ...t, group: "Web 开发" })),
    agentTrack,
    ...(flutterData.tracks as GuideTrack[]).map((t) => ({ ...t, group: "Flutter 移动" })),
    ...(fsData.tracks as GuideTrack[]).map((t) => ({ ...t, group: "全栈内功" })),
  ];

  // 术语去重（按 term），保留首次出现
  const seen = new Set<string>();
  const glossary: GuideData["glossary"] = [];
  for (const src of [fsData, devData, flutterData, agentData]) {
    for (const g of src.glossary ?? []) {
      const k = g.term;
      if (!seen.has(k)) {
        seen.add(k);
        glossary.push(g);
      }
    }
  }

  return {
    meta: {
      title: "学习中心",
      updated: fsData.meta.updated,
      desc:
        "全栈内功（计算机基础 / Java / Python）、Web 开发（前端 / 后端 / 全栈）、Flutter 移动与 AI Agent 全部收录于此，切换轨道即可继续勾选学习，内容均为可溯源的学习导航。",
    },
    tracks,
    glossary,
  };
}

export function LearnMaster() {
  const data = useMemo<GuideData>(() => buildMaster(), []);
  return (
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
  );
}

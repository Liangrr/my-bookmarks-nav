"use client";
import data from "@shared-data/fullstack-tutorial-guide.json";
import { GuideShell, type GuideData } from "@/components/guide-shell";

const DATA = data as GuideData;

export function LearnFullstack() {
  return (
    <GuideShell
      data={DATA}
      storageKeyPrefix="fs"
      defaultTrackId="fundamentals"
      gradientTo="#38bdf8"
      searchExamples="TCP、索引、并发、装饰器…"
      headerExtra={
        <>
          {" 知识要点整理自开源仓库 "}
          <a
            href="https://github.com/frank-lam/fullstack-tutorial"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}
          >
            frank-lam/fullstack-tutorial
          </a>
          {"，配合各官方文档学习。"}
        </>
      }
      footerSourceText="frank-lam/fullstack-tutorial / Oracle Java / Spring / Python 官方文档 / MySQL / Docker / Redis 等"
    />
  );
}

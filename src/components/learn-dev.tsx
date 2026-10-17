"use client";
import data from "@/data/dev-learning-guide.json";
import { GuideShell, type GuideData } from "@/components/guide-shell";

const DATA = data as GuideData;

export function LearnDev() {
  return (
    <GuideShell
      data={DATA}
      storageKeyPrefix="dev"
      defaultTrackId="frontend"
      gradientTo="#ec4899"
      searchExamples="React、SQL、Docker…"
      headerExtra={
        <>
          {" 路线结构参考"}
          <a
            href="https://roadmap.sh/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}
          >
            roadmap.sh
          </a>
          {"，课程资源来自各开源项目官方链接。"}
        </>
      }
      footerSourceText="roadmap.sh / freeCodeCamp / Microsoft / The Odin Project / Full Stack Open 等"
    />
  );
}

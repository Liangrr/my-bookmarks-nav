"use client";
import data from "@shared-data/flutter-learning-guide.json";
import { GuideShell, type GuideData } from "@/components/guide-shell";

const DATA = data as GuideData;

export function FlutterLearn() {
  return (
    <GuideShell
      data={DATA}
      storageKeyPrefix="flutter"
      defaultTrackId="flutter-core"
      gradientTo="#0175C2"
      searchExamples="Widget、Status、Route…"
      headerExtra={<>{" 全部任务与资源均可溯源到 flutter.dev、dart.dev、pub.dev 等官方文档。"}</>}
      footerSourceText="flutter.dev / dart.dev / pub.dev / roadmap.sh 等"
    />
  );
}

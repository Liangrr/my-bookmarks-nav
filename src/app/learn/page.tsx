import type { Metadata } from "next";
import { LearnMaster } from "@/components/learn-master";

export const metadata: Metadata = {
  title: "学习中心 - 星轨",
  description:
    "全栈内功、Web 开发、Flutter 移动、AI Agent 学习路线合集：可勾选任务清单、官方资源导航与实战阶梯，全部可溯源。",
};

export default function LearnPage() {
  return (
    <div
      className="container"
      style={{ maxWidth: 900, paddingTop: 16, paddingBottom: 48 }}
    >
      <LearnMaster />
    </div>
  );
}

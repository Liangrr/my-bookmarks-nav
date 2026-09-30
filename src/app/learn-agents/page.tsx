import type { Metadata } from "next";
import { LearnAgents } from "@/components/learn-agents";

export const metadata: Metadata = {
  title: "AI Agent 学习 - 星轨",
  description:
    "照着做就能入门 AI Agent：5 阶段学习路线（可勾选进度）、分类资源导航与实战项目阶梯，全部内容可溯源。",
};

export default function LearnAgentsPage() {
  return (
    <div
      className="container"
      style={{ maxWidth: 900, paddingTop: 16, paddingBottom: 48 }}
    >
      <LearnAgents />
    </div>
  );
}

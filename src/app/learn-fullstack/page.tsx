import type { Metadata } from "next";
import { LearnFullstack } from "@/components/learn-fullstack";

export const metadata: Metadata = {
  title: "全栈内功修炼 - 星轨",
  description:
    "计算机基础、Java 内功、Python 流畅表达三条轨道：可勾选知识点清单、官方资源导航与实战阶梯，全部可溯源。",
};

export default function LearnFullstackPage() {
  return (
    <div
      className="container"
      style={{ maxWidth: 900, paddingTop: 16, paddingBottom: 48 }}
    >
      <LearnFullstack />
    </div>
  );
}

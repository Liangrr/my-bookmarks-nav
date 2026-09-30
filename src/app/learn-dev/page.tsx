import type { Metadata } from "next";
import { LearnDev } from "@/components/learn-dev";

export const metadata: Metadata = {
  title: "Web 开发学习 - 星轨",
  description:
    "前端 / 后端 / 全栈三条学习路线一键切换：阶段任务卡（可勾选进度）、资源导航与实战阶梯，全部内容可溯源。",
};

export default function LearnDevPage() {
  return (
    <div
      className="container"
      style={{ maxWidth: 900, paddingTop: 16, paddingBottom: 48 }}
    >
      <LearnDev />
    </div>
  );
}

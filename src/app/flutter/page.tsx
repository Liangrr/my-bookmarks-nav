import type { Metadata } from "next";
import { FlutterLearn } from "@/components/flutter-learn";

export const metadata: Metadata = {
  title: "Flutter 学习 - 星轨",
  description:
    "Flutter / Dart / 跨端实战三条学习路线一键切换：阶段任务卡（可勾选进度）、资源导航与实战阶梯，全部内容可溯源。",
};

export default function FlutterPage() {
  return (
    <div
      className="container"
      style={{ maxWidth: 900, paddingTop: 16, paddingBottom: 48 }}
    >
      <FlutterLearn />
    </div>
  );
}
import type { Metadata } from "next";
import { EmergencyGuide } from "@/components/emergency-guide";

export const metadata: Metadata = {
  title: "急救知识手册 - 星轨",
  description:
    "医学应急急救与常用小知识：心肺复苏、AED、海姆立克、止血、烧烫伤、热射病、卒中识别、低血糖、过敏、发热用药等，内容来自权威指南与教材，附来源可追溯。",
};

export default function EmergencyPage() {
  return (
    <div
      className="container"
      style={{ maxWidth: 900, paddingTop: 16, paddingBottom: 48 }}
    >
      <EmergencyGuide />
    </div>
  );
}

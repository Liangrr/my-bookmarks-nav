import type { Metadata } from "next";
import { CommonAilments } from "@/components/common-ailments";

export const metadata: Metadata = {
  title: "日常小病治理 - 星轨",
  description:
    "感冒、拉肚子、肚子痛、口腔溃疡等常见小病的居家治理：症状识别、分阶段应对、用药参考、饮食与喝水指南（多少 / 冷热 / 何时）、忌口与就医信号。",
};

export default function AilmentsPage() {
  return (
    <div
      className="container"
      style={{ maxWidth: 900, paddingTop: 16, paddingBottom: 48 }}
    >
      <CommonAilments />
    </div>
  );
}

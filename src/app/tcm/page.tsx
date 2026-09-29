import type { Metadata } from "next";
import { TcmGuide } from "@/components/tcm-guide";

export const metadata: Metadata = {
  title: "中医养生手册 - 星轨",
  description:
    "把《黄帝内经》《千金方》里的养生道理拆成 7 章 32 条能今天就做的小事：起居、饮食、穴位、情志、导引、四季、常见不适自助。",
};

export default function TcmPage() {
  return (
    <div
      className="container"
      style={{ maxWidth: 900, paddingTop: 16, paddingBottom: 48 }}
    >
      <TcmGuide />
    </div>
  );
}

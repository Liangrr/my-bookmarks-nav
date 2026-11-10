import type { Metadata } from "next";
import EndOfTimeView from "@/components/end-of-time-view";

const TITLE = "时间的尽头 · THE END OF TIME - 星轨";
const DESCRIPTION =
  "星轨 · 沉浸体验：一件可交互的 Three.js 3D 作品。巨型星盘停在午夜前一秒，粒子吸积涡旋向奇点坍缩。拖拽旋转视角、滚轮拨动时间、点击掀起涟漪。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: "时间的尽头 · THE END OF TIME",
    description: DESCRIPTION,
    type: "website",
    url: "/end-of-time",
    images: [
      {
        url: "/end-of-time/cover.webp",
        width: 1200,
        height: 630,
        alt: "时间的尽头 · 巨型星盘与粒子吸积涡旋",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/end-of-time/cover.webp"],
  },
};

export default function EndOfTimePage() {
  return <EndOfTimeView />;
}

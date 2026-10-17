import type { Metadata } from "next";

// 页面本身是客户端组件（"use client"），metadata 只能由同路由的 server layout 提供
export const metadata: Metadata = {
  title: "实时行情 - 星轨",
  description:
    "国际金属（黄金 / 白银 / 铜）美元价与人民币折算价，5 分钟自动刷新，仅供个人参考。",
};

export default function MarketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

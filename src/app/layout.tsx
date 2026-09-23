import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/nav-bar";

export const metadata: Metadata = {
  title: "我的收藏夹 - 精选网站导航",
  description: "个人收藏的优质网站导航：影视、开发、设计、实用工具一站式收录",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔖</text></svg>"
        />
        <link
          rel="stylesheet"
          href="https://miaoda.feishu.cn/fonts/css2?family=Noto+Sans+SC:wght@300;400;500;600;700;800&display=swap"
        />
      </head>
      <body className="min-h-screen">
        <div className="bg-glow" />
        <NavBar />
        <main>{children}</main>
      </body>
    </html>
  );
}

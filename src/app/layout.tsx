import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/nav-bar";

export const metadata: Metadata = {
  title: "航标 - 精选网站导航",
  description: "个人收藏的优质网站导航：前端开发、工作项目、AI 工具、科技资讯一站式收录",
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
          rel="stylesheet"
          href="https://miaoda.feishu.cn/fonts/css2?family=Noto+Sans+SC:wght@300;400;500;600;700;800&display=swap"
        />
      </head>
      <body>
        <div className="bg-glow"></div>
        <NavBar />
        {children}
      </body>
    </html>
  );
}

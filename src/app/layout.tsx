import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/nav-bar";

const SITE_TITLE = "星轨 - 精选网站导航";
const SITE_DESCRIPTION = "星轨 · 日常在用的优质网站，都在这里";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://bookmark-nav-site.vercel.app",
  ),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: "星轨",
    locale: "zh_CN",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary",
  },
  robots: {
    index: true,
    follow: true,
  },
  // 不在此处配置 icons：src/app 下的 favicon.ico / icon.png / apple-icon.png
  // 已由 Next 文件约定自动输出对应 <link>，重复配置会产生重复标签
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" data-theme="dark" suppressHydrationWarning>
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

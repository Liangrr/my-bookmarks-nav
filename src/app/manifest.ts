import type { MetadataRoute } from "next";

// 色值取自 src/app/globals.css 深色默认主题：
// --bg-primary: #0a0a0f（body 背景）
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "星轨 - 精选网站导航",
    short_name: "星轨",
    description: "星轨 · 日常在用的优质网站，都在这里",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0f",
    theme_color: "#0a0a0f",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

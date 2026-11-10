"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";

/**
 * 《时间的尽头》沉浸容器。
 *
 * 作品本体是 public/end-of-time/ 下完全自包含的静态页（原生 ES Module +
 * importmap 指向本地 three.module.js），这里用同源 iframe 承载：
 * - 不与 Next 的 React/Tailwind 运行时互相干扰，WebGL 上下文随 iframe 卸载即释放；
 * - 保留干净的站内路由 /end-of-time 与站点 metadata / sitemap；
 * - 不引入 three 依赖，零构建耦合。
 */
const STATIC_URL = "/end-of-time/index.html";

export default function EndOfTimeView() {
  const frameRef = useRef<HTMLIFrameElement>(null);

  // 沉浸页独占视口：样式统一由 <html> 上的 class 控制（见 globals.css），
  // 卸载时移除 class，保证客户端导航回站点后顶栏、滚动与背景完整恢复。
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("eot-immersive");
    return () => {
      root.classList.remove("eot-immersive");
    };
  }, []);

  const focusFrame = useCallback(() => {
    // 让空格 / R / 1 2 3 / H 等快捷键在作品内直接生效，无需先点一下画面
    try {
      frameRef.current?.contentWindow?.focus();
    } catch {
      // 极端情况下的跨源限制，忽略即可
    }
  }, []);

  // iframe 可能在 React 水合前就加载完成，JSX 的 onLoad 会丢失；用原生监听兜底，
  // 保证工具条可用、且空格 / R / 1 2 3 / H 等快捷键无需先点画面即可生效。
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const handleLoad = () => focusFrame();
    frame.addEventListener("load", handleLoad);
    if (frame.contentDocument?.readyState === "complete") focusFrame();
    return () => frame.removeEventListener("load", handleLoad);
  }, [focusFrame]);

  const toggleFullscreen = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    void (async () => {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else {
          await frame.requestFullscreen();
        }
        focusFrame();
      } catch {
        // 浏览器拒绝全屏时保持原状
      }
    })();
  }, [focusFrame]);

  return (
    <>
      <main
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "#03040a",
          overflow: "hidden",
        }}
      >
        <iframe
          ref={frameRef}
          src={STATIC_URL}
          title="时间的尽头 · 交互式 3D 作品"
          allow="autoplay; fullscreen; xr-spatial-tracking; gamepad"
          allowFullScreen
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            border: 0,
            display: "block",
            background: "#03040a",
          }}
        />

        {/* 低调的悬浮工具条：回到站点 / 全屏 / 独立打开 */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: 5,
            borderRadius: 999,
            border: "1px solid rgba(232,196,138,.28)",
            background: "rgba(8,9,18,.62)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: "0 6px 30px rgba(0,0,0,.45)",
            opacity: 0.72,
            transition: "opacity .25s ease, background .25s ease",
            pointerEvents: "auto",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.72";
          }}
        >
          <Link
            href="/"
            aria-label="返回星轨首页"
            onClick={() => {
              // 客户端导航有 RSC 加载延迟，点返回时立即恢复站点外壳，避免顶栏闪烁
              document.documentElement.classList.remove("eot-immersive");
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 11,
              letterSpacing: ".14em",
              color: "#f0dcb8",
              textDecoration: "none",
              fontFamily: "inherit",
            }}
          >
            ← 返回星轨
          </Link>
          <span style={{ width: 1, height: 14, background: "rgba(232,196,138,.22)" }} />
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="切换全屏"
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: 0,
              background: "transparent",
              color: "rgba(232,214,182,.78)",
              fontSize: 11,
              letterSpacing: ".12em",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ⛶ 全屏
          </button>
          <a
            href={STATIC_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="在新窗口独立打开作品"
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              color: "rgba(232,214,182,.78)",
              fontSize: 11,
              letterSpacing: ".12em",
              textDecoration: "none",
            }}
          >
            ↗ 独立打开
          </a>
        </div>

        <noscript>
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#e8c48a" }}>
            本作品需要启用 JavaScript。也可直接打开
            <a href={STATIC_URL} style={{ color: "#e8c48a" }}>静态版本</a>。
          </div>
        </noscript>
      </main>
    </>
  );
}

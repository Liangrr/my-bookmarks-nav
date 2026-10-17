"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 全局兜底：原始错误只进日志，不展示给用户
    console.error(error);
  }, [error]);

  return (
    <html lang="zh-CN" data-theme="dark">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#0b0d12",
          color: "#f0f0f5",
          fontFamily:
            '"Noto Sans SC", -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 16px",
          boxSizing: "border-box",
        }}
      >
        <main style={{ maxWidth: 520, textAlign: "center" }}>
          <div
            aria-hidden
            style={{
              fontSize: 56,
              lineHeight: 1,
              marginBottom: 18,
              filter: "drop-shadow(0 0 12px rgba(34, 211, 238, 0.35))",
            }}
          >
            ⚠️
          </div>

          <h1
            style={{
              margin: "0 0 12px",
              fontSize: 24,
              fontWeight: 700,
              color: "#f0f0f5",
            }}
          >
            星轨暂时无法加载
          </h1>

          <p
            style={{
              margin: "0 0 32px",
              fontSize: 14,
              lineHeight: 1.8,
              color: "#9a9aae",
            }}
          >
            站点遇到了一个意外错误，请重试；如果问题持续存在，稍后再访问。
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: 44,
                padding: "0 26px",
                borderRadius: 100,
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: "pointer",
                background: "#22d3ee",
                color: "#08141a",
                border: "1px solid #22d3ee",
                boxShadow: "0 4px 16px rgba(34, 211, 238, 0.25)",
              }}
            >
              重试
            </button>
            {/* global-error 会替换 root layout，路由上下文可能已损坏，用原生 <a> 做整页跳转更稳 */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: 44,
                padding: "0 26px",
                borderRadius: 100,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
                background: "rgba(255, 255, 255, 0.06)",
                color: "#c9c9d6",
                border: "1px solid rgba(255, 255, 255, 0.12)",
              }}
            >
              回到首页
            </a>
          </div>

          {error.digest && (
            <p
              style={{
                marginTop: 28,
                fontSize: 12,
                color: "#6b6b80",
                wordBreak: "break-all",
              }}
            >
              错误编号：{error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}

"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 上报到控制台/监控，便于排查；不把原始信息展示给用户
    console.error(error);
  }, [error]);

  return (
    <main
      className="container"
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "88px 16px 96px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 56,
          lineHeight: 1,
          marginBottom: 18,
          filter: "drop-shadow(0 0 12px var(--accent-glow))",
        }}
        aria-hidden
      >
        ⚠️
      </div>

      <h1
        style={{
          margin: "0 0 10px",
          fontSize: 24,
          fontWeight: 700,
          color: "var(--text-primary)",
        }}
      >
        这个页面出了点问题
      </h1>

      <p
        style={{
          margin: "0 auto 32px",
          maxWidth: 460,
          fontSize: 14,
          lineHeight: 1.8,
          color: "var(--text-secondary)",
        }}
      >
        页面加载时发生了异常，你可以重试一次，或稍后再回来看看。
      </p>

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
          background: "var(--accent)",
          color: "#fff",
          border: "1px solid var(--accent)",
          boxShadow: "0 4px 16px var(--accent-glow)",
          transition: "var(--transition)",
        }}
      >
        重试
      </button>

      {error.digest && (
        <p
          style={{
            marginTop: 28,
            fontSize: 12,
            color: "var(--text-tertiary)",
            wordBreak: "break-all",
          }}
        >
          错误编号：{error.digest}
        </p>
      )}
    </main>
  );
}

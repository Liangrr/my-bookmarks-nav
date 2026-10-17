import Link from "next/link";

const btnBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 44,
  padding: "0 26px",
  borderRadius: 100,
  fontSize: 15,
  fontWeight: 600,
  fontFamily: "inherit",
  textDecoration: "none",
  transition: "var(--transition)",
};

export default function NotFound() {
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
          fontSize: "clamp(72px, 16vw, 132px)",
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: "2px",
          background: "linear-gradient(135deg, var(--accent), #ec4899)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        404
      </div>

      <h1
        style={{
          margin: "20px 0 10px",
          fontSize: 26,
          fontWeight: 700,
          color: "var(--text-primary)",
        }}
      >
        页面走丢了
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
        你访问的地址可能已被移动或删除，也可能只是输错了一个字符。
        <br />
        回到首页继续探索星轨收录的精选网站吧。
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/"
          style={{
            ...btnBase,
            background: "var(--accent)",
            color: "#fff",
            border: "1px solid var(--accent)",
            boxShadow: "0 4px 16px var(--accent-glow)",
          }}
        >
          回到首页
        </Link>
        <Link
          href="/agents"
          style={{
            ...btnBase,
            background: "var(--bg-card)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
          }}
        >
          看看导航
        </Link>
      </div>
    </main>
  );
}

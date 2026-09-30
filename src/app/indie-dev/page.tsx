import IndieDevList from "@/components/indie-dev-list";

export const metadata = {
  title: "独立开发者项目 - 星轨",
  description: "中国独立开发者项目列表（程序员版）：330+ 个开源项目，按日期分组展示，每日自动更新。",
};

export default function IndieDevPage() {
  return (
    <div
      className="container"
      style={{ maxWidth: 1040, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <header style={{ marginTop: 16 }}>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            margin: 0,
            background: "linear-gradient(135deg, var(--accent), #f472b6)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          独立开发者项目
        </h1>
        <p style={{ fontSize: 15, color: "var(--text-secondary)", margin: "8px 0 0", lineHeight: 1.7 }}>
          中国独立开发者项目列表（程序员版）：开发者用命令行/开源方式做出的小而美的产品。
          数据来自 GitHub 社区维护列表，每日自动同步。
        </p>
      </header>
      <IndieDevList />
    </div>
  );
}

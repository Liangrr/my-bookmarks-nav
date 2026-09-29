import Link from "next/link";

export const metadata = {
  title: "关于星轨 - 精选网站导航",
  description: "星轨是一个个人书签导航站，收藏日常在用的优质网站。",
};

export default function AboutPage() {
  return (
    <div
      className="container"
      style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 24 }}
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
          关于星轨
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "var(--text-secondary)",
            margin: "8px 0 0",
            lineHeight: 1.7,
          }}
        >
          星轨是一个个人书签导航站，收录日常在用的优质网站，按分类展示、按热度排行。
        </p>
      </header>

      <section
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>功能</h2>
        <ul style={{ margin: 0, paddingLeft: 20, color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.9 }}>
          <li>分类导航：前端开发 / 工作 / AI 工具 / 科技资讯</li>
          <li>热门排行：按点击量自动排序，常用优先</li>
          <li>点击即达：一键打开目标网站，支持统计</li>
          <li>个人中心：登录后可管理头像与昵称（登录后可见）</li>
        </ul>
      </section>

      <section
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>更新日志</h2>
        <ul style={{ margin: 0, paddingLeft: 20, color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.9 }}>
          <li>2026-09 · 新增抽屉菜单与关于页</li>
          <li>2026-09 · 后台管理改版：统计卡片 + 表格式列表</li>
          <li>2026-09 · 开放注册，支持头像/昵称管理</li>
          <li>2026-09 · 接入数据库，数据迁移至线上</li>
        </ul>
      </section>

      <footer style={{ textAlign: "center", paddingBottom: 12 }}>
        <Link
          href="/"
          style={{
            fontSize: 14,
            color: "var(--accent)",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          ← 返回首页
        </Link>
      </footer>
    </div>
  );
}

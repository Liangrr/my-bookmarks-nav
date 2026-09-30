import Link from "next/link";

export const metadata = {
  title: "智能体市场 - 星轨",
  description: "AI 智能体市场全景：主流产品分类、使用量热度榜与数据来源。",
};

type Category = {
  name: string;
  color: string;
  desc: string;
  products: string[];
  hot: string[];
};

const CATEGORIES: Category[] = [
  {
    name: "通用对话助手型",
    color: "#2563eb",
    desc: "个人日常问答 / 创作入口，用户规模最大",
    products: ["ChatGPT", "Gemini", "Claude", "豆包", "DeepSeek", "Kimi", "Grok", "文心一言", "通义千问", "智谱清言"],
    hot: ["ChatGPT", "Gemini", "Claude", "豆包", "DeepSeek"],
  },
  {
    name: "自主任务型 Agent",
    color: "#7c3aed",
    desc: "自主规划并执行多步任务，替代人工干活",
    products: ["Manus", "Genspark", "OpenAI Dots", "天工超级智能体", "OpenAI Deep Research", "Devin"],
    hot: ["Manus", "Genspark"],
  },
  {
    name: "编程开发型",
    color: "#059669",
    desc: "写代码、改 Bug、重构的开发者 Agent",
    products: ["Cursor", "Claude Code", "GitHub Copilot", "Codex", "Trae", "Windsurf", "Codeium"],
    hot: ["Cursor", "Claude Code", "GitHub Copilot", "Codex"],
  },
  {
    name: "工作流 / 企业 Agent 平台",
    color: "#d97706",
    desc: "搭建企业 Agent、自动化业务流程",
    products: ["扣子 Coze", "Dify", "n8n", "阿里百炼", "百度千帆", "微软 Copilot Studio", "Salesforce Agentforce", "Workbuddy", "Lindy", "Zapier"],
    hot: ["扣子 Coze", "Dify", "n8n"],
  },
  {
    name: "开源 Agent 框架",
    color: "#dc2626",
    desc: "开发者自建 Agent 的底层框架",
    products: ["LangGraph", "CrewAI", "AutoGen", "OpenAI Agents SDK", "SuperAGI", "MetaGPT"],
    hot: ["LangGraph", "CrewAI", "AutoGen"],
  },
  {
    name: "垂直场景型",
    color: "#0891b2",
    desc: "搜索 / 写作 / 语音 / 视频等单点能力",
    products: ["Perplexity", "CapCut", "Canva", "ElevenLabs", "NotebookLM", "可灵 Kling", "Gamma", "Grammarly", "Midjourney"],
    hot: ["Perplexity", "CapCut", "Canva"],
  },
];

type RankRow = {
  rank: number;
  name: string;
  vendor: string;
  type: string;
  evidence: string;
  source: string;
};

const RANKING: RankRow[] = [
  { rank: 1, name: "ChatGPT", vendor: "OpenAI", type: "通用对话", evidence: "周活跃用户约 9 亿，是第 2 名的 2.7 倍", source: "a16z 第 6 版 · 2026-03" },
  { rank: 2, name: "Gemini", vendor: "Google", type: "通用对话", evidence: "综合榜第 2，付费订阅增长 258%", source: "a16z 第 6 版 · 2026-03" },
  { rank: 3, name: "Claude", vendor: "Anthropic", type: "通用对话", evidence: "综合榜第 3，付费订阅增长 200%", source: "a16z 第 6 版 · 2026-03" },
  { rank: 4, name: "DeepSeek", vendor: "深度求索", type: "通用对话", evidence: "新进前 5，上升最快的新产品", source: "a16z 第 6 版 · 2026-03" },
  { rank: 5, name: "CapCut 剪映", vendor: "字节跳动", type: "视频创作", evidence: "移动端月活约 7.36 亿", source: "a16z 第 6 版 · 2026-03" },
  { rank: 6, name: "Perplexity", vendor: "Perplexity AI", type: "AI 搜索", evidence: "AI 搜索头部产品，综合榜前 6", source: "a16z 第 6 版 · 2026-03" },
  { rank: 7, name: "豆包", vendor: "字节跳动", type: "通用对话", evidence: "进入全球综合 Top 50", source: "a16z 第 6 版 · 2026-03" },
  { rank: 8, name: "Kimi", vendor: "月之暗面", type: "通用对话", evidence: "进入全球综合 Top 50", source: "a16z 第 6 版 · 2026-03" },
  { rank: 9, name: "Manus", vendor: "独立团队", type: "自主任务", evidence: "通用型自主 Agent，进入全球 Top 50", source: "a16z 第 6 版 · 2026-03" },
  { rank: 10, name: "Canva", vendor: "Canva", type: "设计创作", evidence: "AI 设计集成后重回榜单", source: "a16z 第 6 版 · 2026-03" },
];

export default function AgentsPage() {
  return (
    <div
      className="container"
      style={{ maxWidth: 1040, display: "flex", flexDirection: "column", gap: 28 }}
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
          AI 智能体市场
        </h1>
        <p style={{ fontSize: 15, color: "var(--text-secondary)", margin: "8px 0 0", lineHeight: 1.7 }}>
          智能体（AI Agent）产品分类全景与使用量热度榜。榜单数据来自 a16z Top 100 Gen AI Apps 第 6 版（2026 年 3 月）与各公司公开披露。
        </p>
      </header>

      {/* 概览统计 */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
        }}
      >
        {[
          { label: "收录主流产品", value: "48+", unit: "个" },
          { label: "ChatGPT 周活", value: "9", unit: "亿" },
          { label: "中国产品进全球 Top 50", value: "22", unit: "个" },
          { label: "榜单更新", value: "2026-03", unit: "第 6 版" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "16px 18px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent)", marginTop: 6 }}>
              {s.value}
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}> {s.unit}</span>
            </div>
          </div>
        ))}
      </section>

      {/* 分类全景 */}
      <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
          产品分类全景
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {CATEGORIES.map((cat) => (
            <div
              key={cat.name}
              style={{
                flex: "1 1 30%",
                minWidth: 280,
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "16px 18px",
                boxSizing: "border-box",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: cat.color,
                    flex: "none",
                  }}
                />
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{cat.name}</span>
              </div>
              <p style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: "4px 0 10px" }}>{cat.desc}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {cat.products.map((p) => (
                  <span
                    key={p}
                    style={{
                      fontSize: 12.5,
                      padding: "3px 9px",
                      borderRadius: 20,
                      background: "var(--bg-glass)",
                      border: cat.hot.includes(p)
                        ? "1px solid var(--accent)"
                        : "1px solid var(--border)",
                      color: cat.hot.includes(p) ? "var(--accent)" : "var(--text-secondary)",
                      fontWeight: cat.hot.includes(p) ? 600 : 400,
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
          注：金色/强调色标记为各分类使用量头部产品；分类按产品主导形态划分，部分产品跨类（如 Dify 兼具开源与平台属性）。
        </p>
      </section>

      {/* 使用热度榜 */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
          使用热度榜 Top 10
        </h2>
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 14,
            overflow: "hidden",
            background: "var(--bg-card)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "48px 1.2fr 1fr 1.6fr 1.4fr",
              gap: 12,
              padding: "12px 16px",
              fontSize: 12.5,
              fontWeight: 700,
              color: "var(--text-secondary)",
              background: "var(--bg-glass)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span>#</span>
            <span>产品</span>
            <span>厂商</span>
            <span>热度证据</span>
            <span>数据来源</span>
          </div>
          {RANKING.map((r, i) => (
            <div
              key={r.name}
              style={{
                display: "grid",
                gridTemplateColumns: "48px 1.2fr 1fr 1.6fr 1.4fr",
                gap: 12,
                padding: "12px 16px",
                fontSize: 13.5,
                color: "var(--text-primary)",
                borderBottom: i < RANKING.length - 1 ? "1px solid var(--border)" : "none",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 13,
                  background:
                    r.rank <= 3
                      ? "var(--accent-glow)"
                      : "var(--bg-glass)",
                  color: r.rank <= 3 ? "var(--accent)" : "var(--text-secondary)",
                }}
              >
                {r.rank}
              </span>
              <span style={{ fontWeight: 600 }}>{r.name}</span>
              <span style={{ color: "var(--text-secondary)", fontSize: 12.5 }}>{r.vendor}</span>
              <span style={{ fontSize: 12.5 }}>{r.evidence}</span>
              <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{r.source}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
          补充：企业级 Agent 平台侧，Salesforce Agentforce 累计成交 2.9 万单、ARR 约 8 亿美元（2026-05 披露）。同一产品不同口径（周活/月活/订阅增速）不可直接横向比较。
        </p>
      </section>

      {/* 数据说明 */}
      <section
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "16px 18px",
          fontSize: 13,
          color: "var(--text-secondary)",
          lineHeight: 1.8,
        }}
      >
        <strong style={{ color: "var(--text-primary)" }}>数据来源与更新</strong>
        <br />
        ① a16z Top 100 Gen AI Consumer Apps（第 6 版，2026-03）：全球消费级 AI 应用流量/用户排名（web + 移动综合）。
        ② 各公司财报与官方披露（OpenAI、Google、Anthropic、字节等）。③ 企业平台披露（Salesforce 等）。
        榜单每半年更新一次；本页数据会随新一期榜单发布同步刷新。想看实时流量可访问{" "}
        <Link href="https://similarweb.com" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
          Similarweb
        </Link>{" "}
        自行查询。
      </section>
    </div>
  );
}

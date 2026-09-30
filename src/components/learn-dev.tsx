"use client";
import { useEffect, useMemo, useReducer, useState, useSyncExternalStore } from "react";
import data from "@/data/dev-learning-guide.json";
import FilterBtn from "@/components/filter-btn";

/* ========== 类型 ========== */
interface GuideLink {
  text: string;
  url: string;
}

interface GuideTask {
  id: string;
  title: string;
  plain: string;
  links: GuideLink[];
  output: string;
  tags: string[];
}

interface GuideStage {
  id: string;
  num: number;
  title: string;
  desc: string;
  tasks: GuideTask[];
}

interface GuideResource {
  title: string;
  url: string;
  desc: string;
}

interface GuideResourceCat {
  category: string;
  items: GuideResource[];
}

interface GuideLadder {
  level: number;
  project: string;
  learn: string;
}

interface GuideGlossary {
  term: string;
  plain: string;
}

interface GuideTrack {
  id: string;
  title: string;
  desc: string;
  color: string;
  stages: GuideStage[];
  resources: GuideResourceCat[];
  ladder: GuideLadder[];
}

interface GuideData {
  meta: { title: string; updated: string; desc: string };
  tracks: GuideTrack[];
  glossary: GuideGlossary[];
}

const DATA = data as GuideData;
const TRACK_KEY = "dev-track"; // 记住上次选择的轨道
const PROGRESS_PREFIX = "dev-progress-"; // 每轨独立进度 key

const DONE_EMPTY: Record<string, boolean> = {};

/** 读取某轨进度；未挂载（SSR/首帧）时返回空对象，避免水合不一致 */
function readDone(mounted: boolean, trackId: string): Record<string, boolean> {
  if (!mounted) return DONE_EMPTY;
  try {
    const raw = localStorage.getItem(`${PROGRESS_PREFIX}${trackId}`);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : DONE_EMPTY;
  } catch {
    return DONE_EMPTY;
  }
}

export function LearnDev() {
  // 挂载检测：服务端与首次客户端渲染返回 false，水合后再切 true
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("全部");
  // 进度切换后触发重渲染；进度本体每次渲染直接从 localStorage 读取
  const forceUpdate = useReducer((c: number) => c + 1, 0)[1];
  const [showTop, setShowTop] = useState(false);
  // 用户点击选中的轨道（受控 state）
  const [picked, setPicked] = useState("frontend");

  // 记住上次选择：mounted 后从 localStorage 恢复（渲染期派生，无 effect setState）
  const trackId = useMemo(() => {
    if (!mounted) return picked;
    const saved = localStorage.getItem(TRACK_KEY);
    return saved && DATA.tracks.some((t) => t.id === saved) ? saved : picked;
  }, [mounted, picked]);

  const track = DATA.tracks.find((t) => t.id === trackId)!;
  const STAGES = track.stages;
  const ALL_TASKS = STAGES.flatMap((s) => s.tasks);
  const TOTAL_TASKS = ALL_TASKS.length;
  const TOTAL_RESOURCES = track.resources.reduce((n, c) => n + c.items.length, 0);

  // 各轨完成数（切换器徽章用）：渲染期直接计算，勾选后随 forceUpdate 刷新
  const trackDone: Record<string, number> = {};
  for (const tr of DATA.tracks) {
    const trDone = readDone(mounted, tr.id);
    trackDone[tr.id] = tr.stages
      .flatMap((s) => s.tasks)
      .filter((t) => trDone[t.id]).length;
  }

  const done = readDone(mounted, trackId);
  const doneCount = ALL_TASKS.filter((t) => done[t.id]).length;
  const donePercent = TOTAL_TASKS ? Math.round((doneCount / TOTAL_TASKS) * 100) : 0;

  const switchTrack = (id: string) => {
    if (id === trackId) return;
    setPicked(id);
    try {
      localStorage.setItem(TRACK_KEY, id);
    } catch {
      /* 隐私模式等写失败时仅本次失效 */
    }
    setStage("全部"); // 轨道切换后重置阶段筛选，避免旧轨道 id 无匹配
  };

  const toggle = (id: string) => {
    const next = { ...done, [id]: !done[id] };
    try {
      localStorage.setItem(`${PROGRESS_PREFIX}${trackId}`, JSON.stringify(next));
    } catch {
      /* 隐私模式等写失败时仅本次失效，不影响交互 */
    }
    forceUpdate();
  };

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return STAGES.map((sec) => {
      const tasks = sec.tasks.filter((t) => {
        if (stage !== "全部" && sec.id !== stage) return false;
        if (!q) return true;
        const hay = [
          t.title,
          t.plain,
          t.output,
          t.tags.join(" "),
          sec.title,
          track.title,
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
      return { sec, tasks };
    }).filter(({ tasks }) => tasks.length > 0);
  }, [q, stage, STAGES, track.title]);

  const matchedCount = filtered.reduce((n, f) => n + f.tasks.length, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ===== 页头 ===== */}
      <header style={{ marginTop: 4 }}>
        <h1
          style={{
            fontSize: 30,
            fontWeight: 800,
            margin: 0,
            background: "linear-gradient(135deg, var(--accent), #ec4899)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {DATA.meta.title}
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary)",
            margin: "8px 0 0",
            lineHeight: 1.7,
          }}
        >
          {DATA.meta.desc} 路线结构参考
          <a
            href="https://roadmap.sh/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}
          >
            roadmap.sh
          </a>
          ，课程资源来自各开源项目官方链接。
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 12,
          }}
        >
          {[
            `${STAGES.length} 阶段`,
            `${TOTAL_TASKS} 个任务`,
            `${TOTAL_RESOURCES} 条资源`,
            `已学 ${doneCount}/${TOTAL_TASKS}`,
          ].map((t) => (
            <span
              key={t}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                color: "var(--text-secondary)",
              }}
            >
              {t}
            </span>
          ))}
        </div>

        {/* 轨道切换器：前端 / 后端 / 全栈 */}
        <div
          role="tablist"
          aria-label="学习轨道"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            marginTop: 16,
          }}
        >
          {DATA.tracks.map((tr) => {
            const active = tr.id === trackId;
            const total = tr.stages.flatMap((s) => s.tasks).length;
            const tDone = trackDone[tr.id] ?? 0;
            return (
              <button
                key={tr.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => switchTrack(tr.id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 6,
                  padding: "14px 16px",
                  borderRadius: "var(--radius-lg)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                  background: active ? "var(--accent-glow)" : "var(--bg-card)",
                  border: `1.5px solid ${active ? tr.color : "var(--border)"}`,
                  boxShadow: active ? "0 0 0 3px var(--accent-glow)" : "none",
                  transition: "var(--transition)",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 15,
                    fontWeight: 800,
                    color: active ? "var(--accent-strong)" : "var(--text-primary)",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: tr.color,
                      flexShrink: 0,
                    }}
                  />
                  {tr.title}
                  {active && (
                    <span style={{ color: "var(--accent)", fontSize: 12 }}>✓</span>
                  )}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  {tr.desc}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    border: "1px solid var(--border)",
                    borderRadius: 999,
                    padding: "2px 8px",
                    background: "var(--bg-card)",
                  }}
                >
                  {total} 任务 · 已学 {tDone}
                </span>
              </button>
            );
          })}
        </div>

        {/* 当前轨道进度条 */}
        <div
          style={{
            marginTop: 14,
            height: 8,
            borderRadius: 999,
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${donePercent}%`,
              height: "100%",
              borderRadius: 999,
              background: `linear-gradient(90deg, var(--accent), ${track.color})`,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </header>

      {/* ===== 工具条：搜索 + 阶段筛选 ===== */}
      <div
        style={{
          position: "sticky",
          top: 76,
          zIndex: 10,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          background: "var(--bg-glass)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`搜索 ${track.title} 任务，如：React、SQL、Docker…`}
          aria-label="搜索学习任务"
          style={{
            flex: 1,
            minWidth: 180,
            height: 34,
            padding: "0 12px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            font: "inherit",
            fontSize: 13,
            outline: "none",
          }}
        />
        <div
          style={{
            display: "flex",
            gap: 4,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              marginRight: 2,
            }}
          >
            阶段
          </span>
          {["全部", ...STAGES.map((s) => s.id)].map((id) => (
            <FilterBtn
              key={`${trackId}-st-${id}`}
              active={stage === id}
              label={id === "全部" ? "全部" : (STAGES.find((s) => s.id === id)?.title ?? id)}
              onClick={() => setStage(id)}
            />
          ))}
        </div>
        <span
          style={{
            fontSize: 12,
            color: "var(--text-tertiary)",
            whiteSpace: "nowrap",
          }}
        >
          命中 {matchedCount} 项
        </span>
      </div>

      {/* ===== 学习路线（阶段 + 任务卡） ===== */}
      {filtered.length === 0 ? (
        <div
          style={{
            padding: "48px 16px",
            textAlign: "center",
            color: "var(--text-tertiary)",
            fontSize: 14,
          }}
        >
          没有匹配的任务，换个关键词或筛选条件试试。
        </div>
      ) : (
        filtered.map(({ sec, tasks }) => (
          <section
            key={sec.id}
            id={sec.id}
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div>
              <h2
                style={{
                  fontSize: 21,
                  fontWeight: 800,
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ color: track.color }}>阶段 {sec.num} ·</span>
                {sec.title}
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--text-tertiary)",
                    border: "1px solid var(--border)",
                    borderRadius: 999,
                    padding: "2px 8px",
                    background: "var(--bg-card)",
                  }}
                >
                  命中 {tasks.length}/{sec.tasks.length}
                </span>
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  lineHeight: 1.7,
                  margin: "8px 0 0",
                }}
              >
                {sec.desc}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tasks.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  color={track.color}
                  done={!!done[t.id]}
                  onToggle={() => toggle(t.id)}
                />
              ))}
            </div>
          </section>
        ))
      )}

      {/* ===== 资源导航 ===== */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <h2
            style={{
              fontSize: 21,
              fontWeight: 800,
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ color: track.color }}>📚</span>
            资源导航
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.7,
              margin: "8px 0 0",
            }}
          >
            {track.title}轨道的官方文档、系统课程与工具平台，全部可溯源。
          </p>
        </div>
        {track.resources.map((cat) => (
          <div key={cat.category} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h3
              style={{
                fontSize: 15,
                fontWeight: 700,
                margin: 0,
                color: "var(--accent-strong)",
              }}
            >
              {cat.category}
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 10,
              }}
            >
              {cat.items.map((it) => (
                <ResourceCard key={it.url} item={it} />
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ===== 实战阶梯 ===== */}
      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <h2
            style={{
              fontSize: 21,
              fontWeight: 800,
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ color: track.color }}>🪜</span>
            实战阶梯
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.7,
              margin: "8px 0 0",
            }}
          >
            从入门到上线，逐档做出可运行作品。
          </p>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {track.ladder.map((l) => (
            <div
              key={l.level}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                transition: "var(--transition)",
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: 30,
                  height: 30,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 800,
                  background: `color-mix(in srgb, ${track.color} 16%, transparent)`,
                  color: track.color,
                }}
              >
                {l.level}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {l.project}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                    marginTop: 2,
                  }}
                >
                  {l.learn}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== 术语速查（公共） ===== */}
      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2
          style={{
            fontSize: 21,
            fontWeight: 800,
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ color: "var(--accent)" }}>📖</span>
          术语速查
        </h2>
        <details
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "14px 16px",
          }}
        >
          <summary
            style={{
              fontSize: 13,
              color: "var(--accent)",
              cursor: "pointer",
              fontWeight: 600,
              userSelect: "none",
            }}
          >
            展开/收起 {DATA.glossary.length} 个术语
          </summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            {DATA.glossary.map((g) => (
              <div key={g.term}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                  {g.term}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7, marginTop: 2 }}>
                  {g.plain}
                </div>
              </div>
            ))}
          </div>
        </details>
      </section>

      {/* 页脚说明 */}
      <footer
        style={{
          fontSize: 12,
          color: "var(--text-tertiary)",
          lineHeight: 1.7,
          borderTop: "1px solid var(--border)",
          paddingTop: 16,
          marginTop: 8,
        }}
      >
        内容为学习导航整理，非课程正文；版权归各自源项目所有（roadmap.sh / freeCodeCamp / Microsoft / The Odin Project / Full Stack Open 等）。数据更新于 {DATA.meta.updated}。
      </footer>

      {/* 回到顶部 */}
      {showTop && (
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            setShowTop(false);
          }}
          aria-label="回到顶部"
          title="回到顶部"
          style={{
            position: "fixed",
            right: 20,
            bottom: 24,
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "1px solid var(--border)",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            cursor: "pointer",
            boxShadow: "var(--shadow-card)",
            zIndex: 20,
          }}
        >
          ↑
        </button>
      )}
      <ScrollWatcher onShow={(v) => setShowTop(v)} />
    </div>
  );
}

/* ========== 任务卡 ========== */
function TaskCard({
  task,
  color,
  done,
  onToggle,
}: {
  task: GuideTask;
  color: string;
  done: boolean;
  onToggle: () => void;
}) {
  return (
    <article
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "var(--transition)",
      }}
    >
      {/* 标题行：勾选框 + 标题 + 标签 */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={done}
          aria-label={done ? `标记未完成：${task.title}` : `标记完成：${task.title}`}
          title={done ? "取消完成" : "标记完成"}
          style={{
            flexShrink: 0,
            width: 22,
            height: 22,
            marginTop: 1,
            borderRadius: 7,
            border: `1.5px solid ${done ? color : "var(--border-hover)"}`,
            background: done ? color : "transparent",
            color: done ? "#0a0a0f" : "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 800,
            lineHeight: 1,
            transition: "var(--transition)",
          }}
        >
          {done ? "✓" : ""}
        </button>
        <h3
          style={{
            fontSize: 15,
            fontWeight: 700,
            margin: 0,
            flex: 1,
            minWidth: 200,
            color: done ? "var(--text-tertiary)" : "var(--text-primary)",
            textDecoration: done ? "line-through" : "none",
            transition: "color 0.2s",
          }}
        >
          {task.title}
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {task.tags.map((t) => (
            <span
              key={t}
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                border: "1px solid var(--border)",
                borderRadius: 999,
                padding: "2px 8px",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* 说人话高亮块 */}
      {task.plain && (
        <div
          style={{
            borderLeft: `3px solid ${color}`,
            background: "var(--bg-secondary)",
            borderRadius: "0 var(--radius-md) var(--radius-md) 0",
            padding: "10px 12px",
            fontSize: 13,
            lineHeight: 1.7,
            color: "var(--text-primary)",
          }}
        >
          <span
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 700,
              color,
              marginBottom: 4,
            }}
          >
            说人话
          </span>
          {task.plain}
        </div>
      )}

      {/* 推荐资料 */}
      {task.links.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {task.links.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 12,
                color: "var(--accent)",
                border: "1px solid var(--border)",
                borderRadius: 999,
                padding: "3px 10px",
                textDecoration: "none",
                transition: "var(--transition)",
              }}
            >
              {l.text} ↗
            </a>
          ))}
        </div>
      )}

      {/* 产出要求 */}
      {task.output && (
        <div style={{ display: "flex", gap: 10, fontSize: 13, lineHeight: 1.7 }}>
          <span
            style={{
              flexShrink: 0,
              width: 40,
              fontWeight: 700,
              color: "var(--text-tertiary)",
            }}
          >
            产出
          </span>
          <span style={{ color: "var(--text-secondary)" }}>{task.output}</span>
        </div>
      )}
    </article>
  );
}

/* ========== 资源卡 ========== */
function ResourceCard({ item }: { item: GuideResource }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "12px 14px",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        textDecoration: "none",
        color: "inherit",
        transition: "var(--transition)",
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "var(--text-primary)",
          lineHeight: 1.5,
        }}
      >
        {item.title}
      </span>
      <span
        style={{
          fontSize: 12,
          color: "var(--text-secondary)",
          lineHeight: 1.6,
          flex: 1,
        }}
      >
        {item.desc}
      </span>
      <span
        style={{
          fontSize: 11,
          color: "var(--accent)",
          fontWeight: 600,
          wordBreak: "break-all",
        }}
      >
        打开 ↗
      </span>
    </a>
  );
}

/* ========== 滚动监听：超过一屏显示回到顶部按钮 ========== */
function ScrollWatcher({ onShow }: { onShow: (v: boolean) => void }) {
  const [last, setLast] = useState(false);
  useEffect(() => {
    const cb = () => {
      const v = window.scrollY > window.innerHeight;
      if (v !== last) {
        setLast(v);
        onShow(v);
      }
    };
    window.addEventListener("scroll", cb, { passive: true });
    cb();
    return () => window.removeEventListener("scroll", cb);
  }, [last, onShow]);
  return null;
}

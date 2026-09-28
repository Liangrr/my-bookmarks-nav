"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Bookmark {
  id: number;
  title: string;
  url: string;
  description: string | null;
  icon: string | null;
  category_id: number | null;
  size: string;
  sort_order: number;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  color: string;
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<{
    total_users: number;
    dau: number;
    online: number;
  } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [form, setForm] = useState({
    title: "",
    url: "",
    description: "",
    icon: "",
    category_id: 1,
    size: "normal",
  });
  const router = useRouter();

  const fetchBookmarks = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("bookmarks")
      .select("*")
      .order("sort_order");
    if (data) setBookmarks(data);
  }, []);

  const fetchCategories = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order");
    if (data) setCategories(data);
  }, []);

  const fetchStats = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.rpc("get_user_stats");
    if (data) setStats(data);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
        return;
      }

      supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", session.user.id)
        .maybeSingle()
        .then(({ data: profile }) => {
          if (!profile?.is_admin) {
            router.push("/");
            return;
          }

          setIsAdmin(true);
          Promise.all([fetchBookmarks(), fetchCategories(), fetchStats()]).then(
            () => setLoading(false)
          );
        });
    });
  }, [router, fetchBookmarks, fetchCategories, fetchStats]);

  // 弹窗：ESC 关闭 + 锁定背景滚动（与登录/注册弹窗一致）
  useEffect(() => {
    if (!showForm) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowForm(false);
        setEditingBookmark(null);
      }
    };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [showForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();

    if (editingBookmark) {
      await supabase
        .from("bookmarks")
        .update(form)
        .eq("id", editingBookmark.id);
    } else {
      await supabase.from("bookmarks").insert(form);
    }

    setShowForm(false);
    setEditingBookmark(null);
    resetForm();
    fetchBookmarks();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这个网站吗？")) return;
    const supabase = createClient();
    await supabase.from("bookmarks").delete().eq("id", id);
    fetchBookmarks();
  };

  const resetForm = () => {
    setForm({
      title: "",
      url: "",
      description: "",
      icon: "",
      category_id: 1,
      size: "normal",
    });
  };

  const getCategoryName = (id: number | null) => {
    return categories.find((c) => c.id === id)?.name || "未分类";
  };

  // 分类颜色：与首页 globals.css 的 slug 映射保持一致（frontend 绿 / work 紫 / ai-tools 粉 / tech-news 橙 / 默认蓝）
  const getCategoryColor = (id: number | null) => {
    const slug = categories.find((c) => c.id === id)?.slug || "";
    const map: Record<string, string> = {
      frontend: "#10b981",
      work: "#8b5cf6",
      "ai-tools": "#ec4899",
      "tech-news": "#f59e0b",
      common: "#3b82f6",
    };
    return map[slug] || "#3b82f6";
  };

  // 大小标识中文映射（与新增表单一致）
  const getSizeLabel = (size: string) => {
    const map: Record<string, string> = {
      normal: "普通",
      large: "大(2×2)",
      wide: "宽(2×1)",
      tall: "高(1×2)",
    };
    return map[size] || size;
  };

  if (loading || !isAdmin) {
    return (
      <div className="container text-center" style={{ paddingTop: 80, paddingBottom: 80 }}>
        <p style={{ color: "var(--text-secondary)" }}>加载中...</p>
      </div>
    );
  }

  return (
    <div className="container">
      {/* 用户统计 */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            {
              label: "总用户",
              value: stats.total_users,
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              ),
            },
            {
              label: "今日活跃",
              value: stats.dau,
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              ),
            },
            {
              label: "当前在线",
              value: stats.online,
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="4" />
                  <line x1="21.17" y1="8" x2="12" y2="8" />
                  <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
                  <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
                </svg>
              ),
            },
          ].map((s) => (
            <div
              key={s.label}
              className="group rounded-2xl p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                boxShadow: "0 0 0 0 transparent",
              }}
            >
              <div
                className="w-11 h-11 mx-auto mb-3 rounded-xl flex items-center justify-center"
                style={{
                  background: "var(--accent-glow)",
                  color: "var(--accent-light)",
                }}
              >
                {s.icon}
              </div>
              <p
                className="text-4xl font-bold mb-1"
                style={{ color: "var(--accent)", textShadow: "0 0 20px var(--accent-glow)" }}
              >
                {s.value}
              </p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">网站管理后台</h1>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingBookmark(null);
            resetForm();
          }}
          className="px-5 py-2.5 rounded-xl font-medium transition-all hover:scale-105"
          style={{ background: "var(--accent)", color: "white" }}
        >
          + 新增网站
        </button>
      </div>

      {/* 新增/编辑弹窗（与登录/注册弹窗同款样式） */}
      {showForm && (
        <div
          onClick={() => {
            setShowForm(false);
            setEditingBookmark(null);
          }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "32px",
              position: "relative",
              maxHeight: "calc(100vh - 40px)",
              overflowY: "auto",
            }}
          >
            {/* 关闭按钮（同登录/注册弹窗） */}
            <button
              onClick={() => {
                setShowForm(false);
                setEditingBookmark(null);
              }}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                border: "none",
                background: "var(--bg-card)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                transition: "var(--transition)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-card-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--bg-card)";
              }}
            >
              ×
            </button>

            <h2 className="text-2xl font-bold mb-6 text-center">
              {editingBookmark ? "编辑网站" : "新增网站"}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">网站名称</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                className="w-full px-4 py-2.5 rounded-xl outline-none"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">网址</label>
              <input
                type="text"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                required
                placeholder="example.com"
                className="w-full px-4 py-2.5 rounded-xl outline-none"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-sm font-medium mb-1">描述</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl outline-none resize-none"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">图标（1-2个字母）</label>
              <input
                type="text"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                maxLength={2}
                className="w-full px-4 py-2.5 rounded-xl outline-none"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">分类</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl outline-none"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">卡片大小</label>
              <select
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl outline-none"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              >
                <option value="normal">普通</option>
                <option value="large">大（2x2）</option>
                <option value="wide">宽（2x1）</option>
                <option value="tall">高（1x2）</option>
              </select>
            </div>
            <div className="col-span-1 sm:col-span-2 flex gap-3 justify-center mt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl font-medium transition-all hover:scale-105"
                style={{ background: "var(--accent)", color: "white" }}
              >
                {editingBookmark ? "保存修改" : "添加"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingBookmark(null);
                }}
                className="px-5 py-2.5 rounded-xl font-medium transition-all hover:scale-105"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                }}
              >
                取消
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

      {/* 网站列表（方案A：现代表格，hover 左侧主题色竖条） */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        {/* 表头 */}
        <div
          className="grid grid-cols-[1fr_118px_84px_110px] items-center gap-3 px-5 py-3 text-[13px]"
          style={{
            color: "var(--text-tertiary)",
            background: "var(--bg-glass)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span>网站</span>
          <span className="text-center">分类</span>
          <span className="text-center">大小</span>
          <span className="text-right">操作</span>
        </div>

        {bookmarks.map((bookmark) => {
          const catColor = getCategoryColor(bookmark.category_id);
          const iconChar = (bookmark.icon || bookmark.title.charAt(0)).toUpperCase();
          return (
            <div
              key={bookmark.id}
              className="admin-row grid grid-cols-[1fr_118px_84px_110px] items-center gap-3 px-5 py-3"
              style={{
                borderBottom: "1px solid var(--border)",
                // @ts-expect-error CSS 自定义属性
                "--card-accent": catColor,
              }}
            >
              {/* 网站：首字母彩色图标 + 标题/域名两行 */}
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center font-bold text-sm shrink-0"
                  style={{ background: catColor + "1f", color: catColor }}
                >
                  {iconChar}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{bookmark.title}</p>
                  <p className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>
                    {bookmark.url}
                  </p>
                </div>
              </div>

              {/* 分类彩色胶囊 */}
              <div className="flex justify-center">
                <span
                  className="whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium"
                  style={{
                    color: catColor,
                    background: catColor + "1f",
                    border: "1px solid " + catColor + "55",
                  }}
                >
                  {getCategoryName(bookmark.category_id)}
                </span>
              </div>

              {/* 大小 */}
              <span
                className="text-xs text-center"
                style={{ color: "var(--text-secondary)" }}
              >
                {getSizeLabel(bookmark.size)}
              </span>

              {/* 操作：图标按钮 */}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setEditingBookmark(bookmark);
                    setForm({
                      title: bookmark.title,
                      url: bookmark.url,
                      description: bookmark.description || "",
                      icon: bookmark.icon || "",
                      category_id: bookmark.category_id || 1,
                      size: bookmark.size,
                    });
                    setShowForm(true);
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg-card-hover)";
                    e.currentTarget.style.color = "var(--accent-light)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                  title="编辑"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(bookmark.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(239,68,68,0.1)";
                    e.currentTarget.style.color = "#f87171";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                  title="删除"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

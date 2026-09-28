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

  if (loading || !isAdmin) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-20 text-center">
        <p style={{ color: "var(--text-secondary)" }}>加载中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
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

      {/* 新增/编辑表单 */}
      {showForm && (
        <div
          className="rounded-2xl p-6 mb-8"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <h2 className="text-xl font-semibold mb-4">
            {editingBookmark ? "编辑网站" : "新增网站"}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
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
            <div className="col-span-2">
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
            <div className="col-span-2 flex gap-3">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl font-medium"
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
                className="px-5 py-2.5 rounded-xl font-medium"
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
      )}

      {/* 网站列表 */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="text-center px-6 py-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>网站</th>
              <th className="text-center px-6 py-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>分类</th>
              <th className="text-center px-6 py-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>大小</th>
              <th className="text-center px-6 py-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {bookmarks.map((bookmark) => (
              <tr
                key={bookmark.id}
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <td className="px-6 py-4 text-center">
                  <p className="font-medium">{bookmark.title}</p>
                  <p className="text-sm break-all" style={{ color: "var(--text-tertiary)" }}>
                    {bookmark.url}
                  </p>
                </td>
                <td className="px-6 py-4 text-sm text-center">
                  {getCategoryName(bookmark.category_id)}
                </td>
                <td className="px-6 py-4 text-sm text-center" style={{ color: "var(--text-secondary)" }}>
                  {bookmark.size}
                </td>
                <td className="px-6 py-4 text-center">
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
                    className="text-sm mr-4"
                    style={{ color: "var(--accent-light)" }}
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(bookmark.id)}
                    className="text-sm"
                    style={{ color: "#ef4444" }}
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

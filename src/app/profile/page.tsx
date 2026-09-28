"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { AvatarUploader } from "@/components/avatar-uploader";
import type { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_admin: boolean;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const [form, setForm] = useState({
    username: "",
    full_name: "",
    avatar_url: "",
    bio: "",
  });

  const fetchProfile = useCallback(async (userId: string) => {
    const supabase = createClient();
    const data = await getOrCreateProfile<Profile>(supabase, userId);

    if (data) {
      setProfile(data);
      setForm({
        username: data.username || "",
        full_name: data.full_name || "",
        avatar_url: data.avatar_url || "",
        bio: data.bio || "",
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);
      fetchProfile(session.user.id);
    });
  }, [router, fetchProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          username: form.username,
          full_name: form.full_name,
          avatar_url: form.avatar_url || null,
          bio: form.bio,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      setMessage("保存成功！");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <p style={{ color: "var(--text-secondary)" }}>加载中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">个人中心</h1>

      {message && (
        <div
          className="mb-6 p-3 rounded-lg text-sm"
          style={{
            background: message.includes("成功")
              ? "rgba(16, 185, 129, 0.1)"
              : "rgba(239, 68, 68, 0.1)",
            color: message.includes("成功") ? "#10b981" : "#ef4444",
          }}
        >
          {message}
        </div>
      )}

      <div
        className="rounded-2xl p-8 mb-6"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-4 mb-8">
          {user && (
            <AvatarUploader
              userId={user.id}
              avatarUrl={form.avatar_url || null}
              displayName={
                form.full_name?.charAt(0) ||
                user?.email?.charAt(0)?.toUpperCase() ||
                "?"
              }
              onAvatarChange={(url) =>
                setForm((f) => ({ ...f, avatar_url: url || "" }))
              }
            />
          )}
          <div>
            <p className="font-semibold text-lg">{form.full_name || "未设置昵称"}</p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {user?.email}
            </p>
            {profile?.is_admin && (
              <span
                className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(139, 92, 246, 0.2)",
                  color: "#a78bfa",
                }}
              >
                管理员
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">昵称</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl outline-none transition-all"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
              placeholder="你的昵称"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              用户名（唯一，不可修改）
            </label>
            <input
              type="text"
              value={form.username}
              disabled
              className="w-full px-4 py-3 rounded-xl outline-none transition-all"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
                opacity: "0.7",
                cursor: "not-allowed",
              }}
              placeholder="用户名"
            />
            <p className="text-xs mt-1.5" style={{ color: "var(--text-secondary)" }}>
              用户名用于登录且全局唯一，注册后不可修改
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">个人简介</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 rounded-xl outline-none transition-all resize-none"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
              placeholder="介绍一下自己吧..."
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl font-medium transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{ background: "var(--accent)", color: "white" }}
          >
            {saving ? "保存中..." : "保存修改"}
          </button>
        </form>
      </div>
    </div>
  );
}

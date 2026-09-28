"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { AvatarUploader } from "./avatar-uploader";
import type { User } from "@supabase/supabase-js";

interface ProfileModalProps {
  onClose: () => void;
}

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_admin: boolean;
}

export function ProfileModal({ onClose }: ProfileModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";

    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        onClose();
        return;
      }
      setUser(session.user);
      fetchProfile(session.user.id);
    });

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [onClose, fetchProfile]);

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

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    onClose();
    window.location.reload();
  };

  return (
    <div
      onClick={onClose}
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
          maxWidth: "440px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "32px",
          position: "relative",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
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

        <h1
          style={{
            fontSize: "24px",
            fontWeight: "700",
            marginBottom: "8px",
            textAlign: "center",
          }}
        >
          个人中心
        </h1>

        {loading ? (
          <p
            style={{
              fontSize: "14px",
              color: "var(--text-secondary)",
              textAlign: "center",
              padding: "40px 0",
            }}
          >
            加载中...
          </p>
        ) : (
          <>
            {/* 用户信息 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                marginBottom: "24px",
                padding: "16px",
                background: "var(--bg-card)",
                borderRadius: "var(--radius-md)",
              }}
            >
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
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "16px", fontWeight: "600", marginBottom: "2px" }}>
                  {form.full_name || "未设置昵称"}
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                    marginBottom: profile?.is_admin ? "4px" : "0",
                  }}
                >
                  {user?.email}
                </p>
                {profile?.is_admin && (
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: "11px",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-full)",
                      background: "rgba(139, 92, 246, 0.2)",
                      color: "#a78bfa",
                    }}
                  >
                    管理员
                  </span>
                )}
              </div>
            </div>

            {message && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "12px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "13px",
                  background: message.includes("成功")
                    ? "rgba(16, 185, 129, 0.1)"
                    : "rgba(239, 68, 68, 0.1)",
                  color: message.includes("成功") ? "#10b981" : "#ef4444",
                }}
              >
                {message}
              </div>
            )}

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "500",
                    marginBottom: "8px",
                    color: "var(--text-secondary)",
                  }}
                >
                  昵称
                </label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    outline: "none",
                    fontFamily: "inherit",
                    transition: "var(--transition)",
                  }}
                  placeholder="你的昵称"
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-glow)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "500",
                    marginBottom: "8px",
                    color: "var(--text-secondary)",
                  }}
                >
                  用户名（唯一，不可修改）
                </label>
                <input
                  type="text"
                  value={form.username}
                  disabled
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
                    color: "var(--text-secondary)",
                    fontSize: "14px",
                    outline: "none",
                    fontFamily: "inherit",
                    opacity: "0.7",
                    cursor: "not-allowed",
                  }}
                  placeholder="用户名"
                />
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    marginTop: "6px",
                  }}
                >
                  用户名用于登录且全局唯一，注册后不可修改
                </p>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "500",
                    marginBottom: "8px",
                    color: "var(--text-secondary)",
                  }}
                >
                  个人简介
                </label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    outline: "none",
                    fontFamily: "inherit",
                    transition: "var(--transition)",
                    resize: "none",
                  }}
                  placeholder="介绍一下自己吧..."
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-glow)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--accent)",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "500",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "var(--transition)",
                  marginTop: "8px",
                  opacity: saving ? "0.6" : "1",
                }}
                onMouseEnter={(e) => {
                  if (!saving) e.currentTarget.style.opacity = "0.9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = saving ? "0.6" : "1";
                }}
              >
                {saving ? "保存中..." : "保存修改"}
              </button>
            </form>

            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "var(--radius-md)",
                background: "rgba(239, 68, 68, 0.1)",
                color: "#ef4444",
                fontSize: "14px",
                fontWeight: "500",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "var(--transition)",
                marginTop: "12px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
              }}
            >
              退出登录
            </button>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface AuthModalProps {
  mode: "login" | "signup";
  onClose: () => void;
  onSwitchMode: (mode: "login" | "signup") => void;
}

export function AuthModal({ mode, onClose, onSwitchMode }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginType, setLoginType] = useState<"email" | "username">("username");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const getAuthEmail = () => {
    if (mode === "signup" && loginType === "username") {
      return `${username}@bookmark-nav.local`;
    }
    if (mode === "login" && loginType === "username") {
      return `${email}@bookmark-nav.local`;
    }
    return email;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const authEmail = getAuthEmail();

      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password,
          options: {
            data: {
              username: loginType === "username" ? username : email.split("@")[0],
              nickname: loginType === "username" ? username : email.split("@")[0],
            },
          },
        });
        if (error) throw error;
      }
      onClose();
      window.location.reload();
    } catch (err: any) {
      setError(err.message || (mode === "login" ? "登录失败，请检查账号和密码" : "注册失败，请稍后重试"));
    } finally {
      setLoading(false);
    }
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
          maxWidth: "400px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "32px",
          position: "relative",
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
          {mode === "login" ? "欢迎回来" : "创建账号"}
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "var(--text-secondary)",
            marginBottom: "24px",
            textAlign: "center",
          }}
        >
          {mode === "login" ? "登录你的账号继续" : "注册后即可同步你的收藏"}
        </p>

        {/* 登录方式切换 */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "20px",
            background: "var(--bg-card)",
            padding: "4px",
            borderRadius: "var(--radius-md)",
          }}
        >
          <button
            onClick={() => setLoginType("username")}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: loginType === "username" ? "var(--accent)" : "transparent",
              color: loginType === "username" ? "white" : "var(--text-secondary)",
              fontSize: "13px",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "var(--transition)",
            }}
          >
            用户名
          </button>
          <button
            onClick={() => setLoginType("email")}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: loginType === "email" ? "var(--accent)" : "transparent",
              color: loginType === "email" ? "white" : "var(--text-secondary)",
              fontSize: "13px",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "var(--transition)",
            }}
          >
            邮箱
          </button>
        </div>

        {error && (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
              background: "rgba(239, 68, 68, 0.1)",
              color: "#ef4444",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
              {loginType === "email" ? "邮箱" : "用户名"}
            </label>
            <input
              type={loginType === "email" ? "email" : "text"}
              value={loginType === "email" ? email : username}
              onChange={(e) => {
                if (loginType === "email") {
                  setEmail(e.target.value);
                } else {
                  setUsername(e.target.value);
                }
              }}
              required
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
              placeholder={loginType === "email" ? "your@email.com" : "请输入用户名"}
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
              密码
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "12px 48px 12px 16px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  outline: "none",
                  fontFamily: "inherit",
                  transition: "var(--transition)",
                }}
                placeholder="••••••••"
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-glow)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--text-tertiary)",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
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
              opacity: loading ? "0.6" : "1",
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = loading ? "0.6" : "1";
            }}
          >
            {loading ? "处理中..." : mode === "login" ? "登录" : "注册"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            marginTop: "20px",
            fontSize: "13px",
            color: "var(--text-secondary)",
          }}
        >
          {mode === "login" ? "还没有账号？" : "已有账号？"}{" "}
          <button
            onClick={() => onSwitchMode(mode === "login" ? "signup" : "login")}
            style={{
              background: "none",
              border: "none",
              color: "var(--accent-light)",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "500",
              fontFamily: "inherit",
              padding: "0",
            }}
          >
            {mode === "login" ? "立即注册" : "直接登录"}
          </button>
        </p>
      </div>
    </div>
  );
}

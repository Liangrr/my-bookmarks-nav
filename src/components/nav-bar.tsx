"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import type { User } from "@supabase/supabase-js";
import { AuthModal } from "./auth-modal";
import { ProfileModal } from "./profile-modal";

export function NavBar() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("nav-theme") as "dark" | "light" | null) ?? "dark";
  });
  const [accent, setAccent] = useState<string>(() => {
    if (typeof window === "undefined") return "cyan";
    return localStorage.getItem("nav-accent") ?? "cyan";
  });
  const [user, setUser] = useState<User | null>(null);
  const uidRef = useRef<string | null>(null);
  const applyUser = useCallback((u: User | null) => {
    const uid = u?.id ?? null;
    if (uidRef.current === uid) return; // 同一用户不重复 setState，避免 useEffect([user]) 重复拉取 profile
    uidRef.current = uid;
    setUser(u);
  }, []);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [authModal, setAuthModal] = useState<"login" | "signup" | null>(null);
  const [profileModal, setProfileModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();

  // 挂载检测：服务端与首次客户端渲染返回 false，水合后再切 true，避免在 effect 里同步 setState
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-accent", accent);
  }, [accent]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      applyUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [applyUser]);

  // 抽屉菜单：ESC 关闭 + 展开时锁定背景滚动
  useEffect(() => {
    if (!menuOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // 登录后拉取头像与昵称
  useEffect(() => {
    if (!user) {
      setAvatarUrl(null);
      setNickname("");
      return;
    }
    const supabase = createClient();
    getOrCreateProfile<{
      avatar_url: string | null;
      full_name: string | null;
      is_admin: boolean | null;
    }>(supabase, user.id).then((p) => {
      setAvatarUrl(p?.avatar_url || null);
      setNickname(p?.full_name || "");
      setIsAdmin(p?.is_admin || false);
    });
  }, [user]);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("nav-theme", newTheme);
  };

  const changeAccent = (id: string) => {
    setAccent(id);
    localStorage.setItem("nav-accent", id);
  };

  const ACCENTS = [
    { id: "cyan", color: "#22d3ee", name: "极光青" },
    { id: "neon", color: "#a855f7", name: "赛博霓虹" },
    { id: "space", color: "#60a5fa", name: "星际深空" },
    { id: "sakura", color: "#f472b6", name: "樱粉次元" },
  ];

  if (!mounted) return null;

  return (
    <>
      <nav className="nav-bar">
        <button
          className="nav-logo"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label="展开菜单"
          title="菜单"
          style={{
            cursor: "pointer",
            background: "none",
            border: "none",
            fontFamily: "inherit",
            color: "inherit",
            padding: 0,
          }}
        >
          <div className="nav-logo-icon">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="星轨" />
          </div>
          <span>星轨</span>
        </button>
        <div className="nav-actions">
          {user ? (
            <>
              <button
                onClick={() => setProfileModal(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14px",
                  color: "var(--text-secondary)",
                  padding: "6px 16px 6px 6px",
                  borderRadius: "100px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-card)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "var(--transition)",
                }}
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt="头像"
                    width={28}
                    height={28}
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <span
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                      fontWeight: "700",
                      background: "var(--accent)",
                      color: "white",
                    }}
                  >
                    {nickname?.charAt(0) ||
                      user?.email?.charAt(0)?.toUpperCase() ||
                      "?"}
                  </span>
                )}
                {nickname || "个人中心"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setAuthModal("login")}
                style={{
                  fontSize: "14px",
                  color: "var(--text-secondary)",
                  padding: "8px 16px",
                  borderRadius: "100px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-card)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "var(--transition)",
                }}
              >
                登录
              </button>
              <button
                onClick={() => setAuthModal("signup")}
                style={{
                  fontSize: "14px",
                  color: "white",
                  padding: "8px 16px",
                  borderRadius: "100px",
                  border: "1px solid var(--accent)",
                  background: "var(--accent)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "var(--transition)",
                }}
              >
                注册
              </button>
            </>
          )}
          <div className="accent-picker" title="主题色">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                className={`accent-dot ${accent === a.id ? "active" : ""}`}
                style={{ background: a.color }}
                onClick={() => changeAccent(a.id)}
                aria-label={a.name}
              />
            ))}
          </div>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title="切换主题"
          >
            {theme === "dark" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* 抽屉菜单：点 Logo 展开/收起；遮罩、ESC 关闭；分类属于首页，不进菜单 */}
      <div
        className={`drawer-overlay ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden={!menuOpen}
      />
      <aside
        className={`drawer ${menuOpen ? "open" : ""}`}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        <div className="drawer-head">
          <div className="nav-logo-icon">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="星轨" />
          </div>
          <span>星轨</span>
        </div>
        <nav className="drawer-nav">
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className={`drawer-item ${pathname === "/" ? "active" : ""}`}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9.5 12 3l9 6.5" />
              <path d="M5 10.5V21h14V10.5" />
            </svg>
            <span>首页</span>
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setMenuOpen(false)}
              className={`drawer-item ${pathname.startsWith("/admin") ? "active" : ""}`}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>管理后台</span>
            </Link>
          )}
          <Link
            href="/market"
            onClick={() => setMenuOpen(false)}
            className={`drawer-item ${pathname === "/market" ? "active" : ""}`}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="M7 15l3-5 4 3 5-8" />
            </svg>
            <span>实时行情</span>
          </Link>
          <Link
            href="/about"
            onClick={() => setMenuOpen(false)}
            className={`drawer-item ${pathname === "/about" ? "active" : ""}`}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8h.01" />
              <path d="M11 12h1v5h1" />
            </svg>
            <span>关于</span>
          </Link>
        </nav>
        <div className="drawer-foot">星轨 · 精选网站导航</div>
      </aside>

      {authModal && (
        <AuthModal
          mode={authModal}
          onClose={() => setAuthModal(null)}
          onSwitchMode={(mode) => setAuthModal(mode)}
        />
      )}

      {profileModal && <ProfileModal onClose={() => setProfileModal(false)} />}
    </>
  );
}

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
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
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
          ) : (
            <button
              className="theme-toggle"
              onClick={() => setAuthModal("login")}
              title="登录 / 注册"
              aria-label="登录 / 注册"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
          )}
          <div className="theme-popover-wrap">
            <button
              className="theme-toggle"
              onClick={() => setThemeMenuOpen((v) => !v)}
              title="主题设置"
              aria-label="主题设置"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22a10 10 0 1 1 10-10c0 1.66-1.34 3-3 3h-2.5a2.5 2.5 0 0 0-1.8 4.2c.34.4.55.83.55 1.25 0 1.1-.9 1.55-2.25 1.55z" />
                <circle cx="7.5" cy="11.5" r="1" />
                <circle cx="10.5" cy="7.5" r="1" />
                <circle cx="14.5" cy="7.5" r="1" />
                <circle cx="16.5" cy="11.5" r="1" />
              </svg>
            </button>
            {themeMenuOpen && (
              <>
                <div className="theme-popover">
                  <div className="popover-section">
                    <div className="popover-label">主题色</div>
                    <div className="popover-row">
                      {ACCENTS.map((a) => (
                        <button
                          key={a.id}
                          className={`accent-dot ${accent === a.id ? "active" : ""}`}
                          style={{ background: a.color }}
                          onClick={() => changeAccent(a.id)}
                          aria-label={a.name}
                          title={a.name}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="popover-section">
                    <div className="popover-label">外观</div>
                    <button
                      className="popover-theme-btn"
                      onClick={() => {
                        toggleTheme();
                        setThemeMenuOpen(false);
                      }}
                    >
                      {theme === "dark" ? (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
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
                          浅色模式
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                          </svg>
                          深色模式
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="popover-mask" onClick={() => setThemeMenuOpen(false)} />
              </>
            )}
          </div>
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
            href="/convert"
            onClick={() => setMenuOpen(false)}
            className={`drawer-item ${pathname === "/convert" ? "active" : ""}`}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3l4 4-4 4" />
              <path d="M21 7H8a4 4 0 0 0-4 4v2" />
              <path d="M7 21l-4-4 4-4" />
              <path d="M3 17h13a4 4 0 0 0 4-4v-2" />
            </svg>
            <span>格式转换</span>
          </Link>
          <Link
            href="/learn-agents"
            onClick={() => setMenuOpen(false)}
            className={`drawer-item ${pathname === "/learn-agents" ? "active" : ""}`}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="8" width="14" height="10" rx="2" />
              <circle cx="9.5" cy="13" r="1" />
              <circle cx="14.5" cy="13" r="1" />
              <path d="M12 8V5" />
              <circle cx="12" cy="3.5" r="1" />
              <path d="M2 13h3M19 13h3" />
            </svg>
            <span>AI Agent 学习</span>
          </Link>
          <Link
            href="/agents"
            onClick={() => setMenuOpen(false)}
            className={`drawer-item ${pathname === "/agents" ? "active" : ""}`}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="8" width="16" height="12" rx="2" />
              <path d="M12 8V5" />
              <circle cx="9" cy="13" r="1" />
              <circle cx="15" cy="13" r="1" />
              <path d="M9 17h6" />
            </svg>
            <span>智能体市场</span>
          </Link>
          <Link
            href="/learn-dev"
            onClick={() => setMenuOpen(false)}
            className={`drawer-item ${pathname === "/learn-dev" ? "active" : ""}`}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 6l-5 6 5 6" />
              <path d="M16 6l5 6-5 6" />
            </svg>
            <span>Web 开发学习</span>
          </Link>
          <Link
            href="/indie-dev"
            onClick={() => setMenuOpen(false)}
            className={`drawer-item ${pathname === "/indie-dev" ? "active" : ""}`}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span>独立开发者</span>
          </Link>
          <Link
            href="/living"
            onClick={() => setMenuOpen(false)}
            className={`drawer-item ${pathname === "/living" ? "active" : ""}`}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a6 6 0 0 0-6 6c0 2 .8 3 2 4v3h8v-3c1.2-1 2-2 2-4a6 6 0 0 0-6-6z" />
              <path d="M10 21h4" />
            </svg>
            <span>人生手册</span>
          </Link>
          <Link
            href="/survival"
            onClick={() => setMenuOpen(false)}
            className={`drawer-item ${pathname === "/survival" ? "active" : ""}`}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 20 9 8l4 7 3-4 5 9z" />
              <circle cx="17" cy="5" r="1.6" />
            </svg>
            <span>野外求生手册</span>
          </Link>
          <Link
            href="/tcm"
            onClick={() => setMenuOpen(false)}
            className={`drawer-item ${pathname === "/tcm" ? "active" : ""}`}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21c-4-2-7-5-7-9a7 7 0 0 1 14 0c0 4-3 7-7 9z" />
              <path d="M12 12c-1.5-1.5-2-3-2-4.5" />
              <path d="M12 12c1.5-1.5 2-3 2-4.5" />
              <path d="M12 12v5" />
            </svg>
            <span>中医养生手册</span>
          </Link>
          <Link
            href="/emergency"
            onClick={() => setMenuOpen(false)}
            className={`drawer-item ${pathname === "/emergency" ? "active" : ""}`}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20" />
              <path d="M4 12h16" />
              <path d="M5 7l14 10" />
              <path d="M19 7L5 17" />
            </svg>
            <span>急救知识手册</span>
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

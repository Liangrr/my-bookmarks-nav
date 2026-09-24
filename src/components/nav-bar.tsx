"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthModal } from "./auth-modal";
import { ProfileModal } from "./profile-modal";

export function NavBar() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [authModal, setAuthModal] = useState<"login" | "signup" | null>(null);
  const [profileModal, setProfileModal] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("nav-theme") as "dark" | "light" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }

    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("nav-theme", newTheme);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (!mounted) return null;

  return (
    <>
      <nav className="nav-bar">
        <div className="nav-logo">
          <div className="nav-logo-icon">
            <svg viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <span>我的收藏夹</span>
        </div>
        <div className="nav-actions">
          {user ? (
            <>
              <button
                onClick={() => setProfileModal(true)}
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
                个人中心
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

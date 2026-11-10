"use client";

import { useEffect, useRef, useState } from "react";

export interface StarMapCategory {
  id: number;
  name: string;
  slug: string;
  color: string;
}
export interface StarMapBookmark {
  id: number;
  title: string;
  url: string;
  description: string | null;
  icon: string | null;
  category_id: number | null;
  size: string;
}

type StarMapApi = {
  setCategory: (id: number | "all") => void;
  setSearch: (q: string) => void;
  dispose: () => void;
};
type StarMapWindow = Window & { __STARMAP__?: { dispose: () => void } };

/** 浏览器能力探测：无 WebGL2 时首页不显示「星图」入口，自动停留在卡片视图。 */
export function canUseStarMap(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

interface StarMapProps {
  categories: StarMapCategory[];
  bookmarks: StarMapBookmark[];
  searchQuery: string;
  activeCategory: number | "all";
  onCategory: (id: number | "all") => void;
}

export function StarMap({
  categories,
  bookmarks,
  searchQuery,
  activeCategory,
  onCategory,
}: StarMapProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<StarMapApi | null>(null);
  const latestRef = useRef({ activeCategory, searchQuery, onCategory });
  const [failed, setFailed] = useState(false);

  // 模块加载是异步的，完成后用最新 props 初始化，避免水合前状态变化丢失
  useEffect(() => {
    latestRef.current = { activeCategory, searchQuery, onCategory };
  }, [activeCategory, searchQuery, onCategory]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = "/starfield/starmap.js";
        const mod = await import(/* webpackIgnore: true */ url);
        if (cancelled || !hostRef.current) return;
        (window as StarMapWindow).__STARMAP__?.dispose();
        const api = (mod as {
          mountStarMap: (
            host: HTMLElement,
            data: { categories: StarMapCategory[]; bookmarks: StarMapBookmark[] },
            options: { onCategory: (id: number | "all") => void },
          ) => StarMapApi | null;
        }).mountStarMap(
          hostRef.current,
          { categories, bookmarks },
          { onCategory: (id) => latestRef.current.onCategory(id) },
        );
        if (!api) {
          if (!cancelled) setFailed(true);
          return;
        }
        apiRef.current = api;
        api.setCategory(latestRef.current.activeCategory);
        api.setSearch(latestRef.current.searchQuery);
      } catch (err) {
        console.warn("[starmap] 模块加载失败", err);
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      apiRef.current?.dispose();
      apiRef.current = null;
    };
    // 分类 / 书签是静态 JSON，只在挂载时构建一次几何体
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    apiRef.current?.setCategory(activeCategory);
  }, [activeCategory]);

  useEffect(() => {
    apiRef.current?.setSearch(searchQuery);
  }, [searchQuery]);

  return (
    <div className="starmap-shell">
      <div ref={hostRef} className="starmap-host" />
      {failed && (
        <div className="starmap-fallback">
          当前环境无法启动 WebGL2 星图，请切回「卡片」视图。
        </div>
      )}
    </div>
  );
}

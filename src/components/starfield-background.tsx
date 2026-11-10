"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

type StarfieldApi = { dispose: () => void; pause: (v: boolean) => void };
type StarfieldWindow = Window & { __STARFIELD__?: StarfieldApi };

/**
 * 全站活体星野背景。
 * 3D 模块放在 public/starfield/，用浏览器原生 ES Module 动态加载，
 * 不进入 Next 打包图；主题、明暗、暂停均由模块自行监听 DOM，无需 React 参与重渲染。
 * 沉浸页 /end-of-time 有自己的 WebGL 场景，这里主动卸载以释放上下文。
 * 用户可用 localStorage 的 nav-starfield=off 关闭。
 */
export function StarfieldBackground() {
  const hostRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const immersive = pathname === "/end-of-time";

  useEffect(() => {
    if (immersive) return;
    if (window.localStorage.getItem("nav-starfield") === "off") return;

    let cancelled = false;
    let api: StarfieldApi | null = null;

    (async () => {
      try {
        // webpackIgnore：public 下的运行时模块，保留浏览器原生 import
        const url = "/starfield/starfield.js";
        const mod = await import(/* webpackIgnore: true */ url);
        if (cancelled || !hostRef.current) return;
        (window as StarfieldWindow).__STARFIELD__?.dispose();
        api = (mod as { mountStarfield: (h: HTMLElement) => StarfieldApi | null })
          .mountStarfield(hostRef.current);
      } catch (err) {
        console.warn("[starfield] 模块加载失败，保留原有 CSS 光晕", err);
      }
    })();

    return () => {
      cancelled = true;
      api?.dispose();
    };
  }, [immersive]);

  if (immersive) return null;
  return <div ref={hostRef} className="starfield-layer" aria-hidden="true" />;
}

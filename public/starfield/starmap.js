/* 星轨 · 星图导航
 * 把 navigation.json 的分类映射为星座、书签映射为星点。
 * 单个 THREE.Points 承担全部星点，raycaster 拾取，DOM 标签投影到屏幕。
 * 与站点搜索框 / 分类 tab / 主题包实时联动；模块独立于 Next 构建。
 */
import * as THREE from "../vendor/three.module.js";

const VERT = `
attribute vec3 aColor;
attribute float aSize;
attribute float aSeed;
attribute float aMatch;
attribute float aCat;
uniform float uPR;
uniform float uTime;
uniform float uHasSearch;
uniform float uFocusCat;
varying vec3 vColor;
varying float vAlpha;
varying float vSeed;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float depth = max(-mv.z, 1.0);
  gl_Position = projectionMatrix * mv;
  float focus = uFocusCat < -0.5
    ? 1.0
    : 1.0 - smoothstep(0.0, 0.6, abs(aCat - uFocusCat)) * 0.76;
  float matched = mix(0.16, 1.0, aMatch);
  float searchDim = mix(1.0, matched, uHasSearch);
  float twinkle = 0.84 + 0.16 * sin(uTime * (0.9 + aSeed * 2.1) + aSeed * 31.0);
  vAlpha = focus * searchDim * twinkle;
  vColor = aColor;
  vSeed = aSeed;
  float boost = mix(1.0, 1.7, aMatch * uHasSearch);
  gl_PointSize = clamp(aSize * uPR * boost * (330.0 / depth), 1.2, 36.0);
}
`;

const FRAG = `
precision highp float;
varying vec3 vColor;
varying float vAlpha;
varying float vSeed;
uniform float uLight;
void main(){
  vec2 q = gl_PointCoord - 0.5;
  float d = length(q);
  if (d > 0.5) discard;
  float core = exp(-d * d * 72.0);
  float halo = exp(-d * d * 11.0) * 0.30;
  float spike = exp(-abs(q.x) * 74.0) * exp(-abs(q.y) * 9.0)
              + exp(-abs(q.y) * 74.0) * exp(-abs(q.x) * 9.0);
  spike *= smoothstep(0.62, 0.97, vSeed) * 0.50;
  float alpha = (core + halo * 0.5 + spike * 0.35) * vAlpha;
  vec3 col = vColor * (core * 1.30 + halo + spike) + vec3(1.0) * core * 0.40;
  col = mix(col, vec3(0.10, 0.16, 0.32) + vColor * 0.28, uLight);
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
`;

function hash(n) {
  let x = Math.sin(n * 127.1 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}
function hexOrRgb(value, fallback) {
  const v = String(value || "").trim();
  if (v.startsWith("#")) {
    let h = v.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length >= 6) {
      return [
        parseInt(h.slice(0, 2), 16) / 255,
        parseInt(h.slice(2, 4), 16) / 255,
        parseInt(h.slice(4, 6), 16) / 255,
      ];
    }
  }
  const parts = v.match(/[\d.]+/g);
  if (v.startsWith("rgb") && parts && parts.length >= 3) {
    return [Number(parts[0]) / 255, Number(parts[1]) / 255, Number(parts[2]) / 255];
  }
  return fallback.slice();
}
const lerp = (a, b, t) => a + (b - a) * t;

export function mountStarMap(host, data, options = {}) {
  if (!host) return null;
  const categories = Array.isArray(data?.categories) ? data.categories : [];
  const bookmarks = Array.isArray(data?.bookmarks) ? data.bookmarks : [];
  if (!bookmarks.length) return null;

  const probe = document.createElement("canvas");
  const gl = probe.getContext("webgl2");
  if (!gl) return null;
  gl.getExtension("WEBGL_lose_context")?.loseContext();

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  } catch (err) {
    console.warn("[starmap] WebGL2 初始化失败", err);
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  const cnv = renderer.domElement;
  cnv.className = "starmap-canvas";
  host.appendChild(cnv);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
  const group = new THREE.Group();
  scene.add(group);

  const n = bookmarks.length;
  const catIndexById = new Map(categories.map((c, i) => [c.id, i]));
  const M = Math.max(1, categories.length);
  const baseTint = categories.map((c, i) =>
    hexOrRgb(c.color, [0.35 + 0.13 * i, 0.55, 0.85]),
  );
  const centers = categories.map((c, i) => {
    const a = -Math.PI / 2 + (i / M) * Math.PI * 2;
    return new THREE.Vector3(
      Math.cos(a) * 21.0,
      Math.sin(a) * 11.8,
      (hash(i + 3.7) - 0.5) * 7.0,
    );
  });

  const groups = categories.map(() => []);
  const catOf = new Float32Array(n);
  bookmarks.forEach((b, i) => {
    let ci = catIndexById.get(b.category_id);
    if (ci === undefined) ci = 0;
    catOf[i] = ci;
    groups[ci].push(i);
  });

  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const sizes = new Float32Array(n);
  const seeds = new Float32Array(n);
  const matches = new Float32Array(n);
  const linePos = [];

  groups.forEach((list, ci) => {
    const cnt = Math.max(1, list.length);
    list.forEach((idx, j) => {
      const ang = j * 2.399963 + hash(idx + 1.3) * 0.55 + ci * 0.7;
      const rr = Math.sqrt((j + 0.5) / cnt) * (7.4 + (ci % 3) * 0.5);
      const c = centers[ci];
      positions[idx * 3 + 0] = c.x + Math.cos(ang) * rr * 1.24;
      positions[idx * 3 + 1] = c.y + Math.sin(ang) * rr * 0.82;
      positions[idx * 3 + 2] = c.z + (hash(idx * 3 + 7.1) - 0.5) * 5.0;
      seeds[idx] = hash(idx * 5.9 + 2.2);
      sizes[idx] = 1.65 + hash(idx * 11.3) * 1.9 + (seeds[idx] > 0.94 ? 2.4 : 0);
      matches[idx] = 1;
      if (j > 0 && (cnt <= 22 || j % 2 === 0)) {
        const prev = list[j - 1];
        linePos.push(
          positions[prev * 3], positions[prev * 3 + 1], positions[prev * 3 + 2],
          positions[idx * 3], positions[idx * 3 + 1], positions[idx * 3 + 2],
        );
      }
    });
  });

  const geometry = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  const colorAttr = new THREE.BufferAttribute(colors, 3);
  const matchAttr = new THREE.BufferAttribute(matches, 1);
  geometry.setAttribute("position", posAttr);
  geometry.setAttribute("aColor", colorAttr);
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute("aMatch", matchAttr);
  geometry.setAttribute("aCat", new THREE.BufferAttribute(catOf, 1));
  geometry.computeBoundingSphere();

  const uniforms = {
    uPR: { value: 1 },
    uTime: { value: 0 },
    uHasSearch: { value: 0 },
    uFocusCat: { value: -1 },
    uLight: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  group.add(points);

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePos, 3));
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.15,
    depthWrite: false,
  });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  lines.frustumCulled = false;
  group.add(lines);

  const labels = categories.map((c, ci) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "starmap-label";
    const name = document.createElement("b");
    name.textContent = c.name;
    const count = document.createElement("span");
    count.textContent = `${groups[ci].length} 颗星`;
    el.append(name, count);
    el.addEventListener("click", () => options.onCategory?.(c.id));
    host.appendChild(el);
    return el;
  });

  const tip = document.createElement("div");
  tip.className = "starmap-tip";
  tip.hidden = true;
  host.appendChild(tip);

  let accent = [0.13, 0.83, 0.93];
  function applyTheme() {
    const css = getComputedStyle(document.documentElement);
    accent = hexOrRgb(css.getPropertyValue("--accent"), [0.13, 0.83, 0.93]);
    const light = document.documentElement.getAttribute("data-theme") === "light" ? 1 : 0;
    uniforms.uLight.value = light;
    for (let i = 0; i < n; i++) {
      const base = baseTint[Math.min(M - 1, Math.max(0, Math.round(catOf[i])))] || accent;
      colors[i * 3 + 0] = accent[0] * 0.58 + base[0] * 0.42;
      colors[i * 3 + 1] = accent[1] * 0.58 + base[1] * 0.42;
      colors[i * 3 + 2] = accent[2] * 0.58 + base[2] * 0.42;
    }
    colorAttr.needsUpdate = true;
    lineMat.color.setRGB(accent[0], accent[1], accent[2]);
    lineMat.opacity = light ? 0.22 : 0.15;
  }
  applyTheme();
  const observer = new MutationObserver(applyTheme);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-accent", "data-theme"],
  });

  function resize() {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    const pr = Math.min(window.devicePixelRatio || 1, 1.6);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    uniforms.uPR.value = pr;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  let currentCat = "all";
  let matchCount = n;
  let hoverIndex = -1;
  let disposed = false;
  let raf = 0;
  let last = performance.now();
  let clock = 0;
  let lookNow = new THREE.Vector3(0, 0, 0);
  let lookTarget = new THREE.Vector3(0, 0, 0);
  let dist = 46, distTarget = 46;
  let theta = 0, phi = 0, thetaTarget = 0, phiTarget = 0;
  let dragging = false, moved = 0, downX = 0, downY = 0;

  function setCategory(id) {
    currentCat = id;
    const ci = id === "all" || id === undefined || id === null ? -1 : (catIndexById.get(id) ?? -1);
    uniforms.uFocusCat.value = ci;
    if (ci < 0) {
      lookTarget.set(0, 0, 0);
      distTarget = 46;
    } else {
      lookTarget.copy(centers[ci]);
      distTarget = 23;
    }
  }
  function setSearch(raw) {
    const q = String(raw || "").trim().toLowerCase();
    uniforms.uHasSearch.value = q ? 1 : 0;
    let m = 0;
    for (let i = 0; i < n; i++) {
      const b = bookmarks[i];
      const hit = !q ||
        String(b.title || "").toLowerCase().includes(q) ||
        String(b.description || "").toLowerCase().includes(q) ||
        String(b.url || "").toLowerCase().includes(q);
      matches[i] = hit ? 1 : 0;
      if (hit) m++;
    }
    matchCount = m;
    matchAttr.needsUpdate = true;
  }
  function openBookmark(i) {
    const b = bookmarks[i];
    if (!b) return;
    const url = String(b.url || "").startsWith("http") ? b.url : `https://${b.url}`;
    if (options.onOpen) options.onOpen(url, b);
    else window.open(url, "_blank", "noopener,noreferrer");
  }

  const ray = new THREE.Raycaster();
  ray.params.Points.threshold = 1.15;
  const ndc = new THREE.Vector2();
  const proj = new THREE.Vector3();

  function pick(clientX, clientY) {
    const rect = cnv.getBoundingClientRect();
    ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObject(points, false);
    return hits.length ? hits[0].index : -1;
  }
  function screenPos(i) {
    proj.fromArray(positions, i * 3).project(camera);
    return {
      x: (proj.x * 0.5 + 0.5) * cnv.clientWidth,
      y: (-proj.y * 0.5 + 0.5) * cnv.clientHeight,
    };
  }
  function showTip(i, clientX, clientY) {
    if (i < 0) {
      tip.hidden = true;
      hoverIndex = -1;
      cnv.style.cursor = "grab";
      return;
    }
    hoverIndex = i;
    const b = bookmarks[i];
    let domain = b.url || "";
    try {
      domain = new URL(domain.startsWith("http") ? domain : `https://${domain}`).hostname.replace(/^www\./, "");
    } catch (_) { /* 保持原值 */ }
    tip.replaceChildren();
    const t = document.createElement("b");
    t.textContent = b.title;
    const d = document.createElement("span");
    d.textContent = domain;
    tip.append(t, d);
    const rect = host.getBoundingClientRect();
    tip.style.left = `${Math.min(Math.max(12, clientX - rect.left + 14), rect.width - 190)}px`;
    tip.style.top = `${Math.min(Math.max(12, clientY - rect.top + 14), rect.height - 60)}px`;
    tip.hidden = false;
    cnv.style.cursor = "pointer";
  }

  function onDown(e) {
    dragging = true;
    moved = 0;
    downX = e.clientX;
    downY = e.clientY;
    cnv.setPointerCapture?.(e.pointerId);
  }
  function onMove(e) {
    if (dragging) {
      const dx = e.clientX - downX, dy = e.clientY - downY;
      moved += Math.abs(dx) + Math.abs(dy);
      thetaTarget -= dx * 0.0035;
      phiTarget = Math.max(-0.55, Math.min(0.55, phiTarget + dy * 0.0025));
      downX = e.clientX;
      downY = e.clientY;
      tip.hidden = true;
      return;
    }
    showTip(pick(e.clientX, e.clientY), e.clientX, e.clientY);
  }
  function onUp(e) {
    if (!dragging) return;
    dragging = false;
    cnv.releasePointerCapture?.(e.pointerId);
    if (moved < 6) {
      const i = pick(e.clientX, e.clientY);
      if (i >= 0) openBookmark(i);
    }
  }
  function onLeave() {
    dragging = false;
    showTip(-1, 0, 0);
  }
  function onWheel(e) {
    e.preventDefault();
    distTarget = Math.max(14, Math.min(74, distTarget + e.deltaY * 0.025));
  }
  cnv.addEventListener("pointerdown", onDown);
  cnv.addEventListener("pointermove", onMove);
  cnv.addEventListener("pointerup", onUp);
  cnv.addEventListener("pointerleave", onLeave);
  cnv.addEventListener("wheel", onWheel, { passive: false });

  function paint(now) {
    raf = requestAnimationFrame(paint);
    if (disposed) return;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    clock += dt;
    const k = 1 - Math.exp(-dt * 4.5);
    lookNow.lerp(lookTarget, k);
    dist = lerp(dist, distTarget, k);
    theta = lerp(theta, thetaTarget, k);
    phi = lerp(phi, phiTarget, k);
    camera.position.set(
      lookNow.x + Math.sin(theta) * Math.cos(phi) * dist,
      lookNow.y + Math.sin(phi) * dist,
      lookNow.z + Math.cos(theta) * Math.cos(phi) * dist,
    );
    camera.lookAt(lookNow);
    uniforms.uTime.value = clock;
    renderer.render(scene, camera);

    for (let ci = 0; ci < labels.length; ci++) {
      const c = centers[ci].clone().project(camera);
      const x = (c.x * 0.5 + 0.5) * cnv.clientWidth;
      const y = (-c.y * 0.5 + 0.5) * cnv.clientHeight;
      const el = labels[ci];
      // 标签浮在星座中心上方，避免 DOM 遮挡中心星点的 pointer 事件
      el.style.transform = `translate(${x}px, ${y - 30}px) translate(-50%, -100%)`;
      el.style.opacity = c.z > 1 || c.z < -1 ? "0" : "1";
    }
  }
  raf = requestAnimationFrame(paint);

  window.dispatchEvent(new CustomEvent("starfield:pause", { detail: true }));

  const api = {
    setCategory,
    setSearch,
    openIndex: openBookmark,
    getScreenPos: screenPos,
    getState: () => ({
      count: n,
      categories: M,
      matches: matchCount,
      category: currentCat,
      focus: uniforms.uFocusCat.value,
      hover: hoverIndex,
      light: uniforms.uLight.value,
      accent: accent.slice(),
      hasSearch: uniforms.uHasSearch.value,
      paused: Boolean(window.__STARFIELD__?.isPaused?.()),
    }),
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      ro.disconnect();
      cnv.removeEventListener("pointerdown", onDown);
      cnv.removeEventListener("pointermove", onMove);
      cnv.removeEventListener("pointerup", onUp);
      cnv.removeEventListener("pointerleave", onLeave);
      cnv.removeEventListener("wheel", onWheel);
      geometry.dispose();
      material.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      renderer.dispose();
      labels.forEach((el) => el.remove());
      tip.remove();
      if (cnv.parentNode === host) host.removeChild(cnv);
      window.dispatchEvent(new CustomEvent("starfield:pause", { detail: false }));
      if (window.__STARMAP__ === api) delete window.__STARMAP__;
    },
  };
  window.__STARMAP__ = api;
  return api;
}

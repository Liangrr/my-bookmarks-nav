/* 星轨 · 活体星野背景
 * 自包含 ES Module，从 /vendor/three.module.js 加载本地 three r160。
 * 全站固定背景层：漂移星野 + 极光带 + 星云，颜色实时取自站点 CSS 变量。
 * 不参与 Next 构建，无 npm 依赖；无 WebGL2 时返回 null，由站点保留原 CSS 光晕。
 */
import * as THREE from "../vendor/three.module.js";

const VERT = `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform vec2 uMouse;
uniform vec3 uAccent;
uniform vec3 uAccent2;
uniform vec3 uBg;
uniform float uTime;
uniform float uScroll;
uniform float uLight;

float h21(vec2 p){
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}
float n2(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = h21(i), b = h21(i + vec2(1.0, 0.0));
  float c = h21(i + vec2(0.0, 1.0)), d = h21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * n2(p);
    p = p * 2.02 + vec2(11.3, 7.1);
    a *= 0.5;
  }
  return v;
}
float starLayer(vec2 p, float scale, float thr, float t){
  vec2 g = p * scale;
  vec2 id = floor(g), f = fract(g);
  float h = h21(id);
  float on = step(thr, h);
  vec2 pos = vec2(h21(id + vec2(2.3, 1.7)), h21(id + vec2(5.1, 9.2))) * 0.70 + 0.15;
  float dist = length(f - pos);
  float core = exp(-dist * dist * 170.0);
  float halo = exp(-dist * dist * 18.0) * 0.15;
  float twinkle = 0.62 + 0.38 * sin(t * (0.6 + 2.4 * h) + h * 57.0);
  return (core + halo) * on * twinkle;
}

void main(){
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 uv = (vUv - 0.5) * vec2(aspect, 1.0);
  vec2 par = uMouse * 0.055 + vec2(0.0, uScroll * 0.022);
  vec2 p = uv + par;

  float neb  = fbm(p * 1.35 + vec2(uTime * 0.010, -uTime * 0.006));
  float neb2 = fbm(p * 2.90 - vec2(uTime * 0.008, uTime * 0.004));

  float ridge = p.y - 0.15 * sin(p.x * 1.7 + uTime * 0.05)
              - 0.11 * fbm(p * 1.1 + vec2(uTime * 0.02, 0.0));
  float band = exp(-abs(ridge) * 2.5)
             * smoothstep(0.34, 0.86, fbm(p * 2.2 + vec2(uTime * 0.03, 0.0)));

  float s1 = starLayer(p + vec2(0.0, uTime * 0.0012), 26.0, 0.960, uTime);
  float s2 = starLayer(p * 1.7 + vec2(3.1, 1.4), 44.0, 0.976, uTime * 1.3);
  float s3 = starLayer(p * 0.8 + vec2(8.7, 2.2), 15.0, 0.980, uTime * 0.7);

  vec3 starCol = mix(vec3(0.80, 0.90, 1.0), uAccent2, 0.35);
  vec3 col = uBg * (0.72 + 0.36 * neb);
  col += uAccent * pow(neb, 3.0) * 0.085;
  col += uAccent2 * band * 0.13;
  col += uAccent * pow(neb2, 5.0) * 0.035;
  col += starCol * (s1 * 0.55 + s2 * 0.28 + s3 * 0.75);
  col *= 1.0 - 0.30 * smoothstep(0.35, 1.15, length(uv));

  vec3 day = mix(vec3(0.975, 0.982, 0.995), vec3(0.94, 0.96, 0.99) + uAccent * 0.10, neb * 0.30);
  day += uAccent2 * band * 0.025;
  day += starCol * (s1 + s2 + s3) * 0.055;
  col = mix(col, day, uLight);

  gl_FragColor = vec4(col, 1.0);
}
`;

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

export function mountStarfield(host) {
  if (!host) return null;

  const probe = document.createElement("canvas");
  const gl = probe.getContext("webgl2");
  if (!gl) return null;
  gl.getExtension("WEBGL_lose_context")?.loseContext();

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: "low-power",
    });
  } catch (err) {
    console.warn("[starfield] WebGL2 初始化失败，回退 CSS 光晕", err);
    return null;
  }

  const cnv = renderer.domElement;
  cnv.setAttribute("aria-hidden", "true");
  cnv.style.width = "100%";
  cnv.style.height = "100%";
  cnv.style.display = "block";
  host.appendChild(cnv);

  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const geometry = new THREE.PlaneGeometry(2, 2);

  const uniforms = {
    uRes: { value: new THREE.Vector2(1, 1) },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uAccent: { value: new THREE.Vector3(0.13, 0.83, 0.93) },
    uAccent2: { value: new THREE.Vector3(0.40, 0.91, 0.98) },
    uBg: { value: new THREE.Vector3(0.039, 0.039, 0.059) },
    uTime: { value: 0 },
    uScroll: { value: 0 },
    uLight: { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);

  const target = {
    accent: [0.13, 0.83, 0.93],
    accent2: [0.40, 0.91, 0.98],
    bg: [0.039, 0.039, 0.059],
    light: 0,
    mouseX: 0,
    mouseY: 0,
    scroll: 0,
  };

  function readTheme() {
    const css = getComputedStyle(document.documentElement);
    target.accent = hexOrRgb(css.getPropertyValue("--accent"), [0.13, 0.83, 0.93]);
    target.accent2 = hexOrRgb(css.getPropertyValue("--accent-light"), target.accent);
    target.bg = hexOrRgb(css.getPropertyValue("--bg-primary"), [0.039, 0.039, 0.059]);
    target.light = document.documentElement.getAttribute("data-theme") === "light" ? 1 : 0;
  }
  readTheme();
  uniforms.uAccent.value.fromArray(target.accent);
  uniforms.uAccent2.value.fromArray(target.accent2);
  uniforms.uBg.value.fromArray(target.bg);
  uniforms.uLight.value = target.light;

  function resize() {
    const w = Math.max(1, host.clientWidth || window.innerWidth);
    const h = Math.max(1, host.clientHeight || window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5) * 0.78);
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w, h);
  }
  resize();

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let paused = false;
  let disposed = false;
  let raf = 0;
  let last = performance.now();
  let clock = 0;

  function onMove(e) {
    target.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    target.mouseY = 1 - (e.clientY / window.innerHeight) * 2;
  }
  function onScroll() {
    target.scroll = Math.min(window.scrollY / Math.max(window.innerHeight, 1), 4);
  }
  function onResize() {
    resize();
  }
  function onThemeChange() {
    readTheme();
  }
  function onPauseEvent(e) {
    paused = Boolean(e.detail);
    last = performance.now();
  }
  function onVisibility() {
    last = performance.now();
  }

  const observer = new MutationObserver(onThemeChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-accent", "data-theme"] });

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);
  window.addEventListener("starfield:pause", onPauseEvent);
  document.addEventListener("visibilitychange", onVisibility);
  onScroll();

  function paint(now) {
    raf = requestAnimationFrame(paint);
    if (disposed) return;
    const interval = reduceMotion ? 500 : 32;
    if (paused || document.hidden || now - last < interval) return;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (!reduceMotion) clock += dt;

    // 指数缓动与帧率无关：低帧率设备上主题切换也能在约 1 秒内完成
    const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 4.5);
    const a = uniforms.uAccent.value, a2 = uniforms.uAccent2.value, bg = uniforms.uBg.value;
    a.set(lerp(a.x, target.accent[0], k), lerp(a.y, target.accent[1], k), lerp(a.z, target.accent[2], k));
    a2.set(lerp(a2.x, target.accent2[0], k), lerp(a2.y, target.accent2[1], k), lerp(a2.z, target.accent2[2], k));
    bg.set(lerp(bg.x, target.bg[0], k), lerp(bg.y, target.bg[1], k), lerp(bg.z, target.bg[2], k));
    uniforms.uLight.value = lerp(uniforms.uLight.value, target.light, k);
    uniforms.uMouse.value.set(
      lerp(uniforms.uMouse.value.x, target.mouseX, k),
      lerp(uniforms.uMouse.value.y, target.mouseY, k),
    );
    uniforms.uScroll.value = lerp(uniforms.uScroll.value, target.scroll, k);
    uniforms.uTime.value = clock;
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(paint);

  const api = {
    pause(value) {
      paused = Boolean(value);
      last = performance.now();
    },
    isPaused: () => paused,
    getAccent: () => uniforms.uAccent.value.toArray(),
    getBg: () => uniforms.uBg.value.toArray(),
    getLight: () => uniforms.uLight.value,
    getTime: () => uniforms.uTime.value,
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("starfield:pause", onPauseEvent);
      document.removeEventListener("visibilitychange", onVisibility);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (cnv.parentNode === host) host.removeChild(cnv);
      if (window.__STARFIELD__ === api) delete window.__STARFIELD__;
    },
  };
  window.__STARFIELD__ = api;
  document.documentElement.classList.add("starfield-on");
  return api;
}

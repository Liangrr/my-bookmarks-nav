/* =========================================================================
   《时间的尽头》 · THE END OF TIME
   An interactive 3D requiem built from scratch on Three.js.
   All geometry, shading, post-processing and sound are authored here.
   ========================================================================= */

let THREE;
const allMats = [];
const CYCLE = 88.0;

const S = {
  t: 12.0,
  dir: 1,
  paused: false,
  speed: 1,
  scrub: 0,
  pulse: 0,
  flash: 0,
  shock: null,
  shockAge: 99,
  lastInput: 0,
  audioOn: false,
  preset: 0
};

const ndc = { x: 0, y: 0 };
const ndcSmooth = { x: 0, y: 0 };
let W = 0, H = 0, DPR = 1, isDragging = false;
let renderer, scene, camera, quad;
let rtScene, rtH1, rtH2, rtQ1, rtQ2;
let brightMat, blurMat, copyMat, compMat;
let bursts = [];
let burstPool = [];
let ringMat;
let rig = { theta: 0.0, phi: 1.42, radius: 56, tTheta: 0.0, tPhi: 1.42, tRadius: 56 };

/* ------------------------------------------------------------------ utils */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const R = mulberry32(20261109);
const rand = (a, b) => a + (b - a) * R();
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pad = (n, l = 2) => String(Math.floor(n)).padStart(l, '0');

function reg(mat) { allMats.push(mat); return mat; }
function showFatal(e) {
  const el = document.getElementById('fatal');
  el.hidden = false;
  el.textContent = '无法抵达时间的尽头 · ' + (e && e.message ? e.message : e) + '\n请确认浏览器支持 WebGL2。';
  console.error(e);
}

/* --------------------------------------------------------------- GLSL lib */
const COMMON = `
float hash11(float p){ p=fract(p*0.1031); p*=p+33.33; p*=p+p; return fract(p); }
float hash21(vec2 p){ vec3 p3=fract(vec3(p.xyx)*0.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vnoise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  float a=hash21(i), b=hash21(i+vec2(1.0,0.0)), c=hash21(i+vec2(0.0,1.0)), d=hash21(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*vnoise(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return v; }
`;

const FS_VERT = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`;

/* =========================================================================
   SCENE
   ========================================================================= */
async function loadThree() {
  try { return await import('three'); }
  catch (e) {
    return await import('https://unpkg.com/three@0.160.1/build/three.module.js');
  }
}

class Quad {
  constructor() {
    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }
  draw(mat, target) {
    this.mesh.material = mat;
    renderer.setRenderTarget(target || null);
    renderer.render(this.scene, this.cam);
  }
}

function makeRT(w, h, depth) {
  const rt = new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.HalfFloatType,
    depthBuffer: !!depth,
    stencilBuffer: false
  });
  rt.texture.generateMipmaps = false;
  return rt;
}

function resizeTargets() {
  const w = Math.max(2, Math.floor(W * DPR));
  const h = Math.max(2, Math.floor(H * DPR));
  const hw = Math.max(2, Math.floor(w / 2)), hh = Math.max(2, Math.floor(h / 2));
  const qw = Math.max(2, Math.floor(w / 4)), qh = Math.max(2, Math.floor(h / 4));
  [rtScene, rtH1, rtH2, rtQ1, rtQ2].forEach(rt => rt && rt.dispose());
  rtScene = makeRT(w, h, true);
  rtH1 = makeRT(hw, hh, false); rtH2 = makeRT(hw, hh, false);
  rtQ1 = makeRT(qw, qh, false); rtQ2 = makeRT(qw, qh, false);
  if (compMat) compMat.uniforms.uRes.value.set(w, h);
}

/* ------------------------------------------------------------- sky & light */
function buildSky() {
  const mat = reg(new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPulse: { value: 0 } },
    side: THREE.BackSide, depthWrite: false, depthTest: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: COMMON + `
      varying vec3 vDir; uniform float uTime; uniform float uPulse;
      void main(){
        vec3 d=normalize(vDir);
        float h=d.y*0.5+0.5;
        vec3 col=mix(vec3(0.008,0.010,0.024),vec3(0.028,0.021,0.052),smoothstep(0.0,1.0,h));
        float n=fbm(d.xz*4.0+d.y*2.0+vec2(uTime*0.004,0.0));
        col+=vec3(0.058,0.022,0.042)*pow(n,3.0)*1.7;
        float n2=fbm(d.xy*3.2-vec2(uTime*0.003,0.0));
        col+=vec3(0.010,0.028,0.055)*pow(n2,4.0)*2.1;
        vec2 sp=vec2(atan(d.z,d.x)*1.6,asin(clamp(d.y,-1.0,1.0))*3.2);
        float st=hash21(floor(sp*90.0));
        float tw=0.5+0.5*sin(uTime*1.7+st*130.0);
        col+=vec3(0.72,0.80,1.0)*smoothstep(0.9968,1.0,st)*(0.28+0.72*tw)*0.85;
        col+=vec3(0.10,0.055,0.12)*uPulse;
        gl_FragColor=vec4(col,1.0);
      }`
  }));
  const m = new THREE.Mesh(new THREE.SphereGeometry(200, 48, 32), mat);
  m.renderOrder = -1000;
  m.frustumCulled = false;
  scene.add(m);
}

function buildEclipse() {
  const group = new THREE.Group();
  group.position.set(0, 3.0, -70);

  const corona = reg(new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPulse: { value: 0 } },
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: COMMON + `
      varying vec2 vUv; uniform float uTime; uniform float uPulse;
      void main(){
        vec2 p=(vUv-0.5)*2.0;
        float r=length(p);
        float a=atan(p.y,p.x);
        float Rr=0.315;
        float rays=0.5+0.5*sin(a*26.0+fbm(vec2(a*2.5,uTime*0.03))*9.0);
        rays=pow(rays,3.0);
        float e=exp(-pow(abs(r-Rr)*24.0,1.20))*0.92;
        float halo=exp(-max(r-Rr,0.0)*13.0)*0.085;
        float outer=exp(-max(r-Rr,0.0)*5.0)*rays*0.050;
        float dust=fbm(p*7.0+vec2(uTime*0.006,-uTime*0.004));
        float I=(e+halo+outer)*(0.82+0.36*dust);
        I*=1.0+uPulse*1.4;
        I*=1.0-smoothstep(0.62,0.98,r);
        I*=mix(0.06,1.0,smoothstep(-0.44,0.10,p.y));
        vec3 c=mix(vec3(1.0,0.50,0.20),vec3(1.0,0.88,0.66),exp(-abs(r-Rr)*9.0));
        gl_FragColor=vec4(c*I,1.0);
      }`
  }));
  const cm = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), corona);
  cm.position.z = -1.5;
  cm.renderOrder = -1;
  group.add(cm);

  const disc = reg(new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPulse: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vV=-mv.xyz; vP=position; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: COMMON + `
      varying vec3 vN; varying vec3 vV; varying vec3 vP; uniform float uTime; uniform float uPulse;
      void main(){
        vec3 N=normalize(vN),V=normalize(vV);
        float f=pow(1.0-max(dot(N,V),0.0),3.2);
        float n=fbm(vP.xy*0.055+vec2(uTime*0.01,0.0));
        vec3 core=vec3(0.003,0.004,0.011)+vec3(0.016,0.010,0.030)*n;
        vec3 rim=mix(vec3(1.0,0.42,0.13),vec3(1.0,0.88,0.62),f)*pow(f,1.15);
        float flick=0.82+0.18*sin(uTime*0.7+n*12.0);
        vec3 col=core+rim*(0.82+uPulse*1.1)*flick;
        gl_FragColor=vec4(col,1.0);
      }`
  }));
  const dm = new THREE.Mesh(new THREE.SphereGeometry(26, 64, 48), disc);
  group.add(dm);
  scene.add(group);
}

/* ------------------------------------------------------- ornament geometry */
function createBatch() {
  const P = [], U = [], M = [], C = [], T = [], I = [];
  function pushQuad(p0, p1, p2, p3, meta, center, seed, tint, u0 = 0, u1 = 1) {
    const base = P.length / 3;
    const pts = [p0, p1, p2, p3];
    const uvs = [[u0, 0], [u0, 1], [u1, 1], [u1, 0]];
    for (let k = 0; k < 4; k++) {
      P.push(pts[k][0], pts[k][1], pts[k][2] || 0);
      U.push(uvs[k][0], uvs[k][1]);
      M.push(meta[0], meta[1], meta[2], meta[3]);
      C.push(center[0], center[1], center[2] || 0);
      T.push(tint[0], tint[1], tint[2]);
    }
    I.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  function addArc(r0, r1, a0, a1, seg, meta, seed, tint) {
    for (let i = 0; i < seg; i++) {
      const t0 = i / seg, t1 = (i + 1) / seg;
      const A = a0 + (a1 - a0) * t0, B = a0 + (a1 - a0) * t1;
      const q = (r, a) => [Math.cos(a) * r, Math.sin(a) * r, 0];
      pushQuad(q(r0, A), q(r1, A), q(r1, B), q(r0, B), meta, [0, 0, 0], seed, tint, t0, t1);
    }
  }
  function addSeg(x0, y0, x1, y1, w, meta, seed, tint, cx, cy) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L * w * 0.5, ny = dx / L * w * 0.5;
    const c = [cx === undefined ? (x0 + x1) * 0.5 : cx, cy === undefined ? (y0 + y1) * 0.5 : cy, 0];
    pushQuad([x0 - nx, y0 - ny, 0], [x0 + nx, y0 + ny, 0],
             [x1 + nx, y1 + ny, 0], [x1 - nx, y1 - ny, 0], meta, c, seed, tint);
  }
  function geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    g.setAttribute('aMeta', new THREE.Float32BufferAttribute(M, 4));
    g.setAttribute('aCenter', new THREE.Float32BufferAttribute(C, 3));
    g.setAttribute('aTint', new THREE.Float32BufferAttribute(T, 3));
    g.setIndex(I);
    g.computeBoundingSphere();
    return g;
  }
  return { pushQuad, addArc, addSeg, geometry };
}

const GLYPH = {
  I: [[0.5, 0, 0.5, 1.15]],
  V: [[0, 1.15, 0.5, 0], [0.5, 0, 1, 1.15]],
  X: [[0, 1.15, 1, 0], [0, 0, 1, 1.15]]
};
const NUMERALS = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

function buildDialGeometry() {
  const b = createBatch();
  const GOLD = [1.0, 0.70, 0.34], COOL = [0.52, 0.78, 1.0], PALE = [1.0, 0.90, 0.72];
  const mixT = (a, c, k) => a.map((v, i) => v * (1 - k) + c[i] * k);

  // monumental rings
  [[10.85, 11.00, 1.0, 0.12], [9.90, 9.98, 0.85, 0.06], [6.30, 6.40, 0.8, 0.0],
   [5.05, 5.11, 0.72, 0.18], [3.35, 3.42, 0.62, 0.0], [2.05, 2.11, 0.55, 0.28],
   [0.92, 0.97, 0.48, 0.0]].forEach((r, i) => {
    b.addArc(r[0], r[1], 0, Math.PI * 2, 220, [r[3], 0, 100 + i, r[2]], 100 + i, mixT(GOLD, PALE, i * 0.08));
  });
  // fractured / incomplete arcs
  for (let i = 0; i < 22; i++) {
    const r = rand(2.3, 11.7);
    const th = rand(0.012, 0.14);
    const a0 = rand(0, Math.PI * 2);
    const span = rand(0.35, Math.PI * 1.75);
    const cool = R() < 0.22;
    b.addArc(r, r + th, a0, a0 + span, Math.max(24, Math.floor(span * 42)),
      [rand(0.05, 0.78), 0, 200 + i, rand(0.35, 0.9)], 200 + i,
      mixT(GOLD, cool ? COOL : PALE, cool ? 0.85 : rand(0, 0.4)));
  }
  // radial hairlines beyond the rim
  for (let i = 0; i < 72; i++) {
    const a = i / 72 * Math.PI * 2;
    const r0 = 11.15, r1 = 11.15 + (i % 6 === 0 ? 1.3 : 0.42);
    b.addSeg(Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a) * r1, Math.sin(a) * r1,
      i % 6 === 0 ? 0.055 : 0.022, [0.0, 2, 300 + i, i % 6 === 0 ? 0.65 : 0.28], 300 + i, GOLD);
  }
  // minute / hour ticks
  for (let i = 0; i < 60; i++) {
    const a = Math.PI / 2 - i / 60 * Math.PI * 2;
    const major = i % 5 === 0;
    const r0 = major ? 9.28 : 9.62, r1 = major ? 10.18 : 9.98;
    const c = [Math.cos(a) * (r0 + r1) * 0.5, Math.sin(a) * (r0 + r1) * 0.5, 0];
    b.addSeg(Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a) * r1, Math.sin(a) * r1,
      major ? 0.115 : 0.038, [0, 2, 400 + i, major ? 1.25 : 0.55], 400 + i,
      major ? PALE : GOLD, c[0], c[1]);
  }
  // floating roman numerals
  const SCL = 1.3, LW = 0.40 * SCL, GAP = 0.13 * SCL;
  for (let i = 0; i < 12; i++) {
    const a = Math.PI / 2 - i / 12 * Math.PI * 2;
    const cx = Math.cos(a) * 7.55, cy = Math.sin(a) * 7.55;
    const str = NUMERALS[i];
    const total = str.length * LW + (str.length - 1) * GAP;
    for (let j = 0; j < str.length; j++) {
      const x0 = -total * 0.5 + j * (LW + GAP);
      for (const s of GLYPH[str[j]]) {
        const X0 = x0 + s[0] * LW, Y0 = (s[1] - 0.575) * SCL;
        const X1 = x0 + s[2] * LW, Y1 = (s[3] - 0.575) * SCL;
        b.addSeg(cx + X0, cy + Y0, cx + X1, cy + Y1, 0.062,
          [0, 3, 500 + i, 1.05], 500 + i, i === 0 ? PALE : GOLD, cx, cy);
      }
    }
  }
  // twelve lozenges on the outer rim
  for (let i = 0; i < 12; i++) {
    const a = Math.PI / 2 - i / 12 * Math.PI * 2;
    const r = 11.65, s = 0.20, t = 0.085;
    const ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux;
    const P = (dr, ds) => [ux * (r + dr) + px * ds, uy * (r + dr) + py * ds, 0];
    b.pushQuad(P(-s, 0), P(0, t), P(s, 0), P(0, -t), [0, 3, 600 + i, 1.5],
      [ux * r, uy * r, 0], 600 + i, PALE);
  }
  return b.geometry();
}

function ornamentMaterial(gain) {
  return reg(new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uPulse: { value: 0 }, uGain: { value: gain }
    },
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `
      attribute vec4 aMeta; attribute vec3 aCenter; attribute vec3 aTint;
      varying vec2 vUv; varying vec4 vMeta; varying vec3 vTint; varying float vFog;
      uniform float uTime;
      void main(){
        vec3 p=position; float kind=aMeta.y; float s=aMeta.z;
        if(kind>1.5){
          float ang=0.026*sin(uTime*0.33+s*1.9);
          float c=cos(ang), si=sin(ang);
          vec2 d=p.xy-aCenter.xy;
          p.xy=aCenter.xy+vec2(d.x*c-d.y*si,d.x*si+d.y*c);
          p.z+=0.20*sin(uTime*0.52+s*2.4);
        } else { p.z+=0.055*sin(uTime*0.38+s*1.3); }
        vec4 mv=modelViewMatrix*vec4(p,1.0);
        vFog=clamp((-mv.z-45.0)/135.0,0.0,1.0);
        gl_Position=projectionMatrix*mv;
        vUv=uv; vMeta=aMeta; vTint=aTint;
      }`,
    fragmentShader: COMMON + `
      varying vec2 vUv; varying vec4 vMeta; varying vec3 vTint; varying float vFog;
      uniform float uTime; uniform float uPulse; uniform float uGain;
      void main(){
        float across=smoothstep(0.0,0.24,vUv.y)*(1.0-smoothstep(0.76,1.0,vUv.y));
        float ends=smoothstep(0.0,0.03,vUv.x)*(1.0-smoothstep(0.97,1.0,vUv.x));
        float I=across*ends;
        if(vMeta.y<0.5){
          float n=fbm(vec2(vUv.x*6.0+vMeta.z*7.0,uTime*0.035));
          float d=smoothstep(0.0,0.28,n-vMeta.x*0.42);
          I*=mix(0.10,1.0,d);
          I*=0.72+0.34*sin(vUv.x*13.0-uTime*0.75+vMeta.z*9.0);
        } else {
          I*=0.76+0.28*sin(uTime*1.05+vMeta.z*23.0);
        }
        I*=vMeta.w*uGain*(0.86+0.22*sin(uTime*0.9+vMeta.z*11.0));
        I*=1.0+uPulse*1.3;
        I*=1.0-vFog*0.6;
        vec3 col=mix(vec3(1.0,0.66,0.30),vTint,0.72);
        gl_FragColor=vec4(col*I,1.0);
      }`
  }));
}

function buildDial() {
  const geom = buildDialGeometry();
  const dial = new THREE.Group();
  dial.rotation.set(-0.09, 0.11, 0.025);

  const main = new THREE.Mesh(geom, ornamentMaterial(0.88));
  main.frustumCulled = false;
  dial.add(main);

  const gm = ornamentMaterial(0.24);
  gm.userData.timeScale = 0.55; gm.userData.timeOffset = 31.0;
  const ghost = new THREE.Mesh(geom, gm);
  ghost.position.z = -19; ghost.scale.setScalar(1.55); ghost.rotation.z = 0.38;
  ghost.frustumCulled = false;
  dial.add(ghost);

  const gm2 = ornamentMaterial(0.10);
  gm2.userData.timeScale = 1.6; gm2.userData.timeOffset = 77.0;
  const echo = new THREE.Mesh(geom, gm2);
  echo.position.z = 16; echo.scale.setScalar(0.72); echo.rotation.z = -0.62;
  echo.frustumCulled = false;
  dial.add(echo);

  // hands — one second to midnight
  const handColors = ['#ffd9a0', '#ffe9c4', '#ff9f68'];
  const specs = [[5.1, 0.46, 1.25], [7.55, 0.28, 1.55], [9.15, 0.10, 2.1]];
  const hands = [];
  specs.forEach((sp, i) => {
    const sh = new THREE.Shape();
    sh.moveTo(-sp[1] * 0.5, -sp[2]);
    sh.lineTo(sp[1] * 0.5, -sp[2]);
    sh.lineTo(sp[1] * 0.32, sp[0] * 0.74);
    sh.lineTo(0, sp[0]);
    sh.lineTo(-sp[1] * 0.32, sp[0] * 0.74);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, {
      depth: 0.11 + i * 0.02, bevelEnabled: true, bevelThickness: 0.035,
      bevelSize: 0.03, bevelSegments: 2, steps: 1, curveSegments: 3
    });
    const mat = reg(new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPulse: { value: 0 }, uGold: { value: new THREE.Color(handColors[i]) }, uSeed: { value: i * 3.7 } },
      vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP;
        void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vV=-mv.xyz; vP=position; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: COMMON + `
        varying vec3 vN; varying vec3 vV; varying vec3 vP;
        uniform float uTime; uniform vec3 uGold; uniform float uSeed; uniform float uPulse;
        void main(){
          vec3 N=normalize(vN),V=normalize(vV),L=normalize(vec3(0.32,0.72,0.62));
          float diff=max(dot(N,L),0.0);
          float fres=pow(1.0-max(dot(N,V),0.0),2.3);
          float spec=pow(max(dot(reflect(-L,N),V),0.0),30.0);
          vec3 col=vec3(0.016,0.020,0.036)+uGold*(diff*0.26+fres*0.86+spec*0.95);
          float n=fbm(vP.xy*1.5+vec2(uSeed*7.0,uTime*0.05));
          col*=mix(0.42,1.25,smoothstep(0.22,0.74,n));
          col+=uGold*(0.12+uPulse*0.5)*fres;
          gl_FragColor=vec4(col,1.0);
        }`
    }));
    const mesh = new THREE.Mesh(g, mat);
    mesh.position.z = 0.35 + i * 0.22;
    const pivot = new THREE.Group();
    pivot.add(mesh);
    dial.add(pivot);
    hands.push(pivot);
  });
  S.hands = hands;

  // hub
  const hubMat = reg(new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPulse: { value: 0 } },
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vV=-mv.xyz; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV; uniform float uTime; uniform float uPulse;
      void main(){ float f=pow(1.0-max(dot(normalize(vN),normalize(vV)),0.0),1.6);
        float p=0.75+0.25*sin(uTime*2.1);
        gl_FragColor=vec4(vec3(1.0,0.78,0.48)*(f*1.9+0.25)*p*(1.0+uPulse*2.0),1.0); }`
  }));
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.52, 24, 16), hubMat);
  hub.position.z = 1.15;
  dial.add(hub);
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85 + i * 0.34, 0.018, 6, 96), hubMat);
    ring.position.z = 1.1; ring.rotation.x = rand(-0.5, 0.5);
    ring.userData.spin = [0.18, -0.13, 0.09][i] * (i + 1);
    dial.add(ring);
    (S.hubRings || (S.hubRings = [])).push(ring);
  }
  scene.add(dial);
  S.dial = dial;
}

/* --------------------------------------------------------------- monoliths */
function buildMonoliths() {
  const matFor = (seed) => reg(new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPulse: { value: 0 }, uSeed: { value: seed } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec2 vUv;
      void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vV=-mv.xyz; vP=position; vUv=uv; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: COMMON + `
      varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec2 vUv;
      uniform float uTime; uniform float uPulse; uniform float uSeed;
      void main(){
        vec3 N=normalize(vN),V=normalize(vV);
        float fres=pow(1.0-max(dot(N,V),0.0),2.0);
        float diff=max(dot(N,normalize(vec3(0.20,0.55,0.80))),0.0);
        float n=fbm(vec2(vP.y*0.32+uSeed*3.0,vP.x*1.8+vP.z*1.8+uSeed));
        vec3 base=mix(vec3(0.010,0.012,0.024),vec3(0.044,0.036,0.050),n);
        vec3 col=base*(0.48+diff*0.52)+vec3(0.42,0.28,0.13)*fres*0.55;
        float seam=exp(-pow((vUv.x-0.5)*32.0,2.0));
        float pulse=0.52+0.48*sin(uTime*0.75+vP.y*0.45+uSeed*9.0);
        col+=vec3(1.0,0.60,0.24)*seam*pulse*0.34*(0.30+0.70*vUv.y);
        col+=vec3(0.65,0.36,0.15)*fres*uPulse*0.55;
        gl_FragColor=vec4(col,1.0);
      }`
  }));
  const glowMat = () => reg(new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPulse: { value: 0 } },
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform float uTime; uniform float uPulse;
      void main(){ float r=length(vUv-0.5)*2.0; float I=exp(-r*r*6.0)*(0.24+0.08*sin(uTime*0.8))*(1.0+uPulse);
        gl_FragColor=vec4(vec3(1.0,0.52,0.20)*I,1.0); }`
  }));

  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 + 0.22;
    const r = rand(27, 40);
    const h = rand(10, 25);
    const w = rand(0.9, 1.9);
    const x = Math.cos(a) * r;
    const z = -18 + Math.sin(a) * r * 0.82;
    const g = new THREE.BoxGeometry(w, h, w * rand(0.7, 1.3), 1, 8, 1);
    const m = new THREE.Mesh(g, matFor(i * 1.37));
    m.position.set(x, -13.5 + h * 0.5, z);
    m.rotation.y = rand(0, Math.PI);
    m.rotation.z = rand(-0.055, 0.055);
    scene.add(m);
    if (i % 2 === 0) {
      const gp = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), glowMat());
      gp.rotation.x = -Math.PI / 2;
      gp.position.set(x, -13.35, z);
      scene.add(gp);
    }
  }
}

/* ------------------------------------------------------------------ shards */
function buildShards() {
  const V = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
  const F = [[0,2,4],[2,1,4],[1,3,4],[3,0,4],[2,0,5],[1,2,5],[3,1,5],[0,3,5]];
  const P = [], N = [], C = [], SD = [];
  for (let i = 0; i < 110; i++) {
    const a = rand(0, Math.PI * 2), r = rand(9, 34);
    const center = [Math.cos(a) * r, rand(-10, 18), Math.sin(a) * r * 0.7 - 4];
    const sc = rand(0.12, 0.95);
    const ax = rand(0, 6.28), ay = rand(0, 6.28), az = rand(0, 6.28);
    const rot = (v) => {
      let [x, y, z] = v;
      let c = Math.cos(ax), s = Math.sin(ax); [y, z] = [y*c-z*s, y*s+z*c];
      c = Math.cos(ay); s = Math.sin(ay); [x, z] = [x*c+z*s, -x*s+z*c];
      c = Math.cos(az); s = Math.sin(az); [x, y] = [x*c-y*s, x*s+y*c];
      return [x*sc, y*sc, z*sc];
    };
    for (const f of F) {
      const p0 = rot(V[f[0]]), p1 = rot(V[f[1]]), p2 = rot(V[f[2]]);
      const u = [p1[0]-p0[0], p1[1]-p0[1], p1[2]-p0[2]];
      const v = [p2[0]-p0[0], p2[1]-p0[1], p2[2]-p0[2]];
      let n = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
      const l = Math.hypot(...n) || 1; n = n.map(q => q / l);
      for (const p of [p0, p1, p2]) {
        P.push(center[0]+p[0], center[1]+p[1], center[2]+p[2]);
        N.push(n[0], n[1], n[2]);
        C.push(center[0], center[1], center[2]);
        SD.push(i * 0.173);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('aCenter', new THREE.Float32BufferAttribute(C, 3));
  g.setAttribute('aSeed', new THREE.Float32BufferAttribute(SD, 1));
  g.computeBoundingSphere();

  const mat = reg(new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPulse: { value: 0 } },
    side: THREE.DoubleSide,
    vertexShader: `
      attribute vec3 aCenter; attribute float aSeed;
      varying vec3 vN; varying vec3 vV; varying float vS;
      uniform float uTime;
      void main(){
        vec3 d=position-aCenter;
        float t=uTime*0.11+aSeed*6.28;
        float c=cos(t),s=sin(t);
        d=vec3(d.x*c-d.z*s,d.y,d.x*s+d.z*c);
        float c2=cos(t*0.63),s2=sin(t*0.63);
        d=vec3(d.x,d.y*c2-d.z*s2,d.y*s2+d.z*c2);
        vec3 p=aCenter+d; p.y+=sin(uTime*0.28+aSeed*11.0)*0.55;
        vN=normalize(normalMatrix*normal);
        vec4 mv=modelViewMatrix*vec4(p,1.0); vV=-mv.xyz;
        vS=aSeed; gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader: COMMON + `
      varying vec3 vN; varying vec3 vV; varying float vS;
      uniform float uTime; uniform float uPulse;
      void main(){
        vec3 N=normalize(vN),V=normalize(vV);
        float fres=pow(1.0-abs(dot(N,V)),2.2);
        float diff=max(dot(N,normalize(vec3(0.4,0.7,0.6))),0.0);
        vec3 col=vec3(0.020,0.023,0.038)*(0.5+diff*0.8);
        col+=mix(vec3(1.0,0.62,0.26),vec3(0.55,0.80,1.0),fract(vS*3.7))*(fres*0.80+diff*0.12);
        col*=0.75+0.35*sin(uTime*0.9+vS*29.0);
        col+=vec3(1.0,0.7,0.35)*fres*uPulse*0.8;
        gl_FragColor=vec4(col,1.0);
      }`
  }));
  const m = new THREE.Mesh(g, mat);
  m.frustumCulled = false;
  scene.add(m);
}

/* ------------------------------------------------------------------- ground */
function buildGround() {
  const mat = reg(new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPulse: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: COMMON + `
      varying vec3 vW; uniform float uTime; uniform float uPulse;
      void main(){
        vec2 p=vW.xz; float r=length(p); float a=atan(p.y,p.x);
        float wave=sin(r*0.38-uTime*0.85)*0.5+0.5; wave*=exp(-r*0.012);
        float fine=sin(r*2.6-uTime*1.7)*0.5+0.5;
        float spokes=pow(abs(cos(a*36.0)),60.0)*exp(-r*0.016);
        vec2 f=abs(fract(p*0.10)-0.5); vec2 dst=0.5-f;
        float gl=(1.0-smoothstep(0.0,0.022,min(dst.x,dst.y)))*(1.0-smoothstep(38.0,88.0,r));
        float nearFade=1.0-smoothstep(58.0,132.0,r);
        wave*=nearFade; spokes*=nearFade; fine*=nearFade;
        float refl=exp(-pow(p.x*0.032,2.0))*exp(-abs(p.y+24.0)*0.017);
        vec3 col=vec3(0.007,0.009,0.021);
        col+=vec3(1.0,0.58,0.24)*(wave*0.032+spokes*0.030+gl*0.010);
        col+=vec3(0.30,0.66,1.0)*fine*0.007;
        col+=vec3(1.0,0.62,0.28)*refl*0.022*(1.0+uPulse);
        col+=vec3(1.0,0.72,0.40)*exp(-r*0.05)*0.028;
        vec3 toP=vW-cameraPosition;
        float dcam=length(toP);
        float dep=-toP.y/max(length(toP.xz),0.0001);
        col=mix(col,vec3(0.018,0.016,0.038),smoothstep(55.0,240.0,dcam));
        float alpha=smoothstep(0.025,0.32,dep);
        if(alpha<0.006) discard;
        gl_FragColor=vec4(col,alpha);
      }`
  }));
  const m = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = -13.5;
  m.renderOrder = -10;
  m.frustumCulled = false;
  scene.add(m);
}

/* ---------------------------------------------------------------- particles */
function buildVortex() {
  const COUNT = 54000;
  const seed = new Float32Array(COUNT * 4);
  const rr = new Float32Array(COUNT * 4);
  const pos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const arm = Math.floor(R() * 4);
    const scatter = (R() + R() + R() - 1.5) * 0.46;
    seed[i*4+0] = R();
    seed[i*4+1] = arm * (Math.PI * 2 / 4) + scatter;
    seed[i*4+2] = (R() + R() - 1) * (R() < 0.18 ? 1.8 : 1.0);
    seed[i*4+3] = rand(0.38, 1.55) * (R() < 0.028 ? 3.0 : 1.0);
    rr[i*4+0] = rand(0.45, 1.75);
    rr[i*4+1] = R();
    rr[i*4+2] = rand(0.18, 1.0);
    rr[i*4+3] = R() < 0.12 ? 1.0 : 0.0;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  g.setAttribute('aRand', new THREE.BufferAttribute(rr, 4));

  const mat = reg(new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uPR: { value: 1 }, uPulse: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) }
    },
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true,
    vertexShader: COMMON + `
      attribute vec4 aSeed; attribute vec4 aRand;
      uniform float uTime; uniform float uPR; uniform float uPulse;
      uniform vec2 uPointer;
      varying vec3 vCol; varying float vA; varying float vCore;
      void main(){
        float life=fract(aSeed.x+uTime*0.0021*aRand.x);
        float r=mix(66.0,0.25,pow(life,1.75));
        float ang=aSeed.y+(1.0-life)*5.6+uTime*0.006+uPointer.x*0.05;
        float flatten=mix(1.0,0.06,smoothstep(0.0,1.0,life));
        float y=aSeed.z*(0.30+r*0.052)*flatten+sin(ang*3.0+uTime*0.14)*0.42+uPointer.y*0.5;
        vec3 p=vec3(cos(ang)*r,y,sin(ang)*r*0.62);
        p+=vec3(sin(uTime*0.19+aSeed.y*7.0),cos(uTime*0.16+aSeed.x*11.0),sin(uTime*0.12+aSeed.z*5.0))*(0.25+0.75*life)*0.55;
        vec4 mv=modelViewMatrix*vec4(p,1.0);
        float depth=max(-mv.z,1.0);
        gl_Position=projectionMatrix*mv;
        gl_PointSize=clamp(aSeed.w*uPR*(170.0/depth),0.45,13.0);
        float birth=smoothstep(0.0,0.15,life);
        float death=1.0-smoothstep(0.86,1.0,life);
        float flare=exp(-r*0.20)*(1.45+uPulse*2.0);
        float edge=1.0-smoothstep(44.0,66.0,r);
        float outerFade=0.40+0.60*exp(-r*0.032);
        vA=birth*death*edge*(0.13+0.58*aRand.z)*(0.42+flare)*outerFade;
        float warm=1.0-smoothstep(5.0,48.0,r);
        vec3 cool=mix(vec3(0.22,0.44,1.0),vec3(0.48,0.78,1.0),aRand.y);
        vec3 gold=vec3(1.0,0.68,0.32), ember=vec3(1.0,0.32,0.16);
        vec3 c=mix(cool,gold,warm);
        c=mix(c,ember,smoothstep(0.84,1.0,aRand.y)*0.55*warm);
        c=mix(c,vec3(1.0,0.96,0.88),clamp(flare*0.38,0.0,0.90));
        vCol=c; vCore=aRand.w;
      }`,
    fragmentShader: `
      varying vec3 vCol; varying float vA; varying float vCore;
      void main(){
        vec2 q=gl_PointCoord*2.0-1.0;
        float d=dot(q,q);
        if(d>1.0) discard;
        float soft=exp(-d*4.2), core=exp(-d*24.0);
        float I=soft*0.52+core*0.95*vCore;
        gl_FragColor=vec4(vCol*I*vA,1.0);
      }`
  }));
  const pts = new THREE.Points(g, mat);
  pts.rotation.set(-0.28, 0.0, 0.10);
  pts.frustumCulled = false;
  scene.add(pts);
  S.vortex = pts;
  S.vortexCount = COUNT;
}

function buildAsh() {
  const COUNT = 820;
  const base = new Float32Array(COUNT * 3);
  const attr = new Float32Array(COUNT * 4);
  const pos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    base[i*3+0] = rand(-78, 78);
    base[i*3+1] = rand(-13, 38);
    base[i*3+2] = rand(-68, 46);
    attr[i*4+0] = rand(2.0, 8.5);
    attr[i*4+1] = R();
    attr[i*4+2] = R();
    attr[i*4+3] = rand(0.35, 1.4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aBase', new THREE.BufferAttribute(base, 3));
  g.setAttribute('aR', new THREE.BufferAttribute(attr, 4));
  const mat = reg(new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPR: { value: 1 }, uPulse: { value: 0 }, uPointer: { value: new THREE.Vector2(0, 0) } },
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: `
      attribute vec3 aBase; attribute vec4 aR;
      uniform float uTime; uniform float uPR; uniform float uPulse; uniform vec2 uPointer;
      varying vec3 vCol; varying float vA;
      void main(){
        vec3 p=aBase;
        p.x+=sin(uTime*0.085*aR.w+aR.y*6.28)*3.2+uPointer.x*2.2;
        p.y+=cos(uTime*0.065*aR.w+aR.y*4.0)*2.1+sin(uTime*0.02)*0.7+uPointer.y*1.4;
        p.z+=sin(uTime*0.05+aR.y*9.0)*2.6;
        vec4 mv=modelViewMatrix*vec4(p,1.0);
        gl_Position=projectionMatrix*mv;
        gl_PointSize=clamp(aR.x*uPR*(180.0/max(-mv.z,1.0)),1.0,44.0);
        vCol=mix(vec3(1.0,0.70,0.40),vec3(0.52,0.78,1.0),aR.z);
        vA=(0.035+0.075*aR.z)*(1.0+uPulse*1.4);
      }`,
    fragmentShader: `varying vec3 vCol; varying float vA;
      void main(){ vec2 q=gl_PointCoord*2.0-1.0; float d=dot(q,q); if(d>1.0) discard;
        float soft=exp(-d*3.4); float ring=exp(-pow((sqrt(d)-0.74)*7.0,2.0))*0.3;
        gl_FragColor=vec4(vCol*(soft*0.55+ring)*vA,1.0); }`
  }));
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  scene.add(pts);
}

/* ---------------------------------------------------------------- shockwaves */
function buildRingMaterial() {
  ringMat = reg(new THREE.ShaderMaterial({
    uniforms: { uAge: { value: 0 }, uPulse: { value: 0 } },
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform float uAge;
      void main(){
        float r=length(vUv-0.5)*2.0;
        float radius=uAge*0.62;
        float w=0.035+uAge*0.055;
        float ring=exp(-pow((r-radius)/w,2.0));
        float inner=exp(-pow(r/ (0.18+uAge*0.12),2.0))*exp(-uAge*4.0);
        float fade=exp(-uAge*1.15);
        vec3 c=mix(vec3(1.0,0.62,0.28),vec3(0.72,0.88,1.0),clamp(uAge*0.3,0.0,1.0));
        gl_FragColor=vec4(c*(ring*1.15+inner*0.32)*fade,1.0);
      }`
  }));
  const geo = new THREE.PlaneGeometry(2, 2);
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(geo, ringMat.clone());
    reg(m.material);
    m.visible = false;
    m.frustumCulled = false;
    m.renderOrder = 900;
    scene.add(m);
    burstPool.push(m);
  }
}

function spawnBurst(point) {
  const m = burstPool.find(x => !x.visible);
  if (!m) return;
  m.visible = true;
  m.position.copy(point);
  m.scale.setScalar(18);
  m.userData.birth = performance.now() / 1000;
  m.quaternion.copy(camera.quaternion);
  bursts.push(m);
}

/* =========================================================================
   POST PROCESSING
   ========================================================================= */
function buildPost() {
  brightMat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 0.80 } },
    vertexShader: FS_VERT,
    fragmentShader: `uniform sampler2D uTex; uniform vec2 uTexel; uniform float uThreshold; varying vec2 vUv;
      void main(){
        vec3 c=texture2D(uTex,vUv+uTexel*vec2(-1.0,-1.0)).rgb;
        c+=texture2D(uTex,vUv+uTexel*vec2(1.0,-1.0)).rgb;
        c+=texture2D(uTex,vUv+uTexel*vec2(-1.0,1.0)).rgb;
        c+=texture2D(uTex,vUv+uTexel*vec2(1.0,1.0)).rgb;
        c*=0.25;
        float l=dot(c,vec3(0.2126,0.7152,0.0722));
        gl_FragColor=vec4(c*smoothstep(uThreshold,uThreshold+0.5,l),1.0);
      }`
  });
  blurMat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: null }, uDir: { value: new THREE.Vector2() } },
    vertexShader: FS_VERT,
    fragmentShader: `uniform sampler2D uTex; uniform vec2 uDir; varying vec2 vUv;
      void main(){
        vec3 c=texture2D(uTex,vUv).rgb*0.227027;
        c+=texture2D(uTex,vUv+uDir*1.384615).rgb*0.316216;
        c+=texture2D(uTex,vUv-uDir*1.384615).rgb*0.316216;
        c+=texture2D(uTex,vUv+uDir*3.230769).rgb*0.070270;
        c+=texture2D(uTex,vUv-uDir*3.230769).rgb*0.070270;
        gl_FragColor=vec4(c,1.0);
      }`
  });
  copyMat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: null } }, vertexShader: FS_VERT,
    fragmentShader: `uniform sampler2D uTex; varying vec2 vUv; void main(){ gl_FragColor=vec4(texture2D(uTex,vUv).rgb,1.0); }`
  });
  compMat = new THREE.ShaderMaterial({
    uniforms: {
      uScene: { value: null }, uBloom: { value: null }, uWide: { value: null },
      uRes: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 }, uCA: { value: 0.006 }, uBloomI: { value: 0.85 },
      uFlash: { value: 0 }, uGrain: { value: 0.030 },
      uShock: { value: new THREE.Vector2(0.5, 0.5) }, uShockAge: { value: 99 }
    },
    vertexShader: FS_VERT,
    fragmentShader: COMMON + `
      uniform sampler2D uScene,uBloom,uWide;
      uniform vec2 uRes; uniform float uTime,uCA,uBloomI,uFlash,uGrain,uShockAge;
      uniform vec2 uShock; varying vec2 vUv;
      void main(){
        vec2 uv=vUv; vec2 c=uv-0.5; float r2=dot(c,c);
        float aspect=uRes.x/uRes.y;
        vec2 sd=(uv-uShock)*vec2(aspect,1.0);
        float d=length(sd);
        vec2 dir=normalize(uv-uShock+vec2(0.00001));
        float age=uShockAge;
        float wave=age*0.82;
        float ring=exp(-pow((d-wave)*13.0,2.0))*exp(-age*1.8)*(1.0-step(3.2,age));
        uv+=dir*ring*0.030;
        uv=clamp(uv,vec2(0.0),vec2(1.0));
        vec2 ca=c*r2*uCA;
        vec3 col;
        col.r=texture2D(uScene,uv+ca).r;
        col.g=texture2D(uScene,uv).g;
        col.b=texture2D(uScene,uv-ca).b;
        vec3 b=texture2D(uBloom,uv).rgb*0.46+texture2D(uWide,uv).rgb*0.60;
        col+=b*uBloomI;
        col+=vec3(1.0,0.76,0.48)*ring*0.34;
        float lum=dot(col,vec3(0.2126,0.7152,0.0722));
        col=mix(col,col*vec3(1.07,0.99,1.10),0.55);
        col+=vec3(0.010,0.016,0.040)*(1.0-smoothstep(0.0,0.28,lum));
        col+=vec3(0.055,0.028,0.004)*smoothstep(0.55,1.6,lum);
        col=(col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14);
        col+=vec3(1.0,0.92,0.78)*uFlash;
        float vig=1.0-0.60*pow(min(length(c)*1.40,1.0),2.2);
        col*=vig;
        col+=(hash21(uv*uRes+fract(uTime)*137.0)-0.5)*uGrain;
        col*=1.0-0.010*sin(uv.y*uRes.y*1.6);
        col=max(col,vec3(0.0));
        gl_FragColor=vec4(pow(col,vec3(1.0/2.2)),1.0);
      }`
  });
}

function blur(src, dst, dx, dy, radius, w, h) {
  blurMat.uniforms.uTex.value = src.texture;
  blurMat.uniforms.uDir.value.set(dx * radius / w, dy * radius / h);
  quad.draw(blurMat, dst);
}

function renderFrame() {
  renderer.info.reset();
  renderer.setRenderTarget(rtScene);
  renderer.clear();
  renderer.render(scene, camera);

  const fw = rtScene.width, fh = rtScene.height;
  const hw = rtH1.width, hh = rtH1.height;
  const qw = rtQ1.width, qh = rtQ1.height;

  brightMat.uniforms.uTex.value = rtScene.texture;
  brightMat.uniforms.uTexel.value.set(1 / fw, 1 / fh);
  quad.draw(brightMat, rtH1);

  blur(rtH1, rtH2, 1, 0, 1.0, hw, hh);
  blur(rtH2, rtH1, 0, 1, 1.0, hw, hh);
  blur(rtH1, rtH2, 1, 0, 2.6, hw, hh);
  blur(rtH2, rtH1, 0, 1, 2.6, hw, hh);

  copyMat.uniforms.uTex.value = rtH1.texture;
  quad.draw(copyMat, rtQ1);
  blur(rtQ1, rtQ2, 1, 0, 3.6, qw, qh);
  blur(rtQ2, rtQ1, 0, 1, 3.6, qw, qh);

  compMat.uniforms.uScene.value = rtScene.texture;
  compMat.uniforms.uBloom.value = rtH1.texture;
  compMat.uniforms.uWide.value = rtQ1.texture;
  compMat.uniforms.uTime.value = S.t;
  compMat.uniforms.uFlash.value = S.flash;
  compMat.uniforms.uShock.value.set(S.shock ? S.shock.x : 0.5, S.shock ? S.shock.y : 0.5);
  compMat.uniforms.uShockAge.value = S.shockAge;
  compMat.uniforms.uBloomI.value = 0.85 + S.pulse * 0.4;
  quad.draw(compMat, null);
}

/* =========================================================================
   AUDIO (generative ambient, opt-in)
   ========================================================================= */
let actx = null, master = null, bellTimer = null;
function initAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  actx = new AC();
  master = actx.createGain();
  master.gain.value = 0;
  master.connect(actx.destination);

  const lp = actx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 340; lp.Q.value = 0.6;
  lp.connect(master);
  [[55, 0.20, 'sine'], [55.31, 0.13, 'sine'], [82.5, 0.075, 'triangle'], [110.2, 0.038, 'sine']]
    .forEach(([f, g, type]) => {
      const o = actx.createOscillator(); o.type = type; o.frequency.value = f;
      const gn = actx.createGain(); gn.gain.value = g;
      o.connect(gn); gn.connect(lp); o.start();
    });

  const len = actx.sampleRate * 4;
  const buf = actx.createBuffer(1, len, actx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
  const src = actx.createBufferSource(); src.buffer = buf; src.loop = true;
  const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 190; bp.Q.value = 0.55;
  const ng = actx.createGain(); ng.gain.value = 0.11;
  src.connect(bp); bp.connect(ng); ng.connect(master); src.start();
  const lfo = actx.createOscillator(); lfo.frequency.value = 0.055;
  const lg = actx.createGain(); lg.gain.value = 130;
  lfo.connect(lg); lg.connect(bp.frequency); lfo.start();
  return true;
}
function bell() {
  if (!actx || !S.audioOn) return;
  const t = actx.currentTime;
  const f = [523.25, 392.0, 659.25, 783.99][Math.floor(Math.random() * 4)];
  const o = actx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
  const g = actx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.055, t + 0.025);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 5.0);
  const dl = actx.createDelay(1.0); dl.delayTime.value = 0.34;
  const fb = actx.createGain(); fb.gain.value = 0.34;
  o.connect(g); g.connect(master); g.connect(dl);
  dl.connect(fb); fb.connect(dl); dl.connect(master);
  o.start(t); o.stop(t + 5.1);
}
function toggleAudio() {
  if (!actx && !initAudio()) return;
  if (actx.state === 'suspended') actx.resume();
  S.audioOn = !S.audioOn;
  master.gain.setTargetAtTime(S.audioOn ? 0.17 : 0.0, actx.currentTime, 0.7);
  clearInterval(bellTimer);
  if (S.audioOn) { bell(); bellTimer = setInterval(bell, 7200); }
  const btn = document.getElementById('btnAudio');
  btn.classList.toggle('on', S.audioOn);
  btn.querySelector('i').textContent = S.audioOn ? 'ON' : 'OFF';
}

/* =========================================================================
   INTERACTION
   ========================================================================= */
function triggerShock(x, y, big) {
  S.shock = { x, y };
  S.shockAge = 0;
  S.pulse = Math.min(1.3, S.pulse + (big ? 0.95 : 0.34));
  S.flash = Math.max(S.flash, big ? 0.26 : 0.022);
  const v = new THREE.Vector3(x * 2 - 1, y * 2 - 1, 0.5).unproject(camera);
  const dir = v.sub(camera.position).normalize();
  const point = big ? new THREE.Vector3(0, 1, 2) : camera.position.clone().add(dir.multiplyScalar(42));
  spawnBurst(point);
  if (big) spawnBurst(new THREE.Vector3(0, 1, -12));
}

function setPaused(v) {
  S.paused = v;
  const b = document.getElementById('btnPause');
  b.textContent = v ? '继 续' : '静 止';
  b.classList.toggle('on', v);
}
function setReverse(v) {
  S.dir = v ? -1 : 1;
  const b = document.getElementById('btnReverse');
  b.classList.toggle('on', v);
  b.textContent = v ? '前 进' : '逆 转';
}

function bindEvents() {
  const canvas = document.getElementById('stage');
  const cursor = document.getElementById('cursor');
  const drag = { on: false, x: 0, y: 0, sx: 0, sy: 0, moved: 0 };

  const moveCursor = (e) => {
    cursor.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
    cursor.style.opacity = 1;
  };
  window.addEventListener('pointermove', (e) => {
    moveCursor(e);
    ndc.x = (e.clientX / W) * 2 - 1;
    ndc.y = -((e.clientY / H) * 2 - 1);
    S.lastInput = performance.now();
    if (drag.on) {
      isDragging = true;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      rig.tTheta -= dx * 0.0042;
      rig.tPhi = clamp(rig.tPhi - dy * 0.0032, 0.50, 2.42);
      drag.x = e.clientX; drag.y = e.clientY;
    }
  }, { passive: true });
  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest && e.target.closest('button')) return;
    drag.on = true; drag.x = drag.sx = e.clientX; drag.y = drag.sy = e.clientY; drag.moved = 0;
    cursor.classList.add('active', 'down');
    S.lastInput = performance.now();
  });
  window.addEventListener('pointerup', (e) => {
    cursor.classList.remove('down');
    if (drag.on && drag.moved < 7) {
      const x = e.clientX / W, y = 1 - e.clientY / H;
      triggerShock(x, y, false);
    }
    drag.on = false;
    isDragging = false;
    S.lastInput = performance.now();
  });
  window.addEventListener('pointerleave', () => { cursor.style.opacity = 0; });
  window.addEventListener('wheel', (e) => {
    e.preventDefault();
    S.t += e.deltaY * 0.018;
    S.scrub = Math.min(4.5, S.scrub + Math.abs(e.deltaY) * 0.0011);
    S.flash = Math.min(0.10, S.flash + Math.abs(e.deltaY) * 0.00006);
    S.lastInput = performance.now();
  }, { passive: false });
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    S.lastInput = performance.now();
    if (k === ' ' || e.code === 'Space') { e.preventDefault(); setPaused(!S.paused); }
    else if (k === 'r') setReverse(S.dir === 1);
    else if (k === 'h') document.getElementById('ui').classList.toggle('hidden');
    else if (k === 'm') toggleAudio();
    else if (k === '1' || k === '2' || k === '3') {
      const p = [{ theta: 0.0, phi: 1.42, radius: 56 },
                 { theta: 0.82, phi: 1.16, radius: 38 },
                 { theta: -0.66, phi: 1.76, radius: 79 }][+k - 1];
      rig.tTheta = p.theta; rig.tPhi = p.phi; rig.tRadius = p.radius;
    }
  });
  window.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('resize', onResize);

  document.getElementById('btnPause').addEventListener('click', () => setPaused(!S.paused));
  document.getElementById('btnReverse').addEventListener('click', () => setReverse(S.dir === 1));
  document.getElementById('btnAudio').addEventListener('click', toggleAudio);
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); showFatal(new Error('WebGL 上下文丢失，请刷新页面')); });
}

function onResize() {
  W = window.innerWidth; H = window.innerHeight;
  DPR = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(DPR);
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  resizeTargets();
}

/* ------------------------------------------------------------------- HUD */
const el = {};
function cacheHUD() {
  ['clock', 'flow', 'entropy', 'entropyNum', 'stateTxt', 'code', 'loadSub'].forEach(k => el[k] = document.getElementById(k));
}
function updateHUD() {
  const mod = ((S.t % CYCLE) + CYCLE) % CYCLE;
  const rem = CYCLE - mod;
  const mm = Math.floor(rem / 60), ss = Math.floor(rem % 60), ms = Math.floor((rem % 1) * 1000);
  el.clock.textContent = `T − 00:${pad(mm)}:${pad(ss)}.${pad(ms, 3)}`;
  const p = 1 - rem / CYCLE;
  el.entropy.style.width = (p * 100).toFixed(2) + '%';
  el.entropyNum.textContent = (p * 0.9999).toFixed(4);
  el.stateTxt.textContent = p > 0.985 ? 'SINGULARITY' : (S.dir < 0 ? 'REWINDING' : 'COLLAPSING');
  const flow = S.paused ? 0 : S.dir * (1 + S.scrub);
  el.flow.textContent = `FLOW  ${flow >= 0 ? '+' : ''}${flow.toFixed(2)}×  ·  ${S.paused ? 'FROZEN' : (S.dir < 0 ? 'REVERSE' : 'FORWARD')}${S.scrub > 0.15 ? '  ·  DILATION' : ''}`;
  el.code.textContent = `EOT—${String(Math.floor(Math.abs(S.t) * 10) % 10000).padStart(4, '0')} / ${(rem).toFixed(3)} Hz`;
}

/* =========================================================================
   MAIN LOOP
   ========================================================================= */
let prev = 0, frames = 0, fps = 60, fpsT = 0, lastCycle = 0;
let adaptClock = 0, quality = 1.0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - prev) / 1000 || 0.016, 0.05);
  prev = now;
  frames++; fpsT += dt;
  if (fpsT > 0.7) { fps = frames / fpsT; frames = 0; fpsT = 0; }
  adaptClock += dt;
  if (adaptClock > 3.2) {
    adaptClock = 0;
    if (fps < 26 && quality > 0.5 && S.vortex) {
      quality = Math.max(0.5, quality - 0.18);
      S.vortex.geometry.setDrawRange(0, Math.floor(S.vortexCount * quality));
    }
  }

  if (!S.paused) S.t += dt * S.dir * (1 + S.scrub * 2.2);
  S.scrub *= Math.pow(0.055, dt);
  S.pulse *= Math.pow(0.045, dt);
  S.flash *= Math.pow(0.006, dt);
  S.shockAge += dt;

  const cy = Math.floor(S.t / CYCLE);
  if (cy !== lastCycle) {
    if (S.dir > 0) { S.flash = 0.55; triggerShock(0.5, 0.5, true); }
    lastCycle = cy;
  }

  // idle cinematic drift
  const idle = now - S.lastInput;
  if (idle > 7000 && !isDragging) {
    rig.tTheta += dt * 0.018;
    rig.tPhi += (1.42 + Math.sin(S.t * 0.06) * 0.11 - rig.tPhi) * dt * 0.25;
  }
  const k = 1 - Math.pow(0.0016, dt);
  rig.theta += (rig.tTheta - rig.theta) * k;
  rig.phi += (rig.tPhi - rig.phi) * k;
  rig.radius += (rig.tRadius - rig.radius) * k;
  ndcSmooth.x += (ndc.x - ndcSmooth.x) * (1 - Math.pow(0.02, dt));
  ndcSmooth.y += (ndc.y - ndcSmooth.y) * (1 - Math.pow(0.02, dt));

  const sph = new THREE.Spherical(rig.radius, rig.phi, rig.theta);
  const pos = new THREE.Vector3().setFromSpherical(sph);
  pos.x += Math.sin(S.t * 0.07) * 0.75;
  pos.y += Math.cos(S.t * 0.05) * 0.5 + 1.0;
  camera.position.copy(pos);
  camera.lookAt(-3.2 + ndcSmooth.x * 1.7, 1.0 + ndcSmooth.y * 1.1, 0);

  // hands: frozen one second before midnight, second hand crawling backwards
  if (S.hands) {
    S.hands[0].rotation.z = -0.030 + S.t * 0.0008;
    S.hands[1].rotation.z = -0.078 + S.t * 0.0042;
    S.hands[2].rotation.z = -0.150 - S.t * 0.027 + Math.sin(S.t * 7.0) * 0.0035;
  }
  if (S.hubRings) S.hubRings.forEach(r => { r.rotation.z += r.userData.spin * dt * 0.4; });
  if (S.dial) S.dial.rotation.z = 0.025 + Math.sin(S.t * 0.11) * 0.012;

  // uniforms
  const n2 = new THREE.Vector2(ndcSmooth.x, ndcSmooth.y);
  for (const m of allMats) {
    const u = m.uniforms;
    if (u.uTime) u.uTime.value = S.t * (m.userData.timeScale || 1) + (m.userData.timeOffset || 0);
    if (u.uPulse) u.uPulse.value = S.pulse;
    if (u.uPR) u.uPR.value = DPR;
    if (u.uPointer) u.uPointer.value.copy(n2);
  }

  // bursts
  const tsec = now / 1000;
  for (let i = bursts.length - 1; i >= 0; i--) {
    const m = bursts[i];
    const age = tsec - m.userData.birth;
    m.material.uniforms.uAge.value = age;
    m.quaternion.copy(camera.quaternion);
    m.scale.setScalar(18 + age * 14);
    if (age > 3.2) { m.visible = false; bursts.splice(i, 1); }
  }

  renderFrame();
  updateHUD();
  window.__EOT_STATS = { fps: Math.round(fps), drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, t: S.t.toFixed(2) };
}

/* =========================================================================
   BOOT
   ========================================================================= */
async function init() {
  THREE = await loadThree();
  const canvas = document.getElementById('stage');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (THREE.LinearSRGBColorSpace) renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x02030a, 1);
  renderer.autoClear = true;
  renderer.info.autoReset = false;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 600);
  quad = new Quad();

  buildSky();
  buildEclipse();
  buildGround();
  buildMonoliths();
  buildShards();
  buildDial();
  buildVortex();
  buildAsh();
  buildRingMaterial();
  buildPost();

  cacheHUD();
  bindEvents();
  onResize();
  lastCycle = Math.floor(S.t / CYCLE);

  document.getElementById('loadSub').textContent = 'THE LAST SECOND IS READY';
  requestAnimationFrame((t) => { prev = t; frame(t); });
  setTimeout(() => document.getElementById('loader').classList.add('done'), 900);
  S.lastInput = performance.now();
  window.__EOT = { S, renderer, scene, camera, THREE };
  window.__EOT_READY = true;
}

window.addEventListener('error', (e) => { if (!window.__EOT_READY) showFatal(e.error || e.message); });
window.addEventListener('unhandledrejection', (e) => { if (!window.__EOT_READY) showFatal(e.reason); });

boot();
async function boot() {
  try { await init(); }
  catch (err) { showFatal(err); }
}

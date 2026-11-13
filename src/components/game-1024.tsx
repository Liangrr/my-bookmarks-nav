"use client";

/**
 * 1024 数字合并（Web 端视图）
 *
 * 纯逻辑来自 @shared-lib/game1024，与小程序端共用同一套合并算法。
 * 这里只负责：DOM 渲染 / 输入 / 动画 / 本地存档 / 音效。
 * 动画分两帧：先把旧块按 paths 滑到目标格，145ms 后再换成新棋盘，
 * 这样 React 数据驱动也能复现「两块滑到一起再弹出」的手感。
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  MAX_UNDOS,
  cloneState,
  createGame,
  move,
  reviveState,
  scoreSheet,
  type Direction,
  type GameState,
  type Grid,
} from "@shared-lib/game1024";

const STORAGE_KEY = "g1024.web.v1";
const SOUND_KEY = "g1024.web.sound";
const BEST_KEY = "g1024.web.best";
const TICKS = [64, 128, 256, 512, 1024];
const PAD = 2.2; // 棋盘内边距，占宽度百分比
const CELL = (100 - PAD * 5) / 4;

type Session = {
  state: GameState;
  undoStack: GameState[];
  undosLeft: number;
};
type DisplayTile = { id: number; value: number; r: number; c: number };
type Display = { tiles: DisplayTile[]; spawnId: number | null; mergedIds: number[] };
type Overlay = "none" | "confirm" | "share" | "win" | "over";

function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* 隐私模式下忽略 */ }
}
function freshSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 1e9)) | 0 || 1;
}
function readSession(): Session {
  const raw = lsGet(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { state?: unknown; undoStack?: unknown; undosLeft?: unknown };
      const state = reviveState(parsed.state);
      if (state) {
        const stack = Array.isArray(parsed.undoStack)
          ? parsed.undoStack.map(reviveState).filter((x): x is GameState => x !== null)
          : [];
        return {
          state,
          undoStack: stack,
          undosLeft: typeof parsed.undosLeft === "number" ? parsed.undosLeft : MAX_UNDOS,
        };
      }
    } catch { /* 坏存档直接开新局 */ }
  }
  const best = Number(lsGet(BEST_KEY) ?? 0) || 0;
  return { state: createGame(freshSeed(), best), undoStack: [], undosLeft: MAX_UNDOS };
}
function tilesOf(grid: Grid): DisplayTile[] {
  const out: DisplayTile[] = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid.length; c++) {
      const t = grid[r][c];
      if (t) out.push({ id: t.id, value: t.value, r, c });
    }
  }
  return out;
}
function posStyle(r: number, c: number) {
  return {
    left: `${PAD + c * (CELL + PAD)}%`,
    top: `${PAD + r * (CELL + PAD)}%`,
    width: `${CELL}%`,
    height: `${CELL}%`,
  };
}
function faceClass(v: number) {
  const digits = String(v).length;
  const size = digits >= 5 ? " d5" : digits === 4 ? " d4" : digits === 3 ? " d3" : "";
  return `g1024-face ${v > 2048 ? "super" : `v${v}`}${size}`;
}

export default function Game1024() {
  // 本组件由 dynamic(..., { ssr:false }) 加载，初始化时一定在浏览器里，可安全读 localStorage
  const [session, setSession] = useState<Session>(readSession);
  // display=null 表示「直接按当前棋盘渲染」；移动动画期间才短暂写入中间态
  const [display, setDisplay] = useState<Display | null>(null);
  const [overlay, setOverlay] = useState<Overlay>("none");
  const [toast, setToast] = useState("");
  const [soundOn, setSoundOn] = useState(() => lsGet(SOUND_KEY) !== "off");
  const [nudging, setNudging] = useState(false);

  const animatingRef = useRef(false);
  const genRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);

  const { state, undosLeft, undoStack } = session;
  const derivedOverlay: Overlay = state.over ? "over" : state.won && !state.keepPlaying ? "win" : "none";
  const activeOverlay: Overlay = overlay !== "none" ? overlay : derivedOverlay;
  const shown: Display = display ?? { tiles: tilesOf(state.grid), spawnId: null, mergedIds: [] };
  const merged = new Set(shown.mergedIds);

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(""), 1500);
  }, []);

  // 自动存档：整局状态 + 撤销栈都落盘，刷新页面接着玩
  useEffect(() => {
    lsSet(BEST_KEY, String(state.best));
    lsSet(STORAGE_KEY, JSON.stringify({ state, undoStack, undosLeft }));
  }, [state, undoStack, undosLeft]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
  }, []);

  const beep = useCallback((freq: number, dur = 0.09, delay = 0, gain = 0.05) => {
    if (!soundOn) return;
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      if (!audioRef.current) audioRef.current = new AC();
      const ctx = audioRef.current;
      if (ctx.state === "suspended") void ctx.resume();
      const t = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.03);
    } catch { /* 音频不可用不影响游戏 */ }
  }, [soundOn]);

  const doMove = useCallback((dir: Direction) => {
    if (animatingRef.current || activeOverlay !== "none") return;

    // 不直接改 React state：先克隆，再把结果作为新对象 setSession
    const s = cloneState(state);
    const res = move(s, dir);
    if (!res.moved) {
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
      setNudging(false);
      requestAnimationFrame(() => setNudging(true));
      nudgeTimer.current = setTimeout(() => setNudging(false), 190);
      return;
    }

    const gen = ++genRef.current;
    animatingRef.current = true;
    setDisplay({
      tiles: res.paths.map((p) => ({ id: p.id, value: p.value, r: p.to.r, c: p.to.c })),
      spawnId: null,
      mergedIds: [],
    });
    setSession((prev) => ({
      state: s,
      undoStack: [...prev.undoStack, cloneState(prev.state)].slice(-MAX_UNDOS),
      undosLeft: prev.undosLeft,
    }));

    beep(190, 0.05, 0, 0.025);
    if (res.mergeCount) {
      const base = 300 + Math.min(520, Math.log2(res.gained / res.mergeCount) * 55);
      beep(base, 0.11, 0.055, 0.055);
      if (res.mergeCount >= 2) {
        beep(base * 1.26, 0.11, 0.105, 0.045);
        beep(base * 1.5, 0.13, 0.16, 0.04);
      }
    }
    if (res.wonFirst) [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.22, 0.18 + i * 0.1, 0.06));
    else if (res.over) [330, 262, 196].forEach((f, i) => beep(f, 0.2, 0.16 + i * 0.12, 0.05));

    setTimeout(() => {
      if (genRef.current !== gen) return; // 期间重开 / 撤销了，丢弃这次动画收尾
      setDisplay({
        tiles: tilesOf(s.grid),
        spawnId: res.spawn?.id ?? null,
        mergedIds: res.mergedIds,
      });
      animatingRef.current = false;
      if (res.wonFirst) showToast("1024 达成！");
      else if (res.milestone) showToast(`里程碑 ${res.milestone} 达成`);
      else if (res.mergeCount >= 2) showToast(`连击 ×${res.mergeCount}  +${res.comboBonus}`);
    }, 145);
  }, [activeOverlay, state, beep, showToast]);

  const doUndo = useCallback(() => {
    if (animatingRef.current || undosLeft <= 0 || !undoStack.length) return;
    genRef.current++;
    setSession((prev) => ({
      state: prev.undoStack[prev.undoStack.length - 1]!,
      undoStack: prev.undoStack.slice(0, -1),
      undosLeft: prev.undosLeft - 1,
    }));
    setDisplay(null);
    setOverlay("none");
    showToast("已撤销一步");
  }, [undosLeft, undoStack.length, showToast]);

  const restart = useCallback(() => {
    genRef.current++;
    animatingRef.current = false;
    const best = Math.max(state.best, Number(lsGet(BEST_KEY) ?? 0) || 0);
    const next = createGame(freshSeed(), best);
    setSession({ state: next, undoStack: [], undosLeft: MAX_UNDOS });
    setDisplay(null);
    setOverlay("none");
    showToast("新的一局");
  }, [state.best, showToast]);

  const continuePlaying = useCallback(() => {
    setSession((prev) => ({ ...prev, state: { ...prev.state, keepPlaying: true } }));
    showToast("继续挑战 2048");
  }, [showToast]);

  const copyScore = useCallback(() => {
    const text = scoreSheet(state, "1024 · 星轨网页版");
    const fallback = () => {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (ok) { showToast("成绩单已复制"); return; }
      } catch { /* 继续降级 */ }
      setOverlay("share");
      showToast("请手动复制成绩单");
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast("成绩单已复制，去分享吧")).catch(fallback);
    } else fallback();
  }, [state, showToast]);

  // 键盘：方向键 / WASD / Ctrl(Cmd)+Z 撤销
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        doUndo();
        return;
      }
      const map: Record<string, Direction> = {
        ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
        a: "left", d: "right", w: "up", s: "down",
        A: "left", D: "right", W: "up", S: "down",
      };
      const dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      doMove(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doMove, doUndo]);

  // 触摸 / 鼠标滑动：pointerup 绑在 window，手指划出棋盘也能判定
  useEffect(() => {
    const onUp = (e: PointerEvent) => {
      const start = swipeRef.current;
      if (!start) return;
      swipeRef.current = null;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      doMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    };
    const onCancel = () => { swipeRef.current = null; };
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, [doMove]);

  const progress = Math.max(0, Math.min(100, (Math.log2(Math.max(2, state.maxTile)) - 1) / 9 * 100));

  return (
    <div className="g1024">
      <header className="g1024-head">
        <div>
          <div className="g1024-logo">1024</div>
          <div className="g1024-tagline">相同数字相加 · 合到 1024 即通关</div>
        </div>
        <div className="g1024-scores">
          <div className="g1024-score-box"><span>分数</span><b>{state.score.toLocaleString("en-US")}</b></div>
          <div className="g1024-score-box"><span>最佳</span><b>{state.best.toLocaleString("en-US")}</b></div>
        </div>
      </header>

      <div className="g1024-tools">
        <button type="button" className="g1024-btn primary" onClick={() => {
          if (!state.over && state.score > 0 && overlay === "none") setOverlay("confirm");
          else restart();
        }}>新游戏</button>
        <button type="button" className="g1024-btn" onClick={doUndo} disabled={undosLeft <= 0 || !undoStack.length}>
          撤销 <span className="g1024-badge">{undosLeft}</span>
        </button>
        <button type="button" className="g1024-btn icon" title={soundOn ? "音效：开" : "音效：关"} onClick={() => {
          const next = !soundOn;
          setSoundOn(next);
          lsSet(SOUND_KEY, next ? "on" : "off");
          if (next) beep(660, 0.1, 0, 0.05);
        }}>{soundOn ? "♪" : "×"}</button>
        <button type="button" className="g1024-btn icon" title="分享成绩" onClick={copyScore}>↗</button>
      </div>

      <div className="g1024-hud">
        <div className="g1024-next">
          <span>下一块</span>
          <div className={`g1024-mini v${state.nextTile}`}>{state.nextTile}</div>
        </div>
        <div className="g1024-progress">
          <div className="g1024-progress-head"><span>里程碑进度</span><b>{state.maxTile}</b></div>
          <div className="g1024-bar"><i style={{ width: `${progress}%` }} /></div>
          <div className="g1024-ticks">
            {TICKS.map((v) => <span key={v} className={state.maxTile >= v ? "on" : ""}>{v}</span>)}
          </div>
        </div>
      </div>

      <div
        className={`g1024-board${nudging ? " nudge" : ""}`}
        onPointerDown={(e) => { swipeRef.current = { x: e.clientX, y: e.clientY }; }}
        style={{ touchAction: "none" }}
      >
        <div className="g1024-bg">
          {Array.from({ length: 16 }, (_, i) => (
            <div key={i} className="g1024-cell" style={posStyle(Math.floor(i / 4), i % 4)} />
          ))}
        </div>
        <div className="g1024-tiles">
          {shown.tiles.map((t) => (
            <div
              key={t.id}
              className={`g1024-tile${t.id === shown.spawnId ? " appear" : merged.has(t.id) ? " pop" : ""}`}
              style={posStyle(t.r, t.c)}
            >
              <div className={faceClass(t.value)}>{t.value}</div>
            </div>
          ))}
        </div>
        {toast ? <div className="g1024-toast">{toast}</div> : null}

        {activeOverlay !== "none" ? (
          <div className="g1024-overlay">
            {activeOverlay === "win" ? (
              <>
                <h2>1024 达成！</h2>
                <p>用了 {state.moves} 步 · 得分 {state.score.toLocaleString("en-US")}<br />还想继续往上合吗？</p>
                <div className="g1024-overlay-row">
                  <button type="button" className="g1024-btn primary" onClick={continuePlaying}>继续挑战 2048</button>
                  <button type="button" className="g1024-btn" onClick={copyScore}>分享成绩</button>
                  <button type="button" className="g1024-btn" onClick={restart}>再来一局</button>
                </div>
              </>
            ) : null}
            {activeOverlay === "over" ? (
              <>
                <h2>无路可走了</h2>
                <p>最终得分 {state.score.toLocaleString("en-US")} · 最大数字 {state.maxTile}<br />共 {state.moves} 步</p>
                <div className="g1024-overlay-row">
                  <button type="button" className="g1024-btn primary" onClick={restart}>再来一局</button>
                  {undosLeft > 0 && undoStack.length ? (
                    <button type="button" className="g1024-btn" onClick={doUndo}>撤销一步复活</button>
                  ) : null}
                  <button type="button" className="g1024-btn" onClick={copyScore}>分享成绩</button>
                </div>
              </>
            ) : null}
            {activeOverlay === "confirm" ? (
              <>
                <h2>重新开始？</h2>
                <p>当前进度会丢失，得分 {state.score.toLocaleString("en-US")}</p>
                <div className="g1024-overlay-row">
                  <button type="button" className="g1024-btn primary" onClick={() => setOverlay("none")}>继续当前局</button>
                  <button type="button" className="g1024-btn" onClick={restart}>确定重开</button>
                </div>
              </>
            ) : null}
            {activeOverlay === "share" ? (
              <>
                <h2>成绩单</h2>
                <p>自动复制失败，可选中下面内容手动复制</p>
                <textarea className="g1024-share" readOnly value={scoreSheet(state, "1024 · 星轨网页版")} onFocus={(e) => e.currentTarget.select()} />
                <div className="g1024-overlay-row">
                  <button type="button" className="g1024-btn primary" onClick={copyScore}>再试一次</button>
                  <button type="button" className="g1024-btn" onClick={() => setOverlay("none")}>关闭</button>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="g1024-dpad">
        {(["left", "up", "down", "right"] as Direction[]).map((d) => (
          <button key={d} type="button" className="g1024-btn" onClick={() => doMove(d)} aria-label={d}>
            {d === "left" ? "←" : d === "up" ? "↑" : d === "down" ? "↓" : "→"}
          </button>
        ))}
      </div>

      <p className="g1024-howto">
        方向键 / WASD / 在棋盘上滑动 / 点击下方方向键 · 无时间限制，进度自动保存在本机
      </p>

      <details className="g1024-design">
        <summary>这些手感来自哪些成功案例</summary>
        <ul>
          <li><b>1024 → 2048</b>：极简 4×4 规则、无倒计时；通关后仍可继续冲更高。</li>
          <li><b>Threes!</b>：下一块预览，把运气变成可计算的风险。</li>
          <li><b>合成大西瓜 / 三消</b>：里程碑提示与连击加分，短周期正反馈。</li>
          <li><b>2048 现代改版</b>：有限撤销；死局时可用撤销复活。</li>
          <li><b>Wordle</b>：可复制的纯文本成绩单，自带分享钩子。</li>
        </ul>
      </details>
    </div>
  );
}

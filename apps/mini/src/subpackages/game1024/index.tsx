import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
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
} from "@shared-lib/game1024";

/**
 * 1024 数字合并（小程序端）
 * 合并算法与 Web 端共用 @shared-lib/game1024；这里只做 Taro 视图与端能力：
 * 触摸滑动 + 方向按钮、Taro Storage 存档、vibrateShort 触感、setClipboardData 成绩单。
 * 小程序没有 DOM / 键盘 / WebAudio，因此滑动改为一次性重渲染 + 新块弹出动画。
 */

const STORAGE_KEY = "g1024.mini.v1";
const BEST_KEY = "g1024.mini.best";
const TICKS = [64, 128, 256, 512, 1024];

type Session = { state: GameState; undoStack: GameState[]; undosLeft: number };
type Dialog = "none" | "confirm" | "win" | "over";

function storageGet(key: string): unknown {
  try { return Taro.getStorageSync(key); } catch { return null; }
}
function storageSet(key: string, value: unknown) {
  try { Taro.setStorageSync(key, value); } catch { /* 存储不可用时仍能玩 */ }
}
function freshSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 1e9)) | 0 || 1;
}
function readSession(): Session {
  const raw = storageGet(STORAGE_KEY) as { state?: unknown; undoStack?: unknown; undosLeft?: unknown } | null;
  if (raw && typeof raw === "object") {
    const state = reviveState(raw.state);
    if (state) {
      const stack = Array.isArray(raw.undoStack)
        ? raw.undoStack.map(reviveState).filter((x): x is GameState => x !== null)
        : [];
      return {
        state,
        undoStack: stack,
        undosLeft: typeof raw.undosLeft === "number" ? raw.undosLeft : MAX_UNDOS,
      };
    }
  }
  const best = Number(storageGet(BEST_KEY) ?? 0) || 0;
  return { state: createGame(freshSeed(), best), undoStack: [], undosLeft: MAX_UNDOS };
}
function buzz() {
  // 触感反馈替代 WebAudio 音效：不引入音频文件，避免占包体
  try { void Taro.vibrateShort({ type: "light" }).catch(() => {}); } catch { /* 不支持则忽略 */ }
}
function tileClass(v: number): string {
  if (v > 2048) return "g1024-tile g1024-super";
  return `g1024-tile g1024-v${v}`;
}

export default function Game1024() {
  const [session, setSession] = useState<Session>(readSession);
  const [flash, setFlash] = useState<number[]>([]);
  const [tip, setTip] = useState("");
  const [dialog, setDialog] = useState<Dialog>("none");

  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { state, undoStack, undosLeft } = session;
  const derived: Dialog = state.over ? "over" : state.won && !state.keepPlaying ? "win" : "none";
  const activeDialog: Dialog = dialog !== "none" ? dialog : derived;
  const progress = Math.max(0, Math.min(100, (Math.log2(Math.max(2, state.maxTile)) - 1) / 9 * 100));
  const flashSet = new Set(flash);

  const showTip = useCallback((msg: string) => {
    if (tipTimer.current) clearTimeout(tipTimer.current);
    setTip(msg);
    tipTimer.current = setTimeout(() => setTip(""), 1500);
  }, []);

  // 整局 + 撤销栈同步落盘，下次进入接着玩
  useEffect(() => {
    storageSet(BEST_KEY, state.best);
    storageSet(STORAGE_KEY, { state, undoStack, undosLeft });
  }, [state, undoStack, undosLeft]);

  useEffect(() => () => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    if (tipTimer.current) clearTimeout(tipTimer.current);
  }, []);

  const doMove = useCallback((dir: Direction) => {
    if (activeDialog !== "none") return;
    const s = cloneState(state);
    const res = move(s, dir);
    if (!res.moved) {
      showTip("这个方向走不动了");
      return;
    }
    setSession((prev) => ({
      state: s,
      undoStack: [...prev.undoStack, cloneState(prev.state)].slice(-MAX_UNDOS),
      undosLeft: prev.undosLeft,
    }));
    const ids = res.mergedIds.concat(res.spawn ? [res.spawn.id] : []);
    setFlash(ids);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash([]), 280);
    buzz();
    if (res.wonFirst) showTip("1024 达成！");
    else if (res.milestone) showTip(`里程碑 ${res.milestone} 达成`);
    else if (res.mergeCount >= 2) showTip(`连击 ×${res.mergeCount}  +${res.comboBonus}`);
  }, [activeDialog, state, showTip]);

  const doUndo = useCallback(() => {
    if (undosLeft <= 0 || !undoStack.length) return;
    setSession((prev) => ({
      state: prev.undoStack[prev.undoStack.length - 1]!,
      undoStack: prev.undoStack.slice(0, -1),
      undosLeft: prev.undosLeft - 1,
    }));
    setFlash([]);
    setDialog("none");
    showTip("已撤销一步");
  }, [undosLeft, undoStack.length, showTip]);

  const restart = useCallback(() => {
    const best = Math.max(state.best, Number(storageGet(BEST_KEY) ?? 0) || 0);
    const next = createGame(freshSeed(), best);
    setSession({ state: next, undoStack: [], undosLeft: MAX_UNDOS });
    setFlash([]);
    setDialog("none");
    showTip("新的一局");
  }, [state.best, showTip]);

  const continuePlaying = useCallback(() => {
    setSession((prev) => ({ ...prev, state: { ...prev.state, keepPlaying: true } }));
    showTip("继续挑战 2048");
  }, [showTip]);

  const copyScore = useCallback(() => {
    void Taro.setClipboardData({ data: scoreSheet(state, "1024 · 星轨小程序") });
  }, [state]);

  // Taro 的 View 把触摸事件声明成通用 CommonEventFunction（不含 touches 字段），
  // 运行时小程序事件确实带 touches/changedTouches，这里用 unknown + 结构断言安全取值。
  type TouchLike = { clientX: number; clientY: number };
  type TouchEventLike = { touches?: TouchLike[]; changedTouches?: TouchLike[] };
  const onTouchStart = (e: unknown) => {
    const p = (e as TouchEventLike).touches?.[0];
    if (p) touchRef.current = { x: p.clientX, y: p.clientY };
  };
  const onTouchEnd = (e: unknown) => {
    const start = touchRef.current;
    const p = (e as TouchEventLike).changedTouches?.[0];
    touchRef.current = null;
    if (!start || !p) return;
    const dx = p.clientX - start.x;
    const dy = p.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
    doMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  };

  return (
    <View className="page g1024-page">
      <View className="g1024-header">
        <View>
          <Text className="g1024-logo">1024</Text>
          <View className="sub">相同数字相加 · 合到 1024 即通关</View>
        </View>
        <View className="g1024-scores">
          <View className="g1024-score"><Text className="g1024-score-label">分数</Text><Text className="g1024-score-num">{state.score}</Text></View>
          <View className="g1024-score"><Text className="g1024-score-label">最佳</Text><Text className="g1024-score-num">{state.best}</Text></View>
        </View>
      </View>

      <View className="g1024-tools">
        <View className="g1024-btn g1024-btn-primary" onClick={() => {
          if (!state.over && state.score > 0 && dialog === "none") setDialog("confirm");
          else restart();
        }}><Text>新游戏</Text></View>
        <View className={`g1024-btn${undosLeft <= 0 || !undoStack.length ? " g1024-btn-off" : ""}`} onClick={doUndo}>
          <Text>撤销 {undosLeft}</Text>
        </View>
        <View className="g1024-btn" onClick={copyScore}><Text>成绩单</Text></View>
      </View>

      <View className="g1024-hud">
        <View className="g1024-next">
          <Text className="g1024-hud-label">下一块</Text>
          <View className={`g1024-mini g1024-v${state.nextTile}`}><Text>{state.nextTile}</Text></View>
        </View>
        <View className="g1024-progress">
          <View className="g1024-progress-head">
            <Text className="g1024-hud-label">里程碑</Text>
            <Text className="g1024-max">{state.maxTile}</Text>
          </View>
          <View className="g1024-bar"><View className="g1024-bar-fill" style={{ width: `${progress}%` }} /></View>
          <View className="g1024-ticks">
            {TICKS.map((v) => <Text key={v} className={state.maxTile >= v ? "g1024-tick on" : "g1024-tick"}>{v}</Text>)}
          </View>
        </View>
      </View>

      <View className="g1024-board" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {state.grid.map((row, r) =>
          row.map((t, c) => (
            <View key={`${r}-${c}`} className="g1024-slot">
              {t ? (
                <View className={tileClass(t.value) + (flashSet.has(t.id) ? " g1024-pop" : "")}>
                  <Text className={String(t.value).length >= 4 ? "g1024-num small" : "g1024-num"}>{t.value}</Text>
                </View>
              ) : <View className="g1024-empty" />}
            </View>
          )),
        )}
        {tip ? <View className="g1024-tip"><Text>{tip}</Text></View> : null}
        {activeDialog !== "none" ? (
          <View className="g1024-mask">
            {activeDialog === "win" ? <Text className="g1024-mask-title">1024 达成！</Text> : null}
            {activeDialog === "over" ? <Text className="g1024-mask-title">无路可走了</Text> : null}
            {activeDialog === "confirm" ? <Text className="g1024-mask-title">重新开始？</Text> : null}
            <Text className="g1024-mask-desc">
              {activeDialog === "confirm"
                ? `当前进度会丢失，得分 ${state.score}`
                : `得分 ${state.score} · 最大 ${state.maxTile} · ${state.moves} 步`}
            </Text>
            <View className="g1024-mask-btns">
              {activeDialog === "win" ? <View className="g1024-btn g1024-btn-primary" onClick={continuePlaying}><Text>继续挑战</Text></View> : null}
              {activeDialog === "over" && undosLeft > 0 && undoStack.length
                ? <View className="g1024-btn" onClick={doUndo}><Text>撤销复活</Text></View> : null}
              {activeDialog === "confirm" ? <View className="g1024-btn" onClick={() => setDialog("none")}><Text>继续当前局</Text></View> : null}
              <View className="g1024-btn g1024-btn-primary" onClick={restart}><Text>{activeDialog === "confirm" ? "确定重开" : "再来一局"}</Text></View>
            </View>
          </View>
        ) : null}
      </View>

      <View className="g1024-dpad">
        {(["left", "up", "down", "right"] as Direction[]).map((d) => (
          <View key={d} className="g1024-dir" onClick={() => doMove(d)}>
            <Text>{d === "left" ? "←" : d === "up" ? "↑" : d === "down" ? "↓" : "→"}</Text>
          </View>
        ))}
      </View>
      <View className="g1024-howto"><Text>在棋盘上滑动，或点上方方向键 · 进度自动保存在本机</Text></View>
    </View>
  );
}

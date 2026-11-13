import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useState, type ReactNode } from "react";
import type { GameMode } from "./use-board-game";

type Props = {
  title: string;
  subtitle: string;
  status: string;
  rules: string[];
  mode: GameMode;
  onMode: (m: GameMode) => void;
  level: number;
  onLevel: (n: number) => void;
  levels: number[];
  canUndo: boolean;
  onUndo: () => void;
  onRestart: () => void;
  aiThinking: boolean;
  overText: string;
  aside?: ReactNode;
  children: ReactNode;
};

function goHub() {
  Taro.navigateBack().catch(() => {
    void Taro.navigateTo({ url: "/subpackages/games/hub/index" });
  });
}

const LEVEL_LABEL: Record<number, string> = { 1: "简单", 2: "普通", 3: "困难" };

/** 小程序端棋类通用骨架（无 DOM / details 标签，规则用按钮展开） */
export function GameFrame({
  title, subtitle, status, rules, mode, onMode, level, onLevel, levels,
  canUndo, onUndo, onRestart, aiThinking, overText, aside, children,
}: Props) {
  const [rulesOpen, setRulesOpen] = useState(false);
  return (
    <View className="page gm-page">
      <View className="gm-head">
        <Text className="gm-back" onClick={goHub}>← 游戏中心</Text>
        <Text className="gm-title">{title}</Text>
        <Text className="gm-sub">{subtitle}</Text>
      </View>

      <View className="gm-status">
        <Text>{status}</Text>
        {aiThinking ? <Text className="gm-think">AI 思考中…</Text> : null}
      </View>

      <View className="gm-toolbar">
        <View className="gm-seg">
          <Text className={`gm-seg-btn${mode === "ai" ? " on" : ""}`} onClick={() => onMode("ai")}>人机</Text>
          <Text className={`gm-seg-btn${mode === "pvp" ? " on" : ""}`} onClick={() => onMode("pvp")}>双人</Text>
        </View>
        <View className="gm-seg">
          {levels.map((n) => (
            <Text key={n} className={`gm-seg-btn${level === n ? " on" : ""}`} onClick={() => onLevel(n)}>
              {LEVEL_LABEL[n] ?? n}
            </Text>
          ))}
        </View>
        <View className="gm-seg">
          <Text className={`gm-seg-btn${canUndo ? "" : " off"}`} onClick={canUndo ? onUndo : undefined}>撤销</Text>
          <Text className="gm-seg-btn" onClick={onRestart}>重开</Text>
        </View>
      </View>

      <View className="gm-board-wrap">
        {children}
        {overText ? (
          <View className="gm-overlay">
            <View className="gm-overlay-card">
              <Text className="gm-overlay-title">{overText}</Text>
              <Text className="gm-primary" onClick={onRestart}>再来一局</Text>
            </View>
          </View>
        ) : null}
      </View>

      {aside ? <View className="gm-aside">{aside}</View> : null}

      <View className="gm-rules">
        <Text className="gm-rules-head" onClick={() => setRulesOpen(!rulesOpen)}>
          玩法规则（{rulesOpen ? "收起" : "点击展开"}）
        </Text>
        {rulesOpen ? (
          <View className="gm-rules-body">
            {rules.map((line, i) => <Text key={i} className="gm-rules-line">{i + 1}. {line}</Text>)}
          </View>
        ) : null}
      </View>
    </View>
  );
}

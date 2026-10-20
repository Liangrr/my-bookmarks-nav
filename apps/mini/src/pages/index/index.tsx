import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";

// 首页：PC 端全部模块的菜单聚合墙。
// ready=true 的入口已落地（跳转分包/页面）；ready=false 为占位，点击提示建设中，逐期补全。
type Entry = {
  icon: string;
  name: string;
  desc: string;
  url?: string; // ready 时跳转；留空=建设中
  ready: boolean;
};

type Group = { label: string; items: Entry[] };

// 菜单口径与 Web 端 nav-bar 抽屉分组保持一致
const GROUPS: Group[] = [
  {
    label: "常用",
    items: [
      { icon: "🧭", name: "网站导航", desc: "精选常用网站收藏", url: "/subpackages/nav/index", ready: true },
      { icon: "🤖", name: "智能体市场", desc: "主流 AI 智能体收录", ready: false },
    ],
  },
  {
    label: "工具生活",
    items: [
      { icon: "🍳", name: "三餐预算", desc: "按预算组合一日三餐", url: "/subpackages/budget/index", ready: true },
      { icon: "🍎", name: "应季水果", desc: "当季水果与营养参考", url: "/subpackages/life/fruits/index", ready: true },
      { icon: "🍽️", name: "今天吃什么", desc: "深圳外食茶楼榜单", url: "/subpackages/life/feast/index", ready: true },
      { icon: "🛠️", name: "DIY 手作", desc: "在家可做的菜谱教程", url: "/subpackages/life/diy/index", ready: true },
      { icon: "📈", name: "实时行情", desc: "贵金属与汇率参考", ready: false },
      { icon: "🔄", name: "格式转换", desc: "文档/图片格式与压缩", ready: false },
    ],
  },
  {
    label: "学习成长",
    items: [
      { icon: "🧠", name: "AI Agent 学习", desc: "智能体入门路线", url: "/subpackages/learning/agent/index", ready: true },
      { icon: "💡", name: "AI 项目机会", desc: "可落地的 AI 方向", url: "/subpackages/learning/ai-ideas/index", ready: true },
      { icon: "💻", name: "Web 开发学习", desc: "前端路线与资源", url: "/subpackages/learning/dev/index", ready: true },
      { icon: "📱", name: "Flutter 学习", desc: "跨端开发路线", url: "/subpackages/learning/flutter/index", ready: true },
      { icon: "🚀", name: "独立开发者", desc: "独立开发者项目库", url: "/subpackages/learning/indie/index", ready: true },
    ],
  },
  {
    label: "实用手册",
    items: [
      { icon: "🌱", name: "人生手册", desc: "生活方法论合集", url: "/subpackages/living/index", ready: true },
      { icon: "⛺", name: "野外求生手册", desc: "户外生存技能", url: "/subpackages/handbook/survival/index", ready: true },
      { icon: "🍵", name: "中医养生手册", desc: "日常养生参考", url: "/subpackages/handbook/tcm/index", ready: true },
      { icon: "🚑", name: "急救知识手册", desc: "突发应急处置", url: "/subpackages/handbook/emergency/index", ready: true },
      { icon: "🤒", name: "日常小病治理", desc: "常见不适处理", url: "/subpackages/handbook/ailments/index", ready: true },
    ],
  },
];

function onTap(entry: Entry) {
  if (entry.ready && entry.url) {
    Taro.navigateTo({ url: entry.url });
    return;
  }
  Taro.showToast({ title: "建设中，后续版本上线", icon: "none" });
}

export default function Index() {
  return (
    <View className="page home">
      <View className="title">星轨</View>
      <View className="sub">精选网站导航 · 工具 · 手册，按分组查找；灰项为建设中，将逐期上线。</View>

      {GROUPS.map((g) => (
        <View key={g.label} className="group">
          <View className="group-label">{g.label}</View>
          <View className="grid">
            {g.items.map((it) => (
              <View
                key={it.name}
                className={`tile${it.ready ? "" : " tile-soon"}`}
                onClick={() => onTap(it)}
              >
                <Text className="tile-icon">{it.icon}</Text>
                <View className="tile-body">
                  <View className="tile-name">
                    {it.name}
                    {!it.ready ? <Text className="badge">soon</Text> : null}
                  </View>
                  <View className="tile-desc">{it.desc}</View>
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

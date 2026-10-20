import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";

// 个人页骨架（P0）：登录/主题将在 P5 接入 Supabase 与本地持久化，当前为占位。
// 与 Web 端 profile 模块口径一致：登录/注册、昵称、退出、主题色、光暗切换。

type Row = { icon: string; label: string; hint: string; ready: boolean };

const ROWS: Row[] = [
  { icon: "🎨", label: "主题色", hint: "跟随 Web 端配色", ready: false },
  { icon: "🌙", label: "深色 / 浅色", hint: "本地持久化", ready: false },
  { icon: "ℹ️", label: "关于星轨", hint: "版本与说明", ready: true },
];

function onRow(row: Row) {
  if (!row.ready) {
    Taro.showToast({ title: "即将接入", icon: "none" });
    return;
  }
  Taro.showModal({
    title: "关于星轨",
    content: "星轨 · 精选网站导航 / 工具 / 手册。小程序端与 Web 端共用同一份数据真源。",
    showCancel: false,
  });
}

export default function Profile() {
  const loggedIn = false; // P5 接入 Supabase 后替换为真实登录态

  return (
    <View className="page">
      <View className="profile-card">
        <View className="avatar">👤</View>
        <View className="profile-meta">
          <View className="profile-name">{loggedIn ? "已登录" : "未登录"}</View>
          <View className="profile-sub">{loggedIn ? "" : "登录后同步收藏与偏好"}</View>
        </View>
        {!loggedIn && (
          <View
            className="profile-btn"
            onClick={() => Taro.showToast({ title: "登录即将接入", icon: "none" })}
          >
            登录 / 注册
          </View>
        )}
      </View>

      <View className="group-label">设置</View>
      {ROWS.map((r) => (
        <View key={r.label} className="row" onClick={() => onRow(r)}>
          <Text className="row-icon">{r.icon}</Text>
          <View className="row-body">
            <View className="row-label">{r.label}</View>
            <View className="row-hint">{r.hint}</View>
          </View>
          <Text className="row-arrow">›</Text>
        </View>
      ))}

      {loggedIn && (
        <View
          className="logout"
          onClick={() => Taro.showToast({ title: "退出登录即将接入", icon: "none" })}
        >
          退出登录
        </View>
      )}

      <View className="sub version">星轨小程序 v0.1 · 与 Web 端同源数据</View>
    </View>
  );
}

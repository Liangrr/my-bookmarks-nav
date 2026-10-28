import { useState } from "react";
import { View, Text, Input } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { ApiError, login } from "@/lib/api";

// 账号体系与 Web 端一致：可用邮箱登录，也可用注册时的「用户名」
// （Web 端注册时把用户名映射成 <username>@bookmark-nav.app，这里保持同一规则）。
export default function Login() {
  const [type, setType] = useState<"email" | "username">("email");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const value = account.trim();
    if (!value || !password) {
      Taro.showToast({ title: "请填写账号和密码", icon: "none" });
      return;
    }
    const email = type === "username" ? `${value}@bookmark-nav.app` : value;

    setSubmitting(true);
    try {
      await login(email, password);
      Taro.redirectTo({ url: "/pages/todos/index" });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "登录失败";
      Taro.showToast({ title: message, icon: "none" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="page">
      <View className="title">登录</View>
      <View className="sub">待办与账号绑定，登录后与 Web 端同步同一份清单。</View>

      <View className="login-switch">
        <View
          className={`login-switch-item${type === "email" ? " on" : ""}`}
          onClick={() => setType("email")}
        >
          邮箱
        </View>
        <View
          className={`login-switch-item${type === "username" ? " on" : ""}`}
          onClick={() => setType("username")}
        >
          用户名
        </View>
      </View>

      <Input
        className="login-input"
        value={account}
        onInput={(e) => setAccount(e.detail.value)}
        placeholder={type === "email" ? "邮箱地址" : "用户名"}
      />
      <Input
        className="login-input"
        value={password}
        password
        onInput={(e) => setPassword(e.detail.value)}
        placeholder="密码"
      />

      <View className={`login-submit${submitting ? " disabled" : ""}`} onClick={() => void submit()}>
        {submitting ? "登录中…" : "登录"}
      </View>

      <Text className="login-hint">还没有账号？先在 Web 端注册，再用同一账号登录小程序。</Text>
    </View>
  );
}

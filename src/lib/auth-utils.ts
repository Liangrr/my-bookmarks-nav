import { useRef } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 邮箱校验：trim 后检查格式，返回错误文案或 null */
export function validateEmail(email: string): string | null {
  const v = email.trim();
  if (!v) return "请输入邮箱";
  if (!EMAIL_RE.test(v)) return "邮箱格式不正确";
  return null;
}

/** 用户名校验：2-20 位，仅字母/数字/下划线/中划线 */
export function validateUsername(username: string): string | null {
  const v = username.trim();
  if (!v) return "请输入用户名";
  if (v.length < 2 || v.length > 20) return "用户名长度需在 2-20 个字符之间";
  if (!/^[a-zA-Z0-9_-]+$/.test(v)) return "用户名仅支持字母、数字、下划线和中划线";
  return null;
}

/** 昵称校验：2-20 位 */
export function validateNickname(name: string): string | null {
  const v = name.trim();
  if (!v) return "请输入昵称";
  if (v.length < 2 || v.length > 20) return "昵称长度需在 2-20 个字符之间";
  return null;
}

/** 密码强度校验：至少 8 位，且同时包含字母和数字 */
export function validatePasswordStrength(password: string): string | null {
  if (!password) return "请输入密码";
  if (password.length < 8) return "密码至少需要 8 位";
  if (!/[a-zA-Z]/.test(password)) return "密码需包含至少一个字母";
  if (!/\d/.test(password)) return "密码需包含至少一个数字";
  return null;
}

/** 确认密码校验 */
export function validateConfirmPassword(password: string, confirm: string): string | null {
  if (!confirm) return "请再次输入密码";
  if (password !== confirm) return "两次输入的密码不一致";
  return null;
}

const ERROR_MAP: Array<[string, string]> = [
  ["Invalid login credentials", "邮箱或密码错误，请重试"],
  ["Email not confirmed", "邮箱尚未验证，请查收验证邮件后重试"],
  ["User already registered", "该邮箱已注册，请直接登录"],
  ["Password should be at least", "密码长度不符合要求"],
  ["Invalid email", "邮箱格式不正确"],
  ["Signups not allowed for", "当前不允许注册新账号"],
  ["Rate limit exceeded", "操作过于频繁，请稍后再试"],
  ["Too many requests", "操作过于频繁，请稍后再试"],
  ["For security purposes", "操作过于频繁，请稍后再试"],
  ["Failed to fetch", "网络异常，请检查网络后重试"],
  ["Network request failed", "网络异常，请检查网络后重试"],
  ["Database error", "服务暂时不可用，请稍后再试"],
  ["Internal server error", "服务暂时不可用，请稍后再试"],
];

/** 将 Supabase / 网络错误映射为中文提示，未匹配时返回原文 */
export function getAuthErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (!message) return "操作失败，请稍后重试";
  for (const [key, zh] of ERROR_MAP) {
    if (message.includes(key)) return zh;
  }
  return message;
}

/** 提交防抖：ms 时间内只允许一次提交（防连点/防请求洪水） */
export function useSubmitThrottle(ms = 2000) {
  const last = useRef(0);
  return () => {
    const now = Date.now();
    if (now - last.current < ms) return false;
    last.current = now;
    return true;
  };
}

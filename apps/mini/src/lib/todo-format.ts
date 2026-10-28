// 小程序端的时间展示：不依赖 Intl（部分机型 JSCore 上不支持 timeZone 选项），统一按 UTC+8 手算。
const OFFSET_MS = 480 * 60000;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function shifted(value: string | Date): Date {
  const base = typeof value === "string" ? new Date(value) : value;
  return new Date(base.getTime() + OFFSET_MS);
}

function keyOf(value: string | Date): string {
  const d = shifted(value);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function dayKey(value: string | Date): string {
  return keyOf(value);
}

export function timeText(value: string): string {
  const d = shifted(value);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function dayText(value: string, now: Date): string {
  const key = keyOf(value);
  if (key === keyOf(now)) return "今天";
  if (key === keyOf(new Date(now.getTime() + 86400000))) return "明天";
  if (key === keyOf(new Date(now.getTime() - 86400000))) return "昨天";
  const d = shifted(value);
  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日`;
}

export function minutesText(minutes: number): string {
  if (minutes < 60) return `${minutes} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分`;
}

/** 把东八区的日期 + 时间拼成 ISO，避免依赖设备时区 */
export function toIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00+08:00`).toISOString();
}

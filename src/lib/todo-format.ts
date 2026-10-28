// 待办时间的展示与表单转换。统一按东八区算，和 shared-lib 的分组口径保持一致。

const TZ = "Asia/Shanghai";

const dayFmt = new Intl.DateTimeFormat("zh-CN", {
  timeZone: TZ,
  month: "numeric",
  day: "numeric",
  weekday: "short",
});

const timeFmt = new Intl.DateTimeFormat("zh-CN", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const keyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** YYYY-MM-DD（东八区），用于按自然日比较 */
export function dayKey(iso: string | Date): string {
  return keyFmt.format(typeof iso === "string" ? new Date(iso) : iso);
}

/** 所在周的周一 YYYY-MM-DD（东八区） */
export function weekKey(iso: string | Date): string {
  const key = dayKey(iso);
  const midnight = new Date(`${key}T00:00:00+08:00`);
  const shifted = new Date(midnight.getTime() + 480 * 60000);
  const dow = (shifted.getUTCDay() + 6) % 7; // 0 = 周一
  return keyFmt.format(new Date(midnight.getTime() - dow * 86400000));
}

/** 今天 / 明天 / 昨天 / 具体日期 */
export function dayText(iso: string, now: Date): string {
  const key = dayKey(iso);
  if (key === dayKey(now)) return "今天";
  if (key === dayKey(new Date(now.getTime() + 86400000))) return "明天";
  if (key === dayKey(new Date(now.getTime() - 86400000))) return "昨天";
  return dayFmt.format(new Date(iso));
}

export function timeText(iso: string): string {
  return timeFmt.format(new Date(iso));
}

/** 预计 / 实际耗时 → 「1 小时 30 分钟」 */
export function minutesText(minutes: number): string {
  if (minutes < 60) return `${minutes} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分钟`;
}

/** ISO → datetime-local 输入值（东八区） */
export function toDateTimeInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const shifted = new Date(d.getTime() + 480 * 60000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${shifted.getUTCFullYear()}-${p(shifted.getUTCMonth() + 1)}-${p(shifted.getUTCDate())}T${p(
    shifted.getUTCHours()
  )}:${p(shifted.getUTCMinutes())}`;
}

/** datetime-local 输入值 → ISO（浏览器按本地时区解析） */
export function fromDateTimeInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

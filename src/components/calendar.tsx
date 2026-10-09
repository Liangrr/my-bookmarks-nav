"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Solar } from "lunar-typescript";
import { HOLIDAYS, WORKDAYS } from "@/data/china-holidays";

const WEEK_LABELS = ["一", "二", "三", "四", "五", "六", "日"];
const WEEK_CN = ["日", "一", "二", "三", "四", "五", "六"];

interface Ymd {
  y: number;
  m: number;
  d: number;
}

const sameDay = (a: Ymd, b: Ymd) => a.y === b.y && a.m === b.m && a.d === b.d;

// 农历日 → 月相（emoji + 常见名）
function moonPhase(day: number) {
  if (day >= 2 && day <= 7) return { emoji: "🌒", name: "蛾眉月" };
  if (day === 8) return { emoji: "🌓", name: "上弦月" };
  if (day >= 9 && day <= 14) return { emoji: "🌔", name: "盈凸月" };
  if (day >= 15 && day <= 16) return { emoji: "🌕", name: "满月" };
  if (day >= 17 && day <= 21) return { emoji: "🌖", name: "亏凸月" };
  if (day === 22 || day === 23) return { emoji: "🌗", name: "下弦月" };
  if (day >= 24 && day <= 29) return { emoji: "🌘", name: "残月" };
  return { emoji: "🌑", name: "新月" };
}

export default function Calendar() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [today] = useState<Ymd>(() => {
    const t = new Date();
    return { y: t.getFullYear(), m: t.getMonth(), d: t.getDate() };
  });
  const [view, setView] = useState<{ y: number; m: number }>({
    y: today.y,
    m: today.m,
  });
  const [selected, setSelected] = useState<Ymd>(today);

  // 42 格月历（周一起始，含上下月补齐）
  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const offset = (first.getDay() + 6) % 7;
    const arr: {
      y: number;
      m: number;
      d: number;
      inMonth: boolean;
      lunarDay: string;
      jieQi: string;
      festival: string;
      isFestival: boolean;
      isRed: boolean;
    }[] = [];
    for (let i = 0; i < 42; i++) {
      const dt = new Date(view.y, view.m, i - offset + 1);
      const y = dt.getFullYear();
      const m = dt.getMonth();
      const d = dt.getDate();
      const solar = Solar.fromYmd(y, m + 1, d);
      const lunar = solar.getLunar();
      const lunarFests = [...lunar.getFestivals(), ...lunar.getOtherFestivals()];
      const solarFests = [...solar.getFestivals(), ...solar.getOtherFestivals()];
      const festival = lunarFests[0] || solarFests[0] || "";
      const jieQi = lunar.getJieQi() || "";
      const dateKey = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
      const isRed = HOLIDAYS.has(dateKey) || (isWeekend && !WORKDAYS.has(dateKey));
      arr.push({
        y,
        m,
        d,
        inMonth: m === view.m,
        lunarDay: lunar.getDayInChinese(),
        jieQi,
        festival,
        isFestival: festival !== "",
        isRed,
      });
    }
    return arr;
  }, [view]);

  // 选中日期详情
  const detail = useMemo(() => {
    const solar = Solar.fromYmd(selected.y, selected.m + 1, selected.d);
    const lunar = solar.getLunar();
    const day = lunar.getDay();
    const jieQi = lunar.getJieQi() || "";
    const next = lunar.getNextJieQi();
    const nextName = next ? next.getName() : "";
    const nextSolar = next ? next.getSolar() : null;
    const nextDate = nextSolar
      ? new Date(nextSolar.getYear(), nextSolar.getMonth() - 1, nextSolar.getDay())
      : null;
    const todayDate = new Date(today.y, today.m, today.d);
    const daysToNext = nextDate
      ? Math.round((nextDate.getTime() - todayDate.getTime()) / 86400000)
      : null;
    const festivals = [
      ...lunar.getFestivals(),
      ...lunar.getOtherFestivals(),
      ...solar.getFestivals(),
      ...solar.getOtherFestivals(),
    ];
    const week = WEEK_CN[new Date(selected.y, selected.m, selected.d).getDay()];

    return {
      ymd: `${selected.y}年${selected.m + 1}月${selected.d}日`,
      week,
      lunarText: `农历 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
      ganZhiYear: lunar.getYearInGanZhi(),
      ganZhiDay: lunar.getDayInGanZhi(),
      jieQi,
      nextName,
      nextYmd: nextDate
        ? `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(nextDate.getDate()).padStart(2, "0")}`
        : "",
      daysToNext,
      festivals,
      moon: moonPhase(day),
      xingZuo: solar.getXingZuo(),
      isToday: sameDay(selected, today),
    };
  }, [selected, today]);

  if (!mounted) return <div className="container" />;

  const changeMonth = (delta: number) => {
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const goToday = () => {
    setView({ y: today.y, m: today.m });
    setSelected(today);
  };

  return (
    <div className="container">
      {/* 头部 */}
      <div className="cal-header">
        <h1 className="cal-title">
          星历 <span className="cal-title-year">{view.y} 年 {view.m + 1} 月</span>
        </h1>
        <div className="cal-nav">
          <button className="cal-nav-btn" onClick={() => changeMonth(-1)} aria-label="上个月">
            ‹
          </button>
          <button className="cal-nav-btn cal-nav-today" onClick={goToday} aria-label="回到今天">
            今天
          </button>
          <button className="cal-nav-btn" onClick={() => changeMonth(1)} aria-label="下个月">
            ›
          </button>
        </div>
      </div>

      <div className="cal-layout">
        {/* 月历 */}
        <div className="cal-grid" role="grid" aria-label="月历">
          {WEEK_LABELS.map((w) => (
            <div key={w} className="cal-weekday" aria-hidden="true">
              {w}
            </div>
          ))}
          {cells.map((c) => {
            const isToday = sameDay(c, today);
            const isSelected = sameDay(c, selected);
            const tagText = c.jieQi || c.festival;
            return (
              <button
                key={`${c.y}-${c.m}-${c.d}`}
                role="gridcell"
                className={`cal-day ${!c.inMonth ? "is-out" : ""} ${isToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""} ${c.isFestival ? "is-festival" : ""} ${c.isRed ? "is-red" : ""}`}
                onClick={() => setSelected({ y: c.y, m: c.m, d: c.d })}
                aria-label={`${c.y}年${c.m + 1}月${c.d}日${c.jieQi ? ` ${c.jieQi}` : ""}${c.festival ? ` ${c.festival}` : ""}`}
                aria-current={isToday ? "date" : undefined}
              >
                <span className="cal-day-num">{c.d}</span>
                <span className="cal-day-lunar">{c.lunarDay}</span>
                <span className="cal-day-bottom">
                  {tagText && (
                    <span className={`cal-day-badge ${c.festival && !c.jieQi ? "cal-day-badge--fest" : "cal-day-badge--jieqi"}`}>{tagText}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* 今日详情 */}
        <aside className="cal-detail">
          <div className="cal-detail-top">
            <div>
              <div className="cal-detail-date">
                {detail.ymd} <span className="cal-detail-week">星期{detail.week}</span>
              </div>
              <div className="cal-detail-lunar">{detail.lunarText}</div>
            </div>
            <div className="cal-moon" title={`${detail.moon.name}`}>
              {detail.moon.emoji}
            </div>
          </div>

          <div className="cal-detail-body">
            <div className="cal-detail-row">
              <span className="cal-detail-label">月相</span>
              <span className="cal-detail-value">{detail.moon.name}</span>
            </div>
            <div className="cal-detail-row">
              <span className="cal-detail-label">星座</span>
              <span className="cal-detail-value">{detail.xingZuo}</span>
            </div>
            <div className="cal-detail-row">
              <span className="cal-detail-label">干支</span>
              <span className="cal-detail-value">
                {detail.ganZhiYear}年 · {detail.ganZhiDay}日
              </span>
            </div>
            <div className="cal-detail-row">
              <span className="cal-detail-label">节气</span>
              <span className="cal-detail-value">
                {detail.jieQi || "无"}
              </span>
            </div>
            {detail.nextName && (
              <div className="cal-detail-row">
                <span className="cal-detail-label">下一节气</span>
                <span className="cal-detail-value">
                  {detail.nextName}
                  {detail.nextYmd && `（${detail.nextYmd}）`}
                  {detail.daysToNext !== null && detail.daysToNext > 0 && (
                    <span className="cal-detail-sub"> · {detail.daysToNext} 天后</span>
                  )}
                </span>
              </div>
            )}
            {detail.festivals.length > 0 && (
              <div className="cal-detail-row">
                <span className="cal-detail-label">节日</span>
                <span className="cal-detail-value">{detail.festivals.join("、")}</span>
              </div>
            )}
          </div>

          {detail.isToday && <div className="cal-detail-badge">今日</div>}
        </aside>
      </div>
    </div>
  );
}
import type { Metadata } from "next";
import Calendar from "@/components/calendar";

export const metadata: Metadata = {
  title: "星历 · 日历 - 星轨",
  description: "星轨 · 天文历：月相、农历、节气、节日一览。",
};

export default function CalendarPage() {
  return (
    <>
      <Calendar />
      <footer className="footer">
        星轨 · 星历天文历 · 月相 · 农历 · 节气
      </footer>
    </>
  );
}
import type { Metadata } from "next";
import { TodoBoard } from "@/components/todo-board";

// 私密页面：内容与账号绑定，不进 sitemap、也不允许抓取
export const metadata: Metadata = {
  title: "待办事项 - 星轨",
  description: "记录每件待办的时间、地点、做什么、预期结果与实际结果，按日期分组管理。",
  robots: { index: false, follow: false },
};

export default function TodosPage() {
  return (
    <div className="container" style={{ maxWidth: 900, paddingTop: 16, paddingBottom: 48 }}>
      <TodoBoard />
    </div>
  );
}

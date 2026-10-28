"use client";

import { useState } from "react";
import { isOverdue, type Todo, type TodoOutcome } from "@shared-lib/todos";
import { dayText, minutesText, timeText } from "@/lib/todo-format";

const OUTCOME_TEXT: Record<TodoOutcome, string> = {
  met: "达成",
  partial: "部分达成",
  missed: "未达成",
};

const STATUS_TEXT: Record<Todo["status"], string> = {
  todo: "待办",
  doing: "进行中",
  done: "已完成",
  dropped: "已放弃",
};

const PRIORITY_TEXT: Record<number, string> = { 2: "高优先", 1: "中优先", 0: "低优先" };

type Props = {
  todo: Todo;
  now: Date;
  onStart: () => void;
  onFinish: () => void;
  onDrop: () => void;
  onReopen: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function TodoCard({ todo, now, onStart, onFinish, onDrop, onReopen, onEdit, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const overdue = isOverdue(todo, now);
  const terminal = todo.status === "done" || todo.status === "dropped";
  const hasDetail = Boolean(todo.detail || todo.expect || todo.result);

  return (
    <article
      className={`todo-card${terminal ? " is-terminal" : ""}${overdue ? " is-overdue" : ""}`}
    >
      <div
        className="todo-card-main"
        onClick={() => hasDetail && setOpen((v) => !v)}
        role={hasDetail ? "button" : undefined}
        tabIndex={hasDetail ? 0 : undefined}
        onKeyDown={(e) => {
          if (hasDetail && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
      >
        <span className={`todo-dot todo-dot--${todo.status}`} aria-hidden />
        <div className="todo-body">
          <div className="todo-title-row">
            <span
              className={`todo-priority todo-priority--${todo.priority}`}
              title={PRIORITY_TEXT[todo.priority]}
            />
            <span className="todo-title">{todo.title}</span>
            <span className="todo-time">
              {dayText(todo.starts_at, now)} {todo.all_day ? "全天" : timeText(todo.starts_at)}
            </span>
            {overdue && <span className="todo-flag todo-flag--overdue">逾期</span>}
            {terminal && (
              <span className={`todo-flag todo-flag--${todo.status}`}>{STATUS_TEXT[todo.status]}</span>
            )}
          </div>

          <div className="todo-meta">
            {todo.place && <span>📍 {todo.place}</span>}
            {todo.duration_min != null && <span>约 {minutesText(todo.duration_min)}</span>}
            {todo.tags.map((tag) => (
              <span key={tag} className="todo-tag">
                #{tag}
              </span>
            ))}
          </div>

          {todo.status === "done" && (todo.result || todo.outcome) && (
            <div className="todo-result">
              {todo.outcome && (
                <span className={`todo-outcome todo-outcome--${todo.outcome}`}>
                  {OUTCOME_TEXT[todo.outcome]}
                </span>
              )}
              {todo.result && <span className="todo-result-text">{todo.result}</span>}
              {todo.actual_min != null && (
                <span className="todo-result-min">实耗 {minutesText(todo.actual_min)}</span>
              )}
            </div>
          )}

          {open && (
            <div className="todo-detail">
              {todo.detail && (
                <div className="todo-detail-block">
                  <span className="todo-detail-label">做什么</span>
                  <p className="todo-detail-text">{todo.detail}</p>
                </div>
              )}
              {todo.expect && (
                <div className="todo-detail-block">
                  <span className="todo-detail-label">预期结果</span>
                  <p className="todo-detail-text">{todo.expect}</p>
                </div>
              )}
              {todo.result && todo.status !== "done" && (
                <div className="todo-detail-block">
                  <span className="todo-detail-label">实际结果</span>
                  <p className="todo-detail-text">{todo.result}</p>
                </div>
              )}
            </div>
          )}
        </div>
        {hasDetail && <span className="todo-expand">{open ? "收起" : "展开"}</span>}
      </div>

      <div className="todo-actions">
        {todo.status === "todo" && (
          <button className="todo-act" onClick={onStart}>
            开始
          </button>
        )}
        {(todo.status === "todo" || todo.status === "doing") && (
          <>
            <button className="todo-act todo-act--primary" onClick={onFinish}>
              完成
            </button>
            <button className="todo-act" onClick={onDrop}>
              放弃
            </button>
          </>
        )}
        {terminal && (
          <button className="todo-act" onClick={onReopen}>
            重新打开
          </button>
        )}
        <button className="todo-act" onClick={onEdit}>
          编辑
        </button>
        <button className="todo-act todo-act--danger" onClick={onDelete}>
          删除
        </button>
      </div>
    </article>
  );
}

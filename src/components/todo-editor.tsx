"use client";

import { useState } from "react";
import { validateTodo, type Todo, type TodoPriority } from "@shared-lib/todos";
import { fromDateTimeInput, toDateTimeInput } from "@/lib/todo-format";

export type TodoFormValues = {
  title: string;
  starts_at: string;
  all_day: boolean;
  place: string | null;
  duration_min: number | null;
  detail: string | null;
  expect: string | null;
  due_at: string | null;
  priority: TodoPriority;
};

type Props = {
  /** null = 新建 */
  todo: Todo | null;
  onClose: () => void;
  onSubmit: (values: TodoFormValues) => Promise<void>;
};

export function TodoEditor({ todo, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState(todo?.title ?? "");
  const [startsInput, setStartsInput] = useState(toDateTimeInput(todo?.starts_at ?? null));
  const [dueInput, setDueInput] = useState(toDateTimeInput(todo?.due_at ?? null));
  const [allDay, setAllDay] = useState(todo?.all_day ?? false);
  const [place, setPlace] = useState(todo?.place ?? "");
  const [duration, setDuration] = useState(
    todo?.duration_min != null ? String(todo.duration_min) : ""
  );
  const [detail, setDetail] = useState(todo?.detail ?? "");
  const [expect, setExpect] = useState(todo?.expect ?? "");
  const [priority, setPriority] = useState<TodoPriority>(todo?.priority ?? 1);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    const starts_at = fromDateTimeInput(startsInput) ?? "";
    const due_at = fromDateTimeInput(dueInput);
    const duration_min = duration.trim() === "" ? null : Number(duration);

    const check = validateTodo({
      title,
      starts_at: starts_at || null,
      due_at,
      duration_min,
      priority,
    });
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }

    setErrors([]);
    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        starts_at,
        all_day: allDay,
        place: place.trim() || null,
        duration_min,
        detail: detail.trim() || null,
        expect: expect.trim() || null,
        due_at,
        priority,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="todo-modal-mask" onClick={onClose}>
      <form
        className="todo-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="todo-modal-head">
          <h2 className="todo-modal-title">{todo ? "编辑待办" : "新建待办"}</h2>
          <button type="button" className="todo-modal-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <p className="todo-modal-hint">
          最少只填「事件 + 时间」就能保存，地点、做什么、预期结果都可以之后补。
        </p>

        <label className="todo-field">
          <span className="todo-field-label">事件 *</span>
          <input
            className="todo-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：产品评审会"
            autoFocus
          />
        </label>

        <div className="todo-field-row">
          <label className="todo-field">
            <span className="todo-field-label">时间 *</span>
            <input
              className="todo-input"
              type="datetime-local"
              value={startsInput}
              onChange={(e) => setStartsInput(e.target.value)}
            />
          </label>
          <label className="todo-field">
            <span className="todo-field-label">截止时间</span>
            <input
              className="todo-input"
              type="datetime-local"
              value={dueInput}
              onChange={(e) => setDueInput(e.target.value)}
            />
          </label>
        </div>

        <div className="todo-field-row">
          <label className="todo-field">
            <span className="todo-field-label">地点</span>
            <input
              className="todo-input"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="例：3 号会议室"
            />
          </label>
          <label className="todo-field">
            <span className="todo-field-label">预计耗时（分钟）</span>
            <input
              className="todo-input"
              type="number"
              min={0}
              step={5}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="60"
            />
          </label>
        </div>

        <label className="todo-field todo-field--inline">
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
          <span>只定哪天，时间待定</span>
        </label>

        <label className="todo-field">
          <span className="todo-field-label">优先级</span>
          <select
            className="todo-input"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value) as TodoPriority)}
          >
            <option value={2}>高</option>
            <option value={1}>中</option>
            <option value={0}>低</option>
          </select>
        </label>

        <label className="todo-field">
          <span className="todo-field-label">做什么</span>
          <textarea
            className="todo-input todo-textarea"
            rows={3}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="具体要推进的步骤、要带的东西…"
          />
        </label>

        <label className="todo-field">
          <span className="todo-field-label">预期结果</span>
          <textarea
            className="todo-input todo-textarea"
            rows={2}
            value={expect}
            onChange={(e) => setExpect(e.target.value)}
            placeholder="做完之后应该是什么样"
          />
        </label>

        {(errors.length > 0 || submitError) && (
          <div className="todo-form-error">
            {submitError || errors.map((msg) => <div key={msg}>{msg}</div>)}
          </div>
        )}

        <div className="todo-modal-actions">
          <button type="button" className="todo-act" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="todo-act todo-act--primary" disabled={saving}>
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </form>
    </div>
  );
}

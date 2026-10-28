"use client";

import { useState } from "react";
import type { Todo, TodoOutcome } from "@shared-lib/todos";

export type TodoFinishValues = {
  result: string | null;
  outcome: TodoOutcome | null;
  actual_min: number | null;
};

type Props = {
  todo: Todo;
  onClose: () => void;
  onSubmit: (values: TodoFinishValues) => Promise<void>;
};

const OUTCOMES: { value: TodoOutcome; label: string }[] = [
  { value: "met", label: "达成" },
  { value: "partial", label: "部分达成" },
  { value: "missed", label: "未达成" },
];

export function TodoFinishModal({ todo, onClose, onSubmit }: Props) {
  const [result, setResult] = useState(todo.result ?? "");
  const [outcome, setOutcome] = useState<TodoOutcome | null>(todo.outcome ?? null);
  const [actual, setActual] = useState(todo.actual_min != null ? String(todo.actual_min) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (skip: boolean) => {
    setSaving(true);
    setError("");
    try {
      await onSubmit(
        skip
          ? { result: null, outcome: null, actual_min: null }
          : {
              result: result.trim() || null,
              outcome,
              actual_min: actual.trim() === "" ? null : Number(actual),
            }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
      setSaving(false);
    }
  };

  return (
    <div className="todo-modal-mask" onClick={onClose}>
      <div className="todo-modal" onClick={(e) => e.stopPropagation()}>
        <div className="todo-modal-head">
          <h2 className="todo-modal-title">完成待办</h2>
          <button type="button" className="todo-modal-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <p className="todo-modal-hint">{todo.title}</p>

        <label className="todo-field">
          <span className="todo-field-label">实际结果</span>
          <textarea
            className="todo-input todo-textarea"
            rows={3}
            value={result}
            onChange={(e) => setResult(e.target.value)}
            placeholder="实际发生了什么、和预期差在哪"
          />
        </label>

        <div className="todo-field">
          <span className="todo-field-label">达成度</span>
          <div className="todo-outcome-pick">
            {OUTCOMES.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`todo-act${outcome === o.value ? " todo-act--primary" : ""}`}
                onClick={() => setOutcome(outcome === o.value ? null : o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <label className="todo-field">
          <span className="todo-field-label">实际耗时（分钟）</span>
          <input
            className="todo-input"
            type="number"
            min={0}
            step={5}
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            placeholder={todo.duration_min != null ? `预计 ${todo.duration_min}` : "60"}
          />
        </label>

        {error && <div className="todo-form-error">{error}</div>}

        <div className="todo-modal-actions">
          <button type="button" className="todo-act" onClick={() => submit(true)} disabled={saving}>
            跳过，直接完成
          </button>
          <button
            type="button"
            className="todo-act todo-act--primary"
            onClick={() => submit(false)}
            disabled={saving}
          >
            {saving ? "保存中…" : "保存结果"}
          </button>
        </div>
      </div>
    </div>
  );
}

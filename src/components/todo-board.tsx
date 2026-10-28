"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { groupTodos, isOverdue, summarize, type Todo } from "@shared-lib/todos";
import { AuthModal } from "@/components/auth-modal";
import { TodoCard } from "@/components/todo-card";
import { TodoEditor, type TodoFormValues } from "@/components/todo-editor";
import { TodoFinishModal, type TodoFinishValues } from "@/components/todo-finish-modal";
import { createClient } from "@/lib/supabase/client";
import { createTodo, listTodos, removeTodo, updateTodo, type TodoPatch } from "@/lib/supabase/todos";
import { dayKey, weekKey } from "@/lib/todo-format";

type RangeKey = "all" | "today" | "week" | "overdue";
type StatusKey = "all" | "active" | "todo" | "doing" | "done" | "dropped";

const STATUS_OPTIONS: { value: StatusKey; label: string }[] = [
  { value: "all", label: "全部状态" },
  { value: "active", label: "未结束" },
  { value: "todo", label: "待办" },
  { value: "doing", label: "进行中" },
  { value: "done", label: "已完成" },
  { value: "dropped", label: "已放弃" },
];

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "all", label: "全部时间" },
  { value: "today", label: "今天" },
  { value: "week", label: "本周" },
  { value: "overdue", label: "已逾期" },
];

export function TodoBoard() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusKey>("all");
  const [range, setRange] = useState<RangeKey>("all");
  const [now, setNow] = useState(() => new Date());
  const [authModal, setAuthModal] = useState<"login" | "signup" | null>(null);
  const [editor, setEditor] = useState<{ open: boolean; todo: Todo | null }>({
    open: false,
    todo: null,
  });
  const [finishing, setFinishing] = useState<Todo | null>(null);
  const uidRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listTodos(createClient());
      setTodos(rows);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const supabase = createClient();

    const applySession = (next: Session | null) => {
      const uid = next?.user?.id ?? null;
      const changed = uidRef.current !== uid;
      uidRef.current = uid;
      setSession(next);
      if (changed && uid) void load();
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      applySession(data.session);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      applySession(next);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [load]);

  // 逾期与「今天 / 本周」都会随时间变化，每分钟刷一次，无需重新拉数据
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const summary = useMemo(() => summarize(todos, now), [todos, now]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const todayKey = dayKey(now);
    const currentWeek = weekKey(now);
    return todos.filter((todo) => {
      if (status === "active") {
        if (todo.status !== "todo" && todo.status !== "doing") return false;
      } else if (status !== "all" && todo.status !== status) {
        return false;
      }
      if (range === "today" && dayKey(todo.starts_at) !== todayKey) return false;
      if (range === "week" && weekKey(todo.starts_at) !== currentWeek) return false;
      if (range === "overdue" && !isOverdue(todo, now)) return false;
      if (!q) return true;
      return [todo.title, todo.detail, todo.place, todo.expect, todo.result, ...todo.tags]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [todos, status, range, query, now]);

  const groups = useMemo(() => groupTodos(filtered, now), [filtered, now]);

  const mutate = async (todo: Todo, patch: TodoPatch) => {
    const row = await updateTodo(createClient(), todo.id, patch);
    setTodos((prev) => prev.map((t) => (t.id === row.id ? row : t)));
    setError("");
  };

  const runAction = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    }
  };

  const resetFilters = () => {
    setStatus("all");
    setRange("all");
    setQuery("");
  };

  const filtersActive = status !== "all" || range !== "all" || query.trim() !== "";

  const onPill = (key: "today" | "doing" | "week" | "overdue" | "done") => {
    if (key === "today") {
      setStatus("all");
      setRange(range === "today" ? "all" : "today");
    } else if (key === "week") {
      setStatus("all");
      setRange(range === "week" ? "all" : "week");
    } else if (key === "overdue") {
      setStatus("all");
      setRange(range === "overdue" ? "all" : "overdue");
    } else if (key === "doing") {
      setRange("all");
      setStatus(status === "doing" ? "all" : "doing");
    } else {
      setRange("all");
      setStatus(status === "done" ? "all" : "done");
    }
  };

  const handleEditorSubmit = async (values: TodoFormValues) => {
    const supabase = createClient();
    if (editor.todo) {
      const row = await updateTodo(supabase, editor.todo.id, values);
      setTodos((prev) => prev.map((t) => (t.id === row.id ? row : t)));
    } else {
      if (!session) throw new Error("请先登录");
      const row = await createTodo(supabase, session.user.id, values);
      setTodos((prev) => [...prev, row]);
    }
    setEditor({ open: false, todo: null });
    setError("");
  };

  const handleFinishSubmit = async (values: TodoFinishValues) => {
    if (!finishing) return;
    await mutate(finishing, {
      ...values,
      status: "done",
      completed_at: new Date().toISOString(),
    });
    setFinishing(null);
  };

  const handleDelete = (todo: Todo) => {
    if (!window.confirm(`删除「${todo.title}」？删除后不可恢复。`)) return;
    void runAction(async () => {
      await removeTodo(createClient(), todo.id);
      setTodos((prev) => prev.filter((t) => t.id !== todo.id));
    });
  };

  const pills: { key: "today" | "doing" | "week" | "overdue" | "done"; label: string; value: number; active: boolean }[] = [
    { key: "today", label: "今日", value: summary.today, active: range === "today" },
    { key: "doing", label: "进行中", value: summary.doing, active: status === "doing" },
    { key: "week", label: "本周", value: summary.week, active: range === "week" },
    { key: "overdue", label: "已逾期", value: summary.overdue, active: range === "overdue" },
    { key: "done", label: "已完成", value: summary.done, active: status === "done" },
  ];

  const headline = summary.overdue
    ? `今天还有 ${summary.today} 件待办，其中 ${summary.overdue} 件已逾期`
    : `今天还有 ${summary.today} 件待办`;

  if (!ready) {
    return <p className="todo-placeholder">加载中…</p>;
  }

  if (!session) {
    return (
      <div className="todo-login">
        <p className="todo-login-title">登录后使用待办事项</p>
        <p className="todo-login-text">待办与你的账号绑定，换设备打开也能看到同一份清单。</p>
        <button className="todo-act todo-act--primary" onClick={() => setAuthModal("login")}>
          登录 / 注册
        </button>
        {authModal && (
          <AuthModal
            mode={authModal}
            onClose={() => setAuthModal(null)}
            onSwitchMode={(mode) => setAuthModal(mode)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="todo-board">
      <header className="todo-head">
        <div>
          <h1 className="todo-h1">待办事项</h1>
          <p className="todo-sub">{headline}</p>
        </div>
        <button
          className="todo-new"
          onClick={() => setEditor({ open: true, todo: null })}
        >
          + 新建待办
        </button>
      </header>

      <div className="todo-pills">
        {pills.map((p) => (
          <button
            key={p.key}
            className={`todo-pill${p.active ? " is-active" : ""}${p.key === "overdue" && p.value > 0 ? " is-overdue" : ""}`}
            onClick={() => onPill(p.key)}
          >
            <span className="todo-pill-label">{p.label}</span>
            <span className="todo-pill-value">{p.value}</span>
          </button>
        ))}
      </div>

      <div className="todo-toolbar">
        <input
          className="todo-input todo-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜事件 / 地点 / 做什么 / 标签"
        />
        <select
          className="todo-input todo-select"
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusKey)}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className="todo-input todo-select"
          value={range}
          onChange={(e) => setRange(e.target.value as RangeKey)}
        >
          {RANGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {filtersActive && (
          <button className="todo-act" onClick={resetFilters}>
            清空筛选
          </button>
        )}
      </div>

      {error && <div className="todo-form-error">{error}</div>}

      {loading ? (
        <p className="todo-placeholder">加载中…</p>
      ) : groups.length === 0 ? (
        <div className="todo-empty">
          <p>{todos.length === 0 ? "还没有待办，先记一件最想推进的事。" : "当前筛选下没有待办。"}</p>
          {todos.length === 0 ? (
            <button className="todo-act todo-act--primary" onClick={() => setEditor({ open: true, todo: null })}>
              新建第一条
            </button>
          ) : (
            <button className="todo-act" onClick={resetFilters}>
              清空筛选
            </button>
          )}
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.key} className="todo-group">
            <div className="todo-group-head">
              <span className="todo-group-label">{group.label}</span>
              <span className="todo-group-count">{group.todos.length}</span>
            </div>
            <div className="todo-list">
              {group.todos.map((todo) => (
                <TodoCard
                  key={todo.id}
                  todo={todo}
                  now={now}
                  onStart={() => void runAction(() => mutate(todo, { status: "doing" }))}
                  onFinish={() => setFinishing(todo)}
                  onDrop={() =>
                    void runAction(() =>
                      mutate(todo, { status: "dropped", completed_at: new Date().toISOString() })
                    )
                  }
                  onReopen={() => void runAction(() => mutate(todo, { status: "todo", completed_at: null }))}
                  onEdit={() => setEditor({ open: true, todo })}
                  onDelete={() => handleDelete(todo)}
                />
              ))}
            </div>
          </section>
        ))
      )}

      {editor.open && (
        <TodoEditor
          todo={editor.todo}
          onClose={() => setEditor({ open: false, todo: null })}
          onSubmit={handleEditorSubmit}
        />
      )}
      {finishing && (
        <TodoFinishModal
          todo={finishing}
          onClose={() => setFinishing(null)}
          onSubmit={handleFinishSubmit}
        />
      )}
    </div>
  );
}

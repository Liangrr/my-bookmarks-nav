import { useCallback, useMemo, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { groupTodos, summarize, type Todo } from "@shared-lib/todos";
import { ApiError, deleteTodo, fetchTodos, getSession, patchTodo } from "@/lib/api";
import { dayText, minutesText, timeText } from "@/lib/todo-format";

const OUTCOME_TEXT: Record<string, string> = {
  met: "达成",
  partial: "部分达成",
  missed: "未达成",
};

export default function Todos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    if (!getSession()) {
      Taro.redirectTo({ url: "/pages/login/index" });
      return;
    }
    setLoading(true);
    setNow(new Date());
    try {
      const rows = await fetchTodos();
      setTodos(rows);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        Taro.redirectTo({ url: "/pages/login/index" });
        return;
      }
      Taro.showToast({ title: err instanceof Error ? err.message : "加载失败", icon: "none" });
    } finally {
      setLoading(false);
    }
  }, []);

  useDidShow(() => {
    void load();
  });

  const summary = useMemo(() => summarize(todos, now), [todos, now]);
  const groups = useMemo(() => groupTodos(todos, now), [todos, now]);

  const patch = async (todo: Todo, status: Todo["status"]) => {
    try {
      const row = await patchTodo(
        todo.id,
        status === "todo"
          ? { status, completed_at: null }
          : status === "doing"
            ? { status }
            : { status, completed_at: new Date().toISOString() }
      );
      setTodos((prev) => prev.map((t) => (t.id === row.id ? row : t)));
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : "操作失败", icon: "none" });
    }
  };

  const remove = async (todo: Todo) => {
    const confirm = await Taro.showModal({
      title: "删除待办",
      content: todo.title,
      confirmText: "删除",
      confirmColor: "#ef4444",
    });
    if (!confirm.confirm) return;
    try {
      await deleteTodo(todo.id);
      setTodos((prev) => prev.filter((t) => t.id !== todo.id));
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : "删除失败", icon: "none" });
    }
  };

  const openActions = async (todo: Todo) => {
    const actions: { label: string; run: () => void }[] = [];
    if (todo.status === "todo") actions.push({ label: "开始", run: () => void patch(todo, "doing") });
    if (todo.status === "todo" || todo.status === "doing") {
      actions.push({ label: "完成", run: () => void patch(todo, "done") });
      actions.push({ label: "放弃", run: () => void patch(todo, "dropped") });
    } else {
      actions.push({ label: "重新打开", run: () => void patch(todo, "todo") });
    }
    actions.push({
      label: "编辑",
      run: () => Taro.navigateTo({ url: `/pages/todo-edit/index?id=${todo.id}` }),
    });
    actions.push({ label: "删除", run: () => void remove(todo) });

    try {
      const res = await Taro.showActionSheet({ itemList: actions.map((a) => a.label) });
      actions[res.tapIndex]?.run();
    } catch {
      // 取消选择，无需处理
    }
  };

  return (
    <View className="page todos">
      <View className="todo-summary">
        <View className="todo-stat">
          <View className="todo-stat-value">{summary.today}</View>
          <View className="todo-stat-label">今日</View>
        </View>
        <View className="todo-stat">
          <View className="todo-stat-value">{summary.doing}</View>
          <View className="todo-stat-label">进行中</View>
        </View>
        <View className="todo-stat">
          <View className="todo-stat-value">{summary.week}</View>
          <View className="todo-stat-label">本周</View>
        </View>
        <View className="todo-stat">
          <View className={`todo-stat-value${summary.overdue > 0 ? " warn" : ""}`}>
            {summary.overdue}
          </View>
          <View className="todo-stat-label">逾期</View>
        </View>
        <View className="todo-stat">
          <View className="todo-stat-value">{summary.done}</View>
          <View className="todo-stat-label">已完成</View>
        </View>
      </View>

      {loading ? (
        <View className="empty">加载中…</View>
      ) : groups.length === 0 ? (
        <View className="empty">还没有待办，点右下角「＋」记一件最想推进的事。</View>
      ) : (
        groups.map((group) => (
          <View key={group.key} className="todo-group">
            <View className="group-label">
              {group.label} · {group.todos.length}
            </View>
            {group.todos.map((todo) => (
              <View
                key={todo.id}
                className={`todo-item${todo.status === "done" || todo.status === "dropped" ? " done" : ""}`}
                onClick={() => void openActions(todo)}
              >
                <View className={`todo-dot ${todo.status}`} />
                <View className="todo-item-body">
                  <View className="todo-item-title">
                    <Text className="todo-item-name">{todo.title}</Text>
                    <Text className="todo-item-time">
                      {dayText(todo.starts_at, now)} {todo.all_day ? "全天" : timeText(todo.starts_at)}
                    </Text>
                  </View>
                  <View className="todo-item-meta">
                    {todo.place ? <Text>📍 {todo.place}</Text> : null}
                    {todo.duration_min != null ? <Text>约 {minutesText(todo.duration_min)}</Text> : null}
                    {todo.status === "done" && todo.outcome ? (
                      <Text className="ok">{OUTCOME_TEXT[todo.outcome]}</Text>
                    ) : null}
                  </View>
                  {todo.status === "done" && todo.result ? (
                    <View className="todo-item-result">{todo.result}</View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ))
      )}

      <View
        className="todo-fab"
        onClick={() => Taro.navigateTo({ url: "/pages/todo-edit/index" })}
      >
        ＋
      </View>
    </View>
  );
}

import { useEffect, useState } from "react";
import { View, Text, Input, Textarea, Picker, Switch } from "@tarojs/components";
import Taro, { useRouter } from "@tarojs/taro";
import type { TodoPriority } from "@shared-lib/todos";
import { createTodo, deleteTodo, fetchTodos, patchTodo } from "@/lib/api";
import { dayKey, timeText, toIso } from "@/lib/todo-format";

const PRIORITIES: { value: TodoPriority; label: string }[] = [
  { value: 2, label: "高" },
  { value: 1, label: "中" },
  { value: 0, label: "低" },
];

export default function TodoEdit() {
  const router = useRouter();
  const editingId = router.params.id;

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => dayKey(new Date()));
  const [time, setTime] = useState(() => timeText(new Date().toISOString()));
  const [allDay, setAllDay] = useState(false);
  const [place, setPlace] = useState("");
  const [duration, setDuration] = useState("");
  const [detail, setDetail] = useState("");
  const [expect, setExpect] = useState("");
  const [priority, setPriority] = useState<TodoPriority>(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Taro.setNavigationBarTitle({ title: editingId ? "编辑待办" : "新建待办" });
  }, [editingId]);

  useEffect(() => {
    if (!editingId) return;
    void (async () => {
      try {
        const rows = await fetchTodos();
        const found = rows.find((r) => r.id === editingId);
        if (!found) return;
        setTitle(found.title);
        setDate(dayKey(found.starts_at));
        setTime(timeText(found.starts_at));
        setAllDay(found.all_day);
        setPlace(found.place ?? "");
        setDuration(found.duration_min != null ? String(found.duration_min) : "");
        setDetail(found.detail ?? "");
        setExpect(found.expect ?? "");
        setPriority(found.priority);
      } catch (err) {
        Taro.showToast({ title: err instanceof Error ? err.message : "加载失败", icon: "none" });
      }
    })();
  }, [editingId]);

  const save = async () => {
    if (!title.trim()) {
      Taro.showToast({ title: "请填写待办事件", icon: "none" });
      return;
    }
    if (duration.trim() !== "" && Number.isNaN(Number(duration))) {
      Taro.showToast({ title: "预计耗时需为数字", icon: "none" });
      return;
    }

    const payload = {
      title: title.trim(),
      starts_at: toIso(date, allDay ? "00:00" : time),
      all_day: allDay,
      place: place.trim() || null,
      duration_min: duration.trim() === "" ? null : Number(duration),
      detail: detail.trim() || null,
      expect: expect.trim() || null,
      priority,
    };

    setSaving(true);
    try {
      if (editingId) await patchTodo(editingId, payload);
      else await createTodo(payload);
      Taro.navigateBack();
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : "保存失败", icon: "none" });
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editingId) return;
    const confirm = await Taro.showModal({
      title: "删除待办",
      content: title,
      confirmText: "删除",
      confirmColor: "#ef4444",
    });
    if (!confirm.confirm) return;
    try {
      await deleteTodo(editingId);
      Taro.navigateBack();
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : "删除失败", icon: "none" });
    }
  };

  return (
    <View className="page">
      <View className="field">
        <Text className="field-label">事件 *</Text>
        <Input
          className="field-input"
          value={title}
          onInput={(e) => setTitle(e.detail.value)}
          placeholder="例：产品评审会"
        />
      </View>

      <View className="field-row">
        <View className="field">
          <Text className="field-label">日期 *</Text>
          <Picker mode="date" value={date} onChange={(e) => setDate(String(e.detail.value))}>
            <View className="field-input">{date}</View>
          </Picker>
        </View>
        <View className="field">
          <Text className="field-label">时间</Text>
          <Picker mode="time" value={time} onChange={(e) => setTime(String(e.detail.value))}>
            <View className="field-input">{allDay ? "全天" : time}</View>
          </Picker>
        </View>
      </View>

      <View className="field field-inline">
        <Text className="field-label">只定哪天，时间待定</Text>
        <Switch checked={allDay} onChange={(e) => setAllDay(e.detail.value)} color="#4ade80" />
      </View>

      <View className="field">
        <Text className="field-label">地点</Text>
        <Input
          className="field-input"
          value={place}
          onInput={(e) => setPlace(e.detail.value)}
          placeholder="例：3 号会议室"
        />
      </View>

      <View className="field">
        <Text className="field-label">预计耗时（分钟）</Text>
        <Input
          className="field-input"
          type="number"
          value={duration}
          onInput={(e) => setDuration(e.detail.value)}
          placeholder="60"
        />
      </View>

      <View className="field">
        <Text className="field-label">优先级</Text>
        <View className="chips">
          {PRIORITIES.map((p) => (
            <View
              key={p.value}
              className={`chip${priority === p.value ? " chip-on" : ""}`}
              onClick={() => setPriority(p.value)}
            >
              {p.label}
            </View>
          ))}
        </View>
      </View>

      <View className="field">
        <Text className="field-label">做什么</Text>
        <Textarea
          className="field-textarea"
          value={detail}
          onInput={(e) => setDetail(e.detail.value)}
          placeholder="具体要推进的步骤"
          maxlength={500}
        />
      </View>

      <View className="field">
        <Text className="field-label">预期结果</Text>
        <Textarea
          className="field-textarea"
          value={expect}
          onInput={(e) => setExpect(e.detail.value)}
          placeholder="做完之后应该是什么样"
          maxlength={300}
        />
      </View>

      <View className={`login-submit${saving ? " disabled" : ""}`} onClick={() => void save()}>
        {saving ? "保存中…" : "保存"}
      </View>

      {editingId ? (
        <View className="logout" onClick={() => void remove()}>
          删除这条待办
        </View>
      ) : null}
    </View>
  );
}

import { describe, expect, it } from "vitest";
import { groupTodos, isOverdue, summarize, validateTodo, type Todo } from "@shared-lib/todos";

// 2026-10-28 是周三；本周 = 10-26(一) ~ 11-01(日)，下周从 11-02(一) 开始
const NOW = new Date("2026-10-28T10:00:00+08:00");

function makeTodo(patch: Partial<Todo> & { id: string }): Todo {
  return {
    user_id: "u1",
    title: "待办",
    detail: null,
    place: null,
    starts_at: "2026-10-28T09:00:00+08:00",
    due_at: null,
    all_day: false,
    duration_min: null,
    expect: null,
    result: null,
    outcome: null,
    actual_min: null,
    priority: 1,
    status: "todo",
    tags: [],
    remind_at: null,
    created_at: "2026-10-01T00:00:00+08:00",
    updated_at: "2026-10-01T00:00:00+08:00",
    completed_at: null,
    ...patch,
  };
}

describe("isOverdue：逾期只看 due_at，且只在未结束的状态上成立", () => {
  it("进行中且截止时间已过 → 逾期", () => {
    expect(isOverdue(makeTodo({ id: "a", due_at: "2026-10-27T18:00:00+08:00" }), NOW)).toBe(true);
    expect(
      isOverdue(makeTodo({ id: "b", status: "doing", due_at: "2026-10-27T18:00:00+08:00" }), NOW)
    ).toBe(true);
  });

  it("没有截止时间 → 不算逾期（哪怕开始时间已过）", () => {
    expect(isOverdue(makeTodo({ id: "c", starts_at: "2026-10-20T09:00:00+08:00" }), NOW)).toBe(false);
  });

  it("已完成 / 已放弃 → 永远不算逾期", () => {
    const done = makeTodo({ id: "d", status: "done", due_at: "2026-10-27T18:00:00+08:00" });
    const dropped = makeTodo({ id: "e", status: "dropped", due_at: "2026-10-27T18:00:00+08:00" });
    expect(isOverdue(done, NOW)).toBe(false);
    expect(isOverdue(dropped, NOW)).toBe(false);
  });

  it("刚好等于此刻 → 还没算逾期（严格小于才算）", () => {
    expect(isOverdue(makeTodo({ id: "f", due_at: NOW.toISOString() }), NOW)).toBe(false);
  });
});

describe("groupTodos：按日期分桶，未到期的在前，已完成的收在最后", () => {
  it("空列表 → 无分组", () => {
    expect(groupTodos([], NOW)).toEqual([]);
  });

  it("今天 / 明天 / 本周内 / 之后 / 待定时间 / 已完成，按此顺序；空分组不出现", () => {
    const list = [
      makeTodo({ id: "done", status: "done", starts_at: "2026-10-27T09:00:00+08:00" }),
      makeTodo({ id: "later", starts_at: "2026-11-05T09:00:00+08:00" }),
      makeTodo({ id: "week", starts_at: "2026-10-31T09:00:00+08:00" }),
      makeTodo({ id: "tomorrow", starts_at: "2026-10-29T09:00:00+08:00" }),
      makeTodo({ id: "today", starts_at: "2026-10-28T09:00:00+08:00" }),
      makeTodo({ id: "allday", all_day: true, starts_at: "2026-10-28T00:00:00+08:00" }),
    ];
    expect(groupTodos(list, NOW).map((g) => g.key)).toEqual([
      "today",
      "tomorrow",
      "week",
      "later",
      "unscheduled",
      "done",
    ]);
    const byKey = new Map(groupTodos(list, NOW).map((g) => [g.key, g.todos.map((t) => t.id)]));
    expect(byKey.get("today")).toEqual(["today"]);
    expect(byKey.get("unscheduled")).toEqual(["allday"]);
  });

  it("开始日期早于今天且未结束 → 归到「已逾期」并排在最前", () => {
    const groups = groupTodos(
      [
        makeTodo({ id: "today", starts_at: "2026-10-28T09:00:00+08:00" }),
        makeTodo({ id: "past", starts_at: "2026-10-20T09:00:00+08:00" }),
      ],
      NOW
    );
    expect(groups.map((g) => g.key)).toEqual(["overdue", "today"]);
    expect(groups[0].todos.map((t) => t.id)).toEqual(["past"]);
  });

  it("组内按开始时间升序，同一时间按优先级降序", () => {
    const groups = groupTodos(
      [
        makeTodo({ id: "late", starts_at: "2026-10-28T20:00:00+08:00" }),
        makeTodo({ id: "low", starts_at: "2026-10-28T08:00:00+08:00", priority: 0 }),
        makeTodo({ id: "high", starts_at: "2026-10-28T08:00:00+08:00", priority: 2 }),
      ],
      NOW
    );
    expect(groups[0].todos.map((t) => t.id)).toEqual(["high", "low", "late"]);
  });

  it("已完成组按完成时间倒序（最近完成的在前），缺完成时间时回退到更新时间", () => {
    const groups = groupTodos(
      [
        makeTodo({ id: "old", status: "done", completed_at: "2026-10-26T09:00:00+08:00" }),
        makeTodo({ id: "new", status: "done", completed_at: "2026-10-28T09:00:00+08:00" }),
        makeTodo({
          id: "dropped",
          status: "dropped",
          completed_at: null,
          updated_at: "2026-10-27T09:00:00+08:00",
        }),
      ],
      NOW
    );
    expect(groups.map((g) => g.key)).toEqual(["done"]);
    expect(groups[0].todos.map((t) => t.id)).toEqual(["new", "dropped", "old"]);
  });
});

describe("summarize：顶部统计胶囊的五个数", () => {
  it("今日待办只数未结束且开始日期是今天的（含全天）", () => {
    const s = summarize(
      [
        makeTodo({ id: "a", starts_at: "2026-10-28T09:00:00+08:00" }),
        makeTodo({ id: "b", starts_at: "2026-10-28T23:00:00+08:00" }),
        makeTodo({ id: "c", all_day: true, starts_at: "2026-10-28T00:00:00+08:00" }),
        makeTodo({ id: "d", starts_at: "2026-10-29T09:00:00+08:00" }),
        makeTodo({ id: "e", status: "done", starts_at: "2026-10-28T09:00:00+08:00" }),
      ],
      NOW
    );
    expect(s.today).toBe(3);
  });

  it("进行中 / 本周 / 已逾期 / 已完成各自计数", () => {
    const s = summarize(
      [
        makeTodo({ id: "doing", status: "doing", starts_at: "2026-10-29T09:00:00+08:00" }),
        makeTodo({ id: "mon", starts_at: "2026-10-26T09:00:00+08:00" }),
        makeTodo({ id: "sun", starts_at: "2026-11-01T09:00:00+08:00" }),
        makeTodo({ id: "nextweek", starts_at: "2026-11-02T09:00:00+08:00" }),
        makeTodo({ id: "overdue", due_at: "2026-10-27T09:00:00+08:00" }),
        makeTodo({ id: "done", status: "done", completed_at: "2026-10-28T09:30:00+08:00" }),
        makeTodo({ id: "dropped", status: "dropped" }),
      ],
      NOW
    );
    expect(s.doing).toBe(1);
    // 本周 = 10-26 ~ 11-01：doing(周四) / mon / sun / overdue / today 中的默认项
    expect(s.week).toBe(4);
    expect(s.overdue).toBe(1);
    expect(s.done).toBe(1);
  });
});

describe("validateTodo：新建最小信息是「事件 + 时间」，其余可后补", () => {
  it("只填事件和时间即可通过", () => {
    expect(validateTodo({ title: "面试", starts_at: "2026-10-29T14:00:00+08:00" })).toEqual({
      ok: true,
      errors: [],
    });
  });

  it("事件必填，且不能全是空白", () => {
    expect(validateTodo({ starts_at: "2026-10-29T14:00:00+08:00" }).ok).toBe(false);
    expect(validateTodo({ title: "   ", starts_at: "2026-10-29T14:00:00+08:00" }).errors).toContain(
      "请填写待办事件"
    );
  });

  it("时间必填且必须可解析", () => {
    expect(validateTodo({ title: "面试" }).errors).toContain("请填写待办时间");
    expect(validateTodo({ title: "面试", starts_at: "不是时间" }).errors).toContain("待办时间格式不正确");
  });

  it("截止时间早于开始时间 → 报错", () => {
    const out = validateTodo({
      title: "面试",
      starts_at: "2026-10-29T14:00:00+08:00",
      due_at: "2026-10-29T13:00:00+08:00",
    });
    expect(out.ok).toBe(false);
    expect(out.errors).toContain("截止时间不能早于开始时间");
  });

  it("预计耗时 / 实际耗时必须是 0 以上的整数", () => {
    const out = validateTodo({
      title: "面试",
      starts_at: "2026-10-29T14:00:00+08:00",
      duration_min: -10,
      actual_min: 5.5,
    });
    expect(out.errors).toContain("预计耗时需为 0 以上的整数");
    expect(out.errors).toContain("实际耗时需为 0 以上的整数");
  });

  it("优先级只能是 0/1/2，状态与达成度只能是约定枚举", () => {
    const out = validateTodo({
      title: "面试",
      starts_at: "2026-10-29T14:00:00+08:00",
      priority: 5,
      status: "unknown" as never,
      outcome: "great" as never,
    });
    expect(out.ok).toBe(false);
    expect(out.errors).toContain("优先级取值不合法");
    expect(out.errors).toContain("状态取值不合法");
    expect(out.errors).toContain("达成度取值不合法");
  });
});

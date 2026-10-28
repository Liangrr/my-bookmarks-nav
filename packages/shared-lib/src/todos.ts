// 待办事项的纯逻辑：分组、逾期、统计、校验。无 React / DOM / fetch 依赖，Web 与小程序共用。
//
// 时间口径统一按东八区（UTC+8）计算自然日与自然周，避免运行环境时区不同导致分组漂移。

export type TodoStatus = "todo" | "doing" | "done" | "dropped";
export type TodoOutcome = "met" | "partial" | "missed";
export type TodoPriority = 0 | 1 | 2;

export type Todo = {
  id: string;
  user_id: string;
  /** 事件（必填） */
  title: string;
  /** 做什么 */
  detail: string | null;
  place: string | null;
  /** 开始时间（必填），ISO 字符串 */
  starts_at: string;
  /** 截止时间，逾期判定只看它 */
  due_at: string | null;
  /** 只定了哪天、没定几点 */
  all_day: boolean;
  duration_min: number | null;
  /** 预期结果 */
  expect: string | null;
  /** 实际结果 */
  result: string | null;
  outcome: TodoOutcome | null;
  actual_min: number | null;
  priority: TodoPriority;
  status: TodoStatus;
  tags: string[];
  remind_at: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export const TODO_STATUSES: TodoStatus[] = ["todo", "doing", "done", "dropped"];
export const TODO_OUTCOMES: TodoOutcome[] = ["met", "partial", "missed"];

const TZ_OFFSET_MIN = 480;
const DAY_MS = 86400000;

/** 自然日序号（东八区），1970-01-01 为 0 */
function dayNumber(iso: string): number {
  return Math.floor((Date.parse(iso) + TZ_OFFSET_MIN * 60000) / DAY_MS);
}

/** 自然周序号（周一为一周起点）：同周的任意一天结果相同 */
function weekNumber(iso: string): number {
  return Math.floor((dayNumber(iso) + 3) / 7);
}

function timeOf(iso: string | null, fallback = 0): number {
  if (!iso) return fallback;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? fallback : t;
}

function isTerminal(todo: Todo): boolean {
  return todo.status === "done" || todo.status === "dropped";
}

function isActive(todo: Todo): boolean {
  return todo.status === "todo" || todo.status === "doing";
}

/** 逾期是动态算出来的，不落库：未结束 + 有截止时间 + 截止时间已过 */
export function isOverdue(todo: Todo, now: Date): boolean {
  if (!isActive(todo) || !todo.due_at) return false;
  const due = Date.parse(todo.due_at);
  return !Number.isNaN(due) && due < now.getTime();
}

export type TodoGroupKey = "overdue" | "today" | "tomorrow" | "week" | "later" | "unscheduled" | "done";

export type TodoGroup = {
  key: TodoGroupKey;
  label: string;
  todos: Todo[];
};

const GROUP_LABELS: Record<TodoGroupKey, string> = {
  overdue: "已逾期",
  today: "今天",
  tomorrow: "明天",
  week: "本周内",
  later: "之后",
  unscheduled: "待定时间",
  done: "已完成",
};

const GROUP_ORDER: TodoGroupKey[] = ["overdue", "today", "tomorrow", "week", "later", "unscheduled", "done"];

function bucketOf(todo: Todo, todayNum: number, todayWeek: number): TodoGroupKey {
  if (isTerminal(todo)) return "done";
  // 只填了日期没填时间：统一收进「待定时间」，仍可翻到具体日期
  if (todo.all_day) return "unscheduled";
  const day = dayNumber(todo.starts_at);
  if (day < todayNum) return "overdue";
  if (day === todayNum) return "today";
  if (day === todayNum + 1) return "tomorrow";
  if (weekNumber(todo.starts_at) === todayWeek) return "week";
  return "later";
}

function sortActive(list: Todo[]): Todo[] {
  return [...list].sort((a, b) => {
    const diff = timeOf(a.starts_at) - timeOf(b.starts_at);
    return diff !== 0 ? diff : b.priority - a.priority;
  });
}

function sortTerminal(list: Todo[]): Todo[] {
  return [...list].sort(
    (a, b) =>
      timeOf(b.completed_at, timeOf(b.updated_at)) - timeOf(a.completed_at, timeOf(a.updated_at))
  );
}

/** 按展示顺序分组，空分组不返回 */
export function groupTodos(todos: Todo[], now: Date): TodoGroup[] {
  const todayNum = dayNumber(now.toISOString());
  const todayWeek = weekNumber(now.toISOString());
  const buckets = new Map<TodoGroupKey, Todo[]>();
  for (const todo of todos) {
    const key = bucketOf(todo, todayNum, todayWeek);
    const list = buckets.get(key);
    if (list) list.push(todo);
    else buckets.set(key, [todo]);
  }
  return GROUP_ORDER.filter((key) => buckets.has(key)).map((key) => {
    const list = buckets.get(key)!;
    return {
      key,
      label: GROUP_LABELS[key],
      todos: key === "done" ? sortTerminal(list) : sortActive(list),
    };
  });
}

export type TodoSummary = {
  /** 今日待办（未结束且开始日期是今天，含全天） */
  today: number;
  /** 进行中 */
  doing: number;
  /** 本周（未结束且开始时间落在本周） */
  week: number;
  /** 已逾期（动态计算） */
  overdue: number;
  /** 已完成（不含已放弃） */
  done: number;
};

export function summarize(todos: Todo[], now: Date): TodoSummary {
  const todayNum = dayNumber(now.toISOString());
  const todayWeek = weekNumber(now.toISOString());
  const out: TodoSummary = { today: 0, doing: 0, week: 0, overdue: 0, done: 0 };
  for (const todo of todos) {
    if (todo.status === "doing") out.doing += 1;
    if (todo.status === "done") out.done += 1;
    if (isOverdue(todo, now)) out.overdue += 1;
    if (!isActive(todo)) continue;
    if (dayNumber(todo.starts_at) === todayNum) out.today += 1;
    if (weekNumber(todo.starts_at) === todayWeek) out.week += 1;
  }
  return out;
}

export type TodoDraft = {
  title?: string | null;
  starts_at?: string | null;
  due_at?: string | null;
  duration_min?: number | null;
  actual_min?: number | null;
  priority?: number | null;
  status?: string | null;
  outcome?: string | null;
};

export type TodoValidation = {
  ok: boolean;
  errors: string[];
};

function isNonNegativeInt(v: number): boolean {
  return Number.isInteger(v) && v >= 0;
}

/** 新建最少只需「事件 + 时间」，其余后补；错误信息直接可展示 */
export function validateTodo(draft: TodoDraft): TodoValidation {
  const errors: string[] = [];

  if (!draft.title || !draft.title.trim()) errors.push("请填写待办事件");

  if (!draft.starts_at) errors.push("请填写待办时间");
  else if (Number.isNaN(Date.parse(draft.starts_at))) errors.push("待办时间格式不正确");

  if (draft.due_at) {
    const due = Date.parse(draft.due_at);
    if (Number.isNaN(due)) errors.push("截止时间格式不正确");
    else if (draft.starts_at && !Number.isNaN(Date.parse(draft.starts_at)) && due < Date.parse(draft.starts_at)) {
      errors.push("截止时间不能早于开始时间");
    }
  }

  if (draft.duration_min != null && !isNonNegativeInt(draft.duration_min)) {
    errors.push("预计耗时需为 0 以上的整数");
  }
  if (draft.actual_min != null && !isNonNegativeInt(draft.actual_min)) {
    errors.push("实际耗时需为 0 以上的整数");
  }

  if (draft.priority != null && draft.priority !== 0 && draft.priority !== 1 && draft.priority !== 2) {
    errors.push("优先级取值不合法");
  }
  if (draft.status != null && !TODO_STATUSES.includes(draft.status as TodoStatus)) {
    errors.push("状态取值不合法");
  }
  if (draft.outcome != null && !TODO_OUTCOMES.includes(draft.outcome as TodoOutcome)) {
    errors.push("达成度取值不合法");
  }

  return { ok: errors.length === 0, errors };
}

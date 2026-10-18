// 无浏览器 / 无框架依赖的纯逻辑，Web 与小程序共用。
// 注意：这里刻意不 re-export shared-data（living-guide.json 1.8MB），避免误 import 而把大 JSON 拉进包里。
export * from "./convert-sheet";
export * from "./feast-filter";
export * from "./meal-budget";

import { defineConfig } from "vitest/config";

// 只做纯逻辑单测：node 环境、独立配置（不引入 next 配置），测试放 tests/ 下
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.mjs"],
  },
});

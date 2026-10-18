import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const sharedData = fileURLToPath(new URL("./packages/shared-data/src", import.meta.url));
const sharedLib = fileURLToPath(new URL("./packages/shared-lib/src", import.meta.url));

// 只做纯逻辑单测：node 环境、独立配置（不引入 next 配置），测试放 tests/ 下。
// alias 与根 tsconfig 的 @shared-data/* 与 @shared-lib/* 保持一致。
export default defineConfig({
  resolve: {
    alias: {
      "@shared-data": sharedData,
      "@shared-lib": sharedLib,
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.mjs"],
  },
});

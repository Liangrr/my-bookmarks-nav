import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 《时间的尽头》：public 下自包含的静态作品（原生 ES Module + 本地 three.js），
    // 不参与项目构建与 lint，避免第三方库源码被规则扫描。
    "public/end-of-time/**",
    // 星野背景与星图导航：同样是 public 下的原生 ES Module + 本地 three.js
    "public/starfield/**",
    "public/vendor/**",
    // 小程序构建产物（.gitignore 已忽略，本地存在时也不应参与 lint）
    "apps/mini/dist/**",
  ]),
]);

export default eslintConfig;

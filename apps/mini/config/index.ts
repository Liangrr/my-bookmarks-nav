import path from "node:path";
import { defineConfig, type UserConfigExport } from "@tarojs/cli";
import devConfig from "./dev";
import prodConfig from "./prod";

// 共享包（bookmark-nav-site/packages/*）以源码方式复用：
// 走 alias 指向 src，而不是 node_modules 软链，避免 Taro 默认不编译 node_modules 里的 TS 源码。
const sharedDataSrc = path.resolve(__dirname, "../../../packages/shared-data/src");
const sharedLibSrc = path.resolve(__dirname, "../../../packages/shared-lib/src");

export default defineConfig<"webpack5">(async (merge) => {
  const baseConfig: UserConfigExport<"webpack5"> = {
    projectName: "asuria-mini",
    date: "2026-10-18",
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      828: 1.81 / 2,
    },
    sourceRoot: "src",
    outputRoot: "dist",
    plugins: [],
    defineConstants: {},
    copy: {
      patterns: [],
      options: {},
    },
    framework: "react",
    compiler: "webpack5",
    cache: {
      enable: false,
    },
    alias: {
      "@shared-data": sharedDataSrc,
      "@shared-lib": sharedLibSrc,
      "@": path.resolve(__dirname, "../src"),
    },
    mini: {
      // alias 已经把共享包指向项目外的真实路径，这里显式允许它们参与编译
      compile: {
        include: [sharedDataSrc, sharedLibSrc],
      },
      postcss: {
        pxtransform: {
          enable: true,
          config: {},
        },
        cssModules: {
          enable: false,
        },
      },
    },
    h5: {
      publicPath: "/",
      staticDirectory: "static",
      postcss: {
        autoprefixer: {
          enable: true,
        },
        cssModules: {
          enable: false,
        },
      },
    },
  };

  if (process.env.NODE_ENV === "development") {
    return merge({}, baseConfig, devConfig);
  }
  return merge({}, baseConfig, prodConfig);
});

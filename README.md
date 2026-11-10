# 星轨 · bookmark-nav-site

个人书签导航站，同时收纳一整套生活 / 学习手册页面（应季水果、三餐预算、日常小病、应急、中医、DIY、好好生活…）。

线上地址：<https://bookmark-nav-site.vercel.app>

## 技术栈

- **Web**：Next.js 16 + React 19 + Tailwind 4，Supabase 做数据与鉴权，Vercel 自动部署（GitHub Actions 触发）
- **小程序**：Taro 4.3 + React 18（`apps/mini/`）
- **共享**：`packages/shared-data`（数据 JSON + 法定节假日表）、`packages/shared-lib`（无依赖纯逻辑）
- 一个仓库装三块代码，数据与纯逻辑单一真源，Web 与小程序共用

## 本地开发

```bash
npm run dev              # 起本地服务（默认 http://localhost:3000）
npm run typecheck        # TypeScript 检查
npm run validate:data    # 数据文件体检
npm test                 # vitest 单测
npm run lint             # ESLint
npx next build --webpack # 生产构建（本机缺少 Turbopack 原生绑定，必须带 --webpack）
```

需要 `.env.local` 提供 `NEXT_PUBLIC_SUPABASE_URL` 与 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。

小程序端：

```bash
cd apps/mini && npm run build:weapp   # 产物在 apps/mini/dist/，交微信开发者工具上传
```

## 部署

推送到 `main` 后，[.github/workflows/deploy.yml](./.github/workflows/deploy.yml) 先跑 `verify`（类型检查 + 数据体检 + 单测 + lint），全绿才执行 `vercel --prod`。

## 静态沉浸作品

《时间的尽头》是一件自包含的 Three.js 3D 交互作品。静态资源在 `public/end-of-time/`（three.module.js 已本地化，不参与构建、无需额外依赖），站内路由 `/end-of-time` 由 `src/components/end-of-time-view.tsx` 用同源 iframe 全屏承载；也可直接访问 `/end-of-time/index.html` 独立打开。无 WebGL2 时会显示降级提示。


## 星野背景与星图导航

站点自身的 3D 层（区别于《时间的尽头》这件独立作品）：

- `public/starfield/starfield.js` — 全站固定背景，一个全屏 shader 平面绘制漂移星野 / 极光带 / 星云；颜色实时读取 `--accent`、`--accent-light`、`--bg-primary`，`MutationObserver` 监听 `<html>` 的 `data-accent` / `data-theme`，四套主题包与明暗模式自动换色。由 `src/components/starfield-background.tsx` 挂载，沉浸页自动卸载。
- `public/starfield/starmap.js` — `/nav` 的「星图」视图，把 5 个分类映射为星座、229 个书签映射为星点；单个 `THREE.Points` + raycaster 拾取，与搜索框（匹配高亮）、分类 tab（镜头飞行）、主题包（星色）联动。由 `src/components/star-map.tsx` 挂载。
- `public/vendor/three.module.js` 是共享的本地 three r160（与《时间的尽头》各留一份，保证作品可独立分发）。全部为原生 ES Module、零 npm 依赖、不参与打包；无 WebGL2 时自动回退原 CSS 光晕与卡片列表。
- 性能：背景 30fps / DPR≤1.5×0.78，页面隐藏或星图模式开启时暂停；`prefers-reduced-motion` 静止；`localStorage` 设 `nav-starfield=off` 可关闭背景层。

## 文档

- [docs/项目结构.md](./docs/项目结构.md) —— 各目录 / 文件的作用、数据流、体积约束与已知边界
- [docs/开发规范.md](./docs/开发规范.md) —— 构建铁律、三端同步规则、样式坑、行情数据源、部署流程等开发约定
- [docs/需求池.md](./docs/需求池.md) —— 待办需求登记（PC / H5 / 小程序三端覆盖标注、优先级）
- [docs/变更日志.md](./docs/变更日志.md) —— 每次完成的需求与功能，倒序记录（日期、改动、三端覆盖、提交号）

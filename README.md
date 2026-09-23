# 我的收藏夹 - 个人网站导航

纯静态个人网站导航，基于 Bento Grid 设计风格，深色模式优先。

## 快速部署到 Vercel

### 方式一：Git 仓库 + Vercel 自动部署（推荐）

1. **把项目推到 GitHub 仓库**
   ```bash
   cd bookmark-nav-site
   git init
   git add .
   git commit -m "init: personal bookmark nav"
   git remote add origin https://github.com/你的用户名/你的仓库名.git
   git push -u origin main
   ```

2. **Vercel 导入部署**
   - 打开 [vercel.com](https://vercel.com)，用 GitHub 账号登录
   - 点击 **Add New Project** → 选择你的仓库
   - Framework Preset 选 **Other**
   - Build Command 留空，Output Directory 留空（纯静态）
   - 点击 **Deploy**，等待 10 秒即可上线

3. **后续更新**
   - 每次 `git push` 到 main 分支，Vercel 会自动重新部署

### 方式二：Vercel CLI 直接部署

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署（当前目录直接部署）
vercel --prod
```

## 如何添加/修改网站

编辑 `index.html`，找到 `bookmarks` 数组，按格式添加：

```js
{ title: '网站名称', url: 'example.com', desc: '一句话描述', category: '分类id', icon: '首字母', size: 'large/wide/tall（可选）' }
```

**分类 ID 对应：**
- `video` - 影视娱乐
- `dev` - 开发工具
- `design` - 设计灵感
- `tool` - 实用工具
- `other` - 其他

**卡片大小：**
- 不填 - 普通小卡片
- `large` - 大卡片（占 2x2 格）
- `wide` - 宽卡片（占 2x1 格）
- `tall` - 高卡片（占 1x2 格）

## 功能特性

- Bento Grid 便当盒布局，大小卡片错落有致
- 深色/浅色主题一键切换，自动记忆偏好
- 即时搜索，输入即过滤
- 分类标签快速筛选
- 完全响应式，手机平板桌面完美适配
- 纯静态，加载极快，Vercel 全球 CDN 加速

## 技术栈

- 原生 HTML + CSS + JavaScript
- 零依赖，零构建
- 部署到 Vercel 免费版即可（个人项目完全够用）

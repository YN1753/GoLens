---
feature: ux-polish
status: delivered
updated: 2026-09-17
branch: chore/ux-polish
commits: adf30f76e92d61152907c5f82c5f9e6a2dd07107..dde2d8a6795e165949f4145a1eb0a4f5c280894b
---

# UX Polish — Search / Progress / TOC / Mobile Lab Bar

## Report

**What was built** — 顶栏章内搜索（`/` 聚焦、命中高亮与计数）、自动章内 TOC + 滚动高亮、侧栏阅读进度条、窄屏 Lab 控件 sticky 底栏。零构建，逻辑集中在 `site.js`。

**Verification** — `node --check` PASS；gmp 搜 `work stealing` 2 命中；TOC 在 verdict 之后；375px 下 lab-controls `position:sticky` 且 `.lab overflow:visible`；三页 console 0 error。

**Journey log** — 父级 `overflow:hidden` 会干掉子级相对视口的 sticky，移动端需放开。TOC 应插在导语后而非 h1 与 verdict 之间。文本节点内多处命中要循环切片，不能只标第一处。


## [S1] Problem

内容与视觉已就绪，但阅读路径弱：找不到关键词、不知道读到哪、长章缺目录、窄屏 Lab 控件挤在顶部难操作。

## [S2] Design

### 1. 章内搜索

- 每章顶栏增加搜索输入（`input[type=search]`，placeholder「搜索本页…」）。
- 纯前端：对本页 `h2/h3`、段落、列表、FAQ summary、cheat 条目做文本匹配；命中滚动到最近标题并高亮目标块（`mark` 样式类，1.5s 淡出）。
- 快捷键：`/` 聚焦搜索（输入框内除外）；`Esc` 清除高亮并失焦。
- 无结果时在输入下方显示「无匹配」轻提示。
- 不做跨页全局索引（保持零构建、无预建索引）。

### 2. 侧栏阅读进度

- `site.js` 监听滚动：计算 `#main` / `.content` 阅读百分比。
- 侧栏底部显示 `阅读 xx%` 细进度条（`<progress>` 或 4px div）。
- 每章正文区 `data-chapter`；localStorage 仅存「该页是否读过 ≥90%」，侧栏章节项旁显示小勾（可选，不显示未读焦虑）。

### 3. 章内 TOC 锚点

- 每章正文自动从 `h2[id]` 生成页内 TOC；若缺 `id`，由 `site.js` 按 slug 补齐。
- TOC 渲染在 hero/h1 之后的 `<nav class="page-toc">`，当前节高亮（IntersectionObserver）。
- 锚点使用 `scroll-margin-top` 避开 sticky topbar。

### 4. 窄屏 Lab 底部操作条

- `@media (max-width: 800px)`：每个 `.lab-controls` 固定在 lab 底部（`position: sticky; bottom: 0`），背景纸面、上边线，按钮最小高度 44px。
- 桌面布局不变。

### 文件

- `site/assets/js/site.js` — 搜索、TOC、进度、快捷键
- `site/assets/css/components.css` — `.page-toc`、搜索命中高亮、进度条
- 各 `*.html` — 顶栏加 search input；正文若无 h2 id 保持自动补齐
- 不改三个 lab 的交互逻辑

### 非目标

- 跨章全文索引、服务端搜索、PWA、i18n、分享 OG

## [S3] Out of Scope

- Lab 算法改动、新章节、主题切换、构建工具

## Tasks

- [x] T1: 章内搜索 + `/` 快捷键 + 命中高亮 — acceptance: 在 gmp/channel/gc 可搜关键词并滚到命中区；无结果有提示 (covers: S2)
- [x] T2: 自动 TOC + 当前节高亮 — acceptance: 三章 h2 出现在 TOC，点击可跳，滚动时当前节高亮 (covers: S2)
- [x] T3: 阅读进度条 — acceptance: 侧栏显示百分比随滚动更新 (covers: S2)
- [x] T4: 窄屏 lab-controls sticky 底栏 — acceptance: 375px 下控件贴 lab 底部且可点 (covers: S2)
- [x] T5: 验收 — acceptance: npm run check；三页冒烟无 console error (covers: S2; depends: T1,T2,T3,T4)

---
feature: project-optimize
status: delivered
updated: 2026-09-17
branch: chore/project-optimize
commits: 
---

# Project Optimize — Shared Chrome + Learning Path

## Report

**What was built** — `chapters.js` 作为章节单一清单；`site.js` 按清单重建侧栏并高亮；首页「学习路径」显示已读进度与「继续 / 再复习」；`check.sh` 校验清单 href 与各页 `data-page`。

**Verification** — check 清单段 PASS；首页 7 步学习路径、继续指向 GMP；章节页 nav 8、active 正确；console 0 error。

**Journey log** — 导航 DOM 重建不影响 TOC/搜索/进度（挂在 content/topbar）。加新章只改 `chapters.js` + 新 HTML 即可。


## [S1] Problem

8 个章节页侧栏/顶栏手写重复，加一章要改 8 处 HTML；首页像卡片列表，看不出学习进度与推荐路径；工程校验未覆盖「清单 vs 文件」一致性。

## [S2] Design

### 1. 章节清单（单一数据源）

- 新增 `site/assets/js/chapters.js`：
  ```js
  GoLens.CHAPTERS = [
    { id:'home', idx:'00', href:'index.html', title:'首页' },
    { id:'gmp', idx:'01', href:'gmp.html', title:'GMP 调度' },
    ...
  ]
  ```
- `site.js` 在 DOM 就绪后**注入** `.sidebar .nav-section` 内容（保留 brand/foot 结构，仅替换 nav 列表），并按 `body[data-page]` 高亮。

### 2. 各页 HTML 瘦身

- 各 `.html` 的 nav-link 列表可保留空壳 `<nav class="nav-section">`，由 JS 填充；为无 JS 可访问性，仍写入与清单一致的静态链接，JS 只负责高亮与（若缺失）补齐。
- 实际策略：**静态链接保留 + JS 校验/补齐**。若 DOM 缺少某章链接则按清单插入；多余重复仅高亮一次。

### 3. 首页学习路径

- 首页在 chapter-grid 上方/内部增加「学习路径」区块：
  - 列出 01→07 线性路径，步骤圆点 + 标题。
  - `localStorage` 键 `golens-read-<id>` ≥90% 显示「已读」勾。
  - 「从第一章开始」按钮链到 gmp.html；「继续」指向第一个未读章。
- 进度逻辑复用 site.js 已有滚动写入。

### 4. 工程校验

- `scripts/check.sh`：遍历 `CHAPTERS` 清单对应 href，确认文件存在；确认各页 `data-page` 出现在清单中。

### 非目标

- 不引入打包器；不做跨页全文索引；不改 Lab 逻辑。

## [S3] Out of Scope

- SSR、框架、PWA、i18n

## Tasks

- [x] T1: chapters.js + 导航注入/校验 — acceptance: 8 页侧栏链接完整且与清单一致；data-page 高亮正确 (covers: S2)
- [x] T2: 首页学习路径 + 继续学习 — acceptance: 路径 01–07 渲染；已读标记与「继续」目标正确 (covers: S2)
- [x] T3: check.sh 清单校验 — acceptance: 缺文件或缺 data-page 时 check 失败 (covers: S2)
- [x] T4: 验收 — acceptance: check + 首页/章节冒烟 0 console error (covers: S2; depends: T1,T2,T3)

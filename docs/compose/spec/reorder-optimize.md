---
feature: reorder-optimize
status: delivered
updated: 2026-09-17
branch: chore/reorder-optimize
commits: 9f43ff13cf8918a53f893927ff7ee01ce177d1eb..<head>
---

# Reorder & Project Logic Optimize

## Report

**What was built** — 按「语言 → 并发 → 内存 → 工程」重排 `chapters.js`（01–15），侧栏分组、学习路径、上下章导航全部由清单驱动；`syncPageNav()` 注入 prev/next；首页卡片由 `scripts/sync-home-cards.py` 与清单对齐；`check.sh` 以 manifest 为唯一页面源并校验首页卡片。

**Verification** — check 全绿；首页 nav 顺序 string→…→perf，首卡 01 STRING；string 页 nav「← 首页 / 下一章 Slice」；gmp 为 06 且 prev=泛型；console 0 error。

**Journey log** — 页面顺序只改 chapters.js 一处即可带动全局；静态 HTML 内旧 page-nav 会被 JS 覆盖。加新章仍建议跑 `python3 scripts/sync-home-cards.py`。

## Tasks
- [x] T1 章节顺序与分组 — acceptance: 语言优先路径
- [x] T2 page-nav 注入 — acceptance: prev/next 随清单
- [x] T3 check/首页同步 — acceptance: cards 对齐 manifest


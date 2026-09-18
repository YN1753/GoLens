---
feature: content-http-shutdown
status: delivered
updated: 2026-09-17
branch: chore/content-http-shutdown
commits: 4ff7759054ed6f431627891e36b92d94fae59f22..e067a330a349a4adac88f86aa07ce4e20d25fefc
---

# Content — net/http + Graceful Shutdown

## Report

**What was built** — 第 12《net/http 服务模型》与第 22《优雅关闭与限流》。并发链在 netpoller 后补上 HTTP 生命周期；工程链在 checklist 后补 Shutdown/限流/超时。

**Verification** — check 全绿；http 生命周期与 shutdown 步骤日志正常；首页 24 卡、侧栏 25；console 0 error。

**Journey log** — 章节顺序仍只改 chapters.js；上下章导航由 site.js 注入，静态 page-nav 可滞后不影响运行。

## Tasks
- [x] T1 清单
- [x] T2 nethttp Lab
- [x] T3 shutdown Lab
- [x] T4 验收

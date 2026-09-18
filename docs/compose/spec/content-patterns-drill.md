---
feature: content-patterns-drill
status: delivered
updated: 2026-09-17
branch: chore/content-patterns-drill
commits: a2e6e1ec274a8023265233636e87f503babdc133..6bfe152350b6978c1e709050c347dd840fde0428
---

# Content — Patterns + Drill

## Report

**What was built** — 第 11《并发模式》（Worker/Fan/Pipeline/or-done）与第 17《综合演练》（跨章选择题）。清单顺序调整为语言→并发（含 patterns）→内存→工程→drill；首页卡片脚本改为按标记整体替换 grid。

**Verification** — check 全绿；patterns 步骤日志、drill 答题解析、首页 17 卡、nav 18；console 0 error。

**Journey log** — sync-home-cards 不能对 grid 用「第一个 </div>」非贪婪替换，应替换到 `<h2>设计原则` 之前整段。

## Tasks
- [x] T1 清单与导航
- [x] T2 patterns Lab
- [x] T3 drill Lab
- [x] T4 验收

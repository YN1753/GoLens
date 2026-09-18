---
feature: content-select-string
status: delivered
updated: 2026-09-17
branch: chore/content-select-string
commits: 6115d1f55306d3118b1ceb97997016a9a472fb4b..06b2fb339d9f5ab4addfafd650253bc88df8c9a0
---

# Content — Select/Timer + String Chapters

## Report

**What was built** — 第 08《Select 与定时器》、09《string 与 range》：清单注册、关卡+代码双轨、多路 select Lab、UTF-8 字节/rune 视图 Lab；首页卡片与阅读链更新。

**Verification** — check 清单含 select/string；select 双就绪伪随机日志；string 中文 6 字节/2 rune 与 range 字节下标；nav 10；console 0 error。

**Journey log** — 新章只需改 `chapters.js` + HTML；Lab 依赖 `motion.js` 的 `logLine`。range 日志应打印字节下标 i。


## [S1] Problem

目录已到 07，仍缺高频的 `select` 多路复用 / 定时器坑，以及 `string`/`range` 底层直觉。

## [S2] Design

| 章 | 文件 | id | Lab |
|----|------|-----|-----|
| 08 Select 与定时器 | `select.html` | `select` | Select Lab：多 channel 就绪时的选择与 default；timer 提示 |
| 09 string 与 range | `string.html` | `string` | String Lab：[]byte/rune 转换、range 遍历 UTF-8 直觉 |

### 清单

- 仅改 `chapters.js` 增加两项（idx 08/09），导航由 site.js 注入。
- 首页 chapter-grid 静态卡片增加两条；阅读链 iface-defer → select → string → home。
- check.sh：清单校验已自动覆盖新 href（需确认 need[] 含新 html/js）。

### Lab 契约

**Select Lab**
- 两个 channel 可视化（缓冲 cap=1），按钮：`向 A 发送`、`向 B 发送`、`执行 select`（含 default 开关）。
- 日志说明：多个就绪时伪随机选一个；都空走 default（若有）；都空且无 default 则阻塞。
- 代码轨：`select case <-a / <-b / default`。

**String Lab**
- 输入短句（固定预设按钮更简单：ASCII / 中文 / emoji）。
- 操作：`string→[]byte`、`string→[]rune`、`range` 逐步。
- 可视化：字节格 vs rune 格；range 按 rune 前进（byte index 日志）。

## [S3] Out of Scope

- reflect、编译器、完整 time.Timer 源码

## Tasks

- [x] T1: 注册清单 + 首页/底链 — acceptance: 侧栏出现 08/09；check 清单通过 (covers: S2)
- [x] T2: select 章 + Lab — acceptance: 双 channel 就绪与 default 行为日志正确 (covers: S2)
- [x] T3: string 章 + Lab — acceptance: 中文/rune 与 byte 数对比可见 (covers: S2)
- [x] T4: 验收 — acceptance: check + 新页冒烟 0 error (covers: S2; depends: T1,T2,T3)

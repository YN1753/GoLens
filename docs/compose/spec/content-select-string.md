---
feature: content-select-string
status: designed
updated: 2026-09-17
branch: chore/content-select-string
commits: 
---

# Content — Select/Timer + String Chapters

## Report

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

- [ ] T1: 注册清单 + 首页/底链 — acceptance: 侧栏出现 08/09；check 清单通过 (covers: S2)
- [ ] T2: select 章 + Lab — acceptance: 双 channel 就绪与 default 行为日志正确 (covers: S2)
- [ ] T3: string 章 + Lab — acceptance: 中文/rune 与 byte 数对比可见 (covers: S2)
- [ ] T4: 验收 — acceptance: check + 新页冒烟 0 error (covers: S2; depends: T1,T2,T3)

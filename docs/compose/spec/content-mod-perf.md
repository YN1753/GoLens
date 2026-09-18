---
feature: content-mod-perf
status: delivered
updated: 2026-09-17
branch: chore/content-mod-perf
commits: 
---

# Content — Modules + Performance Chapters

## Report

**What was built** — 第 14《模块与依赖》、15《性能排查直觉》：go.mod/require/tidy Lab 与 CPU/Heap 热点示意 Lab；清单 00–15。

**Verification** — check 全绿；tidy 补充依赖日志；perf CPU 热点条形输出；nav 16 cards 15；console 0 error。

**Journey log** — 热点数据为教学示意，文案强调「先测量」。新章继续 chapters.js 注册即可。


## [S1] Problem

目录到 13，工程向仍缺 go.mod/依赖管理与性能排查（pprof）直觉。

## [S2] Design

| 章 | 文件 | id | Lab |
|----|------|-----|-----|
| 14 模块与依赖 | `modules.html` | `modules` | Module Lab：go.mod 字段与 require/tidy 直觉 |
| 15 性能排查直觉 | `perf.html` | `perf` | Perf Lab：CPU/内存 profile 热点选择题式示意 |

### 接入

- chapters.js 14/15；首页卡片；testing → modules → perf → home。
- check.sh 扩展 need 与 page 列表。

### Lab 契约

**Module Lab**
- 展示 go.mod 片段（module/go/require）。
- 操作：`解释 module`、`解释 require`、`go mod tidy 模拟`（日志：添加/删除依赖描述）。

**Perf Lab**
- 场景：慢函数列表（CPU 热点 / 内存分配热点）。
- 操作：选「CPU profile / Heap profile」→ 点「看热点」→ 展示模拟火焰图式条形占比 + 建议。

## [S3] Out of Scope

- 真实 pprof 二进制、module proxy 细节

## Tasks

- [x] T1: 清单与 check — acceptance: manifest 14/15 (covers: S2)
- [x] T2: modules 章 + Lab — acceptance: tidy 模拟日志合理 (covers: S2)
- [x] T3: perf 章 + Lab — acceptance: CPU/heap 两种热点输出 (covers: S2)
- [x] T4: 验收 — acceptance: check + smoke (covers: S2; depends: T1,T2,T3)

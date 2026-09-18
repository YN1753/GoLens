---
feature: content-mem-iface
status: designed
updated: 2026-09-17
branch: chore/content-mem-iface
commits: 
---

# Content — Memory/Escapes + Interface/defer Chapters

## Report

## [S1] Problem

已有 GMP/Channel/GC/Slice-Map/sync-Context，仍缺「值去哪了（栈还是堆）」与「接口/延迟调用怎么工作」两块高频八股。

## [S2] Design

### 新增章节

| 章 | 文件 | page-key | Lab |
|----|------|----------|-----|
| 06 内存分配与逃逸 | `memory.html` | `memory` | 逃逸 Lab：对若干 Go 片段判断栈/堆，点击揭示原因 |
| 07 Interface 与 defer | `iface-defer.html` | `iface` | defer Lab：压栈/执行顺序 + recover 传播示意 |

### 模板

沿用：侧栏 7 项、故事关卡、代码观察窗、纸感、搜索/TOC 自动生效。

### Lab 契约

**Escape Lab**
- 卡片列表：经典场景（返回局部变量指针、闭包捕获、`interface{}` 装箱、`new`/`make`、slice 扩容等）。
- 操作：点「栈 / 堆」选择；显示「正确/错误」+ 一句话解释（逃逸或不逃逸原因）。
- 日志 tag：`MARK`/`PANIC`/`WAKE`。

**Defer Lab**
- 操作：`push defer i`（i=1..n）、`run`（LIFO 弹出动画/日志）、`panic`、`recover` 开关。
- 可视化：defer 栈（竖向卡片），执行时从顶弹出；panic 时未 recover 则向上冒泡说明。
- 代码轨：`defer f()`、`panic/recover`、`runtime.Gosched` 不必。

### 导航

- 全站侧栏：00–07；`sync-context` 底部 nav → memory → iface-defer → home。
- 首页 chapter-grid 增加 06/07 卡片；hero 文案已泛化则不动。

## [S3] Out of Scope

- 编译器 SSA、逃逸分析源码、reflect 深讲、cgo

## Tasks

- [ ] T1: 导航与首页 — acceptance: 侧栏 7 项，卡片可进新章 (covers: S2)
- [ ] T2: memory.html + 逃逸 Lab — acceptance: 选择后给出对错与解释 (covers: S2)
- [ ] T3: iface-defer.html + defer Lab — acceptance: push 后 run 按 LIFO 日志输出；panic/recover 文案正确 (covers: S2)
- [ ] T4: 验收 — acceptance: check + 新页冒烟 0 console error (covers: S2; depends: T1,T2,T3)

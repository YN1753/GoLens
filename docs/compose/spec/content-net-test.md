---
feature: content-net-test
status: designed
updated: 2026-09-17
branch: chore/content-net-test
commits: 
---

# Content — Netpoller/IO + Testing Chapters

## Report

## [S1] Problem

目录到 11，仍缺「网络 IO 为何高并发」与「如何写测试/benchmark」两块工程向八股。

## [S2] Design

| 章 | 文件 | id | Lab |
|----|------|-----|-----|
| 12 Netpoller 与 IO | `netpoller.html` | `netpoller` | Net Lab：连接就绪/阻塞与 M–P–G 关系示意 |
| 13 测试与基准 | `testing.html` | `testing` | Test Lab：表格驱动用例判定 + benchmark 概念演示 |

### 接入

- `chapters.js` idx 12/13；首页卡片；generics → netpoller → testing → home。
- check.sh need[] 与 page 循环扩展。

### Lab 契约

**Net Lab**
- 状态：若干 conn（waiting/ready），netpoll 队列，关联 G。
- 操作：`Read 阻塞`、`epoll 就绪回调`、`调度唤醒 G`。
- 日志：G 挂起 → 事件就绪 → G 入 runq。

**Test Lab**
- 表格驱动：3 条用例（通过/失败），点「跑测试」输出 T.Run 结果。
- benchmark：展示 `b.N` 循环概念与 ns/op 展示（模拟值）。

## [S3] Out of Scope

- 真实 epoll 源码、pprof 实战、CI

## Tasks

- [ ] T1: 清单/首页/check — acceptance: manifest 12/13 可达 (covers: S2)
- [ ] T2: netpoller 章 + Lab — acceptance: 阻塞→就绪→唤醒日志完整 (covers: S2)
- [ ] T3: testing 章 + Lab — acceptance: 用例 pass/fail 与 benchmark 模拟输出 (covers: S2)
- [ ] T4: 验收 — acceptance: check + smoke 0 error (covers: S2; depends: T1,T2,T3)

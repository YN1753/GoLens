---
feature: deepen-content
status: delivered
updated: 2026-09-17
branch: chore/deepen-content
commits: 
---

# Deepen Content + Memory Model Chapter

## Report

**What was built** — GMP/Channel/GC/Slice-Map/内存逃逸 正文加深（伪代码、状态表、屏障家族、扩容/escape 清单等）；新增第 14《内存模型》（happens-before Lab）。全站 22 学习章。

**Verification** — check 全绿；gmp 含 findrunnable 伪码；memmodel Lab 演示 go/channel 规则；首页 22 卡、侧栏 23；console 0 error。

**Journey log** — 深度扩展优先补「面试可展开」的伪代码与表，而非空话；内存模型单独成章更利于串并发正确性。

## Tasks
- [x] T1 加深既有章节
- [x] T2 memmodel 章与 Lab
- [x] T3 清单/首页/check

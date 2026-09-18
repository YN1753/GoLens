---
feature: content-slice-sync
status: designed
updated: 2026-09-17
branch: chore/content-slice-sync
commits: 
---

# Content — Slice/Map + sync/Context Chapters

## Report

## [S1] Problem

站点仅覆盖并发调度 / Channel / GC。面试高频的 Slice/Map 底层与 sync/Context 缺章，无法形成完整八股路径。

## [S2] Design

### 新增两章（沿用纸感手册 + 关卡剧本 + 代码双轨）

| 章 | 文件 | 讲解 | 交互 |
|----|------|------|------|
| Slice 与 Map | `slice-map.html` | slice 三元组、扩容、共享底层数组陷阱；map 桶/溢出/扩容直觉 | Slice Lab：append 扩容与底层数组共享可视化 |
| sync 与 Context | `sync-context.html` | Mutex/RWMutex、WaitGroup、Once、sync.Map 不必深挖；Context 树与取消传播 | Context Lab：父子取消传播树 |

### 信息架构

- 侧栏目录增加 `04`、`05`；首页章节卡片增加两条链接。
- 每章结构：一句话结论 → 概念 → 纯 SVG/DOM 图示 → Lab → 剧本关卡 + 代码观察窗 → FAQ → 速查表 → 上下章导航。
- 复用 `guide.js` StoryGuide、`site.js` 搜索/TOC/进度（自动生效）。
- 新 JS：`slice-lab.js`、`context-lab.js`；CSS 尽量用现有 token，必要时少量加在 `lab-motion.css`。

### Lab 交互契约

**Slice Lab**
- 状态：`array`（底层数组槽位，可含 empty）、`len`、`cap`、`sharedWith` 提示。
- 操作：`append`、`slice s=a[i:j]`、`write s[k]=x`、重置。
- 可视化：一排槽位格子；len 区间高亮，cap 区间虚线框；共享时两行别名指向同一槽带并标注「写入会互相影响」。
- 扩容日志：cap 变化（如 0→1→2→4→8）。

**Context Lab**
- 状态：节点树 root → child1/child2 → grandchild；每个节点 `open|canceled|done`。
- 操作：点节点 `cancel`；观察子树级联变 canceled；日志 `[CANCEL]`。
- 隐喻：公司请假流程——上级驳回，下级未批的申请一并作废。

### 导航

- 所有页面侧栏统一 5 项；`slice-map.html` page-key=`slice`，`sync-context.html` page-key=`sync`。

## [S3] Out of Scope

- reflect、race detector、sync.Pool 深讲、map 写源码、题库、构建工具

## Tasks

- [ ] T1: 站点导航与首页扩展 — acceptance: 侧栏/首页可进入两新章 (covers: S2)
- [ ] T2: Slice/Map 章正文 + Slice Lab — acceptance: append 扩容与切片共享写可演示且日志正确 (covers: S2)
- [ ] T3: sync/Context 章正文 + Context Lab — acceptance: cancel 父节点后子树状态级联更新 (covers: S2)
- [ ] T4: 验收 — acceptance: npm run check；五页冒烟无 console error (covers: S2; depends: T1,T2,T3)

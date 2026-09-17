---
feature: golens-mvp
status: in-progress
updated: 2026-09-17
branch: feature/golens-mvp
commits: 
---

# GoLens MVP — 交互式 Go 并发 / GC 八股知识站

## Report

## [S1] Problem

Go 面试八股（GMP 调度、Channel 底层、GC 三色标记）高度依赖「运行时过程想象」，纯文字难建立直觉。需要一个可分享的静态知识站：讲清概念，并内嵌可操作的可视化实验，方便系统复习与传播。托管目标为 GitHub Pages。

## [S2] Design

### 产品形态

- 交互式知识站（非题库、非长滚动叙事）。
- 文档站信息架构：左侧固定目录，右侧正文 + 内嵌交互。
- 多页静态原生栈：无构建、无框架、无 CDN 依赖；`index.html` 为入口，章节各自独立 HTML。
- 文案语言：中文。

### 首版范围（3 篇精品）

| 章节 | 文件 | 核心讲解 | 交互 demo |
|------|------|----------|-----------|
| 首页 | `index.html` | 定位、章节导航、使用说明 | 无（轻量入场动效） |
| GMP 调度 | `gmp.html` | G/P/M、本地/全局队列、work stealing、抢占 | 可步进的调度模拟器 |
| Channel | `channel.html` | hchan 结构、环形缓冲、阻塞 send/recv、close | 可操作的 channel 状态机 |
| GC | `gc.html` | 三色标记、写屏障、STW、根对象 | 三色标记逐步染色实验 |

### 视觉系统

- 风格锚点：深色终端 / Runtime 示波器感（非浅色 go.dev 克隆）。
- 背景：近黑深蓝绿 `#0B1214`；表面层 `#121A1D`；边线 `#1E2C31`。
- 墨色：正文 `#D7E2E5`；次级 `#8A9BA1`。
- 强调色（单 accent）：Go 青绿 `#00ADD8`；警示/阻塞 `#E4A11B`；错误/终止 `#E34B4B`。
- 状态语义色（可视化专用，不进入正文 UI）：可运行 `#3DDC97`；运行中 `#00ADD8`；阻塞/等待 `#E4A11B`；终止 `#6B7C82`；GC 灰 `#9AA5A8`；GC 黑 `#4A5558`；GC 白 `#F2F5F6`。
- 字体：UI/正文 `"PingFang SC", "Noto Sans SC", system-ui, sans-serif`；代码与标签 `"JetBrains Mono", "SF Mono", ui-monospace, monospace`。
- 字号：正文 15–16px / 1.75；标题层级 28 / 22 / 18；代码 13–14px。
- 布局：侧栏 260px 固定，正文最大宽 760px，demo 区可破到 920px。间距 8px 栅格。

### 站点骨架

```
/
  index.html          # 首页 / 章节总览
  gmp.html
  channel.html
  gc.html
  css/
    tokens.css        # 色板、字号、间距
    layout.css        # 侧栏、正文、响应式
    components.css    # 按钮、卡片、代码块、callout
  js/
    site.js           # 侧栏高亮、主题持久、移动抽屉
    gmp-lab.js
    channel-lab.js
    gc-lab.js
  assets/             # 如有本地图形资源
```

- 共享侧栏导航写在各 HTML 中（无构建注入）；`site.js` 负责当前页高亮与窄屏抽屉。
- 所有资源相对路径，可直接 `file://` 或任意静态托管打开；GitHub Pages 项目页 `/GoLens/` 用相对路径兼容。
- 不引入外部字体 CDN、图表库或 JS 框架。

### 部署（GitHub Actions → Pages）

- Remote：`git@github.com:YN1753/GoLens.git`；默认分支 `main`。
- 工作流：`.github/workflows/pages.yml`，在 `push` 到 `main` 以及 `workflow_dispatch` 时触发。
- 权限：`contents: read`，`pages: write`，`id-token: write`；`concurrency.group=pages`。
- 步骤：`actions/checkout` → `actions/configure-pages` → `actions/upload-pages-artifact`（`path: .`，站点文件在仓库根）→ `actions/deploy-pages`。
- 仓库侧需在 Settings → Pages 将 Source 设为 **GitHub Actions**。

### 交互契约

**GMP Lab（gmp-lab.js）**

- 状态：`Goroutines[]`（id、颜色、栈高示意、状态：ready/runnable/running/blocked/syscall/done）、`P[]`（本地 runnext + 本地队列上限示意 256）、全局队列、`M[]`（绑定的 P、当前 G）。
- 控制：单步 / 播放 / 重置；速度滑杆；场景选择（正常调度 / 队列过长推全局 / work stealing / G 阻塞导致 M 与 P 解绑）。
- 可视化：P 本地队列横向条、全局队列、M–P–G 连线；事件日志（右侧或下方 mono 滚动区）。
- 简化边界：不模拟 sysmon、不模拟抢占信号细节；以「面试直觉」为正确性标准，事件文案与 Go 1.21+ 调度叙事一致。

**Channel Lab（channel-lab.js）**

- 状态：`buf`（数组 + head/count）、`sendq`/`recvq`（G 列表）、`closed`、容量。
- 控制：发送 / 接收 / 关闭；容量选择（0 同步 / 1 / 4）；单步说明当前底层路径。
- 可视化：环形缓冲格子、等待队列、阻塞/唤醒连线；旁注「直接拷贝 / 入队 / 出队并唤醒」。
- 简化边界：不模拟 `select` 全量、不模拟加锁细节；突出「有无缓冲 + 有无等待者」四象限。

**GC Lab（gc-lab.js）**

- 状态：对象图（节点 + 指针）、三色（白/灰/黑）、根集合、写屏障开关、用户写（mutator）步骤。
- 控制：标记根 → 反复处理灰对象；可选「用户修改指针」观察写屏障是否把目标标灰；对比「无屏障可能漏标」说明。
- 可视化：力导向或固定布局图 + 颜色动画；侧栏显示 STW 段（标记开始/结束）。
- 简化边界：讲清 tri-color + Dijkstra 写屏障直觉即可，不展开混合写屏障指令细节。

### 内容结构（每章）

1. 一句话结论（面试可背）
2. 为什么需要它
3. 结构 / 流程图解（静态 SVG 或 DOM）
4. 交互 Lab
5. 常见追问（3–5 条 FAQ）
6. 速查表（可复制的关键句）

### 非功能

- 无网络请求；单页 JS 均 < 50KB 量级（未压缩也可）。
- 窄屏：侧栏收为抽屉；demo 可横向滚动，不破版。
- 无障碍基础：按钮可聚焦，状态变化有 `aria-live` 日志区。
- 测试：以本地静态服务或 `file://` 打开三条路径完成人工验收；无自动化测试框架。

## [S3] Out of Scope

- 题库 / 测验 / 进度打卡
- 浅色主题或双主题切换（深色唯一）
- Select 专用 Lab、race detector、内存分配器 tcmalloc 细节
- 组件框架、打包器、i18n
- 真实 Go runtime 源码级仿真（只做面试向简化模型）
- 除 Pages 部署 workflow 外的测试 CI / lint CI

## Tasks

- [ ] T1: 站点骨架与设计系统 — acceptance: 四页可互相跳转，侧栏高亮正确，tokens/layout/components 落地，首页可读 (covers: S2)
- [ ] T2: GMP 章节正文 + GMP Lab — acceptance: 用户可单步/播放至少 4 个场景，日志与队列状态一致 (covers: S2; depends: T1)
- [ ] T3: Channel 章节正文 + Channel Lab — acceptance: 同步/缓冲 channel 发送接收关闭四象限均可演示，阻塞与唤醒可见 (covers: S2; depends: T1)
- [ ] T4: GC 章节正文 + GC Lab — acceptance: 可完成一次标记并观察写屏障对漏标的影响 (covers: S2; depends: T1)
- [ ] T5: GitHub Actions Pages 工作流 — acceptance: `pages.yml` 存在且步骤/权限符合 S2；相对资源路径不依赖域名前缀 (covers: S2)
- [ ] T6: 本地验收与相对路径检查 — acceptance: 无控制台错误，三 Lab 核心路径可玩，窄屏抽屉可用 (covers: S2; depends: T2,T3,T4,T5)

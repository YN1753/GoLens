---
feature: paper-style
status: delivered
updated: 2026-09-17
branch: chore/paper-style
commits: 6d44b3304665f64a6eb6b01dad102e8adfd5bf12..ee79f7aaf2a9cec1552c1ea174bcbeaaac970a44
---

# Paper Handbook Restyle

## Report

**What was built** — 全站从深色终端风切换为浅色纸感技术手册：暖米白纸面、深墨绿强调、衬线标题。侧栏/顶栏/卡片/代码块与三个 Lab、关卡剧本、环形缓冲与 GC 拓扑同步换肤；清理了 JS/CSS 里残留的霓虹深色硬编码。

**Verification** — `npm run check` PASS；body 计算色 `rgb(247,244,236)`；channel/gc/gmp 冒烟 console 0 error。评审指出的 neon 残留已替换为 paper token 透明度。

**Journey log** — 主改 tokens + 用 token 覆盖组件；SVG 颜色在 JS 内联，必须跟 CSS 一起换。避免 `color-mix` 在目标浏览器不支持时再兜底纯色。


## [S1] Problem

GoLens 目前是深色终端 / 示波器风。学习站长文阅读负担偏重，与「初学者手册」心智不符。需要换成浅色纸感手册气质，并做版式微调，不重做交互结构。

## [S2] Design

### 视觉方向

- 风格锚点：技术小册 / 纸质讲义（非 go.dev 克隆、非插画杂志）。
- 纸面：暖米白 `#F7F4EC`；卡片 `#FFFFFF` / `#FFFDF8`；次级面 `#F0EBE0`。
- 墨色：正文 `#2C2A26`；强标题 `#1A1814`；次级 `#6B6560`。
- 单一强调：深墨绿 `#1F6B5A`；语义：warn `#A67C00`，danger `#B54A3C`，ok `#2F7D4F`。
- 状态色（Lab）：run `#2F7D4F`，cpu `#1F6B5A`，block `#A67C00`，done `#9A948C`。
- GC：white `#FFFDF8`，gray `#A8A29A`，black `#3D3A34`。
- 字体：标题 `"Songti SC", "Noto Serif SC", Georgia, serif`；正文 PingFang/system-ui；等宽不变。
- 阴影：极轻纸片影；圆角略增至 10/14；边线更浅。

### 版式微调

- 侧栏 248px，底色近纸面、右侧 1px 墨线，去掉重玻璃模糊。
- 正文 max 720px；Lab 宽 960px；章节间距略增。
- 顶栏改为纸面横条，弱化毛玻璃。
- 代码块：暖灰底 `#F4F0E6`，边线 `#E2DCD0`，不再近黑。

### 覆盖文件

- `site/assets/css/tokens.css`（主色板与字体角色）
- `layout.css` / `components.css` / `lab-motion.css` / `guide.css`（用 token，去掉硬编码近黑）
- `gc-lab.js`（三色与 legend 硬编码色 → 新纸面值）
- 各 HTML 仅在出现 inline 色值时替换（legend 等）

### 非目标

- 不改 Lab 交互逻辑、关卡剧本结构、路由与文件布局。
- 不做深浅双主题。
- 不引入 Web 字体 CDN。

## [S3] Out of Scope

- 交互算法重写、新章节、打包工具、i18n

## Tasks

- [x] T1: tokens + 全局纸面壳 — acceptance: 首页/章节在浅色下可读，对比度足够，侧栏/顶栏/卡片为纸感 (covers: S2)
- [x] T2: Lab 与关卡组件换肤 — acceptance: GMP/Channel/GC 与 code-track/story-card 无近黑底，状态色仍可区分 (covers: S2; depends: T1)
- [x] T3: 清理 JS 硬编码色 — acceptance: gc-lab 三色与 inline legend 使用新纸面值 (covers: S2; depends: T2)
- [x] T4: 本地验收 — acceptance: npm run check 通过，三页冒烟无 console error (covers: S2; depends: T1,T2,T3)

# GoLens

可视化交互的 Go 运行时八股知识站。纯静态、无打包器，适合 GitHub Pages。

## 学习顺序（chapters.js）

语言 → 并发/IO → 内存 → 工程 → 综合：30 个学习章（string…json → GMP…atomic/memmodel → escape/GC → test…embed/sql/pprof/清单/shutdown/观测 → drill/cheat）

侧栏、学习路径、上下章导航均由 `site/assets/js/chapters.js` 驱动。

## 章节数量
站点由 `chapters.js` 驱动，当前 **30** 个学习章（另含首页）。

## 结构

```
site/                 # 部署产物根（Pages 直接上传此目录）
  index.html          # 首页
  gmp.html            # GMP 调度
  channel.html        # Channel 底层
  gc.html             # GC 三色标记
  assets/
    css/              # 设计 token / 布局 / 组件
    js/               # 站点脚本 + 各章 Lab
scripts/check.sh      # 结构与资源路径校验
docs/compose/spec/    # feature 文档
.github/workflows/    # Pages 部署
```

## 本地预览

```bash
npm run dev
# http://127.0.0.1:5173
```

或：

```bash
python3 -m http.server 5173 --directory site
```

## 校验

```bash
npm run check
```

## 部署

推送到 `main` 后，GitHub Actions 将 `site/` 发布到 Pages。  
仓库 Settings → Pages → Source 选择 **GitHub Actions**。

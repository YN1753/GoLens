(function () {
  const M = window.GoLens || window;
  const stage = document.getElementById("mod-stage");
  const logEl = document.getElementById("mod-log");
  const moduleBtn = document.getElementById("mod-module");
  const reqBtn = document.getElementById("mod-require");
  const tidyBtn = document.getElementById("mod-tidy");
  const resetBtn = document.getElementById("mod-reset");
  const storyRoot = document.getElementById("mod-story");
  if (!stage) return;

  let deps = ["github.com/pkg/errors@v0.9.1", "golang.org/x/sync@v0.6.0"];
  let removed = [];

  function setCode(key) {
    const panel = storyRoot && storyRoot.querySelector(".code-track");
    if (!panel) return;
    panel.querySelectorAll(".code-line").forEach(function (line) {
      line.classList.toggle("is-active", line.getAttribute("data-code-key") === key);
    });
  }

  function log(tag, msg) {
    if (M.logLine) M.logLine(logEl, tag, msg);
  }

  function reset() {
    deps = ["github.com/pkg/errors@v0.9.1", "golang.org/x/sync@v0.6.0"];
    removed = [];
    if (logEl) logEl.innerHTML = "";
    setCode("gomod");
    render();
    log("MARK", "示例模块 golens.example/hello");
  }

  function render() {
    stage.innerHTML =
      '<div class="rt-box"><div class="rt-title">go.mod 示意</div><pre style="margin:0;font-family:var(--font-mono);font-size:12px;line-height:1.6">' +
      "module golens.example/hello\n\ngo 1.22\n\nrequire (\n" +
      deps.map(function (d) { return "    " + d; }).join("\n") +
      "\n)\n</pre></div>" +
      '<div class="rt-box" style="margin-top:10px"><div class="rt-title">go.sum / 模块缓存</div>' +
      '<div style="font-size:13px;color:var(--muted)">go.sum 锁校验和；GOPATH/pkg/mod 缓存下载模块。</div></div>';
  }

  if (moduleBtn) moduleBtn.addEventListener("click", function () {
    setCode("module");
    log("BIND", "module 定义导入路径前缀，决定包如何被引用");
    render();
  });
  if (reqBtn) reqBtn.addEventListener("click", function () {
    setCode("require");
    log("BIND", "require 列出直接/间接依赖版本（间接常 // indirect）");
    render();
  });
  if (tidyBtn) tidyBtn.addEventListener("click", function () {
    setCode("tidy");
    if (deps.indexOf("example.com/unused@v1.0.0") >= 0) {
      deps = deps.filter(function (d) { return d.indexOf("unused") < 0; });
      removed = ["example.com/unused@v1.0.0"];
      log("BLOCK", "go mod tidy：移除未使用依赖 example.com/unused");
    } else if (deps.length < 3) {
      deps.push("example.com/logging@v1.2.0");
      removed = [];
      log("SEND", "go mod tidy：因源码 import 补充 example.com/logging@v1.2.0");
    } else {
      deps.push("example.com/unused@v1.0.0");
      log("MARK", "演示：人为加入 unused，再点 tidy 观察清理");
    }
    render();
  });
  if (resetBtn) resetBtn.addEventListener("click", reset);

  if (storyRoot && M.StoryGuide) {
    new M.StoryGuide({
      root: storyRoot,
      codePanel: storyRoot.querySelector(".code-track"),
      levels: [
        {
          title: "module 是身份",
          metaphor: "门牌号：别人 import 时用的地址前缀",
          body: "module 路径与仓库路径通常一致。go 1.x 指定语言版本。",
          codeKeys: ["gomod", "module"],
          run: function () { reset(); setCode("module"); }
        },
        {
          title: "require 与版本",
          metaphor: "进货清单 + 版本号",
          body: "直接依赖手写或由 go get 写入；间接依赖由解析产生。语义化版本 v1.2.3。",
          codeKeys: ["require"],
          run: function () { setCode("require"); }
        },
        {
          title: "go mod tidy",
          metaphor: "盘点库存：该进的进，该清的清",
          body: "按源码 import 对齐 go.mod/go.sum。CI 常检查 tidy 后无 diff。",
          codeKeys: ["tidy"],
          run: function () {
            deps.push("example.com/unused@v1.0.0");
            tidyBtn && tidyBtn.click();
          }
        },
        {
          title: "MVS 版本选择",
          metaphor: "多个供货商要求版本时取满足各方的较高版",
          body: "Minimal Version Selection：选能覆盖所有依赖要求的最小版本集合（面试一句即可）。",
          codeKeys: ["require"],
          run: function () { setCode("require"); }
        }
      ]
    });
  }

  reset();
})();

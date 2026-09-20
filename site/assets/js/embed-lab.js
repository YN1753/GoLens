(function () {
  const M = window.GoLens || window;
  const stage = document.getElementById("em-stage");
  const logEl = document.getElementById("em-log");
  const itemSel = document.getElementById("em-item");
  const runBtn = document.getElementById("em-run");
  const resetBtn = document.getElementById("em-reset");
  const storyRoot = document.getElementById("em-story");
  if (!stage) return;

  const ITEMS = {
    file: {
      title: "嵌入单文件",
      lines: ["//go:embed config.json", "var cfg []byte", "编译期写入二进制"],
      tip: "部署只带一个可执行文件"
    },
    fs: {
      title: "嵌入目录到 fs.FS",
      lines: ["//go:embed templates/*", "var tplFS embed.FS", "html/template.ParseFS(tplFS, ...)"],
      tip: "静态资源进二进制，适合小工具/单文件服务"
    },
    pattern: {
      title: "路径与限制",
      lines: ["模式相对当前包目录", "不能跳出模块根（../）", "//go:embed 变量类型有限制"],
      tip: "构建产物包含内容；注意体积"
    },
    why: {
      title: "何时用",
      lines: ["CLI 默认配置/迁移 SQL", "内置静态页", "避免部署时漏文件"],
      tip: "大资源仍用对象存储更合适"
    }
  };

  function setCode(k) {
    const p = storyRoot && storyRoot.querySelector(".code-track");
    if (!p) return;
    p.querySelectorAll(".code-line").forEach(function (l) {
      l.classList.toggle("is-active", l.getAttribute("data-code-key") === k);
    });
  }
  function log(tag, msg) { if (M.logLine) M.logLine(logEl, tag, msg); }

  function reset() { if (logEl) logEl.innerHTML = ""; setCode(itemSel.value); render(); }
  function run() {
    const it = ITEMS[itemSel.value] || ITEMS.file;
    setCode(itemSel.value);
    log("MARK", it.title + " — " + it.tip);
    it.lines.forEach(function (l, i) { log(i === it.lines.length - 1 ? "WAKE" : "SEND", l); });
    render();
  }
  function render() {
    const it = ITEMS[itemSel.value] || ITEMS.file;
    let rows = "";
    it.lines.forEach(function (l) {
      rows += '<div class="g-block" data-state="runnable" style="margin:4px 0;width:100%;cursor:default"><span>' + l + "</span></div>";
    });
    stage.innerHTML = '<div class="rt-box"><div class="rt-title">' + it.title + "</div>" + rows +
      '<div style="margin-top:8px;font-size:13px;color:var(--muted)">' + it.tip + "</div></div>";
  }

  itemSel.addEventListener("change", function () { setCode(itemSel.value); render(); });
  runBtn.addEventListener("click", run);
  resetBtn.addEventListener("click", reset);

  if (storyRoot && M.StoryGuide) {
    new M.StoryGuide({
      root: storyRoot,
      codePanel: storyRoot.querySelector(".code-track"),
      levels: [
        { title: "go:embed", metaphor: "出厂预装说明书", body: "编译期把文件打进二进制。", codeKeys: ["file"], run: function () { itemSel.value = "file"; reset(); run(); } },
        { title: "embed.FS", metaphor: "把一小座图书馆塞进行李", body: "目录资源用 fs.FS 访问。", codeKeys: ["fs"], run: function () { itemSel.value = "fs"; reset(); run(); } },
        { title: "边界", metaphor: "不能打包仓库外的箱子", body: "路径相对包目录；注意体积与类型。", codeKeys: ["pattern", "why"], run: function () { itemSel.value = "pattern"; reset(); run(); } }
      ]
    });
  }
  reset();
  log("MARK", "go:embed：编译期打包静态资源");
})();

(function () {
  const M = window.GoLens || window;
  const stage = document.getElementById("tc-stage");
  const logEl = document.getElementById("tc-log");
  const cmdSel = document.getElementById("tc-cmd");
  const runBtn = document.getElementById("tc-run");
  const resetBtn = document.getElementById("tc-reset");
  const storyRoot = document.getElementById("tc-story");
  if (!stage) return;

  const CMDS = {
    build: { title: "go build", lines: ["编译当前包/指定包", "-o 指定输出", "会写 build cache"], tip: "产出可执行文件" },
    run: { title: "go run", lines: ["临时编译并执行", "适合快速试 main", "产物进 cache 不落业务目录"], tip: "开发调试首选" },
    test: { title: "go test", lines: ["跑 *_test.go", "-run 过滤 -v 详细", "-race / -bench 可组合"], tip: "CI 基础命令" },
    vet: { title: "go vet", lines: ["静态检查常见错误", "与 gofmt 不同：fmt 管格式", "建议 CI 必过"], tip: "便宜的 bug 拦截" },
    work: { title: "go work（多模块）", lines: ["go.work 组合多个 module", "本地联调多仓库", "提交与否看团队约定"], tip: "微服务本地开发常用" }
  };

  function setCode(k) {
    const p = storyRoot && storyRoot.querySelector(".code-track");
    if (!p) return;
    p.querySelectorAll(".code-line").forEach(function (l) {
      l.classList.toggle("is-active", l.getAttribute("data-code-key") === k);
    });
  }
  function log(tag, msg) { if (M.logLine) M.logLine(logEl, tag, msg); }

  function reset() { if (logEl) logEl.innerHTML = ""; setCode(cmdSel.value); render(); }
  function run() {
    const c = CMDS[cmdSel.value] || CMDS.build;
    setCode(cmdSel.value);
    log("MARK", c.title + " — " + c.tip);
    c.lines.forEach(function (l, i) { log(i === c.lines.length - 1 ? "WAKE" : "SEND", l); });
    render();
  }
  function render() {
    const c = CMDS[cmdSel.value] || CMDS.build;
    let rows = "";
    c.lines.forEach(function (l) {
      rows += '<div class="g-block" data-state="runnable" style="margin:4px 0;width:100%;cursor:default"><span>' + l + "</span></div>";
    });
    stage.innerHTML = '<div class="rt-box"><div class="rt-title">' + c.title + "</div>" + rows +
      '<div style="margin-top:8px;font-size:13px;color:var(--muted)">' + c.tip + "</div></div>";
  }
  cmdSel.addEventListener("change", function () { setCode(cmdSel.value); render(); });
  runBtn.addEventListener("click", run);
  resetBtn.addEventListener("click", reset);

  if (storyRoot && M.StoryGuide) {
    new M.StoryGuide({
      root: storyRoot,
      codePanel: storyRoot.querySelector(".code-track"),
      levels: [
        { title: "build / run", metaphor: "出厂装配 vs 现场试跑", body: "build 落盘；run 快速验证。", codeKeys: ["build", "run"], run: function () { cmdSel.value = "build"; reset(); run(); } },
        { title: "test / vet", metaphor: "质检与安检", body: "test 跑用例；vet 抓可疑写法。", codeKeys: ["test", "vet"], run: function () { cmdSel.value = "test"; reset(); run(); } },
        { title: "go work", metaphor: "多店铺联合试营业", body: "本地 replace 多 module 时很方便。", codeKeys: ["work"], run: function () { cmdSel.value = "work"; reset(); run(); } }
      ]
    });
  }
  reset();
  log("MARK", "toolchain：build/run/test/vet/work");
})();

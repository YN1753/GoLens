(function () {
  const M = window.GoLens || window;
  const stage = document.getElementById("chk-stage");
  const logEl = document.getElementById("chk-log");
  const phaseSel = document.getElementById("chk-phase");
  const resetBtn = document.getElementById("chk-reset");
  const storyRoot = document.getElementById("chk-story");
  if (!stage) return;

  const PHASES = {
    code: {
      title: "代码质量",
      items: [
        { t: "gofmt / go vet 通过", d: "格式与常见错误" },
        { t: "error 使用 %w 包装", d: "保留错误链" },
        { t: "并发路径有 ctx / 关闭", d: "防 goroutine 泄漏" },
        { t: "锁临界区尽量短", d: "拷贝锁是坑" }
      ]
    },
    test: {
      title: "测试与基准",
      items: [
        { t: "go test ./... 全绿", d: "含子测试" },
        { t: "关键路径有 table-driven", d: "t.Run 可过滤" },
        { t: "热点包有 benchmark", d: "关注 ns/op allocs" },
        { t: "race 抽测", d: "go test -race" }
      ]
    },
    ship: {
      title: "发布前",
      items: [
        { t: "go.mod tidy 无 diff", d: "CI 可校验" },
        { t: "README 写清运行方式", d: "go version / 端口" },
        { t: "密钥不进仓库", d: "用环境变量" },
        { t: "Pages/镜像构建可复现", d: "锁版本" }
      ]
    },
    review: {
      title: "Code Review",
      items: [
        { t: "API 边界校验输入", d: "不信任外部数据" },
        { t: "日志级别与关键路径", d: "可排障" },
        { t: "依赖变更看 changelog", d: "破坏性变更" },
        { t: "复杂并发有注释说明所有权", d: "谁 close channel" }
      ]
    }
  };

  const checked = {};

  function setCode(key) {
    const panel = storyRoot && storyRoot.querySelector(".code-track");
    if (!panel) return;
    panel.querySelectorAll(".code-line").forEach(function (line) {
      line.classList.toggle("is-active", line.getAttribute("data-code-key") === key);
    });
  }

  function keyOf(phase, t) {
    return phase + "::" + t;
  }

  function render() {
    const p = PHASES[phaseSel.value] || PHASES.code;
    let rows = "";
    p.items.forEach(function (it) {
      const k = keyOf(phaseSel.value, it.t);
      const on = !!checked[k];
      rows +=
        '<button type="button" class="g-block" data-state="' + (on ? "running" : "done") +
        '" data-chk="' + k.replace(/"/g, "&quot;") +
        '" style="margin:4px 0;width:100%;justify-content:space-between;text-align:left">' +
        "<span>" + (on ? "[x] " : "[ ] ") + it.t + "</span><span style=\"opacity:.7\">" + it.d + "</span></button>";
    });
    const done = Object.keys(checked).filter(function (k) {
      return checked[k] && k.indexOf(phaseSel.value + "::") === 0;
    }).length;
    stage.innerHTML =
      '<div class="rt-box"><div class="rt-title">' + p.title + " · " + done + "/" + p.items.length + "</div>" + rows + "</div>";
    stage.querySelectorAll("[data-chk]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const k = btn.getAttribute("data-chk");
        checked[k] = !checked[k];
        if (M.logLine) {
          M.logLine(logEl, checked[k] ? "WAKE" : "BLOCK", (checked[k] ? "勾选 " : "取消 ") + k.split("::")[1]);
        }
        setCode(phaseSel.value);
        render();
      });
    });
  }

  phaseSel.addEventListener("change", function () {
    setCode(phaseSel.value);
    if (M.logLine) M.logLine(logEl, "MARK", "清单：" + PHASES[phaseSel.value].title);
    render();
  });
  resetBtn.addEventListener("click", function () {
    Object.keys(checked).forEach(function (k) {
      delete checked[k];
    });
    if (logEl) logEl.innerHTML = "";
    setCode(phaseSel.value);
    render();
    if (M.logLine) M.logLine(logEl, "MARK", "清单已重置");
  });

  if (storyRoot && M.StoryGuide) {
    new M.StoryGuide({
      root: storyRoot,
      codePanel: storyRoot.querySelector(".code-track"),
      levels: [
        {
          title: "为什么要有清单",
          metaphor: "飞机起飞前检查单",
          body: "面试与工作里，「工程习惯」和「会写语法」同样重要。",
          codeKeys: ["code"],
          run: function () { phaseSel.value = "code"; setCode("code"); render(); }
        },
        {
          title: "代码质量",
          metaphor: "地基与承重墙",
          body: "vet、错误链、并发收口、锁使用。",
          codeKeys: ["code"],
          run: function () { phaseSel.value = "code"; render(); if (M.logLine) M.logLine(logEl, "MARK", "代码质量清单"); }
        },
        {
          title: "测试与发布",
          metaphor: "出厂检验与说明书",
          body: "test/race/bench、tidy、密钥与文档。",
          codeKeys: ["test", "ship"],
          run: function () { phaseSel.value = "ship"; setCode("ship"); render(); }
        },
        {
          title: "Review",
          metaphor: "交叉检查，不靠单人记忆",
          body: "输入校验、日志、依赖变更、并发所有权。",
          codeKeys: ["review"],
          run: function () { phaseSel.value = "review"; setCode("review"); render(); }
        }
      ]
    });
  }

  setCode(phaseSel.value);
  render();
  if (M.logLine) M.logLine(logEl, "MARK", "工程清单：点选条目");
})();

(function () {
  const M = window.GoLens || window;
  const stage = document.getElementById("rf-stage");
  const logEl = document.getElementById("rf-log");
  const opSel = document.getElementById("rf-op");
  const runBtn = document.getElementById("rf-run");
  const resetBtn = document.getElementById("rf-reset");
  const storyRoot = document.getElementById("rf-story");
  if (!stage) return;

  const OPS = {
    typeof: {
      title: "TypeOf / Kind",
      lines: [
        "v := 42",
        "reflect.TypeOf(v) → int",
        "Kind() → Int（不是自定义类型名）"
      ],
      tip: "Type 是具体类型；Kind 是底层分类"
    },
    value: {
      title: "ValueOf 读值",
      lines: [
        "rv := reflect.ValueOf(v)",
        "rv.Int() / rv.String() / rv.Interface()",
        "不可寻址时不能 Set"
      ],
      tip: "Interface() 可把 Value 转回 any"
    },
    set: {
      title: "修改值与指针",
      lines: [
        "传入指针 &x",
        "rv.Elem() 得到可寻址 Value",
        "rv.SetInt(100) 才能生效"
      ],
      tip: "直接 ValueOf(x) 通常不能改原变量"
    },
    struct: {
      title: "结构体字段",
      lines: [
        "NumField / Field(i) / FieldByName",
        "Tag.Get(\"json\") 读结构体标签",
        "只反射导出字段"
      ],
      tip: "序列化库大量依赖 tag 与 Kind"
    }
  };

  let buf = [];

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
    buf = [];
    if (logEl) logEl.innerHTML = "";
    setCode(opSel.value);
    render();
  }

  function run() {
    const op = OPS[opSel.value] || OPS.typeof;
    buf = op.lines.slice();
    setCode(opSel.value);
    log("MARK", op.title + " — " + op.tip);
    op.lines.forEach(function (l, i) {
      log(i === op.lines.length - 1 ? "WAKE" : "SEND", l);
    });
    render();
  }

  function render() {
    const op = OPS[opSel.value] || OPS.typeof;
    let rows = "";
    const list = buf.length ? buf : ["点「执行反射步骤」查看输出"];
    list.forEach(function (l, i) {
      rows +=
        '<div class="g-block" data-state="' + (buf.length ? "runnable" : "done") +
        '" style="margin:4px 0;width:100%;cursor:default"><span>' + l + "</span></div>";
    });
    stage.innerHTML =
      '<div class="rt-box"><div class="rt-title">' + op.title + "</div>" + rows +
      '<div style="margin-top:8px;font-size:13px;color:var(--muted)">' + op.tip + "</div></div>";
  }

  opSel.addEventListener("change", function () {
    buf = [];
    setCode(opSel.value);
    render();
    if (M.logLine) M.logLine(logEl, "MARK", "切换：" + OPS[opSel.value].title);
  });
  runBtn.addEventListener("click", run);
  resetBtn.addEventListener("click", reset);

  if (storyRoot && M.StoryGuide) {
    new M.StoryGuide({
      root: storyRoot,
      codePanel: storyRoot.querySelector(".code-track"),
      levels: [
        {
          title: "reflect 是什么",
          metaphor: "X 光：运行时看类型与值",
          body: "用于通用序列化、模板绑定等。有性能与可读性代价，热路径慎用。",
          codeKeys: ["typeof"],
          run: function () { opSel.value = "typeof"; reset(); }
        },
        {
          title: "Type 与 Kind",
          metaphor: "型号 vs 大类",
          body: "自定义 type MyInt int 的 Type 是 MyInt，Kind 仍是 Int。",
          codeKeys: ["typeof"],
          run: function () { opSel.value = "typeof"; run(); }
        },
        {
          title: "改值要指针",
          metaphor: "隔着玻璃改不了，要开门（Elem）",
          body: "ValueOf(拷贝) 不可寻址；ValueOf(&x).Elem() 才能 Set。",
          codeKeys: ["set"],
          run: function () { opSel.value = "set"; run(); }
        },
        {
          title: "结构体与 Tag",
          metaphor: "货物外箱贴标签，扫描枪按标签分拣",
          body: "json/xml 库靠 Tag；未导出字段反射读不到。",
          codeKeys: ["struct"],
          run: function () { opSel.value = "struct"; run(); }
        }
      ]
    });
  }

  reset();
  if (M.logLine) M.logLine(logEl, "MARK", "reflect：运行时类型与值");
})();

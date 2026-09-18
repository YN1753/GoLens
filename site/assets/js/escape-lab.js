(function () {
  const M = window.GoLens || window;
  const stage = document.getElementById("escape-stage");
  const logEl = document.getElementById("escape-log");
  const codePanel = document.getElementById("escape-code");
  const storyRoot = document.getElementById("escape-story");
  if (!stage) return;

  const items = [
    {
      id: "ret-ptr",
      title: "返回局部变量的指针",
      code: "func f() *int { x := 1; return &x }",
      answer: "heap",
      why: "x 必须在 f 返回后仍存活 → 逃逸到堆（或由编译器特殊处理栈提升，面试答「会逃逸」即可）"
    },
    {
      id: "closure",
      title: "闭包捕获局部变量",
      code: "func f() func() { n := 0; return func() { n++ } }",
      answer: "heap",
      why: "闭包在 f 返回后仍引用 n → n 通常逃逸"
    },
    {
      id: "iface",
      title: "装入 interface{}",
      code: "var i interface{} = x",
      answer: "heap",
      why: "接口装箱常把值复制到堆上（类型/数据指针），具体是否逃逸看场景，八股常答可能逃逸"
    },
    {
      id: "local-sum",
      title: "函数内纯局部累加",
      code: "func f(n int) int { s := 0; for i:=0;i<n;i++ { s+=i }; return s }",
      answer: "stack",
      why: "s 不被外部引用、无闭包/接口/发送到他处 → 可留在栈上"
    },
    {
      id: "make-slice",
      title: "make 后仅本函数使用",
      code: "s := make([]int, 8); return s[0] // 不返回 s",
      answer: "stack",
      why: "底层数组若足够小且不逃逸，可分配在栈上；扩容或把 s 传出则可能到堆"
    },
    {
      id: "go-func",
      title: "go 启动时捕获变量",
      code: "x := 1; go func(){ println(x) }()",
      answer: "heap",
      why: "新 goroutine 生命周期可能超过当前栈帧，被闭包捕获的 x 易逃逸"
    }
  ];

  let answered = {};

  function setCode(key) {
    const panel = codePanel || (storyRoot && storyRoot.querySelector(".code-track"));
    if (!panel) return;
    panel.querySelectorAll(".code-line").forEach(function (line) {
      line.classList.toggle("is-active", line.getAttribute("data-code-key") === key);
    });
  }

  function log(tag, msg) {
    if (M.logLine) M.logLine(logEl, tag, msg);
  }

  function render() {
    let html = '<div style="display:grid;gap:12px">';
    items.forEach(function (it) {
      const st = answered[it.id];
      html +=
        '<div class="rt-box" data-esc="' + it.id + '">' +
        '<div class="rt-title">' + it.title + "</div>" +
        "<pre style=\"margin:0 0 8px;padding:8px;border-radius:8px;background:var(--code-bg);font-size:12px;border:1px solid var(--line)\"><code>" +
        it.code.replace(/</g, "&lt;") +
        "</code></pre>" +
        '<div class="btn-row">' +
        '<button type="button" class="btn" data-pick="stack" data-id="' + it.id + '">栈</button>' +
        '<button type="button" class="btn" data-pick="heap" data-id="' + it.id + '">堆</button>' +
        (st ? '<span class="chip ' + (st.ok ? "chip-ok" : "chip-warn") + '">' + (st.ok ? "正确" : "再想想") + " · " + st.pick + "</span>" : "") +
        "</div>" +
        (st ? '<div style="margin-top:8px;font-size:13px;color:var(--muted)">' + it.why + "</div>" : "") +
        "</div>";
    });
    html += "</div>";
    stage.innerHTML = html;
    stage.querySelectorAll("[data-pick]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const id = btn.getAttribute("data-id");
        const pick = btn.getAttribute("data-pick");
        const it = items.filter(function (x) { return x.id === id; })[0];
        if (!it) return;
        const ok = pick === it.answer;
        answered[id] = { ok: ok, pick: pick };
        setCode(it.id === "iface" ? "iface" : it.id === "go-func" ? "go" : "escape");
        log(ok ? "WAKE" : "PANIC", (ok ? "答对：" : "应为 " + it.answer + "：") + it.title);
        render();
      });
    });
  }

  if (storyRoot && M.StoryGuide) {
    new M.StoryGuide({
      root: storyRoot,
      codePanel: storyRoot.querySelector(".code-track"),
      levels: [
        {
          title: "栈快、堆慢（相对）",
          metaphor: "栈=工位抽屉；堆=仓库货架",
          body: "栈分配随函数返回自动回收；堆需要垃圾回收。逃逸分析就是编译器判断「这个值能不能待在栈上」。",
          codeKeys: ["escape"],
          run: function () {
            setCode("escape");
            log("MARK", "逃逸 = 值不得不离开当前栈帧");
          }
        },
        {
          title: "指针被带回去了",
          metaphor: "把抽屉里的便签交给仓库管理员长期保管",
          body: "返回局部变量地址时，调用方仍要使用它 → 不能随栈帧销毁 → 通常到堆。",
          codeKeys: ["escape"],
          run: function () {
            setCode("escape");
          }
        },
        {
          title: "闭包与 goroutine",
          metaphor: "把便签拍照给夜班同事，抽屉下班也得留底",
          body: "闭包、goroutine 延长变量生命期，捕获的变量常逃逸。用 `-gcflags=-m` 可看编译器结论（面试提一嘴即可）。",
          codeKeys: ["go", "escape"],
          run: function () {
            setCode("go");
          }
        },
        {
          title: "接口装箱",
          metaphor: "装进统一快递箱，箱子在仓库",
          body: "把具体值放进 interface 可能涉及堆上数据指针。性能敏感路径少装箱，或用泛型减少 interface。",
          codeKeys: ["iface"],
          run: function () {
            setCode("iface");
          }
        }
      ]
    });
  }

  render();
  log("MARK", "判断下列片段更像「栈」还是「堆」");
})();

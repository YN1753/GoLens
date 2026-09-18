(function () {
  const M = window.GoLens || window;
  const stage = document.getElementById("test-stage");
  const logEl = document.getElementById("test-log");
  const runBtn = document.getElementById("test-run");
  const benchBtn = document.getElementById("test-bench");
  const resetBtn = document.getElementById("test-reset");
  const storyRoot = document.getElementById("test-story");
  if (!stage) return;

  const cases = [
    { name: "empty", in: [], want: 0, gotFn: function () { return 0; } },
    { name: "sum_1_2", in: [1, 2], want: 3, gotFn: function () { return 3; } },
    { name: "sum_neg", in: [-1, 1], want: 0, gotFn: function () { return 1; } } // intentionally fail
  ];

  let results = [];
  let bench = null;

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
    results = [];
    bench = null;
    if (logEl) logEl.innerHTML = "";
    setCode("table");
    render();
    log("MARK", "表格驱动测试就绪");
  }

  function runTests() {
    setCode("run");
    results = cases.map(function (c) {
      const got = c.gotFn();
      return { name: c.name, pass: got === c.want, got: got, want: c.want, input: c.in };
    });
    results.forEach(function (r) {
      log(r.pass ? "WAKE" : "PANIC", "Test/" + r.name + " got=" + r.got + " want=" + r.want + (r.pass ? " PASS" : " FAIL"));
    });
    render();
  }

  function runBench() {
    setCode("bench");
    bench = { n: 1000000, nsPerOp: 2.3 + Math.random() * 2, allocs: 0 };
    log("SEND", "BenchmarkSum-" + "· N=" + bench.n + " · " + bench.nsPerOp.toFixed(2) + " ns/op（示意）");
    render();
  }

  function render() {
    let rows = "";
    if (!results.length) rows = '<span style="color:var(--faint);font-size:12px">尚未运行</span>';
    results.forEach(function (r) {
      rows +=
        '<div class="g-block" data-state="' + (r.pass ? "runnable" : "blocked") +
        '" style="margin:4px 0;width:100%;justify-content:space-between;cursor:default">' +
        "<span>" + r.name + "</span><span>" + (r.pass ? "PASS" : "FAIL got " + r.got + " want " + r.want) + "</span></div>";
    });
    stage.innerHTML =
      '<div class="rt-box"><div class="rt-title">子测试结果</div>' + rows + "</div>" +
      '<div class="rt-box" style="margin-top:10px"><div class="rt-title">Benchmark</div>' +
      '<div style="font-family:var(--font-mono);font-size:13px">' +
      (bench ? bench.nsPerOp.toFixed(2) + " ns/op · N=" + bench.n : "点「跑 Benchmark」查看示意") +
      "</div></div>";
  }

  runBtn.addEventListener("click", runTests);
  benchBtn.addEventListener("click", runBench);
  resetBtn.addEventListener("click", reset);

  if (storyRoot && M.StoryGuide) {
    new M.StoryGuide({
      root: storyRoot,
      codePanel: storyRoot.querySelector(".code-track"),
      levels: [
        {
          title: "test.go 与 t.Run",
          metaphor: "一张检查清单，每项单独勾选",
          body: "同包 *_test.go；t.Run 子测试便于过滤：go test -run TestSum/empty。",
          codeKeys: ["table"],
          run: function () { reset(); setCode("table"); }
        },
        {
          title: "表格驱动",
          metaphor: "同一题型换数据反复验",
          body: "cases := []struct{...}，循环 t.Run。期望值写在表里，失败信息要可读。",
          codeKeys: ["table"],
          run: function () { setCode("table"); }
        },
        {
          title: "跑测试",
          metaphor: "按清单逐项打勾，红的要改",
          body: "go test ./... ；失败看 got/want。点 Lab 里的「跑测试」，注意有一条故意 FAIL。",
          codeKeys: ["run"],
          run: function () { runTests(); }
        },
        {
          title: "benchmark",
          metaphor: "计时：同一动作做很多次取平均",
          body: "func BenchmarkX(b *testing.B){ for i:=0;i<b.N;i++{} }；b.N 由框架加大。报 ns/op、allocs/op。",
          codeKeys: ["bench"],
          run: function () { runBench(); }
        }
      ]
    });
  }

  reset();
})();

(function () {
  const M = window.GoLens || window;
  const stage = document.getElementById("perf-stage");
  const logEl = document.getElementById("perf-log");
  const typeSel = document.getElementById("perf-type");
  const runBtn = document.getElementById("perf-run");
  const resetBtn = document.getElementById("perf-reset");
  const storyRoot = document.getElementById("perf-story");
  if (!stage) return;

  const PROFILES = {
    cpu: {
      title: "CPU profile 热点（示意）",
      bars: [
        { name: "JSONEncode", pct: 42, tip: "热路径序列化，考虑减少编码次数" },
        { name: "lock.Mutex", pct: 23, tip: "锁竞争，检查临界区" },
        { name: "GC assist", pct: 18, tip: "分配过多，看 heap profile" },
        { name: "runtime.findrunnable", pct: 10, tip: "调度压力，可能 G 过多" }
      ],
      cmd: "go test -cpuprofile cpu.out ./..."
    },
    heap: {
      title: "Heap / alloc 热点（示意）",
      bars: [
        { name: "make([]byte, n)", pct: 38, tip: "复用 buffer 或 sync.Pool" },
        { name: "interface boxing", pct: 27, tip: "减少装箱，考虑泛型" },
        { name: "string concat", pct: 20, tip: "改用 strings.Builder" },
        { name: "map grow", pct: 12, tip: "预分配 make(map, n)" }
      ],
      cmd: "go test -bench=. -memprofile mem.out"
    }
  };

  let last = null;

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
    last = null;
    if (logEl) logEl.innerHTML = "";
    setCode("slow");
    render();
    log("MARK", "先测量再优化；无 profile 不要猜");
  }

  function run() {
    const t = typeSel.value;
    last = PROFILES[t];
    setCode(t === "cpu" ? "cpu" : "heap");
    log("SEND", last.cmd);
    log("MARK", "查看 " + last.title + " Top");
    render();
  }

  function render() {
    let bars = "";
    if (!last) {
      bars = '<div style="color:var(--faint);font-size:12px">选择 profile 类型后点「采样分析」</div>';
    } else {
      last.bars.forEach(function (b) {
        bars +=
          '<div style="margin:8px 0">' +
          '<div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:12px;margin-bottom:4px">' +
          "<span>" + b.name + "</span><span>" + b.pct + "%</span></div>" +
          '<div style="height:10px;background:var(--surface-2);border-radius:99px;overflow:hidden">' +
          '<div style="height:100%;width:' + b.pct + '%;background:var(--accent)"></div></div>' +
          '<div style="font-size:12px;color:var(--muted);margin-top:4px">' + b.tip + "</div></div>";
      });
    }
    stage.innerHTML =
      '<div class="rt-box"><div class="rt-title">' + (last ? last.title : "性能剖析") + "</div>" + bars + "</div>";
  }

  if (runBtn) runBtn.addEventListener("click", run);
  if (resetBtn) resetBtn.addEventListener("click", reset);

  if (storyRoot && M.StoryGuide) {
    new M.StoryGuide({
      root: storyRoot,
      codePanel: storyRoot.querySelector(".code-track"),
      levels: [
        {
          title: "先有测量",
          metaphor: "看病先拍片，别直接开刀",
          body: "bench 或生产 metrics 发现慢，再上 profile。凭感觉改代码容易白忙。",
          codeKeys: ["slow"],
          run: function () { reset(); setCode("slow"); }
        },
        {
          title: "CPU profile",
          metaphor: "谁在抢工作时间",
          body: "看采样占比最高的函数。锁竞争、热点循环、GC assist 都可能出现。",
          codeKeys: ["cpu"],
          run: function () {
            typeSel.value = "cpu";
            run();
          }
        },
        {
          title: "Heap profile",
          metaphor: "谁在疯狂进货占仓库",
          body: "alloc_space / inuse_space 大头通常可优化：复用、预分配、减装箱。",
          codeKeys: ["heap"],
          run: function () {
            typeSel.value = "heap";
            run();
          }
        },
        {
          title: "工具链",
          metaphor: "报告要会读",
          body: "go tool pprof -http=: profile.out；火焰图看宽条。线上注意采样开销。",
          codeKeys: ["cpu", "heap"],
          run: function () { setCode("cpu"); }
        }
      ]
    });
  }

  reset();
})();

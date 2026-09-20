(function () {
  const M = window.GoLens || window;
  const stage = document.getElementById("at-stage");
  const logEl = document.getElementById("at-log");
  const opSel = document.getElementById("at-op");
  const runBtn = document.getElementById("at-run");
  const resetBtn = document.getElementById("at-reset");
  const storyRoot = document.getElementById("at-story");
  if (!stage) return;

  const OPS = {
    add: {
      title: "AddInt64 / Load",
      lines: ["var c int64", "atomic.AddInt64(&c, 1) // 并发安全 +1", "atomic.LoadInt64(&c) 读"],
      tip: "计数器不必上互斥锁"
    },
    store: {
      title: "Store / Load 指针",
      lines: ["atomic.StorePointer(&p, unsafe.Pointer(nv))", "atomic.LoadPointer(&p)", "发布新配置等场景"],
      tip: "无锁指针发布；复杂结构仍要设计好不可变性"
    },
    cas: {
      title: "CompareAndSwap",
      lines: ["atomic.CompareAndSwapInt64(&v, old, new)", "仅当仍为 old 才写成 new", "失败则重读重试"],
      tip: "实现无锁结构的基础原语"
    },
    mutexvs: {
      title: "何时用 atomic vs mutex",
      lines: ["单变量计数/标志 → atomic", "多字段临界区 → mutex", "先想清楚不变式再选工具"],
      tip: "逻辑正确优先，其次才谈锁开销"
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

  function reset() { if (logEl) logEl.innerHTML = ""; setCode(opSel.value); render(); }
  function run() {
    const op = OPS[opSel.value] || OPS.add;
    setCode(opSel.value);
    log("MARK", op.title + " — " + op.tip);
    op.lines.forEach(function (l, i) { log(i === op.lines.length - 1 ? "WAKE" : "SEND", l); });
    render();
  }
  function render() {
    const op = OPS[opSel.value] || OPS.add;
    let rows = "";
    op.lines.forEach(function (l) {
      rows += '<div class="g-block" data-state="runnable" style="margin:4px 0;width:100%;cursor:default"><span>' + l + "</span></div>";
    });
    stage.innerHTML = '<div class="rt-box"><div class="rt-title">' + op.title + "</div>" + rows +
      '<div style="margin-top:8px;font-size:13px;color:var(--muted)">' + op.tip + "</div></div>";
  }

  opSel.addEventListener("change", function () { setCode(opSel.value); render(); });
  runBtn.addEventListener("click", run);
  resetBtn.addEventListener("click", reset);

  if (storyRoot && M.StoryGuide) {
    new M.StoryGuide({
      root: storyRoot,
      codePanel: storyRoot.querySelector(".code-track"),
      levels: [
        { title: "atomic 是什么", metaphor: "不可打断的记账动作", body: "对单一变量的原子读写/增减，避免 data race。", codeKeys: ["add"], run: function () { opSel.value = "add"; reset(); run(); } },
        { title: "CAS", metaphor: "先核对旧钥匙再换锁", body: "比较并交换，无锁算法常用。", codeKeys: ["cas"], run: function () { opSel.value = "cas"; reset(); run(); } },
        { title: "和锁怎么选", metaphor: "一把钥匙柜 vs 整间仓库盘点", body: "单值用 atomic；多字段不变式用 mutex。", codeKeys: ["mutexvs"], run: function () { opSel.value = "mutexvs"; reset(); run(); } }
      ]
    });
  }
  reset();
  log("MARK", "sync/atomic：并发下的安全读写");
})();

(function () {
  const M = window.GoLens || window;
  const stage = document.getElementById("pat-stage");
  const logEl = document.getElementById("pat-log");
  const modeSel = document.getElementById("pat-mode");
  const stepBtn = document.getElementById("pat-step");
  const resetBtn = document.getElementById("pat-reset");
  const storyRoot = document.getElementById("pat-story");
  if (!stage) return;

  const MODES = {
    worker: {
      title: "Worker Pool",
      steps: [
        "任务进入 jobs channel（缓冲队列）",
        "N 个 worker goroutine 竞争消费 jobs",
        "结果写入 results channel",
        "WaitGroup 等全部 worker 结束",
        "关闭 results，收集方退出"
      ],
      tip: "限制并发度，避免一任务一 goroutine 打爆资源"
    },
    fanin: {
      title: "Fan-out / Fan-in",
      steps: [
        "输入 channel 广播到多个 processor（fan-out）",
        "各自处理后写入各自的 out",
        "merge/fan-in 汇总多个 out → 单一 channel",
        "下游只需读一个 channel"
      ],
      tip: "拆并行、合结果；merge 里常用 WaitGroup + close"
    },
    pipeline: {
      title: "Pipeline",
      steps: [
        "Stage1: gen → out1",
        "Stage2: map/transform out1 → out2",
        "Stage3: filter/reduce out2 → out3",
        "每级 channel 关闭表示结束"
      ],
      tip: "阶段解耦；注意谁负责 close channel"
    },
    ordone: {
      title: "or-done / 超时退出",
      steps: [
        "select 同时等 c 与 done/ctx.Done()",
        "业务 channel 有值则转发",
        "done 关闭则立即退出，防泄漏",
        "time.After 提供超时臂"
      ],
      tip: "与 Context 章串起来：可取消的管道"
    }
  };

  let steps = [];
  let i = 0;

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
    const m = MODES[modeSel.value] || MODES.worker;
    steps = m.steps;
    i = 0;
    if (logEl) logEl.innerHTML = "";
    setCode(modeSel.value);
    render(m);
    log("MARK", "模式：" + m.title + " — " + m.tip);
  }

  function stepOnce() {
    const m = MODES[modeSel.value] || MODES.worker;
    if (i >= steps.length) {
      log("BLOCK", "已走完该模式步骤");
      return;
    }
    i++;
    log("WAKE", "步骤 " + i + "：" + steps[i - 1]);
    setCode(modeSel.value);
    render(m);
  }

  function render(m) {
    let list = "";
    steps.forEach(function (s, idx) {
      const on = idx < i;
      const cur = idx === i - 1;
      list +=
        '<div class="g-block" data-state="' + (on ? (cur ? "running" : "runnable") : "done") +
        '" style="margin:4px 0;width:100%;justify-content:space-between;cursor:default;opacity:' +
        (on ? "1" : "0.45") + '">' +
        "<span>" + (idx + 1) + ". " + s + "</span><span>" + (on ? (cur ? "…" : "✓") : "") + "</span></div>";
    });
    stage.innerHTML =
      '<div class="rt-box"><div class="rt-title">' + m.title + "</div>" + list +
      '<div style="margin-top:10px;font-size:13px;color:var(--muted)">' + m.tip + "</div></div>";
  }

  modeSel.addEventListener("change", reset);
  stepBtn.addEventListener("click", stepOnce);
  resetBtn.addEventListener("click", reset);

  if (storyRoot && M.StoryGuide) {
    new M.StoryGuide({
      root: storyRoot,
      codePanel: storyRoot.querySelector(".code-track"),
      levels: [
        {
          title: "Worker Pool",
          metaphor: "取餐窗口固定数量，订单排队被处理",
          body: "jobs 进、worker 消费、results 出、WaitGroup 收口。控制最大并发。",
          codeKeys: ["worker"],
          run: function () { modeSel.value = "worker"; reset(); }
        },
        {
          title: "Fan-out / Fan-in",
          metaphor: "分拣线多工位并行，再汇到一条包装线",
          body: "多个消费者并行，merge 合成单流。关闭时机要清晰。",
          codeKeys: ["fanin"],
          run: function () { modeSel.value = "fanin"; reset(); stepOnce(); stepOnce(); }
        },
        {
          title: "Pipeline",
          metaphor: "流水线：粗加工 → 精加工 → 质检",
          body: "每级 in→out channel；上一级 close 下一级才能 range 结束。",
          codeKeys: ["pipeline"],
          run: function () { modeSel.value = "pipeline"; reset(); stepOnce(); }
        },
        {
          title: "可取消 / 超时",
          metaphor: "总闸一拉，流水线全部停下",
          body: "select + ctx.Done / done channel，避免 goroutine 泄漏。",
          codeKeys: ["ordone"],
          run: function () { modeSel.value = "ordone"; reset(); stepOnce(); }
        }
      ]
    });
  }

  reset();
})();

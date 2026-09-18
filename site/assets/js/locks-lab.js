(function () {
  const M = window.GoLens || window;
  const stage = document.getElementById("lock-stage");
  const logEl = document.getElementById("lock-log");
  const scenarioSel = document.getElementById("lock-scenario");
  const runBtn = document.getElementById("lock-run");
  const resetBtn = document.getElementById("lock-reset");
  const storyRoot = document.getElementById("lock-story");
  if (!stage) return;

  const SCENARIOS = {
    mutex: {
      title: "Mutex 互斥",
      steps: [
        "G1 Lock 成功，进入临界区",
        "G2 Lock 阻塞，挂入等待队列",
        "G1 Unlock，唤醒 G2",
        "G2 进入临界区后 Unlock"
      ],
      tip: "成对 Lock/Unlock；常用 defer Unlock"
    },
    rwmutex: {
      title: "RWMutex 读写锁",
      steps: [
        "R1/R2 RLock 可同时读",
        "W1 Lock 需等读者离开",
        "写进行时新读者 RLock 阻塞",
        "W1 Unlock 后读者继续"
      ],
      tip: "读多写少更合适；写会挡读"
    },
    waitgroup: {
      title: "WaitGroup",
      steps: [
        "启动前 Add(n)",
        "每个 worker 结束 Done()",
        "Wait() 直到计数归零",
        "计数不可为负，否则 panic"
      ],
      tip: "Add 在 go 之前，避免竞态"
    },
    once: {
      title: "Once",
      steps: [
        "首次 Do(fn) 执行初始化",
        "并发 Do 等待同一初始化",
        "后续 Do 直接返回不再执行",
        "注意：fn panic 也会被视为已执行"
      ],
      tip: "适合连接池/配置单次初始化"
    },
    syncmap: {
      title: "sync.Map",
      steps: [
        "读多写少/键集合稳定时考虑",
        "Load/Store/LoadOrStore/Range",
        "与「分片 map + mutex」对比",
        "不要为所有 map 并发问题盲目上 sync.Map"
      ],
      tip: "先测再换；普通 map + RWMutex 通常够用"
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
    const s = SCENARIOS[scenarioSel.value] || SCENARIOS.mutex;
    steps = s.steps;
    i = 0;
    if (logEl) logEl.innerHTML = "";
    setCode(scenarioSel.value);
    render(s);
    log("MARK", s.title + " — " + s.tip);
  }

  function run() {
    const s = SCENARIOS[scenarioSel.value] || SCENARIOS.mutex;
    while (i < steps.length) {
      i++;
      log(i === 1 ? "BIND" : i === steps.length ? "WAKE" : "BLOCK", "步骤 " + i + "：" + steps[i - 1]);
    }
    setCode(scenarioSel.value);
    render(s);
  }

  function render(s) {
    let list = "";
    steps.forEach(function (st, idx) {
      const on = idx < i;
      list +=
        '<div class="g-block" data-state="' + (on ? (idx === i - 1 ? "running" : "runnable") : "done") +
        '" style="margin:4px 0;width:100%;justify-content:space-between;cursor:default;opacity:' + (on ? "1" : "0.45") + '">' +
        "<span>" + (idx + 1) + ". " + st + "</span><span>" + (on ? "✓" : "") + "</span></div>";
    });
    stage.innerHTML =
      '<div class="rt-box"><div class="rt-title">' + s.title + "</div>" + list +
      '<div style="margin-top:10px;font-size:13px;color:var(--muted)">' + s.tip + "</div></div>";
  }

  scenarioSel.addEventListener("change", reset);
  runBtn.addEventListener("click", run);
  resetBtn.addEventListener("click", reset);

  if (storyRoot && M.StoryGuide) {
    new M.StoryGuide({
      root: storyRoot,
      codePanel: storyRoot.querySelector(".code-track"),
      levels: [
        {
          title: "Mutex",
          metaphor: "单人卫生间：一次一人",
          body: "保护共享内存。临界区尽量短；拷贝锁是坑。",
          codeKeys: ["mutex"],
          run: function () { scenarioSel.value = "mutex"; reset(); }
        },
        {
          title: "RWMutex",
          metaphor: "阅览室：多人可读，有人写则清场",
          body: "读共享、写独占。写多时未必更快。",
          codeKeys: ["rwmutex"],
          run: function () { scenarioSel.value = "rwmutex"; reset(); run(); }
        },
        {
          title: "WaitGroup / Once",
          metaphor: "等人齐再出发 / 门禁只刷一次",
          body: "WaitGroup 协调一组 goroutine；Once 保证初始化一次。",
          codeKeys: ["waitgroup", "once"],
          run: function () { scenarioSel.value = "waitgroup"; reset(); run(); }
        },
        {
          title: "sync.Map",
          metaphor: "特化仓库，不是万能抽屉",
          body: "特定并发 map 模式优化过；通用场景先用 mutex 或分片。",
          codeKeys: ["syncmap"],
          run: function () { scenarioSel.value = "syncmap"; reset(); run(); }
        }
      ]
    });
  }

  reset();
})();

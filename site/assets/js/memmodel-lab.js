(function () {
  const M = window.GoLens || window;
  const stage = document.getElementById("hb-stage");
  const logEl = document.getElementById("hb-log");
  const ruleSel = document.getElementById("hb-rule");
  const runBtn = document.getElementById("hb-run");
  const resetBtn = document.getElementById("hb-reset");
  const storyRoot = document.getElementById("hb-story");
  if (!stage) return;

  const RULES = {
    goroutine: {
      title: "go 语句",
      steps: ["go 之前的写", "在新 G 里可见（去启动前写）", "反过来：G 内写不自动对父可见"],
      tip: "启动前写入对新 G 可见；收结果仍要 channel/锁"
    },
    channel: {
      title: "channel 同步",
      steps: ["G1 写 x", "G1 ch <- true", "G2 <-ch", "G2 读 x：与 G1 写定序"],
      tip: "send happens-before 对应 recv 完成"
    },
    mutex: {
      title: "Mutex",
      steps: ["G1 Lock 写 x Unlock", "G2 Lock", "G2 读 x 看到 G1 写", "Unlock 与后续 Lock 配对"],
      tip: "Unlock happens-before 后续 Lock"
    },
    once: {
      title: "Once 初始化",
      steps: ["once.Do(init) 完成", "之后 Do 返回的观察者", "能看到 init 的写"],
      tip: "Do 返回后，init 的副作用对其他 G 可见"
    },
    atomic: {
      title: "atomic",
      steps: ["atomic.Store 发布", "另一 G atomic.Load", "按原子序与 happens-before 观察", "简单计数/标志位够用"],
      tip: "无锁但仍有内存序；错误用 atomics 仍可能逻辑错"
    }
  };

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
    if (logEl) logEl.innerHTML = "";
    setCode(ruleSel.value);
    render();
  }

  function run() {
    const r = RULES[ruleSel.value] || RULES.goroutine;
    setCode(ruleSel.value);
    log("MARK", r.title + " — " + r.tip);
    r.steps.forEach(function (s, i) {
      log(i === r.steps.length - 1 ? "WAKE" : "SEND", s);
    });
    render();
  }

  function render() {
    const r = RULES[ruleSel.value] || RULES.goroutine;
    let rows = "";
    r.steps.forEach(function (s) {
      rows += '<div class="g-block" data-state="runnable" style="margin:4px 0;width:100%;cursor:default"><span>' + s + "</span></div>";
    });
    stage.innerHTML =
      '<div class="rt-box"><div class="rt-title">' + r.title + "</div>" + rows +
      '<div style="margin-top:8px;font-size:13px;color:var(--muted)">' + r.tip + "</div></div>";
  }

  ruleSel.addEventListener("change", function () {
    setCode(ruleSel.value);
    log("MARK", "规则：" + RULES[ruleSel.value].title);
    render();
  });
  runBtn.addEventListener("click", run);
  resetBtn.addEventListener("click", reset);

  if (storyRoot && M.StoryGuide) {
    new M.StoryGuide({
      root: storyRoot,
      codePanel: storyRoot.querySelector(".code-track"),
      levels: [
        {
          title: "什么是内存模型",
          metaphor: "多人工地：谁改的账，别人何时能看到",
          body: "编译器与 CPU 可以重排。happens-before 定义「何时可见」；同步原语建立顺序。",
          codeKeys: ["intro"],
          run: function () { setCode("intro"); log("MARK", "内存模型 = 可见性与顺序规则"); }
        },
        {
          title: "数据竞争",
          metaphor: "两人同时改同一本账且无签字",
          body: "≥2 访问同一内存、至少一个写、无同步 → data race，未定义行为。用 -race 检测。",
          codeKeys: ["race"],
          run: function () { setCode("race"); log("BLOCK", "data race：结果不可依赖"); }
        },
        {
          title: "channel / mutex 建立顺序",
          metaphor: "交接单与锁，后人能看到前人签字后的账",
          body: "recv 能看到 send 前的写；Lock 能看到上一 Unlock 前的写。",
          codeKeys: ["channel", "mutex"],
          run: function () { ruleSel.value = "channel"; run(); }
        },
        {
          title: "常见错误写法",
          metaphor: "口头说改了，账本没同步",
          body: "无同步的标志位、错误地只写 flag 不用 atomic/mutex、以为「我先写的就一定被看到」。",
          codeKeys: ["atomic", "race"],
          run: function () { ruleSel.value = "atomic"; run(); }
        }
      ]
    });
  }

  reset();
  log("MARK", "happens-before：同步点建立可见顺序");
})();

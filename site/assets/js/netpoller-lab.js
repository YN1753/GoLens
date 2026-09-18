(function () {
  const M = window.GoLens || window;
  const stage = document.getElementById("net-stage");
  const logEl = document.getElementById("net-log");
  const blockBtn = document.getElementById("net-block");
  const readyBtn = document.getElementById("net-ready");
  const wakeBtn = document.getElementById("net-wake");
  const resetBtn = document.getElementById("net-reset");
  const storyRoot = document.getElementById("net-story");
  if (!stage) return;

  let conns = [];

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
    conns = [
      { id: "c1", g: "G10", state: "ready", note: "已建立" },
      { id: "c2", g: "G11", state: "ready", note: "已建立" },
      { id: "c3", g: "G12", state: "ready", note: "已建立" }
    ];
    if (logEl) logEl.innerHTML = "";
    setCode("read");
    render();
    log("MARK", "多个连接就绪；业务 G 执行 Read");
  }

  function doBlock() {
    let hit = false;
    conns.forEach(function (c) {
      if (c.state === "ready") {
        c.state = "wait";
        c.note = "Read 阻塞";
        hit = true;
      }
    });
    setCode("park");
    log(hit ? "BLOCK" : "MARK", hit ? "G 在 Read 上挂起，不占 P（交给 netpoll）" : "无 ready 连接");
    render();
  }

  function doReady() {
    const waiting = conns.filter(function (c) { return c.state === "wait"; });
    if (!waiting.length) {
      log("BLOCK", "没有等待中的连接");
      render();
      return;
    }
    waiting[0].state = "polled";
    waiting[0].note = "epoll 报告可读";
    setCode("poll");
    log("STW", "netpoll/epoll 发现 " + waiting[0].id + " 就绪");
    render();
  }

  function doWake() {
    const polled = conns.filter(function (c) { return c.state === "polled"; });
    if (!polled.length) {
      log("BLOCK", "没有已就绪待唤醒的连接");
      render();
      return;
    }
    const c = polled[0];
    c.state = "ready";
    c.note = "G 已唤醒";
    setCode("wake");
    log("WAKE", c.g + " 重新入队，M 继续执行用户代码");
    render();
  }

  function render() {
    let html = '<div class="rt-box"><div class="rt-title">连接与 Goroutine</div>';
    conns.forEach(function (c) {
      const st = c.state === "ready" ? "runnable" : c.state === "wait" ? "blocked" : "running";
      html +=
        '<div class="g-block" data-state="' + st + '" style="margin:4px 0;width:100%;justify-content:space-between;cursor:default">' +
        "<span>" + c.id + " / " + c.g + "</span><span>" + c.note + "</span></div>";
    });
    html +=
      "</div><div class=\"rt-box\" style=\"margin-top:10px\"><div class=\"rt-title\">直觉</div>" +
      '<div style="font-size:13px;color:var(--muted)">IO 阻塞 ≠ 死占 CPU：G 让出，netpoll 等内核事件，就绪后再调度。</div></div>';
    stage.innerHTML = html;
  }

  blockBtn.addEventListener("click", doBlock);
  readyBtn.addEventListener("click", doReady);
  wakeBtn.addEventListener("click", doWake);
  resetBtn.addEventListener("click", reset);

  if (storyRoot && M.StoryGuide) {
    new M.StoryGuide({
      root: storyRoot,
      codePanel: storyRoot.querySelector(".code-track"),
      levels: [
        {
          title: "为何高并发",
          metaphor: "餐厅：客人等菜时服务员去别桌，不站在桌边发呆",
          body: "网络服务器大量连接大多空闲。Go 用 goroutine 表达并发，用 netpoll 等待可读/可写，避免一连接一线程。",
          codeKeys: ["read"],
          run: function () { reset(); setCode("read"); }
        },
        {
          title: "Read 阻塞",
          metaphor: "点单后离开，厨房好了再叫号",
          body: "对非阻塞 FD，Read 无数据时 G 挂起；M 可去跑别的 G。点「Read 阻塞」。",
          codeKeys: ["park"],
          run: function () { reset(); doBlock(); }
        },
        {
          title: "netpoll 报告就绪",
          metaphor: "叫号机响：3 号桌可以上菜",
          body: "epoll/kqueue 等报告哪些 FD 就绪；运行时把对应 G 标为 runnable。",
          codeKeys: ["poll"],
          run: function () { reset(); doBlock(); doReady(); }
        },
        {
          title: "重新调度",
          metaphor: "服务员回来上菜",
          body: "G 进入运行队列，由 P/M 继续执行。面试可把 netpoll 与 GMP 串成一条线。",
          codeKeys: ["wake"],
          run: function () { reset(); doBlock(); doReady(); doWake(); }
        }
      ]
    });
  }

  reset();
})();

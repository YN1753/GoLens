(function () {
  const M = window.GoLens || window;
  const stage = document.getElementById("http-stage");
  const logEl = document.getElementById("http-log");
  const stepBtn = document.getElementById("http-step");
  const resetBtn = document.getElementById("http-reset");
  const storyRoot = document.getElementById("http-story");
  if (!stage) return;

  const STEPS = [
    { t: "Listen 建立 listener", d: "TCP 监听 :8080", code: "listen" },
    { t: "Accept 得到 conn", d: "netpoll 就绪 → 取出连接", code: "accept" },
    { t: "serve(conn) 一个 G", d: "默认每连接 goroutine", code: "goroutine" },
    { t: "读请求 / Handler", d: "Parse → ServeHTTP → 写响应", code: "handler" },
    { t: "连接复用或关闭", d: "keep-alive 或 close", code: "conn" }
  ];

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
    i = 0;
    if (logEl) logEl.innerHTML = "";
    setCode("listen");
    render();
    log("MARK", "标准库 net/http：监听 → Accept → 每连接 G → Handler");
  }

  function step() {
    if (i >= STEPS.length) {
      log("BLOCK", "一轮请求生命周期结束");
      return;
    }
    const s = STEPS[i++];
    setCode(s.code);
    log(i === 1 ? "BIND" : "WAKE", "步骤 " + i + "：" + s.t + " — " + s.d);
    render();
  }

  function render() {
    let rows = "";
    STEPS.forEach(function (s, idx) {
      const on = idx < i;
      rows +=
        '<div class="g-block" data-state="' + (on ? (idx === i - 1 ? "running" : "runnable") : "done") +
        '" style="margin:4px 0;width:100%;justify-content:space-between;cursor:default;opacity:' + (on ? "1" : "0.45") + '">' +
        "<span>" + s.t + "</span><span>" + (on ? "✓" : "") + "</span></div>";
    });
    stage.innerHTML = '<div class="rt-box"><div class="rt-title">请求生命周期</div>' + rows + "</div>";
  }

  stepBtn.addEventListener("click", step);
  resetBtn.addEventListener("click", reset);

  if (storyRoot && M.StoryGuide) {
    new M.StoryGuide({
      root: storyRoot,
      codePanel: storyRoot.querySelector(".code-track"),
      levels: [
        {
          title: "HTTP 服务器骨架",
          metaphor: "前台收件：听门口 → 接单 → 分人处理",
          body: "http.ListenAndServe 内部：Listen + Accept 循环 + 每个 conn 一个 goroutine serve。",
          codeKeys: ["listen"],
          run: function () { reset(); }
        },
        {
          title: "与 netpoller 的关系",
          metaphor: "门口叫号，不占人干等",
          body: "Accept/读写可阻塞时 G 挂起，netpoll 就绪再调度——高并发连接靠这套。",
          codeKeys: ["accept", "goroutine"],
          run: function () { reset(); step(); step(); }
        },
        {
          title: "Handler 与中间件",
          metaphor: "流水线工位：日志/鉴权/业务",
          body: "HandlerFunc 可层层包装；注意在 Handler 里传 ctx 做超时取消。",
          codeKeys: ["handler"],
          run: function () { reset(); for (let k = 0; k < 4; k++) step(); }
        },
        {
          title: "工程注意",
          metaphor: "门口要限流，打烊要清场",
          body: "超时、优雅关闭、连接数/超时配置、避免在 Handler 阻塞过久。",
          codeKeys: ["conn", "handler"],
          run: function () { setCode("conn"); log("MARK", "串联：Shutdown / 限流见下一章"); }
        }
      ]
    });
  }

  reset();
})();

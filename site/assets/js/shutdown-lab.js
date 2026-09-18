(function () {
  const M = window.GoLens || window;
  const stage = document.getElementById("sd-stage");
  const logEl = document.getElementById("sd-log");
  const modeSel = document.getElementById("sd-mode");
  const stepBtn = document.getElementById("sd-step");
  const resetBtn = document.getElementById("sd-reset");
  const storyRoot = document.getElementById("sd-story");
  if (!stage) return;

  const MODES = {
    shutdown: {
      title: "http.Server.Shutdown",
      steps: [
        "收到 SIGTERM/信号",
        "Shutdown(ctx)：停止 Accept",
        "等待在飞请求结束（或 ctx 超时）",
        "关闭 listener / 退出进程"
      ],
      tip: "给 ctx 一个宽限期，避免秒杀在飞请求"
    },
    ratelimit: {
      title: "令牌桶限流",
      steps: [
        "桶按速率放入令牌",
        "请求到达则取令牌",
        "无令牌则拒绝或排队",
        "突发容量 = 桶容量"
      ],
      tip: "保护下游；客户端/网关/应用层都可做"
    },
    semaphore: {
      title: "并发上限（信号量）",
      steps: [
        "带缓冲 channel cap=N",
        "进入：sem <- struct{}{}",
        "处理完：<-sem",
        "超过 N 的请求等待"
      ],
      tip: "限制同时 in-flight，防打爆下游"
    },
    timeout: {
      title: "请求超时",
      steps: [
        "ctx, cancel := context.WithTimeout",
        "defer cancel()",
        "把 ctx 传入下游 IO",
        "超时后 select/库返回 ctx.Err()"
      ],
      tip: "Server Read/WriteTimeout 与业务 ctx 都要设"
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
    const m = MODES[modeSel.value] || MODES.shutdown;
    steps = m.steps;
    i = 0;
    if (logEl) logEl.innerHTML = "";
    setCode(modeSel.value);
    render(m);
    log("MARK", m.title + " — " + m.tip);
  }

  function step() {
    const m = MODES[modeSel.value] || MODES.shutdown;
    if (i >= steps.length) {
      log("BLOCK", "流程演示完毕");
      return;
    }
    i++;
    log("WAKE", "步骤 " + i + "：" + steps[i - 1]);
    setCode(modeSel.value);
    render(m);
  }

  function render(m) {
    let rows = "";
    steps.forEach(function (s, idx) {
      const on = idx < i;
      rows +=
        '<div class="g-block" data-state="' + (on ? (idx === i - 1 ? "running" : "runnable") : "done") +
        '" style="margin:4px 0;width:100%;justify-content:space-between;cursor:default;opacity:' + (on ? "1" : "0.45") + '">' +
        "<span>" + s + "</span><span>" + (on ? "✓" : "") + "</span></div>";
    });
    stage.innerHTML =
      '<div class="rt-box"><div class="rt-title">' + m.title + "</div>" + rows +
      '<div style="margin-top:8px;font-size:13px;color:var(--muted)">' + m.tip + "</div></div>";
  }

  modeSel.addEventListener("change", reset);
  stepBtn.addEventListener("click", step);
  resetBtn.addEventListener("click", reset);

  if (storyRoot && M.StoryGuide) {
    new M.StoryGuide({
      root: storyRoot,
      codePanel: storyRoot.querySelector(".code-track"),
      levels: [
        {
          title: "为什么需要优雅关闭",
          metaphor: "餐厅打烊：已点的菜要上完",
          body: "直接 kill 会丢在飞请求。Shutdown 停止新连接并等待处理完。",
          codeKeys: ["shutdown"],
          run: function () { modeSel.value = "shutdown"; reset(); }
        },
        {
          title: "限流",
          metaphor: "收费站控速，防止匝道打爆主路",
          body: "令牌桶/漏桶；与并发信号量不同：限流管速率，信号量管同时在飞数量。",
          codeKeys: ["ratelimit", "semaphore"],
          run: function () { modeSel.value = "ratelimit"; reset(); step(); step(); }
        },
        {
          title: "超时与 ctx",
          metaphor: "计时器到点就停，不留悬挂",
          body: "业务 ctx + Server 超时双保险；下游也要传 ctx。",
          codeKeys: ["timeout"],
          run: function () { modeSel.value = "timeout"; reset(); step(); }
        },
        {
          title: "面试串联",
          metaphor: "网关限流 + 服务优雅下线 + 连接池",
          body: "可串 net/http、context、sync、channel 模式一起答。",
          codeKeys: ["shutdown"],
          run: function () { setCode("shutdown"); }
        }
      ]
    });
  }

  reset();
})();

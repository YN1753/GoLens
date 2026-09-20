(function () {
  const M = window.GoLens || window;
  const stage = document.getElementById("obs-stage");
  const logEl = document.getElementById("obs-log");
  const pillarSel = document.getElementById("obs-pillar");
  const runBtn = document.getElementById("obs-run");
  const resetBtn = document.getElementById("obs-reset");
  const storyRoot = document.getElementById("obs-story");
  if (!stage) return;

  const PILLARS = {
    logs: {
      title: "Logs",
      items: [
        "结构化日志（key=value / JSON）",
        "级别：debug/info/warn/error",
        "关键路径带 trace_id / request_id",
        "错误日志含 cause，避免只打 err string"
      ],
      tip: "排障第一步；注意采样与脱敏"
    },
    metrics: {
      title: "Metrics",
      items: [
        "RED：Rate / Errors / Duration",
        "USE 资源：Utilization / Saturation / Errors",
        "直方图看延迟分位，不只看平均",
        "标签基数要可控（勿滥用高基数）"
      ],
      tip: "告警靠指标；日志做深挖"
    },
    trace: {
      title: "Tracing",
      items: [
        "一次请求的跨服务调用链",
        "Span：开始/结束/属性",
        "把 ctx 中的 trace id 贯穿下游",
        "慢在哪一段：DB/缓存/外部 API"
      ],
      tip: "微服务排障必备"
    },
    slo: {
      title: "SLO / 告警",
      items: [
        "定义 SLI（可用性/延迟）",
        "SLO 目标与错误预算",
        "告警可行动，避免噪音",
        "发布前后看板对比"
      ],
      tip: "没有 SLO 的监控容易变摆设"
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
    setCode(pillarSel.value);
    render();
  }

  function run() {
    const p = PILLARS[pillarSel.value] || PILLARS.logs;
    setCode(pillarSel.value);
    log("MARK", p.title + " — " + p.tip);
    p.items.forEach(function (it, idx) {
      log(idx === p.items.length - 1 ? "WAKE" : "SEND", it);
    });
    render();
  }

  function render() {
    const p = PILLARS[pillarSel.value] || PILLARS.logs;
    let rows = "";
    p.items.forEach(function (it) {
      rows +=
        '<div class="g-block" data-state="runnable" style="margin:4px 0;width:100%;cursor:default"><span>' + it + "</span></div>";
    });
    stage.innerHTML =
      '<div class="rt-box"><div class="rt-title">' + p.title + "</div>" + rows +
      '<div style="margin-top:8px;font-size:13px;color:var(--muted)">' + p.tip + "</div></div>";
  }

  pillarSel.addEventListener("change", function () {
    setCode(pillarSel.value);
    log("MARK", "支柱：" + PILLARS[pillarSel.value].title);
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
          title: "三支柱",
          metaphor: "体检报告 + 心电图 + 会诊记录",
          body: "Logs 看细节，Metrics 看趋势告警，Tracing 看链路耗时。",
          codeKeys: ["logs"],
          run: function () { pillarSel.value = "logs"; reset(); run(); }
        },
        {
          title: "Metrics 怎么设计",
          metaphor: "仪表盘要看得到油压水温",
          body: "RED 适合服务；延迟用分位；标签别爆炸。",
          codeKeys: ["metrics"],
          run: function () { pillarSel.value = "metrics"; reset(); run(); }
        },
        {
          title: "Tracing",
          metaphor: "包裹物流轨迹",
          body: "ctx 贯穿；span 串起 HTTP→DB→缓存。",
          codeKeys: ["trace"],
          run: function () { pillarSel.value = "trace"; reset(); run(); }
        },
        {
          title: "SLO",
          metaphor: "服务承诺与允许的翻车次数",
          body: "错误预算用完就该止血/回滚，而不是无限加机器。",
          codeKeys: ["slo"],
          run: function () { pillarSel.value = "slo"; reset(); run(); }
        }
      ]
    });
  }

  reset();
  log("MARK", "可观测性：能回答「现在正不正常 / 为何变慢」");
})();

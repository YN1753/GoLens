(function () {
  const M = window.GoLens || window;
  const stage = document.getElementById("error-stage");
  const logEl = document.getElementById("error-log");
  const wrapBtn = document.getElementById("err-wrap");
  const isBtn = document.getElementById("err-is");
  const asBtn = document.getElementById("err-as");
  const resetBtn = document.getElementById("err-reset");
  const storyRoot = document.getElementById("error-story");
  if (!stage) return;

  // Sentinel + typed error simulation
  const ErrNotFound = { id: "ErrNotFound", msg: "not found" };
  function NotFoundError(key) {
    this.name = "NotFoundError";
    this.key = key;
    this.msg = "key " + key + " missing";
  }

  let chain = [];

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
    chain = [{ layer: "底层", err: ErrNotFound, wrapped: false }];
    if (logEl) logEl.innerHTML = "";
    setCode("sentinel");
    render();
    log("MARK", "底层错误 ErrNotFound");
  }

  function wrapOnce() {
    const n = chain.length + 1;
    chain.push({
      layer: "层" + n,
      err: { layer: n, target: chain[0].err, typed: n >= 2 ? new NotFoundError("user:1") : null },
      wrapped: true,
      fmt: n === 1 ? "db: %w" : "api: %w"
    });
    setCode("wrap");
    log("BIND", "fmt.Errorf(\"…: %w\", err) 包装第 " + n + " 层");
    render();
  }

  function errorsIs() {
    setCode("is");
    // Walk chain for sentinel
    let found = false;
    for (let i = 0; i < chain.length; i++) {
      const e = chain[i].err;
      if (e === ErrNotFound || (e && e.target === ErrNotFound)) {
        found = true;
        break;
      }
    }
    log(found ? "WAKE" : "PANIC", "errors.Is(err, ErrNotFound) => " + found);
    render({ is: found });
  }

  function errorsAs() {
    setCode("as");
    let typed = null;
    for (let i = 0; i < chain.length; i++) {
      const e = chain[i].err;
      if (e && e.typed instanceof NotFoundError) {
        typed = e.typed;
        break;
      }
    }
    log(typed ? "WAKE" : "PANIC", typed ? "errors.As => NotFoundError key=" + typed.key : "errors.As 未命中类型");
    render({ as: typed });
  }

  function render(fx) {
    fx = fx || {};
    let rows = "";
    chain.forEach(function (c, i) {
      const label = c.err === ErrNotFound ? "ErrNotFound" : c.err && c.err.typed ? "NotFoundError(" + c.err.typed.key + ")" : "wrapped@" + i;
      rows +=
        '<div class="g-block" data-state="' + (i === chain.length - 1 ? "running" : "runnable") +
        '" style="margin:4px 0;cursor:default;display:flex;width:100%;justify-content:space-between">' +
        "<span>" + c.layer + "</span><span>" + label + "</span></div>";
    });
    stage.innerHTML =
      '<div class="rt-box"><div class="rt-title">错误链（顶层在下）</div>' + rows +
      '<div style="margin-top:10px;font-family:var(--font-mono);font-size:12px;color:var(--muted)">' +
      "Is=" + (fx.is == null ? "—" : fx.is) + " · As=" + (fx.as ? fx.as.name : fx.as === null && fx.as !== undefined ? "false" : "—") +
      "</div></div>";
  }

  wrapBtn.addEventListener("click", wrapOnce);
  isBtn.addEventListener("click", errorsIs);
  asBtn.addEventListener("click", errorsAs);
  resetBtn.addEventListener("click", reset);

  if (storyRoot && M.StoryGuide) {
    new M.StoryGuide({
      root: storyRoot,
      codePanel: storyRoot.querySelector(".code-track"),
      levels: [
        {
          title: "error 是接口",
          metaphor: "任何能说出「错了」的东西都算 error",
          body: "标准库用 error 接口（Error() string）。哨兵错误 var ErrX = errors.New(...) 用于可比较的类别。",
          codeKeys: ["sentinel"],
          run: function () { reset(); setCode("sentinel"); }
        },
        {
          title: "%w 包装保留原因链",
          metaphor: "快递外箱写上「内含已碎花瓶」",
          body: "fmt.Errorf(\"...: %w\", err) 包装后，errors.Is/As 仍能沿链找到底层错误。不要只 %v 丢掉链。",
          codeKeys: ["wrap"],
          run: function () { reset(); wrapOnce(); wrapOnce(); }
        },
        {
          title: "errors.Is",
          metaphor: "开箱验货：还是不是原来那个错？",
          body: "Is 沿 Unwrap 链比较哨兵。适合 if errors.Is(err, ErrNotFound)。",
          codeKeys: ["is"],
          run: function () { reset(); wrapOnce(); errorsIs(); }
        },
        {
          title: "errors.As",
          metaphor: "取出箱内具体物件看型号",
          body: "As 把链中某个错误断言到具体类型指针，可读字段（如 StatusCode、Key）。",
          codeKeys: ["as"],
          run: function () { reset(); wrapOnce(); wrapOnce(); errorsAs(); }
        }
      ]
    });
  }

  reset();
})();

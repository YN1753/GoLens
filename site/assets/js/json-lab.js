(function () {
  const M = window.GoLens || window;
  const stage = document.getElementById("json-stage");
  const logEl = document.getElementById("json-log");
  const topicSel = document.getElementById("json-topic");
  const runBtn = document.getElementById("json-run");
  const resetBtn = document.getElementById("json-reset");
  const storyRoot = document.getElementById("json-story");
  if (!stage) return;

  const TOPICS = {
    tags: {
      title: "struct tag",
      lines: [
        "type User struct { Name string `json:\"name\"` }",
        "Marshal → {\"name\":\"...\"}",
        "Unmarshal 按 tag 对齐字段"
      ],
      tip: "字段名与 JSON 键解耦"
    },
    omitempty: {
      title: "omitempty / 嵌套",
      lines: [
        "`json:\"age,omitempty\"` 零值省略",
        "嵌套 struct / slice 按字段递归",
        "指针字段 nil 时通常省略或 null"
      ],
      tip: "API 契约要明确哪些字段可缺省"
    },
    custom: {
      title: "自定义 MarshalJSON",
      lines: [
        "实现 Marshaler/Unmarshaler",
        "兼容旧格式、敏感字段脱敏",
        "注意不要死递归（类型别名）"
      ],
      tip: "复杂契约用自定义编解码"
    },
    stream: {
      title: "Encoder / Decoder",
      lines: [
        "json.NewEncoder(w).Encode(v)",
        "json.NewDecoder(r).Decode(&v)",
        "流式处理大 JSON，避免整段字符串"
      ],
      tip: "HTTP Body 常用 Encoder/Decoder"
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

  function reset() {
    if (logEl) logEl.innerHTML = "";
    setCode(topicSel.value);
    render();
  }
  function run() {
    const t = TOPICS[topicSel.value] || TOPICS.tags;
    setCode(topicSel.value);
    log("MARK", t.title + " — " + t.tip);
    t.lines.forEach(function (l, i) {
      log(i === t.lines.length - 1 ? "WAKE" : "SEND", l);
    });
    render();
  }
  function render() {
    const t = TOPICS[topicSel.value] || TOPICS.tags;
    let rows = "";
    t.lines.forEach(function (l) {
      rows += '<div class="g-block" data-state="runnable" style="margin:4px 0;width:100%;cursor:default"><span>' + l + "</span></div>";
    });
    stage.innerHTML = '<div class="rt-box"><div class="rt-title">' + t.title + "</div>" + rows +
      '<div style="margin-top:8px;font-size:13px;color:var(--muted)">' + t.tip + "</div></div>";
  }
  topicSel.addEventListener("change", function () { setCode(topicSel.value); render(); });
  runBtn.addEventListener("click", run);
  resetBtn.addEventListener("click", reset);

  if (storyRoot && M.StoryGuide) {
    new M.StoryGuide({
      root: storyRoot,
      codePanel: storyRoot.querySelector(".code-track"),
      levels: [
        { title: "encoding/json", metaphor: "把箱子打成统一包裹单", body: "Marshal/Unmarshal 是最常用入口；tag 控制字段名。", codeKeys: ["tags"], run: function () { topicSel.value = "tags"; reset(); run(); } },
        { title: "omitempty", metaphor: "空箱子不贴面单", body: "零值字段省略；注意 false/0 也会被省略。", codeKeys: ["omitempty"], run: function () { topicSel.value = "omitempty"; reset(); run(); } },
        { title: "自定义编解码", metaphor: "特殊货物特殊包装", body: "MarshalJSON 适合兼容与脱敏。", codeKeys: ["custom"], run: function () { topicSel.value = "custom"; reset(); run(); } },
        { title: "流式 API", metaphor: "传送带边走边读", body: "Encoder/Decoder 适合 HTTP。", codeKeys: ["stream"], run: function () { topicSel.value = "stream"; reset(); run(); } }
      ]
    });
  }
  reset();
  log("MARK", "JSON：tag、零值、自定义、流式");
})();

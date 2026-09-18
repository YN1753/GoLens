(function () {
  const M = window.GoLens || window;
  const stage = document.getElementById("string-stage");
  const logEl = document.getElementById("string-log");
  const sampleBtns = document.querySelectorAll("[data-str-sample]");
  const byteBtn = document.getElementById("str-bytes");
  const runeBtn = document.getElementById("str-runes");
  const rangeBtn = document.getElementById("str-range");
  const resetBtn = document.getElementById("str-reset");
  const storyRoot = document.getElementById("string-story");
  if (!stage) return;

  const SAMPLES = {
    ascii: "Go",
    cjk: "你好",
    emoji: "A👍B"
  };

  let text = SAMPLES.ascii;
  let view = "text";
  let rangeI = -1;

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

  function utf8Len(s) {
    return new TextEncoder().encode(s).length;
  }

  function runeCount(s) {
    return Array.from(s).length;
  }

  function reset() {
    text = SAMPLES.ascii;
    view = "text";
    rangeI = -1;
    if (logEl) logEl.innerHTML = "";
    setCode("string");
    render();
    log("MARK", "默认样例 " + JSON.stringify(text));
  }

  function showBytes() {
    view = "bytes";
    rangeI = -1;
    setCode("bytes");
    const enc = Array.from(new TextEncoder().encode(text));
    log("SEND", "[]byte 长度=" + enc.length + " → " + enc.join(","));
    render();
  }

  function showRunes() {
    view = "runes";
    rangeI = -1;
    setCode("runes");
    const rs = Array.from(text);
    log("SEND", "[]rune 长度=" + rs.length + " → " + rs.join(" | "));
    render();
  }

  function stepRange() {
    const rs = Array.from(text);
    const enc = new TextEncoder();
    let byteIdx = 0;
    for (let i = 0; i < rangeI + 1 && i < rs.length; i++) {
      byteIdx += enc.encode(rs[i]).length;
    }
    if (rangeI + 1 >= rs.length) {
      // allow stepping to end once
    }
    rangeI++;
    if (rangeI >= rs.length) {
      rangeI = rs.length - 1;
      // recompute byte index for current
      byteIdx = 0;
      for (let i = 0; i <= rangeI; i++) byteIdx += enc.encode(rs[i]).length;
      log("BLOCK", "range 已到末尾");
      render();
      return;
    }
    view = "range";
    setCode("range");
    const r = rs[rangeI];
    const bytesOf = enc.encode(r).length;
    byteIdx = 0;
    for (let i = 0; i <= rangeI; i++) byteIdx += enc.encode(rs[i]).length;
    const startIdx = byteIdx - bytesOf;
    log("WAKE", "range i=" + startIdx + " r=" + JSON.stringify(r) + "（该 rune " + bytesOf + " 字节）");
    render();
  }

  function cell(textVal, active) {
    return (
      '<div style="min-width:40px;height:40px;border:1.5px solid ' +
      (active ? "#1f6b5a" : "var(--line-strong)") +
      ";border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:13px;background:" +
      (active ? "var(--accent-dim)" : "var(--surface)") +
      ';color:var(--ink-strong)">' +
      textVal +
      "</div>"
    );
  }

  function render() {
    const bytes = Array.from(new TextEncoder().encode(text));
    const runes = Array.from(text);
    let byteCells = "";
    bytes.forEach(function (b, i) {
      byteCells += cell(String(b), false);
    });
    let runeCells = "";
    runes.forEach(function (r, i) {
      runeCells += cell(r, view === "range" && i === rangeI);
    });

    stage.innerHTML =
      '<div class="rt-box" style="margin-bottom:10px"><div class="rt-title">string 样例</div>' +
      '<div style="font-family:var(--font-mono);font-size:16px">' + JSON.stringify(text) + "</div>" +
      '<div style="margin-top:6px;font-family:var(--font-mono);font-size:12px;color:var(--muted)">len(s) 字节=' +
      utf8Len(text) + " · rune 数=" + runeCount(text) + "</div></div>" +
      '<div class="rt-box" style="margin-bottom:10px"><div class="rt-title">[]byte 视图</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:6px">' + (byteCells || "—") + "</div></div>" +
      '<div class="rt-box"><div class="rt-title">[]rune / range 视图</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:6px">' + (runeCells || "—") + "</div></div>";
  }

  sampleBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      text = SAMPLES[btn.getAttribute("data-str-sample")] || text;
      view = "text";
      rangeI = -1;
      setCode("string");
      log("BIND", "切换样例 " + JSON.stringify(text) + " 字节=" + utf8Len(text) + " rune=" + runeCount(text));
      render();
    });
  });
  if (byteBtn) byteBtn.addEventListener("click", showBytes);
  if (runeBtn) runeBtn.addEventListener("click", showRunes);
  if (rangeBtn) rangeBtn.addEventListener("click", stepRange);
  if (resetBtn) resetBtn.addEventListener("click", reset);

  if (storyRoot && M.StoryGuide) {
    new M.StoryGuide({
      root: storyRoot,
      codePanel: storyRoot.querySelector(".code-track"),
      levels: [
        {
          title: "string 是只读字节序列",
          metaphor: "一卷只读胶片：内容是 UTF-8 字节",
          body: "len(s) 返回字节数不是字符数。底层数据不可变；修改通常生成新 string。",
          codeKeys: ["string"],
          run: function () {
            reset();
            sampleBtns[0] && sampleBtns[0].click();
          }
        },
        {
          title: "[]byte 与 []rune",
          metaphor: "按底片格子拆 vs 按「可见字」拆",
          body: "[]byte 保持 UTF-8 字节；[]rune 按 Unicode 码点。中文/emoji 时两者长度差明显。",
          codeKeys: ["bytes", "runes"],
          run: function () {
            text = SAMPLES.cjk;
            showBytes();
            showRunes();
          }
        },
        {
          title: "range string",
          metaphor: "翻页按「字」不是按「字节格」",
          body: "for i, r := range s 中 i 是字节下标，r 是 rune。截断 UTF-8 会产生乱码。",
          codeKeys: ["range"],
          run: function () {
            text = SAMPLES.cjk;
            stepRange();
            stepRange();
          }
        },
        {
          title: "面试点",
          metaphor: "先问长度是字节还是字符",
          body: "常见坑：用 len 判断字符数、用 s[i] 切中文、频繁 + 拼接 string。拼接用 strings.Builder。",
          codeKeys: ["string"],
          run: function () { setCode("string"); }
        }
      ]
    });
  }

  reset();
})();

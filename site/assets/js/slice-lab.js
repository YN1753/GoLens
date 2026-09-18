(function () {
  const M = window.GoLens || window;
  const stage = document.getElementById("slice-stage");
  const logEl = document.getElementById("slice-log");
  const appendBtn = document.getElementById("slice-append");
  const subsliceBtn = document.getElementById("slice-sub");
  const writeBtn = document.getElementById("slice-write");
  const resetBtn = document.getElementById("slice-reset");
  const capSel = document.getElementById("slice-write-idx");
  const codePanel = document.getElementById("slice-code");
  const storyRoot = document.getElementById("slice-story");
  if (!stage) return;

  let state = null;

  function setCode(key) {
    const panel = codePanel || document.querySelector("#slice-story .code-track");
    if (!panel) return;
    panel.querySelectorAll(".code-line").forEach(function (line) {
      line.classList.toggle("is-active", line.getAttribute("data-code-key") === key);
    });
  }

  function log(tag, msg) {
    if (M.logLine) M.logLine(logEl, tag, msg);
  }

  function reset() {
    state = {
      arr: [10, null, null, null, null, null, null, null],
      len: 1,
      cap: 4,
      alias: null, // {start, len, cap} or null
      nextVal: 20
    };
    if (logEl) logEl.innerHTML = "";
    setCode("make");
    render();
    log("MARK", "s := make([]int, 1, 4) → len=1 cap=4");
  }

  function doAppend() {
    const v = state.nextVal++;
    if (state.len < state.cap) {
      state.arr[state.len] = v;
      state.len++;
      setCode("append_inplace");
      log("SEND", "append 就地写入 arr[" + (state.len - 1) + "]=" + v + " → len=" + state.len + " cap=" + state.cap);
    } else {
      const newCap = state.cap === 0 ? 1 : state.cap * 2;
      const next = new Array(newCap);
      for (let i = 0; i < state.len; i++) next[i] = state.arr[i];
      next[state.len] = v;
      state.arr = next;
      state.len++;
      state.cap = newCap;
      state.alias = null; // old array abandoned
      setCode("append_grow");
      log("BLOCK", "扩容：新底层数组 cap=" + newCap + "，旧数组不再共享；append " + v);
    }
    render();
  }

  function doSubslice() {
    // s = a[1:3] style alias on current base
    const start = Math.min(1, Math.max(0, state.len - 1));
    const end = Math.min(state.len, start + 2);
    state.alias = { start: start, end: end, cap: state.cap - start };
    setCode("subslice");
    log("BIND", "t := s[" + start + ":" + end + "] 与 s 共享底层数组（写 t 会影响 s）");
    render();
  }

  function doWrite() {
    const idx = Number(capSel.value);
    const v = state.nextVal++;
    if (state.alias) {
      const aliasLen = state.alias.end - state.alias.start;
      if (idx >= 0 && idx < aliasLen) {
        const abs = state.alias.start + idx;
        state.arr[abs] = v;
        setCode("write_shared");
        log("PANIC", "t[" + idx + "]=" + v + " 写入共享槽 arr[" + abs + "]，s 也会看到变化");
      } else {
        setCode("write_shared");
        log("BLOCK", "t 下标越界（t 的 len=" + aliasLen + "），真实代码会 panic");
      }
    } else if (idx >= 0 && idx < state.len) {
      state.arr[idx] = v;
      setCode("write_own");
      log("SEND", "s[" + idx + "] = " + v);
    } else {
      log("BLOCK", "下标超出 len，运行时 panic");
    }
    render();
  }

  function slotHtml(i) {
    const inLen = i < state.len;
    const inCap = i < state.cap;
    const inAlias = state.alias && i >= state.alias.start && i < state.alias.end;
    let border = "var(--line-strong)";
    let bg = "var(--surface)";
    if (inAlias) {
      border = "#a67c00";
      bg = "var(--warn-dim)";
    } else if (inLen) {
      border = "#1f6b5a";
      bg = "var(--accent-dim)";
    } else if (inCap) {
      border = "var(--accent)";
      bg = "var(--surface-2)";
    }
    const val = state.arr[i] == null ? "·" : state.arr[i];
    return (
      '<div class="slice-slot" style="width:44px;height:44px;border:1.5px solid ' +
      border +
      ";border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:13px;background:" +
      bg +
      ';color:var(--ink-strong)">' +
      val +
      "</div>"
    );
  }

  function render() {
    let slots = "";
    const showCap = Math.max(state.cap, state.len, 4) + 2;
    for (let i = 0; i < showCap; i++) slots += slotHtml(i);

    let aliasLine = '<div style="color:var(--faint);font-family:var(--font-mono);font-size:12px">无别名切片</div>';
    if (state.alias) {
      aliasLine =
        '<div style="font-family:var(--font-mono);font-size:12px;color:var(--warn)">t 共享槽 [' +
        state.alias.start +
        "," +
        state.alias.end +
        ")  — 写入会同步影响 s</div>";
    }

    stage.innerHTML =
      '<div class="rt-box"><div class="rt-title">底层数组 · len=' +
      state.len +
      " · cap=" +
      state.cap +
      "</div>" +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
      slots +
      "</div>" +
      '<div class="legend" style="margin-top:10px">' +
      '<span><i style="background:var(--accent-dim);border:1px solid #1f6b5a"></i>len</span>' +
      '<span><i style="background:var(--surface-2);border:1px solid var(--accent)"></i>cap 余量</span>' +
      '<span><i style="background:var(--warn-dim);border:1px solid #a67c00"></i>别名区间</span>' +
      "</div>" +
      '<div style="margin-top:8px">' +
      aliasLine +
      "</div></div>";
  }

  appendBtn.addEventListener("click", doAppend);
  subsliceBtn.addEventListener("click", doSubslice);
  writeBtn.addEventListener("click", doWrite);
  resetBtn.addEventListener("click", reset);

  if (storyRoot && M.StoryGuide) {
    new M.StoryGuide({
      root: storyRoot,
      codePanel: storyRoot.querySelector(".code-track"),
      levels: [
        {
          title: "slice 是「头 + 长度 + 容量」",
          metaphor: "头 = 快递柜编号，len = 已放件数，cap = 总格数",
          body: "切片不是数组本身，而是一小段描述：指向底层数组的指针、len、cap。len 决定能安全访问下标，cap 决定不扩容时还能 append 多少。",
          codeKeys: ["make"],
          run: function () {
            reset();
            setCode("make");
          }
        },
        {
          title: "append：先塞空格，塞满再搬家",
          metaphor: "柜子还有空位就直接放；满了整租更大柜并搬家",
          body: "len < cap 时就地写。否则运行时分配更大数组（常见 cap 翻倍），拷贝旧数据，再写入新元素。搬家后旧数组可能被回收。",
          codeKeys: ["append_inplace", "append_grow"],
          run: function () {
            reset();
            doAppend();
            doAppend();
            doAppend();
            doAppend(); // trigger grow
          }
        },
        {
          title: "切片再切片：可能共享底层数组",
          metaphor: "从同一排柜子划出子范围，共用同一排柜门",
          body: "t := s[i:j] 通常与 s 共享数组。向 t 写入，s 在重叠区间也能看到——这是「诡异修改」的经典来源。",
          codeKeys: ["subslice"],
          run: function () {
            reset();
            doAppend();
            doAppend();
            doAppend();
            doSubslice();
            capSel.value = "0";
            doWrite();
          }
        },
        {
          title: "写共享槽：演示互相影响",
          metaphor: "两个人用同一格柜，一人改了另一人以为闹鬼",
          body: "在别名有效下标内写入（如 t[0]），观察同一带颜色的槽位变化。越界写在真实 Go 里会 panic。需要隔离时用 copy。",
          codeKeys: ["write_shared"],
          run: function () {
            reset();
            doAppend();
            doAppend();
            doAppend();
            doSubslice();
            capSel.value = "0";
            doWrite();
          }
        }
      ]
    });
  }

  reset();
})();

(function () {
  const M = window.GoLens || window;
  const stage = document.getElementById("select-stage");
  const logEl = document.getElementById("select-log");
  const sendA = document.getElementById("sel-send-a");
  const sendB = document.getElementById("sel-send-b");
  const runSel = document.getElementById("sel-run");
  const defChk = document.getElementById("sel-default");
  const resetBtn = document.getElementById("sel-reset");
  const storyRoot = document.getElementById("select-story");
  if (!stage) return;

  let state = null;

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
    state = { a: [], b: [], seq: 0 };
    if (logEl) logEl.innerHTML = "";
    setCode("select");
    render();
    log("MARK", "两个 channel 就绪；select 同时等多路");
  }

  function sendTo(key) {
    state.seq++;
    const v = (key === "a" ? "A" : "B") + state.seq;
    if (state[key].length >= 1) {
      log("BLOCK", key.toUpperCase() + " 已满（cap=1），再发会阻塞真实代码");
      render();
      return;
    }
    state[key].push(v);
    log("SEND", "向 " + key.toUpperCase() + " 发送 " + v);
    setCode("send");
    render();
  }

  function runSelect() {
    const useDef = defChk && defChk.checked;
    const aReady = state.a.length > 0;
    const bReady = state.b.length > 0;
    setCode(aReady && bReady ? "race" : useDef ? "default" : "select");
    if (aReady && bReady) {
      const pickA = Math.random() < 0.5;
      const key = pickA ? "a" : "b";
      const v = state[key].shift();
      log("WAKE", "A/B 都就绪 → 伪随机选中 " + key.toUpperCase() + " 取出 " + v);
    } else if (aReady) {
      const v = state.a.shift();
      log("WAKE", "仅 A 就绪 → case <-a 取出 " + v);
    } else if (bReady) {
      const v = state.b.shift();
      log("WAKE", "仅 B 就绪 → case <-b 取出 " + v);
    } else if (useDef) {
      log("BIND", "都未就绪 → 走 default（不阻塞）");
    } else {
      log("BLOCK", "都未就绪且无 default → select 阻塞等待");
    }
    render();
  }

  function chBox(name, arr) {
    const cells = arr.length
      ? arr.map(function (v) {
          return '<span class="chip chip-accent">' + v + "</span>";
        }).join("")
      : '<span style="color:var(--faint);font-size:12px">empty</span>';
    return (
      '<div class="rt-box"><div class="rt-title">chan ' + name.toUpperCase() + " · cap=1 · n=" + arr.length + "</div>" +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;min-height:36px">' + cells + "</div></div>"
    );
  }

  function render() {
    stage.innerHTML =
      '<div style="display:grid;gap:10px">' +
      chBox("a", state.a) +
      chBox("b", state.b) +
      '<div class="rt-box"><div class="rt-title">select 模式</div>' +
      '<div style="font-family:var(--font-mono);font-size:12px;color:var(--muted)">' +
      (defChk && defChk.checked ? "含 default：永不空等" : "无 default：至少一路就绪才返回") +
      "</div></div></div>";
  }

  sendA.addEventListener("click", function () { sendTo("a"); });
  sendB.addEventListener("click", function () { sendTo("b"); });
  runSel.addEventListener("click", runSelect);
  resetBtn.addEventListener("click", reset);
  if (defChk) defChk.addEventListener("change", render);

  if (storyRoot && M.StoryGuide) {
    new M.StoryGuide({
      root: storyRoot,
      codePanel: storyRoot.querySelector(".code-track"),
      levels: [
        {
          title: "select = 多路等待",
          metaphor: "同时盯着好几个取餐口，谁先好拿谁",
          body: "select 同时等待多个 channel 收发。运行时挑一个已就绪的 case；多个就绪时伪随机，避免饿死。",
          codeKeys: ["select"],
          run: function () { reset(); setCode("select"); }
        },
        {
          title: "default：不堵车出口",
          metaphor: "都没好就先走人，不站门口干等",
          body: "带 default 时，若所有通信 case 都未就绪，立刻执行 default，常用于非阻塞尝试。",
          codeKeys: ["default"],
          run: function () {
            reset();
            if (defChk) defChk.checked = true;
            runSelect();
          }
        },
        {
          title: "多路同时就绪",
          metaphor: "两个窗口同时叫号，随机叫一个",
          body: "先向 A、B 各发一个，再 select。多次运行会看到 A/B 都可能被选中——这不是 bug。",
          codeKeys: ["race"],
          run: function () {
            reset();
            if (defChk) defChk.checked = false;
            sendTo("a");
            sendTo("b");
            runSelect();
            // refill both so second select is again multi-ready
            sendTo("a");
            sendTo("b");
            runSelect();
          }
        },
        {
          title: "timer 也是一条 case",
          metaphor: "外卖超时退款按钮和取餐窗口一起等",
          body: "常见写法：`case <-time.After(d):` 做超时。注意循环里重复 time.After 可能造成短时泄漏，工程上可用 Timer.Stop。",
          codeKeys: ["select", "timer"],
          run: function () { setCode("timer"); log("MARK", "timer：超时与业务 channel 同级等待"); }
        }
      ]
    });
  }

  reset();
})();

(function () {
  const M = window.GoLens || window;
  const stage = document.getElementById("defer-stage");
  const logEl = document.getElementById("defer-log");
  const pushBtn = document.getElementById("defer-push");
  const runBtn = document.getElementById("defer-run");
  const panicBtn = document.getElementById("defer-panic");
  const recoverChk = document.getElementById("defer-recover");
  const resetBtn = document.getElementById("defer-reset");
  const storyRoot = document.getElementById("defer-story");
  const codePanel = document.getElementById("defer-code");
  if (!stage) return;

  let stack = [];
  let seq = 0;
  let finished = [];

  function setCode(key) {
    const panel = codePanel || (storyRoot && storyRoot.querySelector(".code-track"));
    if (!panel) return;
    panel.querySelectorAll(".code-line").forEach(function (line) {
      line.classList.toggle("is-active", line.getAttribute("data-code-key") === key);
    });
  }

  function log(tag, msg) {
    if (M.logLine) M.logLine(logEl, tag, msg);
  }

  function reset() {
    stack = [];
    finished = [];
    seq = 0;
    if (logEl) logEl.innerHTML = "";
    setCode("push");
    render();
    log("MARK", "defer 就绪：后进先出 LIFO");
  }

  function push() {
    seq++;
    stack.push({ id: seq, label: "defer#" + seq });
    setCode("push");
    log("BIND", "注册 " + "defer#" + seq + "（函数返回时才跑）");
    render();
  }

  function runStack(panicMode) {
    if (!stack.length) {
      log("BLOCK", "没有 defer");
      return;
    }
    if (panicMode) {
      setCode("panic");
      log("PANIC", "发生 panic，开始逆序执行 defer");
    } else {
      setCode("run");
      log("MARK", "函数返回 → LIFO 执行 defer");
    }
    finished = [];
    const recover = recoverChk && recoverChk.checked;
    while (stack.length) {
      const d = stack.pop();
      finished.push(d);
      log("WAKE", "执行 " + d.label);
    }
    if (panicMode) {
      if (recover) {
        setCode("recover");
        log("WAKE", "defer 中 recover() 捕获 panic，函数可正常返回");
      } else {
        log("PANIC", "未 recover，panic 继续向上层 goroutine/进程冒泡");
      }
    }
    render();
  }

  function render() {
    let stackHtml = "";
    if (!stack.length) stackHtml = '<span style="color:var(--faint);font-size:12px">空栈</span>';
    for (let i = stack.length - 1; i >= 0; i--) {
      stackHtml +=
        '<div class="g-block" data-state="runnable" style="margin:4px 0;cursor:default">↑ ' +
        stack[i].label +
        (i === stack.length - 1 ? " · 栈顶" : "") +
        "</div>";
    }
    let doneHtml = finished
      .map(function (d) {
        return '<span class="chip chip-ok">' + d.label + "</span>";
      })
      .join(" ");

    stage.innerHTML =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
      '<div class="rt-box"><div class="rt-title">defer 栈（LIFO）</div>' +
      '<div style="font-family:var(--font-mono);font-size:12px">' + stackHtml + "</div></div>" +
      '<div class="rt-box"><div class="rt-title">已执行</div><div style="display:flex;flex-wrap:wrap;gap:6px">' +
      (doneHtml || '<span style="color:var(--faint);font-size:12px">—</span>') +
      "</div></div></div>";
  }

  pushBtn.addEventListener("click", push);
  runBtn.addEventListener("click", function () {
    runStack(false);
  });
  panicBtn.addEventListener("click", function () {
    runStack(true);
  });
  resetBtn.addEventListener("click", reset);

  if (storyRoot && M.StoryGuide) {
    new M.StoryGuide({
      root: storyRoot,
      codePanel: storyRoot.querySelector(".code-track"),
      levels: [
        {
          title: "interface 是「方法集 + 数据」",
          metaphor: "统一插头：两孔规格（类型指针）+ 插座本体（数据）",
          body: "非空接口可理解为 itab（类型/方法）+ data。空接口 eface 只有类型与数据。调用接口方法是动态派发，有额外间接层。",
          codeKeys: ["iface"],
          run: function () {
            reset();
            setCode("iface");
          }
        },
        {
          title: "defer 注册不等于立刻执行",
          metaphor: "写在便利贴上的下班任务，到点才撕",
          body: "defer 参数在注册时求值；函数体在返回（或 panic 展开）时按 LIFO 执行。循环里 defer 可能堆积。",
          codeKeys: ["push"],
          run: function () {
            reset();
            push();
            push();
            push();
          }
        },
        {
          title: "run：LIFO 弹出",
          metaphor: "一摞盘子从上往下取",
          body: "点「运行」，观察 defer#3 → #2 → #1。释放资源常用 defer Unlock/Close。",
          codeKeys: ["run"],
          run: function () {
            reset();
            push();
            push();
            push();
            runStack(false);
          }
        },
        {
          title: "panic 与 recover",
          metaphor: "事故后仍要走完善后清单；有人现场吃掉异常",
          body: "panic 仍会执行已注册 defer。在 defer 中 recover 可止住 panic；不 recover 则继续上抛。",
          codeKeys: ["panic", "recover"],
          run: function () {
            reset();
            push();
            push();
            if (recoverChk) recoverChk.checked = true;
            runStack(true);
          }
        }
      ]
    });
  }

  reset();
})();

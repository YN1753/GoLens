(function () {
  const M = window.GoLens || window;
  const stage = document.getElementById("drill-stage");
  const logEl = document.getElementById("drill-log");
  const qSel = document.getElementById("drill-q");
  const optWrap = document.getElementById("drill-opts");
  const nextBtn = document.getElementById("drill-next");
  const resetBtn = document.getElementById("drill-reset");
  const storyRoot = document.getElementById("drill-story");
  if (!stage) return;

  const QS = [
    {
      id: "q1",
      topic: "GMP",
      q: "GOMAXPROCS=2 时，本地队列很长，空闲 P 会怎么做？",
      opts: ["直接 panic", "work stealing / 查全局队列", "新建 OS 线程无限开", "丢弃多余 G"],
      answer: 1,
      why: "调度器优先本地/全局，再偷其他 P 的一半，避免饿死。"
    },
    {
      id: "q2",
      topic: "Channel",
      q: "cap=0 的 channel，接收方已在 recvq 等待，发送方会？",
      opts: ["入 buf 再返回", "直接交接并唤醒接收方", "panic", "静默丢弃"],
      answer: 1,
      why: "无缓冲时优先与等待接收者直接交接（会合语义）。"
    },
    {
      id: "q3",
      topic: "GC",
      q: "并发标记时写屏障主要防什么？",
      opts: ["栈溢出", "黑对象指向未扫描白对象导致漏标", "map 扩容", "channel 死锁"],
      answer: 1,
      why: "维持 tri-color 不变式；必要时把目标标灰。"
    },
    {
      id: "q4",
      topic: "Context",
      q: "父 Context cancel 后，子树会？",
      opts: ["不受影响", "级联 Done()", "只取消第一个子", "进程退出"],
      answer: 1,
      why: "取消信号向子树传播；子不影响父。"
    },
    {
      id: "q5",
      topic: "string",
      q: "len(\"你好\") 在 Go 中是？",
      opts: ["2", "6（UTF-8 字节）", "1", "与 rune 数永远一致"],
      answer: 1,
      why: "len 是字节；中文常见 3 字节/字。"
    }
  ];

  let idx = 0;
  let picked = -1;
  let score = 0;
  let answered = [];

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
    idx = 0;
    picked = -1;
    score = 0;
    answered = [];
    if (logEl) logEl.innerHTML = "";
    setCode("read");
    render();
    log("MARK", "综合演练：串联前几章结论");
  }

  function pick(i) {
    const q = QS[idx];
    picked = i;
    const ok = i === q.answer;
    if (ok) score++;
    answered[idx] = { pick: i, ok: ok };
    setCode(ok ? "ok" : "review");
    log(ok ? "WAKE" : "BLOCK", ok ? "答对：" + q.why : "更佳选项：" + q.opts[q.answer] + " — " + q.why);
    render();
  }

  function next() {
    if (idx < QS.length - 1) {
      idx++;
      picked = -1;
      setCode("read");
      log("MARK", "下一题 · " + QS[idx].topic);
      render();
      return;
    }
    log("SEND", "演练结束：得分 " + score + " / " + QS.length);
    setCode("score");
    render(true);
  }

  function render(done) {
    const q = QS[idx];
    let opts = "";
    q.opts.forEach(function (o, i) {
      let cls = "runnable";
      if (picked >= 0) {
        if (i === q.answer) cls = "running";
        else if (i === picked) cls = "blocked";
        else cls = "done";
      }
      opts +=
        '<button type="button" class="g-block" data-state="' + cls + '" data-opt="' + i +
        '" style="margin:4px 0;width:100%;text-align:left">' +
        String.fromCharCode(65 + i) + ". " + o + "</button>";
    });
    stage.innerHTML =
      '<div class="rt-box"><div class="rt-title">' + (done ? "结果" : "Q" + (idx + 1) + " · " + q.topic) + "</div>" +
      (done
        ? '<div style="font-family:var(--font-mono);font-size:14px">得分 ' + score + " / " + QS.length + "</div>"
        : '<div style="margin-bottom:8px">' + q.q + "</div>" + opts) +
      "</div>";
    if (!done) {
      stage.querySelectorAll("[data-opt]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          pick(Number(btn.getAttribute("data-opt")));
        });
      });
    }
  }

  nextBtn.addEventListener("click", next);
  resetBtn.addEventListener("click", reset);

  if (storyRoot && M.StoryGuide) {
    new M.StoryGuide({
      root: storyRoot,
      codePanel: storyRoot.querySelector(".code-track"),
      levels: [
        {
          title: "怎么用这章",
          metaphor: "考前模拟：先口述再对照",
          body: "每题先自己答，再看解析里串起哪一章（GMP / Channel / GC / Context / string）。",
          codeKeys: ["read"],
          run: function () { reset(); setCode("read"); }
        },
        {
          title: "示例：调度",
          metaphor: "空窗口不能干等",
          body: "空闲 P 查全局、work stealing——回到 GMP Lab 的偷取场景。",
          codeKeys: ["ok"],
          run: function () { reset(); pick(1); }
        },
        {
          title: "示例：Channel 会合",
          metaphor: "门对门交接，不进柜",
          body: "无缓冲 + 已有接收方 → 直接交接，对应 Channel Lab 光束。",
          codeKeys: ["ok"],
          run: function () {
            idx = 1;
            picked = -1;
            render();
            pick(1);
          }
        },
        {
          title: "面试收口",
          metaphor: "把散点串成线",
          body: "答「高并发服务」可串：GMP + netpoller；答「正确性」串 channel/sync/ctx；答「性能」串逃逸/GC/pprof。",
          codeKeys: ["score"],
          run: function () { setCode("score"); }
        }
      ]
    });
  }

  reset();
})();

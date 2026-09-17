(function () {
  const M = window.GoLens;
  const stage = document.getElementById("ch-stage");
  const logEl = document.getElementById("ch-log");
  const capSel = document.getElementById("ch-cap");
  const sendBtn = document.getElementById("ch-send");
  const recvBtn = document.getElementById("ch-recv");
  const closeBtn = document.getElementById("ch-close");
  const resetBtn = document.getElementById("ch-reset");
  const stateChip = document.getElementById("ch-state-chip");
  const codePanel = document.getElementById("ch-code");
  const timelineEl = document.querySelector("[data-ch-timeline]");
  if (!stage || !M) return;

  const timeline = new M.Timeline();
  let tlCtrl = null;
  let state = null;
  let seq = 0;
  let lastActionCode = null;

  const CODE = {
    send_handoff: "chansend: if recvq != nil → send directly to waiting receiver",
    send_buf: "chansend: enqueue into ring buf[sendx]; sendx = (sendx+1)%cap",
    send_park: "chansend: buffer full → park sender on sendq",
    send_closed: "chansend: closed channel → panic",
    recv_sendq: "chanrecv: wake sender; copy into freed slot (or direct handoff)",
    recv_buf: "chanrecv: take buf[recvx]; recvx = (recvx+1)%cap",
    recv_zero: "chanrecv: closed && empty → zero value, ok=false",
    recv_park: "chanrecv: no data → park receiver on recvq",
    close: "closechan: mark closed; wake recvq (zeros); parked senders panic"
  };

  function setCode(key) {
    lastActionCode = key;
    if (!codePanel) return;
    codePanel.querySelectorAll(".code-line").forEach(function (line) {
      line.classList.toggle("is-active", line.getAttribute("data-code-key") === key);
    });
  }

  function log(tag, msg) {
    M.logLine(logEl, tag, msg);
  }

  function nextVal() {
    seq++;
    return "v" + seq;
  }

  function cloneState(s) {
    return {
      cap: s.cap,
      buf: s.buf.slice(),
      head: s.head,
      sendx: s.sendx,
      recvx: s.recvx,
      count: s.count,
      sendq: s.sendq.slice(),
      recvq: s.recvq.slice(),
      closed: s.closed,
      seq: s.seq,
      action: s.action || ""
    };
  }

  function pushHistory(label) {
    state.seq = seq;
    state.action = label;
    timeline.push(cloneState(state), label);
    if (tlCtrl) tlCtrl.sync();
  }

  function reset(keepLog) {
    const cap = Number(capSel.value);
    state = {
      cap: cap,
      buf: new Array(cap).fill(null),
      head: 0,
      sendx: 0,
      recvx: 0,
      count: 0,
      sendq: [],
      recvq: [],
      closed: false,
      action: "init"
    };
    seq = 0;
    timeline.frames = [];
    timeline.index = -1;
    if (!keepLog && logEl) logEl.innerHTML = "";
    setCode(null);
    pushHistory("创建 cap=" + cap);
    render();
    log("STW", "创建 channel cap=" + cap + (cap === 0 ? "（同步会合）" : ""));
  }

  function dequeueHead() {
    const val = state.buf[state.recvx];
    state.buf[state.recvx] = null;
    state.recvx = (state.recvx + 1) % state.cap;
    state.count--;
    return val;
  }

  function enqueue(val) {
    state.buf[state.sendx] = val;
    state.sendx = (state.sendx + 1) % state.cap;
    state.count++;
  }

  function doSend() {
    if (state.closed) {
      setCode("send_closed");
      log("PANIC", "send on closed channel → panic");
      pushHistory("send panic");
      render();
      return;
    }

    if (state.recvq.length) {
      const r = state.recvq.shift();
      const val = nextVal();
      setCode("send_handoff");
      log("WAKE", "recvq 有 " + r + "：直接交接 " + val + "（光束）");
      pushHistory("direct send → " + r);
      render({ beam: val, to: "recvq" });
      return;
    }

    if (state.cap === 0) {
      const me = "S" + nextVal();
      state.sendq.push(me);
      setCode("send_park");
      log("BLOCK", "无缓冲：发送方 " + me + " 挂入 sendq");
      pushHistory("park sender " + me);
      render();
      return;
    }

    if (state.count < state.cap) {
      const val = nextVal();
      const slotIdx = state.sendx;
      enqueue(val);
      setCode("send_buf");
      log("SEND", "写入 ring slot[" + slotIdx + "] = " + val + "（count=" + state.count + "/" + state.cap + "）");
      pushHistory("buf write " + val);
      render({ fillSlot: slotIdx });
      return;
    }

    const me = "S" + nextVal();
    state.sendq.push(me);
    setCode("send_park");
    log("BLOCK", "环满：发送方 " + me + " 挂入 sendq");
    pushHistory("park sender " + me);
    render();
  }

  function doRecv() {
    if (state.sendq.length) {
      const s = state.sendq.shift();
      if (state.cap === 0) {
        setCode("recv_sendq");
        log("WAKE", "与等待发送方 " + s + " 直接交接");
        pushHistory("handoff recv from " + s);
        render({ beam: "handoff", to: "sender" });
        return;
      }
      const received = dequeueHead();
      const sent = nextVal();
      enqueue(sent);
      setCode("recv_sendq");
      log("WAKE", "先收 " + received + " 腾位，唤醒 " + s + " 写入 " + sent + "（count=" + state.count + "）");
      pushHistory("recv+wake " + s);
      render({ fillSlot: (state.sendx - 1 + state.cap) % state.cap, drainSlot: (state.recvx - 1 + state.cap) % state.cap });
      return;
    }

    if (state.count > 0) {
      const slotIdx = state.recvx;
      const val = dequeueHead();
      setCode("recv_buf");
      log("RECV", "从 ring slot[" + slotIdx + "] 取出 " + val);
      pushHistory("buf read " + val);
      render({ drainSlot: slotIdx });
      return;
    }

    if (state.closed) {
      setCode("recv_zero");
      log("RECV", "closed && empty → 零值 ok=false");
      pushHistory("zero recv");
      render();
      return;
    }

    const me = "R" + nextVal();
    state.recvq.push(me);
    setCode("recv_park");
    log("BLOCK", "环空：接收者 " + me + " 挂入 recvq");
    pushHistory("park receiver " + me);
    render();
  }

  function doClose() {
    if (state.closed) {
      log("PANIC", "close of closed channel → panic");
      pushHistory("double close");
      render();
      return;
    }
    state.closed = true;
    setCode("close");
    const nRecv = state.recvq.length;
    state.recvq = [];
    log("CLOSE", "close：唤醒 recvq " + nRecv + " 人（零值）；buf=" + state.count + " 仍可收");
    if (state.sendq.length) {
      const nSend = state.sendq.length;
      state.sendq = [];
      log("PANIC", "唤醒 sendq " + nSend + " 人 → send on closed → panic");
    }
    pushHistory("close");
    render();
  }

  function buildDial() {
    const cap = state.cap;
    const size = 300;
    const cx = size / 2;
    const cy = size / 2;
    const rSlot = 92;
    const rOut = 118;
    let slots = "";
    if (cap > 0) {
      for (let i = 0; i < cap; i++) {
        const a = M.angleForIndex(i, cap);
        const p = M.polar(cx, cy, rSlot, a);
        const filled = state.count > 0 && ((i - state.recvx + cap) % cap) < state.count;
        const val = filled ? state.buf[i] : "";
        slots +=
          '<g data-slot="' + i + '" class="slot-g">' +
          '<circle class="slot' + (filled ? " slot-full" : "") + '" cx="' + p.x + '" cy="' + p.y + '" r="22" fill="' +
          (filled ? "rgba(0,173,216,0.35)" : "rgba(18,26,29,0.9)") +
          '" stroke="' + (filled ? "#00ADD8" : "#2a3b41") + '" stroke-width="1.5"/>' +
          '<text x="' + p.x + '" y="' + (p.y + 4) + '" text-anchor="middle" font-size="11" font-family="var(--font-mono)" fill="' +
          (filled ? "#D7E2E5" : "#5c6d73") + '">' + (val || i) + "</text>" +
          "</g>";
      }
    } else {
      slots = '<text x="' + cx + '" y="' + cy + '" text-anchor="middle" fill="#8A9BA1" font-size="12" font-family="var(--font-mono)">unbuffered</text>';
    }

    let pointers = "";
    if (cap > 0) {
      const aSend = M.angleForIndex(state.sendx, cap);
      const aRecv = M.angleForIndex(state.recvx, cap);
      const pSend = M.polar(cx, cy, rOut - 8, aSend);
      const pRecv = M.polar(cx, cy, rOut - 8, aRecv);
      const tSend = M.polar(cx, cy, rSlot + 28, aSend);
      const tRecv = M.polar(cx, cy, rSlot + 28, aRecv);
      pointers =
        '<line class="pointer-send pointer-tip" x1="' + cx + '" y1="' + cy + '" x2="' + pSend.x + '" y2="' + pSend.y + '" opacity="0.55"/>' +
        '<circle class="pointer-send" cx="' + tSend.x + '" cy="' + tSend.y + '" r="5" fill="#E4A11B" stroke="none"/>' +
        '<line class="pointer-recv pointer-tip" x1="' + cx + '" y1="' + cy + '" x2="' + pRecv.x + '" y2="' + pRecv.y + '" opacity="0.55"/>' +
        '<circle class="pointer-recv" cx="' + tRecv.x + '" cy="' + tRecv.y + '" r="5" fill="#3DDC97" stroke="none"/>';
    }

    const ringPath = cap > 0 ? M.createSvgArc(cx, cy, rSlot, -Math.PI / 2, -Math.PI / 2 + Math.PI * 1.999) : "";

    return (
      '<svg class="channel-svg" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="channel ring buffer">' +
      (ringPath ? '<path d="' + ringPath + '" fill="none" stroke="#1E2C31" stroke-width="1"/>' : "") +
      '<circle cx="' + cx + '" cy="' + cy + '" r="42" fill="#121A1D" stroke="#2a3b41"/>' +
      '<text x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle" font-size="11" fill="#8A9BA1" font-family="var(--font-mono)">hchan</text>' +
      '<text x="' + cx + '" y="' + (cy + 12) + '" text-anchor="middle" font-size="11" fill="#D7E2E5" font-family="var(--font-mono)">n=' + state.count + "</text>" +
      slots +
      pointers +
      '<g id="ch-beam-layer"></g>' +
      "</svg>"
    );
  }

  function qList(title, arr, kind) {
    let chips = "";
    if (!arr.length) chips = '<span style="color:var(--faint);font-size:12px">empty</span>';
    arr.forEach(function (id) {
      chips +=
        '<span class="g-block" data-flip-id="' + kind + "-" + id + '" data-state="blocked" data-qid="' + id + '" data-qkind="' + kind + '">' +
        id +
        "</span>";
    });
    return (
      '<div class="rt-box" data-qbox="' + kind + '">' +
      '<div class="rt-title">' + title + " · " + arr.length + "</div>" +
      '<div class="g-queue" data-queue="' + kind + '">' + chips + "</div></div>"
    );
  }

  function render(fx) {
    const dial = buildDial();
    const queues =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
      qList("sendq", state.sendq, "sendq") +
      qList("recvq", state.recvq, "recvq") +
      "</div>";

    const status =
      '<div class="rt-box" style="margin-top:10px"><div class="rt-title">状态</div>' +
      '<div style="font-family:var(--font-mono);font-size:12px;color:var(--muted)">' +
      (state.closed ? "CLOSED" : "OPEN") +
      " · sendx=" + state.sendx + " · recvx=" + state.recvx + " · count=" + state.count + "/" + state.cap +
      " · send=" + (state.closed ? "panic" : state.cap > 0 && state.count < state.cap ? "enqueue" : state.recvq.length ? "handoff" : "park") +
      " · recv=" + (state.count > 0 ? "dequeue" : state.sendq.length ? "handoff" : state.closed ? "zero" : "park") +
      "</div>" +
      '<div class="legend" style="margin-top:8px">' +
      '<span><i style="background:#E4A11B"></i>sendx</span>' +
      '<span><i style="background:#3DDC97"></i>recvx</span>' +
      '<span><i style="background:#00ADD8"></i>filled</span>' +
      "</div></div>";

    const wrap = document.createElement("div");
    wrap.innerHTML =
      '<div class="channel-dial-wrap"><div>' + dial + "</div><div>" + queues + status + "</div></div>";

    // FLIP queues
    M.flipAnimate(stage, function () {
      stage.innerHTML = "";
      stage.appendChild(wrap);
    }, { duration: 260 });

    if (fx && fx.fillSlot != null && state.cap > 0) {
      const g = stage.querySelector('[data-slot="' + fx.fillSlot + '"] .slot');
      if (g) M.pulse(g, [{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }], { duration: 360 });
    }
    if (fx && fx.drainSlot != null && state.cap > 0) {
      const g = stage.querySelector('[data-slot="' + fx.drainSlot + '"] .slot');
      if (g) M.flash(g, "rgba(61,220,151,0.45)", 1);
    }
    if (fx && fx.beam) drawBeam(fx);

    if (stateChip) {
      stateChip.textContent = state.closed ? "closed" : "open · cap=" + state.cap;
      stateChip.className = "chip " + (state.closed ? "chip-warn" : "chip-accent");
    }
  }

  function drawBeam(fx) {
    const svg = stage.querySelector(".channel-svg");
    const layer = stage.querySelector("#ch-beam-layer");
    if (!svg || !layer || M.reduceMotion) return;
    const cx = 150;
    const cy = 150;
    const startX = fx.to === "recvq" ? 40 : 260;
    const startY = 40;
    const endX = cx;
    const endY = cy;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      "M" + startX + " " + startY + " Q " + (cx + 20) + " " + (cy - 80) + " " + endX + " " + endY
    );
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#00ADD8");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-dasharray", "6 6");
    layer.appendChild(path);
    const len = path.getTotalLength ? path.getTotalLength() : 200;
    path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], {
      duration: 420,
      easing: "ease-out",
      fill: "forwards"
    });
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("r", "5");
    dot.setAttribute("fill", "#3DDC97");
    layer.appendChild(dot);
    const anim = dot.animate(
      [
        { transform: "translate(" + startX + "px," + startY + "px)" },
        { transform: "translate(" + endX + "px," + endY + "px)" }
      ],
      { duration: 420, easing: "cubic-bezier(0.22,1,0.36,1)", fill: "forwards" }
    );
    anim.onfinish = function () {
      path.remove();
      dot.remove();
    };
  }

  sendBtn.addEventListener("click", doSend);
  recvBtn.addEventListener("click", doRecv);
  closeBtn.addEventListener("click", doClose);
  resetBtn.addEventListener("click", function () {
    reset(false);
  });
  capSel.addEventListener("change", function () {
    reset(false);
  });

  // init code panel lines from static HTML
  if (codePanel) {
    codePanel.querySelectorAll(".code-line").forEach(function (line) {
      // keys already in data-code-key
    });
  }

  tlCtrl = M.bindTimelineControls(timelineEl || document, timeline, function (frame) {
    seq = frame.state.seq || 0;
    state = JSON.parse(JSON.stringify(frame.state));
    render();
    setCode(lastActionCode);
  });

  const storyRoot = document.getElementById("ch-story");
  if (storyRoot && M.StoryGuide) {
    new M.StoryGuide({
      root: storyRoot,
      codePanel: storyRoot.querySelector(".code-track"),
      levels: [
        {
          id: "make",
          title: "make 了一组快递柜",
          metaphor: "cap=0 门对门；cap=1 小柜；cap=4 大柜",
          body: "make(chan int, 1) 在堆上造出 hchan：环形柜子 + 两个指针 sendx/recvx + 两条排队名单 sendq/recvq。容量决定「能不能先放下再走」。",
          codeKeys: ["make"],
          run: function () {
            capSel.value = "1";
            reset(false);
            setCode("make");
            log("STW", "剧情：认识 hchan 就是快递柜");
          }
        },
        {
          id: "send",
          title: "ch <- 42 投递",
          metaphor: "柜子有空格 → 放进去就走人",
          body: "缓冲未满时，值写入 ring[sendx]，sendx 转一格。快递员不用等收件人。点下面的「发送」试一次。",
          codeKeys: ["send"],
          run: function () {
            capSel.value = "1";
            reset(false);
            doSend();
            setCode("send_buf");
          }
        },
        {
          id: "block",
          title: "再投一次：柜满了",
          metaphor: "柜门全占 → 快递员站门口干等（挂 sendq）",
          body: "缓冲满且没人来取，发送方 G 会阻塞进 sendq。它不是失败，是在等接收方腾格子。",
          codeKeys: ["send"],
          run: function () {
            // assume one item already; send again to park
            if (state.count === 0) doSend();
            doSend();
            setCode("send_park");
          }
        },
        {
          id: "recv",
          title: "v := <-ch 取件",
          metaphor: "收件人来了 → 先拿走头格，再叫醒门口快递员补位",
          body: "接收优先对接 sendq：取走 recvx 上的值，并让被阻塞的发送方把新值放进刚腾出的格子。环形指针会转起来。",
          codeKeys: ["recv"],
          run: function () {
            doRecv();
            setCode("recv_sendq");
          }
        },
        {
          id: "close",
          title: "close 打烊",
          metaphor: "不再收新件；柜里旧件仍可取；门外快递员要投诉（panic）",
          body: "close 会叫醒所有等接收的人（读零值）。对已关闭 channel 再发送会 panic——所以「谁负责 close」很重要。",
          codeKeys: ["close"],
          run: function () {
            doClose();
            setCode("close");
          }
        }
      ]
    });
  }

  reset(false);
})();

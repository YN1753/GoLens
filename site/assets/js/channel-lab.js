(function () {
  const stage = document.getElementById("ch-stage");
  const logEl = document.getElementById("ch-log");
  const capSel = document.getElementById("ch-cap");
  const sendBtn = document.getElementById("ch-send");
  const recvBtn = document.getElementById("ch-recv");
  const closeBtn = document.getElementById("ch-close");
  const resetBtn = document.getElementById("ch-reset");
  const stateChip = document.getElementById("ch-state-chip");
  if (!stage) return;

  let state = null;
  let seq = 0;

  function log(msg, kind) {
    if (window.GoLens && window.GoLens.log) window.GoLens.log(logEl, msg, kind);
  }

  function reset() {
    const cap = Number(capSel.value);
    state = {
      cap: cap,
      buf: new Array(cap).fill(null),
      head: 0,
      count: 0,
      sendq: [],
      recvq: [],
      closed: false
    };
    seq = 0;
    if (logEl) logEl.innerHTML = "";
    render();
    log("创建 channel cap=" + cap + (cap === 0 ? "（同步交接）" : ""));
  }

  function nextVal() {
    seq++;
    return "v" + seq;
  }

  function doSend() {
    if (state.closed) {
      log("send on closed channel → panic", "warn");
      render();
      return;
    }

    // Receiver waiting?
    if (state.recvq.length) {
      const r = state.recvq.shift();
      const val = nextVal();
      // For buffered channels with space, also refill from... simplified: direct handoff
      log("recvq 有等待者：直接把 " + val + " 交给 " + r + " 并唤醒", "ok");
      render();
      return;
    }

    if (state.cap === 0) {
      const me = "S" + nextVal();
      state.sendq.push(me);
      log("无缓冲且无接收者：发送方 " + me + " 挂入 sendq 阻塞", "warn");
      render();
      return;
    }

    if (state.count < state.cap) {
      const val = nextVal();
      state.buf[(state.head + state.count) % state.cap] = val;
      state.count++;
      log("缓冲未满：写入 " + val + "（count=" + state.count + "/" + state.cap + "）", "ok");
      render();
      return;
    }

    const me = "S" + nextVal();
    state.sendq.push(me);
    log("缓冲已满且无接收者：发送方 " + me + " 挂入 sendq", "warn");
    render();
  }

  function dequeueHead() {
    const val = state.buf[state.head];
    state.buf[state.head] = null;
    state.head = (state.head + 1) % state.cap;
    state.count--;
    return val;
  }

  function enqueue(val) {
    state.buf[(state.head + state.count) % state.cap] = val;
    state.count++;
  }

  function doRecv() {
    // Prefer waiting senders (unbuffered handoff, or buffer-full + wake).
    if (state.sendq.length) {
      const s = state.sendq.shift();
      if (state.cap === 0) {
        log("sendq 有等待者：接收者与 " + s + " 直接交接并唤醒发送方", "ok");
        render();
        return;
      }
      // Buffered channel is full when senders wait: take head, then sender enqueues into freed slot.
      const received = dequeueHead();
      const sent = nextVal();
      enqueue(sent);
      log(
        "sendq 有等待者：先收 " +
          received +
          " 腾出槽位，唤醒 " +
          s +
          " 并写入 " +
          sent +
          "（count=" +
          state.count +
          "/" +
          state.cap +
          "）",
        "ok"
      );
      render();
      return;
    }

    if (state.count > 0) {
      const val = dequeueHead();
      log("从 buf 取出 " + val + "（count=" + state.count + "）", "ok");
      render();
      return;
    }

    if (state.closed) {
      log("已关闭且缓冲空：接收零值，ok=false，不阻塞", "accent");
      render();
      return;
    }

    const me = "R" + nextVal();
    state.recvq.push(me);
    log("无数据且无发送者：接收者 " + me + " 挂入 recvq", "warn");
    render();
  }

  function doClose() {
    if (state.closed) {
      log("close of closed channel → panic", "warn");
      render();
      return;
    }
    state.closed = true;
    const nRecv = state.recvq.length;
    state.recvq = [];
    log("close：唤醒 recvq 中 " + nRecv + " 个等待者（读零值）；缓冲若仍有值可继续收", "accent");
    if (state.sendq.length) {
      const nSend = state.sendq.length;
      state.sendq = [];
      log("唤醒 sendq 中 " + nSend + " 个发送者 → send on closed channel → panic", "warn");
    }
    render();
  }

  function render() {
    stateChip.textContent = state.closed ? "closed" : "open · cap=" + state.cap;
    stateChip.className = "chip " + (state.closed ? "chip-warn" : "chip-accent");

    let html = '<div style="display:grid;gap:14px">';

    html += '<div class="rt-box"><div class="rt-title">环形缓冲 buf · cap ' + state.cap + " · count " + state.count + "</div>";
    html += '<div style="display:flex;flex-wrap:wrap;gap:8px">';
    if (state.cap === 0) {
      html += '<span style="color:var(--faint)">无缓冲（直接交接）</span>';
    } else {
      for (let i = 0; i < state.cap; i++) {
        const isHead = i === state.head && state.count > 0;
        const val = state.count > 0 && (i - state.head + state.cap) % state.cap < state.count
          ? state.buf[i]
          : null;
        html +=
          '<div style="width:56px;height:48px;border:1px solid ' +
          (val ? "var(--accent)" : "var(--line-strong)") +
          ";border-radius:6px;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:12px;background:" +
          (val ? "var(--accent-dim)" : "var(--surface)") +
          ';color:' +
          (val ? "var(--accent)" : "var(--faint)") +
          '">' +
          (val || "·") +
          (isHead ? '<span style="margin-left:2px;font-size:9px;color:var(--warn)">h</span>' : "") +
          "</div>";
      }
    }
    html += "</div></div>";

    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';
    html += '<div class="rt-box"><div class="rt-title">sendq · ' + state.sendq.length + "</div><div style='display:flex;flex-wrap:wrap;gap:6px'>";
    if (!state.sendq.length) html += '<span style="color:var(--faint)">empty</span>';
    state.sendq.forEach(function (s) {
      html += '<span class="chip chip-warn">' + s + " blocked</span>";
    });
    html += "</div></div>";
    html += '<div class="rt-box"><div class="rt-title">recvq · ' + state.recvq.length + "</div><div style='display:flex;flex-wrap:wrap;gap:6px'>";
    if (!state.recvq.length) html += '<span style="color:var(--faint)">empty</span>';
    state.recvq.forEach(function (r) {
      html += '<span class="chip chip-warn">' + r + " blocked</span>";
    });
    html += "</div></div></div>";

    html +=
      '<div style="font-family:var(--font-mono);font-size:12px;color:var(--muted)">状态：' +
      (state.closed ? "CLOSED" : "OPEN") +
      " · send=" +
      (state.closed ? "panic" : state.cap > 0 && state.count < state.cap ? "可入队" : state.recvq.length ? "可交接" : "可能阻塞") +
      " · recv=" +
      (state.count > 0 ? "可取" : state.sendq.length ? "可对接" : state.closed ? "零值" : "可能阻塞") +
      "</div>";

    html += "</div>";
    stage.innerHTML = html;
  }

  sendBtn.addEventListener("click", doSend);
  recvBtn.addEventListener("click", doRecv);
  closeBtn.addEventListener("click", doClose);
  resetBtn.addEventListener("click", reset);
  capSel.addEventListener("change", reset);

  reset();
})();

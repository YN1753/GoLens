(function () {
  const M = window.GoLens;
  const stage = document.getElementById("gmp-stage");
  const logEl = document.getElementById("gmp-log");
  const sceneSel = document.getElementById("gmp-scene");
  const stepBtn = document.getElementById("gmp-step");
  const playBtn = document.getElementById("gmp-play");
  const resetBtn = document.getElementById("gmp-reset");
  const speedEl = document.getElementById("gmp-speed");
  const procsEl = document.getElementById("gmp-procs");
  const injectBtn = document.getElementById("gmp-inject");
  const codePanel = document.getElementById("gmp-code");
  const timelineEl = document.querySelector("[data-gmp-timeline]");
  if (!stage || !M) return;

  const timeline = new M.Timeline();
  let tlCtrl = null;
  let state = null;
  let timer = null;
  let steps = [];
  let stepIdx = 0;
  let dragId = null;

  const CODE = {
    schedule: "schedule(): findrunnable() on local runnext/queue",
    global: "schedule(): check global queue / steal half from other Ps",
    steal: "stealWork(): take half of another P's local queue",
    execute: "execute(): M binds P, runs G",
    block: "G blocks → M may detach from P; new M takes P",
    unbound: "M without P: spin or park"
  };

  function setCode(key) {
    if (!codePanel) return;
    codePanel.querySelectorAll(".code-line").forEach(function (line) {
      line.classList.toggle("is-active", line.getAttribute("data-code-key") === key);
    });
  }

  function log(tag, msg) {
    M.logLine(logEl, tag, msg);
  }

  function makeG(id, st) {
    return { id: id, state: st || "runnable", note: "" };
  }

  function cloneState(s) {
    return JSON.parse(JSON.stringify(s));
  }

  function pushHistory(label) {
    timeline.push(cloneState(state), label);
    if (tlCtrl) tlCtrl.sync();
  }

  function defaultMs(n) {
    const ms = [];
    for (let i = 0; i < n; i++) ms.push({ id: i, boundP: null, g: null, mstate: "parked", note: "" });
    return ms;
  }

  function initState(scene, procs) {
    const pCount = procs;
    const base = {
      scene: scene,
      procs: pCount,
      tick: 0,
      global: [],
      ps: [],
      ms: defaultMs(Math.max(pCount, 2)),
      freeGs: [],
      nextId: 1
    };
    for (let i = 0; i < pCount; i++) {
      base.ps.push({ id: i, runnext: null, queue: [], m: null });
    }

    if (scene === "basic") {
      base.ps[0].runnext = makeG(1);
      base.ps[0].queue = [makeG(2), makeG(3)];
      if (base.ps[1]) base.ps[1].queue = [makeG(4)];
      base.nextId = 5;
    } else if (scene === "overflow") {
      base.ps[0].runnext = makeG(1);
      for (let i = 2; i <= 9; i++) base.ps[0].queue.push(makeG(i));
      base.nextId = 10;
    } else if (scene === "steal") {
      base.ps[0].runnext = makeG(1);
      base.ps[0].queue = [makeG(2), makeG(3), makeG(4), makeG(5), makeG(6)];
      base.nextId = 7;
    } else if (scene === "block") {
      base.ps[0].runnext = makeG(1, "running");
      base.ps[0].queue = [makeG(2), makeG(3)];
      if (base.ps[1]) base.ps[1].queue = [makeG(4)];
      base.nextId = 5;
    }
    bindMs(base);
    return base;
  }

  function bindMs(st) {
    st.ms.forEach(function (m) {
      m.boundP = null;
      m.g = null;
      if (m.mstate === "running") m.mstate = "parked";
    });
    st.ps.forEach(function (p) {
      p.m = null;
    });
    let mi = 0;
    st.ps.forEach(function (p) {
      if (mi < st.ms.length) {
        p.m = st.ms[mi].id;
        st.ms[mi].boundP = p.id;
        st.ms[mi].mstate = "parked";
        mi++;
      }
    });
  }

  function findG(st, id) {
    const pools = [st.global];
    st.ps.forEach(function (p) {
      pools.push(p.queue);
      if (p.runnext) pools.push([p.runnext]);
    });
    st.ms.forEach(function (m) {
      if (m._blocked) pools.push([m._blocked]);
    });
    st.freeGs.forEach(function (x) {
      pools.push([x.g]);
    });
    for (let i = 0; i < pools.length; i++) {
      const arr = pools[i];
      for (let j = 0; j < arr.length; j++) {
        if (arr[j] && arr[j].id === id) return arr[j];
      }
    }
    return null;
  }

  function removeG(st, id) {
    st.global = st.global.filter(function (x) {
      return x.id !== id;
    });
    st.ps.forEach(function (p) {
      if (p.runnext && p.runnext.id === id) p.runnext = null;
      p.queue = p.queue.filter(function (x) {
        return x.id !== id;
      });
    });
  }

  function scenarioScript() {
    if (state.scene === "basic") {
      return [
        function () {
          setCode("schedule");
          return "绑定 M→P（无 P 不能跑用户 G）";
        },
        function () {
          const p = state.ps[0];
          if (!p.runnext) return "无 runnext";
          p.runnext.state = "running";
          if (p.m !== null) {
            const m = state.ms[p.m];
            m.g = p.runnext.id;
            m.mstate = "running";
          }
          setCode("execute");
          return "P0 取 runnext G" + p.runnext.id + " → M" + p.m;
        },
        function () {
          const p = state.ps[0];
          const m = p.m !== null ? state.ms[p.m] : null;
          if (m && m.g) {
            const g = findG(state, m.g);
            m.g = null;
            m.mstate = "parked";
            if (g) {
              g.state = "done";
              removeG(state, g.id);
              return "G" + g.id + " 结束";
            }
          }
          return null;
        },
        function () {
          const p = state.ps[0];
          const next = p.queue.shift();
          if (next) {
            p.runnext = next;
            next.state = "running";
            if (p.m !== null) {
              state.ms[p.m].g = next.id;
              state.ms[p.m].mstate = "running";
            }
            setCode("schedule");
            return "本地队列出队 G" + next.id;
          }
          return "P0 本地空 → 看全局";
        },
        function () {
          if (state.global.length) {
            const g = state.global.shift();
            if (state.ps[1]) state.ps[1].queue.push(g);
            setCode("global");
            return "全局队列 → P1：" + "G" + g.id;
          }
          return "本轮结束：本地优先 → 全局兜底";
        }
      ];
    }
    if (state.scene === "overflow") {
      return [
        function () {
          setCode("schedule");
          return "P0 本地过长（阈值 4）";
        },
        function () {
          const p = state.ps[0];
          if (p.queue.length > 4) {
            const half = Math.ceil(p.queue.length / 2);
            const moved = p.queue.splice(0, half);
            state.global = state.global.concat(moved);
            setCode("global");
            return "推一半到全局：" + moved.map(function (g) { return "G" + g.id; }).join(",");
          }
          return "未超阈值";
        },
        function () {
          return "local=" + state.ps[0].queue.length + " global=" + state.global.length;
        }
      ];
    }
    if (state.scene === "steal") {
      return [
        function () {
          if (state.ps[1]) {
            state.ps[1].queue = [];
            state.ps[1].runnext = null;
          }
          return "P1 饥饿，P0 积压";
        },
        function () {
          setCode("steal");
          return "P1 尝试 work stealing";
        },
        function () {
          const src = state.ps[0];
          const dst = state.ps[1];
          if (!dst) return "无 P1";
          if (src.queue.length) {
            const half = Math.ceil(src.queue.length / 2);
            const stolen = src.queue.splice(0, half);
            dst.queue = dst.queue.concat(stolen);
            log("STEAL", "偷走 " + half + " 个 G：" + stolen.map(function (g) { return "G" + g.id; }).join(","));
            return "偷取成功 ×" + half;
          }
          if (src.runnext) {
            const g = src.runnext;
            src.runnext = null;
            dst.runnext = g;
            g.state = "running";
            return "偷到 runnext G" + g.id;
          }
          return "无可偷";
        }
      ];
    }
    // block
    return [
      function () {
        const p0 = state.ps[0];
        if (p0.runnext) {
          p0.runnext.state = "running";
          if (p0.m !== null) {
            state.ms[p0.m].g = p0.runnext.id;
            state.ms[p0.m].mstate = "running";
          }
        }
        setCode("execute");
        return "M0 执行 " + (p0.runnext ? "G" + p0.runnext.id : "G?");
      },
      function () {
        const m0 = state.ms[0];
        if (m0 && m0.g) {
          const g = findG(state, m0.g);
          if (g) {
            g.state = "blocked";
            g.note = "syscall";
            m0.mstate = "syscall";
            if (state.ps[0].runnext && state.ps[0].runnext.id === g.id) state.ps[0].runnext = null;
            log("SYS", "G" + g.id + " 系统调用/阻塞");
            return "G 进入阻塞";
          }
        }
        return null;
      },
      function () {
        const p0 = state.ps[0];
        const m0 = state.ms[0];
        if (m0) {
          m0.boundP = null;
          m0.note = "carrying blocked G";
          if (m0.g) {
            const g = findG(state, m0.g);
            if (g) m0._blocked = g;
            m0.g = null;
          }
        }
        p0.m = null;
        setCode("block");
        log("BLOCK", "M0 与 P0 解绑");
        return "P0 空出，需备用 M";
      },
      function () {
        const p0 = state.ps[0];
        const m2 = { id: state.ms.length, boundP: p0.id, g: null, mstate: "parked", note: "spare M" };
        state.ms.push(m2);
        p0.m = m2.id;
        const next = p0.queue.shift();
        if (next) {
          next.state = "running";
          m2.g = next.id;
          m2.mstate = "running";
          setCode("execute");
          return "新 M 绑定 P0，继续 G" + next.id;
        }
        setCode("unbound");
        return "P0 暂无 G，M 自旋/休眠";
      }
    ];
  }

  function stopPlay() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (playBtn) playBtn.textContent = "播放";
  }

  function reset() {
    stopPlay();
    state = initState(sceneSel.value, Number(procsEl.value));
    steps = scenarioScript();
    stepIdx = 0;
    if (logEl) logEl.innerHTML = "";
    pushHistory("reset · " + sceneSel.value);
    render();
    log("BIND", "场景 " + sceneSel.options[sceneSel.selectedIndex].text + " · GOMAXPROCS=" + state.procs);
  }

  function stepOnce() {
    if (stepIdx >= steps.length) {
      log("BLOCK", "场景结束，可重置/切场景/注入 G");
      stopPlay();
      return;
    }
    const msg = steps[stepIdx++]();
    state.tick++;
    pushHistory("step " + state.tick);
    render();
    if (msg) log("MARK", msg);
  }

  function injectG(targetKind, targetP) {
    const g = makeG(state.nextId++);
    g.state = "runnable";
    if (targetKind === "global") state.global.push(g);
    else if (typeof targetP === "number" && state.ps[targetP]) state.ps[targetP].queue.push(g);
    else state.global.push(g);
    pushHistory("inject G" + g.id);
    render();
    log("BIND", "注入 G" + g.id + " → " + (targetKind === "global" ? "全局" : "P" + targetP));
  }

  function togglePlay() {
    if (timer) {
      stopPlay();
      return;
    }
    playBtn.textContent = "暂停";
    const speed = Number(speedEl.value) || 5;
    const ms = 1100 - speed * 90;
    timer = setInterval(stepOnce, Math.max(280, ms));
  }

  function gEl(g, kind, pid) {
    const flipId = "g-" + g.id;
    return (
      '<span class="g-block" data-flip-id="' + flipId + '" data-gid="' + g.id +
      '" data-state="' + g.state + '" draggable="true" title="拖到队列">' +
      "G" + g.id +
      (g.note ? "·" + g.note : "") +
      "</span>"
    );
  }

  function render() {
    let html = '<div class="gmp-board">';

    html += '<div class="gmp-global"><div class="rt-title">全局队列 · ' + state.global.length + "</div>";
    html += '<div class="g-queue" data-drop="global">';
    if (!state.global.length) html += '<span style="color:var(--faint);font-size:12px">empty — 可拖入</span>';
    state.global.forEach(function (g) {
      html += gEl(g, "global");
    });
    html += "</div></div>";

    html += '<div class="rt-title" style="margin:4px 0">Processors · GOMAXPROCS=' + state.procs + "</div>";
    html += '<div class="gmp-row">';
    state.ps.forEach(function (p) {
      html += '<div class="gmp-p" data-p="' + p.id + '">';
      html += '<div class="rt-title">P' + p.id + (p.m !== null ? " · M" + p.m : " · 无 M") + "</div>";
      html += "<div>runnext: " + (p.runnext ? gEl(p.runnext, "runnext", p.id) : '<span style="color:var(--faint)">—</span>') + "</div>";
      html += '<div style="margin-top:6px" class="g-queue" data-drop="p" data-pid="' + p.id + '">';
      if (!p.queue.length) html += '<span style="color:var(--faint);font-size:12px">local q</span>';
      p.queue.forEach(function (g) {
        html += gEl(g, "p", p.id);
      });
      html += "</div></div>";
    });
    html += "</div>";

    html += '<div class="rt-title" style="margin:8px 0 4px">Machines</div>';
    html += '<div class="gmp-row">';
    state.ms.forEach(function (m) {
      const st = m.mstate || "parked";
      html +=
        '<div class="m-card" data-m="' + m.id + '">' +
        '<div class="m-head"><span class="m-led" data-mstate="' + st + '"></span>M' + m.id +
        (m.boundP !== null && m.boundP !== undefined ? "→P" + m.boundP : " unbound") +
        "</div>" +
        '<div style="font-size:11px;color:var(--muted);font-family:var(--font-mono)">' +
        (m.g ? "exec G" + m.g : m._blocked ? "blocked G" + m._blocked.id : m.note || st) +
        "</div>" +
        (m.boundP === null || m.boundP === undefined ? '<div class="p-detach">DETACHED</div>' : "") +
        "</div>";
    });
    html += "</div></div>";

    M.flipAnimate(stage, function () {
      stage.innerHTML = html;
    }, { duration: 260 });

    bindDnD();
  }

  function bindDnD() {
    stage.querySelectorAll(".g-block[draggable]").forEach(function (el) {
      el.addEventListener("dragstart", function (e) {
        dragId = el.getAttribute("data-gid");
        el.classList.add("is-dragging");
        if (e.dataTransfer) e.dataTransfer.setData("text/plain", dragId);
      });
      el.addEventListener("dragend", function () {
        el.classList.remove("is-dragging");
        dragId = null;
      });
    });
    stage.querySelectorAll("[data-drop]").forEach(function (zone) {
      zone.addEventListener("dragover", function (e) {
        e.preventDefault();
        zone.classList.add("is-drop-target");
      });
      zone.addEventListener("dragleave", function () {
        zone.classList.remove("is-drop-target");
      });
      zone.addEventListener("drop", function (e) {
        e.preventDefault();
        zone.classList.remove("is-drop-target");
        const id = Number((e.dataTransfer && e.dataTransfer.getData("text/plain")) || dragId);
        if (!id) return;
        moveG(id, zone);
      });
    });
  }

  function moveG(id, zone) {
    const g = findG(state, id);
    if (!g) return;
    if (g.state === "blocked" || g.state === "running") {
      log("BLOCK", "G" + id + " 当前不可拖（" + g.state + "）");
      return;
    }
    removeG(state, id);
    g.state = "runnable";
    if (zone.getAttribute("data-drop") === "global") {
      state.global.push(g);
      log("BIND", "拖拽 G" + id + " → 全局队列");
    } else {
      const pid = Number(zone.getAttribute("data-pid"));
      if (state.ps[pid]) {
        state.ps[pid].queue.push(g);
        log("BIND", "拖拽 G" + id + " → P" + pid + " 本地队列");
      }
    }
    pushHistory("drag G" + id);
    render();
  }

  stepBtn.addEventListener("click", function () {
    stopPlay();
    stepOnce();
  });
  playBtn.addEventListener("click", togglePlay);
  resetBtn.addEventListener("click", reset);
  sceneSel.addEventListener("change", reset);
  procsEl.addEventListener("change", reset);
  injectBtn.addEventListener("click", function () {
    injectG("global");
  });

  tlCtrl = M.bindTimelineControls(timelineEl || document, timeline, function (frame) {
    stopPlay();
    state = cloneState(frame.state);
    render();
  });

  reset();
})();

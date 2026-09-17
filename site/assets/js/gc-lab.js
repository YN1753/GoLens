(function () {
  const M = window.GoLens;
  const stage = document.getElementById("gc-stage");
  const logEl = document.getElementById("gc-log");
  const barrierEl = document.getElementById("gc-barrier");
  const rootsBtn = document.getElementById("gc-roots");
  const stepBtn = document.getElementById("gc-step");
  const mutateBtn = document.getElementById("gc-mutate");
  const resetBtn = document.getElementById("gc-reset");
  const phaseEl = document.getElementById("gc-phase");
  const codePanel = document.getElementById("gc-code");
  const timelineEl = document.querySelector("[data-gc-timeline]");
  if (!stage || !M) return;

  const timeline = new M.Timeline();
  let tlCtrl = null;
  let nodes = null;
  let state = null;
  let hoverId = null;

  const LAYOUT = {
    R1: { x: 70, y: 50, root: true },
    R2: { x: 70, y: 150, root: true },
    A: { x: 200, y: 100 },
    B: { x: 330, y: 100 },
    C: { x: 450, y: 50 },
    D: { x: 450, y: 160 },
    E: { x: 330, y: 200 }
  };

  const CODE = {
    stw_start: "STW mark-start: enable write barrier; gray roots",
    scan: "shade(u): if white → gray; scan children",
    black: "mark black after scanning outbound pointers",
    barrier: "write barrier: shade pointer target (keep invariant)",
    leak: "no barrier: black→white pointer → potential floating garbage / miss",
    stw_term: "STW mark-termination: disable barrier; sweep whites"
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

  function resetGraph() {
    nodes = {
      R1: { id: "R1", color: "white", out: ["A"] },
      R2: { id: "R2", color: "white", out: ["A"] },
      A: { id: "A", color: "white", out: ["B"] },
      B: { id: "B", color: "white", out: ["C"] },
      C: { id: "C", color: "white", out: [] },
      D: { id: "D", color: "white", out: [] },
      E: { id: "E", color: "white", out: ["D"] }
    };
    state = {
      phase: "idle",
      gray: [],
      mutated: false,
      barrierOn: true,
      lost: false,
      stw: "idle"
    };
  }

  function cloneAll() {
    return {
      nodes: JSON.parse(JSON.stringify(nodes)),
      state: JSON.parse(JSON.stringify(state))
    };
  }

  function pushHistory(label) {
    timeline.push(cloneAll(), label);
    if (tlCtrl) tlCtrl.sync();
  }

  function fillOf(c) {
    if (c === "black") return "#3a4548";
    if (c === "gray") return "#9aa5a8";
    return "#f2f5f6";
  }

  function textOf(c) {
    return c === "black" ? "#d7e2e5" : "#0b1214";
  }

  function markRoots() {
    state.phase = "mark";
    state.stw = "start→concurrent";
    state.barrierOn = barrierEl.checked;
    state.gray = ["R1", "R2"];
    nodes.R1.color = "gray";
    nodes.R2.color = "gray";
    setCode("stw_start");
    log("STW", "mark-start：开启写屏障，根入灰");
    pushHistory("STW start");
    render({ waveFrom: ["R1", "R2"] });
  }

  function stepMark() {
    if (state.phase !== "mark") {
      log("BLOCK", "请先「标记根」");
      return;
    }
    if (!state.gray.length) {
      finishMark();
      return;
    }
    const id = state.gray.shift();
    const n = nodes[id];
    n.color = "black";
    setCode("scan");
    log("MARK", "shade " + id + " → black；扫子指针 [" + n.out.join(",") + "]");
    const newly = [];
    n.out.forEach(function (child) {
      const c = nodes[child];
      if (c && c.color === "white") {
        c.color = "gray";
        state.gray.push(child);
        newly.push(child);
      }
    });
    pushHistory("scan " + id);
    render({ waveFrom: newly.length ? newly : [id], leaveGray: id });
    if (!state.gray.length) finishMark();
  }

  function finishMark() {
    state.phase = "done";
    state.stw = "terminate";
    setCode("stw_term");
    const whites = Object.keys(nodes).filter(function (id) {
      return nodes[id].color === "white";
    });
    log("STW", "mark-termination：关屏障");
    if (whites.length) {
      log("MARK", "仍为白（可回收概念）：" + whites.join(","));
      if (state.lost) log("PANIC", "检测到漏标：存活引用被标白 " + whites.join(","));
    } else {
      log("WAKE", "全部已灰/黑");
    }
    pushHistory("STW term");
    render();
  }

  function mutate() {
    const barrierOn = barrierEl.checked;
    state.barrierOn = barrierOn;
    // Insert E→D already exists; mutate A->B cut and A->D? Spec: disconnect A->B, attach C->B or B->D style.
    // Demo: A 断开对 B 的引用，改为 A→D；同时保留 E→D。若 B 未被扫且 A 已黑，B 可能丢。
    // Better narrative matching user request: 断开 A->B，挂载 C->B is after B black...
    // Use: while B still white/gray path: replace A.out B with A.out D, insert pointer A→D.
    // Simpler visible bug: keep A→B, but insert D→B after B is black? User asked 断开 A->B 挂载 C->B.

    // Implement: remove A→B; set C→B (C may already be black after scan).
    const a = nodes.A;
    const b = nodes.B;
    const c = nodes.C;
    if (a.out.indexOf("B") >= 0) a.out = a.out.filter(function (x) { return x !== "B"; });
    if (c.out.indexOf("B") < 0) c.out.push("B");
    state.mutated = true;
    setCode(barrierOn ? "barrier" : "leak");
    log("MARK", "mutator：断开 A→B，挂载 C→B（C=" + c.color + "，B=" + b.color + "）");

    if (barrierOn) {
      if (b.color === "white") {
        b.color = "gray";
        if (state.gray.indexOf("B") < 0) state.gray.push("B");
        log("BARRIER", "混合写屏障：shade B → 灰，保全可达性");
        if (state.phase === "done") {
          state.phase = "mark";
          state.stw = "concurrent";
        }
      } else {
        log("BARRIER", "B 已是 " + b.color + "，屏障无需再灰化");
      }
    } else {
      if (c.color === "black" && b.color === "white") {
        state.lost = true;
        log("PANIC", "无屏障：黑 C→白 B，不变式破坏，B 可能被误回收");
      } else if (b.color === "white") {
        log("PANIC", "无屏障：B 仍白，若扫描已过 A 将漏标");
      }
    }
    pushHistory("mutate C→B");
    render({ crack: !barrierOn && state.lost, hotEdge: ["C", "B"] });
  }

  function render(fx) {
    fx = fx || {};
    const W = 520;
    const H = 260;
    let edges = "";
    Object.keys(nodes).forEach(function (from) {
      const n = nodes[from];
      const p0 = LAYOUT[from];
      n.out.forEach(function (to) {
        const p1 = LAYOUT[to];
        if (!p0 || !p1) return;
        const hot = fx.hotEdge && fx.hotEdge[0] === from && fx.hotEdge[1] === to;
        const x1 = p0.x + 28;
        const y1 = p0.y;
        const x2 = p1.x - 28;
        const y2 = p1.y;
        const mx = (x1 + x2) / 2;
        edges +=
          '<path class="edge' + (hot ? " is-hot" : "") + '" d="M' + x1 + " " + y1 +
          " Q " + mx + " " + y1 + " " + x2 + " " + y2 + '"/>';
      });
    });

    let nodeEls = "";
    Object.keys(nodes).forEach(function (id) {
      const n = nodes[id];
      const p = LAYOUT[id];
      const c = n.color;
      const lostClass = fx.crack && id === "B" && n.color === "white" ? " is-lost" : "";
      const hoverHot = hoverId === id;
      nodeEls +=
        '<g class="node' + lostClass + '" data-node="' + id + '" transform="translate(' + p.x + "," + p.y + ')">' +
        '<circle r="28" fill="' + fillOf(c) + '" stroke="' + (hoverHot ? "#00ADD8" : "#2a3b41") + '" stroke-width="' + (hoverHot ? 2.5 : 1.5) + '"/>' +
        '<text text-anchor="middle" dominant-baseline="central" fill="' + textOf(c) + '">' + id + (p.root ? "*" : "") + "</text>" +
        "</g>";
    });

    let grayChips = "";
    if (!state.gray.length) grayChips = '<span style="color:var(--faint);font-size:12px">empty</span>';
    state.gray.forEach(function (id) {
      grayChips += '<span class="gray-chip" data-gray="' + id + '">' + id + "</span>";
    });

    stage.innerHTML =
      '<div class="gc-layout"><div>' +
      '<svg class="gc-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="heap object graph">' +
      '<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="none" stroke="#2a3b41"/></marker></defs>' +
      edges + nodeEls +
      '<g id="gc-wave"></g></svg>' +
      '<div class="legend" style="margin-top:8px"><span><i style="background:#f2f5f6"></i>白</span><span><i style="background:#9aa5a8"></i>灰</span><span><i style="background:#3a4548"></i>黑</span><span>* 根</span></div>' +
      "</div>" +
      '<div class="gray-panel"><div class="gray-title">灰色工作队列</div><div class="gray-chips">' + grayChips + "</div>" +
      '<div style="margin-top:14px" class="rt-box"><div class="rt-title">阶段</div>' +
      '<div style="font-family:var(--font-mono);font-size:12px">' + state.stw +
      " · barrier=" + (state.barrierOn ? "ON" : "OFF") +
      " · mutated=" + state.mutated + "</div></div></div></div>";

    stage.querySelectorAll(".node").forEach(function (g) {
      g.addEventListener("mouseenter", function () {
        hoverId = g.getAttribute("data-node");
        highlightRefs(hoverId);
      });
      g.addEventListener("mouseleave", function () {
        hoverId = null;
        highlightRefs(null);
      });
    });

    if (fx.waveFrom && fx.waveFrom.length) spawnWaves(fx.waveFrom);
    if (fx.leaveGray) {
      const chip = stage.querySelector('[data-gray="' + fx.leaveGray + '"]');
      if (chip) chip.classList.add("is-leaving");
    }
    if (phaseEl) {
      phaseEl.textContent = state.stw;
      phaseEl.className = "chip " + (state.phase === "done" ? "chip-ok" : state.phase === "mark" ? "chip-accent" : "");
    }
  }

  function highlightRefs(id) {
    stage.querySelectorAll(".edge").forEach(function (e) {
      e.classList.remove("is-hot");
    });
    if (!id || !nodes[id]) return;
    nodes[id].out.forEach(function (to) {
      stage.querySelectorAll(".edge").forEach(function (e) {
        const d = e.getAttribute("d") || "";
        // crude: highlight all edges is noisy; skip path matching, pulse node instead
      });
      const target = stage.querySelector('[data-node="' + to + '"] circle');
      if (target) M.flash(target, "rgba(0,173,216,0.35)", 1);
    });
  }

  function spawnWaves(ids) {
    if (M.reduceMotion) return;
    const layer = stage.querySelector("#gc-wave");
    if (!layer) return;
    ids.forEach(function (id) {
      const p = LAYOUT[id];
      if (!p) return;
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("transform", "translate(" + p.x + "," + p.y + ")");
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", 0);
      c.setAttribute("cy", 0);
      c.setAttribute("r", 28);
      c.setAttribute("fill", "none");
      c.setAttribute("stroke", "#00ADD8");
      c.setAttribute("stroke-width", 1.5);
      g.appendChild(c);
      layer.appendChild(g);
      const anim = g.animate(
        [
          { transform: "translate(" + p.x + "px," + p.y + "px) scale(1)", opacity: 0.9 },
          { transform: "translate(" + p.x + "px," + p.y + "px) scale(2)", opacity: 0 }
        ],
        { duration: 520, easing: "ease-out" }
      );
      anim.onfinish = function () {
        g.remove();
      };
    });
  }

  rootsBtn.addEventListener("click", markRoots);
  stepBtn.addEventListener("click", stepMark);
  mutateBtn.addEventListener("click", mutate);
  resetBtn.addEventListener("click", function () {
    resetGraph();
    if (logEl) logEl.innerHTML = "";
    barrierEl.checked = true;
    state.barrierOn = true;
    pushHistory("reset");
    render();
    log("MARK", "对象图已重置。可「标记根」后对比开/关写屏障");
  });
  barrierEl.addEventListener("change", function () {
    state.barrierOn = barrierEl.checked;
    log("BARRIER", "写屏障 → " + (barrierEl.checked ? "ON（混合写屏障直觉）" : "OFF"));
    pushHistory("barrier toggle");
    render();
  });

  tlCtrl = M.bindTimelineControls(timelineEl || document, timeline, function (frame) {
    nodes = JSON.parse(JSON.stringify(frame.state.nodes));
    state = JSON.parse(JSON.stringify(frame.state.state));
    render();
  });

  resetGraph();
  pushHistory("init");
  render();
  log("MARK", "拓扑就绪。Roots: R1,R2* ；并发写演示：C→B");
})();

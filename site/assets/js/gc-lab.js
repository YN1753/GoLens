(function () {
  const stage = document.getElementById("gc-stage");
  const logEl = document.getElementById("gc-log");
  const barrierEl = document.getElementById("gc-barrier");
  const rootsBtn = document.getElementById("gc-roots");
  const stepBtn = document.getElementById("gc-step");
  const mutateBtn = document.getElementById("gc-mutate");
  const resetBtn = document.getElementById("gc-reset");
  const phaseEl = document.getElementById("gc-phase");
  if (!stage) return;

  let nodes = null;
  let state = null;

  function log(msg, kind) {
    if (window.GoLens && window.GoLens.log) window.GoLens.log(logEl, msg, kind);
  }

  function reset() {
    // Object graph:
    // Roots: R1 -> A -> B -> C ; R2 -> A ; orphan: D (only reachable if B->D added)
    nodes = {
      R1: { id: "R1", x: 40, y: 40, color: "white", isRoot: true, out: ["A"] },
      R2: { id: "R2", x: 40, y: 140, color: "white", isRoot: true, out: ["A"] },
      A: { id: "A", x: 160, y: 90, color: "white", out: ["B"] },
      B: { id: "B", x: 280, y: 90, color: "white", out: ["C"] },
      C: { id: "C", x: 400, y: 40, color: "white", out: [] },
      D: { id: "D", x: 400, y: 160, color: "white", out: [] }
    };
    state = {
      phase: "idle",
      gray: [],
      mutated: false,
      barrierOn: barrierEl.checked
    };
    if (logEl) logEl.innerHTML = "";
    render();
    log("对象图已重置。D 初始不可达（仅当 B→D 被插入才相关）");
  }

  function colorOf(id) {
    return nodes[id].color;
  }

  function fillOf(c) {
    if (c === "black") return "var(--gc-black)";
    if (c === "gray") return "var(--gc-gray)";
    return "var(--gc-white)";
  }

  function strokeOf(c) {
    if (c === "black") return "#2a3336";
    if (c === "gray") return "#c5ced1";
    return "#5c6d73";
  }

  function markRoots() {
    state.phase = "mark";
    state.barrierOn = barrierEl.checked;
    phaseEl.textContent = "STW → concurrent mark";
    phaseEl.className = "chip chip-accent";
    ["R1", "R2"].forEach(function (id) {
      nodes[id].color = "gray";
      if (state.gray.indexOf(id) < 0) state.gray.push(id);
    });
    log("STW 开始：开启写屏障 → 从根 R1,R2 标灰 → 恢复并发", "accent");
    log("根已入灰工作队列：[" + state.gray.join(",") + "]");
    render();
  }

  function stepMark() {
    if (state.phase !== "mark") {
      log("请先「标记根」", "warn");
      return;
    }
    if (!state.gray.length) {
      finishMark();
      return;
    }
    const id = state.gray.shift();
    const n = nodes[id];
    n.color = "black";
    log("处理灰对象 " + id + " → 扫描子指针 [" + n.out.join(",") + "] 并染黑");
    n.out.forEach(function (child) {
      const c = nodes[child];
      if (!c) return;
      if (c.color === "white") {
        c.color = "gray";
        state.gray.push(child);
        log("  发现白对象 " + child + " → 标灰");
      }
    });
    render();
    if (!state.gray.length) finishMark();
  }

  function finishMark() {
    state.phase = "done";
    phaseEl.textContent = "STW terminate → done";
    phaseEl.className = "chip chip-ok";
    const whites = Object.keys(nodes).filter(function (id) {
      return nodes[id].color === "white";
    });
    log("灰队列空 → STW 终止：关屏障、收尾", "accent");
    log(
      whites.length
        ? "仍为白（概念上可回收）：" + whites.join(",")
        : "所有对象均已灰/黑",
      whites.length ? "warn" : "ok"
    );
    render();
  }

  function mutate() {
    if (state.phase !== "mark" && state.phase !== "done") {
      log("先启动标记再演示并发写", "warn");
      return;
    }
    const barrierOn = barrierEl.checked;
    const b = nodes.B;
    const d = nodes.D;

    // Insert pointer B -> D
    if (b.out.indexOf("D") < 0) b.out.push("D");
    state.mutated = true;
    log("mutator：插入指针 B → D（B=" + b.color + "，D=" + d.color + "）", "accent");

    if (barrierOn) {
      // Dijkstra-style intuition: shade the pointer target
      if (d.color === "white") {
        d.color = "gray";
        if (state.gray.indexOf("D") < 0) state.gray.push("D");
        log("写屏障：将目标 D 标灰，避免「黑→白」漏标", "ok");
        if (state.phase === "done") {
          state.phase = "mark";
          phaseEl.textContent = "concurrent mark";
          phaseEl.className = "chip chip-accent";
          log("标记被重新推进，请继续处理灰对象", "accent");
        }
      } else {
        log("写屏障：D 已是 " + d.color + "，无需处理");
      }
    } else {
      if (b.color === "black" && d.color === "white") {
        log("无屏障：出现 黑B → 白D，违反不变式，D 可能被误回收（漏标）", "warn");
      } else if (d.color === "white") {
        log("无屏障：D 仍为白。若 B 已黑且不再扫描 D，将漏标", "warn");
      }
    }
    render();
  }

  function render() {
    const barrierOn = barrierEl.checked;
    let svg = '<svg viewBox="0 0 480 220" width="100%" height="220" role="img" aria-label="三色对象图">';
    // edges
    Object.keys(nodes).forEach(function (id) {
      const n = nodes[id];
      n.out.forEach(function (to) {
        const t = nodes[to];
        if (!t) return;
        svg +=
          '<line x1="' +
          (n.x + 22) +
          '" y1="' +
          (n.y + 18) +
          '" x2="' +
          (t.x + 22) +
          '" y2="' +
          (t.y + 18) +
          '" stroke="var(--line-strong)" stroke-width="1.5" marker-end="url(#arrow)" />';
      });
    });
    svg +=
      '<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="none" stroke="var(--line-strong)" /></marker></defs>';

    Object.keys(nodes).forEach(function (id) {
      const n = nodes[id];
      const fill = fillOf(n.color);
      const text = n.color === "white" || n.color === "gray" ? "#0b1214" : "#d7e2e5";
      svg +=
        '<g><rect x="' +
        n.x +
        '" y="' +
        n.y +
        '" width="44" height="36" rx="8" fill="' +
        fill +
        '" stroke="' +
        strokeOf(n.color) +
        '" stroke-width="1.5"/>' +
        '<text x="' +
        (n.x + 22) +
        '" y="' +
        (n.y + 22) +
        '" text-anchor="middle" font-size="12" font-family="var(--font-mono)" fill="' +
        text +
        '">' +
        id +
        (n.isRoot ? "*" : "") +
        "</text></g>";
    });
    svg += "</svg>";

    const meta =
      '<div class="rt-box" style="margin-top:12px"><div class="rt-title">阶段</div>' +
      "<div>phase: <strong>" +
      state.phase +
      "</strong> · barrier: <strong>" +
      (barrierOn ? "ON" : "OFF") +
      "</strong> · gray=[" +
      state.gray.join(",") +
      "] · mutated=" +
      state.mutated +
      "</div>" +
      '<div style="margin-top:8px;color:var(--muted);font-size:12px">* 为根。对比：开屏障时 B→D 会把 D 拉回灰；关屏障演示漏标风险。</div></div>';

    stage.innerHTML = svg + meta;
  }

  barrierEl.addEventListener("change", function () {
    log("写屏障开关 → " + (barrierEl.checked ? "ON" : "OFF"));
    render();
  });
  rootsBtn.addEventListener("click", markRoots);
  stepBtn.addEventListener("click", stepMark);
  mutateBtn.addEventListener("click", mutate);
  resetBtn.addEventListener("click", reset);

  reset();
})();

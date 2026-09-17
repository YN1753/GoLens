(function () {
  const stage = document.getElementById("gmp-stage");
  const logEl = document.getElementById("gmp-log");
  const sceneSel = document.getElementById("gmp-scene");
  const stepBtn = document.getElementById("gmp-step");
  const playBtn = document.getElementById("gmp-play");
  const resetBtn = document.getElementById("gmp-reset");
  const speedEl = document.getElementById("gmp-speed");
  if (!stage) return;

  let timer = null;
  let state = null;

  function log(msg, kind) {
    if (window.GoLens && window.GoLens.log) window.GoLens.log(logEl, msg, kind);
  }

  function gLabel(g) {
    return "G" + g.id;
  }

  function makeG(id, st) {
    return { id: id, state: st || "runnable", note: "" };
  }

  function initState(scene) {
    const base = {
      scene: scene,
      tick: 0,
      global: [],
      ps: [
        { id: 0, runnext: null, queue: [], m: null },
        { id: 1, runnext: null, queue: [], m: null }
      ],
      ms: [{ id: 0 }, { id: 1 }],
      freeGs: [],
      nextId: 1
    };

    if (scene === "basic") {
      base.ps[0].runnext = makeG(1, "runnable");
      base.ps[0].queue = [makeG(2), makeG(3)];
      base.ps[1].queue = [makeG(4)];
      base.nextId = 5;
    } else if (scene === "overflow") {
      // fill P0 local queue beyond small capacity to force global push
      base.ps[0].runnext = makeG(1);
      for (let i = 2; i <= 8; i++) base.ps[0].queue.push(makeG(i));
      base.ps[1].queue = [makeG(9)];
      base.nextId = 10;
    } else if (scene === "steal") {
      base.ps[0].runnext = makeG(1);
      base.ps[0].queue = [makeG(2), makeG(3), makeG(4), makeG(5), makeG(6)];
      base.ps[1].queue = [];
      base.nextId = 7;
    } else if (scene === "block") {
      base.ps[0].runnext = makeG(1, "running");
      base.ps[0].m = 0;
      base.ms[0].boundP = 0;
      base.ps[0].queue = [makeG(2), makeG(3)];
      base.ps[1].queue = [makeG(4)];
      base.nextId = 5;
    }
    return base;
  }

  function bindMs() {
    state.ms.forEach(function (m) {
      m.boundP = null;
      m.g = null;
    });
    state.ps.forEach(function (p) {
      p.m = null;
    });
    // bind available Ms to Ps in order
    let mi = 0;
    state.ps.forEach(function (p) {
      if (mi < state.ms.length) {
        p.m = state.ms[mi].id;
        state.ms[mi].boundP = p.id;
        mi++;
      }
    });
  }

  function findG(id) {
    const pools = [state.global];
    state.ps.forEach(function (p) {
      pools.push(p.queue);
      if (p.runnext) pools.push([p.runnext]);
    });
    state.freeGs.forEach(function (x) {
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

  function removeGFromQueues(g) {
    const id = g.id;
    state.global = state.global.filter(function (x) {
      return x.id !== id;
    });
    state.ps.forEach(function (p) {
      if (p.runnext && p.runnext.id === id) p.runnext = null;
      p.queue = p.queue.filter(function (x) {
        return x.id !== id;
      });
    });
  }

  function pushGlobal(arr) {
    arr.forEach(function (g) {
      state.global.push(g);
    });
  }

  function scenarioScript() {
    // returns array of step functions; each returns message or null
    if (state.scene === "basic") {
      return [
        function () {
          bindMs();
          return "绑定 M→P：M0↔P0，M1↔P1（无 P 不能跑用户 G）";
        },
        function () {
          const p = state.ps[0];
          if (p.runnext) {
            p.runnext.state = "running";
            if (p.m !== null) {
              const m = state.ms[p.m];
              m.g = p.runnext.id;
            }
            return "P0 取 runnext " + gLabel(p.runnext) + " 交给 M0 执行";
          }
          return null;
        },
        function () {
          const p = state.ps[0];
          const m = state.ms[p.m];
          if (m && m.g) {
            const g = findG(m.g);
            if (g) {
              g.state = "done";
              m.g = null;
              removeGFromQueues(g);
              return gLabel(g) + " 执行结束，从 P0 移除";
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
            if (p.m !== null) state.ms[p.m].g = next.id;
            return "P0 本地队列出队 " + gLabel(next) + "，进入 runnext";
          }
          return "P0 本地队列空，尝试全局队列…";
        },
        function () {
          if (state.global.length) {
            const g = state.global.shift();
            state.ps[1].queue.push(g);
            return "全局队列取出 " + gLabel(g) + " 放入 P1";
          }
          const p1 = state.ps[1];
          const n = p1.queue.shift();
          if (n) {
            p1.runnext = n;
            n.state = "running";
            if (p1.m !== null) state.ms[p1.m].g = n.id;
            return "P1 调度 " + gLabel(n);
          }
          return "本轮演示结束：本地优先 → 全局兜底";
        }
      ];
    }

    if (state.scene === "overflow") {
      return [
        function () {
          bindMs();
          return "场景：P0 本地过长（演示阈值 4）";
        },
        function () {
          const p = state.ps[0];
          if (p.queue.length > 4) {
            const half = Math.ceil(p.queue.length / 2);
            const moved = p.queue.splice(0, half);
            pushGlobal(moved);
            return (
              "P0 本地队列过长，将 " +
              half +
              " 个 G 推入全局：" +
              moved.map(gLabel).join(",")
            );
          }
          return "P0 队列未超阈值";
        },
        function () {
          return (
            "现状：P0 local=" +
            state.ps[0].queue.length +
            " global=" +
            state.global.length
          );
        },
        function () {
          const g = state.global.shift();
          if (!g) return "全局已空";
          const p = state.ps[1];
          p.queue.push(g);
          return "P1 从全局取 " + gLabel(g);
        }
      ];
    }

    if (state.scene === "steal") {
      return [
        function () {
          bindMs();
          state.ps[1].queue = [];
          state.ps[1].runnext = null;
          return "场景：P1 饥饿，P0 积压多只 G";
        },
        function () {
          return "P1 发现本地/全局皆空 → 随机选 P0 尝试 work stealing";
        },
        function () {
          const src = state.ps[0];
          if (src.queue.length) {
            const half = Math.ceil(src.queue.length / 2);
            const stolen = src.queue.splice(0, half);
            state.ps[1].queue = state.ps[1].queue.concat(stolen);
            return (
              "偷取成功：从 P0 本地队列拿走 " +
              half +
              " 个 → " +
              stolen.map(gLabel).join(",")
            );
          }
          if (src.runnext) {
            const g = src.runnext;
            src.runnext = null;
            state.ps[1].runnext = g;
            g.state = "running";
            if (state.ps[1].m !== null) state.ms[state.ps[1].m].g = g.id;
            return "偷到 runnext " + gLabel(g) + "，P1 直接执行";
          }
          return "无可偷对象";
        },
        function () {
          const n = state.ps[1].queue.shift() || state.ps[1].runnext;
          if (n && !state.ps[1].runnext) {
            state.ps[1].runnext = n;
            n.state = "running";
            return "P1 调度被偷到的 " + gLabel(n);
          }
          return "P1 已恢复吞吐";
        }
      ];
    }

    // block
    return [
      function () {
        bindMs();
        const p0 = state.ps[0];
        if (p0.runnext) {
          p0.runnext.state = "running";
          state.ms[0].g = p0.runnext.id;
        }
        return "M0 正在执行 " + (p0.runnext ? gLabel(p0.runnext) : "G?");
      },
      function () {
        const m0 = state.ms[0];
        if (m0.g) {
          const g = findG(m0.g);
          if (g) {
            g.state = "blocked";
            g.note = "channel/syscall";
            if (state.ps[0].runnext && state.ps[0].runnext.id === g.id) {
              state.ps[0].runnext = null;
            }
            return gLabel(g) + " 进入阻塞（channel 或 syscall）";
          }
        }
        return null;
      },
      function () {
        const p0 = state.ps[0];
        const blockedId = state.ms[0].g;
        const blockedG = blockedId ? findG(blockedId) : null;
        state.ms[0].boundP = null;
        p0.m = null;
        if (blockedG) state.freeGs.push({ g: blockedG });
        state.ms[0].note = "带着阻塞 G 挂起";
        return "M0 与 P0 解绑，P0 空出，需另寻 M";
      },
      function () {
        const p0 = state.ps[0];
        const m2 = { id: state.ms.length, boundP: p0.id };
        state.ms.push(m2);
        p0.m = m2.id;
        const next = p0.queue.shift();
        if (next) {
          next.state = "running";
          m2.g = next.id;
          m2.note = "新 M 绑定 P0";
          return "调度器为 P0 绑定新 M，继续跑 " + gLabel(next);
        }
        return "P0 暂无可运行 G，M 可能自旋或休眠";
      }
    ];
  }

  let steps = [];
  let stepIdx = 0;

  function reset() {
    stopPlay();
    state = initState(sceneSel.value);
    bindMs();
    steps = scenarioScript();
    stepIdx = 0;
    if (logEl) logEl.innerHTML = "";
    render();
    log("已加载场景：" + sceneSel.options[sceneSel.selectedIndex].text);
  }

  function stepOnce() {
    if (stepIdx >= steps.length) {
      log("已到场景末尾，可重置或切换场景", "warn");
      stopPlay();
      return;
    }
    const msg = steps[stepIdx++]();
    state.tick++;
    render();
    if (msg) log(msg, stepIdx === 1 ? "accent" : null);
  }

  function stopPlay() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    playBtn.textContent = "播放";
  }

  function togglePlay() {
    if (timer) {
      stopPlay();
      return;
    }
    playBtn.textContent = "暂停";
    const speed = Number(speedEl.value) || 5;
    const ms = 1200 - speed * 100;
    timer = setInterval(stepOnce, Math.max(300, ms));
  }

  function stateColor(st) {
    if (st === "running") return "var(--st-run-cpu)";
    if (st === "runnable") return "var(--st-run)";
    if (st === "blocked") return "var(--st-block)";
    if (st === "done") return "var(--st-done)";
    return "var(--muted)";
  }

  function gChip(g) {
    if (!g) return "";
    return (
      '<span class="chip" style="border-color:' +
      stateColor(g.state) +
      ';color:' +
      stateColor(g.state) +
      '">' +
      gLabel(g) +
      (g.note ? " · " + g.note : "") +
      "</span>"
    );
  }

  function render() {
    let html = "";
    html += '<div style="display:grid;gap:12px">';

    html += '<div class="rt-box"><div class="rt-title">全局队列 · ' + state.global.length + " G</div>";
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px">';
    if (!state.global.length) html += '<span style="color:var(--faint)">empty</span>';
    state.global.forEach(function (g) {
      html += gChip(g);
    });
    html += "</div></div>";

    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px">';
    state.ps.forEach(function (p) {
      html += '<div class="rt-box"><div class="rt-title">P' + p.id + (p.m !== null ? " · M" + p.m : " · 无 M") + "</div>";
      html += "<div>runnext: " + (p.runnext ? gChip(p.runnext) : '<span style="color:var(--faint)">—</span>') + "</div>";
      html += '<div style="margin-top:8px">local q (' + p.queue.length + '): <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">';
      if (!p.queue.length) html += '<span style="color:var(--faint)">empty</span>';
      p.queue.forEach(function (g) {
        html += gChip(g);
      });
      html += "</div></div></div>";
    });
    html += "</div>";

    html += '<div class="rt-box"><div class="rt-title">Machines</div><div style="display:flex;flex-wrap:wrap;gap:8px">';
    state.ms.forEach(function (m) {
      html +=
        '<span class="chip">M' +
        m.id +
        (m.boundP !== null && m.boundP !== undefined ? "→P" + m.boundP : " unbound") +
        (m.g ? " exec G" + m.g : "") +
        (m.note ? " · " + m.note : "") +
        "</span>";
    });
    html += "</div></div></div>";
    stage.innerHTML = html;
  }

  stepBtn.addEventListener("click", function () {
    stopPlay();
    stepOnce();
  });
  playBtn.addEventListener("click", togglePlay);
  resetBtn.addEventListener("click", reset);
  sceneSel.addEventListener("change", reset);

  reset();
})();

(function () {
  const M = window.GoLens || window;
  const stage = document.getElementById("ctx-stage");
  const logEl = document.getElementById("ctx-log");
  const cancelBtn = document.getElementById("ctx-cancel");
  const resetBtn = document.getElementById("ctx-reset");
  const codePanel = document.getElementById("ctx-code");
  const storyRoot = document.getElementById("ctx-story");
  if (!stage) return;

  const TREE = {
    root: { id: "root", label: "Background", parent: null, x: 260, y: 40, children: ["work", "ui"] },
    work: { id: "work", label: "WithCancel", parent: "root", x: 140, y: 120, children: ["db"] },
    ui: { id: "ui", label: "WithTimeout", parent: "root", x: 380, y: 120, children: ["http"] },
    db: { id: "db", label: "query", parent: "work", x: 140, y: 200, children: [] },
    http: { id: "http", label: "fetch", parent: "ui", x: 380, y: 200, children: [] }
  };

  let status = {};

  function setCode(key) {
    if (!codePanel) return;
    codePanel.querySelectorAll(".code-line").forEach(function (line) {
      line.classList.toggle("is-active", line.getAttribute("data-code-key") === key);
    });
  }

  function log(tag, msg) {
    if (M.logLine) M.logLine(logEl, tag, msg);
  }

  function reset() {
    status = { root: "open", work: "open", ui: "open", db: "open", http: "open" };
    if (logEl) logEl.innerHTML = "";
    setCode("withcancel");
    render();
    log("MARK", "context 树就绪：root → work/ui → db/http");
  }

  function cancelSubtree(id) {
    const stack = [id];
    const changed = [];
    while (stack.length) {
      const cur = stack.pop();
      if (status[cur] === "open") {
        status[cur] = "canceled";
        changed.push(cur);
      }
      (TREE[cur].children || []).forEach(function (c) {
        stack.push(c);
      });
    }
    return changed;
  }

  function doCancel(id) {
    if (status[id] === "canceled") {
      log("BLOCK", TREE[id].label + " 已取消");
      render();
      return;
    }
    if (id === "root") {
      log("PANIC", "Background 根通常不 cancel；演示仍允许");
    }
    const changed = cancelSubtree(id);
    setCode("cancel");
    log("CANCEL", "cancel(" + TREE[id].label + ") → 级联：" + changed.map(function (c) { return TREE[c].label; }).join(" → "));
    render();
  }

  function fillOf(st) {
    if (st === "canceled") return "#b54a3c";
    return "#fffdf8";
  }

  function textOf(st) {
    return st === "canceled" ? "#fffdf8" : "#1a1814";
  }

  function render() {
    const W = 520;
    const H = 250;
    let edges = "";
    Object.keys(TREE).forEach(function (id) {
      const n = TREE[id];
      n.children.forEach(function (cid) {
        const c = TREE[cid];
        const dead = status[cid] === "canceled" || status[id] === "canceled";
        edges +=
          '<path d="M' + n.x + " " + (n.y + 22) + " L" + c.x + " " + (c.y - 22) +
          '" fill="none" stroke="' + (dead ? "#b54a3c" : "#c9c0ae") +
          '" stroke-width="1.6" stroke-dasharray="' + (dead ? "4 3" : "0") + '"/>';
      });
    });

    let nodes = "";
    Object.keys(TREE).forEach(function (id) {
      const n = TREE[id];
      const st = status[id];
      nodes +=
        '<g data-ctx="' + id + '" style="cursor:pointer" transform="translate(' + n.x + "," + n.y + ')">' +
        '<rect x="-70" y="-20" width="140" height="40" rx="10" fill="' + fillOf(st) +
        '" stroke="' + (st === "canceled" ? "#b54a3c" : "#c9c0ae") + '" stroke-width="1.5"/>' +
        '<text text-anchor="middle" dominant-baseline="central" fill="' + textOf(st) +
        '" font-family="var(--font-mono)" font-size="12">' + n.label + "</text></g>";
    });

    stage.innerHTML =
      '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" height="250" role="img" aria-label="context tree">' +
      edges +
      nodes +
      "</svg>" +
      '<div class="legend" style="margin-top:8px"><span><i style="background:#fffdf8;border:1px solid #c9c0ae"></i>open</span><span><i style="background:#b54a3c"></i>canceled</span><span>点击节点可取消</span></div>';

    stage.querySelectorAll("[data-ctx]").forEach(function (g) {
      g.addEventListener("click", function () {
        doCancel(g.getAttribute("data-ctx"));
      });
    });
  }

  cancelBtn.addEventListener("click", function () {
    doCancel("work");
  });
  resetBtn.addEventListener("click", reset);

  if (storyRoot && M.StoryGuide) {
    new M.StoryGuide({
      root: storyRoot,
      codePanel: storyRoot.querySelector(".code-track"),
      levels: [
        {
          title: "sync：先分清几把锁",
          metaphor: "Mutex=单人卫生间；RWMutex=多人可同时读；WaitGroup=等人齐再出发",
          body: "互斥锁保证临界区串行；读写锁允许多读一写；WaitGroup 用 Add/Done/Wait 等一组 goroutine；Once 保证初始化只跑一次。",
          codeKeys: ["mutex", "waitgroup", "once"],
          run: function () {
            reset();
            setCode("mutex");
          }
        },
        {
          title: "Context 是「取消信号树」",
          metaphor: "公司流程：上级驳回，下属未完成单据一并作废",
          body: "context.Background() 是根；WithCancel/WithTimeout/WithValue 派生子节点。取消会向子树传播，常用来停掉 HTTP 请求、DB 查询。",
          codeKeys: ["withcancel"],
          run: function () {
            reset();
            setCode("withcancel");
          }
        },
        {
          title: "取消 work 分支",
          metaphor: "部门经理驳回 → 该部门查询立刻停",
          body: "点「cancel(work)」或图中 work 节点：work 与 db 变为 canceled，ui/http 不受影响。这就是子树传播。",
          codeKeys: ["cancel"],
          run: function () {
            reset();
            doCancel("work");
          }
        },
        {
          title: "为什么函数第一个参数常是 ctx",
          metaphor: "随身携带「可被上级叫停」的工牌",
          body: "把 ctx 往下传，底层 API 才能在超时/取消时中断 I/O，避免 goroutine 泄漏。面试强调：ctx 不要存业务可选值当数据库用。",
          codeKeys: ["cancel", "withcancel"],
          run: function () {
            reset();
            doCancel("ui");
          }
        }
      ]
    });
  }

  reset();
})();

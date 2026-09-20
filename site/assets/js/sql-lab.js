(function () {
  const M = window.GoLens || window;
  const stage = document.getElementById("sql-stage");
  const logEl = document.getElementById("sql-log");
  const opSel = document.getElementById("sql-op");
  const stepBtn = document.getElementById("sql-step");
  const resetBtn = document.getElementById("sql-reset");
  const storyRoot = document.getElementById("sql-story");
  if (!stage) return;

  const OPS = {
    pool: {
      title: "连接池",
      steps: ["db = sql.Open（逻辑池）", "Query 取空闲 conn，无则新建（到 MaxOpen）", "用完 Close 归还池", "MaxIdle 回收闲置连接"],
      tip: "Open 不立刻拨号；真正连接在首次查询"
    },
    query: {
      title: "Query / QueryRow / Exec",
      steps: ["准备 SQL + 参数", "驱动执行", "rows 扫描到结构体/变量", "defer rows.Close()"],
      tip: "Exec 用于写；Query 用于读结果集"
    },
    tx: {
      title: "事务",
      steps: ["db.Begin() 得到 Tx", "Tx 上多次 Exec/Query", "成功 Commit / 失败 Rollback", "Tx 内连接独占直到结束"],
      tip: "不要在事务里做慢外部 IO"
    },
    inject: {
      title: "参数化防注入",
      steps: ["拼字符串 SQL 是坑", "使用 ? / $1 占位符", "driver 负责编码参数", "日志里注意脱敏"],
      tip: "永远参数化，不要手拼用户输入"
    }
  };

  let steps = [];
  let i = 0;

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
    const op = OPS[opSel.value] || OPS.pool;
    steps = op.steps;
    i = 0;
    if (logEl) logEl.innerHTML = "";
    setCode(opSel.value);
    render(op);
    log("MARK", op.title + " — " + op.tip);
  }

  function step() {
    const op = OPS[opSel.value] || OPS.pool;
    if (i >= steps.length) {
      log("BLOCK", "演示完毕");
      return;
    }
    i++;
    log("WAKE", "步骤 " + i + "：" + steps[i - 1]);
    setCode(opSel.value);
    render(op);
  }

  function render(op) {
    let rows = "";
    steps.forEach(function (s, idx) {
      const on = idx < i;
      rows +=
        '<div class="g-block" data-state="' + (on ? (idx === i - 1 ? "running" : "runnable") : "done") +
        '" style="margin:4px 0;width:100%;justify-content:space-between;cursor:default;opacity:' + (on ? "1" : "0.45") + '">' +
        "<span>" + s + "</span><span>" + (on ? "✓" : "") + "</span></div>";
    });
    stage.innerHTML =
      '<div class="rt-box"><div class="rt-title">' + op.title + "</div>" + rows +
      '<div style="margin-top:8px;font-size:13px;color:var(--muted)">' + op.tip + "</div></div>";
  }

  opSel.addEventListener("change", reset);
  stepBtn.addEventListener("click", step);
  resetBtn.addEventListener("click", reset);

  if (storyRoot && M.StoryGuide) {
    new M.StoryGuide({
      root: storyRoot,
      codePanel: storyRoot.querySelector(".code-track"),
      levels: [
        {
          title: "database/sql 是池",
          metaphor: "租车行：提车、用完还车",
          body: "sql.DB 管理连接池；业务代码拿的是句柄不是单一连接。",
          codeKeys: ["pool"],
          run: function () { opSel.value = "pool"; reset(); }
        },
        {
          title: "读写 API",
          metaphor: "填单与取货窗口分开",
          body: "Exec 写、Query 读；扫描用 Scan；rows 记得 Close。",
          codeKeys: ["query"],
          run: function () { opSel.value = "query"; reset(); step(); step(); }
        },
        {
          title: "事务",
          metaphor: "一单多笔，要么全成要么撤销",
          body: "Begin/Commit/Rollback；失败路径必须 Rollback。",
          codeKeys: ["tx"],
          run: function () { opSel.value = "tx"; reset(); step(); }
        },
        {
          title: "注入与慢查询",
          metaphor: "不要让客户自己写处方",
          body: "参数化 SQL；结合 ctx 超时与索引；避免事务包慢 IO。",
          codeKeys: ["inject"],
          run: function () { opSel.value = "inject"; reset(); step(); }
        }
      ]
    });
  }

  reset();
})();

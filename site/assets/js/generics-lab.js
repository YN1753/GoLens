(function () {
  const M = window.GoLens || window;
  const stage = document.getElementById("gen-stage");
  const logEl = document.getElementById("gen-log");
  const consSel = document.getElementById("gen-constraint");
  const typeSel = document.getElementById("gen-type");
  const runBtn = document.getElementById("gen-run");
  const resetBtn = document.getElementById("gen-reset");
  const storyRoot = document.getElementById("gen-story");
  if (!stage) return;

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

  const CONSTRAINTS = {
    num: { label: "int | float64", allow: ["int", "float64"], sig: "func Sum[T int | float64](xs []T) T" },
    ordered: { label: "constraints.Ordered 示意", allow: ["int", "float64", "string"], sig: "func Max[T Ordered](a, b T) T" },
    any: { label: "any", allow: ["int", "string", "bool"], sig: "func Print[T any](v T)" }
  };

  const TYPE_VALS = {
    int: { v: [1, 2, 3], pair: [3, 9] },
    float64: { v: [1.5, 2.5], pair: [1.5, 2.5] },
    string: { v: ["go", "lens"], pair: ["apple", "pear"] },
    bool: { v: [true], pair: [true, false] }
  };

  function reset() {
    if (logEl) logEl.innerHTML = "";
    setCode("decl");
    render(null);
    log("MARK", "选择约束与类型实参后点击实例化");
  }

  function run() {
    const ckey = consSel.value;
    const t = typeSel.value;
    const c = CONSTRAINTS[ckey];
    const ok = c.allow.indexOf(t) >= 0;
    setCode(ok ? "inst" : "fail");
    if (!ok) {
      log("PANIC", "类型 " + t + " 不满足约束 " + c.label + " → 编译期报错");
      render({ ok: false, sig: c.sig, t: t, c: c.label });
      return;
    }
    let demo = "";
    if (ckey === "num") {
      const arr = TYPE_VALS[t].v;
      const sum = arr.reduce(function (a, b) { return a + b; }, t === "string" ? "" : 0);
      demo = "Sum([]" + t + "{" + arr.join(", ") + "}) => " + sum;
    } else if (ckey === "ordered") {
      const p = TYPE_VALS[t].pair;
      const max = p[0] > p[1] ? p[0] : p[1];
      demo = "Max(" + p.join(", ") + ") => " + max;
    } else {
      demo = "Print(" + JSON.stringify(TYPE_VALS[t].v[0]) + ") // " + t;
    }
    log("WAKE", "实例化 T=" + t + " · " + demo);
    render({ ok: true, sig: c.sig, t: t, c: c.label, demo: demo });
  }

  function render(res) {
    const c = CONSTRAINTS[consSel.value];
    const t = typeSel.value;
    stage.innerHTML =
      '<div class="rt-box"><div class="rt-title">约束 · 类型实参</div>' +
      '<div style="font-family:var(--font-mono);font-size:13px;margin-bottom:8px">' +
      c.sig.replace(/</g, "&lt;") + "</div>" +
      '<div class="chip ' + (res && res.ok ? "chip-ok" : res ? "chip-warn" : "") + '">T = ' + t + " · 约束 " + c.label + "</div>" +
      (res
        ? '<div style="margin-top:12px;font-family:var(--font-mono);font-size:13px">' +
          (res.ok ? res.demo : "编译失败：约束不满足") +
          "</div>"
        : '<div style="margin-top:12px;color:var(--faint);font-size:12px">等待实例化…</div>') +
      "</div>";
  }

  consSel.addEventListener("change", function () {
    render(null);
  });
  typeSel.addEventListener("change", function () {
    render(null);
  });
  runBtn.addEventListener("click", run);
  resetBtn.addEventListener("click", reset);

  if (storyRoot && M.StoryGuide) {
    new M.StoryGuide({
      root: storyRoot,
      codePanel: storyRoot.querySelector(".code-track"),
      levels: [
        {
          title: "泛型 = 类型参数",
          metaphor: "同一套模具，换不同材料浇铸",
          body: "func F[T any](x T) 让一份代码服务多种类型，约束规定 T 必须满足什么（方法集 / 类型集合）。",
          codeKeys: ["decl"],
          run: function () { reset(); setCode("decl"); }
        },
        {
          title: "类型集合约束",
          metaphor: "只收白卡纸和铜版纸，不收木板",
          body: "int | float64 是类型集合；constraints.Ordered 表示可比较大小。不满足则编译失败，不是运行时反射。",
          codeKeys: ["decl"],
          run: function () {
            reset();
            consSel.value = "num";
            typeSel.value = "string";
            run();
          }
        },
        {
          title: "成功实例化",
          metaphor: "选定材料后开模出件",
          body: "T=int 时 Sum 可用。泛型在编译期处理，性能通常接近手写具体类型（有实现细节开销）。",
          codeKeys: ["inst"],
          run: function () {
            consSel.value = "num";
            typeSel.value = "int";
            run();
          }
        },
        {
          title: "工程建议",
          metaphor: "别为省几行把接口全改成泛型",
          body: "泛型适合容器/算法；业务接口仍用 interface。API 面过大时优先具体类型，保持可读。",
          codeKeys: ["decl"],
          run: function () { setCode("decl"); }
        }
      ]
    });
  }

  reset();
})();

(function () {
  const M = window.GoLens || window;
  const stage = document.getElementById("cheat-stage");
  const logEl = document.getElementById("cheat-log");
  const filterSel = document.getElementById("cheat-filter");
  const storyRoot = document.getElementById("cheat-story");
  if (!stage) return;

  const SHEETS = [
    { group: "语言", title: "string / slice", lines: ["len=字节；range 按 rune", "slice=ptr+len+cap", "append 满则扩容；共享数组用 copy"] },
    { group: "语言", title: "iface / defer / error", lines: ["iface≈类型+数据", "defer LIFO；panic 仍执行 defer", "%w 包装；Is/As 沿链"] },
    { group: "语言", title: "generics / reflect", lines: ["[T Constraint] 编译期检查", "TypeOf/Kind；改值要指针+Elem"] },
    { group: "语言", title: "json", lines: ["struct tag 映射字段", "omitempty 省略零值", "Encoder/Decoder 流式"] },
    { group: "并发", title: "GMP / channel", lines: ["G/P/M；P=GOMAXPROCS", "本地+全局+steal", "hchan buf+sendq/recvq；cap=0 会合"] },
    { group: "并发", title: "select / sync / ctx", lines: ["多路伪随机；default 非阻塞", "Mutex/WG/Once", "ctx 取消向子树传播"] },
    { group: "并发", title: "netpoller / net/http", lines: ["IO 阻塞 G 让出，netpoll 唤醒", "Accept → 每连接一个 G", "Handler 传 r.Context()"] },
    { group: "并发", title: "patterns / locks / atomic", lines: ["Worker/Fan/Pipeline/or-done", "锁保护多字段临界区", "单值计数用 atomic/CAS"] },
    { group: "并发", title: "memmodel", lines: ["无同步共享写=data race", "channel/mutex/once/atomic 建 hb", "-race 当 bug 修"] },
    { group: "内存", title: "escape / GC", lines: ["栈快堆 GC 托管", "指针/闭包/接口易逃逸", "三色+写屏障+短 STW；GOGC/GOMEMLIMIT"] },
    { group: "工程", title: "test / modules / toolchain", lines: ["table-driven + -race", "go mod tidy；go work 多模块", "build/run/vet 工具链"] },
    { group: "工程", title: "embed / sql / perf", lines: ["//go:embed 编译期打包", "sql.DB 池；参数化防注入", "pprof 先测量再优化"] },
    { group: "工程", title: "checklist / shutdown / obs", lines: ["质量/测试/发布/Review", "Shutdown + 限流 + 超时", "Logs/Metrics/Trace/SLO"] },
    { group: "综合", title: "drill 方法", lines: ["先口述再对照 Lab", "高并发=调度+IO+模式", "正确性=channel/sync/ctx；性能=逃逸/GC/pprof"] }
  ];

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

  function render() {
    const f = filterSel.value;
    const list = SHEETS.filter(function (s) {
      return f === "all" || s.group === f;
    });
    let html = "<div style=\"display:grid;gap:10px\">";
    list.forEach(function (s) {
      html += "<div class=\"rt-box\"><div class=\"rt-title\">" + s.group + " · " + s.title + "</div><ul class=\"cheat-ul\">";
      s.lines.forEach(function (l) {
        html += "<li class=\"cheat-li\">" + l + "</li>";
      });
      html += "</ul></div>";
    });
    html += "</div>";
    stage.innerHTML = html;
  }

  filterSel.addEventListener("change", function () {
    setCode(filterSel.value);
    render();
    log("MARK", "筛选：" + filterSel.options[filterSel.selectedIndex].text + " · " + stage.querySelectorAll(".rt-box").length + " 组");
  });

  if (storyRoot && M.StoryGuide) {
    new M.StoryGuide({
      root: storyRoot,
      codePanel: storyRoot.querySelector(".code-track"),
      levels: [
        {
          title: "口袋卡片",
          metaphor: "考前 5 分钟",
          body: "覆盖语言/并发/内存/工程/综合，按组筛选后遮住答案口述。",
          codeKeys: ["all"],
          run: function () {
            filterSel.value = "all";
            setCode("all");
            render();
            log("MARK", "速查总览：全部分组");
          }
        },
        {
          title: "语言卡",
          metaphor: "基础口算",
          body: "string/slice/error/defer/json/generics/reflect。",
          codeKeys: ["语言"],
          run: function () { filterSel.value = "语言"; setCode("语言"); render(); }
        },
        {
          title: "并发卡",
          metaphor: "调度与管道口诀",
          body: "GMP、channel、select/sync/ctx、HTTP、模式、锁、atomic、内存模型。",
          codeKeys: ["并发"],
          run: function () { filterSel.value = "并发"; setCode("并发"); render(); }
        },
        {
          title: "工程与综合",
          metaphor: "出厂检验与收口",
          body: "test/modules/toolchain/embed/sql/perf/checklist/shutdown/obs/drill。",
          codeKeys: ["工程", "综合"],
          run: function () { filterSel.value = "工程"; setCode("工程"); render(); }
        }
      ]
    });
  }

  render();
  log("MARK", "速查总览就绪（已覆盖全站主题）");
})();

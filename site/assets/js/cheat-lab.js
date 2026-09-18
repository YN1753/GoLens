(function () {
  const M = window.GoLens || window;
  const stage = document.getElementById("cheat-stage");
  const logEl = document.getElementById("cheat-log");
  const filterSel = document.getElementById("cheat-filter");
  const storyRoot = document.getElementById("cheat-story");
  if (!stage) return;

  const SHEETS = [
    { group: "语言", title: "string", lines: ["len = 字节不是字符", "range 按 rune，i 是字节下标", "拼接用 strings.Builder"] },
    { group: "语言", title: "slice", lines: ["ptr + len + cap", "append 满则扩容搬家", "子切片可能共享底层数组"] },
    { group: "语言", title: "error", lines: ["%w 保留错误链", "errors.Is 哨兵", "errors.As 取类型"] },
    { group: "语言", title: "iface / defer", lines: ["iface 大致等于类型加数据", "defer LIFO", "panic 仍跑 defer，recover 可止"] },
    { group: "语言", title: "generics", lines: ["类型参数加约束", "不满足约束在编译期失败"] },
    { group: "并发", title: "GMP", lines: ["G / P / M，P 等于 GOMAXPROCS", "本地队列 + 全局 + steal", "阻塞可能导致 M 与 P 解绑"] },
    { group: "并发", title: "channel", lines: ["hchan：buf + sendq / recvq", "cap=0 会合交接", "close 后 recv 零值，send panic"] },
    { group: "并发", title: "select / sync / ctx", lines: ["select 多路伪随机", "default 非阻塞", "ctx 取消向子树传播"] },
    { group: "并发", title: "locks", lines: ["Mutex 成对 Lock / Unlock", "WaitGroup Add 在启动前", "sync.Map 先测再换"] },
    { group: "内存", title: "escape / GC", lines: ["栈快，堆交给 GC", "指针 / 闭包 / 接口易逃逸", "三色 + 写屏障 + 短 STW"] },
    { group: "工程", title: "test / mod / perf", lines: ["表格驱动 t.Run", "go mod tidy 对齐 import", "pprof 先测量再优化"] }
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
    log("MARK", "筛选：" + filterSel.options[filterSel.selectedIndex].text);
  });

  if (storyRoot && M.StoryGuide) {
    new M.StoryGuide({
      root: storyRoot,
      codePanel: storyRoot.querySelector(".code-track"),
      levels: [
        {
          title: "这是什么",
          metaphor: "考前口袋卡片",
          body: "把各章速查收成一页，按语言 / 并发 / 内存 / 工程筛选。",
          codeKeys: ["all"],
          run: function () {
            filterSel.value = "all";
            setCode("all");
            render();
            log("MARK", "速查总览：默认显示全部");
          }
        },
        {
          title: "语言卡",
          metaphor: "基础口算表",
          body: "string / slice / error / defer / generics 最容易被追问细节。",
          codeKeys: ["语言"],
          run: function () {
            filterSel.value = "语言";
            setCode("语言");
            render();
          }
        },
        {
          title: "并发卡",
          metaphor: "调度与管道的口诀",
          body: "GMP + channel + select / sync / ctx + 锁。",
          codeKeys: ["并发"],
          run: function () {
            filterSel.value = "并发";
            setCode("并发");
            render();
          }
        },
        {
          title: "怎么用",
          metaphor: "先遮住答案口述",
          body: "看到关键词能否 30 秒说清机制？不能就回对应章节 Lab。",
          codeKeys: ["all"],
          run: function () {
            filterSel.value = "all";
            setCode("all");
            render();
          }
        }
      ]
    });
  }

  render();
  log("MARK", "速查总览就绪");
})();

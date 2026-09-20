/** Single source of truth for site chapters (pedagogical order). */
(function (global) {
  const GoLens = (global.GoLens = global.GoLens || {});

  GoLens.CHAPTERS = [
    { id: "home", idx: "00", href: "index.html", title: "首页", short: "首页", group: "root" },

    { id: "string", idx: "01", href: "string.html", title: "string 与 range", short: "string", group: "语言" },
    { id: "slice", idx: "02", href: "slice-map.html", title: "Slice 与 Map", short: "Slice/Map", group: "语言" },
    { id: "iface", idx: "03", href: "iface-defer.html", title: "Interface · defer", short: "iface/defer", group: "语言" },
    { id: "error", idx: "04", href: "error.html", title: "错误处理", short: "error", group: "语言" },
    { id: "generics", idx: "05", href: "generics.html", title: "泛型直觉", short: "generics", group: "语言" },
    { id: "reflect", idx: "06", href: "reflect.html", title: "reflect 直觉", short: "reflect", group: "语言" },
    { id: "json", idx: "07", href: "json.html", title: "JSON 序列化", short: "json", group: "语言" },

    { id: "gmp", idx: "08", href: "gmp.html", title: "GMP 调度", short: "GMP", group: "并发" },
    { id: "channel", idx: "09", href: "channel.html", title: "Channel 底层", short: "Channel", group: "并发" },
    { id: "select", idx: "10", href: "select.html", title: "Select 与定时器", short: "select", group: "并发" },
    { id: "sync", idx: "11", href: "sync-context.html", title: "sync / Context", short: "sync/ctx", group: "并发" },
    { id: "netpoller", idx: "12", href: "netpoller.html", title: "Netpoller 与 IO", short: "netpoller", group: "并发" },
    { id: "nethttp", idx: "13", href: "nethttp.html", title: "net/http 服务模型", short: "net/http", group: "并发" },
    { id: "patterns", idx: "14", href: "patterns.html", title: "并发模式", short: "patterns", group: "并发" },
    { id: "locks", idx: "15", href: "locks.html", title: "锁与 sync.Map", short: "locks", group: "并发" },
    { id: "memmodel", idx: "16", href: "memmodel.html", title: "内存模型", short: "happens-before", group: "并发" },

    { id: "memory", idx: "17", href: "memory.html", title: "内存与逃逸", short: "逃逸", group: "内存" },
    { id: "gc", idx: "18", href: "gc.html", title: "GC 三色标记", short: "GC", group: "内存" },

    { id: "testing", idx: "19", href: "testing.html", title: "测试与基准", short: "testing", group: "工程" },
    { id: "modules", idx: "20", href: "modules.html", title: "模块与依赖", short: "modules", group: "工程" },
    { id: "toolchain", idx: "21", href: "toolchain.html", title: "go toolchain", short: "toolchain", group: "工程" },
    { id: "sql", idx: "22", href: "sql.html", title: "SQL 与连接池", short: "sql/pool", group: "工程" },
    { id: "perf", idx: "23", href: "perf.html", title: "性能排查直觉", short: "pprof", group: "工程" },
    { id: "checklist", idx: "24", href: "checklist.html", title: "工程清单", short: "checklist", group: "工程" },
    { id: "shutdown", idx: "25", href: "shutdown.html", title: "优雅关闭与限流", short: "shutdown", group: "工程" },
    { id: "observability", idx: "26", href: "observability.html", title: "可观测性", short: "logs/metrics", group: "工程" },

    { id: "drill", idx: "27", href: "drill.html", title: "综合演练", short: "drill", group: "综合" },
    { id: "cheat", idx: "28", href: "cheat.html", title: "速查总览", short: "cheat", group: "综合" }
  ];

  GoLens.studyChapters = function () {
    return GoLens.CHAPTERS.filter(function (c) { return c.id !== "home"; });
  };
  GoLens.isChapterRead = function (id) {
    if (id === "home") return false;
    try { return localStorage.getItem("golens-read-" + id) === "1"; } catch (e) { return false; }
  };
  GoLens.nextUnreadChapter = function () {
    const list = GoLens.studyChapters();
    for (let i = 0; i < list.length; i++) {
      if (!GoLens.isChapterRead(list[i].id)) return { chapter: list[i], allRead: false };
    }
    return { chapter: list[0] || null, allRead: true };
  };
  GoLens.neighbors = function (id) {
    const list = GoLens.CHAPTERS;
    let i = -1;
    for (let k = 0; k < list.length; k++) if (list[k].id === id) { i = k; break; }
    if (i < 0) return { prev: null, next: null };
    return { prev: list[i - 1] || null, next: list[i + 1] || null };
  };
})(window);

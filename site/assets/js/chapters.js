/** Single source of truth for site chapters. */
(function (global) {
  const GoLens = (global.GoLens = global.GoLens || {});
  GoLens.CHAPTERS = [
    { id: "home", idx: "00", href: "index.html", title: "首页", short: "首页" },
    { id: "gmp", idx: "01", href: "gmp.html", title: "GMP 调度", short: "GMP" },
    { id: "channel", idx: "02", href: "channel.html", title: "Channel 底层", short: "Channel" },
    { id: "gc", idx: "03", href: "gc.html", title: "GC 三色标记", short: "GC" },
    { id: "slice", idx: "04", href: "slice-map.html", title: "Slice 与 Map", short: "Slice/Map" },
    { id: "sync", idx: "05", href: "sync-context.html", title: "sync / Context", short: "sync/ctx" },
    { id: "memory", idx: "06", href: "memory.html", title: "内存与逃逸", short: "逃逸" },
    { id: "iface", idx: "07", href: "iface-defer.html", title: "Interface · defer", short: "iface/defer" },
    { id: "select", idx: "08", href: "select.html", title: "Select 与定时器", short: "select" },
    { id: "string", idx: "09", href: "string.html", title: "string 与 range", short: "string" }
  ];

  GoLens.isChapterRead = function (id) {
    if (id === "home") return false;
    try {
      return localStorage.getItem("golens-read-" + id) === "1";
    } catch (e) {
      return false;
    }
  };

  GoLens.nextUnreadChapter = function () {
    const list = GoLens.CHAPTERS.filter(function (c) {
      return c.id !== "home";
    });
    for (let i = 0; i < list.length; i++) {
      if (!GoLens.isChapterRead(list[i].id)) return { chapter: list[i], allRead: false };
    }
    return { chapter: list[0] || null, allRead: true };
  };
})(window);

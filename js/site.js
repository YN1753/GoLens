(function () {
  const sidebar = document.querySelector(".sidebar");
  const menuBtn = document.querySelector(".menu-btn");
  const scrim = document.querySelector(".scrim");

  function setNavOpen(open) {
    if (!sidebar) return;
    sidebar.classList.toggle("is-open", open);
    if (scrim) scrim.classList.toggle("is-open", open);
    if (menuBtn) menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  if (menuBtn) {
    menuBtn.addEventListener("click", function () {
      setNavOpen(!sidebar.classList.contains("is-open"));
    });
  }

  if (scrim) {
    scrim.addEventListener("click", function () {
      setNavOpen(false);
    });
  }

  const page = document.body.getAttribute("data-page");
  if (page) {
    document.querySelectorAll(".nav-link[data-page]").forEach(function (link) {
      link.classList.toggle("is-active", link.getAttribute("data-page") === page);
      if (link.getAttribute("data-page") === page) {
        link.setAttribute("aria-current", "page");
      }
    });
  }

  window.GoLens = window.GoLens || {};

  window.GoLens.log = function (el, message, kind) {
    if (!el) return;
    const line = document.createElement("div");
    line.className = "log-line is-new" + (kind ? " log-" + kind : "");
    const ts = document.createElement("span");
    ts.className = "log-ts";
    ts.textContent = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    line.appendChild(ts);
    line.appendChild(document.createTextNode(message));
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
    el.querySelectorAll(".log-line.is-new").forEach(function (n, i, arr) {
      if (i < arr.length - 1) n.classList.remove("is-new");
    });
  };

  window.GoLens.downloadJSON = function (data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
})();

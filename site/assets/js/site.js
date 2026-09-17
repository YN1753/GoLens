(function () {
  const sidebar = document.querySelector(".sidebar");
  const menuBtn = document.querySelector(".menu-btn");
  const scrim = document.querySelector(".scrim");
  const topbarActions = document.querySelector(".topbar-actions");
  const content = document.querySelector(".content");
  const page = document.body.getAttribute("data-page");

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

  /* ---------- TOC ---------- */
  function slugify(text) {
    return String(text)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\u4e00-\u9fff-]+/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "sec";
  }

  function ensureHeadingIds(root) {
    const used = Object.create(null);
    root.querySelectorAll("h2, h3").forEach(function (h) {
      let id = h.id;
      if (!id) {
        id = slugify(h.textContent || "sec");
        let n = id;
        let i = 2;
        while (used[n] || document.getElementById(n)) {
          n = id + "-" + i++;
        }
        id = n;
        h.id = id;
      }
      used[id] = true;
      h.style.scrollMarginTop = "64px";
    });
  }

  function buildToc(root) {
    if (!root || root.querySelector(".page-toc")) return;
    const heads = Array.prototype.slice.call(root.querySelectorAll("h2[id]"));
    if (heads.length < 2) return;
    const nav = document.createElement("nav");
    nav.className = "page-toc";
    nav.setAttribute("aria-label", "本页目录");
    nav.innerHTML = '<div class="page-toc-title">本页目录</div><ol class="page-toc-list"></ol>';
    const ol = nav.querySelector("ol");
    heads.forEach(function (h) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = "#" + h.id;
      a.textContent = h.textContent;
      a.setAttribute("data-toc-for", h.id);
      li.appendChild(a);
      ol.appendChild(li);
    });
    // Place TOC after intro verdict/lede when present
    const h1 = root.querySelector("h1");
    let anchor = null;
    if (h1) {
      let el = h1.nextElementSibling;
      while (el && (el.classList.contains("eyebrow") || el.tagName === "P" || el.classList.contains("verdict") || el.classList.contains("lede") || el.classList.contains("beginner-tip"))) {
        anchor = el;
        el = el.nextElementSibling;
      }
      if (anchor) anchor.insertAdjacentElement("afterend", nav);
      else h1.insertAdjacentElement("afterend", nav);
    } else {
      root.insertBefore(nav, root.firstChild);
    }

    if ("IntersectionObserver" in window) {
      const links = nav.querySelectorAll("[data-toc-for]");
      const map = {};
      links.forEach(function (a) {
        map[a.getAttribute("data-toc-for")] = a;
      });
      const io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            links.forEach(function (a) {
              a.classList.toggle("is-active", a.getAttribute("data-toc-for") === en.target.id);
            });
          });
        },
        { rootMargin: "-20% 0px -65% 0px", threshold: 0 }
      );
      heads.forEach(function (h) {
        io.observe(h);
      });
    }
  }

  /* ---------- Reading progress ---------- */
  function setupProgress() {
    if (!sidebar || !content) return;
    let bar = sidebar.querySelector(".read-progress");
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "read-progress";
      bar.innerHTML =
        '<div class="read-progress-label">阅读 <span data-read-pct>0%</span></div>' +
        '<div class="read-progress-track"><div class="read-progress-fill" data-read-fill></div></div>';
      const foot = sidebar.querySelector(".sidebar-foot");
      if (foot) sidebar.insertBefore(bar, foot);
      else sidebar.appendChild(bar);
    }
    const pctEl = bar.querySelector("[data-read-pct]");
    const fill = bar.querySelector("[data-read-fill]");
    function update() {
      const rect = content.getBoundingClientRect();
      const total = content.scrollHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
      const pct = total <= 0 ? 100 : Math.round((scrolled / total) * 100);
      if (pctEl) pctEl.textContent = pct + "%";
      if (fill) fill.style.width = pct + "%";
      if (page && page !== "home") {
        try {
          if (pct >= 90) localStorage.setItem("golens-read-" + page, "1");
        } catch (e) {}
      }
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  }

  /* ---------- In-page search ---------- */
  function clearHits(root) {
    root.querySelectorAll("mark.search-hit").forEach(function (m) {
      const parent = m.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(m.textContent || ""), m);
      parent.normalize();
    });
    root.querySelectorAll(".is-search-target").forEach(function (el) {
      el.classList.remove("is-search-target");
    });
  }

  function highlightInNode(node, query) {
    // only search text in block elements; skip labs/pre inputs
    if (!node || node.nodeType === 1) {
      if (node && node.closest && node.closest(".lab, pre, code, script, style, input, select, textarea")) {
        return 0;
      }
    }
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue || "";
      const lower = text.toLowerCase();
      const q = query.toLowerCase();
      let from = 0;
      let hits = 0;
      let acc = document.createDocumentFragment();
      while (true) {
        const idx = lower.indexOf(q, from);
        if (idx < 0) break;
        if (idx > from) acc.appendChild(document.createTextNode(text.slice(from, idx)));
        const mark = document.createElement("mark");
        mark.className = "search-hit";
        mark.textContent = text.slice(idx, idx + query.length);
        acc.appendChild(mark);
        hits++;
        from = idx + query.length;
      }
      if (!hits) return 0;
      if (from < text.length) acc.appendChild(document.createTextNode(text.slice(from)));
      if (node.parentNode) node.parentNode.replaceChild(acc, node);
      return hits;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return 0;
    if (node.tagName === "MARK") return 0;
    let hits = 0;
    const children = Array.prototype.slice.call(node.childNodes);
    children.forEach(function (child) {
      hits += highlightInNode(child, query);
    });
    return hits;
  }

  function findBlocks(root) {
    return Array.prototype.slice.call(
      root.querySelectorAll("p, li, summary, h2, h3, td, .verdict, .callout, .cheat li, .story-body, .story-title, .story-metaphor")
    ).filter(function (el) {
      return !el.closest(".lab-log, .code-panel, .code-track, pre");
    });
  }

  function runSearch(root, query, statusEl) {
    clearHits(root);
    if (!query || query.length < 1) {
      if (statusEl) statusEl.textContent = "";
      return;
    }
    const q = query.toLowerCase();
    const blocks = findBlocks(root);
    let firstHit = null;
    let count = 0;
    blocks.forEach(function (block) {
      if ((block.textContent || "").toLowerCase().indexOf(q) < 0) return;
      count += highlightInNode(block, query);
      if (!firstHit) firstHit = block;
    });
    if (statusEl) {
      statusEl.textContent = count ? count + " 处命中" : "无匹配";
      statusEl.classList.toggle("is-empty", !count);
    }
    if (firstHit) {
      firstHit.classList.add("is-search-target");
      firstHit.scrollIntoView({ block: "center", behavior: "smooth" });
      window.setTimeout(function () {
        firstHit.classList.remove("is-search-target");
      }, 1600);
    }
  }

  function setupSearch() {
    if (!topbarActions || !content) return;
    if (document.getElementById("page-search")) return;
    const wrap = document.createElement("div");
    wrap.className = "page-search";
    wrap.innerHTML =
      '<input id="page-search" type="search" placeholder="搜索本页…  ( / )" aria-label="搜索本页" autocomplete="off" />' +
      '<div class="page-search-status" data-search-status role="status"></div>';
    topbarActions.insertBefore(wrap, topbarActions.firstChild);
    const input = wrap.querySelector("#page-search");
    const status = wrap.querySelector("[data-search-status]");
    let timer = null;
    input.addEventListener("input", function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        runSearch(content, input.value.trim(), status);
      }, 120);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        input.value = "";
        clearHits(content);
        status.textContent = "";
        input.blur();
      }
    });
    document.addEventListener("keydown", function (e) {
      const tag = (e.target && e.target.tagName) || "";
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target && e.target.isContentEditable);
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        input.focus();
        input.select();
      }
      if (e.key === "Escape") {
        setNavOpen(false);
        if (document.activeElement === input || input.value) {
          input.value = "";
          clearHits(content);
          status.textContent = "";
          input.blur();
        }
      }
    });
  }

  /* ---------- boot ---------- */
  if (content) {
    ensureHeadingIds(content);
    buildToc(content);
  }
  setupProgress();
  setupSearch();
})();

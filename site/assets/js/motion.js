/**
 * Shared zero-dep motion + lab utilities for GoLens.
 */
(function (global) {
  const GoLens = (global.GoLens = global.GoLens || {});

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function now() {
    return performance.now();
  }

  /** Record first positions of elements keyed by data-flip-id. */
  function flipCapture(root, selector) {
    const map = new Map();
    root.querySelectorAll(selector || "[data-flip-id]").forEach(function (el) {
      map.set(el.getAttribute("data-flip-id"), el.getBoundingClientRect());
    });
    return map;
  }

  /**
   * FLIP: run mutate(), then animate elements from old to new rects.
   * @param {HTMLElement} root
   * @param {Function} mutate
   * @param {{selector?:string, duration?:number, easing?:string}} opts
   */
  function flipAnimate(root, mutate, opts) {
    opts = opts || {};
    const selector = opts.selector || "[data-flip-id]";
    const duration = reduceMotion ? 0 : opts.duration || 240;
    const easing = opts.easing || "cubic-bezier(0.22, 1, 0.36, 1)";
    const first = flipCapture(root, selector);
    mutate();
    const last = flipCapture(root, selector);
    last.forEach(function (to, id) {
      const from = first.get(id);
      const el = root.querySelector('[data-flip-id="' + CSS.escape(id) + '"]');
      if (!el) return;
      if (!from) {
        if (!duration) return;
        el.animate(
          [
            { opacity: 0, transform: "scale(0.86)" },
            { opacity: 1, transform: "scale(1)" }
          ],
          { duration: duration, easing: easing }
        );
        return;
      }
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      if (!dx && !dy) return;
      if (!duration) return;
      el.animate(
        [
          { transform: "translate(" + dx + "px," + dy + "px)" },
          { transform: "translate(0,0)" }
        ],
        { duration: duration, easing: easing }
      );
    });
    // elements that vanished
    first.forEach(function (_from, id) {
      if (last.has(id)) return;
      // already removed from DOM by mutate — nothing to animate unless clone left behind
    });
  }

  function pulse(el, keyframes, options) {
    if (!el || reduceMotion) return null;
    return el.animate(keyframes, options || { duration: 420, easing: "ease-out" });
  }

  function flash(el, color, times) {
    if (!el || reduceMotion) return;
    el.animate(
      [
        { backgroundColor: "transparent" },
        { backgroundColor: color || "rgba(181,74,60,0.28)" },
        { backgroundColor: "transparent" }
      ],
      { duration: 560, iterations: times || 2, easing: "ease-in-out" }
    );
  }

  /** Polar helpers for circular channel dial. */
  function polar(cx, cy, r, angleRad) {
    return {
      x: cx + r * Math.cos(angleRad),
      y: cy + r * Math.sin(angleRad)
    };
  }

  function angleForIndex(index, capacity) {
    // start at top (-PI/2), clockwise
    return -Math.PI / 2 + (index / Math.max(capacity, 1)) * Math.PI * 2;
  }

  function createSvgArc(cx, cy, r, a0, a1) {
    const p0 = polar(cx, cy, r, a0);
    const p1 = polar(cx, cy, r, a1);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return (
      "M " + p0.x.toFixed(2) + " " + p0.y.toFixed(2) +
      " A " + r + " " + r + " 0 " + large + " 1 " + p1.x.toFixed(2) + " " + p1.y.toFixed(2)
    );
  }

  const TAGS = {
    STEAL: "accent",
    WAKE: "ok",
    BLOCK: "warn",
    BARRIER: "accent",
    SEND: "ok",
    RECV: "ok",
    CLOSE: "warn",
    PANIC: "warn",
    STW: "accent",
    MARK: "accent",
    SYS: "warn",
    BIND: "ok",
    CANCEL: "warn"
  };

  /**
   * Tagged log line. message may be plain text.
   */
  function logLine(el, tag, message) {
    if (!el) return;
    const line = document.createElement("div");
    line.className = "log-line is-new";
    const ts = document.createElement("span");
    ts.className = "log-ts";
    ts.textContent = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    line.appendChild(ts);
    if (tag) {
      const t = document.createElement("span");
      t.className = "log-tag log-tag-" + (TAGS[tag] || "accent");
      t.textContent = "[" + tag + "]";
      line.appendChild(t);
    }
    line.appendChild(document.createTextNode(message));
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
    const lines = el.querySelectorAll(".log-line.is-new");
    for (let i = 0; i < lines.length - 1; i++) lines[i].classList.remove("is-new");
  }

  /** Snapshot history for scrubbing. */
  function Timeline() {
    this.frames = [];
    this.index = -1;
  }
  Timeline.prototype.push = function (state, label) {
    // drop redo tail
    this.frames = this.frames.slice(0, this.index + 1);
    this.frames.push({ state: JSON.parse(JSON.stringify(state)), label: label || "" });
    this.index = this.frames.length - 1;
    if (this.frames.length > 80) {
      this.frames.shift();
      this.index--;
    }
  };
  Timeline.prototype.seek = function (i) {
    if (!this.frames.length) return null;
    this.index = Math.max(0, Math.min(this.frames.length - 1, i));
    return this.frames[this.index];
  };
  Timeline.prototype.current = function () {
    return this.frames[this.index] || null;
  };
  Timeline.prototype.atStart = function () {
    return this.index <= 0;
  };
  Timeline.prototype.atEnd = function () {
    return this.index >= this.frames.length - 1;
  };

  function bindTimelineControls(root, timeline, onChange) {
    const range = root.querySelector("[data-timeline-range]");
    const label = root.querySelector("[data-timeline-label]");
    if (!range) return;
    function sync() {
      range.max = String(Math.max(0, timeline.frames.length - 1));
      range.value = String(timeline.index);
      if (label) label.textContent = timeline.frames[timeline.index] ? timeline.frames[timeline.index].label : "—";
    }
    range.addEventListener("input", function () {
      const frame = timeline.seek(Number(range.value));
      if (frame) onChange(frame);
      sync();
    });
    return { sync: sync };
  }

  GoLens.reduceMotion = reduceMotion;
  GoLens.flipCapture = flipCapture;
  GoLens.flipAnimate = flipAnimate;
  GoLens.pulse = pulse;
  GoLens.flash = flash;
  GoLens.polar = polar;
  GoLens.angleForIndex = angleForIndex;
  GoLens.createSvgArc = createSvgArc;
  GoLens.logLine = logLine;
  GoLens.TAGS = TAGS;
  GoLens.Timeline = Timeline;
  GoLens.bindTimelineControls = bindTimelineControls;
})(window);

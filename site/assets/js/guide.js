/**
 * Beginner guided storyline + Go code dual-track helpers.
 */
(function (global) {
  const GoLens = (global.GoLens = global.GoLens || {});

  function StoryGuide(opts) {
    this.root = opts.root;
    this.levels = opts.levels || [];
    this.index = 0;
    this.onChange = opts.onChange || function () {};
    this.codePanel = opts.codePanel || (this.root && this.root.querySelector(".code-track"));
    this._bind();
    if (this.levels.length) {
      this.render();
      // fire first level setup
      const lv = this.levels[0];
      if (lv && typeof lv.run === "function") lv.run();
      this.onChange(lv, 0);
    }
  }

  StoryGuide.prototype._bind = function () {
    const self = this;
    const prev = this.root.querySelector("[data-story-prev]");
    const next = this.root.querySelector("[data-story-next]");
    if (prev) {
      prev.addEventListener("click", function () {
        self.go(self.index - 1);
      });
    }
    if (next) {
      next.addEventListener("click", function () {
        self.go(self.index + 1);
      });
    }
  };

  StoryGuide.prototype.go = function (i) {
    if (i < 0 || i >= this.levels.length) return;
    this.index = i;
    this.render();
    const lv = this.levels[i];
    if (lv && typeof lv.run === "function") lv.run();
    this.onChange(lv, i);
  };

  StoryGuide.prototype.render = function () {
    const lv = this.levels[this.index];
    if (!lv || !this.root) return;
    const self = this;

    function setText(sel, text) {
      const el = self.root.querySelector(sel);
      if (el) el.textContent = text || "";
    }

    setText("[data-story-step]", "关卡 " + (this.index + 1) + " / " + this.levels.length);
    setText("[data-story-title]", lv.title);
    setText("[data-story-metaphor]", lv.metaphor);
    setText("[data-story-body]", lv.body);

    const prev = this.root.querySelector("[data-story-prev]");
    const next = this.root.querySelector("[data-story-next]");
    if (prev) prev.disabled = this.index <= 0;
    if (next) next.disabled = this.index >= this.levels.length - 1;

    const dots = this.root.querySelector("[data-story-dots]");
    if (dots) {
      dots.innerHTML = "";
      this.levels.forEach(function (_lv, i) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "story-dot" + (i === self.index ? " is-on" : "");
        b.setAttribute("aria-label", "关卡 " + (i + 1));
        b.addEventListener("click", function () {
          self.go(i);
        });
        dots.appendChild(b);
      });
    }

    this.highlightCode(lv.codeKeys || []);
  };

  StoryGuide.prototype.highlightCode = function (keys) {
    const panel = this.codePanel || this.root.querySelector(".code-track");
    if (!panel) return;
    panel.querySelectorAll(".code-line").forEach(function (line) {
      const key = line.getAttribute("data-code-key");
      const on = keys.indexOf(key) >= 0;
      line.classList.toggle("is-active", on);
      line.classList.toggle("is-dim", keys.length > 0 && !on);
    });
  };

  GoLens.StoryGuide = StoryGuide;
})(window);

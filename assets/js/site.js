// Gon landing page motion. Motion (motion.dev, MIT) drives scroll-linked and in-view animation; the story steps
// and the menu bar demo also work without it. Everything stays put for visitors who ask for less motion.
(function () {
  "use strict";

  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches || /[?&]nomotion\b/.test(location.search);
  var M = window.Motion;
  if (!M) root.classList.add("no-motion-lib");
  var ease = [0.2, 0.7, 0.2, 1];
  var canAnimate = M && !reduce;

  // ---------- Hero: in, then away as you scroll past ----------
  if (canAnimate) {
    M.animate(".hero [data-in]", { opacity: [0, 1], y: [18, 0] }, { delay: M.stagger(0.08, { startDelay: 0.1 }), duration: 0.8, ease: ease });
    M.animate(".hero-icon", { opacity: [0, 1], scale: [0.8, 1], y: [10, 0] }, { duration: 0.9, ease: ease });

    var hero = document.querySelector(".hero");
    M.scroll(M.animate(".hero-icon", { y: [0, -70], scale: [1, 0.82], opacity: [1, 0.15] }, { ease: "linear" }),
      { target: hero, offset: ["start start", "end start"] });

    // The window starts tipped back and settles flat as it reaches the middle of the screen.
    var wrap = document.querySelector("[data-tilt]");
    M.scroll(M.animate(wrap, {
      transform: ["rotateX(26deg) scale(0.86) translateY(40px)", "rotateX(0deg) scale(1) translateY(0px)"],
      opacity: [0.35, 1]
    }, { ease: "linear" }), { target: wrap, offset: ["start end", "center center"] });

    // Groups that reveal one item after another as they come into view. (Motion 11 hands inView's callback the
    // IntersectionObserverEntry; returning nothing means it runs once.)
    M.inView("[data-reveal]", function (entry) {
      var items = entry.target.querySelectorAll("[data-item]");
      M.animate(items, { opacity: [0, 1], y: [22, 0], scale: [0.97, 1] }, { delay: M.stagger(0.07), duration: 0.6, ease: ease });
    }, { amount: 0.2 });

    // The "found" number counts up the first time the window is seen.
    M.inView("[data-count]", function (entry) {
      var el = entry.target;
      var to = parseFloat(el.getAttribute("data-count"));
      M.animate(0, to, { duration: 1.6, ease: ease, onUpdate: function (v) { el.textContent = v.toFixed(1); } });
    }, { amount: 0.6 });
  }

  // ---------- Story: the step nearest the middle of the screen drives the window ----------
  var steps = Array.prototype.slice.call(document.querySelectorAll(".step"));
  var panels = Array.prototype.slice.call(document.querySelectorAll("[data-panel]"));
  var dots = Array.prototype.slice.call(document.querySelectorAll("[data-dot]"));
  var current = -1;
  function setStep(i) {
    if (i === current) return;
    current = i;
    steps.forEach(function (s, k) { s.classList.toggle("active", k === i); });
    panels.forEach(function (p, k) { p.classList.toggle("active", k === i); });
    dots.forEach(function (d, k) { d.classList.toggle("on", k === i); });
  }
  function pickStep() {
    var mid = window.innerHeight * (window.innerWidth <= 960 ? 0.72 : 0.5);
    var best = 0, bestDist = Infinity;
    steps.forEach(function (s, k) {
      var r = s.getBoundingClientRect();
      var d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bestDist) { bestDist = d; best = k; }
    });
    setStep(best);
  }

  // ---------- Menu bar: CPU rises as you scroll through, and the runners speed up ----------
  var demo = document.querySelector("[data-cpu-demo]");
  var cpuText = document.querySelector("[data-cpu]");
  var cpuBar = document.querySelector("[data-cpu-bar]");
  var lastCpu = -1;
  function setCpu(p) {
    var cpu = Math.round(8 + 84 * Math.min(1, Math.max(0, p)));
    if (cpu === lastCpu) return;
    lastCpu = cpu;
    // Gon's own pace: a loop takes 4.8 s when the Mac is idle and 1 s when it is flat out.
    var dur = 8 * (0.6 - 0.475 * cpu / 100);
    demo.style.setProperty("--dur", dur.toFixed(2) + "s");
    cpuText.textContent = cpu + "%";
    cpuBar.style.width = cpu + "%";
  }

  if (M) {
    // Motion's scroll() runs these on its own frame loop, so neither reads layout more than once a frame.
    M.scroll(function () { pickStep(); });
    if (demo) M.scroll(function (p) { setCpu(p); }, { target: demo, offset: ["start end", "end start"] });
  } else {
    var queued = false;
    window.addEventListener("scroll", function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        pickStep();
        if (demo) {
          var r = demo.getBoundingClientRect();
          setCpu((window.innerHeight - r.top) / (window.innerHeight + r.height));
        }
      });
    }, { passive: true });
  }
  // Review aid: ?step=<0-2> holds the story on one step (for full-page screenshots).
  var forced = /[?&]step=(\d)/.exec(location.search);
  if (forced) { pickStep = function () {}; setStep(parseInt(forced[1], 10)); }
  pickStep();
  if (demo) setCpu(0);
})();

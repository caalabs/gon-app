// Gon landing page: the journey through the disk. Motion (motion.dev, MIT) rolls the freed number; the floors
// clear on scroll with or without it, and nothing moves for visitors who ask for reduced motion.
(function () {
  "use strict";
  var M = window.Motion;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var floors = Array.prototype.slice.call(document.querySelectorAll("[data-floor]"));
  var guide = document.querySelector("[data-guide]");
  var fill = document.querySelector("[data-fill]");
  var freedEl = document.querySelector("[data-freed]");
  var waitEl = document.querySelector("[data-waiting]");
  var lineEl = document.querySelector("[data-line]");
  var total = floors.reduce(function (s, f) { return s + parseFloat(f.dataset.gb); }, 0);
  var shown = 0, lastCount = -1;

  // A floor clears once its pile has risen above the middle of the screen; scrolling back up undoes it.
  function update() {
    var mid = window.innerHeight * 0.55;
    var freed = 0, waiting = 0, count = 0, latest = null;
    floors.forEach(function (f) {
      var pile = f.querySelector(".pile").getBoundingClientRect();
      var on = pile.top + pile.height / 2 < mid;
      f.classList.toggle("cleared", on);
      if (on) { freed += parseFloat(f.dataset.gb); waiting += parseFloat(f.dataset.wait || 0); count++; latest = f; }
    });
    if (count !== lastCount) {
      if (count > lastCount && lastCount >= 0 && !reduce) { guide.classList.remove("cheer"); void guide.offsetWidth; guide.classList.add("cheer"); }
      lastCount = count;
      lineEl.textContent = latest ? latest.dataset.say : "Gon starts at the top of your disk.";
      fill.style.setProperty("--fill", (freed / total).toFixed(3));
      waitEl.textContent = waiting ? waiting.toFixed(1) + " GB waiting for you" : "";
      // The number rolls to its new value.
      var from = shown, to = freed;
      shown = to;
      if (M && !reduce) M.animate(from, to, { duration: 0.6, ease: [0.2, 0.7, 0.2, 1], onUpdate: function (v) { freedEl.textContent = v.toFixed(1) + " GB"; } });
      else freedEl.textContent = to.toFixed(1) + " GB";
    }
  }
  guide.addEventListener("animationend", function () { guide.classList.remove("cheer"); });

  if (M) M.scroll(function () { update(); });
  else window.addEventListener("scroll", function () { requestAnimationFrame(update); }, { passive: true });
  update();
})();

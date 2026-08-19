/* Royal Family Academy — Mouse + scroll parallax for decorative elements (dependency-free) */
(function () {
  "use strict";

  var mqReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (mqReduced) return;

  /* Mouse parallax: elements with [data-parallax-strength] drift toward cursor */
  var mouseEls = Array.prototype.slice.call(document.querySelectorAll("[data-parallax-strength]"));
  if (mouseEls.length) {
    var targetX = 0, targetY = 0, curX = 0, curY = 0;
    document.addEventListener("mousemove", function (e) {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    });
    (function raf() {
      curX += (targetX - curX) * 0.06;
      curY += (targetY - curY) * 0.06;
      mouseEls.forEach(function (el) {
        var strength = parseFloat(el.getAttribute("data-parallax-strength")) || 14;
        el.style.transform = "translate3d(" + (curX * strength).toFixed(2) + "px," + (curY * strength).toFixed(2) + "px,0)";
      });
      requestAnimationFrame(raf);
    })();
  }

  /* Scroll parallax: elements with [data-parallax-speed] shift at a fraction of scroll */
  var scrollEls = Array.prototype.slice.call(document.querySelectorAll("[data-parallax-speed]"));
  if (scrollEls.length) {
    var ticking = false;
    function update() {
      var vh = window.innerHeight;
      scrollEls.forEach(function (el) {
        var rect = el.getBoundingClientRect();
        var speed = parseFloat(el.getAttribute("data-parallax-speed")) || 0.15;
        var offset = (rect.top - vh / 2) * speed;
        el.style.transform = "translate3d(0," + offset.toFixed(2) + "px,0)";
      });
      ticking = false;
    }
    document.addEventListener("scroll", function () {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  }
})();

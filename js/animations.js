/* Royal Family Academy — Scroll reveals, counters, accordion, tabs, lightbox */
(function () {
  "use strict";

  /* ---------- Scroll reveal with automatic stagger ---------- */
  var revealGroups = {};
  document.querySelectorAll("[data-reveal]").forEach(function (el) {
    var group = el.closest("[data-reveal-group]");
    var key = group ? group : "__root__" + Math.random();
    if (!revealGroups[key]) revealGroups[key] = [];
    revealGroups[key].push(el);
  });
  Object.keys(revealGroups).forEach(function (key) {
    revealGroups[key].forEach(function (el, i) {
      el.style.setProperty("--d", Math.min(i * 0.09, 0.6) + "s");
    });
  });

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" }
    );
    document.querySelectorAll("[data-reveal], .text-reveal").forEach(function (el) {
      io.observe(el);
    });

    /* Safety net: force-reveal anything IO never caught (odd layouts, fast
       scroll-to-hash navigation, automated test tooling that doesn't scroll). */
    setTimeout(function () {
      document.querySelectorAll("[data-reveal]:not(.is-visible), .text-reveal:not(.is-visible)").forEach(function (el) {
        var rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 2.2) el.classList.add("is-visible");
      });
    }, 1800);
  } else {
    document.querySelectorAll("[data-reveal], .text-reveal").forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* ---------- Animated counters ---------- */
  function animateCounter(el) {
    var target = parseFloat(el.getAttribute("data-counter"));
    var decimals = (el.getAttribute("data-counter").split(".")[1] || "").length;
    var duration = 1800;
    var start = null;

    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var value = target * eased;
      el.textContent = value.toFixed(decimals);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target.toFixed(decimals);
    }
    requestAnimationFrame(step);
  }

  if ("IntersectionObserver" in window) {
    var counterIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterIo.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    document.querySelectorAll("[data-counter]").forEach(function (el) {
      counterIo.observe(el);
    });
  }

  /* ---------- Accordion (FAQ) ---------- */
  document.querySelectorAll(".accordion-item").forEach(function (item) {
    var trigger = item.querySelector(".accordion-trigger");
    var panel = item.querySelector(".accordion-panel");
    if (!trigger || !panel) return;
    trigger.addEventListener("click", function () {
      var isOpen = item.classList.contains("is-open");
      item.closest(".accordion")?.querySelectorAll(".accordion-item.is-open").forEach(function (other) {
        if (other !== item) {
          other.classList.remove("is-open");
          other.querySelector(".accordion-panel").style.maxHeight = null;
          other.querySelector(".accordion-trigger").setAttribute("aria-expanded", "false");
        }
      });
      item.classList.toggle("is-open", !isOpen);
      trigger.setAttribute("aria-expanded", String(!isOpen));
      panel.style.maxHeight = !isOpen ? panel.scrollHeight + "px" : null;
    });
  });

  /* ---------- Tabs ---------- */
  document.querySelectorAll("[data-tabs]").forEach(function (wrapper) {
    var buttons = wrapper.querySelectorAll(".tabs-list button");
    var panels = wrapper.querySelectorAll(".tab-panel");

    function activate(btn) {
      buttons.forEach(function (b) {
        b.classList.remove("is-active");
        b.setAttribute("aria-selected", "false");
      });
      panels.forEach(function (p) { p.classList.remove("is-active"); });
      btn.classList.add("is-active");
      btn.setAttribute("aria-selected", "true");
      var target = wrapper.querySelector('[data-tab-panel="' + btn.getAttribute("data-tab") + '"]');
      if (target) target.classList.add("is-active");
    }

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () { activate(btn); });
    });

    /* Deep-linking: activate the right tab when arriving via #anchor (e.g. a mega-menu link) */
    function activateFromHash() {
      var id = location.hash.replace("#", "");
      if (!id) return;
      var panel = wrapper.querySelector('.tab-panel[id="' + id + '"], .tab-panel[data-tab-panel="' + id + '"]');
      if (!panel) return;
      var key = panel.getAttribute("data-tab-panel");
      var btn = wrapper.querySelector('.tabs-list button[data-tab="' + key + '"]');
      if (btn) activate(btn);
    }
    activateFromHash();
    window.addEventListener("hashchange", activateFromHash);
  });

  /* ---------- Lightbox gallery ---------- */
  var lightbox = document.querySelector(".lightbox");
  if (lightbox) {
    var lbImg = lightbox.querySelector("img");
    var items = Array.prototype.slice.call(document.querySelectorAll(".gallery-item"));
    var current = 0;

    function openLightbox(index) {
      current = index;
      var img = items[current].querySelector("img");
      lbImg.src = img.getAttribute("data-full") || img.src;
      lbImg.alt = img.alt || "";
      lightbox.classList.add("is-open");
      document.body.style.overflow = "hidden";
    }
    function closeLightbox() {
      lightbox.classList.remove("is-open");
      document.body.style.overflow = "";
    }
    function show(delta) {
      current = (current + delta + items.length) % items.length;
      var img = items[current].querySelector("img");
      lbImg.src = img.getAttribute("data-full") || img.src;
      lbImg.alt = img.alt || "";
    }

    items.forEach(function (item, i) {
      item.addEventListener("click", function () { openLightbox(i); });
    });
    lightbox.querySelector(".lightbox-close")?.addEventListener("click", closeLightbox);
    lightbox.querySelector(".lightbox-prev")?.addEventListener("click", function () { show(-1); });
    lightbox.querySelector(".lightbox-next")?.addEventListener("click", function () { show(1); });
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", function (e) {
      if (!lightbox.classList.contains("is-open")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") show(1);
      if (e.key === "ArrowLeft") show(-1);
    });
  }

  /* ---------- Current year in footer ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();

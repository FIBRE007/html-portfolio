/**
 * THE ASSEMBLY OF SONS — Online reader logic
 */
(function () {
  "use strict";

  const tocList = document.getElementById("toc-list");
  const kickerEl = document.getElementById("chapter-kicker");
  const titleEl = document.getElementById("chapter-title");
  const bodyEl = document.getElementById("chapter-body");
  const positionEl = document.getElementById("reader-position");
  const prevBtn = document.getElementById("chapter-prev");
  const nextBtn = document.getElementById("chapter-next");
  const progressFill = document.getElementById("reading-progress-fill");
  const mainEl = document.getElementById("reader-main");

  const tocOpenBtn = document.getElementById("toc-open");
  const tocCloseBtn = document.getElementById("toc-close");
  const tocPanel = document.getElementById("reader-toc");
  const tocBackdrop = document.getElementById("toc-backdrop");

  const fontDecrease = document.getElementById("font-decrease");
  const fontIncrease = document.getElementById("font-increase");
  const themeToggle = document.getElementById("theme-toggle");
  const themeLabel = document.getElementById("theme-toggle-label");

  const FONT_SIZES = [1, 1.125, 1.25, 1.4];
  const FONT_KEY = "aos_reader_font_v1";
  const THEME_KEY = "aos_reader_theme_v1";
  const CHAPTER_KEY = "aos_reader_chapter_v1";

  let fontIndex = Number(localStorage.getItem(FONT_KEY) || "1");
  if (isNaN(fontIndex) || fontIndex < 0 || fontIndex >= FONT_SIZES.length) fontIndex = 1;

  let currentIndex = 0;

  function applyFontSize() {
    document.documentElement.style.setProperty("--reader-font-size", FONT_SIZES[fontIndex] + "rem");
    fontDecrease.disabled = fontIndex === 0;
    fontIncrease.disabled = fontIndex === FONT_SIZES.length - 1;
  }

  function applyTheme(theme) {
    document.body.setAttribute("data-theme", theme);
    const isLight = theme === "light";
    themeToggle.setAttribute("aria-pressed", String(isLight));
    themeLabel.textContent = isLight ? "Dark mode" : "Light mode";
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  }

  function buildToc() {
    tocList.innerHTML = "";
    BOOK.forEach((chapter, index) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.innerHTML = '<span class="t-num">' + chapter.number + "</span><span>" + chapter.title + (chapter.kicker ? " &mdash; " + chapter.kicker : "") + "</span>";
      btn.addEventListener("click", () => {
        showChapter(index);
        closeToc();
      });
      li.appendChild(btn);
      tocList.appendChild(li);
    });
  }

  function updateTocActive() {
    Array.from(tocList.querySelectorAll("button")).forEach((btn, i) => {
      const active = i === currentIndex;
      btn.classList.toggle("active", active);
      if (active) btn.setAttribute("aria-current", "true");
      else btn.removeAttribute("aria-current");
    });
  }

  function showChapter(index) {
    if (index < 0 || index >= BOOK.length) return;
    currentIndex = index;
    const chapter = BOOK[index];

    kickerEl.textContent = chapter.kicker || chapter.title;
    titleEl.textContent = chapter.title;
    bodyEl.innerHTML = chapter.body;
    positionEl.textContent = (index + 1) + " / " + BOOK.length;
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === BOOK.length - 1;

    document.title = chapter.title + " | The Assembly of Sons";
    history.replaceState(null, "", "#" + chapter.slug);

    updateTocActive();
    try { localStorage.setItem(CHAPTER_KEY, String(index)); } catch (e) {}

    mainEl.scrollIntoView({ behavior: "smooth", block: "start" });
    updateReadingProgress();
  }

  function updateReadingProgress() {
    const rect = bodyEl.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const total = rect.height - viewportH * 0.4;
    const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
    const pct = total > 0 ? (scrolled / total) * 100 : 100;
    progressFill.style.width = Math.min(Math.max(pct, 0), 100) + "%";
  }

  function openToc() {
    tocPanel.classList.add("is-open");
    tocBackdrop.classList.add("is-open");
    tocOpenBtn.setAttribute("aria-expanded", "true");
  }
  function closeToc() {
    tocPanel.classList.remove("is-open");
    tocBackdrop.classList.remove("is-open");
    tocOpenBtn.setAttribute("aria-expanded", "false");
  }

  function initialChapterIndex() {
    const hash = (location.hash || "").replace("#", "");
    if (hash) {
      const byHash = BOOK.findIndex((c) => c.slug === hash);
      if (byHash !== -1) return byHash;
    }
    const saved = Number(localStorage.getItem(CHAPTER_KEY));
    if (!isNaN(saved) && saved >= 0 && saved < BOOK.length) return saved;
    return 0;
  }

  // Wire up
  prevBtn.addEventListener("click", () => showChapter(currentIndex - 1));
  nextBtn.addEventListener("click", () => showChapter(currentIndex + 1));
  tocOpenBtn.addEventListener("click", openToc);
  tocCloseBtn.addEventListener("click", closeToc);
  tocBackdrop.addEventListener("click", closeToc);

  fontDecrease.addEventListener("click", () => {
    if (fontIndex > 0) { fontIndex--; applyFontSize(); try { localStorage.setItem(FONT_KEY, String(fontIndex)); } catch (e) {} }
  });
  fontIncrease.addEventListener("click", () => {
    if (fontIndex < FONT_SIZES.length - 1) { fontIndex++; applyFontSize(); try { localStorage.setItem(FONT_KEY, String(fontIndex)); } catch (e) {} }
  });
  themeToggle.addEventListener("click", () => {
    const current = document.body.getAttribute("data-theme") === "light" ? "light" : "dark";
    applyTheme(current === "light" ? "dark" : "light");
  });
  window.addEventListener("scroll", updateReadingProgress, { passive: true });
  window.addEventListener("resize", updateReadingProgress);

  // Init
  buildToc();
  applyFontSize();
  let savedTheme = "dark";
  try { savedTheme = localStorage.getItem(THEME_KEY) || "dark"; } catch (e) {}
  applyTheme(savedTheme);
  showChapter(initialChapterIndex());
})();

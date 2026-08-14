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

  // ---- Per-chapter inline audio player ----
  const chapterAudio = document.getElementById("chapter-audio-element");
  const chapterPlayBtn = document.getElementById("chapter-audio-play");
  const chapterSeek = document.getElementById("chapter-audio-seek");
  const chapterFill = document.getElementById("chapter-audio-fill");
  const chapterCurEl = document.getElementById("chapter-audio-current");
  const chapterDurEl = document.getElementById("chapter-audio-duration");
  const chapterErrorEl = document.getElementById("chapter-audio-error");
  let chapterIsSeeking = false;

  function chapterIconPlay() {
    return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 5v14l11-7L8 5z" fill="currentColor"/></svg>';
  }
  function chapterIconPause() {
    return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="6" y="5" width="4" height="14" fill="currentColor"/><rect x="14" y="5" width="4" height="14" fill="currentColor"/></svg>';
  }
  function formatChapterTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ":" + String(s).padStart(2, "0");
  }
  function showChapterAudioError(message) {
    chapterErrorEl.textContent = message;
    chapterErrorEl.classList.add("is-visible");
  }
  function clearChapterAudioError() {
    chapterErrorEl.classList.remove("is-visible");
    chapterErrorEl.textContent = "";
  }

  function loadChapterAudio(chapter) {
    chapterAudio.pause();
    chapterAudio.removeAttribute("src");
    chapterAudio.load();
    chapterPlayBtn.innerHTML = chapterIconPlay();
    chapterPlayBtn.setAttribute("aria-label", "Play this chapter");
    chapterSeek.value = "0";
    chapterFill.style.width = "0%";
    chapterCurEl.textContent = "0:00";
    chapterDurEl.textContent = "0:00";
    clearChapterAudioError();

    const meta = (typeof CHAPTERS !== "undefined" ? CHAPTERS : []).find((c) => c.slug === chapter.slug);
    chapterPlayBtn.disabled = !meta;
    if (meta) {
      chapterAudio.src = CONFIG.audioBaseUrl + meta.file;
    }
  }

  chapterPlayBtn.addEventListener("click", () => {
    if (chapterAudio.paused) {
      const playPromise = chapterAudio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          showChapterAudioError("This audio chapter is temporarily unavailable. Please try again shortly.");
        });
      }
    } else {
      chapterAudio.pause();
    }
  });
  chapterAudio.addEventListener("play", () => {
    chapterPlayBtn.innerHTML = chapterIconPause();
    chapterPlayBtn.setAttribute("aria-label", "Pause");
  });
  chapterAudio.addEventListener("pause", () => {
    chapterPlayBtn.innerHTML = chapterIconPlay();
    chapterPlayBtn.setAttribute("aria-label", "Play this chapter");
  });
  chapterAudio.addEventListener("ended", () => {
    chapterPlayBtn.innerHTML = chapterIconPlay();
    chapterPlayBtn.setAttribute("aria-label", "Play this chapter");
  });
  chapterAudio.addEventListener("error", () => {
    showChapterAudioError("This audio chapter is temporarily unavailable. Please try again shortly.");
  });
  chapterAudio.addEventListener("timeupdate", () => {
    if (chapterIsSeeking) return;
    const duration = chapterAudio.duration || 0;
    const pct = duration ? (chapterAudio.currentTime / duration) * 100 : 0;
    chapterSeek.value = String(pct);
    chapterFill.style.width = pct + "%";
    chapterCurEl.textContent = formatChapterTime(chapterAudio.currentTime);
    if (duration) chapterDurEl.textContent = formatChapterTime(duration);
  });
  chapterAudio.addEventListener("loadedmetadata", () => {
    chapterDurEl.textContent = formatChapterTime(chapterAudio.duration);
  });
  chapterSeek.addEventListener("input", () => {
    chapterIsSeeking = true;
    const pct = Number(chapterSeek.value);
    chapterFill.style.width = pct + "%";
    if (chapterAudio.duration) {
      chapterCurEl.textContent = formatChapterTime((pct / 100) * chapterAudio.duration);
    }
  });
  chapterSeek.addEventListener("change", () => {
    if (chapterAudio.duration) {
      chapterAudio.currentTime = (Number(chapterSeek.value) / 100) * chapterAudio.duration;
    }
    chapterIsSeeking = false;
  });

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
    loadChapterAudio(chapter);
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

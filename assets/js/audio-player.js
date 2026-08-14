/**
 * THE ASSEMBLY OF SONS — Custom audio book player
 * Streams chapters directly from Cloudflare R2. Builds every URL from the
 * single CONFIG.audioBaseUrl + chapter.file combination — never hard-codes
 * a full R2 URL.
 */
(function () {
  "use strict";

  const root = document.getElementById("player");
  if (!root) return;

  const AUDIO_BASE_URL = CONFIG.audioBaseUrl;
  const STORAGE_KEY = "aos_playback_v1";
  const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

  const audio = root.querySelector("#audio-element");
  const playlistEl = root.querySelector("#playlist");
  const playBtn = root.querySelector("#play-btn");
  const prevBtn = root.querySelector("#prev-btn");
  const nextBtn = root.querySelector("#next-btn");
  const seek = root.querySelector("#seek");
  const seekFill = root.querySelector("#seek-fill");
  const curTimeEl = root.querySelector("#current-time");
  const durTimeEl = root.querySelector("#duration-time");
  const volumeEl = root.querySelector("#volume");
  const nowTitleEl = root.querySelector("#now-title");
  const nowSubEl = root.querySelector("#now-sub");
  const dotEl = root.querySelector("#now-dot");
  const speedBtns = Array.from(root.querySelectorAll(".speed-btn"));
  const resumeBanner = root.querySelector("#resume-banner");
  const resumeBtn = root.querySelector("#resume-btn");
  const resumeDismiss = root.querySelector("#resume-dismiss");
  const errorBanner = root.querySelector("#player-error");

  let currentIndex = 0;
  let isSeeking = false;
  let saveTimer = null;
  let pendingResume = null;

  function audioUrlFor(chapter) {
    return AUDIO_BASE_URL + chapter.file;
  }

  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ":" + String(s).padStart(2, "0");
  }

  function buildPlaylist() {
    playlistEl.innerHTML = "";
    CHAPTERS.forEach((chapter, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "playlist-item";
      btn.setAttribute("role", "option");
      btn.setAttribute("aria-selected", "false");
      btn.dataset.index = String(index);
      btn.innerHTML =
        '<span class="p-num">' + chapter.number + "</span>" +
        '<span class="p-title">' + chapter.title + "</span>" +
        '<svg class="p-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 5v14l11-7L8 5z" fill="currentColor"/></svg>';
      btn.addEventListener("click", () => loadChapter(index, { autoplay: true }));
      playlistEl.appendChild(btn);
    });
  }

  function setActivePlaylistItem(index) {
    const items = playlistEl.querySelectorAll(".playlist-item");
    items.forEach((item, i) => {
      const active = i === index;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function setPlayingUI(playing) {
    playBtn.innerHTML = playing ? iconPause() : iconPlay();
    playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
    dotEl.classList.toggle("playing", playing);
  }

  function iconPlay() {
    return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 5v14l11-7L8 5z" fill="currentColor"/></svg>';
  }
  function iconPause() {
    return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="6" y="5" width="4" height="14" fill="currentColor"/><rect x="14" y="5" width="4" height="14" fill="currentColor"/></svg>';
  }

  function showError(message) {
    errorBanner.textContent = message;
    errorBanner.classList.add("is-visible");
  }
  function clearError() {
    errorBanner.classList.remove("is-visible");
    errorBanner.textContent = "";
  }

  function updateNavState() {
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === CHAPTERS.length - 1;
  }

  function loadChapter(index, opts) {
    opts = opts || {};
    if (index < 0 || index >= CHAPTERS.length) return;
    currentIndex = index;
    const chapter = CHAPTERS[index];

    clearError();
    audio.src = audioUrlFor(chapter);
    if (typeof opts.startAt === "number" && opts.startAt > 0) {
      const onLoaded = () => {
        audio.currentTime = Math.min(opts.startAt, audio.duration || opts.startAt);
        audio.removeEventListener("loadedmetadata", onLoaded);
      };
      audio.addEventListener("loadedmetadata", onLoaded);
    }

    nowTitleEl.textContent = chapter.number + " — " + chapter.title;
    nowSubEl.textContent = "Chapter " + (index + 1) + " of " + CHAPTERS.length;
    seek.value = "0";
    seekFill.style.width = "0%";
    curTimeEl.textContent = "0:00";
    durTimeEl.textContent = "0:00";

    setActivePlaylistItem(index);
    updateNavState();
    persist();

    if (opts.autoplay) {
      attemptPlay();
    }
  }

  function attemptPlay() {
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        showError("This audio chapter is temporarily unavailable. Please try again shortly.");
        setPlayingUI(false);
      });
    }
  }

  function togglePlay() {
    if (!audio.src) {
      loadChapter(currentIndex, { autoplay: true });
      return;
    }
    if (audio.paused) {
      attemptPlay();
    } else {
      audio.pause();
    }
  }

  function persist() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          chapterIndex: currentIndex,
          position: audio.currentTime || 0,
          updatedAt: Date.now(),
        })
      );
    } catch (e) {
      /* localStorage unavailable — resume simply won't work */
    }
  }

  function readSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function initResumeBanner() {
    const saved = readSaved();
    if (saved && CHAPTERS[saved.chapterIndex] && saved.position > 3) {
      pendingResume = saved;
      resumeBanner.classList.add("is-visible");
    }
  }

  // ---- Event wiring ----
  playBtn.addEventListener("click", togglePlay);
  prevBtn.addEventListener("click", () => loadChapter(currentIndex - 1, { autoplay: !audio.paused || audio.currentTime > 0 }));
  nextBtn.addEventListener("click", () => loadChapter(currentIndex + 1, { autoplay: !audio.paused || audio.currentTime > 0 }));

  audio.addEventListener("play", () => setPlayingUI(true));
  audio.addEventListener("pause", () => {
    setPlayingUI(false);
    persist();
  });
  audio.addEventListener("ended", () => {
    persist();
    if (currentIndex < CHAPTERS.length - 1) {
      loadChapter(currentIndex + 1, { autoplay: true });
    } else {
      setPlayingUI(false);
    }
  });
  audio.addEventListener("error", () => {
    showError("This audio chapter is temporarily unavailable. Please try again shortly.");
    setPlayingUI(false);
  });

  audio.addEventListener("timeupdate", () => {
    if (isSeeking) return;
    const duration = audio.duration || 0;
    const pct = duration ? (audio.currentTime / duration) * 100 : 0;
    seek.value = String(pct);
    seekFill.style.width = pct + "%";
    curTimeEl.textContent = formatTime(audio.currentTime);
    if (duration) durTimeEl.textContent = formatTime(duration);

    if (!saveTimer) {
      saveTimer = setTimeout(() => {
        persist();
        saveTimer = null;
      }, 5000);
    }
  });

  audio.addEventListener("loadedmetadata", () => {
    durTimeEl.textContent = formatTime(audio.duration);
  });

  seek.addEventListener("input", () => {
    isSeeking = true;
    const pct = Number(seek.value);
    seekFill.style.width = pct + "%";
    if (audio.duration) {
      curTimeEl.textContent = formatTime((pct / 100) * audio.duration);
    }
  });
  seek.addEventListener("change", () => {
    if (audio.duration) {
      audio.currentTime = (Number(seek.value) / 100) * audio.duration;
    }
    isSeeking = false;
  });

  volumeEl.addEventListener("input", () => {
    audio.volume = Number(volumeEl.value);
  });

  speedBtns.forEach((btn) => {
    const rate = Number(btn.dataset.rate);
    btn.addEventListener("click", () => {
      audio.playbackRate = rate;
      speedBtns.forEach((b) => b.classList.toggle("active", b === btn));
    });
  });

  resumeBtn.addEventListener("click", () => {
    if (pendingResume) {
      loadChapter(pendingResume.chapterIndex, { autoplay: true, startAt: pendingResume.position });
    }
    resumeBanner.classList.remove("is-visible");
  });
  resumeDismiss.addEventListener("click", () => {
    resumeBanner.classList.remove("is-visible");
  });

  window.addEventListener("beforeunload", persist);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") persist();
  });

  // ---- Init ----
  buildPlaylist();
  updateNavState();
  audio.volume = Number(volumeEl.value || 1);
  const startIndex = 0;
  currentIndex = startIndex;
  const first = CHAPTERS[startIndex];
  nowTitleEl.textContent = first.number + " — " + first.title;
  nowSubEl.textContent = "Chapter " + (startIndex + 1) + " of " + CHAPTERS.length;
  setActivePlaylistItem(startIndex);
  initResumeBanner();

  // Allow other parts of the page (e.g. "Listen" playlist links) to jump
  // to a specific chapter without autoplaying on page load.
  window.AOSPlayer = {
    playChapter(index) {
      loadChapter(index, { autoplay: true });
      root.scrollIntoView({ behavior: "smooth", block: "start" });
    },
  };
})();

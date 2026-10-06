/**
 * THE GOD OF GRACE — Continuous audiobook player
 * Uses one full-length MP3 so playback can continue reliably when the page
 * is backgrounded or the screen is locked, while preserving track navigation.
 */
(function () {
  "use strict";

  const root = document.getElementById("player");
  if (!root) return;

  const cfg = window.AUDIOBOOK_CONFIG || {};
  const chapters = Array.isArray(cfg.chapters) ? cfg.chapters : [];
  if (!chapters.length || !cfg.continuousFile) return;

  const baseUrl = cfg.audioBaseUrl || CONFIG.audioBaseUrl;
  const storageKey = cfg.storageKey || "aos_the_god_of_grace_playback_v2";
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
  const speedBtns = Array.from(root.querySelectorAll(".speed-btn[data-rate]"));
  const repeatBookBtn = root.querySelector("#repeat-book-btn");
  const resumeBanner = root.querySelector("#resume-banner");
  const resumeBtn = root.querySelector("#resume-btn");
  const resumeDismiss = root.querySelector("#resume-dismiss");
  const errorBanner = root.querySelector("#player-error");

  let currentIndex = 0;
  let isSeeking = false;
  let repeatBook = false;
  let pendingResume = null;
  let saveTimer = null;
  let pendingSeek = null;

  const fullAudioUrl = baseUrl + cfg.continuousFile;
  audio.preload = "metadata";
  audio.src = fullAudioUrl;

  function startOf(index) {
    return Number(chapters[index].startSeconds) || 0;
  }

  function durationOf(index) {
    const explicit = Number(chapters[index].durationSeconds);
    if (explicit > 0) return explicit;
    if (index < chapters.length - 1) return Math.max(0, startOf(index + 1) - startOf(index));
    return Math.max(0, (Number(audio.duration) || startOf(index)) - startOf(index));
  }

  function label(chapter) {
    return chapter.subtitle ? chapter.title + " — " + chapter.subtitle : chapter.title;
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
    const whole = Math.floor(seconds);
    const h = Math.floor(whole / 3600);
    const m = Math.floor((whole % 3600) / 60);
    const s = whole % 60;
    if (h > 0) return h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    return m + ":" + String(s).padStart(2, "0");
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
    errorBanner.textContent = "";
    errorBanner.classList.remove("is-visible");
  }

  function setPlayingUI(playing) {
    playBtn.innerHTML = playing ? iconPause() : iconPlay();
    playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
    dotEl.classList.toggle("playing", playing);
    if ("mediaSession" in navigator) {
      try { navigator.mediaSession.playbackState = playing ? "playing" : "paused"; } catch (_) {}
    }
  }

  function buildPlaylist() {
    playlistEl.innerHTML = "";
    chapters.forEach((chapter, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "playlist-item";
      btn.setAttribute("role", "option");
      btn.setAttribute("aria-selected", index === 0 ? "true" : "false");
      btn.innerHTML =
        '<span class="p-num">' + chapter.number + "</span>" +
        '<span class="p-title">' + label(chapter) + "</span>" +
        '<svg class="p-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 5v14l11-7L8 5z" fill="currentColor"/></svg>';
      btn.addEventListener("click", () => goToTrack(index, true, 0));
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

  function updateNavState() {
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === chapters.length - 1;
  }

  function updateMediaSession() {
    if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
    const chapter = chapters[currentIndex];
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: label(chapter),
        artist: "Fadoju Tosin",
        album: "The God of Grace",
        artwork: [
          { src: "https://theassemblyofsons.com/the-god-of-grace/cover.jpg", sizes: "1024x1536", type: "image/jpeg" }
        ]
      });
    } catch (_) {}
  }

  function updateTrackUI(index) {
    currentIndex = index;
    const chapter = chapters[index];
    nowTitleEl.textContent = chapter.number + " — " + label(chapter);
    nowSubEl.textContent = "Track " + (index + 1) + " of " + chapters.length;
    durTimeEl.textContent = formatTime(durationOf(index));
    setActivePlaylistItem(index);
    updateNavState();
    updateMediaSession();
  }

  function indexForTime(time) {
    let index = 0;
    for (let i = 0; i < chapters.length; i++) {
      if (time >= startOf(i)) index = i;
      else break;
    }
    return index;
  }

  function applyPendingSeek() {
    if (pendingSeek == null) return;
    try {
      audio.currentTime = pendingSeek;
      pendingSeek = null;
    } catch (_) {}
  }

  function goToTrack(index, autoplay, relativeSeconds) {
    if (index < 0 || index >= chapters.length) return;
    clearError();
    updateTrackUI(index);
    const target = startOf(index) + Math.max(0, Number(relativeSeconds) || 0);

    if (audio.readyState >= 1) {
      audio.currentTime = target;
    } else {
      pendingSeek = target;
      audio.load();
    }

    updateProgress(target);
    if (autoplay) attemptPlay();
  }

  function attemptPlay() {
    clearError();
    const p = audio.play();
    if (p && typeof p.catch === "function") {
      p.catch((err) => {
        if (!err || (err.name !== "AbortError" && err.name !== "NotAllowedError")) {
          showError("Playback could not start. Please press Play to continue.");
        }
      });
    }
  }

  function togglePlay() {
    if (audio.paused) {
      if (audio.ended) goToTrack(currentIndex, true, 0);
      else attemptPlay();
    } else {
      audio.pause();
    }
  }

  function updateProgress(absoluteTime) {
    const start = startOf(currentIndex);
    const duration = durationOf(currentIndex);
    const relative = Math.max(0, Math.min(duration, absoluteTime - start));
    const pct = duration > 0 ? (relative / duration) * 100 : 0;
    seek.value = String(pct);
    seekFill.style.width = pct + "%";
    curTimeEl.textContent = formatTime(relative);
    durTimeEl.textContent = formatTime(duration);
  }

  function readSaved() {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function persist() {
    try {
      const relative = Math.max(0, (Number(audio.currentTime) || 0) - startOf(currentIndex));
      localStorage.setItem(storageKey, JSON.stringify({
        lastChapterIndex: currentIndex,
        position: relative,
        absolutePosition: Number(audio.currentTime) || 0,
        repeatBook,
        updatedAt: Date.now()
      }));
    } catch (_) {}
  }

  function initResumeBanner() {
    const saved = readSaved();
    if (!saved) return;
    repeatBook = Boolean(saved.repeatBook);
    updateRepeatUI();

    const index = Number(saved.lastChapterIndex);
    const position = Number(saved.position) || 0;
    if (chapters[index] && position > 3 && position < Math.max(3, durationOf(index) - 2)) {
      pendingResume = { index, position };
      resumeBanner.classList.add("is-visible");
    }
  }

  function updateRepeatUI() {
    if (!repeatBookBtn) return;
    repeatBookBtn.classList.toggle("active", repeatBook);
    repeatBookBtn.setAttribute("aria-pressed", repeatBook ? "true" : "false");
    repeatBookBtn.title = repeatBook ? "Repeat book is on" : "Repeat book is off";
  }

  playBtn.addEventListener("click", togglePlay);
  prevBtn.addEventListener("click", () => goToTrack(currentIndex - 1, true, 0));
  nextBtn.addEventListener("click", () => goToTrack(currentIndex + 1, true, 0));

  audio.addEventListener("loadedmetadata", () => {
    applyPendingSeek();
    durTimeEl.textContent = formatTime(durationOf(currentIndex));
  });

  audio.addEventListener("play", () => setPlayingUI(true));
  audio.addEventListener("pause", () => {
    setPlayingUI(false);
    persist();
  });

  audio.addEventListener("timeupdate", () => {
    if (isSeeking) return;
    const index = indexForTime(Number(audio.currentTime) || 0);
    if (index !== currentIndex) {
      updateTrackUI(index);
      persist();
    }
    updateProgress(Number(audio.currentTime) || 0);

    if (!saveTimer) {
      saveTimer = setTimeout(() => {
        persist();
        saveTimer = null;
      }, 5000);
    }
  });

  audio.addEventListener("ended", () => {
    persist();
    if (repeatBook) goToTrack(0, true, 0);
    else setPlayingUI(false);
  });

  audio.addEventListener("error", () => {
    showError("The audiobook is temporarily unavailable. Please try again shortly.");
    setPlayingUI(false);
  });

  seek.addEventListener("input", () => {
    isSeeking = true;
    const duration = durationOf(currentIndex);
    const relative = (Number(seek.value) / 100) * duration;
    seekFill.style.width = seek.value + "%";
    curTimeEl.textContent = formatTime(relative);
  });

  seek.addEventListener("change", () => {
    const duration = durationOf(currentIndex);
    const relative = (Number(seek.value) / 100) * duration;
    audio.currentTime = startOf(currentIndex) + relative;
    isSeeking = false;
    persist();
  });

  volumeEl.addEventListener("input", () => {
    audio.volume = Number(volumeEl.value);
  });

  speedBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const rate = Number(btn.dataset.rate);
      audio.playbackRate = rate;
      speedBtns.forEach((b) => b.classList.toggle("active", b === btn));
    });
  });

  if (repeatBookBtn) {
    repeatBookBtn.addEventListener("click", () => {
      repeatBook = !repeatBook;
      updateRepeatUI();
      persist();
    });
  }

  resumeBtn.addEventListener("click", () => {
    if (pendingResume) goToTrack(pendingResume.index, true, pendingResume.position);
    resumeBanner.classList.remove("is-visible");
  });

  resumeDismiss.addEventListener("click", () => {
    resumeBanner.classList.remove("is-visible");
  });

  if ("mediaSession" in navigator) {
    const safeHandler = (action, handler) => {
      try { navigator.mediaSession.setActionHandler(action, handler); } catch (_) {}
    };
    safeHandler("play", attemptPlay);
    safeHandler("pause", () => audio.pause());
    safeHandler("previoustrack", () => goToTrack(Math.max(0, currentIndex - 1), true, 0));
    safeHandler("nexttrack", () => goToTrack(Math.min(chapters.length - 1, currentIndex + 1), true, 0));
    safeHandler("seekbackward", (details) => {
      audio.currentTime = Math.max(startOf(currentIndex), audio.currentTime - (details.seekOffset || 10));
    });
    safeHandler("seekforward", (details) => {
      audio.currentTime = Math.min(startOf(currentIndex) + durationOf(currentIndex), audio.currentTime + (details.seekOffset || 10));
    });
    safeHandler("seekto", (details) => {
      if (typeof details.seekTime === "number") audio.currentTime = details.seekTime;
    });
  }

  window.addEventListener("beforeunload", persist);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") persist();
  });

  buildPlaylist();
  updateTrackUI(0);
  updateProgress(0);
  audio.volume = Number(volumeEl.value || 1);
  initResumeBanner();

  window.AOSPlayer = {
    playChapter(index) {
      goToTrack(index, true, 0);
      root.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
})();
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

  const BOOK_AUDIO = window.AUDIOBOOK_CONFIG || {};
  const AUDIO_BASE_URL = BOOK_AUDIO.audioBaseUrl || CONFIG.audioBaseUrl;
  const STORAGE_KEY = BOOK_AUDIO.storageKey || "aos_playback_v1";
  const chapterList = Array.isArray(BOOK_AUDIO.chapters) && BOOK_AUDIO.chapters.length ? BOOK_AUDIO.chapters : CHAPTERS;
  const ITEM_LABEL = BOOK_AUDIO.itemLabel || "Track";
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
  const speedBtns = Array.from(root.querySelectorAll(".speed-btn[data-rate]"));
  const repeatBookBtn = root.querySelector("#repeat-book-btn");
  const resumeBanner = root.querySelector("#resume-banner");
  const resumeBtn = root.querySelector("#resume-btn");
  const resumeDismiss = root.querySelector("#resume-dismiss");
  const errorBanner = root.querySelector("#player-error");

  let currentIndex = 0;
  let isSeeking = false;
  let saveTimer = null;
  let pendingResume = null;
  let playbackRetries = 0;
  let continuousPlayback = false;
  let repeatBook = false;
  const MAX_PLAYBACK_RETRIES = 2;

  function audioUrlFor(chapter) {
    return AUDIO_BASE_URL + chapter.file;
  }

  function chapterLabel(chapter) {
    return chapter.subtitle ? chapter.title + " — " + chapter.subtitle : chapter.title;
  }

  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ":" + String(s).padStart(2, "0");
  }

  function buildPlaylist() {
    playlistEl.innerHTML = "";
    chapterList.forEach((chapter, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "playlist-item";
      btn.setAttribute("role", "option");
      btn.setAttribute("aria-selected", "false");
      btn.dataset.index = String(index);
      btn.innerHTML =
        '<span class="p-num">' + chapter.number + "</span>" +
        '<span class="p-title">' + chapterLabel(chapter) + "</span>" +
        '<svg class="p-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 5v14l11-7L8 5z" fill="currentColor"/></svg>';
      btn.addEventListener("click", () => { continuousPlayback = true; loadChapter(index, { autoplay: true }); });
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
    nextBtn.disabled = currentIndex === chapterList.length - 1;
  }

  function loadChapter(index, opts) {
    opts = opts || {};
    if (index < 0 || index >= chapterList.length) return;

    // Save the chapter we are leaving before changing currentIndex/audio.src.
    if (audio.src) persist();

    currentIndex = index;
    const chapter = chapterList[index];
    const savedStart = typeof opts.startAt === "number"
      ? opts.startAt
      : (opts.resume === false ? 0 : savedPositionFor(index));

    clearError();
    playbackRetries = 0;
    audio.src = audioUrlFor(chapter);

    if (savedStart > 3) {
      const onLoaded = () => {
        const duration = audio.duration || savedStart;
        // Never resume at the final seconds of a completed/near-completed track.
        audio.currentTime = Math.min(savedStart, Math.max(0, duration - 1));
        audio.removeEventListener("loadedmetadata", onLoaded);
      };
      audio.addEventListener("loadedmetadata", onLoaded);
    }

    nowTitleEl.textContent = chapter.number + " — " + chapterLabel(chapter);
    nowSubEl.textContent = ITEM_LABEL + " " + (index + 1) + " of " + chapterList.length;
    seek.value = "0";
    seekFill.style.width = "0%";
    curTimeEl.textContent = savedStart > 3 ? formatTime(savedStart) : "0:00";
    durTimeEl.textContent = "0:00";

    setActivePlaylistItem(index);
    updateNavState();

    if (opts.autoplay) {
      continuousPlayback = true;

      // Some browsers reject play() if it is called immediately after
      // changing the media source. Try now, and also retry as soon as the
      // next track is actually ready to play.
      const continueWhenReady = () => {
        if (continuousPlayback && currentIndex === index) attemptPlay();
        audio.removeEventListener("canplay", continueWhenReady);
      };
      audio.addEventListener("canplay", continueWhenReady);
      audio.load();
      attemptPlay();
    }
  }

  function attemptPlay() {
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.catch((err) => {
        // A source swap can briefly cause AbortError/NotAllowedError.
        // The canplay handler above makes another attempt when ready.
        if (err && err.name !== "AbortError" && err.name !== "NotAllowedError") {
          showError("Playback could not start. Please press Play to continue.");
        }
      });
    }
  }

  function togglePlay() {
    if (!audio.src) {
      continuousPlayback = true;
      loadChapter(currentIndex, { autoplay: true });
      return;
    }

    if (audio.paused) {
      continuousPlayback = true;

      // If the current track has already ended, Play means replay it.
      if (audio.ended || (audio.duration && audio.currentTime >= audio.duration - 0.5)) {
        audio.currentTime = 0;
      }
      attemptPlay();
    } else {
      continuousPlayback = false;
      audio.pause();
    }
  }

  function readSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw);

      // Backward compatibility with the original one-position format.
      if (!saved.positions && typeof saved.chapterIndex === "number") {
        const positions = {};
        positions[String(saved.chapterIndex)] = Number(saved.position) || 0;
        return {
          lastChapterIndex: saved.chapterIndex,
          positions,
          completed: {},
          updatedAt: saved.updatedAt || Date.now(),
        };
      }

      return saved;
    } catch (e) {
      return null;
    }
  }

  function savedPositionFor(index) {
    const saved = readSaved();
    if (!saved || !saved.positions) return 0;
    const position = Number(saved.positions[String(index)]) || 0;
    return position > 3 ? position : 0;
  }

  function persist(opts) {
    opts = opts || {};
    try {
      const saved = readSaved() || {
        lastChapterIndex: currentIndex,
        positions: {},
        completed: {},
        updatedAt: Date.now(),
      };

      saved.positions = saved.positions || {};
      saved.completed = saved.completed || {};

      const position = Number(audio.currentTime) || 0;
      const duration = Number(audio.duration) || 0;
      const completed = opts.completed || (duration > 0 && position >= Math.max(0, duration - 3));

      if (completed) {
        saved.positions[String(currentIndex)] = 0;
        saved.completed[String(currentIndex)] = true;
      } else {
        saved.positions[String(currentIndex)] = position;
        delete saved.completed[String(currentIndex)];
      }

      saved.lastChapterIndex = currentIndex;
      saved.repeatBook = repeatBook;
      saved.updatedAt = Date.now();

      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch (e) {
      /* localStorage unavailable — resume simply won't work */
    }
  }

  function initResumeBanner() {
    const saved = readSaved();
    if (!saved) return;

    repeatBook = Boolean(saved.repeatBook);
    updateRepeatUI();

    const index = typeof saved.lastChapterIndex === "number"
      ? saved.lastChapterIndex
      : saved.chapterIndex;
    const position = saved.positions
      ? Number(saved.positions[String(index)]) || 0
      : Number(saved.position) || 0;

    if (chapterList[index] && position > 3) {
      pendingResume = { chapterIndex: index, position };
      resumeBanner.classList.add("is-visible");
    }
  }

  // ---- Event wiring ----
  playBtn.addEventListener("click", togglePlay);
  prevBtn.addEventListener("click", () => {
    continuousPlayback = true;
    loadChapter(currentIndex - 1, { autoplay: true });
  });
  nextBtn.addEventListener("click", () => {
    continuousPlayback = true;
    loadChapter(currentIndex + 1, { autoplay: true });
  });

  audio.addEventListener("play", () => setPlayingUI(true));
  audio.addEventListener("playing", () => {
    playbackRetries = 0;
  });
  audio.addEventListener("pause", () => {
    setPlayingUI(false);
    persist();
  });
  audio.addEventListener("ended", () => {
    persist({ completed: true });

    if (currentIndex < chapterList.length - 1) {
      // Continue seamlessly through the remaining book.
      continuousPlayback = true;
      loadChapter(currentIndex + 1, {
        autoplay: true,
        resume: false,
        startAt: 0,
      });
      return;
    }

    if (repeatBook) {
      // Repeat means start the whole audiobook again from Track 1.
      continuousPlayback = true;
      loadChapter(0, {
        autoplay: true,
        resume: false,
        startAt: 0,
      });
    } else {
      continuousPlayback = false;
      setPlayingUI(false);
    }
  });
  audio.addEventListener("error", () => {
    if (audio.src && playbackRetries < MAX_PLAYBACK_RETRIES) {
      playbackRetries++;
      const resumeAt = audio.currentTime;
      const src = audioUrlFor(chapterList[currentIndex]);
      setTimeout(() => {
        audio.src = src;
        audio.load();
        const onLoaded = () => {
          audio.currentTime = resumeAt;
          audio.removeEventListener("loadedmetadata", onLoaded);
          attemptPlay();
        };
        audio.addEventListener("loadedmetadata", onLoaded);
      }, 1000 * playbackRetries);
    } else {
      showError("This audio chapter is temporarily unavailable. Please try again shortly.");
      setPlayingUI(false);
    }
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

  function updateRepeatUI() {
    if (!repeatBookBtn) return;
    repeatBookBtn.classList.toggle("active", repeatBook);
    repeatBookBtn.setAttribute("aria-pressed", repeatBook ? "true" : "false");
    repeatBookBtn.title = repeatBook
      ? "Repeat book is on"
      : "Repeat book is off";
  }

  if (repeatBookBtn) {
    repeatBookBtn.addEventListener("click", () => {
      repeatBook = !repeatBook;
      updateRepeatUI();
      persist();
    });
  }

  speedBtns.forEach((btn) => {
    const rate = Number(btn.dataset.rate);
    btn.addEventListener("click", () => {
      audio.playbackRate = rate;
      speedBtns.forEach((b) => b.classList.toggle("active", b === btn));
    });
  });

  resumeBtn.addEventListener("click", () => {
    if (pendingResume) {
      continuousPlayback = true;
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
  const first = chapterList[startIndex];
  nowTitleEl.textContent = first.number + " — " + chapterLabel(first);
  nowSubEl.textContent = ITEM_LABEL + " " + (startIndex + 1) + " of " + chapterList.length;
  setActivePlaylistItem(startIndex);
  initResumeBanner();

  // Allow other parts of the page (e.g. "Listen" playlist links) to jump
  // to a specific chapter without autoplaying on page load.
  window.AOSPlayer = {
    playChapter(index) {
      continuousPlayback = true;
      loadChapter(index, { autoplay: true });
      root.scrollIntoView({ behavior: "smooth", block: "start" });
    },
  };
})();

(() => {
    "use strict";

    const STORAGE_KEY = "abr:library:v1";
    const SPEED_STEPS = [1, 1.25, 1.5, 1.75, 2, 0.75];
    const SLEEP_STEPS_MIN = [0, 15, 30, 45, 60];

    /** @type {Map<string, File[]>} in-memory only — File objects can't survive a reload */
    const filesByBookId = new Map();

    const els = {
        libraryScreen: document.getElementById("library-screen"),
        playerScreen: document.getElementById("player-screen"),
        bookList: document.getElementById("book-list"),
        emptyState: document.getElementById("empty-state"),
        fileInput: document.getElementById("file-input"),

        backToLibrary: document.getElementById("back-to-library"),
        chaptersToggle: document.getElementById("chapters-toggle"),
        coverLetter: document.getElementById("cover-letter"),
        playerTitle: document.getElementById("player-title"),
        playerChapter: document.getElementById("player-chapter"),

        seek: document.getElementById("seek"),
        timeElapsed: document.getElementById("time-elapsed"),
        timeRemaining: document.getElementById("time-remaining"),

        skipBack: document.getElementById("skip-back"),
        skipFwd: document.getElementById("skip-fwd"),
        playPause: document.getElementById("play-pause"),
        playIcon: document.getElementById("play-icon"),

        speedBtn: document.getElementById("speed-btn"),
        sleepBtn: document.getElementById("sleep-btn"),

        audio: document.getElementById("audio-el"),

        drawer: document.getElementById("chapters-drawer"),
        chaptersClose: document.getElementById("chapters-close"),
        chapterList: document.getElementById("chapter-list"),
    };

    let library = loadLibrary();
    let activeBookId = null;
    let isSeeking = false;
    let sleepTimer = { minutes: 0, deadline: 0, intervalId: null };

    // ---------- persistence ----------

    function loadLibrary() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    function saveLibrary() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
    }

    function findBook(id) {
        return library.find((b) => b.id === id);
    }

    // ---------- helpers ----------

    function makeBookId(files) {
        return files
            .map((f) => `${f.name}_${f.size}_${f.lastModified}`)
            .sort()
            .join("|");
    }

    function titleFromFiles(files) {
        const names = files.map((f) => f.name.replace(/\.[^.]+$/, ""));
        if (names.length === 1) return names[0];
        // use the longest common prefix across chapter filenames, trimmed of trailing separators
        let prefix = names[0];
        for (const n of names.slice(1)) {
            let i = 0;
            while (i < prefix.length && i < n.length && prefix[i] === n[i]) i++;
            prefix = prefix.slice(0, i);
        }
        prefix = prefix.replace(/[\s\-_.,]+$/, "");
        return prefix.length >= 3 ? prefix : names[0];
    }

    function formatTime(totalSeconds) {
        if (!Number.isFinite(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = Math.floor(totalSeconds % 60);
        const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
        const ss = String(s).padStart(2, "0");
        return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
    }

    // ---------- library screen ----------

    function renderLibrary() {
        els.bookList.innerHTML = "";
        els.emptyState.classList.toggle("hidden", library.length > 0);

        for (const book of library) {
            const li = document.createElement("li");
            li.className = "book-item";

            const chapterIdx = book.currentChapterIndex || 0;
            const chapterTitle = book.chapters[chapterIdx]?.name || "";
            const progressPct = book.duration ? Math.round(((book.position || 0) / book.duration) * 100) : 0;

            li.innerHTML = `
                <button class="thumb" aria-hidden="true">${escapeHtml(book.title[0]?.toUpperCase() || "?")}</button>
                <span class="meta">
                    <span class="name">${escapeHtml(book.title)}</span>
                    <span class="progress-line">${book.chapters.length > 1 ? `Chapter ${chapterIdx + 1} of ${book.chapters.length} &middot; ` : ""}${progressPct}% listened</span>
                </span>
                <button class="remove-btn" aria-label="Remove ${escapeHtml(book.title)}">&times;</button>
            `;

            li.querySelector(".thumb").addEventListener("click", () => openBook(book.id));
            li.querySelector(".meta").addEventListener("click", () => openBook(book.id));
            li.querySelector(".remove-btn").addEventListener("click", (e) => {
                e.stopPropagation();
                removeBook(book.id);
            });

            els.bookList.appendChild(li);
        }
    }

    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    function removeBook(id) {
        library = library.filter((b) => b.id !== id);
        filesByBookId.delete(id);
        saveLibrary();
        renderLibrary();
    }

    els.fileInput.addEventListener("change", () => {
        const files = Array.from(els.fileInput.files || []);
        if (files.length === 0) return;
        files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

        const resumeId = els.fileInput.getAttribute("data-resume-id");
        if (resumeId) {
            els.fileInput.removeAttribute("data-resume-id");
            filesByBookId.set(resumeId, files);
            openBook(resumeId);
            els.fileInput.value = "";
            return;
        }

        const id = makeBookId(files);
        filesByBookId.set(id, files);

        let book = findBook(id);
        if (!book) {
            book = {
                id,
                title: titleFromFiles(files),
                chapters: files.map((f) => ({ name: f.name.replace(/\.[^.]+$/, "") })),
                currentChapterIndex: 0,
                position: 0,
                duration: 0,
                speed: 1,
            };
            library.unshift(book);
            saveLibrary();
        }
        renderLibrary();
        openBook(id);
        els.fileInput.value = "";
    });

    // ---------- player screen ----------

    function openBook(id) {
        const book = findBook(id);
        if (!book) return;

        if (!filesByBookId.has(id)) {
            // File objects don't survive a reload — ask the listener to reselect the same file(s).
            const proceed = confirm(
                `"${book.title}" needs to be reselected — browsers don't keep file access after a reload.\n\nChoose the same audio file(s) again to resume from ${formatTime(book.position)}.`
            );
            if (proceed) {
                els.fileInput.setAttribute("data-resume-id", id);
                els.fileInput.click();
            }
            return;
        }

        activeBookId = id;
        els.libraryScreen.classList.add("hidden");
        els.playerScreen.classList.remove("hidden");

        els.playerTitle.textContent = book.title;
        els.coverLetter.textContent = book.title[0]?.toUpperCase() || "?";
        els.speedBtn.textContent = `${(book.speed || 1).toFixed(2).replace(/0$/, "").replace(/\.$/, ".0")}×`;

        loadChapter(book, book.currentChapterIndex || 0, book.position || 0);
        renderChapterList(book);
    }

    function loadChapter(book, chapterIndex, resumeAt = 0) {
        const files = filesByBookId.get(book.id);
        if (!files || !files[chapterIndex]) return;

        book.currentChapterIndex = chapterIndex;
        const url = URL.createObjectURL(files[chapterIndex]);
        els.audio.src = url;
        els.audio.playbackRate = book.speed || 1;

        els.playerChapter.textContent = `Chapter ${chapterIndex + 1} of ${book.chapters.length}`;

        const onReady = () => {
            if (resumeAt > 0 && resumeAt < els.audio.duration) {
                els.audio.currentTime = resumeAt;
            }
            els.seek.max = String(els.audio.duration || 0);
            updateTimeUI();
            els.audio.removeEventListener("loadedmetadata", onReady);
        };
        els.audio.addEventListener("loadedmetadata", onReady);

        saveLibrary();
        renderChapterList(book);
    }

    function updateTimeUI() {
        const cur = els.audio.currentTime || 0;
        const dur = els.audio.duration || 0;
        if (!isSeeking) els.seek.value = String(cur);
        els.timeElapsed.textContent = formatTime(cur);
        els.timeRemaining.textContent = `-${formatTime(Math.max(dur - cur, 0))}`;
    }

    els.audio.addEventListener("timeupdate", () => {
        updateTimeUI();
        persistPosition();
    });

    els.audio.addEventListener("durationchange", updateTimeUI);
    els.audio.addEventListener("loadedmetadata", updateTimeUI);

    els.audio.addEventListener("play", () => {
        els.playIcon.innerHTML = "&#10074;&#10074;";
        els.playPause.setAttribute("aria-label", "Pause");
    });
    els.audio.addEventListener("pause", () => {
        els.playIcon.innerHTML = "&#9658;";
        els.playPause.setAttribute("aria-label", "Play");
        persistPosition();
    });

    els.audio.addEventListener("ended", () => {
        const book = findBook(activeBookId);
        if (!book) return;
        const nextIndex = (book.currentChapterIndex || 0) + 1;
        if (nextIndex < book.chapters.length) {
            loadChapter(book, nextIndex, 0);
            els.audio.play();
        } else {
            book.position = 0;
            book.currentChapterIndex = 0;
            saveLibrary();
        }
    });

    function persistPosition() {
        const book = findBook(activeBookId);
        if (!book) return;
        book.position = els.audio.currentTime || 0;
        book.duration = els.audio.duration || book.duration || 0;
        saveLibrary();
    }

    els.playPause.addEventListener("click", () => {
        if (els.audio.paused) els.audio.play();
        else els.audio.pause();
    });

    els.skipBack.addEventListener("click", () => {
        els.audio.currentTime = Math.max(0, (els.audio.currentTime || 0) - 15);
    });
    els.skipFwd.addEventListener("click", () => {
        els.audio.currentTime = Math.min(els.audio.duration || Infinity, (els.audio.currentTime || 0) + 30);
    });

    els.seek.addEventListener("input", () => {
        isSeeking = true;
        els.timeElapsed.textContent = formatTime(Number(els.seek.value));
    });
    els.seek.addEventListener("change", () => {
        els.audio.currentTime = Number(els.seek.value);
        isSeeking = false;
    });

    els.speedBtn.addEventListener("click", () => {
        const book = findBook(activeBookId);
        if (!book) return;
        const idx = SPEED_STEPS.indexOf(book.speed || 1);
        const next = SPEED_STEPS[(idx + 1) % SPEED_STEPS.length];
        book.speed = next;
        els.audio.playbackRate = next;
        els.speedBtn.textContent = `${next.toFixed(2).replace(/0$/, "").replace(/\.$/, ".0")}×`;
        saveLibrary();
    });

    els.sleepBtn.addEventListener("click", () => {
        const idx = SLEEP_STEPS_MIN.indexOf(sleepTimer.minutes);
        const next = SLEEP_STEPS_MIN[(idx + 1) % SLEEP_STEPS_MIN.length];
        setSleepTimer(next);
    });

    function setSleepTimer(minutes) {
        clearInterval(sleepTimer.intervalId);
        sleepTimer.minutes = minutes;

        if (minutes === 0) {
            els.sleepBtn.textContent = "Sleep";
            els.sleepBtn.classList.remove("active");
            return;
        }

        sleepTimer.deadline = Date.now() + minutes * 60 * 1000;
        els.sleepBtn.classList.add("active");

        const tick = () => {
            const remainingMs = sleepTimer.deadline - Date.now();
            if (remainingMs <= 0) {
                els.audio.pause();
                setSleepTimer(0);
                return;
            }
            els.sleepBtn.textContent = `${Math.ceil(remainingMs / 60000)}m`;
        };
        tick();
        sleepTimer.intervalId = setInterval(tick, 1000);
    }

    // ---------- chapters drawer ----------

    function renderChapterList(book) {
        els.chapterList.innerHTML = "";
        book.chapters.forEach((chapter, i) => {
            const li = document.createElement("li");
            li.className = "chapter-item" + (i === book.currentChapterIndex ? " current" : "");
            li.innerHTML = `<span>${escapeHtml(chapter.name)}</span>`;
            li.addEventListener("click", () => {
                loadChapter(book, i, 0);
                els.audio.play();
                closeDrawer();
            });
            els.chapterList.appendChild(li);
        });
    }

    function openDrawer() {
        els.drawer.classList.remove("hidden");
    }
    function closeDrawer() {
        els.drawer.classList.add("hidden");
    }

    els.chaptersToggle.addEventListener("click", openDrawer);
    els.chaptersClose.addEventListener("click", closeDrawer);
    els.drawer.addEventListener("click", (e) => {
        if (e.target === els.drawer) closeDrawer();
    });

    // ---------- navigation ----------

    els.backToLibrary.addEventListener("click", () => {
        els.audio.pause();
        persistPosition();
        activeBookId = null;
        els.playerScreen.classList.add("hidden");
        els.libraryScreen.classList.remove("hidden");
        renderLibrary();
    });

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") persistPosition();
    });

    // ---------- service worker ----------

    if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("../sw.js", { scope: "../public/" }).catch(() => {
                /* offline install is a nice-to-have, not required */
            });
        });
    }

    // ---------- init ----------

    renderLibrary();
})();

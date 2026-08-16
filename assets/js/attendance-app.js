// RFID + Face Attendance — kiosk logic (check-in, enrollment, admin log, settings).
// Runs entirely client-side; see attendance-store.js for the data layer and
// the "Architecture" tab in attendance-app.html for production considerations.

(function () {
    const store = AttendanceStore;
    const $ = (id) => document.getElementById(id);

    const FACE_MODEL_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights";
    const FACE_MATCH_THRESHOLD = 0.55;

    let config = store.getConfig();
    let currentPosition = null;
    let geoWatchId = null;
    let modelsLoaded = false;

    let camStream = null;

    let enrollCamStream = null;
    let enrollFaceDescriptor = null;

    let toastTimer = null;
    let resultTimer = null;

    // ---------------------------------------------------------------- tabs

    function switchTab(tab) {
        const prevActive = document.querySelector(".view.active")?.id;
        document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
        document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${tab}`));

        if (prevActive === "view-checkin" && tab !== "checkin") {
            closeFaceCard();
        }
        if (prevActive === "view-enroll" && tab !== "enroll" && enrollCamStream) {
            enrollCamStream.getTracks().forEach((t) => t.stop());
            enrollCamStream = null;
        }

        if (tab === "enroll") renderRoster();
        if (tab === "log") renderLogAndNotifications();
        if (tab === "settings") fillSettingsForm();
    }

    function initTabs() {
        document.querySelectorAll(".tab-btn").forEach((btn) => {
            btn.addEventListener("click", () => switchTab(btn.dataset.tab));
        });
        document.querySelectorAll("[data-tab-link]").forEach((a) => {
            a.addEventListener("click", (e) => {
                e.preventDefault();
                switchTab(a.dataset.tabLink);
            });
        });
    }

    // --------------------------------------------------------------- toast

    function toast(msg) {
        const el = $("toast");
        el.textContent = msg;
        el.hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { el.hidden = true; }, 3500);
    }

    function showResult(success, heading, detail) {
        const card = $("result-card");
        card.hidden = false;
        const headingEl = $("result-heading");
        headingEl.textContent = heading;
        headingEl.style.color = success ? "var(--success)" : "var(--danger)";
        $("result-detail").textContent = detail;
        clearTimeout(resultTimer);
        resultTimer = setTimeout(() => { card.hidden = true; }, 7000);
    }

    // --------------------------------------------------------- geolocation

    function startGeoWatch() {
        const statusEl = $("geofence-status");
        const detailEl = $("geofence-detail");
        if (!("geolocation" in navigator)) {
            statusEl.textContent = "Geolocation not supported";
            statusEl.className = "status-pill warn";
            detailEl.textContent = "This browser can't provide location, so geofencing can't be enforced.";
            return;
        }
        if (geoWatchId != null) navigator.geolocation.clearWatch(geoWatchId);
        statusEl.textContent = "Locating…";
        statusEl.className = "status-pill neutral";
        geoWatchId = navigator.geolocation.watchPosition(
            (pos) => {
                currentPosition = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                };
                evaluateGeofence();
            },
            (err) => {
                statusEl.textContent = "Location unavailable";
                statusEl.className = "status-pill warn";
                detailEl.textContent = err.message;
            },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
        );
    }

    function evaluateGeofence() {
        const statusEl = $("geofence-status");
        const detailEl = $("geofence-detail");
        config = store.getConfig();

        if (config.centerLat == null || config.centerLng == null) {
            statusEl.textContent = "School location not configured";
            statusEl.className = "status-pill warn";
            detailEl.textContent = "An admin needs to set the school center in Settings.";
            return;
        }
        if (!currentPosition) return;

        const dist = store.distanceMeters(currentPosition.lat, currentPosition.lng, config.centerLat, config.centerLng);
        const within = dist <= config.radiusMeters;
        statusEl.textContent = within ? "On campus" : "Off campus";
        statusEl.className = `status-pill ${within ? "ok" : "bad"}`;
        detailEl.textContent = `${Math.round(dist)}m from school center (±${Math.round(currentPosition.accuracy || 0)}m GPS accuracy) — allowed radius ${config.radiusMeters}m.`;
    }

    // --------------------------------------------------------------- RFID

    function isFaceCardOpen() {
        return !$("face-card").hidden;
    }

    function focusRfidInput() {
        if (!store.getConfig().methods.rfid) return;
        if (!document.getElementById("view-checkin").classList.contains("active") || isFaceCardOpen()) return;
        const el = $("rfid-input");
        const active = document.activeElement;
        if (active !== el && active.tagName !== "INPUT" && active.tagName !== "TEXTAREA" && active.tagName !== "SELECT") {
            el.focus();
        }
    }

    function handleRfidScan(rfidUid) {
        config = store.getConfig();
        if (!config.methods.rfid) return;

        const person = store.findByRfid(rfidUid);
        if (!person) {
            showResult(false, "Unknown card", `No one is enrolled with RFID UID "${rfidUid}". Enroll them first.`);
            return;
        }
        completeCheckIn(person, "rfid");
    }

    function renderCheckinMethodVisibility() {
        config = store.getConfig();
        $("rfid-card").hidden = !config.methods.rfid;
        $("face-entry-card").hidden = !config.methods.face;
        $("no-method-card").hidden = config.methods.rfid || config.methods.face;
        if (!config.methods.face) closeFaceCard();
    }

    function renderSimulateButtons() {
        const row = $("simulate-rfid-row");
        row.innerHTML = "";
        const roster = store.getRoster().filter((p) => p.rfidUid);
        roster.forEach((p) => {
            const btn = document.createElement("button");
            btn.className = "btn secondary";
            btn.type = "button";
            btn.textContent = `Simulate: ${p.name}`;
            btn.addEventListener("click", () => handleRfidScan(p.rfidUid));
            row.appendChild(btn);
        });
        if (!roster.length) {
            const hint = document.createElement("p");
            hint.className = "rfid-focus-hint";
            hint.textContent = "Enroll someone with an RFID card in the Enroll tab to simulate a card tap.";
            row.appendChild(hint);
        }
    }

    // ---------------------------------------------------------------- face

    function faceApiUsable() {
        return typeof faceapi !== "undefined" && modelsLoaded;
    }

    function updateFaceHint(text) {
        const hint = $("face-hint");
        if (!hint) return;
        if (text) { hint.textContent = text; return; }
        if (typeof faceapi === "undefined") {
            hint.textContent = "Face recognition library failed to load (offline?) — try the RFID card instead.";
        } else if (!modelsLoaded) {
            hint.textContent = "Loading face recognition models…";
        } else {
            hint.textContent = "Look at the camera and tap \"Scan face\".";
        }
    }

    async function loadFaceModels() {
        if (typeof faceapi === "undefined") {
            updateFaceHint();
            return;
        }
        try {
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODEL_URL),
            ]);
            modelsLoaded = true;
        } catch (err) {
            console.error("Failed to load face-api models", err);
            modelsLoaded = false;
        }
        updateFaceHint();
    }

    async function startFaceCheckIn() {
        config = store.getConfig();
        if (!config.methods.face) return;
        if (!faceApiUsable()) {
            toast(typeof faceapi === "undefined"
                ? "Face recognition library failed to load (offline?)."
                : "Face recognition is still loading — try again in a moment.");
            return;
        }
        $("face-card").hidden = false;
        updateFaceHint("Look at the camera, then tap \"Scan face\".");
        try {
            camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
            $("cam-preview").srcObject = camStream;
        } catch (err) {
            updateFaceHint("Camera unavailable: " + err.message);
        }
    }

    function closeFaceCard() {
        $("face-card").hidden = true;
        if (camStream) {
            camStream.getTracks().forEach((t) => t.stop());
            camStream = null;
        }
    }

    // Face check-in is identification (1:N): the live capture is matched
    // against every enrolled face descriptor since, unlike the RFID flow,
    // there's no card telling us who to verify against.
    async function captureAndIdentifyFace() {
        if (!faceApiUsable()) { toast("Face recognition unavailable."); return; }
        updateFaceHint("Scanning…");
        const detection = await faceapi
            .detectSingleFace($("cam-preview"), new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) {
            updateFaceHint("No face detected — try again with better lighting.");
            return;
        }

        const enrolled = store.getRoster().filter((p) => p.faceDescriptor);
        if (!enrolled.length) {
            updateFaceHint("No one has enrolled a face yet — an admin must add one in the Enroll tab.");
            return;
        }

        let best = null;
        let bestDistance = Infinity;
        enrolled.forEach((p) => {
            const distance = faceapi.euclideanDistance(detection.descriptor, p.faceDescriptor);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = p;
            }
        });

        if (best && bestDistance <= FACE_MATCH_THRESHOLD) {
            closeFaceCard();
            completeCheckIn(best, "face");
        } else {
            updateFaceHint(`No match found (best score ${bestDistance.toFixed(2)}). Try again, improve lighting, or use your RFID card instead.`);
        }
    }

    // ------------------------------------------------------------ check-in

    function completeCheckIn(person, method) {
        config = store.getConfig();
        let distance = null;
        let withinFence = null;

        if (config.requireGeofence) {
            if (!currentPosition || config.centerLat == null) {
                showResult(false, "Location required", "We can't confirm you're on campus yet. Allow location access and make sure Settings has a school center configured.");
                return;
            }
            distance = store.distanceMeters(currentPosition.lat, currentPosition.lng, config.centerLat, config.centerLng);
            withinFence = distance <= config.radiusMeters;
            if (!withinFence) {
                showResult(false, "Outside school premises", `You're about ${Math.round(distance)}m from school — check-in is only allowed within ${config.radiusMeters}m.`);
                return;
            }
        } else if (currentPosition && config.centerLat != null) {
            distance = store.distanceMeters(currentPosition.lat, currentPosition.lng, config.centerLat, config.centerLng);
            withinFence = distance <= config.radiusMeters;
        }

        const entry = store.addLogEntry({
            personId: person.id,
            name: person.name,
            role: person.role,
            method,
            distanceMeters: distance,
            withinFence,
        });

        notifyParent(person, entry);

        showResult(
            true,
            `Welcome, ${person.name.split(" ")[0]}!`,
            `Checked in at ${new Date(entry.timestamp).toLocaleTimeString()} via ${method === "face" ? "face recognition" : "RFID"}.`
        );
    }

    async function notifyParent(person, entry) {
        if (!person.parentEmail) return;
        const cfg = store.getConfig();
        const subject = `${person.name} checked in at ${cfg.schoolName}`;
        const body = `Hi, this is to let you know ${person.name} checked in at ${new Date(entry.timestamp).toLocaleString()} ` +
            `(via ${entry.method === "face" ? "face recognition" : "RFID"}, ` +
            `${entry.withinFence === false ? "location unconfirmed" : "on campus"}).`;

        let status = "simulated";
        const canSendReal = cfg.emailjs.serviceId && cfg.emailjs.templateId && cfg.emailjs.publicKey && typeof emailjs !== "undefined";

        if (canSendReal) {
            try {
                await emailjs.send(cfg.emailjs.serviceId, cfg.emailjs.templateId, {
                    to_email: person.parentEmail,
                    student_name: person.name,
                    subject,
                    message: body,
                }, cfg.emailjs.publicKey);
                status = "sent";
            } catch (err) {
                console.error("EmailJS send failed", err);
                status = "failed";
            }
        }

        store.addNotification({
            logId: entry.id,
            personId: person.id,
            parentEmail: person.parentEmail,
            subject,
            body,
            channel: "email",
            status,
        });
        store.markNotified(entry.id);

        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(subject, { body });
        }
        renderLogAndNotifications();
    }

    // ------------------------------------------------------------- enroll

    async function handleEnrollCapture() {
        const btn = $("enroll-capture-btn");
        const status = $("enroll-face-status");

        if (!enrollCamStream) {
            try {
                enrollCamStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
                $("enroll-cam-preview").srcObject = enrollCamStream;
                btn.textContent = "Capture";
                status.textContent = "Camera on — center your face, then tap Capture.";
            } catch (err) {
                status.textContent = "Camera unavailable: " + err.message;
            }
            return;
        }

        if (!faceApiUsable()) {
            status.textContent = "Face recognition library unavailable — you can still enroll with RFID only.";
            return;
        }

        const detection = await faceapi
            .detectSingleFace($("enroll-cam-preview"), new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) {
            status.textContent = "No face detected — try again.";
            return;
        }

        enrollFaceDescriptor = Array.from(detection.descriptor);
        status.textContent = "Face captured ✓";
        enrollCamStream.getTracks().forEach((t) => t.stop());
        enrollCamStream = null;
        btn.textContent = "Recapture face";
    }

    function handleEnrollSubmit(e) {
        e.preventDefault();
        const name = $("enroll-name").value.trim();
        const role = $("enroll-role").value;
        const rfidUid = $("enroll-rfid").value.trim();
        const parentEmail = $("enroll-parent-email").value.trim();
        const parentPhone = $("enroll-parent-phone").value.trim();

        if (!name) { toast("Name is required."); return; }
        if (!rfidUid && !enrollFaceDescriptor) { toast("Add an RFID card, capture a face, or both."); return; }
        if (rfidUid && store.findByRfid(rfidUid)) { toast("That RFID card is already enrolled."); return; }

        store.addPerson({ name, role, rfidUid, parentEmail, parentPhone, faceDescriptor: enrollFaceDescriptor });
        toast(`${name} enrolled.`);

        e.target.reset();
        enrollFaceDescriptor = null;
        $("enroll-face-status").textContent = "No face captured yet.";
        $("enroll-capture-btn").textContent = "Capture face";

        renderRoster();
        renderSimulateButtons();
    }

    function renderRoster() {
        const roster = store.getRoster();
        $("roster-count").textContent = roster.length;
        const body = $("roster-body");
        body.innerHTML = "";

        roster.forEach((p) => {
            const tr = document.createElement("tr");
            [p.name, p.role, p.rfidUid, p.faceDescriptor ? "✓" : "—", p.parentEmail || "—"].forEach((text) => {
                const td = document.createElement("td");
                td.textContent = text;
                tr.appendChild(td);
            });
            const actionTd = document.createElement("td");
            const delBtn = document.createElement("button");
            delBtn.className = "btn secondary";
            delBtn.type = "button";
            delBtn.textContent = "Remove";
            delBtn.addEventListener("click", () => {
                store.deletePerson(p.id);
                renderRoster();
                renderSimulateButtons();
            });
            actionTd.appendChild(delBtn);
            tr.appendChild(actionTd);
            body.appendChild(tr);
        });

        $("roster-empty").hidden = roster.length > 0;
    }

    // ------------------------------------------------------------ admin log

    function renderLogAndNotifications() {
        const log = store.getLog();
        const logList = $("log-list");
        logList.innerHTML = "";

        log.slice(0, 50).forEach((entry) => {
            const div = document.createElement("div");
            div.className = "log-item";

            const strong = document.createElement("strong");
            strong.textContent = entry.name;
            const chip = document.createElement("span");
            chip.className = "chip";
            chip.textContent = entry.method;
            div.append(strong, " ", chip);

            const meta = document.createElement("div");
            meta.className = "meta";
            const fenceText = entry.withinFence === null
                ? "geofence not checked"
                : entry.withinFence
                    ? `on campus (${Math.round(entry.distanceMeters)}m)`
                    : `off campus (${Math.round(entry.distanceMeters)}m)`;
            meta.textContent = `${new Date(entry.timestamp).toLocaleString()} · ${fenceText} · ${entry.notified ? "parent notified" : "no parent contact on file"}`;
            div.appendChild(meta);

            logList.appendChild(div);
        });
        $("log-empty").hidden = log.length > 0;

        const notes = store.getNotifications();
        const notifyList = $("notify-list");
        notifyList.innerHTML = "";

        notes.slice(0, 50).forEach((n) => {
            const div = document.createElement("div");
            div.className = "notify-item";

            const strong = document.createElement("strong");
            strong.textContent = n.subject;
            const chip = document.createElement("span");
            chip.className = "chip";
            chip.textContent = n.status;
            div.append(strong, " ", chip);

            const meta = document.createElement("div");
            meta.className = "meta";
            meta.textContent = `to ${n.parentEmail} · ${new Date(n.createdAt).toLocaleString()}`;
            div.appendChild(meta);

            const body = document.createElement("div");
            body.textContent = n.body;
            body.style.fontSize = "0.85rem";
            body.style.marginTop = "0.25rem";
            div.appendChild(body);

            notifyList.appendChild(div);
        });
        $("notify-empty").hidden = notes.length > 0;
    }

    // -------------------------------------------------------------- settings

    function fillSettingsForm() {
        config = store.getConfig();
        $("cfg-school-name").value = config.schoolName;
        $("cfg-lat").value = config.centerLat ?? "";
        $("cfg-lng").value = config.centerLng ?? "";
        $("cfg-radius").value = config.radiusMeters;
        $("cfg-method-rfid").checked = config.methods.rfid;
        $("cfg-method-face").checked = config.methods.face;
        $("cfg-require-geofence").checked = config.requireGeofence;
        $("cfg-emailjs-service").value = config.emailjs.serviceId;
        $("cfg-emailjs-template").value = config.emailjs.templateId;
        $("cfg-emailjs-key").value = config.emailjs.publicKey;
    }

    function handleUseCurrentLocation() {
        if (!("geolocation" in navigator)) { toast("Geolocation not supported."); return; }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                $("cfg-lat").value = pos.coords.latitude;
                $("cfg-lng").value = pos.coords.longitude;
                toast("Current location filled in — remember to save.");
            },
            (err) => toast("Could not get location: " + err.message)
        );
    }

    function handleSaveSettings() {
        const methods = {
            rfid: $("cfg-method-rfid").checked,
            face: $("cfg-method-face").checked,
        };
        if (!methods.rfid && !methods.face) {
            toast("Enable at least one check-in method (RFID or face).");
            return;
        }

        const lat = parseFloat($("cfg-lat").value);
        const lng = parseFloat($("cfg-lng").value);
        store.saveConfig({
            schoolName: $("cfg-school-name").value.trim() || "My School",
            centerLat: Number.isFinite(lat) ? lat : null,
            centerLng: Number.isFinite(lng) ? lng : null,
            radiusMeters: parseInt($("cfg-radius").value, 10) || 150,
            methods,
            requireGeofence: $("cfg-require-geofence").checked,
            emailjs: {
                serviceId: $("cfg-emailjs-service").value.trim(),
                templateId: $("cfg-emailjs-template").value.trim(),
                publicKey: $("cfg-emailjs-key").value.trim(),
            },
        });
        config = store.getConfig();
        $("school-name-heading").textContent = config.schoolName;
        renderCheckinMethodVisibility();
        toast("Settings saved.");
        evaluateGeofence();
    }

    function handleExportData() {
        const data = store.exportAll();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "attendance-export.json";
        a.click();
        URL.revokeObjectURL(url);
    }

    function handleClearData() {
        if (!confirm("This clears all roster, log and notification data on this device. Continue?")) return;
        store.resetAll();
        config = store.getConfig();
        renderRoster();
        renderSimulateButtons();
        renderLogAndNotifications();
        toast("All demo data cleared.");
    }

    // ---------------------------------------------------------------- init

    function bindEvents() {
        initTabs();

        $("refresh-location-btn").addEventListener("click", startGeoWatch);

        $("rfid-input").addEventListener("keydown", (e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const val = e.target.value.trim();
            e.target.value = "";
            if (val) handleRfidScan(val);
        });
        document.addEventListener("click", focusRfidInput);
        setInterval(focusRfidInput, 1500);

        $("start-face-checkin-btn").addEventListener("click", startFaceCheckIn);
        $("capture-face-btn").addEventListener("click", captureAndIdentifyFace);
        $("cancel-face-btn").addEventListener("click", closeFaceCard);

        $("enroll-rfid").addEventListener("keydown", (e) => {
            if (e.key === "Enter") e.preventDefault();
        });
        $("enroll-capture-btn").addEventListener("click", handleEnrollCapture);
        $("enroll-form").addEventListener("submit", handleEnrollSubmit);

        $("use-current-location-btn").addEventListener("click", handleUseCurrentLocation);
        $("save-settings-btn").addEventListener("click", handleSaveSettings);
        $("export-data-btn").addEventListener("click", handleExportData);
        $("clear-data-btn").addEventListener("click", handleClearData);
    }

    async function init() {
        bindEvents();
        config = store.getConfig();
        $("school-name-heading").textContent = config.schoolName;

        renderCheckinMethodVisibility();
        renderSimulateButtons();
        renderRoster();
        renderLogAndNotifications();
        fillSettingsForm();
        startGeoWatch();

        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission().catch(() => {});
        }

        await loadFaceModels();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();

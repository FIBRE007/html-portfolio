// Parent Dashboard — the "mobile application" side of the attendance demo.
// Reads the same local-storage data the kiosk writes (see attendance-store.js).
// In production this would call an authenticated backend API instead.

(function () {
    const store = AttendanceStore;
    const $ = (id) => document.getElementById(id);
    const LAST_EMAIL_KEY = "attendance_dashboard_last_email";

    let toastTimer = null;
    function toast(msg) {
        const el = $("toast");
        el.textContent = msg;
        el.hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { el.hidden = true; }, 3500);
    }

    function findChildren(email) {
        const needle = email.trim().toLowerCase();
        return store.getRoster().filter((p) => (p.parentEmail || "").toLowerCase() === needle);
    }

    function renderChildren(children) {
        const list = $("children-list");
        list.innerHTML = "";
        children.forEach((c) => {
            const div = document.createElement("div");
            div.className = "log-item";
            const strong = document.createElement("strong");
            strong.textContent = c.name;
            const chip = document.createElement("span");
            chip.className = "chip";
            chip.textContent = c.role;
            div.append(strong, " ", chip);
            const meta = document.createElement("div");
            meta.className = "meta";
            meta.textContent = `RFID ${c.rfidUid} · face enrolled: ${c.faceDescriptor ? "yes" : "no"}`;
            div.appendChild(meta);
            list.appendChild(div);
        });
        $("children-card").hidden = children.length === 0;
    }

    function renderLog(children) {
        const ids = new Set(children.map((c) => c.id));
        const entries = store.getLog().filter((e) => ids.has(e.personId)).slice(0, 30);
        const list = $("dash-log-list");
        list.innerHTML = "";

        entries.forEach((entry) => {
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
            meta.textContent = `${new Date(entry.timestamp).toLocaleString()} · ${fenceText}`;
            div.appendChild(meta);
            list.appendChild(div);
        });

        $("dash-log-card").hidden = false;
        $("dash-log-empty").hidden = entries.length > 0;
    }

    function renderNotifications(email) {
        const needle = email.trim().toLowerCase();
        const notes = store.getNotifications()
            .filter((n) => (n.parentEmail || "").toLowerCase() === needle)
            .slice(0, 30);
        const list = $("dash-notify-list");
        list.innerHTML = "";

        notes.forEach((n) => {
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
            meta.textContent = new Date(n.createdAt).toLocaleString();
            div.appendChild(meta);

            const body = document.createElement("div");
            body.textContent = n.body;
            body.style.fontSize = "0.85rem";
            body.style.marginTop = "0.25rem";
            div.appendChild(body);

            list.appendChild(div);
        });

        $("dash-notify-card").hidden = false;
        $("dash-notify-empty").hidden = notes.length > 0;
    }

    function showForEmail(email) {
        const children = findChildren(email);
        const hint = $("dashboard-hint");

        if (!children.length) {
            hint.textContent = "No student found with that parent email on this device. Make sure the kiosk enrolled them with this exact email, and that you're using the same browser/device.";
            $("children-card").hidden = true;
            $("dash-log-card").hidden = true;
            $("dash-notify-card").hidden = true;
            return;
        }

        hint.textContent = "";
        localStorage.setItem(LAST_EMAIL_KEY, email.trim());
        renderChildren(children);
        renderLog(children);
        renderNotifications(email);
    }

    function init() {
        const saved = localStorage.getItem(LAST_EMAIL_KEY);
        if (saved) {
            $("parent-email-input").value = saved;
            showForEmail(saved);
        }

        $("find-btn").addEventListener("click", () => {
            const email = $("parent-email-input").value.trim();
            if (!email) { toast("Enter the parent email used at enrollment."); return; }
            showForEmail(email);
        });

        $("enable-push-btn").addEventListener("click", async () => {
            if (!("Notification" in window)) { toast("Notifications aren't supported in this browser."); return; }
            const perm = await Notification.requestPermission();
            if (perm === "granted") {
                toast("Notifications enabled on this device. A production app would also register for push via FCM/APNs.");
            } else {
                toast("Notifications weren't enabled.");
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();

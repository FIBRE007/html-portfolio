// Data layer for the RFID + Face Attendance demo.
// Everything is kept in localStorage — there is no backend in this portfolio
// project, so this file also stands in for the "database" and "API".
// See the Architecture panel in attendance-app.html for how this maps to a
// real deployment (shared DB, authenticated API, real email/push delivery).

const AttendanceStore = (() => {
    const KEYS = {
        roster: "attendance_roster_v1",
        log: "attendance_log_v1",
        notifications: "attendance_notifications_v1",
        config: "attendance_config_v1",
    };

    const DEFAULT_CONFIG = {
        schoolName: "My School",
        centerLat: null,
        centerLng: null,
        radiusMeters: 150,
        methods: { rfid: true, face: true },
        requireGeofence: true,
        emailjs: { serviceId: "", templateId: "", publicKey: "" },
    };

    function read(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (err) {
            console.error("AttendanceStore: failed to read", key, err);
            return fallback;
        }
    }

    function write(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function uid(prefix) {
        return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    }

    // -- Config -----------------------------------------------------------

    function getConfig() {
        return { ...DEFAULT_CONFIG, ...read(KEYS.config, {}) };
    }

    function saveConfig(partial) {
        const merged = { ...getConfig(), ...partial };
        write(KEYS.config, merged);
        return merged;
    }

    // -- Roster (students & staff) -----------------------------------------

    function getRoster() {
        return read(KEYS.roster, []);
    }

    function saveRoster(roster) {
        write(KEYS.roster, roster);
    }

    function addPerson(person) {
        const roster = getRoster();
        const record = {
            id: uid("person"),
            name: person.name,
            role: person.role, // 'student' | 'staff'
            rfidUid: person.rfidUid,
            parentEmail: person.parentEmail || "",
            parentPhone: person.parentPhone || "",
            faceDescriptor: person.faceDescriptor || null,
            enrolledAt: new Date().toISOString(),
        };
        roster.push(record);
        saveRoster(roster);
        return record;
    }

    function updatePerson(id, patch) {
        const roster = getRoster();
        const idx = roster.findIndex((p) => p.id === id);
        if (idx === -1) return null;
        roster[idx] = { ...roster[idx], ...patch };
        saveRoster(roster);
        return roster[idx];
    }

    function deletePerson(id) {
        saveRoster(getRoster().filter((p) => p.id !== id));
    }

    function findByRfid(rfidUid) {
        return getRoster().find((p) => p.rfidUid === rfidUid) || null;
    }

    // -- Attendance log -----------------------------------------------------

    function getLog() {
        return read(KEYS.log, []);
    }

    function addLogEntry(entry) {
        const log = getLog();
        const record = {
            id: uid("log"),
            personId: entry.personId,
            name: entry.name,
            role: entry.role,
            method: entry.method, // 'rfid' | 'face'
            timestamp: new Date().toISOString(),
            distanceMeters: entry.distanceMeters ?? null,
            withinFence: entry.withinFence ?? null,
            notified: false,
        };
        log.unshift(record);
        write(KEYS.log, log);
        return record;
    }

    function markNotified(logId) {
        const log = getLog();
        const idx = log.findIndex((l) => l.id === logId);
        if (idx === -1) return;
        log[idx].notified = true;
        write(KEYS.log, log);
    }

    // -- Notifications --------------------------------------------------------

    function getNotifications() {
        return read(KEYS.notifications, []);
    }

    function addNotification(note) {
        const notes = getNotifications();
        const record = {
            id: uid("note"),
            logId: note.logId,
            personId: note.personId,
            parentEmail: note.parentEmail,
            subject: note.subject,
            body: note.body,
            channel: note.channel, // 'email' | 'push'
            status: note.status, // 'sent' | 'simulated' | 'failed'
            createdAt: new Date().toISOString(),
        };
        notes.unshift(record);
        write(KEYS.notifications, notes);
        return record;
    }

    // -- Geofencing -----------------------------------------------------------

    // Haversine distance in meters between two lat/lng points.
    function distanceMeters(lat1, lng1, lat2, lng2) {
        const R = 6371000;
        const toRad = (deg) => (deg * Math.PI) / 180;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // -- Bulk / reset -----------------------------------------------------------

    function exportAll() {
        return {
            roster: getRoster(),
            log: getLog(),
            notifications: getNotifications(),
            config: getConfig(),
            exportedAt: new Date().toISOString(),
        };
    }

    function importAll(data) {
        if (data.roster) write(KEYS.roster, data.roster);
        if (data.log) write(KEYS.log, data.log);
        if (data.notifications) write(KEYS.notifications, data.notifications);
        if (data.config) write(KEYS.config, { ...DEFAULT_CONFIG, ...data.config });
    }

    function resetAll() {
        Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    }

    return {
        getConfig,
        saveConfig,
        getRoster,
        addPerson,
        updatePerson,
        deletePerson,
        findByRfid,
        getLog,
        addLogEntry,
        markNotified,
        getNotifications,
        addNotification,
        distanceMeters,
        exportAll,
        importAll,
        resetAll,
    };
})();

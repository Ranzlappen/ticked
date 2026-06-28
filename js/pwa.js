// ── Google Drive Sync ─────────────────────────────────────
const GDRIVE_SCOPES = 'https://www.googleapis.com/auth/drive.file';
const GDRIVE_FILENAME = 'ticked-backup.json';
let _gdriveTokenClient = null;
let _gdriveAccessToken = null;
let _gdriveModalResolve = null;

function loadGoogleIdentityServices() {
    return new Promise((resolve, reject) => {
        if (window.google && window.google.accounts) { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
        document.head.appendChild(script);
    });
}

function openGdriveClientModal() {
    return new Promise(resolve => {
        _gdriveModalResolve = resolve;
        if (gdriveClientInput) {
            gdriveClientInput.value = _gdriveClientId || (safeStorage.get('gdriveClientId') || '').trim();
            setTimeout(() => gdriveClientInput.focus(), 10);
        }
        document.getElementById('gdriveClientModal').classList.add('open');
        document.body.classList.add('sheet-open');
    });
}

function closeGdriveClientModal(saveValue) {
    const modal = document.getElementById('gdriveClientModal');
    if (modal) modal.classList.remove('open');
    document.body.classList.remove('sheet-open');

    let resolved = null;
    if (saveValue) {
        const clientId = (gdriveClientInput?.value || '').trim();
        if (!clientId) {
            showToast(t('gdriveIdRequired'), true);
            if (gdriveClientInput) gdriveClientInput.focus();
            return;
        }
        _gdriveClientId = clientId;
        safeStorage.set('gdriveClientId', clientId);
        _gdriveAccessToken = null;
        _gdriveTokenClient = null;
        save();
        resolved = clientId;
    }
    if (_gdriveModalResolve) {
        _gdriveModalResolve(resolved);
        _gdriveModalResolve = null;
    }
}

async function ensureGdriveClientId() {
    _gdriveClientId = (_gdriveClientId || safeStorage.get('gdriveClientId') || '').trim();
    if (_gdriveClientId) {
        if (gdriveClientInput) gdriveClientInput.value = _gdriveClientId;
        return _gdriveClientId;
    }
    return await openGdriveClientModal();
}

async function gdriveAuth() {
    if (_gdriveAccessToken) return _gdriveAccessToken;
    const clientId = await ensureGdriveClientId();
    if (!clientId) { showToast(t('gdriveIdRequired'), true); return null; }

    await loadGoogleIdentityServices();

    return new Promise((resolve) => {
        _gdriveTokenClient = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: GDRIVE_SCOPES,
            callback: (resp) => {
                if (resp.error) {
                    showToast(t('gdriveAuthFailed', {error: resp.error}), true);
                    resolve(null);
                    return;
                }
                _gdriveAccessToken = resp.access_token;
                resolve(resp.access_token);
            },
        });
        _gdriveTokenClient.requestAccessToken();
    });
}

async function gdriveFindFile(token) {
    const q = encodeURIComponent("name='" + GDRIVE_FILENAME + "' and trashed=false");
    const resp = await fetch('https://www.googleapis.com/drive/v3/files?q=' + q + '&spaces=drive&fields=files(id,name,modifiedTime)&orderBy=modifiedTime%20desc&pageSize=1', {
        headers: { Authorization: 'Bearer ' + token }
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.files && data.files.length > 0 ? data.files[0] : null;
}

async function gdriveUpload() {
    if (state.entries.length === 0 && state.processes.length === 0) {
        showToast(t('nothingToUpload'), true);
        return;
    }
    showToast(t('connectingGdrive'));
    const token = await gdriveAuth();
    if (!token) return;

    const jsonStr = JSON.stringify(buildExportPayload(), null, 2);

    try {
        const existing = await gdriveFindFile(token);
        let resp;

        if (existing) {
            resp = await fetch('https://www.googleapis.com/upload/drive/v3/files/' + existing.id + '?uploadType=media', {
                method: 'PATCH',
                headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: jsonStr,
            });
        } else {
            const metadata = { name: GDRIVE_FILENAME, mimeType: 'application/json' };
            const boundary = '---ticked_boundary_' + Date.now();
            const body = '--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) + '\r\n--' + boundary + '\r\nContent-Type: application/json\r\n\r\n' + jsonStr + '\r\n--' + boundary + '--';
            resp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'multipart/related; boundary=' + boundary },
                body,
            });
        }

        if (resp.ok) {
            showToast(t('uploadedGdrive', {n: state.entries.length + state.processes.length}));
        } else {
            showToast(t('uploadFailed', {error: resp.statusText}), true);
        }
    } catch (e) {
        showToast(t('uploadFailed', {error: e.message}), true);
    }
}

async function gdriveDownload() {
    showToast(t('connectingGdrive'));
    const token = await gdriveAuth();
    if (!token) return;

    try {
        const file = await gdriveFindFile(token);
        if (!file) {
            showToast(t('noBackupFound'), true);
            return;
        }

        const resp = await fetch('https://www.googleapis.com/drive/v3/files/' + file.id + '?alt=media', {
            headers: { Authorization: 'Bearer ' + token }
        });
        if (!resp.ok) { showToast(t('downloadFailed', {error: resp.statusText}), true); return; }

        const parsed = await resp.json();
        const result = mergeImportedData(parsed);
        const totalNew = result.newEntries + result.newProcs;
        const totalDupe = result.dupeEntries + result.dupeProcs;
        let msg = t('syncedEntries', { n: totalNew });
        if (totalDupe > 0) msg += ' ' + t('duplicatesSkipped', { n: totalDupe });
        if (totalNew === 0 && totalDupe === 0) msg = t('alreadyUpToDate');
        showToast(msg);
    } catch (e) {
        showToast(t('syncFailed', {error: e.message}), true);
    }
}

// ── Keyboard ──────────────────────────────────────────────
inputText.addEventListener('keypress', e => { if (e.key === 'Enter') addEntry(); });
procInputText.addEventListener('keypress', e => { if (e.key === 'Enter') addProcess(); });

// ── Init ──────────────────────────────────────────────────
window.addEventListener('load', async () => {
    await load();
    applySettings(loadSettings());
    initTooltip();
    initKofi();
    initStats();
    initPWA();
    initPersistentLogBell();
    initExternalLinkHandler();
});

// Force a flush on tab close / hide so pending debounced saves don't lose data.
// visibilitychange→hidden is the reliable signal on mobile Safari where
// beforeunload often doesn't fire.
window.addEventListener('beforeunload', () => { saveNow(); });
window.addEventListener('pagehide',     () => { saveNow(); });
window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveNow();
});

// ── PWA + Notification system ────────────────────────────
let _swRegistration = null;
const INSTA_LOG_TEXT = '✅ Insta-log from notification';
const PERSISTENT_LOG_NOTIFICATION_TAG = 'ticked-persistent-log';

async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        showToast(t('notificationsNotSupported'), true);
        return false;
    }
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') {
        showToast(t('notificationsBlocked'), true);
        return false;
    }
    const result = await Notification.requestPermission();
    if (result === 'granted') {
        showToast(t('notificationsEnabled'));
        return true;
    }
    showToast(t('notificationsDenied'), true);
    return false;
}

async function sendTickedNotification(title, body, config = {}) {
    const ok = await requestNotificationPermission();
    if (!ok) return;

    const options = {
        body: body || t('tapToLog'),
        icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='80' fill='%230d0f14'/%3E%3Crect x='24' y='24' width='464' height='464' rx='64' fill='none' stroke='%2300e5a0' stroke-width='12'/%3E%3Cpath d='M140 256l80 90 152-160' stroke='%2300e5a0' stroke-width='44' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E",
        badge: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' rx='16' fill='%230d0f14'/%3E%3Cpath d='M24 48l20 22 28-30' stroke='%2300e5a0' stroke-width='8' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E",
        tag: config.tag || 'ticked-checkpoint',
        renotify: config.renotify ?? true,
        requireInteraction: config.requireInteraction ?? true,
        actions: config.actions || [
            { action: 'insta-log', title: t('instaLog') },
            { action: 'open', title: t('openApp') }
        ],
        data: config.data || {},
        vibrate: [100, 50, 100],
    };

    // Try SW registration (required for action buttons on Android)
    let reg = _swRegistration;

    // Fallback: get registration from navigator.serviceWorker.ready
    if ((!reg || !reg.active) && 'serviceWorker' in navigator) {
        try {
            reg = await Promise.race([
                navigator.serviceWorker.ready,
                new Promise((_, reject) => setTimeout(() => reject('timeout'), 2000))
            ]);
            _swRegistration = reg;
        } catch(e) { reg = null; }
    }

    if (reg && reg.active) {
        try {
            await reg.showNotification(title || t('ticked'), options);
            return;
        } catch(e) { /* fallback below */ }
    }

    // Last resort: basic Notification (no action buttons)
    try {
        delete options.actions; // basic Notification doesn't support actions
        delete options.requireInteraction;
        new Notification(title || t('ticked'), options);
    } catch(e) {}
}

function addNotificationLogEntry(showToastMessage = false) {
    const entry = {
        id: uuid(),
        isoDate: new Date().toISOString(),
        text: '',
        custom: false,
        bgColor: '',
        borderColor: '',
        tags: []
    };
    setState({ entries: [entry, ...state.entries] });
    save();
    if (showToastMessage) showToast(t('loggedFromNotification'));
    return true;
}

function instaLogCheckpoint(procId, cpIdx, opts = {}) {
    const proc = state.processes.find(p => p.id === procId);
    if (!proc) return false;
    const cps = [...(proc.checkpoints || [])];
    const checkpoint = cps[cpIdx];
    if (!checkpoint) return false;
    if (!checkpoint.timestamp) checkpoint.timestamp = new Date().toISOString();
    const nextCheckpoint = Math.min(cpIdx + 1, Math.max(0, cps.length - 1));

    const procs = state.processes.map(p => p.id === procId ? { ...p, checkpoints: cps, currentCheckpoint: nextCheckpoint } : p);
    const entry = {
        id: uuid(),
        isoDate: new Date().toISOString(),
        text: INSTA_LOG_TEXT,
        custom: false,
        bgColor: '',
        borderColor: '',
        tags: []
    };
    setState({ processes: procs, entries: [entry, ...state.entries] });
    save();
    if (!opts.silent) {
        showToast(t('instaLogComplete'));
    }
    return true;
}

function persistentLogEnabled() {
    return safeStorage.get('persistentLogNotification') === 'on';
}

function syncPersistentLogBell() {
    const btn = document.getElementById('logNotifyBtn');
    if (!btn) return;
    const on = persistentLogEnabled();
    btn.classList.toggle('active', on);
    btn.title = on ? t('disableNotification') : t('showNotification');
}

function initPersistentLogBell() {
    syncPersistentLogBell();
    if (persistentLogEnabled()) {
        setTimeout(() => {
            showPersistentLogNotification();
        }, 500);
    }
}

async function showPersistentLogNotification() {
    const ok = await requestNotificationPermission();
    if (!ok) return;
    await sendTickedNotification(t('ticked'), t('quickLogReady'), {
        tag: PERSISTENT_LOG_NOTIFICATION_TAG,
        renotify: false,
        actions: [
            { action: 'quick-log', title: t('logNow') },
            { action: 'open', title: t('openApp') }
        ],
        data: { action: 'quick-log', keepAlive: true },
    });
}

function togglePersistentLogNotification() {
    const currentlyOn = persistentLogEnabled();
    if (currentlyOn) {
        safeStorage.set('persistentLogNotification', 'off');
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
            navigator.serviceWorker.ready.then(reg => reg.getNotifications({ tag: PERSISTENT_LOG_NOTIFICATION_TAG }).then(list => list.forEach(n => n.close())).catch(() => {})).catch(() => {});
        }
        showToast(t('quickLogOff'));
    } else {
        safeStorage.set('persistentLogNotification', 'on');
        showPersistentLogNotification();
        showToast(t('quickLogOn'));
    }
    syncPersistentLogBell();
}

let _deferredInstallPrompt = null;

function syncInstallButton() {
    const field = document.getElementById('installAppField');
    if (field) field.style.display = _deferredInstallPrompt ? '' : 'none';
}

async function promptInstall() {
    if (!_deferredInstallPrompt) return;
    const promptEvent = _deferredInstallPrompt;
    _deferredInstallPrompt = null;
    syncInstallButton();
    try {
        promptEvent.prompt();
        await promptEvent.userChoice;
    } catch (_) { /* user dismissed or prompt unavailable */ }
}

async function initPWA() {
    if ('serviceWorker' in navigator) {
        try {
            _swRegistration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
        } catch (_) {}

        navigator.serviceWorker.addEventListener('message', e => {
            if (e.data && e.data.type === 'ticked-action' && e.data.action === 'insta-log') {
                const ok = instaLogCheckpoint(e.data.procId, Number(e.data.cpIdx), { silent: false });
                if (!ok) showToast(t('checkpointUnavailable'), true);
            } else if (e.data && e.data.type === 'ticked-action' && e.data.action === 'quick-log') {
                addNotificationLogEntry(true);
                if (persistentLogEnabled() && e.data.keepAlive) {
                    showPersistentLogNotification();
                }
            }
        });
    }

    // Native install prompt support
    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        _deferredInstallPrompt = e;
        syncInstallButton();
    });
    window.addEventListener('appinstalled', () => {
        _deferredInstallPrompt = null;
        syncInstallButton();
    });
    syncInstallButton();

    // Handle hash-based actions from notification clicks (when app was not open)
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    if (hash.get('action') === 'insta-log') {
        const procId = hash.get('proc');
        const cpIdx = Number(hash.get('cp'));
        setTimeout(() => {
            const ok = instaLogCheckpoint(procId, cpIdx, { silent: false });
            if (!ok) showToast(t('checkpointUnavailable'), true);
            history.replaceState(null, '', location.pathname);
        }, 260);
    } else if (hash.get('action') === 'quick-log') {
        setTimeout(() => {
            addNotificationLogEntry(true);
            if (persistentLogEnabled()) showPersistentLogNotification();
            history.replaceState(null, '', location.pathname);
        }, 220);
    }
    updateAppBadge();
    scheduleAllPendingReminders();
}

// ── Streak & Heatmap ─────────────────────────────────────
function calculateStreak() {
    if (state.entries.length === 0) return 0;
    const dates = new Set(state.entries.map(e => isoToDateStr(e.isoDate)));
    let streak = 0;
    const d = new Date();
    // If today has no entries, start counting from yesterday
    if (!dates.has(d.toLocaleDateString('en-CA'))) {
        d.setDate(d.getDate() - 1);
    }
    while (dates.has(d.toLocaleDateString('en-CA'))) {
        streak++;
        d.setDate(d.getDate() - 1);
    }
    return streak;
}

function getWeekEntryCount() {
    const now = new Date();
    const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    return state.entries.filter(e => new Date(e.isoDate) >= weekAgo).length;
}

function renderHeatmap() {
    const container = document.getElementById('heatmapContainer');
    if (!container) return;

    // Count entries per day
    const counts = {};
    state.entries.forEach(e => {
        const d = isoToDateStr(e.isoDate);
        counts[d] = (counts[d] || 0) + 1;
    });
    // Also count process creations
    state.processes.forEach(p => {
        const d = isoToDateStr(p.isoDate);
        counts[d] = (counts[d] || 0) + 1;
    });

    const maxCount = Math.max(1, ...Object.values(counts));

    // Build 12-week grid (84 days) ending today
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-CA');
    const grid = document.createElement('div');
    grid.className = 'heatmap-grid';

    // Start from 83 days ago, align to start of that week (Sunday)
    const start = new Date(today);
    start.setDate(start.getDate() - 83);
    // Align to Sunday
    start.setDate(start.getDate() - start.getDay());

    const cursor = new Date(start);
    while (cursor <= today) {
        const dateStr = cursor.toLocaleDateString('en-CA');
        const count = counts[dateStr] || 0;
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell' + (dateStr === todayStr ? ' today' : '');

        // Opacity based on activity level
        if (count > 0) {
            const intensity = Math.min(1, count / maxCount);
            // Map to opacity tiers: 0.15, 0.3, 0.55, 0.8, 1.0
            const tier = intensity <= 0.2 ? 0.15
                       : intensity <= 0.4 ? 0.3
                       : intensity <= 0.6 ? 0.55
                       : intensity <= 0.8 ? 0.8
                       : 1.0;
            cell.style.opacity = tier;
        }

        cell.title = t('heatmapTitle', { label: formatDayLabel(dateStr), count: count, unit: count === 1 ? t('entry') : t('entries') });
        grid.appendChild(cell);
        cursor.setDate(cursor.getDate() + 1);
    }

    container.innerHTML = '';
    container.appendChild(grid);
}

function renderStats() {
    const streak = calculateStreak();
    const weekCount = getWeekEntryCount();

    const streakEl = document.getElementById('streakDisplay');
    const weekEl = document.getElementById('weekCountDisplay');
    if (streakEl) {
        streakEl.textContent = t('dayStreak', { n: streak });
    }
    if (weekEl) {
        weekEl.textContent = t('thisWeek', { n: weekCount });
    }
    renderHeatmap();
}

function toggleStats() {
    const section = document.getElementById('statsSection');
    if (!section) return;
    const isOpen = section.classList.toggle('open');
    safeStorage.set('statsOpen', isOpen ? 'true' : 'false');
}

function initStats() {
    const section = document.getElementById('statsSection');
    if (!section) return;
    const wasOpen = safeStorage.get('statsOpen');
    // Default to open on first use
    if (wasOpen === null || wasOpen === 'true') {
        section.classList.add('open');
    }
    renderStats();
}

// ── External link handler ─────────────────────────────────
// Force all external links to open in system browser, not inside the PWA
function initExternalLinkHandler() {
    document.addEventListener('click', e => {
        const a = e.target.closest('a[href]');
        if (!a) return;
        const href = a.href;
        if (!href || href.startsWith('javascript:') || href.startsWith('#') || href.startsWith('blob:')) return;
        try {
            const linkUrl = new URL(href, location.href);
            if (linkUrl.origin !== location.origin) {
                // External link: force system browser via window.open
                e.preventDefault();
                window.open(href, '_system') || window.open(href, '_blank');
            }
        } catch(ex) {}
    });
}


// ═══════════════════════════════════════════════════════════
// TICKED v2 — Enhanced with Processes, Color Palette, Swipe Actions
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY    = 'ticked_store';
const SCHEMA_VERSION = 8;
const DEFAULT_PALETTE = ['#05004d', '#002e0d', '#2b0026', '#363506', '#3b0000'];

// ── Tunable constants ────────────────────────────────────
const SWIPE_THRESHOLD        = 90;
const CONFIRM_AUTO_CANCEL_MS = 4000;
const TOAST_DURATION_MS      = 2800;
const SEARCH_DEBOUNCE_MS     = 150;
const REMINDER_MAX_DELAY_MS  = 24 * 60 * 60 * 1000;

// ── Safe localStorage wrapper ─────────────────────────────
const safeStorage = {
    get(key) {
        try { return localStorage.getItem(key); }
        catch { return null; }
    },
    set(key, value) {
        try { localStorage.setItem(key, value); return true; }
        catch (e) {
            showToast(t('storageFull'), true);
            return false;
        }
    },
    remove(key) {
        try { localStorage.removeItem(key); } catch {}
    }
};

// ── UUID generator ────────────────────────────────────────
function uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

// ── State ─────────────────────────────────────────────────
let state = {
    entries:          [],       // Tasks
    processes:        [],       // Processes
    palette:          [...DEFAULT_PALETTE],
    activeTab:        'tasks',
    // Tasks tab filters/sort
    activeTypeFilter: 'all',
    activeTagFilter:  '',
    sortField:        'time',
    sortDir:          'desc',
    currentView:      'list',
    // Processes tab filters/sort
    procActiveTypeFilter: 'all',
    procActiveTagFilter:  '',
    procSortField:        'time',
    procSortDir:          'desc',
};
let _gdriveClientId = '';

let _renderScheduled = false;

function setState(patch) {
    Object.assign(state, patch);
    scheduleRender();
    updateAppBadge();
}

function scheduleRender() {
    if (_renderScheduled) return;
    _renderScheduled = true;
    requestAnimationFrame(() => {
        _renderScheduled = false;
        render();
    });
}

// ── Overdue helper ───────────────────────────────────────
function isOverdue(p) {
    const cpIdx = p.currentCheckpoint ?? 0;
    const cps = p.checkpoints || [];
    const cp = cps[cpIdx];
    if (!cp || !cp.dueDate) return false;
    return new Date(cp.dueDate + 'T23:59:59') < new Date();
}

function getOverdueCheckpointCount() {
    return state.processes.reduce((sum, p) => sum + (isOverdue(p) ? 1 : 0), 0);
}

async function updateAppBadge() {
    try {
        const overdue = getOverdueCheckpointCount();
        if (navigator.setAppBadge && navigator.clearAppBadge) {
            if (overdue > 0) await navigator.setAppBadge(overdue);
            else await navigator.clearAppBadge();
        }
    } catch (_) {}
}

// ── DOM refs ──────────────────────────────────────────────
const entryList       = document.getElementById('entryList');
const processList     = document.getElementById('processList');
const inputText       = document.getElementById('inputText');
const procInputText   = document.getElementById('procInputText');
const emptyState      = document.getElementById('emptyState');
const procEmptyState  = document.getElementById('procEmptyState');
const countBadge      = document.getElementById('countBadge');
const clearBtn        = document.getElementById('clearBtn');
const procClearBtn    = document.getElementById('procClearBtn');
const searchInput     = document.getElementById('searchInput');
const procSearchInput = document.getElementById('procSearchInput');
const filterDate      = document.getElementById('filterDate');
const procFilterDate  = document.getElementById('procFilterDate');
const resultsCount    = document.getElementById('resultsCount');
const procResultsCount= document.getElementById('procResultsCount');
const filterActiveDot = document.getElementById('filterActiveDot');
const procFilterActiveDot = document.getElementById('procFilterActiveDot');
const customPanel     = document.getElementById('customPanel');
const customTriggerBtn= document.getElementById('customTriggerBtn');
const timelineView    = document.getElementById('timelineView');
const tasksLazyLoader = document.getElementById('tasksLazyLoader');
const procLazyLoader  = document.getElementById('procLazyLoader');
const procTemplateSelect = document.getElementById('procTemplateSelect');
const gdriveClientInput = document.getElementById('gdriveClientInput');

// ── Schema migration ──────────────────────────────────────
const migrations = {
    2(store) {
        return {
            ...store,
            version: 2,
            entries: (store.entries || []).map(e => ({ ...e, custom: e.custom ?? false }))
        };
    },
    3(store) {
        return {
            ...store,
            version: 3,
            entries: (store.entries || []).map(e => {
                if (e.isoDate) return e;
                const parsed = new Date(e.timestamp || '');
                return {
                    id:      e.id || uuid(),
                    isoDate: isNaN(parsed) ? new Date().toISOString() : parsed.toISOString(),
                    text:    e.text  || '',
                    custom:  !!e.custom,
                };
            })
        };
    },
    4(store) {
        return {
            ...store,
            version: 4,
            palette: store.palette || [...DEFAULT_PALETTE],
            entries: (store.entries || []).map(e => ({
                ...e,
                bgColor: e.bgColor || '',
                borderColor: e.borderColor || '',
                tags: e.tags || (e.custom ? ['custom'] : []),
            })),
            processes: (store.processes || []).map(p => ({
                ...p,
                bgColor: p.bgColor || '',
                borderColor: p.borderColor || '',
                tags: p.tags || [],
                currentStage: p.currentStage ?? 0,
                stages: p.stages || ['To Do','In Progress','Waiting','Review','Done'].map(() => ({ comment: '', dueDate: '' })),
            })),
        };
    },
    5(store) {
        // Convert old fixed stages to dynamic checkpoints
        const OLD_STAGE_NAMES = ['To Do', 'In Progress', 'Waiting', 'Review', 'Done'];
        return {
            ...store,
            version: 5,
            processes: (store.processes || []).map(p => {
                // Already migrated?
                if (p.checkpoints) return p;
                const stages = p.stages || OLD_STAGE_NAMES.map(() => ({ comment: '', dueDate: '' }));
                const currentStage = p.currentStage ?? 0;
                const checkpoints = stages.map((s, i) => ({
                    id: uuid(),
                    name: OLD_STAGE_NAMES[i] || `Stage ${i + 1}`,
                    timestamp: i === 0 ? p.isoDate : (i <= currentStage ? new Date(new Date(p.isoDate).getTime() + i * 60000).toISOString() : ''),
                    comment: s.comment || '',
                    dueDate: s.dueDate || '',
                    remindAt: '',
                    notify: false,
                }));
                const { stages: _s, currentStage: _cs, ...rest } = p;
                return { ...rest, checkpoints, currentCheckpoint: currentStage };
            }),
        };
    },
    6(store) {
        return {
            ...store,
            version: 6,
            processes: (store.processes || []).map(p => ({
                ...p,
                checkpoints: (p.checkpoints || []).map(cp => ({
                    ...cp,
                    remindAt: cp.remindAt || '',
                })),
            })),
        };
    },
    7(store) {
        return {
            ...store,
            version: 7,
            processes: (store.processes || []).map(p => ({
                ...p,
                completedAt: p.completedAt || '',
            })),
        };
    },
    8(store) {
        // v8 marks the cutover from localStorage to IndexedDB for the main
        // payload. No field shape changes — the actual data relocation
        // happens inside load().
        return { ...store, version: 8 };
    }
};

function migrate(raw) {
    let store = raw;
    for (let v = (store.version || 1) + 1; v <= SCHEMA_VERSION; v++) {
        if (migrations[v]) store = migrations[v](store);
    }
    return store;
}

// ── Persistence ───────────────────────────────────────────
// Main payload lives in IndexedDB (~GB quota). Callers keep calling save()
// the same way they always have; the actual write is a debounced async
// flush. saveNow() forces an immediate flush and is used on unload and
// after large imports. If IDB is unavailable or a write fails, we fall
// back to localStorage so the app never silently drops data.
let _saveTimer = null;
let _idbBroken = false;
const SAVE_DEBOUNCE_MS = 200;

function _buildPayload() {
    return {
        version:   SCHEMA_VERSION,
        savedAt:   new Date().toISOString(),
        palette:   state.palette,
        entries:   state.entries,
        processes: state.processes,
        gdriveClientId: _gdriveClientId || '',
    };
}

async function _flushSave() {
    const payload = _buildPayload();
    if (_idbBroken || !idbStorage.available()) {
        safeStorage.set(STORAGE_KEY, JSON.stringify(payload));
        return;
    }
    try {
        await idbStorage.set(STORAGE_KEY, payload);
    } catch (e) {
        const ok = safeStorage.set(STORAGE_KEY, JSON.stringify(payload));
        if (ok) showToast(t('storageDegraded'), true);
        _idbBroken = true;
    }
}

function save() {
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => { _saveTimer = null; _flushSave(); }, SAVE_DEBOUNCE_MS);
}

async function saveNow() {
    if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
    await _flushSave();
}

async function load() {
    let loaded = { entries: [], processes: [], palette: [...DEFAULT_PALETTE] };

    try {
        let parsed = null;

        // 1) Preferred: IndexedDB (v8+)
        if (idbStorage.available()) {
            try { parsed = await idbStorage.get(STORAGE_KEY); }
            catch { parsed = null; }
        }

        // 2) One-time migration from localStorage['ticked_store'] (v1–v7)
        if (!parsed) {
            const raw = safeStorage.get(STORAGE_KEY);
            if (raw) {
                parsed = JSON.parse(raw);
                if (idbStorage.available()) {
                    try {
                        await idbStorage.set(STORAGE_KEY, parsed);
                        safeStorage.remove(STORAGE_KEY);
                    } catch { /* keep LS copy if IDB write fails */ }
                }
            }
        }

        // 3) Ancient legacy keys (pre-schema)
        if (!parsed) {
            const legacyRaw = safeStorage.get('tickedEntries_v2') || safeStorage.get('tickedEntries');
            if (legacyRaw) {
                parsed = { version: 1, entries: JSON.parse(legacyRaw) };
                safeStorage.remove('tickedEntries_v2');
                safeStorage.remove('tickedEntries');
            }
        }

        if (parsed) {
            const migrated = migrate(parsed);
            loaded.entries   = migrated.entries   || [];
            loaded.processes = migrated.processes || [];
            loaded.palette   = migrated.palette   || [...DEFAULT_PALETTE];
            if (migrated.gdriveClientId) {
                _gdriveClientId = String(migrated.gdriveClientId).trim();
                safeStorage.set('gdriveClientId', _gdriveClientId);
            }
        }
    } catch {
        showToast(t('dataUnreadable'), true);
    }

    setState({
        entries:   loaded.entries,
        processes: loaded.processes,
        palette:   loaded.palette,
    });
    _gdriveClientId = _gdriveClientId || (safeStorage.get('gdriveClientId') || '').trim();
    if (gdriveClientInput) gdriveClientInput.value = _gdriveClientId;
    initPalette();
    save();
}

// ── Timestamp helpers ─────────────────────────────────────
function todayDateString() {
    return new Date().toLocaleDateString('en-CA');
}

function isoToDateStr(iso) {
    try { return new Date(iso).toLocaleDateString('en-CA'); }
    catch { return ''; }
}

function isoToDisplayDate(iso) {
    try {
        return new Date(iso).toLocaleString('en-US', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        });
    } catch { return iso; }
}

function isoToTimeStr(iso) {
    try {
        return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch { return ''; }
}

function formatDayLabel(dateStr) {
    const today     = todayDateString();
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
    if (dateStr === today)     return t('today');
    if (dateStr === yesterday) return t('yesterday');
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function buildIso(dateStr, timeStr) {
    const [y, mo, d] = dateStr.split('-').map(Number);
    const [h, mi]    = timeStr.split(':').map(Number);
    return new Date(y, mo - 1, d, h, mi, 0).toISOString();
}

// ── Utilities ─────────────────────────────────────────────
function showToast(msg, isError = false) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast' + (isError ? ' error' : '');
    void t.offsetWidth;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), TOAST_DURATION_MS);
}

function debounce(fn, ms) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), ms);
    };
}

// ── Palette ───────────────────────────────────────────────
function initPalette() {
    const container = document.getElementById('paletteSwatches');
    container.innerHTML = '';
    state.palette.forEach((color, i) => {
        const swatch = document.createElement('div');
        swatch.className = 'palette-swatch';
        swatch.style.background = color;
        const inp = document.createElement('input');
        inp.type = 'color';
        inp.value = color;
        inp.addEventListener('input', e => {
            state.palette[i] = e.target.value;
            swatch.style.background = e.target.value;
            save();
        });
        swatch.appendChild(inp);
        container.appendChild(swatch);
    });
}

// ── Tab switching ─────────────────────────────────────────
function switchTab(tab) {
    state.activeTab = tab;
    document.getElementById('tabTasksBtn').classList.toggle('active', tab === 'tasks');
    document.getElementById('tabProcessesBtn').classList.toggle('active', tab === 'processes');
    document.getElementById('panelTasks').classList.toggle('active', tab === 'tasks');
    document.getElementById('panelProcesses').classList.toggle('active', tab === 'processes');
    render();
}

// ── Tag helpers ──────────────────────────────────────────
function parseTagInput(inputId) {
    const el = document.getElementById(inputId);
    if (!el) return [];
    const raw = el.value.trim();
    if (!raw) return [];
    return raw.split(',')
        .map(t => t.trim().toLowerCase().replace(/^#/, ''))
        .filter(t => t.length > 0 && t !== 'edited' && t !== 'custom');
}

function clearTagInput(inputId) {
    const el = document.getElementById(inputId);
    if (el) el.value = '';
}

function getUserTags(tags) {
    return (tags || []).filter(t => t !== 'edited' && t !== 'custom');
}

function getAllUserTags(tab) {
    const items = tab === 'tasks' ? state.entries : state.processes;
    const tags = new Set();
    items.forEach(item => getUserTags(item.tags).forEach(t => tags.add(t)));
    return [...tags].sort();
}


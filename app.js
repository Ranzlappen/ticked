// ═══════════════════════════════════════════════════════════
// TICKED v2 — Enhanced with Processes, Color Palette, Swipe Actions
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY    = 'ticked_store';
const SCHEMA_VERSION = 6;
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
            showToast('Storage full — data may not persist.', true);
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
    sortField:        'time',
    sortDir:          'desc',
    currentView:      'list',
    // Processes tab filters/sort
    procActiveTypeFilter: 'all',
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
function save() {
    const payload = {
        version:   SCHEMA_VERSION,
        savedAt:   new Date().toISOString(),
        palette:   state.palette,
        entries:   state.entries,
        processes: state.processes,
        gdriveClientId: _gdriveClientId || '',
    };
    safeStorage.set(STORAGE_KEY, JSON.stringify(payload));
}

function load() {
    let loaded = { entries: [], processes: [], palette: [...DEFAULT_PALETTE] };

    try {
        const raw = safeStorage.get(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            const migrated = migrate(parsed);
            loaded.entries   = migrated.entries   || [];
            loaded.processes = migrated.processes || [];
            loaded.palette   = migrated.palette   || [...DEFAULT_PALETTE];
            if (migrated.gdriveClientId) {
                _gdriveClientId = String(migrated.gdriveClientId).trim();
                safeStorage.set('gdriveClientId', _gdriveClientId);
            }
        } else {
            const legacy2 = safeStorage.get('tickedEntries_v2');
            const legacy1 = safeStorage.get('tickedEntries');
            const legacyRaw = legacy2 || legacy1;
            if (legacyRaw) {
                const arr = JSON.parse(legacyRaw);
                const fakeStore = { version: 1, entries: arr };
                const migrated = migrate(fakeStore);
                loaded.entries = migrated.entries || [];
                safeStorage.remove('tickedEntries_v2');
                safeStorage.remove('tickedEntries');
            }
        }
    } catch {
        showToast('Log data was unreadable — starting fresh.', true);
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
    if (dateStr === today)     return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
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

// ── Add entries ───────────────────────────────────────────
function addEntry() {
    const text   = inputText.value.trim();
    const entry  = {
        id: uuid(), isoDate: new Date().toISOString(), text, custom: false,
        bgColor: '', borderColor: '', tags: []
    };
    setState({ entries: [entry, ...state.entries] });
    save();
    inputText.value = '';
}

function addCustomEntry() {
    const text    = inputText.value.trim();
    const dateVal = document.getElementById('customDate').value;
    const timeVal = document.getElementById('customTime').value;
    if (!dateVal || !timeVal) { showToast('Please set both date and time.', true); return; }

    const entry  = {
        id: uuid(), isoDate: buildIso(dateVal, timeVal), text, custom: true,
        bgColor: '', borderColor: '', tags: ['custom']
    };
    const sorted = [...state.entries, entry].sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate));
    setState({ entries: sorted });
    save();
    inputText.value = '';
    toggleCustomPanel();
    showToast('✦ Custom entry added');
}

function deleteEntry(id) {
    setState({ entries: state.entries.filter(e => e.id !== id) });
    save();
}

// ── Add process ───────────────────────────────────────────
const PROCESS_TEMPLATES = {
    dailyRoutine: {
        baseName: 'Daily Routine',
        checkpoints: ['Plan day', 'Focus block', 'Admin tasks', 'Wrap-up']
    },
    contentCreation: {
        baseName: 'Content Creation',
        checkpoints: ['Research', 'Outline', 'Draft', 'Edit', 'Publish']
    },
    bugFix: {
        baseName: 'Bug Fix',
        checkpoints: ['Reproduce', 'Root cause', 'Implement fix', 'Test', 'Deploy']
    },
};

function addProcess() {
    const text = procInputText.value.trim();
    if (!text) { showToast('Please enter a process name.', true); return; }
    const now = new Date().toISOString();
    const proc = {
        id: uuid(),
        isoDate: now,
        text,
        custom: false,
        bgColor: '',
        borderColor: '',
        tags: [],
        currentCheckpoint: 0,
        checkpoints: [{
            id: uuid(),
            name: 'Start',
            timestamp: now,
            comment: '',
            dueDate: '',
            remindAt: '',
            notify: false,
        }],
    };
    setState({ processes: [proc, ...state.processes] });
    save();
    procInputText.value = '';
}

function addProcessFromTemplate(templateKey) {
    if (!templateKey || !PROCESS_TEMPLATES[templateKey]) return;
    const tpl = PROCESS_TEMPLATES[templateKey];
    const count = state.processes.filter(p => (p.text || '').startsWith(tpl.baseName)).length + 1;
    const now = new Date().toISOString();
    const processName = `${tpl.baseName} #${count}`;
    const checkpoints = tpl.checkpoints.map((name, idx) => ({
        id: uuid(),
        name,
        timestamp: idx === 0 ? now : '',
        comment: '',
        dueDate: '',
        remindAt: '',
        notify: false,
    }));

    const proc = {
        id: uuid(),
        isoDate: now,
        text: processName,
        custom: false,
        bgColor: '',
        borderColor: '',
        tags: [],
        currentCheckpoint: 0,
        checkpoints,
    };

    setState({ processes: [proc, ...state.processes] });
    save();
    if (procTemplateSelect) procTemplateSelect.value = '';
    showToast(`Template added: ${processName}`);
}

function deleteProcess(id) {
    setState({ processes: state.processes.filter(p => p.id !== id) });
    save();
}

function updateProcessStage(id, cpIdx) {
    const procs = state.processes.map(p => {
        if (p.id === id) return { ...p, currentCheckpoint: cpIdx };
        return p;
    });
    setState({ processes: procs });
    save();
}

function addCheckpointToProcess(procId) {
    const procs = state.processes.map(p => {
        if (p.id !== procId) return p;
        const cps = [...p.checkpoints];
        cps.push({
            id: uuid(),
            name: `Checkpoint ${cps.length + 1}`,
            timestamp: new Date().toISOString(),
            comment: '',
            dueDate: '',
            remindAt: '',
            notify: false,
        });
        return { ...p, checkpoints: cps };
    });
    setState({ processes: procs });
    save();
    showToast('Checkpoint added ✓');
}

// ── Filter / Sort ─────────────────────────────────────────
function getFiltered(tab) {
    if (tab === 'tasks') {
        const query   = searchInput.value.trim().toLowerCase();
        const dateFil = filterDate.value;
        const { entries, activeTypeFilter } = state;

        return entries.filter(e => {
            if (activeTypeFilter === 'auto'   && e.custom)  return false;
            if (activeTypeFilter === 'custom' && !e.custom) return false;
            if (activeTypeFilter === 'edited' && !(e.tags && e.tags.includes('edited'))) return false;
            if (dateFil && isoToDateStr(e.isoDate) !== dateFil) return false;
            if (query) {
                const display = isoToDisplayDate(e.isoDate).toLowerCase();
                const tagStr = (e.tags || []).join(' ').toLowerCase();
                if (!(e.text.toLowerCase().includes(query) || display.includes(query) || tagStr.includes(query))) return false;
            }
            return true;
        });
    } else {
        const query   = procSearchInput.value.trim().toLowerCase();
        const dateFil = procFilterDate.value;
        const { processes, procActiveTypeFilter } = state;

        return processes.filter(p => {
            if (procActiveTypeFilter === 'edited' && !(p.tags && p.tags.includes('edited'))) return false;
            if (procActiveTypeFilter === 'overdue' && !isOverdue(p)) return false;
            if (dateFil && isoToDateStr(p.isoDate) !== dateFil) return false;
            if (query) {
                const display = isoToDisplayDate(p.isoDate).toLowerCase();
                const tagStr = (p.tags || []).join(' ').toLowerCase();
                const textMatch = p.text.toLowerCase().includes(query) || display.includes(query) || tagStr.includes(query);
                const cpMatch = (p.checkpoints || p.stages || []).some(cp => ((cp.name || cp.comment || '')).toLowerCase().includes(query));
                if (!textMatch && !cpMatch) return false;
            }
            return true;
        });
    }
}

function getSorted(entries, tab) {
    const sortField = tab === 'tasks' ? state.sortField : state.procSortField;
    const sortDir   = tab === 'tasks' ? state.sortDir   : state.procSortDir;
    return [...entries].sort((a, b) => {
        const va = sortField === 'time' ? new Date(a.isoDate).getTime() : (a.text || '').toLowerCase();
        const vb = sortField === 'time' ? new Date(b.isoDate).getTime() : (b.text || '').toLowerCase();
        if (va < vb) return sortDir === 'desc' ?  1 : -1;
        if (va > vb) return sortDir === 'desc' ? -1 :  1;
        return 0;
    });
}

const LAZY_BATCH_SIZE = 40;
const lazyRender = {
    tasks: { visibleCount: LAZY_BATCH_SIZE, lastSig: '', observer: null },
    processes: { visibleCount: LAZY_BATCH_SIZE, lastSig: '', observer: null }
};

function getLazyLoader(tab) {
    return tab === 'tasks' ? tasksLazyLoader : procLazyLoader;
}

function ensureLazyObserver(tab) {
    if (!('IntersectionObserver' in window)) return;
    const lazy = lazyRender[tab];
    if (lazy.observer) return;
    const loader = getLazyLoader(tab);
    lazy.observer = new IntersectionObserver(entries => {
        if (!entries.some(e => e.isIntersecting)) return;
        const max = lazy.currentTotal || 0;
        if (lazy.visibleCount >= max) return;
        lazy.visibleCount = Math.min(lazy.visibleCount + LAZY_BATCH_SIZE, max);
        render();
    }, { root: null, rootMargin: '250px 0px', threshold: 0.01 });
    lazy.observer.observe(loader);
}

function updateLazyState(tab, sortedEntries) {
    const lazy = lazyRender[tab];
    const sig = sortedEntries.map(item => item.id).join('|');
    if (lazy.lastSig !== sig) {
        lazy.lastSig = sig;
        lazy.visibleCount = LAZY_BATCH_SIZE;
    }
    lazy.currentTotal = sortedEntries.length;

    const loader = getLazyLoader(tab);
    loader.style.display = sortedEntries.length > 0 ? '' : 'none';
    loader.classList.toggle('visible', lazy.visibleCount < sortedEntries.length);

    ensureLazyObserver(tab);
    return sortedEntries.slice(0, Math.min(lazy.visibleCount, sortedEntries.length));
}

function lazyFallbackHandler() {
    for (const tab of ['tasks', 'processes']) {
        const lazy = lazyRender[tab];
        if (lazy.observer) continue;
        if (!lazy.currentTotal || lazy.visibleCount >= lazy.currentTotal) continue;
        const loader = getLazyLoader(tab);
        const rect = loader.getBoundingClientRect();
        if (rect.top < window.innerHeight + 280) {
            lazy.visibleCount = Math.min(lazy.visibleCount + LAZY_BATCH_SIZE, lazy.currentTotal);
            render();
            return;
        }
    }
}

window.addEventListener('scroll', lazyFallbackHandler, { passive: true });
window.addEventListener('resize', lazyFallbackHandler, { passive: true });

// ── Keyed DOM diffing (tasks) ─────────────────────────────
const _listKeys = new Map();

function renderListView(filtered, today) {
    const newIds = new Set(filtered.map(e => e.id));

    for (const [id, nodes] of _listKeys) {
        if (!newIds.has(id)) {
            nodes.wrap.remove();
            _listKeys.delete(id);
        }
    }

    filtered.forEach((entry, idx) => {
        const displayDate = isoToDateStr(entry.isoDate);
        const isToday     = displayDate === today;
        const displayTs   = isoToDisplayDate(entry.isoDate);
        const tagsKey     = (entry.tags || []).join(',');
        const bodyKey     = `${entry.text}|${displayTs}|${entry.custom}|${isToday}|${entry.bgColor}|${entry.borderColor}|${tagsKey}`;

        if (_listKeys.has(entry.id)) {
            const cached = _listKeys.get(entry.id);
            if (cached.bodyKey !== bodyKey) {
                updateEntryNode(cached.card, entry, isToday, displayTs);
                cached.bodyKey = bodyKey;
            }
            const currentNodes = [...entryList.children];
            if (currentNodes[idx] !== cached.wrap) {
                entryList.insertBefore(cached.wrap, currentNodes[idx] || null);
            }
        } else {
            const { wrap, card } = createEntryNode(entry, isToday, displayTs, 'tasks');
            const currentNodes   = [...entryList.children];
            entryList.insertBefore(wrap, currentNodes[idx] || null);
            _listKeys.set(entry.id, { wrap, card, bodyKey });
        }
    });
}

// ── Keyed DOM diffing (processes) ─────────────────────────
const _procKeys = new Map();

function renderProcessListView(filtered, today) {
    const newIds = new Set(filtered.map(p => p.id));

    for (const [id, nodes] of _procKeys) {
        if (!newIds.has(id)) {
            nodes.wrap.remove();
            _procKeys.delete(id);
        }
    }

    filtered.forEach((proc, idx) => {
        const displayDate = isoToDateStr(proc.isoDate);
        const isToday     = displayDate === today;
        const displayTs   = isoToDisplayDate(proc.isoDate);
        const tagsKey     = (proc.tags || []).join(',');
        const bodyKey     = `${proc.text}|${displayTs}|${isToday}|${proc.bgColor}|${proc.borderColor}|${tagsKey}|${proc.currentCheckpoint}|${JSON.stringify(proc.checkpoints)}`;

        if (_procKeys.has(proc.id)) {
            const cached = _procKeys.get(proc.id);
            if (cached.bodyKey !== bodyKey) {
                updateProcessNode(cached.card, proc, isToday, displayTs);
                cached.bodyKey = bodyKey;
            }
            const currentNodes = [...processList.children];
            if (currentNodes[idx] !== cached.wrap) {
                processList.insertBefore(cached.wrap, currentNodes[idx] || null);
            }
        } else {
            const { wrap, card } = createEntryNode(proc, isToday, displayTs, 'processes');
            const currentNodes   = [...processList.children];
            processList.insertBefore(wrap, currentNodes[idx] || null);
            _procKeys.set(proc.id, { wrap, card, bodyKey });
        }
    });
}

function createEntryNode(entry, isToday, displayTs, tab) {
    const wrap = document.createElement('li');
    wrap.className = 'entry-wrap';

    // Delete zone (left swipe)
    const zone = document.createElement('div');
    zone.className = 'entry-delete-zone';
    zone.innerHTML = `<svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`;

    // Confirm-delete overlay (appears on top of card after swipe threshold)
    const confirmOverlay = document.createElement('div');
    confirmOverlay.className = 'confirm-overlay';
    confirmOverlay.innerHTML = `
        <button class="confirm-delete-btn">Delete</button>
        <button class="confirm-cancel-btn">Cancel</button>
        <div class="confirm-timer-bar"></div>
    `;

    // Action zone (right swipe)
    const actionZone = document.createElement('div');
    actionZone.className = 'entry-action-zone';
    actionZone.innerHTML = `<svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="3" r="1.5" fill="currentColor"/>
        <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
        <circle cx="8" cy="13" r="1.5" fill="currentColor"/>
    </svg>`;

    const card = document.createElement('div');
    if (tab === 'processes') {
        updateProcessNode(card, entry, isToday, displayTs);
    } else {
        updateEntryNode(card, entry, isToday, displayTs);
    }

    wrap.appendChild(zone);
    wrap.appendChild(actionZone);
    wrap.appendChild(card);
    wrap.appendChild(confirmOverlay);

    const deleteAction = tab === 'tasks'
        ? () => deleteEntry(entry.id)
        : () => deleteProcess(entry.id);

    const swipeRightAction = () => openActionSheet(entry.id, tab);

    initSwipe(wrap, card, confirmOverlay, deleteAction, swipeRightAction);
    return { wrap, card };
}

function updateEntryNode(card, entry, isToday, displayTs) {
    const hasEdited = entry.tags && entry.tags.includes('edited');
    card.className = 'entry-item'
        + (isToday       ? ' today'        : '')
        + (entry.custom  ? ' custom-entry' : '');

    // Apply custom colors
    if (entry.bgColor) {
        card.style.background = entry.bgColor;
    } else {
        card.style.background = '';
    }
    if (entry.borderColor) {
        card.style.borderColor = entry.borderColor;
        if (entry.custom) card.style.borderLeftColor = entry.borderColor;
    } else {
        card.style.borderColor = '';
        card.style.borderLeftColor = '';
    }

    card.innerHTML = '';

    const dot = document.createElement('div');
    dot.className = 'entry-dot';

    const body = document.createElement('div');
    body.className = 'entry-body';

    const textEl = document.createElement('div');
    textEl.className = 'entry-text' + (entry.text ? '' : ' no-text');

    const textSpan = document.createElement('span');
    textSpan.textContent = entry.text || '(no text)';
    textEl.appendChild(textSpan);

    if (entry.custom) {
        const badge = document.createElement('span');
        badge.className = 'custom-badge';
        badge.textContent = 'custom';
        textEl.appendChild(badge);
    }

    if (hasEdited) {
        const badge = document.createElement('span');
        badge.className = 'edited-badge';
        badge.textContent = 'edited';
        textEl.appendChild(badge);
    }

    const tsEl = document.createElement('div');
    tsEl.className = 'entry-ts';
    tsEl.textContent = displayTs;

    body.appendChild(textEl);
    body.appendChild(tsEl);
    card.appendChild(dot);
    card.appendChild(body);

    // Swipe hint indicator
    const hint = document.createElement('div');
    hint.className = 'swipe-hint';
    hint.innerHTML = '<svg width="14" height="10" viewBox="0 0 14 10" fill="none"><path d="M1 5h12M3 1L1 5l2 4M11 1l2 4-2 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    card.appendChild(hint);
}

function updateProcessNode(card, proc, isToday, displayTs) {
    const hasEdited = proc.tags && proc.tags.includes('edited');
    card.className = 'entry-item' + (isToday ? ' today' : '');

    if (proc.bgColor) card.style.background = proc.bgColor;
    else card.style.background = '';
    if (proc.borderColor) card.style.borderColor = proc.borderColor;
    else { card.style.borderColor = ''; card.style.borderLeftColor = ''; }

    card.innerHTML = '';

    const dot = document.createElement('div');
    dot.className = 'entry-dot';

    const body = document.createElement('div');
    body.className = 'entry-body';

    const textEl = document.createElement('div');
    textEl.className = 'entry-text';
    const textSpan = document.createElement('span');
    textSpan.textContent = proc.text || '(no text)';
    textEl.appendChild(textSpan);

    if (hasEdited) {
        const badge = document.createElement('span');
        badge.className = 'edited-badge';
        badge.textContent = 'edited';
        textEl.appendChild(badge);
    }

    const tsEl = document.createElement('div');
    tsEl.className = 'entry-ts';
    tsEl.textContent = displayTs;

    // Checkpoint timeline (horizontal, matching tl-* aesthetic)
    const cps = proc.checkpoints || [];
    const curCp = proc.currentCheckpoint ?? 0;

    const track = document.createElement('div');
    track.className = 'cp-track';

    const row = document.createElement('div');
    row.className = 'cp-row';

    if (cps.length > 1) {
        const spine = document.createElement('div');
        spine.className = 'cp-spine';
        row.appendChild(spine);
    }

    cps.forEach((cp, i) => {
        const node = document.createElement('div');
        node.className = 'cp-node'
            + (i === curCp ? ' active' : '')
            + (i < curCp ? ' completed' : '');

        const dotEl = document.createElement('div');
        dotEl.className = 'cp-dot'
            + (i === curCp ? ' active' : '')
            + (i < curCp ? ' completed' : '');

        const stemEl = document.createElement('div');
        stemEl.className = 'cp-stem'
            + (i <= curCp ? ' active' : '');

        const label = document.createElement('div');
        label.className = 'cp-label';
        label.textContent = cp.name || `CP ${i + 1}`;

        if (cp.dueDate) {
            const due = document.createElement('div');
            due.className = 'cp-due';
            const overdue = new Date(cp.dueDate + 'T23:59:59') < new Date();
            if (overdue) due.classList.add('overdue');
            due.textContent = cp.dueDate;
            node.appendChild(dotEl);
            node.appendChild(stemEl);
            node.appendChild(label);
            node.appendChild(due);
        } else {
            node.appendChild(dotEl);
            node.appendChild(stemEl);
            node.appendChild(label);
        }

        node.addEventListener('click', (e) => {
            e.stopPropagation();
            openCheckpointDetail(proc.id, i);
        });

        row.appendChild(node);
    });

    track.appendChild(row);

    // "+" quick-add button at end of row
    const addBtn = document.createElement('div');
    addBtn.className = 'cp-add-btn';
    addBtn.innerHTML = `<div class="cp-add-dot"><svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M4 1v6M1 4h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></div><div class="cp-add-label">add</div>`;
    addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        addCheckpointToProcess(proc.id);
    });
    row.appendChild(addBtn);

    // Enable mouse drag-scroll on checkpoint track (desktop)
    initDragScroll(track);

    body.appendChild(textEl);
    body.appendChild(tsEl);
    body.appendChild(track);
    card.appendChild(dot);
    card.appendChild(body);

    // Swipe hint indicator
    const hint = document.createElement('div');
    hint.className = 'swipe-hint';
    hint.innerHTML = '<svg width="14" height="10" viewBox="0 0 14 10" fill="none"><path d="M1 5h12M3 1L1 5l2 4M11 1l2 4-2 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    card.appendChild(hint);
}

// ── Swipe handling (left = delete, right = actions) ────────
// Active confirm-delete state tracker (only one at a time)
let _activeConfirm = null;

function cancelActiveConfirm() {
    if (!_activeConfirm) return;
    const { wrap, card, timer } = _activeConfirm;
    clearTimeout(timer);
    wrap.classList.remove('confirm-delete', 'swiping-left', 'will-delete');
    card.classList.add('snap-back');
    card.style.transform = '';
    card.style.opacity = '';
    card.style.removeProperty('--swipe-glow');
    // Reset the timer bar animation
    const timerBar = wrap.querySelector('.confirm-timer-bar');
    if (timerBar) { timerBar.style.animation = 'none'; void timerBar.offsetWidth; timerBar.style.animation = ''; }
    _activeConfirm = null;
}

function initSwipe(wrap, card, confirmOverlay, onDelete, onSwipeRight) {
    const THRESHOLD = SWIPE_THRESHOLD;
    let startX = null, startY = null, curX = 0, locked = false, direction = null;
    let hapticFiredLeft = false, hapticFiredRight = false;

    function doHaptic(ms) {
        try { if (navigator.vibrate) navigator.vibrate(ms); } catch(e) {}
    }

    // Wire up confirm overlay buttons (permanent listeners)
    const confirmBtn = confirmOverlay.querySelector('.confirm-delete-btn');
    const cancelBtn  = confirmOverlay.querySelector('.confirm-cancel-btn');

    confirmBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!wrap.classList.contains('confirm-delete')) return;
        doHaptic(12);
        if (_activeConfirm && _activeConfirm.timer) clearTimeout(_activeConfirm.timer);
        _activeConfirm = null;
        wrap.classList.remove('confirm-delete');
        card.classList.add('snap-delete');
        card.style.transform = 'translateX(-110%)';
        card.style.opacity = '0';
        setTimeout(onDelete, 220);
    });

    cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        cancelActiveConfirm();
    });

    // Also wire touchend for snappier mobile response
    confirmBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        confirmBtn.click();
    }, { passive: false });

    cancelBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        cancelBtn.click();
    }, { passive: false });

    function pointerStart(x, y) {
        // If this card is in confirm state, ignore new swipe gestures on it
        if (wrap.classList.contains('confirm-delete')) return;
        // Cancel any OTHER card's confirm state
        cancelActiveConfirm();
        startX = x; startY = y; curX = 0; locked = false; direction = null;
        hapticFiredLeft = false; hapticFiredRight = false;
        card.classList.remove('snap-back', 'snap-delete');
    }

    function pointerMove(x, y) {
        if (startX === null) return;
        const dx = x - startX, dy = y - startY;
        if (!locked) {
            if (Math.abs(dy) > Math.abs(dx) + 4) { startX = null; return; }
            if (Math.abs(dx) > 6) {
                locked = true;
                direction = dx > 0 ? 'right' : 'left';
            }
        }
        if (!locked) return;

        if (direction === 'left') {
            curX = Math.min(0, dx);
            card.style.transform = `translateX(${curX}px)`;
            const dist = -curX;
            const pastThreshold = dist >= THRESHOLD;
            wrap.classList.toggle('swiping-left',  dist > 10);
            wrap.classList.toggle('will-delete',   pastThreshold);
            wrap.classList.remove('swiping-right', 'will-action');
            // Dynamic glow intensity via CSS variable
            const glowIntensity = Math.min(1, dist / THRESHOLD);
            card.style.setProperty('--swipe-glow', glowIntensity.toFixed(2));
            // Haptic: fire once per threshold crossing
            if (pastThreshold && !hapticFiredLeft) {
                hapticFiredLeft = true;
                doHaptic(18);
            } else if (!pastThreshold) {
                hapticFiredLeft = false;
            }
        } else {
            curX = Math.max(0, dx);
            card.style.transform = `translateX(${curX}px)`;
            const pastThreshold = curX >= THRESHOLD;
            wrap.classList.toggle('swiping-right', curX > 10);
            wrap.classList.toggle('will-action',   pastThreshold);
            wrap.classList.remove('swiping-left', 'will-delete');
            if (pastThreshold && !hapticFiredRight) {
                hapticFiredRight = true;
                doHaptic(18);
            } else if (!pastThreshold) {
                hapticFiredRight = false;
            }
        }
    }

    function pointerEnd() {
        if (startX === null) return;
        startX = null;

        if (direction === 'left' && -curX >= THRESHOLD) {
            // ── Show confirm overlay ──
            doHaptic(12);
            // Snap card back to resting position
            card.classList.add('snap-back');
            card.style.transform = '';
            card.style.removeProperty('--swipe-glow');
            wrap.classList.remove('swiping-left', 'will-delete');
            // Show overlay
            wrap.classList.add('confirm-delete');
            // Reset timer bar animation
            const timerBar = wrap.querySelector('.confirm-timer-bar');
            if (timerBar) { timerBar.style.animation = 'none'; void timerBar.offsetWidth; timerBar.style.animation = ''; }

            // Auto-cancel after 4 seconds
            const autoTimer = setTimeout(() => cancelActiveConfirm(), CONFIRM_AUTO_CANCEL_MS);
            _activeConfirm = { wrap, card, timer: autoTimer };

        } else if (direction === 'right' && curX >= THRESHOLD) {
            doHaptic(12);
            card.classList.add('snap-back');
            card.style.transform = '';
            wrap.classList.remove('swiping-right', 'will-action');
            setTimeout(() => onSwipeRight(), 100);
        } else {
            card.classList.add('snap-back');
            card.style.transform = '';
            card.style.removeProperty('--swipe-glow');
            wrap.classList.remove('swiping-left', 'will-delete', 'swiping-right', 'will-action');
        }
        curX = 0;
        direction = null;
    }

    card.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        if (e.target.closest('.cp-track')) return; // let checkpoint track handle it
        pointerStart(e.clientX, e.clientY);
        const onMove = e => pointerMove(e.clientX, e.clientY);
        const onUp   = () => { pointerEnd(); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup',   onUp);
    });
    card.addEventListener('touchstart', e => {
        if (e.target.closest('.cp-track')) return; // let checkpoint track scroll
        const t = e.touches[0]; pointerStart(t.clientX, t.clientY);
    }, { passive: true });
    card.addEventListener('touchmove',  e => {
        if (e.target.closest('.cp-track')) return;
        const t = e.touches[0]; pointerMove(t.clientX, t.clientY); if (locked) e.preventDefault();
    }, { passive: false });
    card.addEventListener('touchend', e => {
        if (e.target.closest('.cp-track')) return;
        pointerEnd();
    }, { passive: true });
}

// ── Bottom Sheet / Action Menu ────────────────────────────
let _sheetEntryId = null;
let _sheetTab = null;

function openSheet() {
    document.getElementById('sheetOverlay').classList.add('open');
    document.body.classList.add('sheet-open');
}

function closeSheet() {
    document.getElementById('sheetOverlay').classList.remove('open');
    document.body.classList.remove('sheet-open');
    _sheetEntryId = null;
    _sheetTab = null;
}

// Sheet overlay click-to-close + swipe-down-to-dismiss
(function initSheetTouch() {
    const ov = document.getElementById('sheetOverlay');
    const sh = document.getElementById('sheetEl');
    const hd = document.getElementById('sheetHandle');

    // Click/tap overlay background to close
    ov.addEventListener('click', e => { if (e.target === ov) closeSheet(); });
    ov.addEventListener('touchend', e => { if (e.target === ov) closeSheet(); }, { passive: true });

    // Prevent touch passthrough on sheet body
    sh.addEventListener('click', e => e.stopPropagation());

    // Swipe-down on handle to dismiss
    let sy = null, cy = 0, dragging = false;
    function sStart(y) { sy = y; cy = 0; dragging = true; sh.style.transition = 'none'; }
    function sMove(y) { if (!dragging || sy === null) return; cy = Math.max(0, y - sy); sh.style.transform = `translateY(${cy}px)`; }
    function sEnd() {
        if (!dragging) return;
        dragging = false;
        sh.style.transition = '';
        if (cy > 80) { sh.style.transform = ''; closeSheet(); }
        else { sh.style.transform = ''; }
        sy = null; cy = 0;
    }
    hd.addEventListener('touchstart', e => { e.stopPropagation(); sStart(e.touches[0].clientY); }, { passive: true });
    hd.addEventListener('touchmove', e => { e.stopPropagation(); e.preventDefault(); sMove(e.touches[0].clientY); }, { passive: false });
    hd.addEventListener('touchend', e => { e.stopPropagation(); sEnd(); }, { passive: true });
    hd.addEventListener('mousedown', e => {
        sStart(e.clientY);
        const m = ev => sMove(ev.clientY);
        const u = () => { sEnd(); window.removeEventListener('mousemove', m); window.removeEventListener('mouseup', u); };
        window.addEventListener('mousemove', m);
        window.addEventListener('mouseup', u);
    });
})();

// Mobile keyboard: keep input visible above keyboard
document.addEventListener('focusin', e => {
    if (e.target.matches('input[type="text"],input[type="date"],input[type="time"],textarea')) {
        setTimeout(() => { e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 350);
    }
});

function openActionSheet(id, tab) {
    _sheetEntryId = id;
    _sheetTab = tab;
    const entry = tab === 'tasks'
        ? state.entries.find(e => e.id === id)
        : state.processes.find(p => p.id === id);
    if (!entry) return;

    document.getElementById('sheetTitle').textContent = 'Actions';
    const content = document.getElementById('sheetContent');
    content.innerHTML = '';

    const opts = document.createElement('div');
    opts.className = 'sheet-options';

    // Option 1: Set Background Color
    const opt1 = makeSheetOpt('🎨', 'Set Background', 'Choose from palette', () => {
        showColorPicker(id, tab, 'bg');
    });
    opts.appendChild(opt1);

    // Option 2: Set Border Color
    const opt2 = makeSheetOpt('🖌️', 'Set Border', 'Choose from palette', () => {
        showColorPicker(id, tab, 'border');
    });
    opts.appendChild(opt2);

    // Option 3: Change Time
    const opt3 = makeSheetOpt('🕐', 'Change Time', 'Edit timestamp + mark as edited', () => {
        showTimeEditor(id, tab);
    });
    opts.appendChild(opt3);

    // Option 4: Change Text
    const opt4 = makeSheetOpt('✏️', 'Change Text', 'Edit text + mark as edited', () => {
        showTextEditor(id, tab);
    });
    opts.appendChild(opt4);

    // Option 5: Add Checkpoint (processes only)
    if (tab === 'processes') {
        const opt5 = makeSheetOpt('➕', 'Add Checkpoint', 'Append a new checkpoint to this process', () => {
            addCheckpointToProcess(id);
            closeSheet();
        });
        opts.appendChild(opt5);
    }

    content.appendChild(opts);
    openSheet();
}

function makeSheetOpt(icon, title, desc, onClick) {
    const opt = document.createElement('div');
    opt.className = 'sheet-opt';
    opt.innerHTML = `
        <div class="sheet-opt-icon" style="background:var(--surface);border:1px solid var(--border);">${icon}</div>
        <div class="sheet-opt-text">
            <div class="sheet-opt-title">${title}</div>
            <div class="sheet-opt-desc">${desc}</div>
        </div>
    `;
    opt.addEventListener('click', onClick);
    return opt;
}

function showColorPicker(id, tab, mode) {
    const entry = tab === 'tasks'
        ? state.entries.find(e => e.id === id)
        : state.processes.find(p => p.id === id);
    if (!entry) return;

    document.getElementById('sheetTitle').textContent = mode === 'bg' ? 'Background Color' : 'Border Color';
    const content = document.getElementById('sheetContent');
    content.innerHTML = '';

    const sub = document.createElement('div');
    sub.className = 'sheet-sub-title';
    sub.textContent = 'Pick from palette or choose custom';
    content.appendChild(sub);

    const swatches = document.createElement('div');
    swatches.className = 'sheet-colors';

    let selected = mode === 'bg' ? (entry.bgColor || '') : (entry.borderColor || '');

    // "None" option
    const noneSwatch = document.createElement('div');
    noneSwatch.className = 'sheet-color-swatch' + (!selected ? ' selected' : '');
    noneSwatch.style.background = 'var(--surface2)';
    noneSwatch.style.position = 'relative';
    noneSwatch.innerHTML = '<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--text-muted);">✕</span>';
    noneSwatch.addEventListener('click', () => {
        selected = '';
        swatches.querySelectorAll('.sheet-color-swatch').forEach(s => s.classList.remove('selected'));
        noneSwatch.classList.add('selected');
    });
    swatches.appendChild(noneSwatch);

    state.palette.forEach(color => {
        const s = document.createElement('div');
        s.className = 'sheet-color-swatch' + (selected === color ? ' selected' : '');
        s.style.background = color;
        s.addEventListener('click', () => {
            selected = color;
            swatches.querySelectorAll('.sheet-color-swatch').forEach(sw => sw.classList.remove('selected'));
            s.classList.add('selected');
        });
        swatches.appendChild(s);
    });

    content.appendChild(swatches);

    const btnRow = document.createElement('div');
    btnRow.className = 'sheet-btn-row';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'sheet-btn secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', closeSheet);

    const applyBtn = document.createElement('button');
    applyBtn.className = 'sheet-btn primary';
    applyBtn.textContent = 'Apply';
    applyBtn.addEventListener('click', () => {
        applyColor(id, tab, mode, selected);
        closeSheet();
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(applyBtn);
    content.appendChild(btnRow);
}

function applyColor(id, tab, mode, color) {
    const key = tab === 'tasks' ? 'entries' : 'processes';
    const items = state[key].map(e => {
        if (e.id !== id) return e;
        const updated = { ...e };
        if (mode === 'bg') updated.bgColor = color;
        else updated.borderColor = color;
        return updated;
    });
    setState({ [key]: items });
    save();
    showToast('Color applied ✓');
}

function showTimeEditor(id, tab) {
    const entry = tab === 'tasks'
        ? state.entries.find(e => e.id === id)
        : state.processes.find(p => p.id === id);
    if (!entry) return;

    document.getElementById('sheetTitle').textContent = 'Change Time';
    const content = document.getElementById('sheetContent');
    content.innerHTML = '';

    const form = document.createElement('div');
    form.className = 'stage-detail-form';

    const d = new Date(entry.isoDate);
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.value = d.toLocaleDateString('en-CA');

    const timeInput = document.createElement('input');
    timeInput.type = 'time';
    timeInput.value = d.toTimeString().slice(0, 5);

    form.appendChild(dateInput);
    form.appendChild(timeInput);
    content.appendChild(form);

    const btnRow = document.createElement('div');
    btnRow.className = 'sheet-btn-row';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'sheet-btn secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', closeSheet);

    const applyBtn = document.createElement('button');
    applyBtn.className = 'sheet-btn primary';
    applyBtn.textContent = 'Save';
    applyBtn.addEventListener('click', () => {
        if (!dateInput.value || !timeInput.value) {
            showToast('Set both date and time.', true);
            return;
        }
        const key = tab === 'tasks' ? 'entries' : 'processes';
        const items = state[key].map(e => {
            if (e.id !== id) return e;
            const tags = [...(e.tags || [])];
            if (!tags.includes('edited')) tags.push('edited');
            return { ...e, isoDate: buildIso(dateInput.value, timeInput.value), tags };
        });
        setState({ [key]: items });
        save();
        closeSheet();
        showToast('Time updated ✓');
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(applyBtn);
    content.appendChild(btnRow);
}

function showTextEditor(id, tab) {
    const entry = tab === 'tasks'
        ? state.entries.find(e => e.id === id)
        : state.processes.find(p => p.id === id);
    if (!entry) return;

    document.getElementById('sheetTitle').textContent = 'Change Text';
    const content = document.getElementById('sheetContent');
    content.innerHTML = '';

    const form = document.createElement('div');
    form.className = 'stage-detail-form';

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.value = entry.text;
    textInput.placeholder = 'Enter text…';

    form.appendChild(textInput);
    content.appendChild(form);

    const btnRow = document.createElement('div');
    btnRow.className = 'sheet-btn-row';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'sheet-btn secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', closeSheet);

    const applyBtn = document.createElement('button');
    applyBtn.className = 'sheet-btn primary';
    applyBtn.textContent = 'Save';
    applyBtn.addEventListener('click', () => {
        const key = tab === 'tasks' ? 'entries' : 'processes';
        const items = state[key].map(e => {
            if (e.id !== id) return e;
            const tags = [...(e.tags || [])];
            if (!tags.includes('edited')) tags.push('edited');
            return { ...e, text: textInput.value.trim(), tags };
        });
        setState({ [key]: items });
        save();
        closeSheet();
        showToast('Text updated ✓');
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(applyBtn);
    content.appendChild(btnRow);

    setTimeout(() => textInput.focus(), 350);
}

// ── Checkpoint detail sheet ────────────────────────────────
function openCheckpointDetail(procId, cpIdx) {
    const proc = state.processes.find(p => p.id === procId);
    if (!proc) return;
    const cps = proc.checkpoints || [];
    const cp = cps[cpIdx];
    if (!cp) return;

    _sheetEntryId = procId;
    _sheetTab = 'processes';

    const curCp = proc.currentCheckpoint ?? 0;

    document.getElementById('sheetTitle').textContent = cp.name || `Checkpoint ${cpIdx + 1}`;
    const content = document.getElementById('sheetContent');
    content.innerHTML = '';

    // Status indicator
    const sub = document.createElement('div');
    sub.className = 'sheet-sub-title';
    sub.textContent = cpIdx === curCp
        ? '● Current checkpoint'
        : cpIdx < curCp ? '✓ Completed' : '○ Upcoming';
    content.appendChild(sub);

    const form = document.createElement('div');
    form.className = 'stage-detail-form';

    // Checkpoint name
    const nameLabel = document.createElement('div');
    nameLabel.className = 'sheet-sub-title';
    nameLabel.style.textAlign = 'left';
    nameLabel.textContent = 'Name';
    form.appendChild(nameLabel);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = cp.name || '';
    nameInput.placeholder = 'Checkpoint name…';
    form.appendChild(nameInput);

    // Comment
    const commentLabel = document.createElement('div');
    commentLabel.className = 'sheet-sub-title';
    commentLabel.style.textAlign = 'left';
    commentLabel.textContent = 'Comment / Note';
    form.appendChild(commentLabel);

    const textarea = document.createElement('textarea');
    textarea.value = cp.comment || '';
    textarea.placeholder = 'Add a note for this checkpoint…';
    form.appendChild(textarea);

    // Due date
    const dateLabel = document.createElement('div');
    dateLabel.className = 'sheet-sub-title';
    dateLabel.style.textAlign = 'left';
    dateLabel.textContent = 'Due Date';
    form.appendChild(dateLabel);

    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.value = cp.dueDate || '';
    form.appendChild(dateInput);

    const remindLabel = document.createElement('div');
    remindLabel.className = 'sheet-sub-title';
    remindLabel.style.textAlign = 'left';
    remindLabel.textContent = 'Reminder Time';
    form.appendChild(remindLabel);

    const remindInput = document.createElement('input');
    remindInput.type = 'datetime-local';
    remindInput.value = cp.remindAt || '';
    form.appendChild(remindInput);

    // Notify toggle
    const notifyRow = document.createElement('div');
    notifyRow.style.cssText = 'display:flex;align-items:center;gap:10px;margin-top:4px;';
    const notifyLabel = document.createElement('div');
    notifyLabel.className = 'sheet-sub-title';
    notifyLabel.style.cssText = 'text-align:left;margin:0;';
    notifyLabel.textContent = 'Enable reminder';
    const notifyToggle = document.createElement('input');
    notifyToggle.type = 'checkbox';
    notifyToggle.checked = !!cp.notify;
    notifyToggle.style.cssText = 'width:18px;height:18px;accent-color:var(--accent);cursor:pointer;';
    notifyRow.appendChild(notifyLabel);
    notifyRow.appendChild(notifyToggle);
    form.appendChild(notifyRow);

    content.appendChild(form);

    const btnRow = document.createElement('div');
    btnRow.className = 'sheet-btn-row';

    const jumpBtn = document.createElement('button');
    jumpBtn.className = 'sheet-btn secondary';
    jumpBtn.textContent = cpIdx === curCp ? 'Current' : 'Jump here';
    jumpBtn.disabled = cpIdx === curCp;
    jumpBtn.style.opacity = cpIdx === curCp ? '0.5' : '1';
    jumpBtn.addEventListener('click', () => {
        updateProcessStage(procId, cpIdx);
        closeSheet();
        showToast(`Moved to "${cp.name}" ✓`);
    });

    const saveBtn = document.createElement('button');
    saveBtn.className = 'sheet-btn primary';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => {
        if (notifyToggle.checked && !remindInput.value) {
            showToast('Set a reminder date/time before enabling reminder.', true);
            return;
        }
        const procs = state.processes.map(p => {
            if (p.id !== procId) return p;
            const checkpoints = [...p.checkpoints];
            checkpoints[cpIdx] = {
                ...checkpoints[cpIdx],
                name: nameInput.value.trim() || `Checkpoint ${cpIdx + 1}`,
                comment: textarea.value.trim(),
                dueDate: dateInput.value,
                remindAt: remindInput.value,
                notify: notifyToggle.checked,
            };
            return { ...p, checkpoints };
        });
        setState({ processes: procs });
        save();
        closeSheet();
        showToast('Checkpoint updated ✓');

        // Schedule or cancel notification
        if (notifyToggle.checked && remindInput.value) {
            scheduleCheckpointNotification(procId, cpIdx);
        } else {
            cancelCheckpointNotification(procId, cpIdx);
        }
    });

    btnRow.appendChild(jumpBtn);
    btnRow.appendChild(saveBtn);
    content.appendChild(btnRow);

    // Delete checkpoint button (only if more than 1 checkpoint)
    if (cps.length > 1) {
        const deleteRow = document.createElement('div');
        deleteRow.style.cssText = 'margin-top:10px;text-align:center;';
        const delBtn = document.createElement('button');
        delBtn.className = 'sheet-btn secondary';
        delBtn.style.cssText = 'color:var(--danger);border-color:var(--danger-border);width:100%;';
        delBtn.textContent = 'Delete Checkpoint';
        delBtn.addEventListener('click', () => {
            if (!confirm(`Delete checkpoint "${cp.name}"?`)) return;
            const procs = state.processes.map(p => {
                if (p.id !== procId) return p;
                const checkpoints = p.checkpoints.filter((_, i) => i !== cpIdx);
                let newCur = p.currentCheckpoint ?? 0;
                if (cpIdx < newCur) newCur--;
                if (newCur >= checkpoints.length) newCur = checkpoints.length - 1;
                return { ...p, checkpoints, currentCheckpoint: Math.max(0, newCur) };
            });
            setState({ processes: procs });
            save();
            closeSheet();
            showToast('Checkpoint deleted');
        });
        deleteRow.appendChild(delBtn);
        content.appendChild(deleteRow);
    }

    openSheet();
}

const _reminderTimeouts = new Map();

function scheduleCheckpointNotification(procId, cpIdx) {
    const key = `${procId}-${cpIdx}`;
    // Clear any existing timeout for this checkpoint
    if (_reminderTimeouts.has(key)) {
        clearTimeout(_reminderTimeouts.get(key));
        _reminderTimeouts.delete(key);
    }
    const proc = state.processes.find(p => p.id === procId);
    if (!proc) return;
    const cp = (proc.checkpoints || [])[cpIdx];
    if (!cp || !cp.notify || !cp.remindAt) return;
    const targetTime = new Date(cp.remindAt).getTime();
    const delay = targetTime - Date.now();
    if (delay <= 0) return; // already past
    if (delay > REMINDER_MAX_DELAY_MS) return; // too far out for a simple timeout
    const tid = setTimeout(() => {
        _reminderTimeouts.delete(key);
        sendTickedNotification(
            `Checkpoint: ${cp.name}`,
            `Process "${proc.text}" — ${cp.name} is due now.`,
            {
                tag: `ticked-checkpoint-${procId}-${cpIdx}`,
                actions: [
                    { action: 'insta-log', title: 'Insta Log' },
                    { action: 'open', title: 'Open App' }
                ],
                data: { action: 'insta-log', procId, cpIdx }
            }
        );
    }, delay);
    _reminderTimeouts.set(key, tid);
}

function cancelCheckpointNotification(procId, cpIdx) {
    const key = `${procId}-${cpIdx}`;
    if (_reminderTimeouts.has(key)) {
        clearTimeout(_reminderTimeouts.get(key));
        _reminderTimeouts.delete(key);
    }
    // Also close any existing notification with this tag
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(reg =>
            reg.getNotifications({ tag: `ticked-checkpoint-${procId}-${cpIdx}` })
               .then(list => list.forEach(n => n.close()))
               .catch(() => {})
        ).catch(() => {});
    }
}

function scheduleAllPendingReminders() {
    if (!state.processes) return;
    for (const proc of state.processes) {
        if (!proc.checkpoints) continue;
        for (let i = 0; i < proc.checkpoints.length; i++) {
            const cp = proc.checkpoints[i];
            if (cp.notify && cp.remindAt) {
                scheduleCheckpointNotification(proc.id, i);
            }
        }
    }
}

// ── Timeline renderer ─────────────────────────────────────
function renderTimelineView(filtered, today) {
    timelineView.innerHTML = '';
    if (filtered.length === 0) return;

    const hasAuto   = filtered.some(e => !e.custom);
    const hasCustom = filtered.some(e =>  e.custom);
    if (hasAuto || hasCustom) {
        const legend = document.createElement('div');
        legend.className = 'tl-legend';
        if (hasAuto)   legend.innerHTML += `<span class="tl-legend-item"><span class="tl-legend-dot auto"></span>Auto-logged</span>`;
        if (hasCustom) legend.innerHTML += `<span class="tl-legend-item"><span class="tl-legend-dot custom"></span>Custom</span>`;
        timelineView.appendChild(legend);
    }

    const dayMap  = new Map();
    const chrono  = [...filtered].sort((a, b) => new Date(a.isoDate) - new Date(b.isoDate));
    chrono.forEach(e => {
        const d = isoToDateStr(e.isoDate);
        if (!dayMap.has(d)) dayMap.set(d, []);
        dayMap.get(d).push(e);
    });

    [...dayMap.keys()].sort((a, b) => b.localeCompare(a)).forEach(dateStr => {
        const entries = dayMap.get(dateStr);
        const isToday = dateStr === today;

        const dayEl  = document.createElement('div');
        dayEl.className = 'tl-day' + (isToday ? ' is-today' : '');

        const header = document.createElement('div');
        header.className = 'tl-day-header';
        const pill = document.createElement('span');
        pill.className = 'tl-day-pill' + (isToday ? ' is-today' : '');
        pill.textContent = formatDayLabel(dateStr);
        const rule = document.createElement('div');
        rule.className = 'tl-day-rule';
        const cnt = document.createElement('span');
        cnt.className = 'tl-day-count';
        cnt.textContent = entries.length === 1 ? '1 entry' : `${entries.length} entries`;
        header.appendChild(pill); header.appendChild(rule); header.appendChild(cnt);

        const track = document.createElement('div');
        track.className = 'tl-track' + (entries.length <= 1 ? ' single' : '');
        const row = document.createElement('div');
        row.className = 'tl-row';

        if (entries.length > 1) {
            const spine = document.createElement('div');
            spine.className = 'tl-spine';
            row.appendChild(spine);
        }

        entries.forEach(entry => {
            const isEntryToday = isoToDateStr(entry.isoDate) === today;
            const node = document.createElement('div');
            node.className = 'tl-node' + (entry.custom ? ' tl-custom' : ' tl-auto') + (isEntryToday ? ' is-today' : '');

            const time  = document.createElement('div');
            time.className = 'tl-time';
            time.textContent = isoToTimeStr(entry.isoDate);

            const dot   = document.createElement('div');
            dot.className = 'tl-dot';
            const stem  = document.createElement('div');
            stem.className = 'tl-stem';
            const card  = document.createElement('div');
            card.className = 'tl-card';

            if (entry.bgColor) card.style.background = entry.bgColor;
            if (entry.borderColor) card.style.borderColor = entry.borderColor;

            const name  = document.createElement('div');
            name.className = 'tl-card-name' + (entry.text ? '' : ' no-text');
            name.textContent = entry.text || '(no text)';
            card.appendChild(name);

            if (entry.custom) {
                const badge = document.createElement('span');
                badge.className = 'tl-card-badge';
                badge.textContent = '✦ custom';
                card.appendChild(badge);
            }

            if (entry.tags && entry.tags.includes('edited')) {
                const badge = document.createElement('span');
                badge.className = 'tl-card-badge';
                badge.style.background = 'var(--edited-dim)';
                badge.style.border = '1px solid var(--edited-border)';
                badge.style.color = 'var(--edited)';
                badge.textContent = '✎ edited';
                card.appendChild(badge);
            }

            node.appendChild(time); node.appendChild(dot); node.appendChild(stem); node.appendChild(card);
            row.appendChild(node);
        });

        track.appendChild(row);
        dayEl.appendChild(header);
        dayEl.appendChild(track);
        timelineView.appendChild(dayEl);
        initDragScroll(track);
    });
}

function initDragScroll(el) {
    let isDown = false, startX, scrollLeft;
    el.addEventListener('mousedown', e => { isDown = true; startX = e.pageX - el.offsetLeft; scrollLeft = el.scrollLeft; });
    el.addEventListener('mouseleave', () => { isDown = false; });
    el.addEventListener('mouseup',    () => { isDown = false; });
    el.addEventListener('mousemove',  e => { if (!isDown) return; e.preventDefault(); el.scrollLeft = scrollLeft - (e.pageX - el.offsetLeft - startX); });
}

// ── Master render ─────────────────────────────────────────
function render() {
    const { activeTab, entries, processes, currentView } = state;
    const today = todayDateString();

    // Lightweight updates for both tabs (always needed)
    document.getElementById('tabTasksCount').textContent = entries.length;
    document.getElementById('tabProcessesCount').textContent = processes.length;
    const totalCount = entries.length + processes.length;
    countBadge.textContent = totalCount === 1 ? '1 entry' : `${totalCount} entries`;

    // ── Tasks tab rendering (skip heavy DOM work if inactive) ──
    if (activeTab === 'tasks') {
        const tasksFiltered = getSorted(getFiltered('tasks'), 'tasks');
        const tasksIsFiltering = searchInput.value.trim() || filterDate.value || state.activeTypeFilter !== 'all';

        entryList.style.display   = currentView === 'list'     ? '' : 'none';
        timelineView.style.display= currentView === 'timeline' ? '' : 'none';

        if (currentView === 'list') {
            const visibleTasks = updateLazyState('tasks', tasksFiltered);
            renderListView(visibleTasks, today);
            lazyFallbackHandler();
        } else {
            _listKeys.clear();
            tasksLazyLoader.style.display = 'none';
            renderTimelineView(tasksFiltered, today);
        }

        const tasksEmpty = entries.length === 0;
        const tasksNoResults = !tasksEmpty && tasksFiltered.length === 0;
        emptyState.classList.toggle('visible', tasksEmpty || tasksNoResults);
        if (tasksNoResults) {
            emptyState.querySelector('.empty-icon').textContent = '🔍';
            emptyState.querySelector('p').textContent = 'No entries match your filters.';
        } else if (tasksEmpty) {
            emptyState.querySelector('.empty-icon').textContent = '🕳️';
            emptyState.querySelector('p').innerHTML = 'No entries yet.<br>Add a note above to get started.';
        }

        clearBtn.style.display = entries.length > 0 ? '' : 'none';

        if (tasksIsFiltering && entries.length > 0) {
            resultsCount.textContent = `${tasksFiltered.length} of ${entries.length} entries`;
            resultsCount.classList.add('visible');
        } else {
            resultsCount.classList.remove('visible');
        }
        filterActiveDot.classList.toggle('visible', !!tasksIsFiltering);
    }

    // ── Processes tab rendering (skip heavy DOM work if inactive) ──
    if (activeTab === 'processes') {
        const procsFiltered = getSorted(getFiltered('processes'), 'processes');
        const procsIsFiltering = procSearchInput.value.trim() || procFilterDate.value || state.procActiveTypeFilter !== 'all';

        const visibleProcs = updateLazyState('processes', procsFiltered);
        renderProcessListView(visibleProcs, today);
        lazyFallbackHandler();

        const procsEmpty = processes.length === 0;
        const procsNoResults = !procsEmpty && procsFiltered.length === 0;
        procEmptyState.classList.toggle('visible', procsEmpty || procsNoResults);
        if (procsNoResults) {
            procEmptyState.querySelector('.empty-icon').textContent = '🔍';
            procEmptyState.querySelector('p').textContent = 'No processes match your filters.';
        } else if (procsEmpty) {
            procEmptyState.querySelector('.empty-icon').textContent = '⟳';
            procEmptyState.querySelector('p').innerHTML = 'No processes yet.<br>Add a process above to track workflow checkpoints.';
        }

        procClearBtn.style.display = processes.length > 0 ? '' : 'none';

        if (procsIsFiltering && processes.length > 0) {
            procResultsCount.textContent = `${procsFiltered.length} of ${processes.length} processes`;
            procResultsCount.classList.add('visible');
        } else {
            procResultsCount.classList.remove('visible');
        }
        procFilterActiveDot.classList.toggle('visible', !!procsIsFiltering);
    }

    // ── Stats section ──
    renderStats();
}

// ── UI actions ────────────────────────────────────────────
function setView(view) {
    state.currentView = view;
    document.getElementById('viewListBtn').classList.toggle('active', view === 'list');
    document.getElementById('viewTimelineBtn').classList.toggle('active', view === 'timeline');
    document.querySelector('#tasksSortControls').style.opacity       = view === 'list' ? '' : '0.35';
    document.querySelector('#tasksSortControls').style.pointerEvents = view === 'list' ? '' : 'none';
    render();
}

function setSort(field, tab) {
    if (tab === 'tasks') {
        const newDir = state.sortField === field ? (state.sortDir === 'desc' ? 'asc' : 'desc') : 'desc';
        state.sortField = field;
        state.sortDir   = newDir;
        document.getElementById('sortTimeBtn').classList.toggle('active', field === 'time');
        document.getElementById('sortTextBtn').classList.toggle('active', field === 'text');
        const arrow = newDir === 'desc' ? '↓' : '↑';
        document.getElementById('sortTimeDir').textContent = field === 'time' ? arrow : '↓';
        document.getElementById('sortTextDir').textContent = field === 'text' ? arrow : '↓';
    } else {
        const newDir = state.procSortField === field ? (state.procSortDir === 'desc' ? 'asc' : 'desc') : 'desc';
        state.procSortField = field;
        state.procSortDir   = newDir;
        document.getElementById('procSortTimeBtn').classList.toggle('active', field === 'time');
        document.getElementById('procSortTextBtn').classList.toggle('active', field === 'text');
        const arrow = newDir === 'desc' ? '↓' : '↑';
        document.getElementById('procSortTimeDir').textContent = field === 'time' ? arrow : '↓';
        document.getElementById('procSortTextDir').textContent = field === 'text' ? arrow : '↓';
    }
    render();
}

function toggleCustomPanel() {
    const open = customPanel.classList.toggle('open');
    customTriggerBtn.classList.toggle('active', open);
    if (open) {
        const now = new Date();
        document.getElementById('customDate').value = now.toLocaleDateString('en-CA');
        document.getElementById('customTime').value = now.toTimeString().slice(0, 5);
    }
}

function toggleFilterPanel(tab) {
    if (tab === 'tasks') {
        const panel = document.getElementById('filterPanel');
        const btn   = document.getElementById('filterToggleBtn');
        btn.classList.toggle('active', panel.classList.toggle('open'));
    } else {
        const panel = document.getElementById('procFilterPanel');
        const btn   = document.getElementById('procFilterToggleBtn');
        btn.classList.toggle('active', panel.classList.toggle('open'));
    }
}

function applyFilters(tab) { render(); }
const debouncedApplyFilters = debounce(render, SEARCH_DEBOUNCE_MS);

function setTypeFilter(type, el, tab) {
    if (tab === 'tasks') {
        state.activeTypeFilter = type;
        const panel = document.getElementById('filterPanel');
        panel.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    } else {
        state.procActiveTypeFilter = type;
        const panel = document.getElementById('procFilterPanel');
        panel.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    }
    el.classList.add('active');
    render();
}

function clearFilters(tab) {
    if (tab === 'tasks') {
        searchInput.value  = '';
        filterDate.value   = '';
        state.activeTypeFilter = 'all';
        const panel = document.getElementById('filterPanel');
        panel.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        panel.querySelector('.filter-chip[data-filter="all"]').classList.add('active');
    } else {
        procSearchInput.value  = '';
        procFilterDate.value   = '';
        state.procActiveTypeFilter = 'all';
        const panel = document.getElementById('procFilterPanel');
        panel.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        panel.querySelector('.filter-chip[data-filter="all"]').classList.add('active');
    }
    render();
}

function clearAll(tab) {
    if (tab === 'tasks') {
        if (!confirm('Clear all log entries? This cannot be undone.')) return;
        _listKeys.clear();
        setState({ entries: [] });
    } else {
        if (!confirm('Clear all processes? This cannot be undone.')) return;
        _procKeys.clear();
        setState({ processes: [] });
    }
    save();
}

// ── Export / Import shared helpers ────────────────────────
function buildExportPayload() {
    return {
        app:        'Ticked',
        version:    SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        palette:    state.palette,
        entries:    state.entries,
        processes:  state.processes,
        gdriveClientId: _gdriveClientId || '',
    };
}

function normalizeImportEnvelope(parsed) {
    return Array.isArray(parsed)
        ? { version: 1, entries: parsed }
        : { version: parsed.version || 1, entries: parsed.entries || [], processes: parsed.processes || [], palette: parsed.palette, gdriveClientId: parsed.gdriveClientId || '' };
}

function mergeImportedData(parsed) {
    const migrated = migrate(normalizeImportEnvelope(parsed));

    const incoming = (migrated.entries || []).filter(e => e.isoDate || e.timestamp);
    const existingIds = new Set(state.entries.map(e => e.id));
    const newEntries = incoming.filter(e => !existingIds.has(e.id));
    const mergedEntries = [...state.entries, ...newEntries]
        .sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate));

    const incomingProcs = migrated.processes || [];
    const existingProcIds = new Set(state.processes.map(p => p.id));
    const newProcs = incomingProcs.filter(p => !existingProcIds.has(p.id));
    const mergedProcs = [...state.processes, ...newProcs]
        .sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate));

    const newPalette = migrated.palette || state.palette;

    if (migrated.gdriveClientId) {
        _gdriveClientId = String(migrated.gdriveClientId).trim();
        safeStorage.set('gdriveClientId', _gdriveClientId);
        if (gdriveClientInput) gdriveClientInput.value = _gdriveClientId;
    }

    setState({ entries: mergedEntries, processes: mergedProcs, palette: newPalette });
    initPalette();
    save();

    return {
        newEntries: newEntries.length,
        newProcs: newProcs.length,
        dupeEntries: incoming.length - newEntries.length,
        dupeProcs: incomingProcs.length - newProcs.length,
    };
}

// ── Export ─────────────────────────────────────────────────
function exportJSON() {
    if (state.entries.length === 0 && state.processes.length === 0) {
        showToast('Nothing to export yet.', true);
        return;
    }
    const blob = new Blob([JSON.stringify(buildExportPayload(), null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `ticked-export-${new Date().toLocaleDateString('en-CA')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${state.entries.length + state.processes.length} items ↑`);
}

// ── Import ─────────────────────────────────────────────────
function importJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const parsed = JSON.parse(e.target.result);
            const result = mergeImportedData(parsed);
            const totalNew = result.newEntries + result.newProcs;
            const totalDupe = result.dupeEntries + result.dupeProcs;
            let msg = `Imported ${totalNew} items`;
            if (totalDupe > 0) msg += ` (${totalDupe} duplicates skipped)`;
            showToast(msg);
        } catch {
            showToast('Import failed — invalid file.', true);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ── Tooltip ───────────────────────────────────────────────
function initTooltip() {
    const qm = document.querySelector('.question-mark');
    const tip = document.querySelector('.tooltip');
    let tipVisible = false;
    function showTip() {
        const rect = qm.getBoundingClientRect();
        const tipW = 300, margin = 12;
        let left = rect.right - tipW;
        left = Math.max(margin, Math.min(left, window.innerWidth - tipW - margin));
        tip.style.top  = (rect.bottom + 10) + 'px';
        tip.style.left = left + 'px';
        tip.classList.add('visible');
        tipVisible = true;
    }
    function hideTip() { tip.classList.remove('visible'); tipVisible = false; }
    qm.addEventListener('mouseenter', showTip);
    qm.addEventListener('mouseleave', hideTip);
    qm.addEventListener('focus',      showTip);
    qm.addEventListener('blur',       hideTip);
    window.addEventListener('scroll', () => { if (tipVisible) showTip(); }, { passive: true });
}

// ── Ko-fi toggle ──────────────────────────────────────────
function initKofi() {
    const hidden = safeStorage.get('kofiHidden') !== 'false';
    const badge  = document.querySelector('.kofi-badge');
    const btn    = document.getElementById('kofiToggle');
    badge.style.display = hidden ? 'none' : '';
    btn.classList.toggle('hidden', hidden);
}

function toggleKofi() {
    const badge     = document.querySelector('.kofi-badge');
    const btn       = document.getElementById('kofiToggle');
    const nowHidden = badge.style.display !== 'none';
    badge.style.display = nowHidden ? 'none' : '';
    btn.classList.toggle('hidden', nowHidden);
    safeStorage.set('kofiHidden', nowHidden);
}

// ── Source Viewer ──────────────────────────────────────
function getFullSourceURL() {
    const src = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
    const blob = new Blob([src], { type: 'text/html; charset=utf-8' });
    return URL.createObjectURL(blob);
}

function openSourceViewer() {
    document.getElementById('sourceModalOverlay').classList.add('open');
    document.body.classList.add('sheet-open');
}

function closeSourceViewer() {
    document.getElementById('sourceModalOverlay').classList.remove('open');
    document.body.classList.remove('sheet-open');
}

function copySource() {
    if (!confirm('This will copy a large amount of text to your clipboard, which may cause lag on phones. Continue?')) return;
    const src = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
    navigator.clipboard.writeText(src).then(
        () => showToast('Source copied to clipboard ✓'),
        () => showToast('Copy failed — try manually', true)
    );
}

function downloadOfflineHTML() {
    const src = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
    const blob = new Blob([src], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticked-offline-${new Date().toLocaleDateString('en-CA')}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Offline HTML downloaded ✓');
}

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
            showToast('Google Drive Client ID required.', true);
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
    if (!clientId) { showToast('Google Drive Client ID required.', true); return null; }

    await loadGoogleIdentityServices();

    return new Promise((resolve) => {
        _gdriveTokenClient = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: GDRIVE_SCOPES,
            callback: (resp) => {
                if (resp.error) {
                    showToast('Google auth failed: ' + resp.error, true);
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
        showToast('Nothing to upload yet.', true);
        return;
    }
    showToast('Connecting to Google Drive…');
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
            showToast('Uploaded ' + (state.entries.length + state.processes.length) + ' items to Google Drive ✓');
        } else {
            showToast('Upload failed: ' + resp.statusText, true);
        }
    } catch (e) {
        showToast('Upload failed: ' + e.message, true);
    }
}

async function gdriveDownload() {
    showToast('Connecting to Google Drive…');
    const token = await gdriveAuth();
    if (!token) return;

    try {
        const file = await gdriveFindFile(token);
        if (!file) {
            showToast('No Ticked backup found on Google Drive.', true);
            return;
        }

        const resp = await fetch('https://www.googleapis.com/drive/v3/files/' + file.id + '?alt=media', {
            headers: { Authorization: 'Bearer ' + token }
        });
        if (!resp.ok) { showToast('Download failed: ' + resp.statusText, true); return; }

        const parsed = await resp.json();
        const result = mergeImportedData(parsed);
        const totalNew = result.newEntries + result.newProcs;
        const totalDupe = result.dupeEntries + result.dupeProcs;
        let msg = 'Synced ' + totalNew + ' new items from Drive';
        if (totalDupe > 0) msg += ' (' + totalDupe + ' already existed)';
        if (totalNew === 0 && totalDupe === 0) msg = 'Drive backup is empty';
        showToast(msg);
    } catch (e) {
        showToast('Sync failed: ' + e.message, true);
    }
}

// ── Keyboard ──────────────────────────────────────────────
inputText.addEventListener('keypress', e => { if (e.key === 'Enter') addEntry(); });
procInputText.addEventListener('keypress', e => { if (e.key === 'Enter') addProcess(); });

// ── Init ──────────────────────────────────────────────────
window.onload = () => { load(); initTooltip(); initKofi(); initStats(); initPWA(); initPersistentLogBell(); initExternalLinkHandler(); };

// ── PWA + Notification system ────────────────────────────
let _swRegistration = null;
const INSTA_LOG_TEXT = '✅ Insta-log from notification';
const PERSISTENT_LOG_NOTIFICATION_TAG = 'ticked-persistent-log';

async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        showToast('Notifications not supported in this browser.', true);
        return false;
    }
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') {
        showToast('Notifications blocked. Enable in browser settings.', true);
        return false;
    }
    const result = await Notification.requestPermission();
    if (result === 'granted') {
        showToast('Notifications enabled ✓');
        return true;
    }
    showToast('Notification permission denied.', true);
    return false;
}

async function sendTickedNotification(title, body, config = {}) {
    const ok = await requestNotificationPermission();
    if (!ok) return;

    const options = {
        body: body || 'Tap to log a new entry',
        icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='80' fill='%230d0f14'/%3E%3Crect x='24' y='24' width='464' height='464' rx='64' fill='none' stroke='%2300e5a0' stroke-width='12'/%3E%3Cpath d='M140 256l80 90 152-160' stroke='%2300e5a0' stroke-width='44' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E",
        badge: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' rx='16' fill='%230d0f14'/%3E%3Cpath d='M24 48l20 22 28-30' stroke='%2300e5a0' stroke-width='8' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E",
        tag: config.tag || 'ticked-checkpoint',
        renotify: config.renotify ?? true,
        requireInteraction: config.requireInteraction ?? true,
        actions: config.actions || [
            { action: 'insta-log', title: 'Insta Log' },
            { action: 'open', title: 'Open App' }
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
            await reg.showNotification(title || 'Ticked', options);
            return;
        } catch(e) { /* fallback below */ }
    }

    // Last resort: basic Notification (no action buttons)
    try {
        delete options.actions; // basic Notification doesn't support actions
        delete options.requireInteraction;
        new Notification(title || 'Ticked', options);
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
    if (showToastMessage) showToast('Logged from notification ✓');
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
        showToast('Insta Log complete ✓');
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
    btn.title = on ? 'Disable persistent quick-log notification' : 'Show persistent quick-log notification';
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
    await sendTickedNotification('Ticked', 'Quick log is ready — tap Log now anytime.', {
        tag: PERSISTENT_LOG_NOTIFICATION_TAG,
        renotify: false,
        actions: [
            { action: 'quick-log', title: 'Log now' },
            { action: 'open', title: 'Open App' }
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
        showToast('Quick-log notification off');
    } else {
        safeStorage.set('persistentLogNotification', 'on');
        showPersistentLogNotification();
        showToast('Quick-log notification on');
    }
    syncPersistentLogBell();
}

let _deferredInstallPrompt = null;

async function initPWA() {
    if ('serviceWorker' in navigator) {
        try {
            _swRegistration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
        } catch (_) {}

        navigator.serviceWorker.addEventListener('message', e => {
            if (e.data && e.data.type === 'ticked-action' && e.data.action === 'insta-log') {
                const ok = instaLogCheckpoint(e.data.procId, Number(e.data.cpIdx), { silent: false });
                if (!ok) showToast('Checkpoint no longer available.', true);
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
        _deferredInstallPrompt = e;
    });
    window.addEventListener('appinstalled', () => {
        _deferredInstallPrompt = null;
    });

    // Handle hash-based actions from notification clicks (when app was not open)
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    if (hash.get('action') === 'insta-log') {
        const procId = hash.get('proc');
        const cpIdx = Number(hash.get('cp'));
        setTimeout(() => {
            const ok = instaLogCheckpoint(procId, cpIdx, { silent: false });
            if (!ok) showToast('Checkpoint no longer available.', true);
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

        cell.title = `${formatDayLabel(dateStr)}: ${count} ${count === 1 ? 'entry' : 'entries'}`;
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
        streakEl.textContent = streak + (streak === 1 ? ' day streak' : ' day streak');
    }
    if (weekEl) {
        weekEl.textContent = weekCount + ' this week';
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


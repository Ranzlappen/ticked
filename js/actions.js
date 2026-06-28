// ── Master render ─────────────────────────────────────────
function render() {
    const { activeTab, entries, processes, currentView } = state;
    const today = todayDateString();

    // Lightweight updates for both tabs (always needed)
    document.getElementById('tabTasksCount').textContent = entries.length;
    document.getElementById('tabProcessesCount').textContent = processes.length;
    const totalCount = entries.length + processes.length;
    countBadge.textContent = totalCount === 1 ? t('oneEntry') : t('nEntries', {n: totalCount});

    // ── Tasks tab rendering (skip heavy DOM work if inactive) ──
    if (activeTab === 'tasks') {
        const tasksFiltered = getSorted(getFiltered('tasks'), 'tasks');
        const tasksIsFiltering = searchInput.value.trim() || filterDate.value || state.activeTypeFilter !== 'all' || state.activeTagFilter;

        entryList.style.display    = currentView === 'list'     ? '' : 'none';
        timelineView.style.display = currentView === 'timeline' ? '' : 'none';
        dailyView.style.display    = currentView === 'daily'    ? '' : 'none';

        if (currentView === 'list') {
            const visibleTasks = updateLazyState('tasks', tasksFiltered);
            renderListView(visibleTasks, today);
            lazyFallbackHandler();
        } else if (currentView === 'timeline') {
            resetListView();
            tasksLazyLoader.style.display = 'none';
            renderTimelineView(tasksFiltered, today);
        } else if (currentView === 'daily') {
            resetListView();
            tasksLazyLoader.style.display = 'none';
            renderDailyView(tasksFiltered, today);
        }

        const tasksEmpty = entries.length === 0;
        const tasksNoResults = !tasksEmpty && tasksFiltered.length === 0;
        emptyState.classList.toggle('visible', tasksEmpty || tasksNoResults);
        if (tasksNoResults) {
            emptyState.querySelector('.empty-icon').textContent = '🔍';
            emptyState.querySelector('p').textContent = t('noEntriesMatch');
        } else if (tasksEmpty) {
            emptyState.querySelector('.empty-icon').textContent = '🕳️';
            emptyState.querySelector('p').innerHTML = t('noEntriesYet') + '<br>' + t('addNoteToStart');
        }

        clearBtn.style.display = entries.length > 0 ? '' : 'none';

        if (tasksIsFiltering && entries.length > 0) {
            resultsCount.textContent = t('resultsOf', {filtered: tasksFiltered.length, total: entries.length});
            resultsCount.classList.add('visible');
        } else {
            resultsCount.classList.remove('visible');
        }
        filterActiveDot.classList.toggle('visible', !!tasksIsFiltering);
    }

    // ── Processes tab rendering (skip heavy DOM work if inactive) ──
    if (activeTab === 'processes') {
        const procsFiltered = getSorted(getFiltered('processes'), 'processes');
        const procsIsFiltering = procSearchInput.value.trim() || procFilterDate.value || state.procActiveTypeFilter !== 'all' || state.procActiveTagFilter;

        const visibleProcs = updateLazyState('processes', procsFiltered);
        renderProcessListView(visibleProcs, today);
        lazyFallbackHandler();

        const procsEmpty = processes.length === 0;
        const procsNoResults = !procsEmpty && procsFiltered.length === 0;
        procEmptyState.classList.toggle('visible', procsEmpty || procsNoResults);
        if (procsNoResults) {
            procEmptyState.querySelector('.empty-icon').textContent = '🔍';
            procEmptyState.querySelector('p').textContent = t('noProcessesMatch');
        } else if (procsEmpty) {
            procEmptyState.querySelector('.empty-icon').textContent = '⟳';
            procEmptyState.querySelector('p').innerHTML = t('noProcessesYet') + '<br>' + t('addProcessToStart');
        }

        procClearBtn.style.display = processes.length > 0 ? '' : 'none';

        if (procsIsFiltering && processes.length > 0) {
            procResultsCount.textContent = t('procResultsOf', {filtered: procsFiltered.length, total: processes.length});
            procResultsCount.classList.add('visible');
        } else {
            procResultsCount.classList.remove('visible');
        }
        procFilterActiveDot.classList.toggle('visible', !!procsIsFiltering);
    }

    // ── Tag filter chips ──
    renderTagFilterChips('tasks');
    renderTagFilterChips('processes');

    // ── Stats section ──
    renderStats();
}

// ── UI actions ────────────────────────────────────────────
function setView(view) {
    state.currentView = view;
    document.getElementById('viewListBtn').classList.toggle('active', view === 'list');
    document.getElementById('viewTimelineBtn').classList.toggle('active', view === 'timeline');
    document.getElementById('viewDailyBtn').classList.toggle('active', view === 'daily');
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
        state.activeTagFilter = '';
        const panel = document.getElementById('filterPanel');
        panel.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        panel.querySelector('.filter-chip[data-filter="all"]').classList.add('active');
    } else {
        procSearchInput.value  = '';
        procFilterDate.value   = '';
        state.procActiveTypeFilter = 'all';
        state.procActiveTagFilter = '';
        const panel = document.getElementById('procFilterPanel');
        panel.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        panel.querySelector('.filter-chip[data-filter="all"]').classList.add('active');
    }
    render();
}

function setTagFilter(tag, tab) {
    if (tab === 'tasks') {
        state.activeTagFilter = state.activeTagFilter === tag ? '' : tag;
    } else {
        state.procActiveTagFilter = state.procActiveTagFilter === tag ? '' : tag;
    }
    render();
}

function renderTagFilterChips(tab) {
    const containerId = tab === 'tasks' ? 'filterTagChips' : 'procFilterTagChips';
    const container = document.getElementById(containerId);
    if (!container) return;

    const tags = getAllUserTags(tab);
    const activeTag = tab === 'tasks' ? state.activeTagFilter : state.procActiveTagFilter;

    if (tags.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = '';
    const label = document.createElement('span');
    label.className = 'filter-chip-label';
    label.textContent = t('tagsLabel');
    container.appendChild(label);

    tags.forEach(tag => {
        const chip = document.createElement('button');
        chip.className = 'filter-chip tag-filter-chip' + (activeTag === tag ? ' active' : '');
        chip.textContent = '#' + tag;
        chip.addEventListener('click', () => setTagFilter(tag, tab));
        container.appendChild(chip);
    });
}

function clearAll(tab) {
    if (tab === 'tasks') {
        if (!confirm(t('confirmClearEntries'))) return;
        resetListView();
        setState({ entries: [] });
    } else {
        if (!confirm(t('confirmClearProcesses'))) return;
        resetProcessListView();
        setState({ processes: [] });
    }
    save();
}

// ── Export / Import shared helpers ────────────────────────
function buildExportPayload() {
    return {
        app:        t('ticked'),
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
    saveNow();

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
        showToast(t('nothingToExport'), true);
        return;
    }
    const blob = new Blob([JSON.stringify(buildExportPayload(), null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `ticked-export-${new Date().toLocaleDateString('en-CA')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t('exported', {n: state.entries.length + state.processes.length}));
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
            let msg = t('imported', {n: totalNew});
            if (totalDupe > 0) msg += ' ' + t('duplicatesSkipped', {n: totalDupe});
            showToast(msg);
        } catch {
            showToast(t('importFailed'), true);
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
    if (!confirm(t('confirmCopySource'))) return;
    const src = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
    navigator.clipboard.writeText(src).then(
        () => showToast(t('sourceCopied')),
        () => showToast(t('copyFailed'), true)
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
    showToast(t('offlineDownloaded'));
}


// ── Add entries ───────────────────────────────────────────
function addEntry() {
    const text   = inputText.value.trim();
    const userTags = parseTagInput('tagInput');
    const entry  = {
        id: uuid(), isoDate: new Date().toISOString(), text, custom: false,
        bgColor: '', borderColor: '', tags: [...userTags]
    };
    setState({ entries: [entry, ...state.entries] });
    save();
    inputText.value = '';
    clearTagInput('tagInput');
}

function addCustomEntry() {
    const text    = inputText.value.trim();
    const dateVal = document.getElementById('customDate').value;
    const timeVal = document.getElementById('customTime').value;
    if (!dateVal || !timeVal) { showToast(t('setBothDateTime'), true); return; }

    const userTags = parseTagInput('tagInput');
    const entry  = {
        id: uuid(), isoDate: buildIso(dateVal, timeVal), text, custom: true,
        bgColor: '', borderColor: '', tags: ['custom', ...userTags]
    };
    const sorted = [...state.entries, entry].sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate));
    setState({ entries: sorted });
    save();
    inputText.value = '';
    clearTagInput('tagInput');
    toggleCustomPanel();
    showToast(t('customEntryAdded'));
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
    if (!text) { showToast(t('pleaseEnterProcessName'), true); return; }
    const userTags = parseTagInput('procTagInput');
    const now = new Date().toISOString();
    const proc = {
        id: uuid(),
        isoDate: now,
        text,
        custom: false,
        bgColor: '',
        borderColor: '',
        tags: [...userTags],
        currentCheckpoint: 0,
        checkpoints: [{
            id: uuid(),
            name: t('start'),
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
    clearTagInput('procTagInput');
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
    showToast(t('templateAdded', {name: processName}));
}

function deleteProcess(id) {
    setState({ processes: state.processes.filter(p => p.id !== id) });
    save();
}

function updateProcessStage(id, cpIdx) {
    let justCompleted = false;
    const procs = state.processes.map(p => {
        if (p.id !== id) return p;
        const updated = { ...p, currentCheckpoint: cpIdx };
        // Auto-complete when reaching the last checkpoint
        const lastIdx = (p.checkpoints || []).length - 1;
        if (cpIdx >= lastIdx && lastIdx >= 0 && !p.completedAt) {
            updated.completedAt = new Date().toISOString();
            justCompleted = true;
        }
        return updated;
    });
    setState({ processes: procs });
    save();
    if (justCompleted) showToast(t('processCompleted'));
}

function reopenProcess(id) {
    const procs = state.processes.map(p => {
        if (p.id !== id) return p;
        return { ...p, completedAt: '' };
    });
    setState({ processes: procs });
    save();
    showToast(t('processReopened'));
}

function isCompleted(p) {
    return !!p.completedAt;
}

function addCheckpointToProcess(procId) {
    const procs = state.processes.map(p => {
        if (p.id !== procId) return p;
        const cps = [...p.checkpoints];
        cps.push({
            id: uuid(),
            name: t('checkpointN', {n: cps.length + 1}),
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
    showToast(t('checkpointAdded'));
}

// ── Filter / Sort ─────────────────────────────────────────
function getFiltered(tab) {
    if (tab === 'tasks') {
        const query   = searchInput.value.trim().toLowerCase();
        const dateFil = filterDate.value;
        const { entries, activeTypeFilter, activeTagFilter } = state;

        return entries.filter(e => {
            if (activeTagFilter && !getUserTags(e.tags).includes(activeTagFilter)) return false;
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
        const { processes, procActiveTypeFilter, procActiveTagFilter } = state;

        return processes.filter(p => {
            if (procActiveTypeFilter === 'active' && isCompleted(p)) return false;
            if (procActiveTypeFilter === 'completed' && !isCompleted(p)) return false;
            if (procActiveTypeFilter === 'edited' && !(p.tags && p.tags.includes('edited'))) return false;
            if (procActiveTypeFilter === 'overdue' && !isOverdue(p)) return false;
            if (procActiveTagFilter && !getUserTags(p.tags).includes(procActiveTagFilter)) return false;
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
    const tapAction = () => openEntryPreview(entry.id, tab);

    initSwipe(wrap, card, confirmOverlay, deleteAction, swipeRightAction, tapAction);
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
    textSpan.textContent = entry.text || t('noText');
    textEl.appendChild(textSpan);

    if (entry.custom) {
        const badge = document.createElement('span');
        badge.className = 'custom-badge';
        badge.textContent = t('custom');
        textEl.appendChild(badge);
    }

    if (hasEdited) {
        const badge = document.createElement('span');
        badge.className = 'edited-badge';
        badge.textContent = t('edited');
        textEl.appendChild(badge);
    }

    const tsEl = document.createElement('div');
    tsEl.className = 'entry-ts';
    tsEl.textContent = displayTs;

    body.appendChild(textEl);
    body.appendChild(tsEl);

    // User tags
    const uTags = getUserTags(entry.tags);
    if (uTags.length > 0) {
        const tagRow = document.createElement('div');
        tagRow.className = 'entry-tags';
        uTags.forEach(tag => {
            const chip = document.createElement('span');
            chip.className = 'entry-tag-chip';
            chip.textContent = '#' + tag;
            tagRow.appendChild(chip);
        });
        body.appendChild(tagRow);
    }

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
    const completed = isCompleted(proc);
    card.className = 'entry-item' + (isToday ? ' today' : '') + (completed ? ' process-completed' : '');

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
    textSpan.textContent = proc.text || t('noText');
    textEl.appendChild(textSpan);

    if (completed) {
        const badge = document.createElement('span');
        badge.className = 'completed-badge';
        badge.textContent = t('completed');
        textEl.appendChild(badge);
    }

    if (hasEdited) {
        const badge = document.createElement('span');
        badge.className = 'edited-badge';
        badge.textContent = t('edited');
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
        label.textContent = cp.name || t('cpLabel', {n: i + 1});

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

    // User tags
    const pTags = getUserTags(proc.tags);
    if (pTags.length > 0) {
        const tagRow = document.createElement('div');
        tagRow.className = 'entry-tags';
        pTags.forEach(tag => {
            const chip = document.createElement('span');
            chip.className = 'entry-tag-chip';
            chip.textContent = '#' + tag;
            tagRow.appendChild(chip);
        });
        body.appendChild(tagRow);
    }

    body.appendChild(track);
    card.appendChild(dot);
    card.appendChild(body);

    // Swipe hint indicator
    const hint = document.createElement('div');
    hint.className = 'swipe-hint';
    hint.innerHTML = '<svg width="14" height="10" viewBox="0 0 14 10" fill="none"><path d="M1 5h12M3 1L1 5l2 4M11 1l2 4-2 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    card.appendChild(hint);
}


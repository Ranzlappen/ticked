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

function initSwipe(wrap, card, confirmOverlay, onDelete, onSwipeRight, onTap) {
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
            if (!direction && onTap) onTap();
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

    document.getElementById('sheetTitle').textContent = t('actions');
    const content = document.getElementById('sheetContent');
    content.innerHTML = '';

    const opts = document.createElement('div');
    opts.className = 'sheet-options';

    // Option 1: Set Background Color
    const opt1 = makeSheetOpt('🎨', t('setBackground'), t('chooseFromPalette'), () => {
        showColorPicker(id, tab, 'bg');
    });
    opts.appendChild(opt1);

    // Option 2: Set Border Color
    const opt2 = makeSheetOpt('🖌️', t('setBorderAction'), t('chooseFromPalette'), () => {
        showColorPicker(id, tab, 'border');
    });
    opts.appendChild(opt2);

    // Option 3: Change Time
    const opt3 = makeSheetOpt('🕐', t('changeTime'), t('editTimestampDesc'), () => {
        showTimeEditor(id, tab);
    });
    opts.appendChild(opt3);

    // Option 4: Change Text
    const opt4 = makeSheetOpt('✏️', t('changeText'), t('editTextDesc'), () => {
        showTextEditor(id, tab);
    });
    opts.appendChild(opt4);

    // Option 5: Add Checkpoint (processes only)
    if (tab === 'processes') {
        const opt5 = makeSheetOpt('➕', t('addCheckpointAction'), t('appendCheckpointDesc'), () => {
            addCheckpointToProcess(id);
            closeSheet();
        });
        opts.appendChild(opt5);

        // Option 6: Reopen / Mark Complete toggle
        if (isCompleted(entry)) {
            const opt6 = makeSheetOpt('⟳', t('reopenProcess'), t('clearCompletedDesc'), () => {
                reopenProcess(id);
                closeSheet();
            });
            opts.appendChild(opt6);
        } else {
            const opt6 = makeSheetOpt('✓', t('markComplete'), t('markAsCompletedDesc'), () => {
                const procs = state.processes.map(p => {
                    if (p.id !== id) return p;
                    return { ...p, completedAt: new Date().toISOString() };
                });
                setState({ processes: procs });
                save();
                closeSheet();
                showToast(t('processCompleted'));
            });
            opts.appendChild(opt6);
        }
    }

    content.appendChild(opts);
    openSheet();
}

// ── Entry Preview (tap-to-preview) ───────────────────────
function openEntryPreview(id, tab) {
    const entry = tab === 'tasks'
        ? state.entries.find(e => e.id === id)
        : state.processes.find(p => p.id === id);
    if (!entry) return;

    document.getElementById('sheetTitle').textContent = t('preview');
    const content = document.getElementById('sheetContent');
    content.innerHTML = '';

    const preview = document.createElement('div');
    preview.className = 'preview-content';

    const textEl = document.createElement('div');
    textEl.className = 'preview-text' + (entry.text ? '' : ' no-text');
    textEl.textContent = entry.text || t('noText');
    preview.appendChild(textEl);

    const tsEl = document.createElement('div');
    tsEl.className = 'preview-meta';
    tsEl.textContent = isoToDisplayDate(entry.isoDate);
    preview.appendChild(tsEl);

    const badges = document.createElement('div');
    badges.className = 'preview-badges';
    if (entry.custom) { const b = document.createElement('span'); b.className = 'custom-badge'; b.textContent = t('custom'); badges.appendChild(b); }
    if (entry.tags && entry.tags.includes('edited')) { const b = document.createElement('span'); b.className = 'edited-badge'; b.textContent = t('edited'); badges.appendChild(b); }
    if (entry.completedAt) { const b = document.createElement('span'); b.className = 'completed-badge'; b.textContent = t('completed'); badges.appendChild(b); }
    if (badges.children.length) preview.appendChild(badges);

    const uTags = getUserTags(entry.tags);
    if (uTags.length > 0) {
        const tagRow = document.createElement('div');
        tagRow.className = 'entry-tags';
        uTags.forEach(tag => { const chip = document.createElement('span'); chip.className = 'entry-tag-chip'; chip.textContent = '#' + tag; tagRow.appendChild(chip); });
        preview.appendChild(tagRow);
    }

    if (entry.bgColor || entry.borderColor) {
        const colorRow = document.createElement('div');
        colorRow.className = 'preview-colors';
        [entry.bgColor, entry.borderColor].filter(Boolean).forEach(c => {
            const sw = document.createElement('span');
            sw.className = 'preview-color-swatch';
            sw.style.background = c;
            colorRow.appendChild(sw);
        });
        preview.appendChild(colorRow);
    }

    content.appendChild(preview);
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

    document.getElementById('sheetTitle').textContent = mode === 'bg' ? t('backgroundColor') : t('borderColorTitle');
    const content = document.getElementById('sheetContent');
    content.innerHTML = '';

    const sub = document.createElement('div');
    sub.className = 'sheet-sub-title';
    sub.textContent = t('pickFromPalette');
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
    cancelBtn.textContent = t('cancel');
    cancelBtn.addEventListener('click', closeSheet);

    const applyBtn = document.createElement('button');
    applyBtn.className = 'sheet-btn primary';
    applyBtn.textContent = t('apply');
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
    showToast(t('colorApplied'));
}

function showTimeEditor(id, tab) {
    const entry = tab === 'tasks'
        ? state.entries.find(e => e.id === id)
        : state.processes.find(p => p.id === id);
    if (!entry) return;

    document.getElementById('sheetTitle').textContent = t('changeTime');
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
    cancelBtn.textContent = t('cancel');
    cancelBtn.addEventListener('click', closeSheet);

    const applyBtn = document.createElement('button');
    applyBtn.className = 'sheet-btn primary';
    applyBtn.textContent = t('save');
    applyBtn.addEventListener('click', () => {
        if (!dateInput.value || !timeInput.value) {
            showToast(t('setBothDateTime'), true);
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
        showToast(t('timeUpdated'));
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

    document.getElementById('sheetTitle').textContent = t('changeText');
    const content = document.getElementById('sheetContent');
    content.innerHTML = '';

    const form = document.createElement('div');
    form.className = 'stage-detail-form';

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.value = entry.text;
    textInput.placeholder = t('enterTextPlaceholder');

    form.appendChild(textInput);
    content.appendChild(form);

    const btnRow = document.createElement('div');
    btnRow.className = 'sheet-btn-row';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'sheet-btn secondary';
    cancelBtn.textContent = t('cancel');
    cancelBtn.addEventListener('click', closeSheet);

    const applyBtn = document.createElement('button');
    applyBtn.className = 'sheet-btn primary';
    applyBtn.textContent = t('save');
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
        showToast(t('textUpdated'));
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(applyBtn);
    content.appendChild(btnRow);

    setTimeout(() => textInput.focus(), 350);
}


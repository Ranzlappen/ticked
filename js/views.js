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

    document.getElementById('sheetTitle').textContent = cp.name || t('checkpointN', {n: cpIdx + 1});
    const content = document.getElementById('sheetContent');
    content.innerHTML = '';

    // Status indicator
    const sub = document.createElement('div');
    sub.className = 'sheet-sub-title';
    sub.textContent = cpIdx === curCp
        ? t('currentCheckpointStatus')
        : cpIdx < curCp ? t('completedCheckpointStatus') : t('upcomingCheckpointStatus');
    content.appendChild(sub);

    const form = document.createElement('div');
    form.className = 'stage-detail-form';

    // Checkpoint name
    const nameLabel = document.createElement('div');
    nameLabel.className = 'sheet-sub-title';
    nameLabel.style.textAlign = 'left';
    nameLabel.textContent = t('checkpointNameLabel');
    form.appendChild(nameLabel);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = cp.name || '';
    nameInput.placeholder = t('checkpointNamePlaceholder');
    form.appendChild(nameInput);

    // Comment
    const commentLabel = document.createElement('div');
    commentLabel.className = 'sheet-sub-title';
    commentLabel.style.textAlign = 'left';
    commentLabel.textContent = t('commentNote');
    form.appendChild(commentLabel);

    const textarea = document.createElement('textarea');
    textarea.value = cp.comment || '';
    textarea.placeholder = t('addNotePlaceholder');
    form.appendChild(textarea);

    // Due date
    const dateLabel = document.createElement('div');
    dateLabel.className = 'sheet-sub-title';
    dateLabel.style.textAlign = 'left';
    dateLabel.textContent = t('dueDate');
    form.appendChild(dateLabel);

    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.value = cp.dueDate || '';
    form.appendChild(dateInput);

    const remindLabel = document.createElement('div');
    remindLabel.className = 'sheet-sub-title';
    remindLabel.style.textAlign = 'left';
    remindLabel.textContent = t('reminderTime');
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
    notifyLabel.textContent = t('enableReminder');
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
    jumpBtn.textContent = cpIdx === curCp ? t('current') : t('jumpHere');
    jumpBtn.disabled = cpIdx === curCp;
    jumpBtn.style.opacity = cpIdx === curCp ? '0.5' : '1';
    jumpBtn.addEventListener('click', () => {
        updateProcessStage(procId, cpIdx);
        closeSheet();
        showToast(t('movedTo', {name: cp.name}));
    });

    const saveBtn = document.createElement('button');
    saveBtn.className = 'sheet-btn primary';
    saveBtn.textContent = t('save');
    saveBtn.addEventListener('click', () => {
        if (notifyToggle.checked && !remindInput.value) {
            showToast(t('setReminderFirst'), true);
            return;
        }
        const procs = state.processes.map(p => {
            if (p.id !== procId) return p;
            const checkpoints = [...p.checkpoints];
            checkpoints[cpIdx] = {
                ...checkpoints[cpIdx],
                name: nameInput.value.trim() || t('checkpointN', {n: cpIdx + 1}),
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
        showToast(t('checkpointUpdated'));

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
        delBtn.textContent = t('deleteCheckpoint');
        delBtn.addEventListener('click', () => {
            if (!confirm(t("deleteCheckpoint") + ": " + cp.name + "?")) return;
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
            showToast(t('checkpointDeleted'));
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
            t('checkpointReminder', { name: cp.name }),
            t('checkpointDueNow', { proc: proc.text, name: cp.name }),
            {
                tag: `ticked-checkpoint-${procId}-${cpIdx}`,
                actions: [
                    { action: 'insta-log', title: t('instaLog') },
                    { action: 'open', title: t('openApp') }
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
        if (hasAuto)   legend.innerHTML += `<span class="tl-legend-item"><span class="tl-legend-dot auto"></span>${t('autoLogged')}</span>`;
        if (hasCustom) legend.innerHTML += `<span class="tl-legend-item"><span class="tl-legend-dot custom"></span>${t('custom')}</span>`;
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
        cnt.textContent = entries.length === 1 ? t('oneEntry') : t('nEntries', {n: entries.length});
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
            name.textContent = entry.text || t('noText');
            card.appendChild(name);

            if (entry.custom) {
                const badge = document.createElement('span');
                badge.className = 'tl-card-badge';
                badge.textContent = '✦ ' + t('custom');
                card.appendChild(badge);
            }

            if (entry.tags && entry.tags.includes('edited')) {
                const badge = document.createElement('span');
                badge.className = 'tl-card-badge';
                badge.style.background = 'var(--edited-dim)';
                badge.style.border = '1px solid var(--edited-border)';
                badge.style.color = 'var(--edited)';
                badge.textContent = '✎ ' + t('edited');
                card.appendChild(badge);
            }

            card.addEventListener('click', () => openEntryPreview(entry.id, 'tasks'));
            card.style.cursor = 'pointer';
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

// ── Daily View ───────────────────────────────────────────
const dailyView = document.getElementById('dailyView');

function renderDailyView(filtered, today) {
    dailyView.innerHTML = '';
    if (filtered.length === 0) return;

    const dayMap = new Map();
    const chrono = [...filtered].sort((a, b) => new Date(a.isoDate) - new Date(b.isoDate));
    chrono.forEach(e => {
        const d = isoToDateStr(e.isoDate);
        if (!dayMap.has(d)) dayMap.set(d, []);
        dayMap.get(d).push(e);
    });

    [...dayMap.keys()].sort((a, b) => b.localeCompare(a)).forEach(dateStr => {
        const entries = dayMap.get(dateStr);
        const isToday = dateStr === today;

        const dayEl = document.createElement('div');
        dayEl.className = 'daily-day';

        const header = document.createElement('div');
        header.className = 'daily-day-header';
        const pill = document.createElement('span');
        pill.className = 'tl-day-pill' + (isToday ? ' is-today' : '');
        pill.textContent = formatDayLabel(dateStr);
        const rule = document.createElement('div');
        rule.className = 'tl-day-rule';
        const cnt = document.createElement('span');
        cnt.className = 'tl-day-count';
        cnt.textContent = entries.length === 1 ? t('oneEntry') : t('nEntries', { n: entries.length });
        header.appendChild(pill); header.appendChild(rule); header.appendChild(cnt);

        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'daily-entries';

        entries.forEach(entry => {
            const isEntryToday = isoToDateStr(entry.isoDate) === today;
            const hasEdited = entry.tags && entry.tags.includes('edited');

            const card = document.createElement('div');
            card.className = 'daily-entry-card' + (isEntryToday ? ' today' : '') + (entry.custom ? ' custom-entry' : '');
            if (entry.bgColor) card.style.background = entry.bgColor;
            if (entry.borderColor) { card.style.borderColor = entry.borderColor; if (entry.custom) card.style.borderLeftColor = entry.borderColor; }

            const dot = document.createElement('div');
            dot.className = 'entry-dot';
            const body = document.createElement('div');
            body.className = 'entry-body';

            const textEl = document.createElement('div');
            textEl.className = 'entry-text' + (entry.text ? '' : ' no-text');
            const textSpan = document.createElement('span');
            textSpan.textContent = entry.text || t('noText');
            textEl.appendChild(textSpan);
            if (entry.custom) { const b = document.createElement('span'); b.className = 'custom-badge'; b.textContent = t('custom'); textEl.appendChild(b); }
            if (hasEdited) { const b = document.createElement('span'); b.className = 'edited-badge'; b.textContent = t('edited'); textEl.appendChild(b); }

            const tsEl = document.createElement('div');
            tsEl.className = 'entry-ts';
            tsEl.textContent = isoToDisplayDate(entry.isoDate);
            body.appendChild(textEl); body.appendChild(tsEl);

            const uTags = getUserTags(entry.tags);
            if (uTags.length > 0) {
                const tagRow = document.createElement('div');
                tagRow.className = 'entry-tags';
                uTags.forEach(tag => { const chip = document.createElement('span'); chip.className = 'entry-tag-chip'; chip.textContent = '#' + tag; tagRow.appendChild(chip); });
                body.appendChild(tagRow);
            }

            card.appendChild(dot); card.appendChild(body);
            card.addEventListener('click', () => openEntryPreview(entry.id, 'tasks'));
            card.style.cursor = 'pointer';
            cardsContainer.appendChild(card);
        });

        dayEl.appendChild(header);
        dayEl.appendChild(cardsContainer);
        dailyView.appendChild(dayEl);
    });
}

function initDragScroll(el) {
    let isDown = false, startX, scrollLeft;
    el.addEventListener('mousedown', e => { isDown = true; startX = e.pageX - el.offsetLeft; scrollLeft = el.scrollLeft; });
    el.addEventListener('mouseleave', () => { isDown = false; });
    el.addEventListener('mouseup',    () => { isDown = false; });
    el.addEventListener('mousemove',  e => { if (!isDown) return; e.preventDefault(); el.scrollLeft = scrollLeft - (e.pageX - el.offsetLeft - startX); });
}


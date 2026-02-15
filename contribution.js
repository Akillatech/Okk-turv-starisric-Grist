// =================== CONTRIBUTIONS LOGIC ===================

if (window.logic) {
    // Data Store synchronized with global settings
    window.logic.contributions = (window.currentSettings && window.currentSettings.contributions) ? window.currentSettings.contributions : [];
    window.logic.currentContributionId = null;

    // --- NOTIFICATION SYSTEM ---
    window.logic.showNotification = function (message, isError = false) {
        const toast = document.getElementById('notificationToast');
        if (!toast) return;

        toast.querySelector('.message').textContent = message;
        toast.querySelector('.icon').textContent = isError ? '⚠️' : '💾';

        toast.className = 'notification-toast show';
        if (isError) toast.classList.add('error');
        else toast.classList.remove('error');

        setTimeout(() => {
            toast.className = 'notification-toast';
        }, 3000);
    };


    // --- GRIST OPTIONS INTEGRATION ---

    // Called by script.js when options are loaded
    window.logic.loadContributionsFromOptions = function (data) {
        console.log("[CONTRIB_SYNC] loadContributionsFromOptions triggered. Items:", data ? data.length : 0);
        if (Array.isArray(data)) {
            window.logic.contributions = data;
            // Sync to global settings if not already there
            if (window.currentSettings) {
                window.currentSettings.contributions = data;
            }
            window.logic.renderContributions();
            if (typeof renderLastContribution === 'function') renderLastContribution();
        }
    };

    window.logic.saveContributionToGrist = async function (contribution, isNew = false) {
        // Update global settings first to ensure absolute sync
        if (window.currentSettings) {
            window.currentSettings.contributions = window.logic.contributions;
        }

        // Update KPI card immediately if visible/loaded
        if (typeof renderLastContribution === 'function') renderLastContribution();

        try {
            console.log('[CONTRIB_SYNC] Triggering autoSaveSettings for contribution save. Local array size:', window.logic.contributions.length);
            if (window.showSaveReminder) window.showSaveReminder(); // Trigger standard notification immediately

            // Call unified save helper
            if (typeof window.autoSaveSettings === 'function') {
                window.autoSaveSettings();
            }

            // Re-open view if editing?
            if (window.logic.currentContributionId && !isNew) {
                window.logic.openContributionViewModal(window.logic.currentContributionId);
            }
        } catch (e) {
            console.error("Save failed:", e);
        }
    };

    window.logic.deleteContributionFromGrist = async function (id) {
        // Remove from local array
        window.logic.contributions = window.logic.contributions.filter(c => c.id != id);

        // Sync to global settings
        if (window.currentSettings) {
            window.currentSettings.contributions = window.logic.contributions;
        }

        window.logic.renderContributions();

        try {
            if (window.showSaveReminder) window.showSaveReminder(); // Trigger standard notification

            // Call unified save helper
            if (typeof window.autoSaveSettings === 'function') {
                window.autoSaveSettings();
            }
        } catch (e) {
            console.error("Delete failed:", e);
        }
    };


    // --- UI LOGIC (Updated to use API) ---

    window.logic.renderContributions = function () {
        const grid = document.getElementById('contributionsGrid');
        if (!grid) return;

        // Force sync from global settings to ensure absolute consistency
        if (window.currentSettings && window.currentSettings.contributions) {
            window.logic.contributions = window.currentSettings.contributions;
        }
        var total = window.logic.contributions.length;
        var approved = window.logic.contributions.filter(c => c.status === 'approved').length;
        var rejected = window.logic.contributions.filter(c => c.status !== 'approved' && c.status !== 'pending').length;

        if (document.getElementById('contribTotalHeader')) document.getElementById('contribTotalHeader').textContent = total;
        if (document.getElementById('contribApprovedHeader')) document.getElementById('contribApprovedHeader').textContent = approved;
        if (document.getElementById('contribRejectedHeader')) document.getElementById('contribRejectedHeader').textContent = rejected;

        grid.innerHTML = '';
        window.logic.contributions.forEach(c => {
            const card = document.createElement('div');
            // Add status class for styling hook
            card.className = `contribution-card status-${c.status || 'pending'}`;
            card.onclick = () => window.logic.openContributionViewModal(c.id);

            var statusText = c.status === 'approved' ? 'ОДОБРЕНО' : (c.status === 'pending' ? 'НА ПРОВЕРКЕ' : 'ОТКЛОНЕНО');

            // Last comment logic
            let lastCommentHtml = '';
            if (c.comments && c.comments.length > 0) {
                const last = c.comments[c.comments.length - 1];
                lastCommentHtml = `
                    <div class="card-last-comment">
                        <div class="last-comment-meta">
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style="opacity:0.7;">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
                            <span class="last-comment-author">${last.author}</span>
                            <span style="font-size:10px; opacity:0.5; margin-left:auto;">${last.date.split(' ')[0]}</span>
                        </div>
                        <div class="last-comment-text">${last.text}</div>
                    </div>
                `;
            }

            // New Card Structure
            card.innerHTML = `
                <div class="card-status-indicator"></div>
                <div class="card-main">
                    <div class="card-header">
                        <span class="card-code">${c.code || 'NO CODE'}</span>
                        <span class="card-date">${c.date}</span>
                    </div>
                    <div class="card-body">
                        <p class="card-description">${c.description || 'Нет описания'}</p>
                    </div>
                    ${lastCommentHtml}
                    <div class="card-footer">
                        <span class="card-period-badge">
                            <span class="icon icon-calendar"></span> ${c.period || '-'}
                        </span>
                        <span class="card-status-badge status-${c.status || 'pending'}">${statusText}</span>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    };

    window.logic.openContributionCreateModal = function () {
        var modal = document.getElementById('contributionCreateModal');
        if (modal) {
            modal.classList.add('active');
            modal.setAttribute('data-mode', 'create');
            var h2 = document.querySelector('#contributionCreateModal h2');
            if (h2) h2.innerText = 'Новый вклад';
            var btn = document.querySelector('#contributionCreateModal .btn-save');
            if (btn) btn.innerText = 'Создать';

            ['createPeriod', 'createCode', 'createDescription', 'createResult'].forEach(id => {
                if (document.getElementById(id)) document.getElementById(id).value = '';
            });
        }
    };

    window.logic.openEditContributionModal = function () {
        const id = window.logic.currentContributionId;
        const c = window.logic.contributions.find(x => x.id == id); // loose equal for string/int
        if (!c) return;

        var modal = document.getElementById('contributionCreateModal');
        if (modal) {
            window.logic.closeContributionViewModal(); // Close view first
            modal.classList.add('active');
            modal.setAttribute('data-mode', 'edit');
            modal.setAttribute('data-edit-id', id);

            var h2 = document.querySelector('#contributionCreateModal h2');
            if (h2) h2.innerText = 'Редактирование вклада';
            var btn = document.querySelector('#contributionCreateModal .btn-save');
            if (btn) btn.innerText = 'Сохранить';

            if (document.getElementById('createPeriod')) document.getElementById('createPeriod').value = c.period;
            if (document.getElementById('createCode')) document.getElementById('createCode').value = c.code;
            if (document.getElementById('createDescription')) document.getElementById('createDescription').value = c.description;
            if (document.getElementById('createResult')) document.getElementById('createResult').value = c.result;
        }
    };

    window.logic.closeContributionCreateModal = function () {
        var modal = document.getElementById('contributionCreateModal');
        if (modal) {
            const editId = modal.getAttribute('data-edit-id');
            const wasEditing = modal.getAttribute('data-mode') === 'edit';

            modal.classList.remove('active');
            modal.removeAttribute('data-mode');
            modal.removeAttribute('data-edit-id');

            // If we were editing, reopen the view modal
            if (wasEditing && editId) {
                window.logic.openContributionViewModal(editId);
            }
        }
    };

    window.logic.deleteContribution = function () {
        const id = window.logic.currentContributionId;
        if (!id) return;
        if (confirm('Вы уверены, что хотите удалить этот вклад?')) {
            window.logic.deleteContributionFromGrist(id).then(() => {
                window.logic.closeContributionViewModal();
            });
        }
    };

    window.logic.createContribution = function () {
        var modal = document.getElementById('contributionCreateModal');
        var mode = modal.getAttribute('data-mode') || 'create';

        var period = document.getElementById('createPeriod').value;
        var code = document.getElementById('createCode').value;
        var desc = document.getElementById('createDescription').value;
        var res = document.getElementById('createResult').value;

        if (!code || !desc) { alert('Пожалуйста, заполните Код и Описание'); return; }

        if (mode === 'edit') {
            const id = modal.getAttribute('data-edit-id');
            const c = window.logic.contributions.find(x => x.id == id);
            if (c) {
                // Update local object first for UI responsiveness (optional, but wait for save is safer)
                // We'll construct the updated object to pass to save
                c.period = period;
                c.code = code;
                c.description = desc;
                c.result = res;
                const author = (typeof currentSettings !== 'undefined' && currentSettings.userName) ? currentSettings.userName : 'User';
                window.logic.addHistoryEntry(c, 'Вклад отредактирован', author);

                window.logic.renderContributions(); // Refresh list immediately with new data

                window.logic.saveContributionToGrist(c, false).then(() => {
                    window.logic.closeContributionCreateModal();
                });
            }
        } else {
            const newContribution = {
                id: Date.now().toString(), // Generate simplified ID for Options storage
                code: code,
                period: period,
                date: new Date().toLocaleDateString('ru-RU'),
                description: desc,
                result: res,
                status: 'pending',
                comments: [],
                history: [
                    {
                        date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        text: 'Вклад создан',
                        author: (typeof currentSettings !== 'undefined' && currentSettings.userName) ? currentSettings.userName : 'User'
                    }
                ]
            };
            // Add to local array immediately
            window.logic.contributions.unshift(newContribution);
            window.logic.renderContributions();

            window.logic.saveContributionToGrist(newContribution, true).then(() => {
                window.logic.closeContributionCreateModal();
            });
        }
    };

    window.logic.openContributionViewModal = function (id) {
        const c = window.logic.contributions.find(x => x.id == id);
        if (!c) return;
        window.logic.currentContributionId = id;

        if (document.getElementById('viewCode')) document.getElementById('viewCode').innerText = c.code || 'NO CODE';

        // Initialize Custom Dropdown
        const statusMap = { 'pending': 'НА ПРОВЕРКЕ', 'approved': 'ОДОБРЕНО', 'rejected': 'ОТКЛОНЕНО' };
        const statusText = document.getElementById('currentStatusText');
        if (statusText) statusText.innerText = statusMap[c.status];

        const selectedOption = document.querySelector('#statusDropdown .selected-option');
        if (selectedOption) {
            selectedOption.classList.remove('status-pending', 'status-approved', 'status-rejected');
            selectedOption.classList.add(`status-${c.status}`);
        }

        document.getElementById('viewPeriod').innerText = c.period || '-';
        document.getElementById('viewDate').innerText = c.date;
        document.getElementById('viewDescription').innerText = c.description;
        document.getElementById('viewResult').innerText = c.result || '-';

        window.logic.renderComments(c.comments);
        window.logic.renderHistory(c.history || []);

        document.getElementById('contributionViewModal').classList.add('active');
    };

    window.logic.closeContributionViewModal = function () {
        document.getElementById('contributionViewModal').classList.remove('active');
        window.logic.currentContributionId = null;
    };

    window.logic.toggleStatusDropdown = function () {
        const dropdown = document.getElementById('statusDropdown');
        if (dropdown) dropdown.classList.toggle('active');
    };

    window.logic.selectStatus = function (newStatus) {
        window.logic.updateStatus(newStatus);
        const dropdown = document.getElementById('statusDropdown');
        if (dropdown) dropdown.classList.remove('active');
    };

    window.logic.updateStatus = function (newStatus) {
        const id = window.logic.currentContributionId;
        const c = window.logic.contributions.find(x => x.id == id);
        if (!c) return;

        const oldStatus = c.status;
        if (oldStatus === newStatus) return;

        c.status = newStatus;
        const statusMap = { 'pending': 'НА ПРОВЕРКЕ', 'approved': 'ОДОБРЕНО', 'rejected': 'ОТКЛОНЕНО' };
        const author = (typeof currentSettings !== 'undefined' && currentSettings.userName) ? currentSettings.userName : 'User';
        window.logic.addHistoryEntry(c, `Статус изменен с ${statusMap[oldStatus]} на ${statusMap[newStatus]}`, author);

        // Update Custom Dropdown UI
        const statusText = document.getElementById('currentStatusText');
        if (statusText) statusText.innerText = statusMap[newStatus];

        const selectedOption = document.querySelector('#statusDropdown .selected-option');
        if (selectedOption) {
            selectedOption.classList.remove('status-pending', 'status-approved', 'status-rejected');
            selectedOption.classList.add(`status-${newStatus}`);
        }

        window.logic.renderHistory(c.history); // Update History UI immediately
        window.logic.renderContributions(); // Refresh the list card immediately to reflect status change

        window.logic.saveContributionToGrist(c, false);
    };

    // Close dropdown when clicking outside
    document.addEventListener('click', function (event) {
        if (!event.target.closest('.custom-select')) {
            const dropdowns = document.getElementsByClassName('custom-select');
            for (let i = 0; i < dropdowns.length; i++) {
                dropdowns[i].classList.remove('active');
            }
        }
    });

    window.logic.addHistoryEntry = function (contribution, text, author) {
        if (!contribution.history) contribution.history = [];
        contribution.history.unshift({
            date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: text,
            author: author || 'System'
        });
    };

    window.logic.renderComments = function (comments) {
        const list = document.getElementById('commentsList');
        if (!list) return;
        list.innerHTML = '';
        comments.forEach((comment, index) => {
            const item = document.createElement('div');
            item.className = 'comment-item';

            // Check if current user is author
            const currentUser = (typeof currentSettings !== 'undefined' && currentSettings.userName) ? currentSettings.userName : 'User';
            const isMine = comment.author === currentUser;

            if (isMine) item.classList.add('mine');

            const deleteBtn = `<button class="delete-comment-btn" onclick="window.logic.deleteComment(${index})" title="Удалить">×</button>`;

            item.innerHTML = `
                <div class="comment-header">
                    <span class="comment-author">${comment.author}</span>
                    <span class="comment-date">${comment.date}</span>
                    ${deleteBtn}
                </div>
                <div class="comment-text">${comment.text}</div>
            `;
            list.appendChild(item);
        });
        setTimeout(() => list.scrollTop = list.scrollHeight, 0);
    };

    window.logic.deleteComment = function (index) {
        if (!confirm('Удалить этот комментарий?')) return;

        const c = window.logic.contributions.find(x => x.id == window.logic.currentContributionId);
        if (c && c.comments && c.comments[index]) {
            const deletedComment = c.comments[index];
            c.comments.splice(index, 1);

            const author = (typeof currentSettings !== 'undefined' && currentSettings.userName) ? currentSettings.userName : 'User';
            window.logic.addHistoryEntry(c, 'Комментарий удален', author);

            window.logic.renderComments(c.comments);
            window.logic.renderHistory(c.history);
            window.logic.renderContributions(); // Refresh main list

            window.logic.saveContributionToGrist(c, false);
        }
    };

    window.logic.renderHistory = function (history) {
        const list = document.getElementById('historyList');
        if (!list) return;
        list.innerHTML = '';
        if (!history || history.length === 0) {
            list.innerHTML = '<div style="color:#999; font-size:12px;">Нет истории изменений</div>';
            return;
        }
        history.forEach(h => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <div class="history-date">${h.date}</div>
                <div class="history-content">
                    <span class="history-text">${h.text}</span>
                    <span class="history-author">${h.author}</span>
                </div>
            `;
            list.appendChild(item);
        });
    };

    window.logic.addComment = function () {
        const textInput = document.getElementById('newCommentText');
        const text = textInput.value.trim();
        if (!text) return;

        const c = window.logic.contributions.find(x => x.id == window.logic.currentContributionId);
        if (c) {
            const author = (typeof currentSettings !== 'undefined' && currentSettings.userName) ? currentSettings.userName : 'User';
            c.comments.push({
                author: author,
                date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
                text: text
            });
            window.logic.addHistoryEntry(c, 'Добавлен комментарий', author);
            window.logic.renderComments(c.comments);
            window.logic.renderHistory(c.history);

            window.logic.renderContributions(); // Refresh list to show new comment immediately

            window.logic.saveContributionToGrist(c, false);
            textInput.value = '';
        }
    };
} else {
    console.error("Window Logic not found for contribution.js")
}

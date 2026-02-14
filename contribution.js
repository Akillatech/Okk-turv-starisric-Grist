// =================== CONTRIBUTIONS LOGIC ===================

if (window.logic) {
    // Data Store
    window.logic.contributions = [];
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


    // --- GRIST API INTEGRATION ---
    window.logic.initContributions = async function () {
        console.log("Initializing Contributions with Grist...");
        try {
            await window.logic.fetchContributions();
        } catch (e) {
            console.error("Failed to fetch contributions:", e);
            window.logic.showNotification("Ошибка загрузки данных", true);
        }
    };

    window.logic.fetchContributions = async function () {
        if (!window.grist) return;
        try {
            // Fetch from Grist table 'Contributions'
            const tableData = await grist.docApi.fetchTable('Contributions');

            // Map Grist rows to internal structure
            window.logic.contributions = tableData.id.map((id, index) => {
                return {
                    id: id, // Grist Row ID
                    code: tableData.Code[index] || '',
                    period: tableData.Period[index] || '',
                    date: parseGristDate(tableData.Date[index])?.toLocaleDateString('ru-RU') || '', // Format for display
                    description: tableData.Description[index] || '',
                    result: tableData.Result[index] || '',
                    status: tableData.Status[index] || 'pending',
                    comments: safeJSONParse(tableData.Comments[index], []),
                    history: safeJSONParse(tableData.History[index], [])
                };
            });

            window.logic.renderContributions();
        } catch (e) {
            console.error("Error fetching contributions:", e);
        }
    };

    // Helper for JSON parsing
    function safeJSONParse(str, fallback) {
        try {
            return str ? JSON.parse(str) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    // Helper: Convert Date string back to Grist format (if needed, usually mapped automatically if column is Date)
    // For now assuming Grist handles strings or Date objects. 
    // Best practice: Send Date object or timestamp for Date columns, String for Text. 

    window.logic.saveContributionToGrist = async function (contribution, isNew = false) {
        window.logic.showNotification("Сохранение...");

        const rowData = {
            Code: contribution.code,
            Period: contribution.period,
            Date: new Date(), // Update Date to now? Or keep original? Let's keep create date for new, update date for edits if needed. 
            // Actually, usually 'Date' is creation date.
            Description: contribution.description,
            Result: contribution.result,
            Status: contribution.status,
            Comments: JSON.stringify(contribution.comments),
            History: JSON.stringify(contribution.history)
        };

        if (isNew) {
            // For new records, we might want to set the Date explicitly
            rowData.Date = new Date(); // Unix timestamp or JS Date usually works
        }

        try {
            if (isNew) {
                await grist.docApi.applyUserActions([
                    ['AddRecord', 'Contributions', null, rowData]
                ]);
            } else {
                await grist.docApi.applyUserActions([
                    ['UpdateRecord', 'Contributions', contribution.id, rowData]
                ]);
            }
            window.logic.showNotification("Все изменения сохранены");
            await window.logic.fetchContributions(); // Refresh to get IDs etc
            // Re-open view if editing?
            if (window.logic.currentContributionId && !isNew) {
                window.logic.openContributionViewModal(window.logic.currentContributionId);
            }
        } catch (e) {
            console.error("Save failed:", e);
            window.logic.showNotification("Ошибка сохранения!", true);
        }
    };

    window.logic.deleteContributionFromGrist = async function (id) {
        window.logic.showNotification("Удаление...");
        try {
            await grist.docApi.applyUserActions([
                ['RemoveRecord', 'Contributions', id]
            ]);
            window.logic.showNotification("Вклад удален");
            await window.logic.fetchContributions();
        } catch (e) {
            console.error("Delete failed:", e);
            window.logic.showNotification("Ошибка удаления!", true);
        }
    };


    // --- UI LOGIC (Updated to use API) ---

    window.logic.renderContributions = function () {
        const grid = document.getElementById('contributionsGrid');
        if (!grid) return;

        // Stats
        var total = window.logic.contributions.length;
        var approved = window.logic.contributions.filter(c => c.status === 'approved').length;
        var rejected = window.logic.contributions.filter(c => c.status !== 'approved' && c.status !== 'pending').length;

        if (document.getElementById('contribTotalHeader')) document.getElementById('contribTotalHeader').textContent = total;
        if (document.getElementById('contribApprovedHeader')) document.getElementById('contribApprovedHeader').textContent = approved;
        if (document.getElementById('contribRejectedHeader')) document.getElementById('contribRejectedHeader').textContent = rejected;

        grid.innerHTML = '';
        window.logic.contributions.forEach(c => {
            const card = document.createElement('div');
            card.className = 'contribution-card';
            card.onclick = () => window.logic.openContributionViewModal(c.id);

            var statusColor = c.status === 'approved' ? '#d4edda' : (c.status === 'pending' ? '#fff3cd' : '#f8d7da');
            var statusText = c.status === 'approved' ? 'ОДОБРЕНО' : (c.status === 'pending' ? 'НА ПРОВЕРКЕ' : 'ОТКЛОНЕНО');

            card.innerHTML = `
                <div class="contribution-card-title">${c.code || 'NO CODE'}</div>
                <div style="font-size:12px; color:var(--text-secondary); margin:4px 0;">${c.period || '-'}</div>
                <div style="font-size:12px; margin-bottom:8px;">${c.description ? c.description.slice(0, 50) + '...' : 'Нет описания'}</div>
                <div style="margin-top:auto; display:flex; justify-content:space-between; align-items:center;">
                    <span style="background:${statusColor}; padding:2px 8px; border-radius:4px; font-size:10px; font-weight:700;">${statusText}</span>
                    <span style="font-size:10px; color:var(--text-secondary);">${c.date}</span>
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
            modal.classList.remove('active');
            modal.removeAttribute('data-mode');
            modal.removeAttribute('data-edit-id');
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
                window.logic.addHistoryEntry(c, 'Вклад отредактирован', 'You');

                window.logic.saveContributionToGrist(c, false).then(() => {
                    window.logic.closeContributionCreateModal();
                });
            }
        } else {
            const newContribution = {
                // id will be assigned by Grist
                code: code,
                period: period,
                // date specific logic handled in save
                description: desc,
                result: res,
                status: 'pending',
                comments: [],
                history: [
                    {
                        date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        text: 'Вклад создан',
                        author: 'You'
                    }
                ]
            };
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
        window.logic.addHistoryEntry(c, `Статус изменен с ${statusMap[oldStatus]} на ${statusMap[newStatus]}`, 'You');

        // Update Custom Dropdown UI
        const statusText = document.getElementById('currentStatusText');
        if (statusText) statusText.innerText = statusMap[newStatus];

        const selectedOption = document.querySelector('#statusDropdown .selected-option');
        if (selectedOption) {
            selectedOption.classList.remove('status-pending', 'status-approved', 'status-rejected');
            selectedOption.classList.add(`status-${newStatus}`);
        }

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
        comments.forEach(comment => {
            const item = document.createElement('div');
            item.className = 'comment-item';
            if (comment.author === 'You') item.classList.add('mine');

            item.innerHTML = `
                <div class="comment-header">
                    <span class="comment-author">${comment.author}</span>
                    <span class="comment-date">${comment.date}</span>
                </div>
                <div class="comment-text">${comment.text}</div>
            `;
            list.appendChild(item);
        });
        setTimeout(() => list.scrollTop = list.scrollHeight, 0);
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
            const author = 'You';
            c.comments.push({
                author: author,
                date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
                text: text
            });
            window.logic.addHistoryEntry(c, 'Добавлен комментарий', author);
            window.logic.renderComments(c.comments);
            window.logic.renderHistory(c.history);
            window.logic.saveContributionToGrist(c, false);
            textInput.value = '';
        }
    };
} else {
    console.error("Window Logic not found for contribution.js")
}


// --- Settings UI ---

function renderSettingsUI() {
    // Render holidays
    const holidayContainer = document.getElementById('holidaysList');
    holidayContainer.innerHTML = '';
    (currentSettings.holidays || []).forEach((h, index) => {
        const chip = document.createElement('div');
        chip.className = 'date-chip';
        chip.innerHTML = `${h} <button class="remove-date" onclick="removeSetting('holidays', ${index})">×</button>`;
        holidayContainer.appendChild(chip);
    });

    // Render short days
    const shortContainer = document.getElementById('shortDaysList');
    shortContainer.innerHTML = '';
    (currentSettings.shortDays || []).forEach((h, index) => {
        const chip = document.createElement('div');
        chip.className = 'date-chip';
        chip.innerHTML = `${h} <button class="remove-date" onclick="removeSetting('shortDays', ${index})">×</button>`;
        shortContainer.appendChild(chip);
    });

    // Render year list for removing
    const yearSelect = document.getElementById('calendarYear');
    yearSelect.innerHTML = '';
    (currentSettings.years || []).forEach(y => {
        const opt = document.createElement('option');
        opt.value = y;
        opt.innerText = y;
        yearSelect.appendChild(opt);
    });
}

// Global scope function for onclick access
window.removeSetting = function (type, index) {
    if (currentSettings[type]) {
        currentSettings[type].splice(index, 1);
        renderSettingsUI();
    }
};

// --- Calendar Renderer ---

function renderCalendar() {
    const monthSelect = document.getElementById('calendarMonthSelect');
    const yearSelect = document.getElementById('calendarYearSelect');

    // Initial populate if empty
    if (yearSelect.options.length === 0) updateYearSelects();

    const month = parseInt(monthSelect.value);
    const year = parseInt(yearSelect.value);

    const grid = document.getElementById('calendarGrid');
    // Clear old days (keep headers)
    const headers = Array.from(grid.querySelectorAll('.calendar-header-cell'));
    grid.innerHTML = '';
    headers.forEach(h => grid.appendChild(h));

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Start date for grid (start of week)
    let startDate = new Date(firstDay);
    // Adjust to Monday start (0=Sun, 1=Mon)
    let day = startDate.getDay();
    let diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
    startDate.setDate(diff); // Now Monday of the first week

    // Create 6 weeks
    for (let i = 0; i < 42; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);

        // Week number column
        if (i % 7 === 0) {
            const weekNum = getISOWeek(d);
            const wCell = document.createElement('div');
            wCell.className = 'week-number-cell';
            wCell.innerText = weekNum;
            grid.appendChild(wCell);
        }

        const cell = document.createElement('div');
        cell.className = 'day-cell';

        // Classes
        const isoDate = formatDateShort(d); // DD.MM
        const isCurrentMonth = d.getMonth() === month;

        if (!isCurrentMonth) cell.classList.add('empty'); // Style for other month days

        if (isCurrentMonth) {
            // Check properties
            if (isHoliday(isoDate) || d.getDay() === 0 || d.getDay() === 6) {
                cell.classList.add('weekend');
                if (isHoliday(isoDate)) {
                    cell.classList.add('holiday');
                }
            }
            if (isShortDay(isoDate)) cell.classList.add('short-day');

            // Check today
            const now = new Date();
            if (d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
                cell.classList.add('today');
            }

            // Content
            let html = `<div class="day-number">${d.getDate()}</div>`;
            if (isHoliday(isoDate)) html += `<div class="holiday-name">Праздник</div>`;
            if (isShortDay(isoDate)) html += `<div class="holiday-name" style="color:#fbc02d">Сокр. день</div>`;

            // Compact Stats
            const dayStats = calculateDayStatsCompact(d);
            if (dayStats) {
                html += `<div class="day-stats-compact">`;
                if (dayStats.hours > 0) html += `<span class="stat-pill hours">${formatNum(dayStats.hours)}ч</span>`;
                if (dayStats.tasks > 0) html += `<span class="stat-pill tasks">${dayStats.tasks}з</span>`;
                html += `</div>`;
            }

            cell.innerHTML = html;

            // Click to open Day Modal
            cell.onclick = () => openDayModal(d);
            cell.style.cursor = 'pointer';
        }

        grid.appendChild(cell);
    }
}

function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function calculateDayStatsCompact(date) {
    // Filter data for this specific day
    const result = { hours: 0, tasks: 0 };
    // Optimize: Pre-index data by date? For now, simple iteration
    date.setHours(0, 0, 0, 0);
    const time = date.getTime();

    // Can rely on global allRecords
    // This optimization is crucial if methods are called 42 times per render
    // Ideally we should compute month stats once.
    // For MVP, linear scan might be slow if thousands of records.
    // Let's rely on simple filter.

    allRecords.forEach(row => {
        const d = parseGristDate(getRecVal(row, 'date'));
        if (!d) return;
        d.setHours(0, 0, 0, 0);
        if (d.getTime() === time) {
            const pure = Number(getRecVal(row, 'pureHours')) || 0;
            const markup = Number(getRecVal(row, 'markupHours')) || 0;
            const additional = Number(getRecVal(row, 'additionalHours')) || 0;
            const checked = Number(getRecVal(row, 'checkedTasks')) || 0;
            const marked = Number(getRecVal(row, 'markedTasks')) || 0;

            // Logic from DataService: what counts for "Compact Stats"?
            // Usually sum of work
            result.hours += pure + markup + additional;
            result.tasks += checked + marked;
        }
    });

    return (result.hours > 0 || result.tasks > 0) ? result : null;
}

function openDayModal(date) {
    const modal = document.getElementById('dayModal');
    document.getElementById('dayModalTitle').innerText = formatDateShort(date) + ' ' + date.getFullYear();
    modal.classList.add('active');

    // Calculate full stats for day
    // Reuse logic from DataService getDayStatistics
    const stats = calculateFullDayStats(date);

    setText('dayWorkHours', formatNum(stats.totalHours));
    setText('dayProjects', stats.projects.length);
    setText('dayCheckedTasks', stats.totalTasks);

    // Render Table
    const tbody = document.getElementById('dayProjectsBody');
    tbody.innerHTML = '';

    stats.projects.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="project-name">${p.name}</td>
            <td>${formatNum(p.checkHours)}</td>
            <td>${p.checked}</td>
            <td>-</td> 
            <td>${formatNum(p.markupHours)}</td>
            <td>${p.marked}</td>
            <td>-</td> 
            <td>${formatNum(p.otherHours)}</td>
            <td><strong>${formatNum(p.totalHours)}</strong></td>
        `;
        tbody.appendChild(tr);
    });
}

function calculateFullDayStats(date) {
    // Ported from getDayStatistics
    date.setHours(0, 0, 0, 0);
    const time = date.getTime();
    const projectsMap = {};
    let totalHours = 0;
    let totalTasks = 0;

    allRecords.forEach(row => {
        const d = parseGristDate(getRecVal(row, 'date'));
        if (!d) return;
        d.setHours(0, 0, 0, 0);

        if (d.getTime() === time) {
            const projectName = getRecVal(row, 'project') || 'Без проекта';

            const pure = Number(getRecVal(row, 'pureHours')) || 0;
            const checked = Number(getRecVal(row, 'checkedTasks')) || 0;
            const markup = Number(getRecVal(row, 'markupHours')) || 0;
            const marked = Number(getRecVal(row, 'markedTasks')) || 0;
            const additional = Number(getRecVal(row, 'additionalHours')) || 0;

            // Checkboxes
            const isProject = getRecVal(row, 'projectCheck');
            // Logic: checkHours only if project check?
            const checkHours = isProject ? pure : 0;

            if (!projectsMap[projectName]) {
                projectsMap[projectName] = {
                    name: projectName,
                    checkHours: 0, markupHours: 0, checked: 0, marked: 0, otherHours: 0, totalHours: 0
                };
            }

            projectsMap[projectName].checkHours += checkHours;
            projectsMap[projectName].checked += checked; // Is checked tasks dependent on checkbox? GAS: "var checked = (isProjectChecked && checkedIndex !== -1) ? val : 0;" YES.
            projectsMap[projectName].markupHours += markup;
            projectsMap[projectName].marked += marked;

            // Other Hours logic: if additional > 0, adds to "Иные задачи" project?
            // GAS: "if (additionalHours > 0) { var otherProjectName = 'Иные задачи'; ... }"
            if (additional > 0) {
                const otherName = 'Иные задачи';
                if (!projectsMap[otherName]) projectsMap[otherName] = { name: otherName, totalHours: 0, otherHours: 0, checkHours: 0, markupHours: 0, checked: 0, marked: 0 };
                projectsMap[otherName].otherHours += additional;
                projectsMap[otherName].totalHours += additional;
                totalHours += additional;
            }

            // Add to project total
            projectsMap[projectName].totalHours += checkHours + markup;
            totalHours += checkHours + markup;
            totalTasks += checked + marked;
        }
    });

    return {
        totalHours,
        totalTasks,
        projects: Object.values(projectsMap).sort((a, b) => b.totalHours - a.totalHours)
    };
}


// --- Main Dashboard Renderer ---

function renderMainDashboard() {
    // 1. Weekly Stats
    // Only show if period is Month-specific (GAS behavior usually)
    const weeklySection = document.getElementById('weeklyStatsSection');
    if (currentPeriod.startsWith('month:')) {
        weeklySection.style.display = 'block';
        renderWeeklyStats();
    } else {
        weeklySection.style.display = 'none';
    }

    // 2. Projects
    document.getElementById('projectSection').style.display = 'block';
    renderProjectsTable();

    // 3. Overtime
    document.getElementById('overtimeSection').style.display = 'block';
    renderOvertimeTable();
}

function renderWeeklyStats() {
    // Parse period
    const parts = currentPeriod.replace('month:', '').split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);

    const stats = calculateWeeklyStats(allRecords, year, month);

    const tbody = document.getElementById('weeklyTableBody');
    tbody.innerHTML = '';

    stats.forEach(week => {
        const tr = document.createElement('tr');
        // Calculate workload %
        const workloadClass = week.workload < 80 ? 'low' : (week.workload > 120 ? 'high' : 'normal');

        tr.innerHTML = `
            <td>${week.label}</td>
            <td>${formatNum(week.totalHours)}</td>
            <td>${week.normHours}</td>
            <td>${formatNum(week.overtimeHours)}</td>
            <td>${formatNum(week.idleHours)}</td>
            <td>${formatNum(week.checkedTasks)}</td>
            <td>${formatNum(week.markedTasks)}</td>
            <td>
                <div class="workload-cell">
                    <div class="workload-percent ${workloadClass}">${week.workload}%</div>
                    <div class="workload-bar">
                        <div class="workload-fill ${workloadClass}" style="width: ${Math.min(week.workload, 100)}%"></div>
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function calculateWeeklyStats(records, year, month) {
    // Ported from calculateWeeklyStats (DataService)
    const weeks = {};
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    // Identify weeks
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
        const iso = getISOWeek(d);
        const key = 'W' + iso;
        if (!weeks[key]) {
            weeks[key] = { label: key, weekNumber: iso, totalHours: 0, normHours: 0, overtimeHours: 0, idleHours: 0, checkedTasks: 0, markedTasks: 0 };
        }
        weeks[key].normHours += getDayNorm(d);
    }

    records.forEach(row => {
        const d = parseGristDate(getRecVal(row, 'date'));
        if (!d) return;
        if (d.getFullYear() !== year || d.getMonth() !== month - 1) return;

        const iso = getISOWeek(d);
        const key = 'W' + iso;
        if (weeks[key]) {
            const pure = Number(getRecVal(row, 'pureHours')) || 0;
            const additional = Number(getRecVal(row, 'additionalHours')) || 0;
            const markup = Number(getRecVal(row, 'markupHours')) || 0;
            const overtime = Number(getRecVal(row, 'overtimeHours')) || 0;
            const idle = Number(getRecVal(row, 'idleHours')) || 0;

            weeks[key].totalHours += pure + additional + markup; // Total active hours
            weeks[key].overtimeHours += overtime;
            weeks[key].idleHours += idle;
            weeks[key].checkedTasks += (Number(getRecVal(row, 'checkedTasks')) || 0);
            weeks[key].markedTasks += (Number(getRecVal(row, 'markedTasks')) || 0);
        }
    });

    return Object.values(weeks).sort((a, b) => a.weekNumber - b.weekNumber).map(w => {
        w.workload = w.normHours > 0 ? Math.round((w.totalHours / w.normHours) * 100) : 0;
        return w;
    });
}

function renderProjectsTable() {
    const data = filterByPeriod(allRecords, currentPeriod);
    const projects = analyzeProjects(data);

    const tbody = document.getElementById('projectTableBody');
    tbody.innerHTML = '';

    projects.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = 'clickable-row';
        tr.onclick = () => openProjectModal(p.name);

        tr.innerHTML = `
            <td><div class="project-name">${p.name}</div></td>
            <td>${formatNum(p.checkHours)}</td>
            <td><span class="project-badge badge-tasks">${p.tasks}</span></td>
            <td>${formatNum(p.avgMainTasks)}</td>
            <td>${formatNum(p.markupHours)}</td>
            <td><span class="project-badge badge-count">${p.markupTasks}</span></td>
            <td>${formatNum(p.avgMarkupTasks)}</td>
            <td>${formatNum(p.additionalHours)}</td>
            <td><strong>${formatNum(p.totalHours)}</strong></td>
        `;
        tbody.appendChild(tr);
    });
}

function analyzeProjects(records) {
    const map = {};

    records.forEach(row => {
        // Only include if "Project" checked OR "Other" (Additional), "Markup"?
        // GAS logic: Groups by Project Name (Column H). 
        // Then sums based on checkbox logic.

        const name = getRecVal(row, 'project') || 'Без проекта';

        if (!map[name]) map[name] = {
            name: name,
            checkHours: 0, tasks: 0, markupHours: 0, markupTasks: 0, additionalHours: 0, totalHours: 0,
            hasWork: false
        };

        const pure = Number(getRecVal(row, 'pureHours')) || 0;
        const additional = Number(getRecVal(row, 'additionalHours')) || 0;
        const markup = Number(getRecVal(row, 'markupHours')) || 0;

        const tasks = Number(getRecVal(row, 'checkedTasks')) || 0;
        const mTasks = Number(getRecVal(row, 'markedTasks')) || 0;

        const isProject = getRecVal(row, 'projectCheck');
        const isMarkup = getRecVal(row, 'markupCheck');
        const isOther = getRecVal(row, 'otherCheck');

        // Sums
        if (isProject) {
            map[name].checkHours += pure;
            map[name].tasks += tasks;
            map[name].hasWork = true;
        }
        if (isMarkup) {
            map[name].markupHours += markup;
            map[name].markupTasks += mTasks;
            map[name].hasWork = true;
        }
        if (isOther) {
            map[name].additionalHours += additional;
            map[name].hasWork = true;
        }

        // Total is sum of components
        // Note: Logic implies we only sum components that are "active" via checkboxes?
        // GAS: result.totalHours += pure + additional + markup (inside filter loop)
        // Let's assume yes.
        map[name].totalHours = map[name].checkHours + map[name].markupHours + map[name].additionalHours;
    });

    // Filter out empties?
    const list = Object.values(map).filter(p => p.hasWork || p.totalHours > 0);

    // Calculate Avgs
    list.forEach(p => {
        p.avgMainTasks = p.checkHours > 0 ? (p.tasks / p.checkHours) : 0;
        p.avgMarkupTasks = p.markupHours > 0 ? (p.markupTasks / p.markupHours) : 0;
    });

    // Default Sort (Total Hours desc)
    return list.sort((a, b) => b.totalHours - a.totalHours);
}

function renderOvertimeTable() {
    const data = filterByPeriod(allRecords, currentPeriod);
    const list = analyzeOvertime(data);

    const tbody = document.getElementById('overtimeTableBody');
    tbody.innerHTML = '';

    list.forEach(o => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><div class="project-name">${o.name}</div></td>
            <td>${o.tasks}</td>
            <td><span class="project-badge badge-hours">${formatNum(o.hours)}</span></td>
            <td>${o.entries}</td>
            <td>${formatNum(o.avgHours)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function analyzeOvertime(records) {
    const map = {};

    records.forEach(row => {
        // Filter by Overtime Checkbox
        if (!getRecVal(row, 'overtimeCheck')) return;

        const name = getRecVal(row, 'project') || 'Без проекта';
        if (!map[name]) map[name] = {
            name: name,
            hours: 0, tasks: 0, entries: 0
        };

        const over = Number(getRecVal(row, 'overtimeHours')) || 0;
        // Tasks? Does overtime imply checked/marked tasks?
        // GAS "overtime" usually just hours. But maybe "Checked Tasks" are relevant?
        // Let's count checked tasks if present.
        const t = Number(getRecVal(row, 'checkedTasks')) || 0;

        map[name].hours += over;
        map[name].tasks += t;
        map[name].entries += 1;
    });

    const list = Object.values(map);
    list.forEach(o => {
        o.avgHours = o.tasks > 0 ? (o.hours / o.tasks) : 0; // Avg hours per task? Or reverse?
        // "Avg hours per task" -> Hours / Tasks
    });

    return list.sort((a, b) => b.hours - a.hours);
}


// --- Project Modal Details ---

function openProjectModal(projectName) {
    const modal = document.getElementById('projectModal');
    document.getElementById('projectModalTitle').innerText = projectName;
    modal.classList.add('active');

    // Setup filters in modal based on main dashboard?
    // Populate modal Year Select
    // Default to current selection

    // Trigger load
    // Need current year/month context. If "All", use defaults (Current Year)
    let y = new Date().getFullYear();
    let m = 0; // All

    if (currentPeriod.startsWith('year:')) {
        y = parseInt(currentPeriod.replace('year:', ''));
    } else if (currentPeriod.startsWith('month:')) {
        const p = currentPeriod.replace('month:', '').split('-');
        y = parseInt(p[0]);
        m = parseInt(p[1]);
    }

    // Set selects
    // Note: ProjectModal selects need similar population logic.
    // We reuse updateYearSelects() which should have handled 'projectYearSelect'
    const ySel = document.getElementById('projectYearSelect');
    if (ySel) ySel.value = y;

    const mSel = document.getElementById('projectMonthSelect');
    if (mSel) mSel.value = m;

    renderProjectDetails(projectName, y, m);
}

function renderProjectDetails(projectName, year, month) {
    // Show Loading
    document.getElementById('projectLoading').style.display = 'flex';
    document.getElementById('projectContent').style.display = 'none';

    // Calculate stats
    setTimeout(() => { // Small delay to allow UI to render Loading
        const stats = calculateProjectWeeklyInternal(projectName, year, month);

        setText('projectTotalHours', formatNum(stats.totalHours));
        setText('projectTotalTasks', formatNum(stats.totalTasks));
        setText('projectAvgHours', formatNum(stats.avgHoursPerWeek));

        const tbody = document.getElementById('projectWeeklyBody');
        tbody.innerHTML = '';

        stats.weeks.forEach(w => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${w.weekNum}</td>
                <td>${w.dateRange}</td>
                <td>${formatNum(w.pureHours)}</td>
                <td>${formatNum(w.tasks)}</td>
                <td>${formatNum(w.avgMain)}</td>
                <td>${formatNum(w.markupHours)}</td>
                <td>${formatNum(w.markupTasks)}</td>
                <td>${formatNum(w.avgMarkup)}</td>
                <td>${formatNum(w.additionalHours)}</td>
                <td><strong>${formatNum(w.totalHours)}</strong></td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('projectLoading').style.display = 'none';
        document.getElementById('projectContent').style.display = 'block';
    }, 10);
}

function calculateProjectWeeklyInternal(projectName, year, month) {
    // Ported from getProjectWeeklyStats
    let startDate, endDate;
    if (month === 0) {
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59);
    } else {
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0, 23, 59, 59);
    }

    const weeklyMap = {};
    let totalHours = 0;
    let totalTasks = 0;

    allRecords.forEach(row => {
        const d = parseGristDate(getRecVal(row, 'date'));
        if (!d) return;
        d.setHours(0, 0, 0, 0);
        if (d < startDate || d > endDate) return;

        const pName = getRecVal(row, 'project') || 'Без проекта';
        if (pName !== projectName) return;

        // Match logic
        const weekNum = getISOWeek(d);
        const key = weekNum;

        if (!weeklyMap[key]) {
            // Calculate Range
            // Complex date calc for week range
            //  var weekStart = getWeekStart(d); // Need helper
            //  var weekEnd = ...
            weeklyMap[key] = {
                weekNum: weekNum,
                dateRange: '', // Todo
                pureHours: 0, tasks: 0, markupHours: 0, markupTasks: 0, additionalHours: 0, totalHours: 0
            };
        }

        const pure = Number(getRecVal(row, 'pureHours')) || 0;
        const additional = Number(getRecVal(row, 'additionalHours')) || 0;
        const markup = Number(getRecVal(row, 'markupHours')) || 0;

        const t = Number(getRecVal(row, 'checkedTasks')) || 0;
        const mT = Number(getRecVal(row, 'markedTasks')) || 0;

        weeklyMap[key].pureHours += pure;
        weeklyMap[key].additionalHours += additional;
        weeklyMap[key].markupHours += markup;
        weeklyMap[key].tasks += t;
        weeklyMap[key].markupTasks += mT;
        weeklyMap[key].totalHours += pure + additional + markup;

        totalHours += pure + additional + markup;
        totalTasks += t + mT;
    });

    const weeks = Object.values(weeklyMap).sort((a, b) => a.weekNum - b.weekNum);
    weeks.forEach(w => {
        // Calcs
        w.avgMain = w.pureHours > 0 ? (w.tasks / w.pureHours) : 0;
        w.avgMarkup = w.markupHours > 0 ? (w.markupTasks / w.markupHours) : 0;
    });

    return {
        totalHours,
        totalTasks,
        avgHoursPerWeek: weeks.length > 0 ? (totalHours / weeks.length) : 0,
        weeks
    };
}

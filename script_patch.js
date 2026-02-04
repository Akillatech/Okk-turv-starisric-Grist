
// --- Patch: Helpers & Fixes ---

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day == 0 ? -6 : 1); // Adjust when day is sunday
    d.setDate(diff);
    return d;
}

// Redefine calculateProjectWeeklyInternal to populate dateRange
function calculateProjectWeeklyInternal(projectName, year, month) {
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
            const wStart = getWeekStart(d);
            const wEnd = new Date(wStart);
            wEnd.setDate(wEnd.getDate() + 6);

            weeklyMap[key] = {
                weekNum: weekNum,
                dateRange: formatDateShort(wStart) + ' - ' + formatDateShort(wEnd),
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

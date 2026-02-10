/**
 * Grist Widget Logic
 * Ported from Google Apps Script
 */

const CONFIG = {
    // Column mapping: Map internal logic names to Grist Column IDs
    // Added 'B', 'H', 'K' etc based on logs from user's Grist table
    COLUMNS: {
        date: ['Дата', 'Date', 'B'],
        project: ['Наименование', 'Project', 'Проекты', 'H'],
        projectCheck: ['Проект', 'Project_Check', 'C'],

        // Pure Hours
        pureHours: ['Чистых_часов_валидации', 'Pure_Hours', 'Hours', 'K'],
        // Tasks Checked
        checkedTasks: ['Факт_проверок_шт', 'Checked_Tasks', 'Tasks_Checked', 'J'], // Assuming J is checked count based on 11

        // Markup Hours
        markupHours: ['Часов_разметки', 'Markup_Hours', 'Q'],
        // Tasks Marked
        markedTasks: ['Факт_разметка_шт', 'Marked_Tasks', 'P'], // Assuming P
        // Markup Checkbox (G = Разметка)
        markupCheck: ['Разметка', 'Markup_Check', 'G'],

        // Additional/Other Hours
        additionalHours: ['Иных_часов_работы', 'Other_Hours', 'Additional_Hours', 'L'],
        // Other Checkbox (D = Другое)
        otherCheck: ['Другое', 'Other_Check', 'D'],

        // Overtime Hours
        overtimeHours: ['Часы_переработки', 'Overtime_Hours', 'M'],
        // Overtime Checkbox (E = Переработки)
        overtimeCheck: ['Переработка', 'Overtime_Check', 'E'],

        // Idle Hours
        idleHours: ['Часы_простоя', 'Idle_Hours', 'N']
    }
};

// Global State
let allRecords = [];
let tableColumns = []; // Store column list
let currentSettings = {
    holidays: [],
    shortDays: [],
    years: []
};
let currentPeriod = 'all'; // 'all', 'month:YYYY-M', 'year:YYYY'

// Helper to access record field using multiple potential names
function getRecVal(record, keyName) {
    const potentialNames = CONFIG.COLUMNS[keyName];
    if (!potentialNames) return null;

    for (const name of potentialNames) {
        if (record.hasOwnProperty(name)) return record[name];
        // Also try sanitized variants just in case (replace spaces with _)
        const sanitized = name.replace(/[\s\.]/g, '_');
        if (record.hasOwnProperty(sanitized)) return record[sanitized];
    }
    return null;
}

// Helper to parse date from Grist record
// Grist returns dates as seconds timestamps (numbers) or Date objects? 
// Usually numbers (seconds since epoch in Plugin API? No, Grist standard is Python-like but Plugin API might map to JS objects or timestamps)
// Documentation says: Date columns are Returned as numeric timestamps (seconds).
function parseGristDate(val) {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val === 'number') return new Date(val * 1000); // Grist timestamps are seconds
    // Legacy string parsing (dd.mm.yyyy)
    if (typeof val === 'string') {
        const parts = val.split('.');
        if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
        return new Date(val); // Try standard parsing
    }
    return null;
}

// Helper to auto-save settings to Grist
async function autoSaveSettings() {
    try {
        await grist.setOption('settings', currentSettings);
        console.log('Settings auto-saved');
    } catch (err) {
        console.error('Failed to auto-save settings:', err);
    }
}

// --- Grist Integration ---

function initGrist() {
    grist.ready({ requiredAccess: 'full' }); // Full access needed for settings (options)

    grist.onRecords(function (records, mappings) {
        console.log('RECORDS RECEIVED FROM GRIST API'); // Bold marker
        console.log('Count:', records ? records.length : 'null');
        console.log('Mappings:', mappings);
        console.log('Active CONFIG.COLUMNS.date:', CONFIG.COLUMNS.date); // Debug CONFIG

        if (records && records.length > 0) {
            console.log('Sample Record:', JSON.stringify(records[0]));
            console.log('Actual Keys in Record:', Object.keys(records[0]));

            // Test getRecVal immediately on the sample
            const testDateVal = getRecVal(records[0], 'date');
            console.log('Test getRecVal(date) on sample:', testDateVal);
        } else {
            console.warn('Records array is empty or null!');
        }

        allRecords = records || []; // Safety fallout

        // Infer columns from first record if available, or just use what we have
        if (allRecords.length > 0) {
            tableColumns = Object.keys(allRecords[0]);
        }

        // Initialize Date Selectors (Years/Months)
        initDateSelectors();

        // Initialize Today date pickers to current date
        initTodayDatePickers();

        // Hide loading and show content
        document.getElementById('loading').style.display = 'none';

        // Only switch to home if we are not already in a specific view (like calendar)
        // But for initial load, default to home
        if (document.getElementById('content').style.display === 'none' &&
            document.getElementById('calendarView').style.display === 'none') {
            window.logic.showHome();
        }

        // Initial Render
        refreshDashboard();
    });

    grist.onOptions(function (options) {
        // Load settings from options
        if (options && options.settings) {
            currentSettings = options.settings;
            console.log('Settings loaded:', currentSettings);

            // MIGRATION: Convert old format (array) to new format (object by year)
            if (Array.isArray(currentSettings.holidays)) {
                console.log('Migrating holidays from array to per-year format');
                const currentYear = new Date().getFullYear();
                currentSettings.holidays = {
                    [currentYear]: currentSettings.holidays
                };
            }
            if (Array.isArray(currentSettings.shortDays)) {
                console.log('Migrating shortDays from array to per-year format');
                const currentYear = new Date().getFullYear();
                currentSettings.shortDays = {
                    [currentYear]: currentSettings.shortDays
                };
            }

            // Ensure structure exists
            if (!currentSettings.holidays || typeof currentSettings.holidays !== 'object') {
                currentSettings.holidays = {};
            }
            if (!currentSettings.shortDays || typeof currentSettings.shortDays !== 'object') {
                currentSettings.shortDays = {};
            }

            updateCalendarSettingsTags(); // Update UI for settings if open
        } else {
            // Default settings if none
            currentSettings = {
                holidays: {},
                shortDays: {},
                years: []
            };

            // Try to load from LocalStorage as fallback (migration path)
            const localSettings = localStorage.getItem('okk_stats_settings');
            if (localSettings) {
                try {
                    currentSettings = JSON.parse(localSettings);
                    // Save to Grist options for persistence
                    grist.setOption('settings', currentSettings);
                } catch (e) { console.error('Error parsing local settings', e); }
            }
        }
        refreshDashboard(); // Settings might change stats (holidays etc)
    });
}

// Global flag to prevent resetting user selection on data updates
let dateSelectorsInitialized = false;

function initDateSelectors() {
    const years = new Set();
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12

    years.add(currentYear); // Ensure current year is always available

    if (allRecords) {
        allRecords.forEach(r => {
            const d = parseGristDate(getRecVal(r, 'date'));
            if (d) years.add(d.getFullYear());
        });
    }

    const sortedYears = Array.from(years).sort((a, b) => b - a);

    // --- Main Dashboard Selectors ---
    const yearSelect = document.getElementById('yearSelect');
    const monthSelect = document.getElementById('monthSelect');

    if (yearSelect && monthSelect) {
        const oldYear = yearSelect.value;
        const oldMonth = monthSelect.value;

        yearSelect.innerHTML = '<option value="all">Весь период</option>';
        sortedYears.forEach(y => {
            const opt = document.createElement('option');
            opt.value = y;
            opt.innerText = y;
            yearSelect.appendChild(opt);
        });

        if (!dateSelectorsInitialized) {
            // First Load: Set Defaults
            console.log('initDateSelectors: First Load. Setting Default to', currentYear, currentMonth);
            yearSelect.value = currentYear;
            monthSelect.value = currentMonth;
            // Update global state immediately
            currentPeriod = `month:${currentYear}-${currentMonth}`;
        } else {
            // Restore Selection
            console.log('initDateSelectors: Restore. Old:', oldYear, oldMonth);
            if (oldYear !== 'all' && sortedYears.includes(Number(oldYear))) {
                yearSelect.value = oldYear;
            } else if (oldYear === 'all') {
                yearSelect.value = 'all';
            } else {
                yearSelect.value = currentYear; // Fallback
            }
            // Month is static, keep value
            monthSelect.value = oldMonth;
        }
    }

    // --- Other Selectors (Project, Calendar) ---
    ['projectYearSelect', 'calendarYearSelect'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const oldVal = el.value;
            el.innerHTML = '';
            sortedYears.forEach(y => {
                const opt = document.createElement('option');
                opt.value = y;
                opt.innerText = y;
                el.appendChild(opt);
            });

            if (!dateSelectorsInitialized) {
                el.value = currentYear;
            } else {
                if (oldVal && sortedYears.includes(Number(oldVal))) el.value = oldVal;
                else el.value = currentYear;
            }
        }
    });

    // --- Calendar Month Default ---
    if (!dateSelectorsInitialized) {
        const calMonth = document.getElementById('calendarMonthSelect');
        if (calMonth) calMonth.value = new Date().getMonth(); // 0-indexed
    }

    dateSelectorsInitialized = true;
}

// --- Logic ---

window.logic = {
    // --- UI Events Exported to HTML ---

    applyCustomPeriod: function () {
        const year = document.getElementById('yearSelect').value;
        const month = document.getElementById('monthSelect').value;

        if (year === 'all') {
            currentPeriod = 'all';
        } else if (month === 'all') {
            currentPeriod = `year:${year}`;
        } else {
            currentPeriod = `month:${year}-${month}`;
        }

        refreshDashboard();
    },

    showHome: function () {
        showView('content');
    },

    showCalendar: function () {
        showView('calendarView');
        this.updateCalendarView(); // Trigger render
    },

    updateCalendarView: function () {
        renderCalendar();
    },

    prevMonth: function () {
        const monthSelect = document.getElementById('calendarMonthSelect');
        const yearSelect = document.getElementById('calendarYearSelect');
        let m = parseInt(monthSelect.value);
        let y = parseInt(yearSelect.value);

        m--;
        if (m < 0) {
            m = 11;
            y--;
            // Check if year exists
            const opts = yearSelect.options;
            let yearFound = false;
            for (let i = 0; i < opts.length; i++) if (opts[i].value == y) yearFound = true;
            if (!yearFound) {
                // Determine if we should allow generic navigation even if year not in settings?
                // Better to just update value and let logic handle empty year
            }
        }

        monthSelect.value = m;
        // Verify year update
        if (yearSelect.querySelector(`option[value="${y}"]`)) {
            yearSelect.value = y;
        } else {
            // If year not in list, add it temporarily?
            // Or just fail silently/stop at edge
        }
        renderCalendar();
    },

    nextMonth: function () {
        const monthSelect = document.getElementById('calendarMonthSelect');
        const yearSelect = document.getElementById('calendarYearSelect');
        let m = parseInt(monthSelect.value);
        let y = parseInt(yearSelect.value);

        m++;
        if (m > 11) {
            m = 0;
            y++;
        }
        monthSelect.value = m;
        if (yearSelect.querySelector(`option[value="${y}"]`)) {
            yearSelect.value = y;
        }
        renderCalendar();
    },

    // Settings
    openSettings: function () {
        document.getElementById('settingsModal').classList.add('active');
        renderSettingsUI();
    },

    closeSettings: function () {
        document.getElementById('settingsModal').classList.remove('active');
    },

    switchSettingsTab: function (tabName) {
        // Only one tab implemented for now
    },

    addHoliday: function () {
        const input = document.getElementById('newHoliday');
        const val = input.value.trim();
        if (val) {
            const yearSelect = document.getElementById('calendarYear');
            const year = yearSelect ? yearSelect.value : new Date().getFullYear().toString();

            if (!currentSettings.holidays) currentSettings.holidays = {};
            if (!currentSettings.holidays[year]) currentSettings.holidays[year] = [];

            if (!currentSettings.holidays[year].includes(val)) {
                currentSettings.holidays[year].push(val);
                input.value = '';
                renderSettingsUI();
                autoSaveSettings(); // Auto-save
            }
        }
    },

    addShortDay: function () {
        const input = document.getElementById('newShortDay');
        const val = input.value.trim();
        if (val) {
            const yearSelect = document.getElementById('calendarYear');
            const year = yearSelect ? yearSelect.value : new Date().getFullYear().toString();

            if (!currentSettings.shortDays) currentSettings.shortDays = {};
            if (!currentSettings.shortDays[year]) currentSettings.shortDays[year] = [];

            if (!currentSettings.shortDays[year].includes(val)) {
                currentSettings.shortDays[year].push(val);
                input.value = '';
                renderSettingsUI();
                autoSaveSettings(); // Auto-save
            }
        }
    },

    deleteYear: function () {
        const select = document.getElementById('calendarYear');
        const year = select.value;
        if (year && confirm('Удалить год ' + year + '?')) {
            currentSettings.years = currentSettings.years.filter(y => y.toString() !== year.toString());
            renderSettingsUI();
            updateYearSelects(); // Sync all year selectors
            autoSaveSettings(); // Auto-save
        }
    },

    addNewYear: function () {
        const newYear = prompt('Введите год:');
        if (newYear && !isNaN(newYear)) {
            if (!currentSettings.years) currentSettings.years = [];
            if (!currentSettings.years.includes(parseInt(newYear))) {
                currentSettings.years.push(parseInt(newYear));
                currentSettings.years.sort((a, b) => b - a);
                renderSettingsUI();
                updateYearSelects(); // Sync all year selectors
                autoSaveSettings(); // Auto-save
            }
        }
    },

    saveSettings: async function () {
        // Save to Grist Options
        await grist.setOption('settings', currentSettings);
        this.closeSettings();
        refreshDashboard(); // Refresh to apply changes (formatted holidays etc)
    },

    exportSettings: function () {
        // Export holidays and short days as JSON
        const data = {
            holidays: currentSettings.holidays || [],
            shortDays: currentSettings.shortDays || [],
            exportDate: new Date().toISOString()
        };

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `grist-calendar-settings-${new Date().toISOString().substring(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    importSettings: function () {
        // Import holidays and short days from JSON file
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    console.log('Imported JSON data:', data);
                    let holidaysCount = 0;
                    let shortDaysCount = 0;

                    // Helper: convert "MM-DD" to "DD.MM"
                    const convertDate = (mmdd) => {
                        const [month, day] = mmdd.split('-');
                        return `${day}.${month}`;
                    };

                    // Check format: old (array) or new (object with years)
                    if (data.holidays) {
                        console.log('Holidays type:', Array.isArray(data.holidays) ? 'Array' : 'Object');
                        if (Array.isArray(data.holidays)) {
                            // Old format: ["DD.MM", ...] - assign to current year
                            const currentYear = new Date().getFullYear().toString();
                            currentSettings.holidays = { [currentYear]: data.holidays };
                            holidaysCount = data.holidays.length;
                        } else if (typeof data.holidays === 'object') {
                            // New format: { "2026": ["MM-DD", ...], "2027": [...] }
                            // Convert MM-DD to DD.MM but KEEP year structure
                            currentSettings.holidays = {};
                            for (const year in data.holidays) {
                                console.log(`Processing holidays year ${year}:`, data.holidays[year]);
                                currentSettings.holidays[year] = data.holidays[year].map(mmdd => {
                                    const ddmm = convertDate(mmdd);
                                    console.log(`  ${mmdd} -> ${ddmm}`);
                                    holidaysCount++;
                                    return ddmm;
                                });
                            }
                            console.log('Final holidays:', currentSettings.holidays);
                        }
                    }

                    if (data.shortDays) {
                        console.log('ShortDays type:', Array.isArray(data.shortDays) ? 'Array' : 'Object');
                        if (Array.isArray(data.shortDays)) {
                            // Old format - assign to current year
                            const currentYear = new Date().getFullYear().toString();
                            currentSettings.shortDays = { [currentYear]: data.shortDays };
                            shortDaysCount = data.shortDays.length;
                        } else if (typeof data.shortDays === 'object') {
                            // New format - convert and preserve structure
                            currentSettings.shortDays = {};
                            for (const year in data.shortDays) {
                                console.log(`Processing shortDays year ${year}:`, data.shortDays[year]);
                                currentSettings.shortDays[year] = data.shortDays[year].map(mmdd => {
                                    const ddmm = convertDate(mmdd);
                                    console.log(`  ${mmdd} -> ${ddmm}`);
                                    shortDaysCount++;
                                    return ddmm;
                                });
                            }
                            console.log('Final shortDays:', currentSettings.shortDays);
                        }
                    }

                    renderSettingsUI();
                    autoSaveSettings(); // Auto-save imported settings
                    alert(`Импортировано: ${holidaysCount} праздников, ${shortDaysCount} сокращённых дней`);
                } catch (err) {
                    console.error('Import error:', err);
                    alert('Ошибка чтения файла: ' + err.message);
                }
            };
            reader.readAsText(file);
        };

        input.click();
    },

    // sorting
    sortWorkType: function (type, field) {
        // Implement simple table sorting
        // This requires state of current sort. 
        // For MVP, we might skip complex sort or implement basic DOM sort
        console.log('Sorting not implemented yet in this iteration');
    },

    // Project Modal
    loadProjectStats: function () {
        // Triggered by selects in modal
        // Re-calculate and render
        const pYear = document.getElementById('projectYearSelect').value;
        const pMonth = document.getElementById('projectMonthSelect').value;
        const modal = document.getElementById('projectModal');
        const title = document.getElementById('projectModalTitle').innerText;

        renderProjectDetails(title, parseInt(pYear), parseInt(pMonth));
    },

    closeProjectModal: function () {
        document.getElementById('projectModal').classList.remove('active');
    },

    closeDayModal: function () {
        document.getElementById('dayModal').classList.remove('active');
    },

    // Today
    returnToToday: function () {
        // Reset date pickers to today
        initTodayDatePickers(); // Will trigger change
        // Hide the return button
        document.getElementById('returnTodayBtn').style.display = 'none';
    },

    loadTodayRange: function () {
        renderTodayStats();

        // Show/hide return button based on whether dates match today
        const today = new Date().toISOString().substring(0, 10);
        const fromDate = document.getElementById('todayDateFrom').value;
        const toDate = document.getElementById('todayDateTo').value;
        const btn = document.getElementById('returnTodayBtn');

        if (fromDate === today && toDate === today) {
            btn.style.display = 'none';
        } else {
            btn.style.display = 'inline-flex';
        }
    }
};

// --- Initialization ---

// Initialize when script loads
initGrist();

// Setup initial UI states
function showView(viewId) {
    document.getElementById('content').style.display = viewId === 'content' ? 'block' : 'none';
    document.getElementById('calendarView').style.display = viewId === 'calendarView' ? 'block' : 'none';

    document.getElementById('homeBtn').classList.toggle('active', viewId === 'content');
    document.getElementById('calendarBtn').classList.toggle('active', viewId === 'calendarView');
}


// --- Data Calculation Core ---

function calculateStatistics(period) {
    const todayStats = calculateTodayStatsGeneric(allRecords); // Always current day/range

    // Filter data for main dashboard stats (Weekly/Project)
    // ...

    // For now, return what we can
    return {
        today: todayStats,
        // ...
    };
}

function calculateTodayStatsGeneric(records) {
    // Get date range from inputs
    const fromStr = document.getElementById('todayDateFrom').value;
    const toStr = document.getElementById('todayDateTo').value;

    let fromDate = fromStr ? new Date(fromStr) : new Date();
    let toDate = toStr ? new Date(toStr) : new Date();
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);

    let stats = {
        totalHours: 0,
        overtimeHours: 0,
        idleHours: 0,
        checkHours: 0,
        markupHours: 0,
        otherHours: 0,
        checkedTasksCount: 0,
        markedTasksCount: 0
    };

    records.forEach((row, idx) => {
        const dVal = getRecVal(row, 'date');
        const d = parseGristDate(dVal);
        if (!d) {
            if (idx < 3) console.warn('Skipping row due to missing/invalid date:', row, 'Val:', dVal);
            return;
        }
        d.setHours(0, 0, 0, 0);

        if (d >= fromDate && d <= toDate) {
            const pure = Number(getRecVal(row, 'pureHours')) || 0;
            if (idx < 3) console.log('Row processed:', { date: d, pure: pure });

            const additional = Number(getRecVal(row, 'additionalHours')) || 0;
            const markup = Number(getRecVal(row, 'markupHours')) || 0;
            const idle = Number(getRecVal(row, 'idleHours')) || 0;
            const overtime = Number(getRecVal(row, 'overtimeHours')) || 0;

            stats.totalHours += pure + additional + markup + idle;
            stats.overtimeHours += overtime;
            stats.idleHours += idle;
            stats.checkedTasksCount += (Number(getRecVal(row, 'checkedTasks')) || 0);
            stats.markedTasksCount += (Number(getRecVal(row, 'markedTasks')) || 0);

            // Checkboxes might be boolean or check strings or 1/0
            if (getRecVal(row, 'projectCheck')) stats.checkHours += pure;
            if (getRecVal(row, 'markupCheck')) stats.markupHours += markup; // Note: logic in GAS adds markupHours if markup check is true. Wait, GAS logic: if markupCheck -> result.markupHours += markupHours. (This assumes markupHours is only counted if checked? Or is markupHours column independent?)
            // GAS: "if (markupCheckIndex !== -1 && row[markupCheckIndex] === true) { result.markupHours += markupHours; }"
            // But earlier: "result.totalHours += pureHours + additionalHours + markupHours + idleHours;"
            // So markupHours is ALWAYS added to total, but tracked separately in stats.markupHours ONLY if checked. 
            // BUT wait, is markupHours ONLY non-zero if checked? User input dependent.
            // Let's stick to GAS logic: sum everything for total, but conditional for categories.

            if (getRecVal(row, 'otherCheck')) stats.otherHours += additional;
        }
    });

    return stats;
}


function refreshDashboard() {
    // 0. Update Date Range Label in header
    updateDateRangeLabel();

    // 1. Populate Year Selects if empty
    updateYearSelects();

    // 2. Render Today Stats
    renderTodayStats();

    // 3. Render Dashboard Center (Weekly/Projects)
    // Only if on content view
    if (document.getElementById('content').style.display !== 'none') {
        renderMainDashboard();
    }
}

function updateDateRangeLabel() {
    const el = document.getElementById('dateRange');
    if (!el) return;

    if (currentPeriod === 'all') {
        // Show full data range from records
        if (allRecords.length > 0) {
            const dates = allRecords
                .map(r => parseGristDate(getRecVal(r, 'date')))
                .filter(d => d)
                .sort((a, b) => a - b);
            if (dates.length > 0) {
                el.innerText = formatDateFull(dates[0]) + ' — ' + formatDateFull(dates[dates.length - 1]);
            } else {
                el.innerText = 'Нет данных';
            }
        } else {
            el.innerText = '-';
        }
    } else {
        const range = getPeriodDateRange(currentPeriod);
        if (range) {
            el.innerText = formatDateFull(range.start) + ' — ' + formatDateFull(range.end);
        } else {
            el.innerText = '-';
        }
    }
}

function formatDateFull(date) {
    const d = date.getDate();
    const m = date.getMonth() + 1;
    const y = date.getFullYear();
    return (d < 10 ? '0' + d : d) + '.' + (m < 10 ? '0' + m : m) + '.' + y;
}

function updateYearSelects() {
    // Populate dropdowns based on data years + settings years
    const years = new Set(currentSettings.years || []);
    // Also scan data for years
    allRecords.forEach(r => {
        const d = parseGristDate(getRecVal(r, 'date'));
        if (d) years.add(d.getFullYear());
    });

    if (years.size === 0) years.add(new Date().getFullYear());

    const sortedYears = Array.from(years).sort((a, b) => b - a);

    const selects = ['yearSelect', 'calendarYearSelect', 'calendarYear', 'projectYearSelect'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const currentVal = el.value;
        // Keep "All" option for main filter
        const hasAll = el.querySelector('option[value="all"]');

        el.innerHTML = '';
        if (hasAll) {
            const opt = document.createElement('option');
            opt.value = 'all';
            opt.innerText = 'Весь период';
            el.appendChild(opt);
        }

        sortedYears.forEach(y => {
            const opt = document.createElement('option');
            opt.value = y;
            opt.innerText = y;
            el.appendChild(opt);
        });

        // Restore value if exists, else default
        if (currentVal && Array.from(el.options).some(o => o.value == currentVal)) {
            el.value = currentVal;
        } else if (sortedYears.length > 0) {
            if (!hasAll) el.value = sortedYears[0]; // Default to latest year
        }
    });
}

function renderTodayStats() {
    const stats = calculateTodayStatsGeneric(allRecords);

    setText('todayTotalHours', formatNum(stats.totalHours));
    setText('todayOvertimeHours', formatNum(stats.overtimeHours));
    setText('todayIdleHours', formatNum(stats.idleHours));
    setText('todayCheckHours', formatNum(stats.checkHours));
    setText('todayMarkupHours', formatNum(stats.markupHours));
    setText('todayOtherHours', formatNum(stats.otherHours));
    setText('todayCheckedTasksCount', stats.checkedTasksCount);
    setText('todayMarkedTasksCount', stats.markedTasksCount);

    // Also update Workload Circle (based on Today? Or Period? GAS Dashboard has "Workload Summary" separate from "Today")
    // GAS calculateOverallWorkload uses `currentPeriod`.
    renderWorkload();
}

function renderWorkload() {
    // Calculate based on currentPeriod
    let data = filterByPeriod(allRecords, currentPeriod);

    // Norm calculation needs calendar settings (holidays/short days)
    // GAS: getWorkHours(d)

    let totalHours = 0;
    let normHours = 0;

    // Calculate norm for the period
    // Iterate days in period
    const range = getPeriodDateRange(currentPeriod);
    if (!range) {
        // Fallback to "all" -> simplistic? Or sum of all data range
        // GAS "All": iterates data?
        // Let's iterate data days
    }

    // Simplified Workload: Sum Data Hours vs (Days * 8) - Holidays
    // This is complex to port 100% without the exact `getWorkHours` logic from GAS which relied on hardcoded lists or sheet lists.
    // We will use `currentSettings.holidays` (strings "DD.MM")

    const dateMap = new Map(); // Use to track unique days present in data for "All"? 
    // No, Workload should be based on CALENDAR time passed in period.

    // If period is 'all', maybe just skip norm or estimate?
    // Let's implement basics.

    data.forEach(row => {
        const pure = Number(getRecVal(row, 'pureHours')) || 0;
        const additional = Number(getRecVal(row, 'additionalHours')) || 0;
        const markup = Number(getRecVal(row, 'markupHours')) || 0;
        totalHours += pure + additional + markup; // Note: Idle/Overtime usually not in Workload % logic in GAS?
        // GAS: result.totalHours += pureHours + additionalHours + markupHours; (Yes)
    });

    // Calculate Norm
    if (range) {
        let d = new Date(range.start);
        while (d <= range.end) {
            normHours += getDayNorm(d);
            d.setDate(d.getDate() + 1);
        }
    } else {
        // For 'all', rely on data dates range
        if (data.length > 0) {
            const dates = data.map(r => parseGristDate(getRecVal(r, 'date'))).filter(d => d).sort((a, b) => a - b);
            if (dates.length > 0) {
                let d = new Date(dates[0]);
                let end = new Date(dates[dates.length - 1]);
                while (d <= end) {
                    normHours += getDayNorm(d);
                    d.setDate(d.getDate() + 1);
                }
            }
        }
    }

    const percentage = normHours > 0 ? Math.round((totalHours / normHours) * 100) : 0;

    setText('workloadPercentage', percentage + '%');
    setText('workloadText', `${formatNum(totalHours)} ч из ${formatNum(normHours)} ч`);

    // Liquid animation height
    const liquid = document.getElementById('liquidGroup');
    // Translate Y: 190 (empty) to -10 (full, covering circle)
    // 0% -> 190, 100% -> 0
    const yVal = 190 - (percentage * 1.9);
    if (liquid) liquid.setAttribute('transform', `translate(0,${yVal})`);
}

function getDayNorm(date) {
    const dayStr = formatDateShort(date); // "DD.MM"
    const year = date.getFullYear().toString();

    if (isHoliday(dayStr, year)) return 0;
    if (isShortDay(dayStr, year)) return 7;
    // Weekend?
    const day = date.getDay();
    if (day === 0 || day === 6) return 0; // Standard weekend
    return 8;
}

function isHoliday(dayStr, year) {
    const yearHolidays = currentSettings.holidays && currentSettings.holidays[year];
    return yearHolidays ? yearHolidays.includes(dayStr) : false;
}
function isShortDay(dayStr, year) {
    const yearShortDays = currentSettings.shortDays && currentSettings.shortDays[year];
    return yearShortDays ? yearShortDays.includes(dayStr) : false;
}

// Helper Utils
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
}
function formatNum(n) {
    if (!n) return '0';
    return n % 1 === 0 ? n : n.toFixed(1);
}
function formatDateShort(date) {
    let d = date.getDate();
    let m = date.getMonth() + 1;
    return (d < 10 ? '0' + d : d) + '.' + (m < 10 ? '0' + m : m);
}
function initTodayDatePickers() {
    // Set to today
    const now = new Date();
    const iso = now.toISOString().substring(0, 10);
    const fromInput = document.getElementById('todayDateFrom');
    const toInput = document.getElementById('todayDateTo');
    const btn = document.getElementById('returnTodayBtn');

    if (fromInput) fromInput.value = iso;
    if (toInput) toInput.value = iso;
    if (btn) btn.style.display = 'none'; // Hide button when on today's date

    // Don't call refreshDashboard here - it's called right after in init
}

function filterByPeriod(records, period) {
    if (period === 'all') return records;

    const range = getPeriodDateRange(period);
    if (!range) return records;

    return records.filter(r => {
        const d = parseGristDate(getRecVal(r, 'date'));
        return d && d >= range.start && d <= range.end;
    });
}

function getPeriodDateRange(period) {
    if (period.startsWith('month:')) {
        const parts = period.replace('month:', '').split('-');
        const y = parseInt(parts[0]);
        const m = parseInt(parts[1]);
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 0, 23, 59, 59);
        return { start, end };
    }
    if (period.startsWith('year:')) {
        const y = parseInt(period.replace('year:', ''));
        const start = new Date(y, 0, 1);
        const end = new Date(y, 11, 31, 23, 59, 59); // Grist dates probably ignore time, but safeguard
        return { start, end };
    }
    return null;
}

// --- Settings UI ---

function renderSettingsUI() {
    // Get currently selected year
    const yearSelect = document.getElementById('calendarYear');
    const selectedYear = yearSelect ? yearSelect.value : new Date().getFullYear().toString();

    // Render holidays for selected year
    const holidayContainer = document.getElementById('holidaysList');
    holidayContainer.innerHTML = '';
    const yearHolidays = (currentSettings.holidays && currentSettings.holidays[selectedYear]) || [];
    yearHolidays.forEach((h, index) => {
        const chip = document.createElement('div');
        chip.className = 'date-chip';
        chip.innerHTML = `${h} <button class="remove-date" onclick="removeSetting('holidays', ${index})">×</button>`;
        holidayContainer.appendChild(chip);
    });

    // Render short days for selected year
    const shortContainer = document.getElementById('shortDaysList');
    shortContainer.innerHTML = '';
    const yearShortDays = (currentSettings.shortDays && currentSettings.shortDays[selectedYear]) || [];
    yearShortDays.forEach((h, index) => {
        const chip = document.createElement('div');
        chip.className = 'date-chip';
        chip.innerHTML = `${h} <button class="remove-date" onclick="removeSetting('shortDays', ${index})">×</button>`;
        shortContainer.appendChild(chip);
    });

    // Render year list in select
    if (yearSelect) {
        const currentVal = yearSelect.value;
        yearSelect.innerHTML = '';
        (currentSettings.years || []).forEach(y => {
            const opt = document.createElement('option');
            opt.value = y;
            opt.innerText = y;
            yearSelect.appendChild(opt);
        });
        // Restore selection if exists
        if (currentVal && (currentSettings.years || []).includes(parseInt(currentVal))) {
            yearSelect.value = currentVal;
        } else if ((currentSettings.years || []).length > 0) {
            yearSelect.value = currentSettings.years[0];
        }
    }
}

// Global scope function for onclick access
window.removeSetting = function (type, index) {
    const yearSelect = document.getElementById('calendarYear');
    const year = yearSelect ? yearSelect.value : new Date().getFullYear().toString();

    if (currentSettings[type] && currentSettings[type][year]) {
        currentSettings[type][year].splice(index, 1);
        renderSettingsUI();
        autoSaveSettings(); // Auto-save
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
        const cellYear = d.getFullYear().toString();
        const isCurrentMonth = d.getMonth() === month;

        if (!isCurrentMonth) cell.classList.add('empty'); // Style for other month days

        if (isCurrentMonth) {
            // Check properties - NOW WITH YEAR PARAMETER
            if (isHoliday(isoDate, cellYear) || d.getDay() === 0 || d.getDay() === 6) {
                cell.classList.add('weekend');
                if (isHoliday(isoDate, cellYear)) {
                    cell.classList.add('holiday');
                }
            }
            if (isShortDay(isoDate, cellYear)) cell.classList.add('short-day');

            // Check today
            const now = new Date();
            if (d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
                cell.classList.add('today');
            }

            // Content
            let html = `<div class="day-number">${d.getDate()}</div>`;
            if (isHoliday(isoDate, cellYear)) html += `<div class="holiday-name">Праздник</div>`;
            if (isShortDay(isoDate, cellYear)) html += `<div class="holiday-name" style="color:#fbc02d">Сокр. день</div>`;

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

    // 3. Overtime — hidden from main screen
    // document.getElementById('overtimeSection').style.display = 'block';
    // renderOvertimeTable();
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
    let otherOnlyHours = 0; // For rows with ONLY otherCheck (no projectCheck)

    records.forEach((row, idx) => {
        const isProject = getRecVal(row, 'projectCheck');
        const isOther = getRecVal(row, 'otherCheck');
        const isMarkup = getRecVal(row, 'markupCheck');
        const additional = Number(getRecVal(row, 'additionalHours')) || 0;

        // Debug: log first 5 rows to see checkbox values
        if (idx < 5) {
            console.log(`analyzeProjects row[${idx}]:`, {
                project: getRecVal(row, 'project'),
                isProject, isOther, isMarkup,
                additionalHours: getRecVal(row, 'additionalHours'),
                additionalParsed: additional,
                rawKeys: Object.keys(row),
                E: row['E'], L: row['L'], C: row['C']
            });
        }

        // Case 1: Only "Другое" checked (no "Проект") → goes to "Иные задачи" row
        if (isOther && !isProject) {
            otherOnlyHours += additional;
            return;
        }

        // Case 2: "Проект" checked → goes to project row
        if (!isProject) return; // Skip rows without project checkbox

        const name = getRecVal(row, 'project') || 'Без проекта';

        if (!map[name]) map[name] = {
            name: name,
            checkHours: 0, tasks: 0, markupHours: 0, markupTasks: 0, additionalHours: 0, totalHours: 0,
            hasWork: false
        };

        const pure = Number(getRecVal(row, 'pureHours')) || 0;
        const markup = Number(getRecVal(row, 'markupHours')) || 0;
        const tasks = Number(getRecVal(row, 'checkedTasks')) || 0;
        const mTasks = Number(getRecVal(row, 'markedTasks')) || 0;

        // Project hours
        map[name].checkHours += pure;
        map[name].tasks += tasks;
        map[name].hasWork = true;

        if (isMarkup) {
            map[name].markupHours += markup;
            map[name].markupTasks += mTasks;
        }

        // Always add additionalHours (column L) to project's "Иные часы работы"
        // (matches modal behavior in calculateProjectWeeklyInternal)
        map[name].additionalHours += additional;

        map[name].totalHours = map[name].checkHours + map[name].markupHours + map[name].additionalHours;
    });

    // Filter out empties
    const list = Object.values(map).filter(p => p.hasWork || p.totalHours > 0);

    // Calculate Avgs
    list.forEach(p => {
        p.avgMainTasks = p.checkHours > 0 ? (p.tasks / p.checkHours) : 0;
        p.avgMarkupTasks = p.markupHours > 0 ? (p.markupTasks / p.markupHours) : 0;
    });

    // Sort projects by total hours desc
    list.sort((a, b) => b.totalHours - a.totalHours);

    // Always add "Иные задачи" at the TOP (only otherCheck rows, without projectCheck)
    list.unshift({
        name: 'Иные задачи',
        checkHours: 0, tasks: 0, markupHours: 0, markupTasks: 0,
        additionalHours: otherOnlyHours, totalHours: otherOnlyHours,
        hasWork: otherOnlyHours > 0,
        avgMainTasks: 0, avgMarkupTasks: 0
    });

    return list;
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

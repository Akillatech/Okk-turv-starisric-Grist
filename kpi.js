/**
 * KPI Section Logic
 * Triangle chart, grade card, contributions, transitions
 */

// --- KPI State ---
let kpiState = {
    year: new Date().getFullYear(),
    quarter: Math.ceil((new Date().getMonth() + 1) / 3), // 1-4
};

// --- Demo data (заглушки) ---
const KPI_DEMO = {
    2026: {
        1: { // Q1
            months: [
                { name: 'ЯНВАРЬ', overall: 100, speed: 100, er: 85, test: 55 },
                { name: 'ФЕВРАЛЬ', overall: 100, speed: 100, er: 85, test: 55 },
                { name: 'МАРТ', overall: 100, speed: 100, er: 85, test: 55 },
            ],
            total: 63,
        },
        2: { // Q2
            months: [
                { name: 'АПРЕЛЬ', overall: 90, speed: 95, er: 80, test: 60 },
                { name: 'МАЙ', overall: 85, speed: 90, er: 75, test: 50 },
                { name: 'ИЮНЬ', overall: 88, speed: 92, er: 78, test: 55 },
            ],
            total: 55,
        },
        3: { // Q3
            months: [
                { name: 'ИЮЛЬ', overall: 0, speed: 0, er: 0, test: 0 },
                { name: 'АВГУСТ', overall: 0, speed: 0, er: 0, test: 0 },
                { name: 'СЕНТЯБРЬ', overall: 0, speed: 0, er: 0, test: 0 },
            ],
            total: 0,
        },
        4: { // Q4
            months: [
                { name: 'ОКТЯБРЬ', overall: 0, speed: 0, er: 0, test: 0 },
                { name: 'НОЯБРЬ', overall: 0, speed: 0, er: 0, test: 0 },
                { name: 'ДЕКАБРЬ', overall: 0, speed: 0, er: 0, test: 0 },
            ],
            total: 0,
        },
    }
};

const KPI_GRADE_DEMO = {
    current: 'JUNIOR',
    next: 'JUNIOR+',
    image: '🎖️',
};

const KPI_CONTRIBUTION_DEMO = {
    code: 'OK-2026-001',
    description: 'Описание последнего вклада',
};

const KPI_TRANSITIONS_DEMO = [
    {
        type: 'ТОЛЬКО ТАРГЕТ',
        available: true,
        lastDate: '01.01.2026',
        nextDate: '01.04.2026',
        progress: 65,
        variant: 'accent', // accent gradient
    },
    {
        type: 'ТАРГЕТ + ВКЛАД',
        available: true,
        lastDate: '01.01.2026',
        nextDate: '01.07.2026',
        progress: 40,
        variant: 'orange',
    },
];

// --- Render ---

function renderKpiView() {
    const container = document.getElementById('kpiContent');
    if (!container) return;

    // Update year select
    const yearSelect = document.getElementById('kpiYearSelect');
    if (yearSelect) yearSelect.value = kpiState.year;

    // Update quarter
    updateQuarterDisplay();

    // Get data
    const yearData = KPI_DEMO[kpiState.year];
    const qData = yearData ? yearData[kpiState.quarter] : null;

    // Render triangle
    renderTriangleChart(qData);

    // Render cards
    renderGradeCard();
    renderContributionCard();
    renderTransitionsCard();
}

function updateQuarterDisplay() {
    const el = document.getElementById('kpiQuarterLabel');
    if (el) el.textContent = `КВАРТАЛ : Q${kpiState.quarter}`;
}

// --- Triangle Chart ---

function renderTriangleChart(qData) {
    const svg = document.getElementById('triangleSvg');
    if (!svg) return;

    const months = qData ? qData.months : [
        { name: '—', overall: 0, speed: 0, er: 0, test: 0 },
        { name: '—', overall: 0, speed: 0, er: 0, test: 0 },
        { name: '—', overall: 0, speed: 0, er: 0, test: 0 },
    ];
    const total = qData ? qData.total : 0;

    // Positions for SVG 500x450 viewport
    // Triangle vertices: top-center, bottom-left, bottom-right
    const topX = 250, topY = 30;
    const botLeftX = 40, botLeftY = 420;
    const botRightX = 460, botRightY = 420;
    const centerX = 250, centerY = 190;

    // Liquid fill height based on total%
    const liquidLevel = 420 - (total / 100) * 280;

    svg.innerHTML = `
        <!-- Triangle body -->
        <defs>
            <clipPath id="triangleClip">
                <polygon points="${topX},${topY} ${botLeftX},${botLeftY} ${botRightX},${botRightY}" />
            </clipPath>
            <linearGradient id="kpiLiquidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#E3FB1E;stop-opacity:0.8" />
                <stop offset="100%" style="stop-color:#9ab012;stop-opacity:0.9" />
            </linearGradient>
            <filter id="triangleShadow">
                <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.1"/>
            </filter>
        </defs>

        <!-- Triangle background -->
        <polygon 
            points="${topX},${topY} ${botLeftX},${botLeftY} ${botRightX},${botRightY}" 
            fill="#e8e8e8" 
            stroke="#d5d5d5" 
            stroke-width="1.5"
            filter="url(#triangleShadow)"
        />

        <!-- Liquid fill -->
        <g clip-path="url(#triangleClip)">
            <rect x="0" y="${liquidLevel}" width="500" height="${450 - liquidLevel}" fill="url(#kpiLiquidGrad)">
                <animate attributeName="y" values="${liquidLevel + 3};${liquidLevel - 3};${liquidLevel + 3}" dur="4s" repeatCount="indefinite" />
            </rect>
            <!-- Wave -->
            <path d="M0,${liquidLevel} Q60,${liquidLevel - 12} 125,${liquidLevel} Q190,${liquidLevel + 12} 250,${liquidLevel} Q310,${liquidLevel - 12} 375,${liquidLevel} Q440,${liquidLevel + 12} 500,${liquidLevel} L500,450 L0,450 Z" 
                  fill="rgba(227,251,30,0.4)">
                <animate attributeName="d" 
                    values="M0,${liquidLevel} Q60,${liquidLevel - 12} 125,${liquidLevel} Q190,${liquidLevel + 12} 250,${liquidLevel} Q310,${liquidLevel - 12} 375,${liquidLevel} Q440,${liquidLevel + 12} 500,${liquidLevel} L500,450 L0,450 Z;M0,${liquidLevel} Q60,${liquidLevel + 12} 125,${liquidLevel} Q190,${liquidLevel - 12} 250,${liquidLevel} Q310,${liquidLevel + 12} 375,${liquidLevel} Q440,${liquidLevel - 12} 500,${liquidLevel} L500,450 L0,450 Z;M0,${liquidLevel} Q60,${liquidLevel - 12} 125,${liquidLevel} Q190,${liquidLevel + 12} 250,${liquidLevel} Q310,${liquidLevel - 12} 375,${liquidLevel} Q440,${liquidLevel + 12} 500,${liquidLevel} L500,450 L0,450 Z"
                    dur="4s" repeatCount="indefinite" />
            </path>
        </g>

        <!-- Center circle -->
        <circle cx="${centerX}" cy="${centerY}" r="72" fill="white" stroke="#e0e0e0" stroke-width="2" filter="url(#triangleShadow)" />
        <circle cx="${centerX}" cy="${centerY}" r="66" fill="white" stroke="#f0f0f0" stroke-width="1" />
        <text x="${centerX}" y="${centerY - 12}" class="triangle-center-text">ИТОГ</text>
        <text x="${centerX}" y="${centerY + 25}" class="triangle-center-value">${total}%</text>

        <!-- Month 1 (Top) -->
        ${renderMonthMetrics(months[0], topX, topY - 5, 'top')}

        <!-- Month 2 (Bottom-Left) -->
        ${renderMonthMetrics(months[1], botLeftX - 10, botLeftY + 10, 'bottom-left')}

        <!-- Month 3 (Bottom-Right) -->
        ${renderMonthMetrics(months[2], botRightX + 10, botRightY + 10, 'bottom-right')}
    `;
}

function renderMonthMetrics(month, x, y, position) {
    const badgeGap = 42;
    let labelX, metricsY, speedX, erX, testX, overallX, overallY;
    let labelY;

    if (position === 'top') {
        labelX = x;
        labelY = y - 45;
        overallX = x;
        overallY = y - 20;
        speedX = x - badgeGap;
        erX = x;
        testX = x + badgeGap;
        metricsY = overallY + 30;
    } else if (position === 'bottom-left') {
        labelX = x + 55;
        labelY = y + 20;
        overallX = x + 85;
        overallY = y - 20;
        speedX = x + 45;
        erX = x + 85;
        testX = x + 125;
        metricsY = overallY + 30;
    } else {
        labelX = x - 55;
        labelY = y + 20;
        overallX = x - 85;
        overallY = y - 20;
        speedX = x - 125;
        erX = x - 85;
        testX = x - 45;
        metricsY = overallY + 30;
    }

    return `
        <text x="${labelX}" y="${labelY}" class="month-label">${month.name}</text>

        <!-- Overall badge -->
        <rect x="${overallX - 25}" y="${overallY - 10}" width="50" height="22" rx="11" 
              fill="url(#kpiLiquidGrad)" />
        <text x="${overallX}" y="${overallY + 5}" text-anchor="middle" 
              font-size="12" font-weight="700" fill="#333">${month.overall}%</text>
        <text x="${overallX}" y="${overallY + 18}" text-anchor="middle" 
              class="kpi-badge-label">ОБЩИЕ</text>

        <!-- Speed -->
        <rect x="${speedX - 22}" y="${metricsY - 10}" width="44" height="22" rx="11" 
              fill="${getBadgeColor(month.speed)}" />
        <text x="${speedX}" y="${metricsY + 5}" text-anchor="middle" 
              font-size="11" font-weight="700" fill="white">${month.speed}%</text>
        <text x="${speedX}" y="${metricsY + 18}" text-anchor="middle" 
              class="kpi-badge-label">СКОРОСТЬ</text>

        <!-- ER -->
        <rect x="${erX - 22}" y="${metricsY - 10}" width="44" height="22" rx="11" 
              fill="${getBadgeColor(month.er)}" />
        <text x="${erX}" y="${metricsY + 5}" text-anchor="middle" 
              font-size="11" font-weight="700" fill="${month.er >= 80 ? 'white' : '#333'}">${month.er}%</text>
        <text x="${erX}" y="${metricsY + 18}" text-anchor="middle" 
              class="kpi-badge-label">ER</text>

        <!-- Test -->
        <rect x="${testX - 22}" y="${metricsY - 10}" width="44" height="22" rx="11" 
              fill="${getBadgeColor(month.test)}" />
        <text x="${testX}" y="${metricsY + 5}" text-anchor="middle" 
              font-size="11" font-weight="700" fill="white">${month.test}%</text>
        <text x="${testX}" y="${metricsY + 18}" text-anchor="middle" 
              class="kpi-badge-label">ТЕСТ</text>
    `;
}

function getBadgeColor(value) {
    if (value >= 80) return '#4CAF50'; // green
    if (value >= 60) return '#FFC107'; // yellow
    return '#f44336'; // red
}

// --- Grade Card ---
function renderGradeCard() {
    const el = document.getElementById('kpiGradeName');
    const nextEl = document.getElementById('kpiGradeNext');
    const imgEl = document.getElementById('kpiGradeImage');
    if (el) el.textContent = KPI_GRADE_DEMO.current;
    if (nextEl) nextEl.innerHTML = `СЛЕД.ГРЕЙД: <span class="kpi-grade-next-value">${KPI_GRADE_DEMO.next}</span>`;
    if (imgEl) imgEl.textContent = KPI_GRADE_DEMO.image;
}

// --- Contribution Card ---
function renderContributionCard() {
    const codeEl = document.getElementById('kpiContribCode');
    const descEl = document.getElementById('kpiContribDesc');
    if (codeEl) codeEl.textContent = KPI_CONTRIBUTION_DEMO.code || 'КОДОВОЕ ОБОЗНАЧЕНИЕ';
    if (descEl) descEl.textContent = KPI_CONTRIBUTION_DEMO.description || 'ОПИСАНИЕ ПОСЛЕДНЕГО ВКЛАДА';
}

// --- Transitions Card ---
function renderTransitionsCard() {
    const container = document.getElementById('kpiTransitionsBody');
    if (!container) return;

    container.innerHTML = KPI_TRANSITIONS_DEMO.map(t => `
        <div class="kpi-transition-block">
            <div class="kpi-transition-header">
                <div>
                    <div class="kpi-transition-type">${t.type}</div>
                    <div class="kpi-transition-available">
                        ДОСТУПЕН ЛИ ПЕРЕВОД? <strong>${t.available ? 'ДА' : 'НЕТ'}</strong>
                    </div>
                </div>
                <div class="kpi-transition-dates">
                    <span>
                        <span class="label">ПОСЛЕДНИЙ ПЕРЕХОД</span>
                        ${t.lastDate}
                    </span>
                    <span>
                        <span class="label">СЛЕД. ПЕРЕХОД</span>
                        ${t.nextDate}
                    </span>
                </div>
            </div>
            <div class="kpi-progress-bar-container">
                <span class="kpi-progress-date">${t.lastDate}</span>
                <div class="kpi-progress-bar">
                    <div class="kpi-progress-fill ${t.variant === 'orange' ? 'orange' : ''}" style="width: ${t.progress}%"></div>
                </div>
                <span class="kpi-progress-date">${t.nextDate}</span>
            </div>
        </div>
    `).join('');
}

// --- Quarter Navigation ---

function kpiPrevQuarter() {
    kpiState.quarter--;
    if (kpiState.quarter < 1) {
        kpiState.quarter = 4;
        kpiState.year--;
        const yearSelect = document.getElementById('kpiYearSelect');
        if (yearSelect) yearSelect.value = kpiState.year;
    }
    renderKpiView();
}

function kpiNextQuarter() {
    kpiState.quarter++;
    if (kpiState.quarter > 4) {
        kpiState.quarter = 1;
        kpiState.year++;
        const yearSelect = document.getElementById('kpiYearSelect');
        if (yearSelect) yearSelect.value = kpiState.year;
    }
    renderKpiView();
}

function kpiYearChanged() {
    const yearSelect = document.getElementById('kpiYearSelect');
    if (yearSelect) kpiState.year = parseInt(yearSelect.value);
    renderKpiView();
}

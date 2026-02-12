/**
 * KPI Section Logic
 * Rounded triangle with 3 sections + center liquid circle
 */

let kpiState = {
    year: new Date().getFullYear(),
    quarter: Math.ceil((new Date().getMonth() + 1) / 3),
};

const QUARTER_MONTHS = {
    1: ['ЯНВАРЬ', 'ФЕВРАЛЬ', 'МАРТ'],
    2: ['АПРЕЛЬ', 'МАЙ', 'ИЮНЬ'],
    3: ['ИЮЛЬ', 'АВГУСТ', 'СЕНТЯБРЬ'],
    4: ['ОКТЯБРЬ', 'НОЯБРЬ', 'ДЕКАБРЬ'],
};

const KPI_DEMO = {
    2026: {
        1: {
            months: [
                { overall: 100, speed: 100, er: 85, test: 55 },
                { overall: 100, speed: 100, er: 85, test: 55 },
                { overall: 100, speed: 100, er: 85, test: 55 },
            ],
            total: 63,
        },
        2: {
            months: [
                { overall: 90, speed: 95, er: 80, test: 60 },
                { overall: 85, speed: 90, er: 75, test: 50 },
                { overall: 88, speed: 92, er: 78, test: 55 },
            ],
            total: 55,
        },
        3: {
            months: [
                { overall: 0, speed: 0, er: 0, test: 0 },
                { overall: 0, speed: 0, er: 0, test: 0 },
                { overall: 0, speed: 0, er: 0, test: 0 },
            ],
            total: 0,
        },
        4: {
            months: [
                { overall: 0, speed: 0, er: 0, test: 0 },
                { overall: 0, speed: 0, er: 0, test: 0 },
                { overall: 0, speed: 0, er: 0, test: 0 },
            ],
            total: 0,
        },
    }
};

const KPI_GRADE_DEMO = { current: 'JUNIOR', next: 'JUNIOR+', image: '🎖️' };
const KPI_CONTRIBUTION_DEMO = { code: 'OK-2026-001', description: 'Описание последнего вклада' };
const KPI_TRANSITIONS_DEMO = [
    { type: 'ТОЛЬКО ТАРГЕТ', available: true, lastDate: '01.01.2026', nextDate: '01.04.2026', progress: 65, variant: 'accent' },
    { type: 'ТАРГЕТ + ВКЛАД', available: true, lastDate: '01.01.2026', nextDate: '01.07.2026', progress: 40, variant: 'orange' },
];

// =================== RENDER ===================

function renderKpiView() {
    const container = document.getElementById('kpiContent');
    if (!container) return;
    const yearSelect = document.getElementById('kpiYearSelect');
    if (yearSelect) yearSelect.value = kpiState.year;
    updateQuarterDisplay();
    const yearData = KPI_DEMO[kpiState.year];
    const qData = yearData ? yearData[kpiState.quarter] : null;
    renderTriangleChart(qData);
    renderGradeCard();
    renderContributionCard();
    renderTransitionsCard();
}

function updateQuarterDisplay() {
    const el = document.getElementById('kpiQuarterLabel');
    if (el) el.textContent = 'КВАРТАЛ : Q' + kpiState.quarter;
}

// =================== TRIANGLE CHART ===================

function renderTriangleChart(qData) {
    const container = document.getElementById('kpiTriangleContainer');
    if (!container) return;

    const monthNames = QUARTER_MONTHS[kpiState.quarter] || ['—', '—', '—'];
    const months = qData ? qData.months : [
        { overall: 0, speed: 0, er: 0, test: 0 },
        { overall: 0, speed: 0, er: 0, test: 0 },
        { overall: 0, speed: 0, er: 0, test: 0 },
    ];
    const total = qData ? qData.total : 0;

    // Geometry
    const cx = 300, cy = 340, R = 95;
    const gap = 5; // half-gap between sections

    // Triangle vertices
    const A = { x: 300, y: 55 };   // top
    const B = { x: 40, y: 540 };   // bottom-left
    const C = { x: 560, y: 540 };  // bottom-right

    // Edge midpoints
    const mAB = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }; // ~170, 298
    const mBC = { x: (B.x + C.x) / 2, y: (B.y + C.y) / 2 }; // 300, 540
    const mAC = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 }; // ~430, 298

    // Direction vectors from center to midpoints (for gap offsets)
    function unitVec(from, to) {
        const dx = to.x - from.x, dy = to.y - from.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        return { x: dx / len, y: dy / len };
    }
    function perpCW(v) { return { x: -v.y, y: v.x }; }
    function perpCCW(v) { return { x: v.y, y: -v.x }; }
    function add(p, v, s) { return { x: p.x + v.x * s, y: p.y + v.y * s }; }

    const dAB = unitVec({ x: cx, y: cy }, mAB);
    const dBC = unitVec({ x: cx, y: cy }, mBC);
    const dAC = unitVec({ x: cx, y: cy }, mAC);

    // Circle intersection points (where dividing lines meet the circle)
    const iAB = add({ x: cx, y: cy }, dAB, R);
    const iBC = add({ x: cx, y: cy }, dBC, R);
    const iAC = add({ x: cx, y: cy }, dAC, R);

    // Gap-offset points (shift perpendicular to dividing line)
    // For each dividing line, create two offset points (one per adjacent section)
    const pAB_cw = perpCW(dAB);   // perpendicular clockwise
    const pAB_ccw = perpCCW(dAB);
    const pBC_cw = perpCW(dBC);
    const pBC_ccw = perpCCW(dBC);
    const pAC_cw = perpCW(dAC);
    const pAC_ccw = perpCCW(dAC);

    // Section 1 (TOP): bounded by M_AB divider (right side) and M_AC divider (left side)
    const s1_iL = add(iAB, pAB_ccw, gap);   // circle point near M_AB, shifted toward top
    const s1_mL = add(mAB, pAB_ccw, gap);   // midpoint near M_AB, shifted toward top
    const s1_iR = add(iAC, pAC_cw, gap);    // circle point near M_AC, shifted toward top
    const s1_mR = add(mAC, pAC_cw, gap);    // midpoint near M_AC, shifted toward top

    // Section 2 (BOT-LEFT): bounded by M_AB (left side) and M_BC (left side)
    const s2_iT = add(iAB, pAB_cw, gap);
    const s2_mT = add(mAB, pAB_cw, gap);
    const s2_iB = add(iBC, pBC_cw, gap);
    const s2_mB = add(mBC, pBC_cw, gap);

    // Section 3 (BOT-RIGHT): bounded by M_BC (right side) and M_AC (right side)
    const s3_iB = add(iBC, pBC_ccw, gap);
    const s3_mB = add(mBC, pBC_ccw, gap);
    const s3_iT = add(iAC, pAC_ccw, gap);
    const s3_mT = add(mAC, pAC_ccw, gap);

    // Vertex rounding helpers
    function roundedVertex(v, from, to, r) {
        const d1 = unitVec(v, from);
        const d2 = unitVec(v, to);
        const p1 = add(v, d1, r);
        const p2 = add(v, d2, r);
        return { before: p1, control: v, after: p2 };
    }

    const rA = roundedVertex(A, mAB, mAC, 30);
    const rB = roundedVertex(B, A, C, 30);
    const rC = roundedVertex(C, B, A, 30);

    // Liquid fill level for center circle
    const liquidLevel = 200 - (total / 100) * 160; // in 200x200 viewBox

    // Build SVG
    const p = (pt) => `${Math.round(pt.x)},${Math.round(pt.y)}`;

    container.innerHTML = `
        <svg viewBox="0 0 600 640" class="triangle-svg" style="width:100%;height:auto;">
            <defs>
                <filter id="sectionShadow">
                    <feDropShadow dx="0" dy="3" stdDeviation="5" flood-opacity="0.15"/>
                </filter>
                <filter id="circleShadow2">
                    <feDropShadow dx="0" dy="2" stdDeviation="10" flood-opacity="0.2"/>
                </filter>
                <clipPath id="kpiCircleClip">
                    <circle cx="${cx}" cy="${cy}" r="${R}" />
                </clipPath>
                <linearGradient id="kpiLiquid" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#E3FB1E;stop-opacity:0.9" />
                    <stop offset="100%" style="stop-color:#9ab012;stop-opacity:1" />
                </linearGradient>
            </defs>

            <!-- SECTION 1: TOP (${monthNames[0]}) -->
            <path d="
                M ${p(s1_iL)}
                L ${p(s1_mL)}
                L ${p(rA.before)}
                Q ${p(rA.control)} ${p(rA.after)}
                L ${p(s1_mR)}
                L ${p(s1_iR)}
                A ${R} ${R} 0 0 1 ${p(s1_iL)}
                Z
            " fill="#9e9e9e" filter="url(#sectionShadow)" />

            <!-- SECTION 2: BOTTOM-LEFT (${monthNames[1]}) -->
            <path d="
                M ${p(s2_iT)}
                L ${p(s2_mT)}
                L ${p(rB.before)}
                Q ${p(rB.control)} ${p(rB.after)}
                L ${p(s2_mB)}
                L ${p(s2_iB)}
                A ${R} ${R} 0 0 1 ${p(s2_iT)}
                Z
            " fill="#9e9e9e" filter="url(#sectionShadow)" />

            <!-- SECTION 3: BOTTOM-RIGHT (${monthNames[2]}) -->
            <path d="
                M ${p(s3_iB)}
                L ${p(s3_mB)}
                L ${p(rC.before)}
                Q ${p(rC.control)} ${p(rC.after)}
                L ${p(s3_mT)}
                L ${p(s3_iT)}
                A ${R} ${R} 0 0 1 ${p(s3_iB)}
                Z
            " fill="#9e9e9e" filter="url(#sectionShadow)" />

            <!-- CENTER CIRCLE: liquid progress bar -->
            <circle cx="${cx}" cy="${cy}" r="${R + 6}" fill="white" filter="url(#circleShadow2)" />
            <circle cx="${cx}" cy="${cy}" r="${R + 2}" fill="white" stroke="#eee" stroke-width="1" />

            <!-- Liquid fill inside circle -->
            <g clip-path="url(#kpiCircleClip)">
                <!-- Base liquid rect -->
                <rect x="${cx - R}" y="${cy - R + liquidLevel}" width="${R * 2}" height="${R * 2}" fill="url(#kpiLiquid)">
                    <animate attributeName="y" values="${cy - R + liquidLevel + 2};${cy - R + liquidLevel - 2};${cy - R + liquidLevel + 2}" dur="4s" repeatCount="indefinite" />
                </rect>
                <!-- Wave 1 -->
                <path class="wave-path" d="M${cx - R - 40},${cy - R + liquidLevel + 10} Q${cx - R + 20},${cy - R + liquidLevel - 5} ${cx - R + 60},${cy - R + liquidLevel + 10} Q${cx - R + 100},${cy - R + liquidLevel + 25} ${cx},${cy - R + liquidLevel + 10} Q${cx + 40},${cy - R + liquidLevel - 5} ${cx + 80},${cy - R + liquidLevel + 10} Q${cx + R},${cy - R + liquidLevel + 25} ${cx + R + 40},${cy - R + liquidLevel + 10} L${cx + R + 40},${cy + R + 20} L${cx - R - 40},${cy + R + 20} Z" fill="#c4d916" />
                <!-- Wave 2 -->
                <path class="wave-path wave-path-2" d="M${cx - R - 40},${cy - R + liquidLevel + 5} Q${cx - R + 30},${cy - R + liquidLevel - 10} ${cx - R + 70},${cy - R + liquidLevel + 5} Q${cx - R + 110},${cy - R + liquidLevel + 20} ${cx + 10},${cy - R + liquidLevel + 5} Q${cx + 50},${cy - R + liquidLevel - 10} ${cx + 90},${cy - R + liquidLevel + 5} Q${cx + R + 10},${cy - R + liquidLevel + 20} ${cx + R + 40},${cy - R + liquidLevel + 5} L${cx + R + 40},${cy + R + 20} L${cx - R - 40},${cy + R + 20} Z" fill="rgba(227,251,30,0.5)" />
            </g>

            <!-- ИТОГ text -->
            <text x="${cx}" y="${cy - 12}" text-anchor="middle" font-size="20" font-weight="800" fill="#333" font-family="Segoe UI,sans-serif">ИТОГ</text>
            <text x="${cx}" y="${cy + 30}" text-anchor="middle" font-size="46" font-weight="900" fill="#555" font-family="Segoe UI,sans-serif" font-style="italic">${total}%</text>

            <!-- MONTH LABELS inside sections -->
            <!-- Month 1 (top) -->
            <text x="300" y="135" text-anchor="middle" font-size="16" font-weight="800" fill="#fff" font-family="Segoe UI,sans-serif" letter-spacing="2">${monthNames[0]}</text>

            <!-- Month 2 (bottom-left) -->
            <text x="155" y="470" text-anchor="middle" font-size="16" font-weight="800" fill="#fff" font-family="Segoe UI,sans-serif" letter-spacing="2">${monthNames[1]}</text>

            <!-- Month 3 (bottom-right) -->
            <text x="445" y="470" text-anchor="middle" font-size="16" font-weight="800" fill="#fff" font-family="Segoe UI,sans-serif" letter-spacing="2">${monthNames[2]}</text>
        </svg>

        <!-- Badges positioned outside/below sections via HTML -->
        <div class="kpi-badges-layer">
            ${renderMonthBadges(months[0], 'top')}
            ${renderMonthBadges(months[1], 'bottom-left')}
            ${renderMonthBadges(months[2], 'bottom-right')}
        </div>
    `;
}

function renderMonthBadges(m, position) {
    const posClass = 'kpi-month-badges-' + position;
    return `
        <div class="kpi-month-badges ${posClass}">
            <div class="kpi-overall-badge">${m.overall}%</div>
            <div class="kpi-overall-label">ОБЩИЕ</div>
            <div class="kpi-sub-badges">
                <div class="kpi-circle-badge" style="background:${getBadgeColor(m.speed)};color:${getBadgeTextColor(m.speed)}">${m.speed}%</div>
                <div class="kpi-circle-badge" style="background:${getBadgeColor(m.er)};color:${getBadgeTextColor(m.er)}">${m.er}%</div>
                <div class="kpi-circle-badge" style="background:${getBadgeColor(m.test)};color:${getBadgeTextColor(m.test)}">${m.test}%</div>
            </div>
            <div class="kpi-sub-labels">
                <span>СКОРОСТЬ</span><span>ER</span><span>ТЕСТ</span>
            </div>
        </div>
    `;
}

function getBadgeColor(v) {
    if (v >= 80) return '#4CAF50';
    if (v >= 60) return '#FFC107';
    return '#f44336';
}
function getBadgeTextColor(v) {
    return (v >= 60 && v < 80) ? '#333' : '#fff';
}

// =================== CARDS ===================

function renderGradeCard() {
    const el = document.getElementById('kpiGradeName');
    const nextEl = document.getElementById('kpiGradeNext');
    const imgEl = document.getElementById('kpiGradeImage');
    if (el) el.textContent = KPI_GRADE_DEMO.current;
    if (nextEl) nextEl.innerHTML = 'СЛЕД.ГРЕЙД: <span class="kpi-grade-next-value">' + KPI_GRADE_DEMO.next + '</span>';
    if (imgEl) imgEl.textContent = KPI_GRADE_DEMO.image;
}

function renderContributionCard() {
    const codeEl = document.getElementById('kpiContribCode');
    const descEl = document.getElementById('kpiContribDesc');
    if (codeEl) codeEl.textContent = KPI_CONTRIBUTION_DEMO.code;
    if (descEl) descEl.textContent = KPI_CONTRIBUTION_DEMO.description;
}

function renderTransitionsCard() {
    const container = document.getElementById('kpiTransitionsBody');
    if (!container) return;
    container.innerHTML = KPI_TRANSITIONS_DEMO.map(function (t) {
        return '<div class="kpi-transition-block">' +
            '<div class="kpi-transition-header"><div>' +
            '<div class="kpi-transition-type">' + t.type + '</div>' +
            '<div class="kpi-transition-available">ДОСТУПЕН ЛИ ПЕРЕВОД? <strong>' + (t.available ? 'ДА' : 'НЕТ') + '</strong></div>' +
            '</div><div class="kpi-transition-dates">' +
            '<span><span class="label">ПОСЛЕДНИЙ</span>' + t.lastDate + '</span>' +
            '<span><span class="label">СЛЕДУЮЩИЙ</span>' + t.nextDate + '</span>' +
            '</div></div>' +
            '<div class="kpi-progress-bar-container">' +
            '<span class="kpi-progress-date">' + t.lastDate + '</span>' +
            '<div class="kpi-progress-bar"><div class="kpi-progress-fill ' + (t.variant === 'orange' ? 'orange' : '') + '" style="width:' + t.progress + '%"></div></div>' +
            '<span class="kpi-progress-date">' + t.nextDate + '</span>' +
            '</div></div>';
    }).join('');
}

// =================== NAVIGATION ===================

function kpiPrevQuarter() {
    kpiState.quarter--;
    if (kpiState.quarter < 1) { kpiState.quarter = 4; kpiState.year--; }
    renderKpiView();
}
function kpiNextQuarter() {
    kpiState.quarter++;
    if (kpiState.quarter > 4) { kpiState.quarter = 1; kpiState.year++; }
    renderKpiView();
}
function kpiYearChanged() {
    var sel = document.getElementById('kpiYearSelect');
    if (sel) kpiState.year = parseInt(sel.value);
    renderKpiView();
}

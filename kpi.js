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
        1: { months: [{ overall: 100, speed: 100, er: 85, test: 55 }, { overall: 100, speed: 100, er: 85, test: 55 }, { overall: 100, speed: 100, er: 85, test: 55 }], total: 63 },
        2: { months: [{ overall: 90, speed: 95, er: 80, test: 60 }, { overall: 85, speed: 90, er: 75, test: 50 }, { overall: 88, speed: 92, er: 78, test: 55 }], total: 55 },
        3: { months: [{ overall: 0, speed: 0, er: 0, test: 0 }, { overall: 0, speed: 0, er: 0, test: 0 }, { overall: 0, speed: 0, er: 0, test: 0 }], total: 0 },
        4: { months: [{ overall: 0, speed: 0, er: 0, test: 0 }, { overall: 0, speed: 0, er: 0, test: 0 }, { overall: 0, speed: 0, er: 0, test: 0 }], total: 0 },
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
    var container = document.getElementById('kpiContent');
    if (!container) return;
    var yearSelect = document.getElementById('kpiYearSelect');
    if (yearSelect) yearSelect.value = kpiState.year;
    updateQuarterDisplay();
    var yearData = KPI_DEMO[kpiState.year];
    var qData = yearData ? yearData[kpiState.quarter] : null;
    renderTriangleChart(qData);
    renderGradeCard();
    renderContributionCard();
    renderTransitionsCard();
}

function updateQuarterDisplay() {
    var el = document.getElementById('kpiQuarterLabel');
    if (el) el.textContent = 'КВАРТАЛ : Q' + kpiState.quarter;
}

function getBadgeColor(v) { return v >= 80 ? '#4CAF50' : v >= 60 ? '#FFC107' : '#f44336'; }
function getBadgeTextColor(v) { return (v >= 60 && v < 80) ? '#333' : '#fff'; }

// =================== TRIANGLE CHART ===================

function renderTriangleChart(qData) {
    var container = document.getElementById('kpiTriangleContainer');
    if (!container) return;

    var monthNames = QUARTER_MONTHS[kpiState.quarter] || ['—', '—', '—'];
    var months = qData ? qData.months : [
        { overall: 0, speed: 0, er: 0, test: 0 },
        { overall: 0, speed: 0, er: 0, test: 0 },
        { overall: 0, speed: 0, er: 0, test: 0 },
    ];
    var total = qData ? qData.total : 0;

    // ---- GEOMETRY ----
    var W = 700, H = 720;
    var cx = 350, cy = 385, R = 110;
    var gap = 22;    // big gap between sections
    var rr = 150;    // 150px rounding - very blob-like

    var sectionFill = '#e8ecf1';

    // Triangle vertices - big triangle
    var vTop = { x: 350, y: 15 };
    var vBotL = { x: 10, y: 630 };
    var vBotR = { x: 690, y: 630 };

    // Edge midpoints
    var mAB = { x: (vTop.x + vBotL.x) / 2, y: (vTop.y + vBotL.y) / 2 };
    var mBC = { x: (vBotL.x + vBotR.x) / 2, y: (vBotL.y + vBotR.y) / 2 };
    var mAC = { x: (vTop.x + vBotR.x) / 2, y: (vTop.y + vBotR.y) / 2 };

    function circlePoint(angle) { return { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) }; }
    function unitVec(a, b) {
        var dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy);
        return { x: dx / len, y: dy / len };
    }
    function offsetPerp(pt, center, px, side) {
        var dx = pt.x - center.x, dy = pt.y - center.y;
        var len = Math.sqrt(dx * dx + dy * dy);
        return { x: pt.x + (-dy / len) * px * side, y: pt.y + (dx / len) * px * side };
    }
    function p(pt) { return Math.round(pt.x) + ',' + Math.round(pt.y); }

    var angAB = Math.atan2(mAB.y - cy, mAB.x - cx);
    var angBC = Math.atan2(mBC.y - cy, mBC.x - cx);
    var angAC = Math.atan2(mAC.y - cy, mAC.x - cx);

    var gapAngle = gap / R;

    var topArcS = circlePoint(angAC + gapAngle);
    var topArcE = circlePoint(angAB - gapAngle);
    var blArcS = circlePoint(angAB + gapAngle);
    var blArcE = circlePoint(angBC - gapAngle);
    var brArcS = circlePoint(angBC + gapAngle);
    var brArcE = circlePoint(angAC - gapAngle);

    var O = { x: cx, y: cy };
    var mAB_t = offsetPerp(mAB, O, gap, -1);
    var mAB_bl = offsetPerp(mAB, O, gap, 1);
    var mBC_bl = offsetPerp(mBC, O, gap, -1);
    var mBC_br = offsetPerp(mBC, O, gap, 1);
    var mAC_t = offsetPerp(mAC, O, gap, 1);
    var mAC_br = offsetPerp(mAC, O, gap, -1);

    // Build section paths with QUADRATIC bezier (Q) for rounding - no control points needed
    function sectionPath(arcStart, midStart, vertex, midEnd, arcEnd) {
        var d1 = unitVec(vertex, midStart);
        var d2 = unitVec(vertex, midEnd);
        var before = { x: vertex.x + d1.x * rr, y: vertex.y + d1.y * rr };
        var after = { x: vertex.x + d2.x * rr, y: vertex.y + d2.y * rr };

        return 'M ' + p(arcStart) +
            ' L ' + p(midStart) +
            ' L ' + p(before) +
            ' Q ' + p(vertex) + ' ' + p(after) +
            ' L ' + p(midEnd) +
            ' L ' + p(arcEnd) +
            ' A ' + R + ' ' + R + ' 0 0 1 ' + p(arcStart) + ' Z';
    }

    var pathTop = sectionPath(topArcE, mAB_t, vTop, mAC_t, topArcS);
    var pathBL = sectionPath(blArcS, mAB_bl, vBotL, mBC_bl, blArcE);
    var pathBR = sectionPath(brArcS, mBC_br, vBotR, mAC_br, brArcE);

    // Liquid fill
    var liquidLevel = 200 - (total / 100) * 160;
    var liqTop = cy - R + liquidLevel;

    // Badge rendering - BIGGER badges
    function badgeSVG(m, bx, by) {
        var oW = 80, oH = 30, sg = 52;
        var subR = 22; // circle badge radius
        return '' +
            // ОБЩИЕ rounded rect badge
            '<rect x="' + (bx - oW / 2) + '" y="' + by + '" width="' + oW + '" height="' + oH + '" rx="10" fill="#6d7a2a" />' +
            '<text x="' + bx + '" y="' + (by + 21) + '" text-anchor="middle" font-size="16" font-weight="700" fill="#fff" font-family="Segoe UI,sans-serif">' + m.overall + '%</text>' +
            '<text x="' + bx + '" y="' + (by + oH + 15) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#666" font-family="Segoe UI,sans-serif" letter-spacing="1">ОБЩИЕ</text>' +
            // СКОРОСТЬ circle
            '<circle cx="' + (bx - sg) + '" cy="' + (by + oH + 42) + '" r="' + subR + '" fill="' + getBadgeColor(m.speed) + '" />' +
            '<text x="' + (bx - sg) + '" y="' + (by + oH + 48) + '" text-anchor="middle" font-size="13" font-weight="700" fill="' + getBadgeTextColor(m.speed) + '" font-family="Segoe UI,sans-serif">' + m.speed + '%</text>' +
            '<text x="' + (bx - sg) + '" y="' + (by + oH + 68) + '" text-anchor="middle" font-size="8" font-weight="700" fill="#666" font-family="Segoe UI,sans-serif" letter-spacing="0.5">СКОРОСТЬ</text>' +
            // ER circle
            '<circle cx="' + bx + '" cy="' + (by + oH + 42) + '" r="' + subR + '" fill="' + getBadgeColor(m.er) + '" />' +
            '<text x="' + bx + '" y="' + (by + oH + 48) + '" text-anchor="middle" font-size="13" font-weight="700" fill="' + getBadgeTextColor(m.er) + '" font-family="Segoe UI,sans-serif">' + m.er + '%</text>' +
            '<text x="' + bx + '" y="' + (by + oH + 68) + '" text-anchor="middle" font-size="8" font-weight="700" fill="#666" font-family="Segoe UI,sans-serif" letter-spacing="0.5">ER</text>' +
            // ТЕСТ circle
            '<circle cx="' + (bx + sg) + '" cy="' + (by + oH + 42) + '" r="' + subR + '" fill="' + getBadgeColor(m.test) + '" />' +
            '<text x="' + (bx + sg) + '" y="' + (by + oH + 48) + '" text-anchor="middle" font-size="13" font-weight="700" fill="' + getBadgeTextColor(m.test) + '" font-family="Segoe UI,sans-serif">' + m.test + '%</text>' +
            '<text x="' + (bx + sg) + '" y="' + (by + oH + 68) + '" text-anchor="middle" font-size="8" font-weight="700" fill="#666" font-family="Segoe UI,sans-serif" letter-spacing="0.5">ТЕСТ</text>';
    }

    // Badge positions INSIDE sections
    var topBadgeY = 115;
    var blBadgeY = 468;
    var brBadgeY = 468;

    container.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="triangle-svg">' +
        '<defs>' +
        '<filter id="neuShadow" x="-15%" y="-15%" width="130%" height="130%">' +
        '<feDropShadow dx="6" dy="6" stdDeviation="8" flood-color="#b8bec7" flood-opacity="0.6"/>' +
        '<feDropShadow dx="-4" dy="-4" stdDeviation="6" flood-color="#ffffff" flood-opacity="0.9"/>' +
        '</filter>' +
        '<filter id="cShadow"><feDropShadow dx="0" dy="3" stdDeviation="12" flood-opacity="0.2"/></filter>' +
        '<clipPath id="kpiCC"><circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" /></clipPath>' +
        '<linearGradient id="kpiLiq" x1="0%" y1="0%" x2="0%" y2="100%">' +
        '<stop offset="0%" style="stop-color:#E3FB1E;stop-opacity:0.9"/>' +
        '<stop offset="100%" style="stop-color:#9ab012;stop-opacity:1"/>' +
        '</linearGradient>' +
        '</defs>' +

        // 3 SECTIONS
        '<path d="' + pathTop + '" fill="' + sectionFill + '" filter="url(#neuShadow)" />' +
        '<path d="' + pathBL + '" fill="' + sectionFill + '" filter="url(#neuShadow)" />' +
        '<path d="' + pathBR + '" fill="' + sectionFill + '" filter="url(#neuShadow)" />' +

        // MONTH LABELS inside sections
        '<text x="350" y="100" text-anchor="middle" font-size="20" font-weight="800" fill="#555" font-family="Segoe UI,sans-serif" letter-spacing="3">' + monthNames[0] + '</text>' +
        '<text x="170" y="455" text-anchor="middle" font-size="20" font-weight="800" fill="#555" font-family="Segoe UI,sans-serif" letter-spacing="3">' + monthNames[1] + '</text>' +
        '<text x="530" y="455" text-anchor="middle" font-size="20" font-weight="800" fill="#555" font-family="Segoe UI,sans-serif" letter-spacing="3">' + monthNames[2] + '</text>' +

        // BADGES inside sections
        badgeSVG(months[0], 350, topBadgeY) +
        badgeSVG(months[1], 170, blBadgeY) +
        badgeSVG(months[2], 530, brBadgeY) +

        // CENTER CIRCLE
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 10) + '" fill="white" filter="url(#cShadow)" />' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 4) + '" fill="white" stroke="#eee" stroke-width="1" />' +

        // LIQUID FILL
        '<g clip-path="url(#kpiCC)">' +
        '<rect x="' + (cx - R) + '" y="' + liqTop + '" width="' + (R * 2) + '" height="' + (R * 2) + '" fill="url(#kpiLiq)">' +
        '<animate attributeName="y" values="' + (liqTop + 2) + ';' + (liqTop - 2) + ';' + (liqTop + 2) + '" dur="4s" repeatCount="indefinite" />' +
        '</rect>' +
        '<path class="wave-path" d="M' + (cx - R - 40) + ',' + (liqTop + 10) + ' Q' + (cx - 40) + ',' + (liqTop - 10) + ' ' + cx + ',' + (liqTop + 10) + ' Q' + (cx + 40) + ',' + (liqTop + 30) + ' ' + (cx + R + 40) + ',' + (liqTop + 10) + ' L' + (cx + R + 40) + ',' + (cy + R + 20) + ' L' + (cx - R - 40) + ',' + (cy + R + 20) + ' Z" fill="#c4d916" />' +
        '<path class="wave-path wave-path-2" d="M' + (cx - R - 40) + ',' + (liqTop + 5) + ' Q' + (cx - 20) + ',' + (liqTop - 14) + ' ' + (cx + 20) + ',' + (liqTop + 5) + ' Q' + (cx + 60) + ',' + (liqTop + 24) + ' ' + (cx + R + 40) + ',' + (liqTop + 5) + ' L' + (cx + R + 40) + ',' + (cy + R + 20) + ' L' + (cx - R - 40) + ',' + (cy + R + 20) + ' Z" fill="rgba(227,251,30,0.5)" />' +
        '</g>' +

        // ИТОГ text
        '<text x="' + cx + '" y="' + (cy - 16) + '" text-anchor="middle" font-size="26" font-weight="800" fill="#333" font-family="Segoe UI,sans-serif">ИТОГ</text>' +
        '<text x="' + cx + '" y="' + (cy + 34) + '" text-anchor="middle" font-size="54" font-weight="900" fill="#7a8f0f" font-family="Segoe UI,sans-serif" font-style="italic">' + total + '%</text>' +

        '</svg>';
}

// =================== CARDS ===================

function renderGradeCard() {
    var el = document.getElementById('kpiGradeName');
    var nextEl = document.getElementById('kpiGradeNext');
    var imgEl = document.getElementById('kpiGradeImage');
    if (el) el.textContent = KPI_GRADE_DEMO.current;
    if (nextEl) nextEl.innerHTML = 'СЛЕД.ГРЕЙД: <span class="kpi-grade-next-value">' + KPI_GRADE_DEMO.next + '</span>';
    if (imgEl) imgEl.textContent = KPI_GRADE_DEMO.image;
}

function renderContributionCard() {
    var codeEl = document.getElementById('kpiContribCode');
    var descEl = document.getElementById('kpiContribDesc');
    if (codeEl) codeEl.textContent = KPI_CONTRIBUTION_DEMO.code;
    if (descEl) descEl.textContent = KPI_CONTRIBUTION_DEMO.description;
}

function renderTransitionsCard() {
    var c = document.getElementById('kpiTransitionsBody');
    if (!c) return;
    c.innerHTML = KPI_TRANSITIONS_DEMO.map(function (t) {
        return '<div class="kpi-transition-block"><div class="kpi-transition-header"><div>' +
            '<div class="kpi-transition-type">' + t.type + '</div>' +
            '<div class="kpi-transition-available">ДОСТУПЕН ЛИ ПЕРЕВОД? <strong>' + (t.available ? 'ДА' : 'НЕТ') + '</strong></div>' +
            '</div><div class="kpi-transition-dates">' +
            '<span><span class="label">ПОСЛЕДНИЙ</span>' + t.lastDate + '</span>' +
            '<span><span class="label">СЛЕДУЮЩИЙ</span>' + t.nextDate + '</span>' +
            '</div></div>' +
            '<div class="kpi-progress-bar-container">' +
            '<span class="kpi-progress-date">' + t.lastDate + '</span>' +
            '<div class="kpi-progress-bar"><div class="kpi-progress-fill ' + (t.variant === 'orange' ? 'orange' : '') + '" style="width:' + t.progress + '%"></div></div>' +
            '<span class="kpi-progress-date">' + t.nextDate + '</span></div></div>';
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

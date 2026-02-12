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

// =================== HELPERS ===================

function getBadgeColor(v) {
    if (v >= 80) return '#4CAF50';
    if (v >= 60) return '#FFC107';
    return '#f44336';
}
function getBadgeTextColor(v) {
    return (v >= 60 && v < 80) ? '#333' : '#fff';
}

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

    // Geometry - viewBox 600x650
    var cx = 300, cy = 340, R = 100;
    var gap = 8; // gap between sections

    // Neumorphic section fill color (matches --block-bg)
    var sectionFill = '#e8ecf1';
    var sectionStroke = 'none';

    // Triangle vertices (very rounded)
    // We build 3 sections using cubic bezier curves for very smooth rounding
    // Each section: from circle edge → along gap edge → rounded vertex → along other gap edge → back to circle

    // The key points for each section:
    // TOP section: vertex at top, opens downward
    // BOTTOM-LEFT: vertex at bottom-left
    // BOTTOM-RIGHT: vertex at bottom-right

    // Direction from center to each edge midpoint
    var mAB = { x: 155, y: 285 };  // midpoint of top-left edge
    var mBC = { x: 300, y: 545 };  // midpoint of bottom edge
    var mAC = { x: 445, y: 285 };  // midpoint of top-right edge

    // Vertex positions (these are the "peak" of each section)
    var vTop = { x: 300, y: 40 };
    var vBotL = { x: 25, y: 545 };
    var vBotR = { x: 575, y: 545 };

    // Circle intersection points along dividing lines
    function circlePoint(angle) {
        return {
            x: cx + R * Math.cos(angle),
            y: cy + R * Math.sin(angle)
        };
    }

    // Angles of dividing lines from center
    var angToMAB = Math.atan2(mAB.y - cy, mAB.x - cx);  // upper-left ~= -200deg
    var angToMBC = Math.atan2(mBC.y - cy, mBC.x - cx);   // bottom ~= 90deg
    var angToMAC = Math.atan2(mAC.y - cy, mAC.x - cx);   // upper-right

    // Gap offset in radians (~gap pixels / R)
    var gapAngle = gap / R;

    // Circle boundary points for each section (offset by gap)
    // TOP section: from angToMAC+gap to angToMAB-gap (going CCW through top)
    var topArcStart = circlePoint(angToMAC + gapAngle);
    var topArcEnd = circlePoint(angToMAB - gapAngle);

    // BOT-LEFT section: from angToMAB+gap to angToMBC-gap (going CW through left-bottom)
    var blArcStart = circlePoint(angToMAB + gapAngle);
    var blArcEnd = circlePoint(angToMBC - gapAngle);

    // BOT-RIGHT section: from angToMBC+gap to angToMAC-gap (going CW through right)
    var brArcStart = circlePoint(angToMBC + gapAngle);
    var brArcEnd = circlePoint(angToMAC - gapAngle);

    // Offset edge midpoints along the gap perpendicular
    function offsetPoint(pt, center, gapPx, side) {
        var dx = pt.x - center.x, dy = pt.y - center.y;
        var len = Math.sqrt(dx * dx + dy * dy);
        // perpendicular: rotate 90 degrees
        var px = -dy / len * gapPx * side;
        var py = dx / len * gapPx * side;
        return { x: pt.x + px, y: pt.y + py };
    }

    // For each section, offset the midpoints to create gap
    var mAB_top = offsetPoint(mAB, { x: cx, y: cy }, gap, -1);
    var mAB_bl = offsetPoint(mAB, { x: cx, y: cy }, gap, 1);
    var mBC_bl = offsetPoint(mBC, { x: cx, y: cy }, gap, -1);
    var mBC_br = offsetPoint(mBC, { x: cx, y: cy }, gap, 1);
    var mAC_top = offsetPoint(mAC, { x: cx, y: cy }, gap, 1);
    var mAC_br = offsetPoint(mAC, { x: cx, y: cy }, gap, -1);

    // Rounding radius for vertices - VERY large for blob-like corners
    var rr = 70;

    function p(pt) { return Math.round(pt.x) + ',' + Math.round(pt.y); }

    // Build section paths with cubic bezier for very smooth rounding
    // Each path: circle point → edge midpoint → approach vertex → CUBIC curve at vertex → other edge midpoint → other circle point → arc along circle
    function sectionPath(arcStart, midStart, vertex, midEnd, arcEnd, sweepLarge) {
        // Direction from vertex toward each midpoint
        var d1x = midStart.x - vertex.x, d1y = midStart.y - vertex.y;
        var d1len = Math.sqrt(d1x * d1x + d1y * d1y);
        var d2x = midEnd.x - vertex.x, d2y = midEnd.y - vertex.y;
        var d2len = Math.sqrt(d2x * d2x + d2y * d2y);

        // Points before/after vertex for rounding
        var before = {
            x: vertex.x + (d1x / d1len) * rr,
            y: vertex.y + (d1y / d1len) * rr
        };
        var after = {
            x: vertex.x + (d2x / d2len) * rr,
            y: vertex.y + (d2y / d2len) * rr
        };

        // Control points for cubic bezier (pull toward vertex for smooth round)
        var cp1 = {
            x: vertex.x + (d1x / d1len) * (rr * 0.25),
            y: vertex.y + (d1y / d1len) * (rr * 0.25)
        };
        var cp2 = {
            x: vertex.x + (d2x / d2len) * (rr * 0.25),
            y: vertex.y + (d2y / d2len) * (rr * 0.25)
        };

        return 'M ' + p(arcStart) +
            ' L ' + p(midStart) +
            ' L ' + p(before) +
            ' C ' + p(cp1) + ' ' + p(cp2) + ' ' + p(after) +
            ' L ' + p(midEnd) +
            ' L ' + p(arcEnd) +
            ' A ' + R + ' ' + R + ' 0 ' + (sweepLarge ? '1' : '0') + ' 1 ' + p(arcStart) +
            ' Z';
    }

    // Build 3 section paths
    var pathTop = sectionPath(topArcEnd, mAB_top, vTop, mAC_top, topArcStart, 0);
    var pathBL = sectionPath(blArcStart, mAB_bl, vBotL, mBC_bl, blArcEnd, 0);
    var pathBR = sectionPath(brArcStart, mBC_br, vBotR, mAC_br, brArcEnd, 0);

    // Liquid fill level
    var liquidLevel = 200 - (total / 100) * 160;
    var liqTop = cy - R + liquidLevel;

    // Neumorphic drop shadow filter
    var neuFilter = '<filter id="neuShadow" x="-10%" y="-10%" width="120%" height="120%">' +
        '<feDropShadow dx="6" dy="6" stdDeviation="8" flood-color="#b8bec7" flood-opacity="0.6"/>' +
        '<feDropShadow dx="-4" dy="-4" stdDeviation="6" flood-color="#ffffff" flood-opacity="0.8"/>' +
        '</filter>';

    // Build badge SVG elements (INSIDE sections)
    function badgeSVG(m, labelX, labelY, badgeY, subY) {
        var subGap = 48;
        var overallW = 70, overallH = 28;
        return '' +
            // ОБЩИЕ badge (rounded rect)
            '<rect x="' + (labelX - overallW / 2) + '" y="' + badgeY + '" width="' + overallW + '" height="' + overallH + '" rx="8" fill="#6d7a2a" />' +
            '<text x="' + labelX + '" y="' + (badgeY + 19) + '" text-anchor="middle" font-size="14" font-weight="700" fill="#fff" font-family="Segoe UI,sans-serif">' + m.overall + '%</text>' +
            '<text x="' + labelX + '" y="' + (badgeY + overallH + 13) + '" text-anchor="middle" font-size="10" font-weight="700" fill="#555" font-family="Segoe UI,sans-serif" letter-spacing="1">ОБЩИЕ</text>' +
            // СКОРОСТЬ circle
            '<circle cx="' + (labelX - subGap) + '" cy="' + (subY + 18) + '" r="20" fill="' + getBadgeColor(m.speed) + '" />' +
            '<text x="' + (labelX - subGap) + '" y="' + (subY + 23) + '" text-anchor="middle" font-size="12" font-weight="700" fill="' + getBadgeTextColor(m.speed) + '" font-family="Segoe UI,sans-serif">' + m.speed + '%</text>' +
            '<text x="' + (labelX - subGap) + '" y="' + (subY + 52) + '" text-anchor="middle" font-size="8" font-weight="700" fill="#555" font-family="Segoe UI,sans-serif" letter-spacing="0.5">СКОРОСТЬ</text>' +
            // ER circle
            '<circle cx="' + labelX + '" cy="' + (subY + 18) + '" r="20" fill="' + getBadgeColor(m.er) + '" />' +
            '<text x="' + labelX + '" y="' + (subY + 23) + '" text-anchor="middle" font-size="12" font-weight="700" fill="' + getBadgeTextColor(m.er) + '" font-family="Segoe UI,sans-serif">' + m.er + '%</text>' +
            '<text x="' + labelX + '" y="' + (subY + 52) + '" text-anchor="middle" font-size="8" font-weight="700" fill="#555" font-family="Segoe UI,sans-serif" letter-spacing="0.5">ER</text>' +
            // ТЕСТ circle
            '<circle cx="' + (labelX + subGap) + '" cy="' + (subY + 18) + '" r="20" fill="' + getBadgeColor(m.test) + '" />' +
            '<text x="' + (labelX + subGap) + '" y="' + (subY + 23) + '" text-anchor="middle" font-size="12" font-weight="700" fill="' + getBadgeTextColor(m.test) + '" font-family="Segoe UI,sans-serif">' + m.test + '%</text>' +
            '<text x="' + (labelX + subGap) + '" y="' + (subY + 52) + '" text-anchor="middle" font-size="8" font-weight="700" fill="#555" font-family="Segoe UI,sans-serif" letter-spacing="0.5">ТЕСТ</text>';
    }

    container.innerHTML = '<svg viewBox="0 0 600 650" class="triangle-svg" style="width:100%;height:auto;">' +
        '<defs>' +
        neuFilter +
        '<filter id="circleShadow3"><feDropShadow dx="0" dy="3" stdDeviation="10" flood-opacity="0.2"/></filter>' +
        '<clipPath id="kpiCircleClip"><circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" /></clipPath>' +
        '<linearGradient id="kpiLiquid" x1="0%" y1="0%" x2="0%" y2="100%">' +
        '<stop offset="0%" style="stop-color:#E3FB1E;stop-opacity:0.9" />' +
        '<stop offset="100%" style="stop-color:#9ab012;stop-opacity:1" />' +
        '</linearGradient>' +
        '</defs>' +

        // Section 1: TOP
        '<path d="' + pathTop + '" fill="' + sectionFill + '" filter="url(#neuShadow)" />' +
        // Section 2: BOTTOM-LEFT
        '<path d="' + pathBL + '" fill="' + sectionFill + '" filter="url(#neuShadow)" />' +
        // Section 3: BOTTOM-RIGHT
        '<path d="' + pathBR + '" fill="' + sectionFill + '" filter="url(#neuShadow)" />' +

        // Month labels INSIDE sections
        '<text x="300" y="110" text-anchor="middle" font-size="18" font-weight="800" fill="#555" font-family="Segoe UI,sans-serif" letter-spacing="3">' + monthNames[0] + '</text>' +
        '<text x="145" y="480" text-anchor="middle" font-size="18" font-weight="800" fill="#555" font-family="Segoe UI,sans-serif" letter-spacing="3">' + monthNames[1] + '</text>' +
        '<text x="455" y="480" text-anchor="middle" font-size="18" font-weight="800" fill="#555" font-family="Segoe UI,sans-serif" letter-spacing="3">' + monthNames[2] + '</text>' +

        // Badges INSIDE sections
        // Top section badges
        badgeSVG(months[0], 300, 122, 122, 170) +
        // Bottom-left section badges
        badgeSVG(months[1], 145, 492, 492, 540) +
        // Bottom-right section badges
        badgeSVG(months[2], 455, 492, 492, 540) +

        // CENTER CIRCLE - white background with shadow
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 8) + '" fill="white" filter="url(#circleShadow3)" />' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 3) + '" fill="white" stroke="#eee" stroke-width="1" />' +

        // Liquid fill
        '<g clip-path="url(#kpiCircleClip)">' +
        '<rect x="' + (cx - R) + '" y="' + liqTop + '" width="' + (R * 2) + '" height="' + (R * 2) + '" fill="url(#kpiLiquid)">' +
        '<animate attributeName="y" values="' + (liqTop + 2) + ';' + (liqTop - 2) + ';' + (liqTop + 2) + '" dur="4s" repeatCount="indefinite" />' +
        '</rect>' +
        '<path class="wave-path" d="M' + (cx - R - 40) + ',' + (liqTop + 10) + ' Q' + (cx - 50) + ',' + (liqTop - 8) + ' ' + cx + ',' + (liqTop + 10) + ' Q' + (cx + 50) + ',' + (liqTop + 28) + ' ' + (cx + R + 40) + ',' + (liqTop + 10) + ' L' + (cx + R + 40) + ',' + (cy + R + 20) + ' L' + (cx - R - 40) + ',' + (cy + R + 20) + ' Z" fill="#c4d916" />' +
        '<path class="wave-path wave-path-2" d="M' + (cx - R - 40) + ',' + (liqTop + 5) + ' Q' + (cx - 30) + ',' + (liqTop - 12) + ' ' + (cx + 20) + ',' + (liqTop + 5) + ' Q' + (cx + 70) + ',' + (liqTop + 22) + ' ' + (cx + R + 40) + ',' + (liqTop + 5) + ' L' + (cx + R + 40) + ',' + (cy + R + 20) + ' L' + (cx - R - 40) + ',' + (cy + R + 20) + ' Z" fill="rgba(227,251,30,0.5)" />' +
        '</g>' +

        // ИТОГ text
        '<text x="' + cx + '" y="' + (cy - 14) + '" text-anchor="middle" font-size="22" font-weight="800" fill="#333" font-family="Segoe UI,sans-serif">ИТОГ</text>' +
        '<text x="' + cx + '" y="' + (cy + 30) + '" text-anchor="middle" font-size="48" font-weight="900" fill="#7a8f0f" font-family="Segoe UI,sans-serif" font-style="italic">' + total + '%</text>' +

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

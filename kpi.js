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

let kpiData = {};

// Empty quarter template
function emptyQuarter() {
    return {
        months: [
            { overall: 0, speed: 0, er: 0, test: 0 },
            { overall: 0, speed: 0, er: 0, test: 0 },
            { overall: 0, speed: 0, er: 0, test: 0 }
        ],
        total: 0
    };
}

// Auto-calculate overall & total
function recalcQuarter(qData) {
    if (!qData || !qData.months) return;
    var sum = 0;
    qData.months.forEach(function (m) {
        m.overall = Math.round((m.speed + m.er + m.test) / 3);
        sum += m.overall;
    });
    qData.total = Math.round(sum / 3);
}

// Ensure year/quarter structure exists
function ensureKpiStructure(year, quarter) {
    if (!kpiData[year]) kpiData[year] = {};
    if (!kpiData[year][quarter]) kpiData[year][quarter] = emptyQuarter();
    return kpiData[year][quarter];
}

// Load saved KPI data from localStorage
(function loadSavedKpiData() {
    try {
        var saved = localStorage.getItem('okk_kpi_data');
        if (saved) {
            kpiData = JSON.parse(saved);
            console.log('✅ KPI Data loaded from localStorage');
        }
    } catch (e) { console.error('Failed to load kpiData from localStorage', e); }
})();

const KPI_GRADE_DEMO = { current: 'SENIOR', next: 'JUNIOR+', image: '🎖️' };

// Load saved grade from localStorage on init
(function loadSavedGrade() {
    try {
        var saved = localStorage.getItem('okk_kpi_grade');
        if (saved) {
            KPI_GRADE_DEMO.current = saved;
            console.log('✅ KPI Grade loaded from localStorage:', saved);
        }
    } catch (e) { /* ignore */ }
})();
const KPI_CONTRIBUTION_DEMO = { code: 'OK-2026-001', date: '01.02.2026', description: 'Описание последнего вклада' };
let KPI_TRANSITIONS_DEMO = [
    { type: 'ТОЛЬКО ТАРГЕТ', available: true, lastDate: '01.01.2026', nextDate: '01.04.2026', progress: 65, variant: 'accent' },
    { type: 'ТАРГЕТ + ВКЛАД', available: true, lastDate: '01.01.2026', nextDate: '01.07.2026', progress: 40, variant: 'orange' },
];

// Load saved transitions from localStorage
(function loadSavedTransitions() {
    try {
        var saved = localStorage.getItem('okk_kpi_transitions');
        if (saved) {
            KPI_TRANSITIONS_DEMO = JSON.parse(saved);
            console.log('✅ KPI Transitions loaded from localStorage');
        }
    } catch (e) { console.error('Failed to load transitions from localStorage', e); }
})();

// =================== RENDER ===================

function renderKpiView() {
    var container = document.getElementById('kpiContent');
    if (!container) return;
    var yearSelect = document.getElementById('kpiYearSelect');
    if (yearSelect) yearSelect.value = kpiState.year;
    var qSel = document.getElementById('kpiQuarterSelect');
    if (qSel) qSel.value = kpiState.quarter;
    var qData = ensureKpiStructure(kpiState.year, kpiState.quarter);
    renderTriangleChart(qData);
    renderGradeCard();
    renderContributionCard();
    renderTransitionsCard();
    initKpiDataModal();
    initTransitionsModal();
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
    // Equilateral triangle: side = 680, height = 680 * sqrt(3)/2 ≈ 589
    var W = 700, H = 670;
    var side = 680;
    var triH = Math.round(side * Math.sqrt(3) / 2); // ≈ 589

    // Vertices of equilateral triangle — pushed up
    var vTop = { x: 350, y: 610 - triH };   // ≈ 21
    var vBotL = { x: 10, y: 610 };
    var vBotR = { x: 690, y: 610 };

    // Center circle at triangle centroid
    var cx = 350, cy = Math.round((vTop.y + vBotL.y + vBotR.y) / 3); // ≈ 454
    var R = 110;
    var gapFactor = 0.06;  // move midpoints 6% toward their section's vertex
    var rr = 150;

    var sectionFill = '#f4f6f9'; // near-white, shadows will separate from bg

    // Edge midpoints
    var mAB = { x: (vTop.x + vBotL.x) / 2, y: (vTop.y + vBotL.y) / 2 };
    var mBC = { x: (vBotL.x + vBotR.x) / 2, y: (vBotL.y + vBotR.y) / 2 };
    var mAC = { x: (vTop.x + vBotR.x) / 2, y: (vTop.y + vBotR.y) / 2 };

    function circlePoint(angle) { return { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) }; }
    function unitVec(a, b) {
        var dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy);
        return { x: dx / len, y: dy / len };
    }
    // Lerp: move point 'from' toward point 'to' by fraction t
    function lerp(from, to, t) {
        return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
    }
    function p(pt) { return Math.round(pt.x) + ',' + Math.round(pt.y); }

    // Angles from center to edge midpoints
    var angAB = Math.atan2(mAB.y - cy, mAB.x - cx);
    var angBC = Math.atan2(mBC.y - cy, mBC.x - cx);
    var angAC = Math.atan2(mAC.y - cy, mAC.x - cx);

    // Gap on circle: offset angle ~3 degrees
    var gapAng = 0.06;

    // Circle arc points per section (offset from dividing line angles)
    // TOP section arc: between angAB and angAC, going through the top of circle
    var topArcE = circlePoint(angAB - gapAng);  // shift away from AB toward top
    var topArcS = circlePoint(angAC + gapAng);  // shift away from AC toward top

    // BOTTOM-LEFT section arc: between angAB and angBC, going through bottom-left
    var blArcS = circlePoint(angAB + gapAng);  // shift away from AB toward bot-left
    var blArcE = circlePoint(angBC - gapAng);  // shift away from BC toward bot-left

    // BOTTOM-RIGHT section arc: between angBC and angAC, going through bottom-right
    var brArcS = circlePoint(angBC + gapAng);  // shift away from BC toward bot-right
    var brArcE = circlePoint(angAC - gapAng);  // shift away from AC toward bot-right

    // Gap on midpoints: lerp each midpoint toward the section's vertex
    // TOP section uses mAB and mAC, lerped toward vTop
    var mAB_t = lerp(mAB, vTop, gapFactor);
    var mAC_t = lerp(mAC, vTop, gapFactor);
    // BOTTOM-LEFT section uses mAB and mBC, lerped toward vBotL
    var mAB_bl = lerp(mAB, vBotL, gapFactor);
    var mBC_bl = lerp(mBC, vBotL, gapFactor);
    // BOTTOM-RIGHT section uses mBC and mAC, lerped toward vBotR
    var mBC_br = lerp(mBC, vBotR, gapFactor);
    var mAC_br = lerp(mAC, vBotR, gapFactor);

    // Build section paths with QUADRATIC bezier for rounding
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

    // Badge rendering — premium neumorphic style
    function getBadgeGradient(v) {
        if (v >= 80) return 'url(#gradGreen)';
        if (v >= 60) return 'url(#gradYellow)';
        return 'url(#gradRed)';
    }

    function badgeSVG(m, bx, by, circleYShift) {
        var oW = 80, oH = 30, sg = 40;
        var subR = 16;
        var cY = by + oH + 42 + (circleYShift || 0);

        function circleBadge(cx, cy, val, label) {
            return '<circle cx="' + cx + '" cy="' + cy + '" r="' + (subR + 2) + '" fill="#dde1e7" filter="url(#badgeNeuOuter)" />' +
                '<circle cx="' + cx + '" cy="' + cy + '" r="' + subR + '" fill="' + getBadgeGradient(val) + '" filter="url(#badgeGlow)" />' +
                '<text x="' + cx + '" y="' + (cy + 1) + '" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="800" fill="#fff" font-family="Segoe UI,sans-serif">' + val + '%</text>' +
                '<text x="' + cx + '" y="' + (cy + subR + 13) + '" text-anchor="middle" font-size="7" font-weight="700" fill="#8a8f99" font-family="Segoe UI,sans-serif" letter-spacing="0.5">' + label + '</text>';
        }

        return '' +
            // ОБЩИЕ pill badge
            '<rect x="' + (bx - oW / 2) + '" y="' + by + '" width="' + oW + '" height="' + oH + '" rx="12" fill="url(#gradOverall)" filter="url(#badgePillShadow)" />' +
            '<text x="' + bx + '" y="' + (by + 21) + '" text-anchor="middle" font-size="15" font-weight="800" fill="#fff" font-family="Segoe UI,sans-serif" letter-spacing="0.5">' + m.overall + '%</text>' +
            // ОБЩИЕ label
            '<text x="' + bx + '" y="' + (by + oH + 14) + '" text-anchor="middle" font-size="9" font-weight="800" fill="#8a8f99" font-family="Segoe UI,sans-serif" letter-spacing="2">ОБЩИЕ</text>' +
            // Sub-circles
            circleBadge(bx - sg, cY, m.speed, 'СКОРОСТЬ') +
            circleBadge(bx, cY, m.er, 'ER') +
            circleBadge(bx + sg, cY, m.test, 'ТЕСТ');
    }

    // Badge positions INSIDE sections
    var topBadgeY = 175;
    var blBadgeY = 490;
    var brBadgeY = 490;

    container.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="triangle-svg">' +
        '<defs>' +
        // Neumorphic raised shadow for sections
        '<filter id="neuShadow" x="-18%" y="-18%" width="136%" height="136%">' +
        '<feDropShadow dx="8" dy="8" stdDeviation="12" flood-color="#b0b8c4" flood-opacity="0.55"/>' +
        '<feDropShadow dx="-6" dy="-6" stdDeviation="10" flood-color="#ffffff" flood-opacity="0.85"/>' +
        '</filter>' +
        // Inset shadow for center circle — simple approach
        '<filter id="cInsetDark" x="-10%" y="-10%" width="120%" height="120%">' +
        '<feDropShadow dx="4" dy="4" stdDeviation="8" flood-color="#a0a8b8" flood-opacity="0.6"/>' +
        '</filter>' +
        '<filter id="cInsetLight" x="-10%" y="-10%" width="120%" height="120%">' +
        '<feDropShadow dx="-3" dy="-3" stdDeviation="6" flood-color="#ffffff" flood-opacity="0.8"/>' +
        '</filter>' +
        // Badge neumorphic outer ring
        '<filter id="badgeNeuOuter" x="-30%" y="-30%" width="160%" height="160%">' +
        '<feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#b0b5be" flood-opacity="0.5"/>' +
        '<feDropShadow dx="-1" dy="-1" stdDeviation="2" flood-color="#ffffff" flood-opacity="0.7"/>' +
        '</filter>' +
        // Badge inner glow
        '<filter id="badgeGlow" x="-20%" y="-20%" width="140%" height="140%">' +
        '<feDropShadow dx="0" dy="1" stdDeviation="3" flood-color="rgba(0,0,0,0.25)" flood-opacity="0.4"/>' +
        '</filter>' +
        // Pill badge shadow
        '<filter id="badgePillShadow" x="-15%" y="-15%" width="130%" height="130%">' +
        '<feDropShadow dx="2" dy="3" stdDeviation="4" flood-color="rgba(0,0,0,0.2)" flood-opacity="0.5"/>' +
        '</filter>' +
        // Gradients for badges
        '<linearGradient id="gradOverall" x1="0%" y1="0%" x2="0%" y2="100%">' +
        '<stop offset="0%" stop-color="#8a9a30"/><stop offset="100%" stop-color="#5c6a1e"/>' +
        '</linearGradient>' +
        '<linearGradient id="gradGreen" x1="0%" y1="0%" x2="0%" y2="100%">' +
        '<stop offset="0%" stop-color="#5ece5e"/><stop offset="100%" stop-color="#3a9e3a"/>' +
        '</linearGradient>' +
        '<linearGradient id="gradYellow" x1="0%" y1="0%" x2="0%" y2="100%">' +
        '<stop offset="0%" stop-color="#ffd54f"/><stop offset="100%" stop-color="#f9a825"/>' +
        '</linearGradient>' +
        '<linearGradient id="gradRed" x1="0%" y1="0%" x2="0%" y2="100%">' +
        '<stop offset="0%" stop-color="#ef5350"/><stop offset="100%" stop-color="#c62828"/>' +
        '</linearGradient>' +
        // Liquid fill
        '<clipPath id="kpiCC"><circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" /></clipPath>' +
        '<linearGradient id="kpiLiq" x1="0%" y1="0%" x2="0%" y2="100%">' +
        '<stop offset="0%" style="stop-color:#E3FB1E;stop-opacity:0.9"/>' +
        '<stop offset="100%" style="stop-color:#9ab012;stop-opacity:1"/>' +
        '</linearGradient>' +
        // Inner shadow gradient for petal edges
        '<linearGradient id="innerShadowGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
        '<stop offset="0%" stop-color="#b0b8c4" stop-opacity="0.4"/>' +
        '<stop offset="50%" stop-color="#b0b8c4" stop-opacity="0.05"/>' +
        '<stop offset="100%" stop-color="#ffffff" stop-opacity="0.3"/>' +
        '</linearGradient>' +
        // Depth gradient for center circle
        '<radialGradient id="circleDepth" cx="50%" cy="45%" r="50%">' +
        '<stop offset="0%" stop-color="#ffffff"/>' +
        '<stop offset="60%" stop-color="#f0f2f6"/>' +
        '<stop offset="100%" stop-color="#d5dae4"/>' +
        '</radialGradient>' +
        // Depth gradients for petals
        '<radialGradient id="petalDepthTop" cx="50%" cy="30%" r="60%">' +
        '<stop offset="0%" stop-color="#ffffff"/>' +
        '<stop offset="55%" stop-color="#f2f4f8"/>' +
        '<stop offset="100%" stop-color="#dce1ea"/>' +
        '</radialGradient>' +
        '<radialGradient id="petalDepthBL" cx="35%" cy="65%" r="60%">' +
        '<stop offset="0%" stop-color="#ffffff"/>' +
        '<stop offset="55%" stop-color="#f2f4f8"/>' +
        '<stop offset="100%" stop-color="#dce1ea"/>' +
        '</radialGradient>' +
        '<radialGradient id="petalDepthBR" cx="65%" cy="65%" r="60%">' +
        '<stop offset="0%" stop-color="#ffffff"/>' +
        '<stop offset="55%" stop-color="#f2f4f8"/>' +
        '<stop offset="100%" stop-color="#dce1ea"/>' +
        '</radialGradient>' +
        // Glass shine for liquid — sharper reflection
        '<linearGradient id="glassShine" x1="0%" y1="0%" x2="0%" y2="100%">' +
        '<stop offset="0%" stop-color="#ffffff" stop-opacity="0.6"/>' +
        '<stop offset="100%" stop-color="#ffffff" stop-opacity="0.0"/>' +
        '</linearGradient>' +
        '</defs>' +

        // 3 SECTIONS — raised neumorphism with depth gradient
        '<path d="' + pathTop + '" fill="url(#petalDepthTop)" filter="url(#neuShadow)" />' +
        '<path d="' + pathBL + '" fill="url(#petalDepthBL)" filter="url(#neuShadow)" />' +
        '<path d="' + pathBR + '" fill="url(#petalDepthBR)" filter="url(#neuShadow)" />' +
        // Subtle inner shadow for depth (dark top-left edge)
        '<path d="' + pathTop + '" fill="none" stroke="url(#innerShadowGrad)" stroke-width="4" />' +
        '<path d="' + pathBL + '" fill="none" stroke="url(#innerShadowGrad)" stroke-width="4" />' +
        '<path d="' + pathBR + '" fill="none" stroke="url(#innerShadowGrad)" stroke-width="4" />' +

        // MONTH LABELS inside sections — Lighter and Thinner (SemiBold)
        '<text x="350" y="160" text-anchor="middle" font-size="18" font-weight="700" fill="#889099" font-family="Segoe UI,sans-serif" letter-spacing="3">' + monthNames[0] + '</text>' +
        '<text x="170" y="475" text-anchor="middle" font-size="18" font-weight="700" fill="#889099" font-family="Segoe UI,sans-serif" letter-spacing="3">' + monthNames[1] + '</text>' +
        '<text x="530" y="475" text-anchor="middle" font-size="18" font-weight="700" fill="#889099" font-family="Segoe UI,sans-serif" letter-spacing="3">' + monthNames[2] + '</text>' +

        // BADGES inside sections
        badgeSVG(months[0], 350, topBadgeY, 0) +
        badgeSVG(months[1], 170, blBadgeY, 0) +
        badgeSVG(months[2], 530, brBadgeY, 0) +

        // CENTER CIRCLE — inset neumorphic via layered circles
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 12) + '" fill="#dce0e8" filter="url(#cInsetDark)" />' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 10) + '" fill="#d4d9e2" />' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 5) + '" fill="#dce0e8" filter="url(#cInsetLight)" />' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 2) + '" fill="url(#circleDepth)" />' +

        // LIQUID FILL
        '<g clip-path="url(#kpiCC)">' +
        '<rect x="' + (cx - R) + '" y="' + liqTop + '" width="' + (R * 2) + '" height="' + (R * 2) + '" fill="url(#kpiLiq)">' +
        '<animate attributeName="y" values="' + (liqTop + 4) + ';' + (liqTop - 4) + ';' + (liqTop + 4) + '" dur="3s" repeatCount="indefinite" />' +
        '</rect>' +

        // Wave 1 - Morphing (Phase 0 -> 360)
        '<path class="wave-path" d="' + createWavePath(cx, liqTop, R, 20, 0) + '" fill="#c4d916">' +
        '<animate attributeName="d" values="' +
        createWavePath(cx, liqTop, R, 20, 0) + ';' +
        createWavePath(cx, liqTop, R, 20, 90) + ';' +
        createWavePath(cx, liqTop, R, 20, 180) + ';' +
        createWavePath(cx, liqTop, R, 20, 270) + ';' +
        createWavePath(cx, liqTop, R, 20, 360) +
        '" dur="4s" repeatCount="indefinite" calcMode="linear" keyTimes="0;0.25;0.5;0.75;1" />' +
        '</path>' +

        // Wave 2 - Morphing (Phase 60 -> 420)
        '<path class="wave-path wave-path-2" d="' + createWavePath(cx, liqTop, R, 15, 60) + '" fill="rgba(227,251,30,0.5)">' +
        '<animate attributeName="d" values="' +
        createWavePath(cx, liqTop, R, 15, 60) + ';' +
        createWavePath(cx, liqTop, R, 15, 150) + ';' +
        createWavePath(cx, liqTop, R, 15, 240) + ';' +
        createWavePath(cx, liqTop, R, 15, 330) + ';' +
        createWavePath(cx, liqTop, R, 15, 420) +
        '" dur="6s" repeatCount="indefinite" calcMode="linear" keyTimes="0;0.25;0.5;0.75;1" />' +
        '</path>' +

        // Gloss effect
        '<path d="M' + (cx - R * 0.8) + ',' + (liqTop + 12) + ' Q' + cx + ',' + (liqTop - 8) + ' ' + (cx + R * 0.8) + ',' + (liqTop + 12) +
        ' Q' + cx + ',' + (liqTop + 18) + ' ' + (cx - R * 0.8) + ',' + (liqTop + 12) + ' Z" fill="url(#glassShine)">' +
        '<animateTransform attributeName="transform" type="translate" values="0 2; 0 -2; 0 2" dur="3s" repeatCount="indefinite" />' +
        '</path>' +
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

    // Calculate next grade
    var ALL_GRADES = ['JUNIOR-', 'JUNIOR', 'JUNIOR+', 'MIDDLE-', 'MIDDLE', 'MIDDLE+', 'SENIOR-', 'SENIOR', 'SENIOR+'];
    var currentIdx = ALL_GRADES.indexOf(KPI_GRADE_DEMO.current);
    var nextGrade = currentIdx < ALL_GRADES.length - 1 ? ALL_GRADES[currentIdx + 1] : '—';
    KPI_GRADE_DEMO.next = nextGrade;

    if (nextEl) nextEl.innerHTML = 'СЛЕД.ГРЕЙД: <span class="kpi-grade-next-value">' + nextGrade + '</span>';

    // Render dynamic character
    if (imgEl) {
        imgEl.innerHTML = getGradeCharacterSVG(KPI_GRADE_DEMO.current);
        imgEl.style.fontSize = '1rem';
        imgEl.style.background = 'none';
        imgEl.style.boxShadow = 'none';
        imgEl.style.width = '100%';
        imgEl.style.maxWidth = '220px';
        imgEl.style.height = 'auto';
        imgEl.style.margin = '8px auto';
        imgEl.style.display = 'flex';
        imgEl.style.justifyContent = 'center';
        imgEl.style.alignItems = 'center';
    }

    // Init modal (once)
    initGradeModal();
}

// =================== KPI DATA MODAL ===================

var _kpiDataModalInited = false;

function initKpiDataModal() {
    if (_kpiDataModalInited) return;
    _kpiDataModalInited = true;

    var modal = document.getElementById('kpiDataModal');
    var editBtn = document.getElementById('kpiDataEditBtn');
    var applyBtn = document.getElementById('kpiDataApply');
    var cancelBtn = document.getElementById('kpiDataCancel');
    var yearSel = document.getElementById('kpiDataYear');
    var quarterSel = document.getElementById('kpiDataQuarter');
    var table = document.getElementById('kpiDataTable');

    if (!modal || !editBtn) return;

    // Sync year options from the main kpiYearSelect
    function syncYearOptions() {
        var mainYearSel = document.getElementById('kpiYearSelect');
        if (mainYearSel && yearSel) {
            yearSel.innerHTML = mainYearSel.innerHTML;
        }
    }

    // Populate the inputs table for the given year/quarter
    function populateTable(year, quarter) {
        var monthNames = QUARTER_MONTHS[quarter] || ['—', '—', '—'];
        var qData = ensureKpiStructure(year, quarter);
        var html = '';

        for (var i = 0; i < 3; i++) {
            var m = qData.months[i];
            html += '<div class="kpi-data-month-row">';
            html += '<div class="kpi-data-month-label">' + monthNames[i] + '</div>';
            html += '<div class="kpi-data-inputs">';
            html += '<div class="kpi-data-input-group">';
            html += '<label>Скорость</label>';
            html += '<input type="number" class="kpi-data-input" data-month="' + i + '" data-metric="speed" min="0" max="100" value="' + (m.speed || 0) + '" placeholder="0">';
            html += '</div>';
            html += '<div class="kpi-data-input-group">';
            html += '<label>ER</label>';
            html += '<input type="number" class="kpi-data-input" data-month="' + i + '" data-metric="er" min="0" max="100" value="' + (m.er || 0) + '" placeholder="0">';
            html += '</div>';
            html += '<div class="kpi-data-input-group">';
            html += '<label>Тест</label>';
            html += '<input type="number" class="kpi-data-input" data-month="' + i + '" data-metric="test" min="0" max="100" value="' + (m.test || 0) + '" placeholder="0">';
            html += '</div>';
            html += '</div>';
            html += '</div>';
        }

        table.innerHTML = html;
    }

    // Open modal
    editBtn.addEventListener('click', function () {
        syncYearOptions();
        yearSel.value = kpiState.year;
        quarterSel.value = kpiState.quarter;
        populateTable(kpiState.year, kpiState.quarter);
        modal.classList.add('active');
    });

    // Year/Quarter change → repopulate
    yearSel.addEventListener('change', function () {
        populateTable(parseInt(yearSel.value), parseInt(quarterSel.value));
    });
    quarterSel.addEventListener('change', function () {
        populateTable(parseInt(yearSel.value), parseInt(quarterSel.value));
    });

    // Cancel
    cancelBtn.addEventListener('click', function () {
        modal.classList.remove('active');
    });
    modal.addEventListener('click', function (e) {
        if (e.target === modal) modal.classList.remove('active');
    });

    // Apply
    applyBtn.addEventListener('click', function () {
        var year = parseInt(yearSel.value);
        var quarter = parseInt(quarterSel.value);
        var qData = ensureKpiStructure(year, quarter);

        // Collect input values
        var inputs = table.querySelectorAll('.kpi-data-input');
        inputs.forEach(function (inp) {
            var mi = parseInt(inp.getAttribute('data-month'));
            var metric = inp.getAttribute('data-metric');
            var val = parseInt(inp.value) || 0;
            if (val < 0) val = 0;
            if (val > 100) val = 100;
            qData.months[mi][metric] = val;
        });

        // Recalculate overall & total
        recalcQuarter(qData);

        // Save to localStorage
        try {
            localStorage.setItem('okk_kpi_data', JSON.stringify(kpiData));
            console.log('✅ KPI Data saved to localStorage');
        } catch (e) { console.error('Failed to save kpiData', e); }

        // Save to Grist
        if (typeof grist !== 'undefined' && grist.setOption) {
            grist.setOption('kpiData', kpiData)
                .then(function () { console.log('✅ KPI Data staged in Grist'); })
                .catch(function (err) { console.error('❌ Failed to stage kpiData in Grist:', err); });
        }

        // Close modal
        modal.classList.remove('active');

        // Sync main selectors if year/quarter changed
        kpiState.year = year;
        kpiState.quarter = quarter;

        // Re-render triangle
        renderKpiView();

        // Show save reminder
        if (typeof showSaveReminder === 'function') showSaveReminder();
    });
}

// =================== GRADE ===================

var _gradeModalInited = false;

function initGradeModal() {
    if (_gradeModalInited) return;
    _gradeModalInited = true;

    var ALL_GRADES = ['JUNIOR-', 'JUNIOR', 'JUNIOR+', 'MIDDLE-', 'MIDDLE', 'MIDDLE+', 'SENIOR-', 'SENIOR', 'SENIOR+'];
    var modal = document.getElementById('kpiGradeModal');
    var grid = document.getElementById('kpiGradeModalGrid');
    var editBtn = document.getElementById('kpiGradeEditBtn');
    var cancelBtn = document.getElementById('kpiGradeModalCancel');
    var toast = document.getElementById('kpiSaveToast');

    if (!modal || !grid || !editBtn) return;

    // Build grade option buttons
    grid.innerHTML = '';
    ALL_GRADES.forEach(function (grade) {
        var btn = document.createElement('button');
        btn.className = 'kpi-grade-option';
        btn.textContent = grade;
        btn.setAttribute('data-grade', grade);

        if (grade === KPI_GRADE_DEMO.current) {
            btn.classList.add('selected');
        }

        btn.addEventListener('click', function () {
            // Update current grade
            KPI_GRADE_DEMO.current = grade;

            // Save to localStorage
            try {
                localStorage.setItem('okk_kpi_grade', grade);
                console.log('✅ KPI Grade saved to localStorage:', grade);
            } catch (e) { console.error('Failed to save grade to localStorage', e); }

            // Save to Grist options (requires manual save in Grist UI)
            if (typeof grist !== 'undefined' && grist.setOption) {
                grist.setOption('kpiGrade', grade)
                    .then(function () { console.log('✅ KPI Grade staged in Grist'); })
                    .catch(function (err) { console.error('❌ Failed to stage grade in Grist:', err); });
            }

            // Close modal
            modal.classList.remove('active');

            // Re-render card
            _gradeModalInited = false;
            renderGradeCard();

            // Show save toast
            if (typeof showSaveReminder === 'function') showSaveReminder();
        });

        grid.appendChild(btn);
    });

    // Open modal
    editBtn.addEventListener('click', function () {
        // Update selected state
        var options = grid.querySelectorAll('.kpi-grade-option');
        options.forEach(function (opt) {
            opt.classList.toggle('selected', opt.getAttribute('data-grade') === KPI_GRADE_DEMO.current);
        });
        modal.classList.add('active');
    });

    // Close modal
    cancelBtn.addEventListener('click', function () {
        modal.classList.remove('active');
    });

    // Close on overlay click
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
}

// Save reminder uses the global showSaveReminder() from script.js

function getGradeCharacterSVG(grade) {
    // 3D CHIP-ROBOT — matches brand logo mascot
    // Rounded-square chip head, connector pins, circular eyes, smile
    let base = grade.replace(/[-+]/g, '').trim();
    let mod = grade.includes('+') ? 'plus' : grade.includes('-') ? 'minus' : 'std';

    let svg = '<svg viewBox="0 0 200 200" width="100%" height="100%">';

    // Unique IDs to avoid collisions
    let uid = 'cr' + Math.random().toString(36).substr(2, 4);

    svg += '<defs>';

    // 1. Chip body gradient (3D lime-green)
    svg += '<radialGradient id="' + uid + 'chipBody" cx="35%" cy="30%" r="70%">';
    svg += '<stop offset="0%" stop-color="#E3FB1E"/>';    // Bright highlight
    svg += '<stop offset="50%" stop-color="#C4D916"/>';   // Brand color
    svg += '<stop offset="100%" stop-color="#9AAE0B"/>';  // Shadow
    svg += '</radialGradient>';

    // 2. Chip face (inner area — lighter)
    svg += '<radialGradient id="' + uid + 'chipFace" cx="40%" cy="35%" r="65%">';
    svg += '<stop offset="0%" stop-color="#ffffff"/>';
    svg += '<stop offset="100%" stop-color="#F5F5F0"/>';
    svg += '</radialGradient>';

    // 3. Pin gradient (metallic)
    svg += '<linearGradient id="' + uid + 'pin" x1="0%" y1="0%" x2="0%" y2="100%">';
    svg += '<stop offset="0%" stop-color="#E3FB1E"/>';
    svg += '<stop offset="50%" stop-color="#C4D916"/>';
    svg += '<stop offset="100%" stop-color="#8FA00A"/>';
    svg += '</linearGradient>';

    // 4. Eye color (per grade)
    let eyeColor1 = '#C4D916';  // Default lime
    let eyeColor2 = '#8FA00A';
    if (base.includes('MIDDLE')) { eyeColor1 = '#42A5F5'; eyeColor2 = '#1565C0'; }
    if (base.includes('SENIOR')) { eyeColor1 = '#78909C'; eyeColor2 = '#37474F'; }

    svg += '<radialGradient id="' + uid + 'eye" cx="40%" cy="35%" r="60%">';
    svg += '<stop offset="0%" stop-color="' + eyeColor1 + '"/>';
    svg += '<stop offset="100%" stop-color="' + eyeColor2 + '"/>';
    svg += '</radialGradient>';

    // 5. Specular highlight
    svg += '<radialGradient id="' + uid + 'spec" cx="30%" cy="20%" r="50%">';
    svg += '<stop offset="0%" stop-color="rgba(255,255,255,0.6)"/>';
    svg += '<stop offset="100%" stop-color="rgba(255,255,255,0)"/>';
    svg += '</radialGradient>';

    // 6. Drop shadow
    svg += '<filter id="' + uid + 'shadow" x="-20%" y="-20%" width="140%" height="140%">';
    svg += '<feGaussianBlur in="SourceAlpha" stdDeviation="4"/>';
    svg += '<feOffset dx="0" dy="4" result="s"/>';
    svg += '<feComponentTransfer><feFuncA type="linear" slope="0.25"/></feComponentTransfer>';
    svg += '<feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>';
    svg += '</filter>';

    // 7. Gold badge
    svg += '<linearGradient id="' + uid + 'gold" x1="0%" y1="0%" x2="100%" y2="100%">';
    svg += '<stop offset="0%" stop-color="#FFE082"/>';
    svg += '<stop offset="50%" stop-color="#FFC107"/>';
    svg += '<stop offset="100%" stop-color="#FF8F00"/>';
    svg += '</linearGradient>';

    // 8. Glasses lens
    svg += '<linearGradient id="' + uid + 'lens" x1="0%" y1="0%" x2="100%" y2="100%">';
    svg += '<stop offset="0%" stop-color="rgba(255,255,255,0.35)"/>';
    svg += '<stop offset="100%" stop-color="rgba(200,230,255,0.15)"/>';
    svg += '</linearGradient>';

    svg += '</defs>';

    // === FLOATING ANIMATION ===
    svg += '<g filter="url(#' + uid + 'shadow)">';
    svg += '<animateTransform attributeName="transform" type="translate" values="0 0; 0 -3; 0 0" dur="4s" repeatCount="indefinite" />';

    // === CONNECTOR PINS ===
    // Top pins (2)
    svg += '<rect x="72" y="22" width="8" height="16" rx="2" fill="url(#' + uid + 'pin)"/>';
    svg += '<rect x="120" y="22" width="8" height="16" rx="2" fill="url(#' + uid + 'pin)"/>';
    // Left pins (2)
    svg += '<rect x="28" y="70" width="16" height="7" rx="2" fill="url(#' + uid + 'pin)"/>';
    svg += '<rect x="28" y="105" width="16" height="7" rx="2" fill="url(#' + uid + 'pin)"/>';
    // Right pins (2)
    svg += '<rect x="156" y="70" width="16" height="7" rx="2" fill="url(#' + uid + 'pin)"/>';
    svg += '<rect x="156" y="105" width="16" height="7" rx="2" fill="url(#' + uid + 'pin)"/>';

    // === CHIP HEAD (Rounded Square) ===
    svg += '<rect x="42" y="35" width="116" height="116" rx="22" fill="url(#' + uid + 'chipBody)"/>';
    // Inner face area (white/light)
    svg += '<rect x="52" y="45" width="96" height="96" rx="16" fill="url(#' + uid + 'chipFace)"/>';
    // Specular highlight on body
    svg += '<rect x="42" y="35" width="116" height="60" rx="22" fill="url(#' + uid + 'spec)" opacity="0.5"/>';

    // === EYES (Big & Cute!) ===
    let eyeY = 82;
    let eyeLX = 78;
    let eyeRX = 122;
    let eyeR = 14;

    svg += '<circle cx="' + eyeLX + '" cy="' + eyeY + '" r="' + eyeR + '" fill="url(#' + uid + 'eye)"/>';
    svg += '<circle cx="' + eyeRX + '" cy="' + eyeY + '" r="' + eyeR + '" fill="url(#' + uid + 'eye)"/>';
    // Big cute highlights (kawaii style)
    svg += '<circle cx="' + (eyeLX - 4) + '" cy="' + (eyeY - 5) + '" r="5" fill="white" opacity="0.9"/>';
    svg += '<circle cx="' + (eyeRX - 4) + '" cy="' + (eyeY - 5) + '" r="5" fill="white" opacity="0.9"/>';
    svg += '<circle cx="' + (eyeLX + 4) + '" cy="' + (eyeY + 4) + '" r="2" fill="white" opacity="0.5"/>';
    svg += '<circle cx="' + (eyeRX + 4) + '" cy="' + (eyeY + 4) + '" r="2" fill="white" opacity="0.5"/>';

    // === SMILE (Always friendly & cute) ===
    let smileY = 110;
    if (base.includes('JUNIOR')) {
        // Big happy grin :D
        svg += '<path d="M72 ' + smileY + ' Q100 ' + (smileY + 20) + ' 128 ' + smileY + '" fill="none" stroke="' + eyeColor2 + '" stroke-width="4" stroke-linecap="round"/>';
        // Rosy cheeks (blush)
        svg += '<circle cx="60" cy="' + (smileY - 2) + '" r="7" fill="#FF8A80" opacity="0.3"/>';
        svg += '<circle cx="140" cy="' + (smileY - 2) + '" r="7" fill="#FF8A80" opacity="0.3"/>';
    } else if (base.includes('SENIOR')) {
        // Warm knowing smile :)
        svg += '<path d="M76 ' + smileY + ' Q100 ' + (smileY + 14) + ' 124 ' + smileY + '" fill="none" stroke="' + eyeColor2 + '" stroke-width="3.5" stroke-linecap="round"/>';
    } else {
        // Friendly smile
        svg += '<path d="M74 ' + smileY + ' Q100 ' + (smileY + 16) + ' 126 ' + smileY + '" fill="none" stroke="' + eyeColor2 + '" stroke-width="3.5" stroke-linecap="round"/>';
    }

    // === GRADE-SPECIFIC ACCESSORIES ===
    if (base.includes('JUNIOR')) {
        // --- ✨ Sparkles around the chip (just unpacked!) ---
        // Star helper: 4-point star at (cx, cy) with size s
        var stars = [
            { x: 38, y: 42, s: 5, d: '1.2s', del: '0s' },
            { x: 162, y: 52, s: 4, d: '1.5s', del: '0.3s' },
            { x: 155, y: 140, s: 6, d: '1.8s', del: '0.6s' },
            { x: 45, y: 135, s: 4, d: '1.4s', del: '0.9s' },
            { x: 100, y: 24, s: 5, d: '2s', del: '0.4s' }
        ];
        stars.forEach(function (st) {
            svg += '<g transform="translate(' + st.x + ',' + st.y + ')">';
            svg += '<path d="M0 -' + st.s + ' L' + (st.s * 0.3) + ' -' + (st.s * 0.3) + ' L' + st.s + ' 0 L' + (st.s * 0.3) + ' ' + (st.s * 0.3) + ' L0 ' + st.s + ' L-' + (st.s * 0.3) + ' ' + (st.s * 0.3) + ' L-' + st.s + ' 0 L-' + (st.s * 0.3) + ' -' + (st.s * 0.3) + ' Z" fill="' + eyeColor1 + '">';
            svg += '<animate attributeName="opacity" values="0.9;0.2;0.9" dur="' + st.d + '" begin="' + st.del + '" repeatCount="indefinite"/>';
            svg += '<animateTransform attributeName="transform" type="rotate" values="0;45;0" dur="' + st.d + '" begin="' + st.del + '" repeatCount="indefinite"/>';
            svg += '</path>';
            svg += '</g>';
        });
    }

    if (base.includes('MIDDLE')) {
        // --- 🎧 Headphones ---
        // Headband arc
        svg += '<path d="M38 75 Q38 15 100 15 Q162 15 162 75" fill="none" stroke="#333" stroke-width="5" stroke-linecap="round"/>';
        svg += '<path d="M42 75 Q42 20 100 20 Q158 20 158 75" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" opacity="0.3"/>';

        // Left ear cup (with bass pulse)
        svg += '<rect x="26" y="65" width="16" height="22" rx="6" fill="#333"/>';
        svg += '<rect x="28" y="68" width="12" height="16" rx="4" fill="' + eyeColor1 + '" opacity="0.7">';
        svg += '<animate attributeName="opacity" values="0.7;1;0.7" dur="0.8s" repeatCount="indefinite"/>';
        svg += '</rect>';
        svg += '<rect x="29" y="69" width="4" height="8" rx="2" fill="white" opacity="0.3"/>';

        // Right ear cup (with bass pulse, offset)
        svg += '<rect x="158" y="65" width="16" height="22" rx="6" fill="#333"/>';
        svg += '<rect x="160" y="68" width="12" height="16" rx="4" fill="' + eyeColor1 + '" opacity="0.7">';
        svg += '<animate attributeName="opacity" values="0.7;1;0.7" dur="0.8s" begin="0.4s" repeatCount="indefinite"/>';
        svg += '</rect>';
        svg += '<rect x="161" y="69" width="4" height="8" rx="2" fill="white" opacity="0.3"/>';

        // Floating music notes ♪ from left
        svg += '<text x="18" y="60" font-size="12" fill="' + eyeColor1 + '">';
        svg += '♪';
        svg += '<animate attributeName="y" values="60;40;20" dur="2.5s" repeatCount="indefinite"/>';
        svg += '<animate attributeName="opacity" values="0.8;0.5;0" dur="2.5s" repeatCount="indefinite"/>';
        svg += '<animate attributeName="x" values="18;12;8" dur="2.5s" repeatCount="indefinite"/>';
        svg += '</text>';

        // Floating music notes ♫ from right
        svg += '<text x="178" y="55" font-size="10" fill="' + eyeColor1 + '">';
        svg += '♫';
        svg += '<animate attributeName="y" values="55;35;15" dur="3s" begin="0.8s" repeatCount="indefinite"/>';
        svg += '<animate attributeName="opacity" values="0.7;0.4;0" dur="3s" begin="0.8s" repeatCount="indefinite"/>';
        svg += '<animate attributeName="x" values="178;183;188" dur="3s" begin="0.8s" repeatCount="indefinite"/>';
        svg += '</text>';

        // Extra note from left (offset)
        svg += '<text x="22" y="70" font-size="9" fill="' + eyeColor2 + '">';
        svg += '♪';
        svg += '<animate attributeName="y" values="70;50;25" dur="3.2s" begin="1.5s" repeatCount="indefinite"/>';
        svg += '<animate attributeName="opacity" values="0.6;0.3;0" dur="3.2s" begin="1.5s" repeatCount="indefinite"/>';
        svg += '</text>';
    }

    if (base.includes('SENIOR')) {
        // --- 🎓 Graduation cap (mortarboard) ---
        // Board (diamond shape)
        svg += '<path d="M50 30 L100 18 L150 30 L100 42 Z" fill="' + eyeColor2 + '"/>';
        svg += '<path d="M50 30 L100 18 L150 30 L100 28 Z" fill="' + eyeColor1 + '" opacity="0.4"/>';
        // Cap base
        svg += '<rect x="70" y="30" width="60" height="10" rx="2" fill="' + eyeColor2 + '"/>';

        // Pulsing gold button on top
        svg += '<circle cx="100" cy="28" r="3" fill="url(#' + uid + 'gold)">';
        svg += '<animate attributeName="r" values="3;4;3" dur="2s" repeatCount="indefinite"/>';
        svg += '</circle>';
        // Gold glow on button
        svg += '<circle cx="100" cy="28" r="6" fill="#FFC107" opacity="0.15">';
        svg += '<animate attributeName="r" values="6;9;6" dur="2s" repeatCount="indefinite"/>';
        svg += '<animate attributeName="opacity" values="0.15;0.05;0.15" dur="2s" repeatCount="indefinite"/>';
        svg += '</circle>';

        // Swinging tassel (animated with transform origin at attachment point)
        svg += '<g>';
        svg += '<animateTransform attributeName="transform" type="rotate" values="-5 100 28;5 100 28;-5 100 28" dur="3s" repeatCount="indefinite"/>';
        // Tassel string
        svg += '<path d="M100 28 Q115 30 130 32 Q135 36 135 42" fill="none" stroke="url(#' + uid + 'gold)" stroke-width="2" stroke-linecap="round"/>';
        // Tassel end (hanging part)
        svg += '<rect x="132" y="42" width="6" height="10" rx="2" fill="url(#' + uid + 'gold)"/>';
        // Tassel fringe
        svg += '<line x1="133" y1="52" x2="132" y2="57" stroke="#FFC107" stroke-width="1" opacity="0.7"/>';
        svg += '<line x1="135" y1="52" x2="135" y2="58" stroke="#FFD54F" stroke-width="1" opacity="0.7"/>';
        svg += '<line x1="137" y1="52" x2="138" y2="56" stroke="#FFC107" stroke-width="1" opacity="0.7"/>';
        svg += '</g>';
    }

    // === "PLUS" STAR BADGE ===
    if (mod === 'plus') {
        svg += '<g transform="translate(148, 138)">';
        svg += '<circle cx="10" cy="10" r="12" fill="url(#' + uid + 'gold)" stroke="#fff" stroke-width="1.5"/>';
        svg += '<text x="10" y="15" text-anchor="middle" fill="#fff" font-size="14" font-weight="bold">+</text>';
        svg += '<animateTransform attributeName="transform" type="scale" values="1;1.1;1" dur="2s" repeatCount="indefinite" additive="sum"/>';
        svg += '</g>';
    }

    // === "MINUS" INDICATOR ===
    if (mod === 'minus') {
        svg += '<g transform="translate(148, 138)">';
        svg += '<circle cx="10" cy="10" r="12" fill="#78909C" stroke="#fff" stroke-width="1.5"/>';
        svg += '<text x="10" y="14" text-anchor="middle" fill="#fff" font-size="16" font-weight="bold">−</text>';
        svg += '</g>';
    }

    svg += '</g>';
    svg += '</svg>';
    return svg;
}

function renderContributionCard() {
    var codeEl = document.getElementById('kpiContribCode');
    var dateEl = document.getElementById('kpiContribDate');
    var descEl = document.getElementById('kpiContribDesc');

    if (codeEl) codeEl.textContent = KPI_CONTRIBUTION_DEMO.code;
    if (dateEl) dateEl.textContent = KPI_CONTRIBUTION_DEMO.date;
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

// =================== TRANSITIONS SETTINGS MODAL ===================

var _transitionsModalInited = false;

function initTransitionsModal() {
    if (_transitionsModalInited) return;
    _transitionsModalInited = true;

    var modal = document.getElementById('kpiTransitionsModal');
    var editBtn = document.getElementById('kpiTransitionsEditBtn');
    var applyBtn = document.getElementById('kpiTransitionsApply');
    var cancelBtn = document.getElementById('kpiTransitionsCancel');
    var settingsDiv = document.getElementById('kpiTransitionsSettings');

    if (!modal || !editBtn) return;

    function formatDateForInput(ddmmyyyy) {
        // Convert DD.MM.YYYY -> YYYY-MM-DD for input[type=date]
        if (!ddmmyyyy) return '';
        var parts = ddmmyyyy.split('.');
        if (parts.length !== 3) return '';
        return parts[2] + '-' + parts[1] + '-' + parts[0];
    }

    function formatDateFromInput(isoDate) {
        // Convert YYYY-MM-DD -> DD.MM.YYYY for display
        if (!isoDate) return '';
        var parts = isoDate.split('-');
        if (parts.length !== 3) return '';
        return parts[2] + '.' + parts[1] + '.' + parts[0];
    }

    function populateSettings() {
        var html = '';
        KPI_TRANSITIONS_DEMO.forEach(function (t, idx) {
            html += '<div class="kpi-trans-settings-block">';
            html += '<div class="kpi-trans-settings-type">' + t.type + '</div>';

            // Available toggle
            html += '<div class="kpi-trans-settings-row">';
            html += '<span class="kpi-trans-settings-label">Доступен ли перевод</span>';
            html += '<div class="kpi-toggle-switch">';
            html += '<button class="kpi-toggle-btn ' + (t.available ? 'active' : '') + '" data-idx="' + idx + '" data-val="true">ДА</button>';
            html += '<button class="kpi-toggle-btn ' + (!t.available ? 'active' : '') + '" data-idx="' + idx + '" data-val="false">НЕТ</button>';
            html += '</div>';
            html += '</div>';

            // Last date
            html += '<div class="kpi-trans-settings-row">';
            html += '<span class="kpi-trans-settings-label">Последний перевод</span>';
            html += '<input type="date" class="kpi-trans-date-input" data-idx="' + idx + '" data-field="lastDate" value="' + formatDateForInput(t.lastDate) + '">';
            html += '</div>';

            // Next date
            html += '<div class="kpi-trans-settings-row">';
            html += '<span class="kpi-trans-settings-label">Следующий перевод</span>';
            html += '<input type="date" class="kpi-trans-date-input" data-idx="' + idx + '" data-field="nextDate" value="' + formatDateForInput(t.nextDate) + '">';
            html += '</div>';

            html += '</div>';
        });
        settingsDiv.innerHTML = html;

        // Bind toggle clicks
        settingsDiv.querySelectorAll('.kpi-toggle-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var row = btn.parentElement;
                row.querySelectorAll('.kpi-toggle-btn').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
            });
        });
    }

    // Open modal
    editBtn.addEventListener('click', function () {
        populateSettings();
        modal.classList.add('active');
    });

    // Cancel
    cancelBtn.addEventListener('click', function () {
        modal.classList.remove('active');
    });
    modal.addEventListener('click', function (e) {
        if (e.target === modal) modal.classList.remove('active');
    });

    // Apply
    applyBtn.addEventListener('click', function () {
        // Collect values
        KPI_TRANSITIONS_DEMO.forEach(function (t, idx) {
            // Available toggle
            var activeBtn = settingsDiv.querySelector('.kpi-toggle-btn.active[data-idx="' + idx + '"]');
            if (activeBtn) {
                t.available = activeBtn.getAttribute('data-val') === 'true';
            }

            // Dates
            var lastInput = settingsDiv.querySelector('.kpi-trans-date-input[data-idx="' + idx + '"][data-field="lastDate"]');
            var nextInput = settingsDiv.querySelector('.kpi-trans-date-input[data-idx="' + idx + '"][data-field="nextDate"]');

            if (lastInput && lastInput.value) {
                t.lastDate = formatDateFromInput(lastInput.value);
            }
            if (nextInput && nextInput.value) {
                t.nextDate = formatDateFromInput(nextInput.value);
            }

            // Recalculate progress based on dates
            t.progress = calculateTransitionProgress(t.lastDate, t.nextDate);
        });

        // Save to localStorage
        try {
            localStorage.setItem('okk_kpi_transitions', JSON.stringify(KPI_TRANSITIONS_DEMO));
            console.log('✅ KPI Transitions saved to localStorage');
        } catch (e) { console.error('Failed to save transitions', e); }

        // Save to Grist
        if (typeof grist !== 'undefined' && grist.setOption) {
            grist.setOption('kpiTransitions', KPI_TRANSITIONS_DEMO)
                .then(function () { console.log('✅ KPI Transitions staged in Grist'); })
                .catch(function (err) { console.error('❌ Failed to stage transitions in Grist:', err); });
        }

        // Close modal
        modal.classList.remove('active');

        // Re-render
        renderTransitionsCard();

        // Show save reminder
        if (typeof showSaveReminder === 'function') showSaveReminder();
    });
}

// Calculate progress percentage based on lastDate and nextDate
function calculateTransitionProgress(lastDateStr, nextDateStr) {
    if (!lastDateStr || !nextDateStr) return 0;
    var parts1 = lastDateStr.split('.');
    var parts2 = nextDateStr.split('.');
    if (parts1.length !== 3 || parts2.length !== 3) return 0;

    var start = new Date(parts1[2], parts1[1] - 1, parts1[0]);
    var end = new Date(parts2[2], parts2[1] - 1, parts2[0]);
    var now = new Date();

    var total = end.getTime() - start.getTime();
    if (total <= 0) return 100;
    var elapsed = now.getTime() - start.getTime();
    if (elapsed <= 0) return 0;
    var pct = Math.round((elapsed / total) * 100);
    return Math.min(100, Math.max(0, pct));
}

// =================== CONTRIBUTIONS VIEW ===================


// =================== CONTRIBUTIONS LOADED EXTERNALLY ===================
// Logic moved to contribution.js


function showKpiFromContributions() {
    if (window.logic && window.logic.showKpi) {
        window.logic.showKpi();
    }
}

function kpiQuarterChanged() {
    var sel = document.getElementById('kpiQuarterSelect');
    if (sel) kpiState.quarter = parseInt(sel.value);
    renderKpiView();
}
function kpiYearChanged() {
    var sel = document.getElementById('kpiYearSelect');
    if (sel) {
        var val = sel.value;
        kpiState.year = parseInt(val);

        // Sync with global selector if available
        var globalSel = document.getElementById('yearSelect');
        if (globalSel && window.logic && window.logic.applyCustomPeriod) {
            globalSel.value = val;
            window.logic.applyCustomPeriod();
        } else {
            // Fallback if no global logic (standalone mode)
            renderKpiView();
        }
    }
}

function createWavePath(cx, topY, R, amp, phaseDeg) {
    var width = R * 2 + 120; // Even wider
    var startX = cx - R - 60;
    var points = [];
    var freq = 0.015; // Slightly longer wavelength for smoother look

    // Generate varied points using Math.sin for consistent updates
    for (var x = 0; x <= width; x += 10) {
        var globX = startX + x;
        var ang = (globX * freq) + (phaseDeg * Math.PI / 180);
        var y = topY + amp * Math.sin(ang);
        points.push([globX, y]);
    }

    // Construct Path with Lines (Sufficient resolution for liquid)
    var d = "M " + points[0][0] + "," + points[0][1];
    for (var i = 1; i < points.length; i++) {
        d += " L " + points[i][0] + "," + points[i][1];
    }

    // Close shape
    var bottomY = topY + R * 3;
    d += ' L ' + (startX + width) + ',' + bottomY + ' L ' + startX + ',' + bottomY + ' Z';

    return d;
}

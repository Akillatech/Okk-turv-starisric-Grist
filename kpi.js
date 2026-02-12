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

const KPI_GRADE_DEMO = { current: 'JUNIOR+', next: 'JUNIOR+', image: '🎖️' };
const KPI_CONTRIBUTION_DEMO = { code: 'OK-2026-001', date: '01.02.2026', description: 'Описание последнего вклада' };
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
    var qSel = document.getElementById('kpiQuarterSelect');
    if (qSel) qSel.value = kpiState.quarter;
    var yearData = KPI_DEMO[kpiState.year];
    var qData = yearData ? yearData[kpiState.quarter] : null;
    renderTriangleChart(qData);
    renderGradeCard();
    renderContributionCard();
    renderTransitionsCard();
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
    if (nextEl) nextEl.innerHTML = 'СЛЕД.ГРЕЙД: <span class="kpi-grade-next-value">' + KPI_GRADE_DEMO.next + '</span>';

    // Render dynamic character
    if (imgEl) {
        imgEl.innerHTML = getGradeCharacterSVG(KPI_GRADE_DEMO.current);
        imgEl.style.fontSize = '1rem'; // Reset font size since we use SVG
        imgEl.style.background = 'none'; // Remove gray placeholder bg
        imgEl.style.boxShadow = 'none';
        imgEl.style.width = '120px';

    }
}

function getGradeCharacterSVG(grade) {
    // HIGH-FIDELITY MEMOJI STYLE (Apple-like 3D)
    // Complex paths, layering, and gradients for "Toy Realism"
    let base = grade.replace(/[-+]/g, '').trim();
    let mod = grade.includes('+') ? 'plus' : grade.includes('-') ? 'minus' : 'std';

    let svg = '<svg viewBox="0 0 200 200" width="100%" height="100%">';

    svg += '<defs>';
    // 1. Skin: Warm Yellow-Orange (Simpsons/Lego Premium)
    svg += '<radialGradient id="skinBase" cx="40%" cy="35%" r="65%">';
    svg += '<stop offset="0%" stop-color="#FFEB3B"/>';   // Highlight
    svg += '<stop offset="100%" stop-color="#FBC02D"/>';  // Shadow
    svg += '</radialGradient>';

    // 2. Cheek Blush (Soft Pink tint on Yellow)
    svg += '<radialGradient id="blush" cx="50%" cy="50%" r="50%">';
    svg += '<stop offset="0%" stop-color="#FF5252" stop-opacity="0.15"/>';
    svg += '<stop offset="100%" stop-color="#FF5252" stop-opacity="0"/>';
    svg += '</radialGradient>';

    // 3. Hair Gradients (Volumetric)
    svg += '<linearGradient id="hairDark" x1="0%" y1="0%" x2="0%" y2="100%">';
    svg += '<stop offset="0%" stop-color="#4E342E"/>';
    svg += '<stop offset="100%" stop-color="#210F0B"/>';
    svg += '</linearGradient>';
    svg += '<linearGradient id="hairBlonde" x1="0%" y1="0%" x2="0%" y2="100%">';
    svg += '<stop offset="0%" stop-color="#FFF59D"/>';
    svg += '<stop offset="100%" stop-color="#FBC02D"/>';
    svg += '</linearGradient>';

    // 4. Eyes (Shiny)
    svg += '<radialGradient id="eyeIris" cx="50%" cy="50%" r="50%">';
    svg += '<stop offset="60%" stop-color="#42A5F5"/>';
    svg += '<stop offset="100%" stop-color="#0D47A1"/>';
    svg += '</radialGradient>';

    // 5. Gold (Crown)
    svg += '<linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">';
    svg += '<stop offset="0%" stop-color="#FFEC8B"/>';
    svg += '<stop offset="50%" stop-color="#FFC107"/>';
    svg += '<stop offset="100%" stop-color="#FF6F00"/>';
    svg += '</linearGradient>';

    // 6. Glasses Lens
    svg += '<linearGradient id="glassLens" x1="0%" y1="0%" x2="100%" y2="100%">';
    svg += '<stop offset="0%" stop-color="rgba(255,255,255,0.4)"/>';
    svg += '<stop offset="50%" stop-color="rgba(255,255,255,0.1)"/>';
    svg += '<stop offset="100%" stop-color="rgba(255,255,255,0.2)"/>';
    svg += '</linearGradient>';

    // 7. Soft Drop Shadow
    svg += '<filter id="softDrop" x="-20%" y="-20%" width="140%" height="140%">';
    svg += '<feGaussianBlur in="SourceAlpha" stdDeviation="4"/>';
    svg += '<feOffset dx="0" dy="4" result="offsetblur"/>';
    svg += '<feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>';
    svg += '<feMerge><feMergeNode in="offsetblur"/><feMergeNode in="SourceGraphic"/></feMerge>';
    svg += '</filter>';
    svg += '</defs>';

    // Animate Float
    svg += '<g filter="url(#softDrop)">';
    svg += '<animateTransform attributeName="transform" type="translate" values="0 0; 0 -3; 0 0" dur="5s" repeatCount="indefinite" />';

    // --- CLOTHING (Bust) ---
    // Shoulders
    let clotheColor = '#37474F'; // Default Grey Hoodie
    if (base.includes('MIDDLE')) clotheColor = '#1565C0'; // Blue Shirt
    if (base.includes('SENIOR')) clotheColor = '#212121'; // Black Turtleneck
    if (base.includes('LEAD')) clotheColor = '#4A148C'; // Purple Royal

    svg += '<path d="M40 160 Q100 165 160 160 L180 200 L20 200 Z" fill="' + clotheColor + '" />';
    // Neck
    svg += '<path d="M75 135 L75 165 L125 165 L125 135" fill="#F9A825" />'; // Darker neck shadow
    // Shadow under chin
    svg += '<path d="M75 135 Q100 155 125 135" fill="rgba(0,0,0,0.15)" />';

    // --- HAIR BACK (Behind Head) ---
    if (base.includes('LEAD') || base.includes('MIDDLE')) {
        // Long/Bob style back
        svg += '<path d="M50 80 Q40 160 160 160 Q160 80 150 80" fill="url(#hairDark)" stroke="#210F0B" stroke-width="2"/>';
    }

    // --- HEAD SHAPE (Squircle Jaw) ---
    // Complex path for cheekbones and chin
    svg += '<path d="M50 70 Q50 20 100 20 Q150 20 150 70 Q152 110 135 135 Q100 155 65 135 Q48 110 50 70 Z" fill="url(#skinBase)" />';

    // Cheeks Blush
    svg += '<ellipse cx="65" cy="105" rx="15" ry="10" fill="url(#blush)" />';
    svg += '<ellipse cx="135" cy="105" rx="15" ry="10" fill="url(#blush)" />';

    // --- EYES (Detailed) ---
    // Whites
    let eyeY = 90;
    svg += '<path d="M60 ' + eyeY + ' Q75 ' + (eyeY - 12) + ' 90 ' + eyeY + ' Q75 ' + (eyeY + 12) + ' 60 ' + eyeY + ' Z" fill="white" />';
    svg += '<path d="M110 ' + eyeY + ' Q125 ' + (eyeY - 12) + ' 140 ' + eyeY + ' Q125 ' + (eyeY + 12) + ' 110 ' + eyeY + ' Z" fill="white" />';

    // Iris
    svg += '<circle cx="75" cy="' + eyeY + '" r="6" fill="url(#eyeIris)" />';
    svg += '<circle cx="125" cy="' + eyeY + '" r="6" fill="url(#eyeIris)" />';

    // Pupil
    svg += '<circle cx="75" cy="' + eyeY + '" r="2.5" fill="#111" />';
    svg += '<circle cx="125" cy="' + eyeY + '" r="2.5" fill="#111" />';

    // Highlight (Reflection)
    svg += '<circle cx="73" cy="' + (eyeY - 2) + '" r="1.5" fill="white" opacity="0.8" />';
    svg += '<circle cx="123" cy="' + (eyeY - 2) + '" r="1.5" fill="white" opacity="0.8" />';

    // Eyelashes/Liner (Thick top line)
    svg += '<path d="M60 ' + eyeY + ' Q75 ' + (eyeY - 14) + ' 90 ' + eyeY + '" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" />';
    svg += '<path d="M110 ' + eyeY + ' Q125 ' + (eyeY - 14) + ' 140 ' + eyeY + '" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" />';

    // Eyebrows
    let browY = eyeY - 18;
    let browColor = '#4E342E';
    if (base.includes('JUNIOR')) {
        // Surprised/High brows
        svg += '<path d="M60 ' + browY + ' Q75 ' + (browY - 5) + ' 90 ' + browY + '" fill="none" stroke="' + browColor + '" stroke-width="3" stroke-linecap="round" />';
        svg += '<path d="M110 ' + browY + ' Q125 ' + (browY - 5) + ' 140 ' + browY + '" fill="none" stroke="' + browColor + '" stroke-width="3" stroke-linecap="round" />';
    } else {
        // Confident/Lower
        svg += '<path d="M60 ' + (browY + 2) + ' Q75 ' + (browY) + ' 90 ' + (browY + 2) + '" fill="none" stroke="' + browColor + '" stroke-width="3.5" stroke-linecap="round" />';
        svg += '<path d="M110 ' + (browY + 2) + ' Q125 ' + (browY) + ' 140 ' + (browY + 2) + '" fill="none" stroke="' + browColor + '" stroke-width="3.5" stroke-linecap="round" />';
    }

    // --- NOSE ---
    // Simple 3D nose shading
    svg += '<path d="M95 105 Q100 115 105 105" fill="none" stroke="#F57F17" stroke-width="1.5" stroke-linecap="round" opacity="0.4" />';
    svg += '<path d="M90 100 Q100 112 110 100" fill="none" stroke="none" />'; // Invisible guide

    // --- MOUTH ---
    let mouthY = 125;
    if (base.includes('JUNIOR')) {
        // Smile with teeth
        svg += '<path d="M80 ' + mouthY + ' Q100 ' + (mouthY + 15) + ' 120 ' + mouthY + '" fill="white" stroke="none" />'; // Teeth
        svg += '<path d="M80 ' + mouthY + ' Q100 ' + (mouthY + 15) + ' 120 ' + mouthY + '" fill="none" stroke="#D84315" stroke-width="2" stroke-linecap="round" />'; // Outline
        svg += '<path d="M80 ' + mouthY + ' Q100 ' + (mouthY + 5) + ' 120 ' + mouthY + '" fill="none" stroke="#D84315" stroke-width="1" stroke-linecap="round" opacity="0.5" />'; // Lip crease
    } else {
        // Smirk / Closed
        svg += '<path d="M85 ' + (mouthY + 2) + ' Q100 ' + (mouthY + 6) + ' 115 ' + (mouthY + 2) + '" fill="none" stroke="#D84315" stroke-width="3" stroke-linecap="round" />';
    }

    // --- HAIR FRONT & ACCESSORIES ---
    if (base.includes('JUNIOR')) {
        // Baseball Cap (Orange)
        svg += '<path d="M45 60 Q100 30 155 60 L155 50 Q100 0 45 50 Z" fill="#FF5722" />'; // Dome
        svg += '<path d="M40 60 Q100 50 160 60 L150 70 Q100 80 50 70 Z" fill="#D84315" />'; // Visor
        // Messy hair popping out sides
        svg += '<path d="M45 70 Q35 80 45 90" fill="none" stroke="#4E342E" stroke-width="6" stroke-linecap="round" />';
        svg += '<path d="M155 70 Q165 80 155 90" fill="none" stroke="#4E342E" stroke-width="6" stroke-linecap="round" />';
    }
    else if (base.includes('MIDDLE')) {
        // Neat Side Part Hair
        svg += '<path d="M50 70 Q40 50 50 40 Q80 20 140 30 Q155 40 150 70 L150 50 Q100 25 50 50 Z" fill="url(#hairDark)" />';
        // Glasses (Thick Black Frames)
        // Lenses
        svg += '<rect x="58" y="78" width="34" height="24" rx="6" fill="url(#glassLens)" stroke="#111" stroke-width="3" />'; // Left
        svg += '<rect x="108" y="78" width="34" height="24" rx="6" fill="url(#glassLens)" stroke="#111" stroke-width="3" />'; // Right
        // Bridge
        svg += '<line x1="92" y1="85" x2="108" y2="85" stroke="#111" stroke-width="3" />';
    }
    else if (base.includes('SENIOR')) {
        // Slick Back Hair
        svg += '<path d="M50 60 Q100 10 150 60 L150 40 Q100 0 50 40 Z" fill="#212121" />';
        // Stubble/Beard
        svg += '<path d="M60 110 Q100 140 140 110 L140 120 Q100 160 60 120 Z" fill="#212121" opacity="0.2" />';
    }
    else if (base.includes('LEAD')) {
        // Crown (Physical 3D Object)
        svg += '<path d="M60 40 L60 15 L85 30 L100 5 L115 30 L140 15 L140 40 Q100 50 60 40 Z" fill="url(#gold)" stroke="#E65100" stroke-width="1" />';
        // Hair under crown
        svg += '<path d="M55 50 Q100 60 145 50" fill="none" stroke="#212121" stroke-width="4" />';
    }

    // "Plus" Star (3D Badge)
    if (mod === 'plus') {
        svg += '<g transform="translate(150, 150)">';
        svg += '<path d="M10 0 L13 7 L20 7 L15 12 L17 19 L10 15 L3 19 L5 12 L0 7 L7 7 Z" fill="url(#gold)" stroke="#fff" stroke-width="1" filter="url(#softDrop)">';
        svg += '<animateTransform attributeName="transform" type="rotate" values="0 10 10; 360 10 10" dur="8s" repeatCount="indefinite" />';
        svg += '</path>';
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

// =================== NAVIGATION ===================

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

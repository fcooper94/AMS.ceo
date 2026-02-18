/**
 * Cabin Configurator
 * Visual aircraft cabin layout editor for configuring seat classes.
 * Shows a top-down aircraft diagram with live-updating seat rows.
 */

// Seat group layouts per aircraft type and class
// Each array = groups of seats separated by aisles
const SEAT_LAYOUTS = {
  Regional: {
    economy:     [2, 2],
    economyPlus: [2, 2],
    business:    [2, 1],
    first:       [1, 1]
  },
  Narrowbody: {
    economy:     [3, 3],
    economyPlus: [3, 3],
    business:    [2, 2],
    first:       [1, 1]
  },
  Widebody: {
    economy:     [3, 3, 3],
    economyPlus: [2, 4, 2],
    business:    [2, 2, 2],
    first:       [1, 2, 1]
  },
  Cargo: null
};

// Pitch multiplier per class (row height relative to economy)
const PITCH = {
  economy: 1.0,
  economyPlus: 1.15,
  business: 1.6,
  first: 2.5
};

// Visual colors per class
const CLASS_COLORS = {
  first:       { bg: '#F59E0B', border: '#D97706', label: 'First',       code: 'F' },
  business:    { bg: '#8B5CF6', border: '#7C3AED', label: 'Business',    code: 'J' },
  economyPlus: { bg: '#3B82F6', border: '#2563EB', label: 'Economy Plus',code: 'W' },
  economy:     { bg: '#10B981', border: '#059669', label: 'Economy',     code: 'Y' }
};

// Fuselage visual widths per aircraft type
const FUSELAGE_WIDTHS = { Regional: 150, Narrowbody: 190, Widebody: 270 };

// Row pixel heights per class
const ROW_HEIGHTS = { economy: 10, economyPlus: 12, business: 16, first: 24 };
const ROW_GAP = 2;

// Double-deck aircraft — fixed deck dimensions and layouts
const DOUBLE_DECK = [
  {
    match: /A380/i,
    upperRatio: 0.40,
    cockpitDeck: 'main',     // A380 cockpit is on main/lower deck
    mainWidth: 290,
    upperWidth: 250,
    mainLayout: {
      economy:     [3, 4, 3],  // 10 abreast
      economyPlus: [2, 4, 2],  // 8 abreast
      business:    [2, 2, 2],  // 6 abreast
      first:       [1, 2, 1]   // 4 abreast
    },
    upperLayout: {
      economy:     [2, 4, 2],  // 8 abreast
      economyPlus: [2, 3, 2],  // 7 abreast
      business:    [1, 2, 1],  // 4 abreast (lie-flat suites)
      first:       [1, 2, 1]   // 4 abreast
    }
  },
  {
    match: /747/i,
    upperRatio: 0.20,
    cockpitDeck: 'upper',    // 747 cockpit is on upper deck (the hump)
    mainWidth: 280,
    upperWidth: 190,
    mainLayout: {
      economy:     [3, 4, 3],  // 10 abreast
      economyPlus: [2, 4, 2],  // 8 abreast
      business:    [2, 2, 2],  // 6 abreast
      first:       [1, 2, 1]   // 4 abreast
    },
    upperLayout: {
      economy:     [3, 3],     // 6 abreast
      economyPlus: [3, 3],     // 6 abreast
      business:    [2, 2],     // 4 abreast
      first:       [1, 1]      // 2 abreast
    }
  }
];

function getDoubleDeckConfig(aircraft) {
  const str = `${aircraft.manufacturer || ''} ${aircraft.model || ''} ${aircraft.icaoCode || ''}`;
  for (const dd of DOUBLE_DECK) {
    if (dd.match.test(str)) return dd;
  }
  return null;
}

function seatsPerRow(aircraftType, cabinClass) {
  const layout = SEAT_LAYOUTS[aircraftType];
  if (!layout || !layout[cabinClass]) return 0;
  return layout[cabinClass].reduce((s, g) => s + g, 0);
}

// --- Shared fuselage SVG renderer ---
function renderFuselage(seatConfig, deckLayout, fWidth, svgId, showCockpit = true) {
  if (!deckLayout) return '';

  const aisleWidth = 16;
  const seatGap = 2;
  const bodyPadding = 8;
  const bodyWidth = fWidth - bodyPadding * 2;

  const sections = [];
  const classOrder = ['first', 'business', 'economyPlus', 'economy'];
  for (const cls of classOrder) {
    const seatCount = seatConfig[cls];
    if (!seatCount || seatCount <= 0) continue;
    const groups = deckLayout[cls];
    if (!groups) continue;
    const perRow = groups.reduce((s, g) => s + g, 0);
    const numRows = Math.ceil(seatCount / perRow);
    const rowH = ROW_HEIGHTS[cls];
    const lastRowSeats = seatCount - (numRows - 1) * perRow;
    sections.push({ cls, groups, perRow, numRows, rowH, lastRowSeats });
  }

  let totalH = 0;
  for (const s of sections) {
    totalH += s.numRows * (s.rowH + ROW_GAP);
    totalH += 18;
  }
  if (totalH === 0) totalH = 40;

  const noseH = 50;
  const tailH = 35;
  const svgH = noseH + totalH + tailH + 10;
  const gradId = svgId || 'fuselageGrad';
  const fW = fWidth;
  const noseR = fW / 2.5;

  let html = `
    <svg viewBox="0 0 ${fW} ${svgH}" preserveAspectRatio="xMidYMin meet" style="width:100%;height:100%;" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${gradId}" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stop-color="rgba(100,116,139,0.15)"/>
          <stop offset="50%" stop-color="rgba(100,116,139,0.05)"/>
          <stop offset="100%" stop-color="rgba(100,116,139,0.15)"/>
        </linearGradient>
      </defs>
      <path d="
        M ${fW * 0.15} ${noseH}
        Q ${fW * 0.15} ${noseH - noseR}, ${fW / 2} ${5}
        Q ${fW * 0.85} ${noseH - noseR}, ${fW * 0.85} ${noseH}
        L ${fW * 0.85} ${svgH - tailH}
        Q ${fW * 0.85} ${svgH - 5}, ${fW / 2} ${svgH}
        Q ${fW * 0.15} ${svgH - 5}, ${fW * 0.15} ${svgH - tailH}
        Z
      " fill="url(#${gradId})" stroke="rgba(100,116,139,0.3)" stroke-width="1.5"/>
  `;

  // Cockpit windows (only on the deck that has the cockpit)
  if (showCockpit) {
    const cwY = noseH - 12;
    html += `
      <rect x="${fW/2 - 12}" y="${cwY}" width="8" height="4" rx="1.5" fill="rgba(59,130,246,0.5)"/>
      <rect x="${fW/2 + 4}" y="${cwY}" width="8" height="4" rx="1.5" fill="rgba(59,130,246,0.5)"/>
    `;
  }


  // Seats start closer to the nose when there's no cockpit on this deck
  let curY = showCockpit ? noseH + 6 : noseH - 10;
  for (const s of sections) {
    const cc = CLASS_COLORS[s.cls];
    html += `
      <line x1="${fW * 0.2}" y1="${curY + 2}" x2="${fW * 0.8}" y2="${curY + 2}" stroke="${cc.bg}" stroke-width="0.5" opacity="0.5"/>
      <text x="${fW / 2}" y="${curY + 12}" text-anchor="middle" fill="${cc.bg}" font-size="7" font-weight="600" font-family="system-ui, sans-serif" opacity="0.8">${cc.label.toUpperCase()}</text>
    `;
    curY += 18;

    for (let row = 0; row < s.numRows; row++) {
      const isLastRow = (row === s.numRows - 1);
      const seatsThisRow = isLastRow ? s.lastRowSeats : s.perRow;
      let seatIdx = 0;
      let x = bodyPadding;

      for (let gi = 0; gi < s.groups.length; gi++) {
        const groupSize = s.groups[gi];
        for (let gs = 0; gs < groupSize; gs++) {
          const classAisles = s.groups.length - 1;
          const seatW = (bodyWidth - classAisles * aisleWidth - (s.perRow - 1) * seatGap) / s.perRow;
          if (seatIdx < seatsThisRow) {
            html += `<rect x="${x}" y="${curY}" width="${seatW}" height="${s.rowH}" rx="2"
                      fill="${cc.bg}" stroke="${cc.border}" stroke-width="0.5" opacity="0.85"/>`;
          } else {
            html += `<rect x="${x}" y="${curY}" width="${seatW}" height="${s.rowH}" rx="2"
                      fill="rgba(100,116,139,0.1)" stroke="rgba(100,116,139,0.2)" stroke-width="0.5"/>`;
          }
          x += seatW + seatGap;
          seatIdx++;
        }
        if (gi < s.groups.length - 1) x += aisleWidth - seatGap;
      }
      curY += s.rowH + ROW_GAP;
    }
  }

  html += `</svg>`;
  return html;
}


// ======================================================================
// Single-deck cabin configurator
// ======================================================================
function showCabinConfigurator(aircraft, onApply, existingConfig) {
  if (!aircraft || !SEAT_LAYOUTS[aircraft.type]) return;

  const ddConfig = getDoubleDeckConfig(aircraft);
  if (ddConfig) {
    showDoubleDeckConfigurator(aircraft, ddConfig, onApply, existingConfig);
    return;
  }

  const acType = aircraft.type;
  const layouts = SEAT_LAYOUTS[acType];

  function classPerRow(cls) {
    return layouts[cls] ? layouts[cls].reduce((s, g) => s + g, 0) : 0;
  }

  const econPerRow = classPerRow('economy');
  const totalSpace = aircraft.passengerCapacity / econPerRow;

  const config = {
    first:       existingConfig?.firstSeats || 0,
    business:    existingConfig?.businessSeats || 0,
    economyPlus: existingConfig?.economyPlusSeats || 0,
    economy:     0
  };

  function recalcEconomy() {
    const usedSpace = calcSpaceUsed(config.first, 'first')
                    + calcSpaceUsed(config.business, 'business')
                    + calcSpaceUsed(config.economyPlus, 'economyPlus');
    const remainingSpace = Math.max(0, totalSpace - usedSpace);
    config.economy = Math.floor(remainingSpace) * econPerRow;
  }

  function calcSpaceUsed(seatCount, cabinClass) {
    const perRow = classPerRow(cabinClass);
    if (perRow === 0 || seatCount === 0) return 0;
    return Math.ceil(seatCount / perRow) * PITCH[cabinClass];
  }

  function totalPax() {
    return config.first + config.business + config.economyPlus + config.economy;
  }

  function spaceUsedPercent() {
    const used = calcSpaceUsed(config.first, 'first')
               + calcSpaceUsed(config.business, 'business')
               + calcSpaceUsed(config.economyPlus, 'economyPlus')
               + calcSpaceUsed(config.economy, 'economy');
    return Math.min(100, Math.round((used / totalSpace) * 100));
  }

  function canAdd(cabinClass) {
    const perRow = classPerRow(cabinClass);
    const testCount = config[cabinClass] + perRow;
    const testUsed = calcSpaceUsed(testCount, cabinClass)
                   + (['first','business','economyPlus'].filter(c => c !== cabinClass)
                       .reduce((s, c) => s + calcSpaceUsed(config[c], c), 0));
    return testUsed <= totalSpace - 1;
  }

  function canRemove(cabinClass) {
    return config[cabinClass] > 0;
  }

  recalcEconomy();

  const overlay = document.createElement('div');
  overlay.id = 'cabinConfigOverlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.85); z-index: 3000;
    display: flex; justify-content: center; align-items: center;
    padding: 1rem;
  `;

  const fuselageWidth = FUSELAGE_WIDTHS[acType] || 190;

  overlay.innerHTML = `
    <div style="background: var(--surface); border: 1px solid var(--border-color); border-radius: 10px;
                display: flex; max-width: 700px; width: 100%; max-height: 90vh; overflow: hidden;">
      <div style="width: 280px; min-width: 280px; padding: 1.25rem; display: flex; flex-direction: column; border-right: 1px solid var(--border-color); overflow-y: auto;">
        <h2 style="margin: 0 0 0.4rem 0; color: var(--text-primary); font-size: 1rem;">CABIN CONFIGURATION</h2>
        <div style="color: var(--text-muted); font-size: 0.65rem; margin-bottom: 1rem;">${aircraft.manufacturer} ${aircraft.model}${aircraft.variant ? ' ' + aircraft.variant : ''} · ${acType}</div>

        <div style="margin-bottom: 1rem; padding: 0.6rem; background: var(--surface-elevated); border-radius: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
            <span style="font-size: 0.7rem; color: var(--text-secondary);">Total Passengers</span>
            <span id="cabinTotalPax" style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary);">${totalPax()}</span>
          </div>
          <div style="height: 6px; background: var(--surface); border-radius: 3px; overflow: hidden;">
            <div id="cabinSpaceBar" style="height: 100%; border-radius: 3px; transition: width 0.3s ease, background 0.3s ease;
                 width: ${spaceUsedPercent()}%; background: ${spaceUsedPercent() > 95 ? '#EF4444' : '#10B981'};"></div>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 0.2rem;">
            <span style="font-size: 0.5rem; color: var(--text-muted);">Cabin space</span>
            <span id="cabinSpacePercent" style="font-size: 0.5rem; color: var(--text-muted);">${spaceUsedPercent()}%</span>
          </div>
        </div>

        <div id="cabinClassControls" style="display: flex; flex-direction: column; gap: 0.6rem; flex: 1;">
          ${buildClassCtrl('first')}
          ${buildClassCtrl('business')}
          ${buildClassCtrl('economyPlus')}
          ${buildEconDisp()}
        </div>

        <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
          <button id="cabinApplyBtn" class="btn btn-primary" style="flex: 1; padding: 0.6rem; font-size: 0.85rem;">Apply</button>
          <button id="cabinCancelBtn" class="btn btn-secondary" style="flex: 1; padding: 0.6rem; font-size: 0.85rem;">Cancel</button>
        </div>
      </div>

      <div style="flex: 1; display: flex; flex-direction: column; justify-content: flex-start; align-items: center; padding: 1rem; min-height: 0; background: rgba(0,0,0,0.2);">
        <div id="cabinDiagramContainer" style="flex: 1; min-height: 0; width: 100%; display: flex; flex-direction: column; align-items: center; overflow: hidden;"></div>
      </div>
    </div>
  `;

  function buildClassCtrl(cls) {
    const cc = CLASS_COLORS[cls];
    const perRow = classPerRow(cls);
    const groups = layouts[cls];
    return `
      <div style="padding: 0.6rem; background: var(--surface-elevated); border-radius: 6px; border-left: 3px solid ${cc.bg};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem;">
          <span style="font-size: 0.75rem; font-weight: 600; color: ${cc.bg};">${cc.label.toUpperCase()}</span>
          <div style="display: flex; align-items: center; gap: 0.35rem;">
            <button class="cabin-adj-btn" data-class="${cls}" data-delta="-1"
              style="width: 24px; height: 24px; border: 1px solid var(--border-color); border-radius: 4px;
                     background: var(--surface); color: var(--text-primary); cursor: pointer; font-size: 0.85rem;
                     display: flex; align-items: center; justify-content: center; padding: 0;">−</button>
            <span id="cabinCount_${cls}" style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary); min-width: 2rem; text-align: center;">${config[cls]}</span>
            <button class="cabin-adj-btn" data-class="${cls}" data-delta="1"
              style="width: 24px; height: 24px; border: 1px solid var(--border-color); border-radius: 4px;
                     background: var(--surface); color: var(--text-primary); cursor: pointer; font-size: 0.85rem;
                     display: flex; align-items: center; justify-content: center; padding: 0;">+</button>
          </div>
        </div>
        <div style="font-size: 0.55rem; color: var(--text-muted);">${groups.join('-')} layout · ${perRow} per row</div>
      </div>
    `;
  }

  function buildEconDisp() {
    const cc = CLASS_COLORS.economy;
    return `
      <div style="padding: 0.6rem; background: var(--surface-elevated); border-radius: 6px; border-left: 3px solid ${cc.bg};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem;">
          <span style="font-size: 0.75rem; font-weight: 600; color: ${cc.bg};">ECONOMY</span>
          <span id="cabinCount_economy" style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary);">${config.economy}</span>
        </div>
        <div style="font-size: 0.55rem; color: var(--text-muted);">${layouts.economy.join('-')} layout · ${econPerRow} per row · fills remaining</div>
      </div>
    `;
  }

  document.body.appendChild(overlay);

  function renderLegend() {
    const classOrder = ['first', 'business', 'economyPlus', 'economy'];
    let html = `<div style="display: flex; gap: 0.6rem; margin-top: 0.5rem; flex-wrap: wrap; justify-content: center;">`;
    for (const cls of classOrder) {
      if (config[cls] > 0) {
        const cc = CLASS_COLORS[cls];
        html += `<div style="display: flex; align-items: center; gap: 0.25rem;">
          <div style="width: 8px; height: 8px; border-radius: 2px; background: ${cc.bg};"></div>
          <span style="font-size: 0.55rem; color: var(--text-muted);">${cc.label} (${config[cls]})</span>
        </div>`;
      }
    }
    html += `</div>`;
    return html;
  }

  function renderDiagram() {
    const container = document.getElementById('cabinDiagramContainer');
    if (!container) return;
    container.innerHTML = renderFuselage(config, layouts, fuselageWidth, 'fuselageGrad') + renderLegend();
  }

  function updateUI() {
    recalcEconomy();
    for (const cls of ['first', 'business', 'economyPlus', 'economy']) {
      const el = document.getElementById(`cabinCount_${cls}`);
      if (el) el.textContent = config[cls];
    }
    const totalEl = document.getElementById('cabinTotalPax');
    if (totalEl) totalEl.textContent = totalPax();
    const pct = spaceUsedPercent();
    const barEl = document.getElementById('cabinSpaceBar');
    if (barEl) {
      barEl.style.width = pct + '%';
      barEl.style.background = pct > 95 ? '#EF4444' : pct > 80 ? '#F59E0B' : '#10B981';
    }
    const pctEl = document.getElementById('cabinSpacePercent');
    if (pctEl) pctEl.textContent = pct + '%';
    for (const cls of ['first', 'business', 'economyPlus']) {
      const minusBtn = overlay.querySelector(`[data-class="${cls}"][data-delta="-1"]`);
      const plusBtn = overlay.querySelector(`[data-class="${cls}"][data-delta="1"]`);
      if (minusBtn) {
        minusBtn.style.opacity = canRemove(cls) ? '1' : '0.3';
        minusBtn.style.cursor = canRemove(cls) ? 'pointer' : 'default';
      }
      if (plusBtn) {
        plusBtn.style.opacity = canAdd(cls) ? '1' : '0.3';
        plusBtn.style.cursor = canAdd(cls) ? 'pointer' : 'default';
      }
    }
    renderDiagram();
  }

  overlay.querySelectorAll('.cabin-adj-btn').forEach(btn => {
    let holdTimer = null, holdInterval = null;
    function doStep() {
      const cls = btn.dataset.class;
      const delta = parseInt(btn.dataset.delta);
      const perRow = classPerRow(cls);
      if (delta > 0 && canAdd(cls)) {
        config[cls] += perRow;
      } else if (delta < 0 && canRemove(cls)) {
        config[cls] = Math.max(0, config[cls] - perRow);
      }
      updateUI();
    }
    function stopHold() {
      clearTimeout(holdTimer); clearInterval(holdInterval);
      holdTimer = null; holdInterval = null;
    }
    btn.addEventListener('mousedown', (e) => { e.stopPropagation(); doStep(); holdTimer = setTimeout(() => { holdInterval = setInterval(doStep, 80); }, 400); });
    btn.addEventListener('mouseup', stopHold);
    btn.addEventListener('mouseleave', stopHold);
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); doStep(); holdTimer = setTimeout(() => { holdInterval = setInterval(doStep, 80); }, 400); });
    btn.addEventListener('touchend', stopHold);
    btn.addEventListener('touchcancel', stopHold);
  });

  document.getElementById('cabinApplyBtn').addEventListener('click', () => {
    document.body.removeChild(overlay);
    if (onApply) {
      onApply({
        firstSeats: config.first,
        businessSeats: config.business,
        economyPlusSeats: config.economyPlus,
        economySeats: config.economy
      });
    }
  });

  document.getElementById('cabinCancelBtn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  updateUI();
}


// ======================================================================
// Double-deck cabin configurator — separate controls per deck
// ======================================================================
function showDoubleDeckConfigurator(aircraft, ddConfig, onApply, existingConfig) {
  const acType = aircraft.type;

  // Deck capacities
  const totalCapacity = aircraft.passengerCapacity;
  const upperCapacity = Math.round(totalCapacity * ddConfig.upperRatio);
  const mainCapacity = totalCapacity - upperCapacity;

  // Per-deck helpers
  function deckPerRow(layout, cls) {
    return layout[cls] ? layout[cls].reduce((s, g) => s + g, 0) : 0;
  }

  const upperEconPerRow = deckPerRow(ddConfig.upperLayout, 'economy');
  const mainEconPerRow = deckPerRow(ddConfig.mainLayout, 'economy');
  const upperTotalSpace = upperCapacity / upperEconPerRow;
  const mainTotalSpace = mainCapacity / mainEconPerRow;

  // Per-deck seat state
  const upperConfig = { first: 0, business: 0, economyPlus: 0, economy: 0 };
  const mainConfig = { first: 0, business: 0, economyPlus: 0, economy: 0 };

  // Restore existing config or default to all-economy per deck
  if (existingConfig) {
    let remaining = upperCapacity;
    for (const cls of ['first', 'business', 'economyPlus', 'economy']) {
      const key = cls === 'economyPlus' ? 'economyPlusSeats' : cls + 'Seats';
      const seats = existingConfig[key] || 0;
      const toUpper = Math.min(seats, Math.max(0, remaining));
      upperConfig[cls] = toUpper;
      mainConfig[cls] = seats - toUpper;
      remaining -= toUpper;
    }
  } else {
    // Start with each deck filled with economy
    upperConfig.economy = Math.floor(upperTotalSpace) * upperEconPerRow;
    mainConfig.economy = Math.floor(mainTotalSpace) * mainEconPerRow;
  }

  function canDeckAdd(dc, layout, totalSp, cls) {
    const perRow = deckPerRow(layout, cls);
    if (perRow === 0) return false;

    if (cls === 'economy') {
      // Economy: must fit alongside everything else
      let totalUsed = 0;
      for (const c of ['first', 'business', 'economyPlus', 'economy']) {
        const pr = deckPerRow(layout, c);
        const count = c === 'economy' ? dc[c] + perRow : dc[c];
        if (pr > 0 && count > 0) totalUsed += Math.ceil(count / pr) * PITCH[c];
      }
      return totalUsed <= totalSp;
    } else {
      // Premium: can add as long as all premium fits (economy will auto-shrink)
      let premiumUsed = 0;
      for (const c of ['first', 'business', 'economyPlus']) {
        const pr = deckPerRow(layout, c);
        const count = c === cls ? dc[c] + perRow : dc[c];
        if (pr > 0 && count > 0) premiumUsed += Math.ceil(count / pr) * PITCH[c];
      }
      return premiumUsed <= totalSp;
    }
  }

  // After adding premium seats, shrink economy to fit within remaining space
  function trimEconomy(dc, layout, totalSp) {
    const econPR = deckPerRow(layout, 'economy');
    if (econPR === 0) return;
    let premiumUsed = 0;
    for (const c of ['first', 'business', 'economyPlus']) {
      const pr = deckPerRow(layout, c);
      if (pr > 0 && dc[c] > 0) premiumUsed += Math.ceil(dc[c] / pr) * PITCH[c];
    }
    const maxEconRows = Math.floor(Math.max(0, totalSp - premiumUsed) / PITCH.economy);
    dc.economy = Math.min(dc.economy, maxEconRows * econPR);
  }

  function deckSpacePct(dc, layout, totalSp) {
    let used = 0;
    for (const cls of ['first', 'business', 'economyPlus', 'economy']) {
      const pr = deckPerRow(layout, cls);
      if (pr > 0 && dc[cls] > 0) used += Math.ceil(dc[cls] / pr) * PITCH[cls];
    }
    return Math.min(100, Math.round((used / totalSp) * 100));
  }

  function deckPax(dc) { return dc.first + dc.business + dc.economyPlus + dc.economy; }
  function totalPax() { return deckPax(upperConfig) + deckPax(mainConfig); }

  // --- Build overlay ---
  const overlay = document.createElement('div');
  overlay.id = 'cabinConfigOverlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.85); z-index: 3000;
    display: flex; justify-content: center; align-items: center;
    padding: 1rem;
  `;

  overlay.innerHTML = `
    <div style="background: var(--surface); border: 1px solid var(--border-color); border-radius: 10px;
                display: flex; flex-direction: column; max-width: 1000px; width: 100%; max-height: 90vh; overflow: hidden;">

      <!-- Header -->
      <div style="padding: 0.6rem 1.25rem; border-bottom: 1px solid var(--border-color); flex-shrink: 0;">
        <h2 style="margin: 0 0 0.15rem 0; color: var(--text-primary); font-size: 1rem;">CABIN CONFIGURATION</h2>
        <div style="color: var(--text-muted); font-size: 0.6rem;">${aircraft.manufacturer} ${aircraft.model}${aircraft.variant ? ' ' + aircraft.variant : ''} · ${acType} · Double Deck</div>
      </div>

      <!-- Two deck columns -->
      <div style="display: flex; flex: 1; min-height: 0;">

        <!-- Upper Deck -->
        <div style="flex: 1; padding: 0.75rem; display: flex; flex-direction: column; align-items: center; border-right: 1px solid var(--border-color); min-height: 0;">
          <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-primary); letter-spacing: 0.05em;">UPPER DECK</div>
          <div style="font-size: 0.5rem; color: var(--text-muted); margin-bottom: 0.4rem;">${upperCapacity} seats · ${ddConfig.upperLayout.economy.join('-')} economy</div>

          <div style="width: 100%; max-width: 280px; margin-bottom: 0.4rem;">
            <div style="height: 3px; background: var(--surface-elevated); border-radius: 2px; overflow: hidden;">
              <div id="upperSpaceBar" style="height: 100%; border-radius: 2px; transition: width 0.3s; background: #10B981;"></div>
            </div>
          </div>

          <div style="width: 100%; max-width: 280px; display: flex; flex-direction: column; gap: 0.2rem; margin-bottom: 0.5rem; flex-shrink: 0;">
            ${buildDeckCtrl('upper', 'first', ddConfig.upperLayout, upperConfig)}
            ${buildDeckCtrl('upper', 'business', ddConfig.upperLayout, upperConfig)}
            ${buildDeckCtrl('upper', 'economyPlus', ddConfig.upperLayout, upperConfig)}
            ${buildDeckCtrl('upper', 'economy', ddConfig.upperLayout, upperConfig)}
          </div>

          <div id="upperDiagram" style="flex: 1; min-height: 0; width: 100%; display: flex; justify-content: center; align-items: start; overflow: hidden;"></div>
        </div>

        <!-- Main Deck -->
        <div style="flex: 1; padding: 0.75rem; display: flex; flex-direction: column; align-items: center; min-height: 0;">
          <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-primary); letter-spacing: 0.05em;">MAIN DECK</div>
          <div style="font-size: 0.5rem; color: var(--text-muted); margin-bottom: 0.4rem;">${mainCapacity} seats · ${ddConfig.mainLayout.economy.join('-')} economy</div>

          <div style="width: 100%; max-width: 280px; margin-bottom: 0.4rem;">
            <div style="height: 3px; background: var(--surface-elevated); border-radius: 2px; overflow: hidden;">
              <div id="mainSpaceBar" style="height: 100%; border-radius: 2px; transition: width 0.3s; background: #10B981;"></div>
            </div>
          </div>

          <div style="width: 100%; max-width: 280px; display: flex; flex-direction: column; gap: 0.2rem; margin-bottom: 0.5rem; flex-shrink: 0;">
            ${buildDeckCtrl('main', 'first', ddConfig.mainLayout, mainConfig)}
            ${buildDeckCtrl('main', 'business', ddConfig.mainLayout, mainConfig)}
            ${buildDeckCtrl('main', 'economyPlus', ddConfig.mainLayout, mainConfig)}
            ${buildDeckCtrl('main', 'economy', ddConfig.mainLayout, mainConfig)}
          </div>

          <div id="mainDiagram" style="flex: 1; min-height: 0; width: 100%; display: flex; justify-content: center; align-items: start; overflow: hidden;"></div>
        </div>
      </div>

      <!-- Summary footer -->
      <div style="padding: 0.6rem 1.25rem; border-top: 1px solid var(--border-color); display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; flex-shrink: 0;">
        <div style="display: flex; align-items: baseline; gap: 0.4rem;">
          <span id="ddTotalPax" style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary);">${totalPax()}</span>
          <span style="font-size: 0.65rem; color: var(--text-muted);">passengers</span>
        </div>
        <div id="ddLegend" style="display: flex; gap: 0.5rem; flex: 1; flex-wrap: wrap;"></div>
        <button id="ddApplyBtn" class="btn btn-primary" style="padding: 0.5rem 1.5rem; font-size: 0.8rem;">Apply</button>
        <button id="ddCancelBtn" class="btn btn-secondary" style="padding: 0.5rem 1.5rem; font-size: 0.8rem;">Cancel</button>
      </div>
    </div>
  `;

  function buildDeckCtrl(deck, cls, layout, dc) {
    const cc = CLASS_COLORS[cls];
    const groups = layout[cls];
    const perRow = groups.reduce((s, g) => s + g, 0);
    return `
      <div style="display: flex; align-items: center; gap: 0.3rem; padding: 0.3rem 0.5rem; background: var(--surface-elevated); border-radius: 4px; border-left: 3px solid ${cc.bg};">
        <span style="font-size: 0.6rem; font-weight: 600; color: ${cc.bg}; flex: 1; white-space: nowrap;">${cc.label.toUpperCase()}</span>
        <span style="font-size: 0.45rem; color: var(--text-muted); margin-right: 0.2rem;">${groups.join('-')}</span>
        <button class="dd-adj-btn" data-deck="${deck}" data-class="${cls}" data-delta="-1"
          style="width: 22px; height: 22px; border: 1px solid var(--border-color); border-radius: 3px;
                 background: var(--surface); color: var(--text-primary); cursor: pointer; font-size: 0.8rem;
                 display: flex; align-items: center; justify-content: center; padding: 0;">−</button>
        <span id="${deck}Count_${cls}" style="font-weight: 700; font-size: 0.75rem; color: var(--text-primary); min-width: 1.8rem; text-align: center;">${dc[cls]}</span>
        <button class="dd-adj-btn" data-deck="${deck}" data-class="${cls}" data-delta="1"
          style="width: 22px; height: 22px; border: 1px solid var(--border-color); border-radius: 3px;
                 background: var(--surface); color: var(--text-primary); cursor: pointer; font-size: 0.8rem;
                 display: flex; align-items: center; justify-content: center; padding: 0;">+</button>
      </div>
    `;
  }

  document.body.appendChild(overlay);

  // --- Update everything ---
  function updateUI() {
    // Counts
    for (const cls of ['first', 'business', 'economyPlus', 'economy']) {
      const ue = document.getElementById(`upperCount_${cls}`);
      if (ue) ue.textContent = upperConfig[cls];
      const me = document.getElementById(`mainCount_${cls}`);
      if (me) me.textContent = mainConfig[cls];
    }

    // Space bars
    for (const [id, dc, layout, ts] of [
      ['upperSpaceBar', upperConfig, ddConfig.upperLayout, upperTotalSpace],
      ['mainSpaceBar', mainConfig, ddConfig.mainLayout, mainTotalSpace]
    ]) {
      const pct = deckSpacePct(dc, layout, ts);
      const bar = document.getElementById(id);
      if (bar) {
        bar.style.width = pct + '%';
        bar.style.background = pct > 95 ? '#EF4444' : pct > 80 ? '#F59E0B' : '#10B981';
      }
    }

    // Button states
    for (const [deck, dc, layout, ts] of [
      ['upper', upperConfig, ddConfig.upperLayout, upperTotalSpace],
      ['main', mainConfig, ddConfig.mainLayout, mainTotalSpace]
    ]) {
      for (const cls of ['first', 'business', 'economyPlus', 'economy']) {
        const minus = overlay.querySelector(`[data-deck="${deck}"][data-class="${cls}"][data-delta="-1"]`);
        const plus = overlay.querySelector(`[data-deck="${deck}"][data-class="${cls}"][data-delta="1"]`);
        const canRem = dc[cls] > 0;
        const canA = canDeckAdd(dc, layout, ts, cls);
        if (minus) { minus.style.opacity = canRem ? '1' : '0.3'; minus.style.cursor = canRem ? 'pointer' : 'default'; }
        if (plus) { plus.style.opacity = canA ? '1' : '0.3'; plus.style.cursor = canA ? 'pointer' : 'default'; }
      }
    }

    // Summary
    const totalEl = document.getElementById('ddTotalPax');
    if (totalEl) totalEl.textContent = totalPax();

    const total = {
      first: upperConfig.first + mainConfig.first,
      business: upperConfig.business + mainConfig.business,
      economyPlus: upperConfig.economyPlus + mainConfig.economyPlus,
      economy: upperConfig.economy + mainConfig.economy
    };
    const legendEl = document.getElementById('ddLegend');
    if (legendEl) {
      let lh = '';
      for (const cls of ['first', 'business', 'economyPlus', 'economy']) {
        if (total[cls] > 0) {
          const cc = CLASS_COLORS[cls];
          lh += `<div style="display: flex; align-items: center; gap: 0.2rem;">
            <div style="width: 8px; height: 8px; border-radius: 2px; background: ${cc.bg};"></div>
            <span style="font-size: 0.6rem; color: var(--text-secondary);">${total[cls]}${cc.code}</span>
          </div>`;
        }
      }
      legendEl.innerHTML = lh;
    }

    // Diagrams
    const ud = document.getElementById('upperDiagram');
    if (ud) ud.innerHTML = renderFuselage(upperConfig, ddConfig.upperLayout, ddConfig.upperWidth, 'gradUpper', ddConfig.cockpitDeck === 'upper');
    const md = document.getElementById('mainDiagram');
    if (md) md.innerHTML = renderFuselage(mainConfig, ddConfig.mainLayout, ddConfig.mainWidth, 'gradMain', ddConfig.cockpitDeck === 'main');
  }

  // --- Wire buttons ---
  overlay.querySelectorAll('.dd-adj-btn').forEach(btn => {
    let holdTimer = null, holdInterval = null;
    function doStep() {
      const deck = btn.dataset.deck;
      const cls = btn.dataset.class;
      const delta = parseInt(btn.dataset.delta);

      const dc = deck === 'upper' ? upperConfig : mainConfig;
      const layout = deck === 'upper' ? ddConfig.upperLayout : ddConfig.mainLayout;
      const ts = deck === 'upper' ? upperTotalSpace : mainTotalSpace;
      const perRow = deckPerRow(layout, cls);

      if (delta > 0 && canDeckAdd(dc, layout, ts, cls)) {
        dc[cls] += perRow;
        if (cls !== 'economy') {
          trimEconomy(dc, layout, ts);
        }
      } else if (delta < 0 && dc[cls] > 0) {
        dc[cls] = Math.max(0, dc[cls] - perRow);
      }
      updateUI();
    }
    function stopHold() {
      clearTimeout(holdTimer); clearInterval(holdInterval);
      holdTimer = null; holdInterval = null;
    }
    btn.addEventListener('mousedown', (e) => { e.stopPropagation(); doStep(); holdTimer = setTimeout(() => { holdInterval = setInterval(doStep, 80); }, 400); });
    btn.addEventListener('mouseup', stopHold);
    btn.addEventListener('mouseleave', stopHold);
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); doStep(); holdTimer = setTimeout(() => { holdInterval = setInterval(doStep, 80); }, 400); });
    btn.addEventListener('touchend', stopHold);
    btn.addEventListener('touchcancel', stopHold);
  });

  // Apply — sum both decks
  document.getElementById('ddApplyBtn').addEventListener('click', () => {
    document.body.removeChild(overlay);
    if (onApply) {
      onApply({
        firstSeats: upperConfig.first + mainConfig.first,
        businessSeats: upperConfig.business + mainConfig.business,
        economyPlusSeats: upperConfig.economyPlus + mainConfig.economyPlus,
        economySeats: upperConfig.economy + mainConfig.economy
      });
    }
  });

  document.getElementById('ddCancelBtn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  updateUI();
}


/**
 * Build a short cabin summary string like "4F / 16J / 142Y"
 */
function cabinConfigSummary(cfg) {
  if (!cfg) return null;
  const parts = [];
  if (cfg.firstSeats > 0) parts.push(cfg.firstSeats + 'F');
  if (cfg.businessSeats > 0) parts.push(cfg.businessSeats + 'J');
  if (cfg.economyPlusSeats > 0) parts.push(cfg.economyPlusSeats + 'W');
  if (cfg.economySeats > 0) parts.push(cfg.economySeats + 'Y');
  return parts.join(' / ');
}

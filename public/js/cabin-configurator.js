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
const FUSELAGE_WIDTHS = { Regional: 220, Narrowbody: 280, Widebody: 400 };

// Per-aircraft layout overrides for single-deck widebodies
// (Double-deck aircraft like A380/747 have their own configs in DOUBLE_DECK)
const WIDEBODY_OVERRIDES = [
  {
    match: /777/i,
    fuselageWidth: 420,
    layout: {
      economy:     [3, 4, 3],  // 10 abreast
      economyPlus: [3, 3, 3],  // 9 abreast
      business:    [2, 2, 2],  // 6 abreast
      first:       [1, 2, 1]   // 4 abreast
    }
  },
  {
    match: /767/i,
    fuselageWidth: 340,
    layout: {
      economy:     [2, 3, 2],  // 7 abreast
      economyPlus: [2, 3, 2],  // 7 abreast
      business:    [2, 2],     // 4 abreast
      first:       [1, 1]      // 2 abreast
    }
  }
];

// Row pixel heights per class
const ROW_HEIGHTS = { economy: 10, economyPlus: 12, business: 16, first: 24 };
const ROW_GAP = 2;

/** Calculate default / min / max toilet counts for an aircraft (always even — pairs) */
function _toiletDefaults(passengerCapacity) {
  const min = passengerCapacity > 12 ? 4 : 0;
  let def = passengerCapacity < 12 ? 0 : Math.max(min, Math.ceil(passengerCapacity / 50));
  if (def % 2 !== 0) def++;
  let mx = Math.min(12, Math.max(def + 2, Math.ceil(passengerCapacity / 30)));
  if (mx % 2 !== 0) mx++;
  mx = Math.min(12, mx);
  return { min, default: def, max: mx };
}

/** Render a single toilet cubicle square with toilet icon */
function _renderToiletCubicle(x, y, size) {
  let s = '';
  // Cubicle background
  s += `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="2"
          fill="rgba(100,116,139,0.18)" stroke="rgba(100,116,139,0.35)" stroke-width="0.5"/>`;
  // Toilet icon (side view) — scaled to cubicle size
  const cx = x + size / 2, cy = y + size / 2;
  const sc = size / 28;
  // Tank/cistern
  s += `<rect x="${cx - 4*sc}" y="${cy - 7*sc}" width="${8*sc}" height="${4*sc}" rx="${1.2*sc}"
          fill="rgba(148,163,184,0.3)" stroke="rgba(148,163,184,0.55)" stroke-width="0.4"/>`;
  // Bowl
  s += `<path d="M${cx - 4*sc},${cy - 2*sc} L${cx - 5*sc},${cy + 1*sc} Q${cx - 5*sc},${cy + 7*sc} ${cx},${cy + 7*sc} Q${cx + 5*sc},${cy + 7*sc} ${cx + 5*sc},${cy + 1*sc} L${cx + 4*sc},${cy - 2*sc} Z"
          fill="rgba(148,163,184,0.12)" stroke="rgba(148,163,184,0.55)" stroke-width="0.4"/>`;
  return s;
}

/** Render an inline lavatory block with toilet cubicle squares inside */
function _renderLavatoryBlock(x, y, width, height, toiletCount) {
  let s = '';
  // Block background (dashed outline)
  s += `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="3"
          fill="rgba(100,116,139,0.06)" stroke="rgba(100,116,139,0.18)" stroke-width="0.5" stroke-dasharray="3,2"/>`;
  // Cubicle squares inside — one on each side
  const cubSize = Math.min(height - 4, 28);
  const cubY = y + (height - cubSize) / 2;
  const pad = 4;
  if (toiletCount >= 1) s += _renderToiletCubicle(x + pad, cubY, cubSize);
  if (toiletCount >= 2) s += _renderToiletCubicle(x + width - pad - cubSize, cubY, cubSize);
  return s;
}

// Double-deck aircraft — fixed deck dimensions and layouts
const DOUBLE_DECK = [
  {
    match: /A380/i,
    upperRatio: 0.40,
    cockpitDeck: 'main',     // A380 cockpit is on main/lower deck
    mainWidth: 420,
    upperWidth: 370,
    minToiletsUpper: 4,      // front + back pairs on both decks
    minToiletsMain: 4,
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
    mainWidth: 400,
    upperWidth: 280,
    minToiletsUpper: 2,      // one pair in the small hump
    minToiletsMain: 4,       // front + back pairs
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
function renderFuselage(seatConfig, deckLayout, fWidth, svgId, showCockpit = true, toiletCount = 0) {
  if (!deckLayout) return '';

  const aisleWidth = 16;
  const seatGap = 2;
  const fW = fWidth;

  // Fuselage wall positions (0.10–0.90)
  const fuseLeft = fW * 0.10;
  const fuseRight = fW * 0.90;
  const bodyPad = 6;
  const seatLeft = fuseLeft + bodyPad;
  const seatRight = fuseRight - bodyPad;
  const seatWidth = seatRight - seatLeft;

  // Toilet distribution as pairs: 1st pair → front, 2nd pair → back, rest → mid-cabin
  const totalPairs = Math.floor(toiletCount / 2);
  const frontPair = totalPairs >= 1 ? 1 : 0;     // 1 pair (2 toilets) at nose
  const backPair = totalPairs >= 2 ? 1 : 0;       // 1 pair (2 toilets) at tail
  const midPairs = Math.max(0, totalPairs - 2);    // remaining pairs inline in economy
  const TOILET_BLOCK_H = 3 * (ROW_HEIGHTS.economy + ROW_GAP);
  const TOILET_GAP = 4;

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

  // Calculate total visual height
  let totalH = 0;
  if (frontPair) totalH += TOILET_BLOCK_H + TOILET_GAP;
  for (const s of sections) {
    totalH += s.numRows * (s.rowH + ROW_GAP) + 18;
  }
  totalH += midPairs * (TOILET_BLOCK_H + TOILET_GAP);
  if (backPair) totalH += TOILET_BLOCK_H + TOILET_GAP;
  if (totalH === 0) totalH = 40;

  const noseH = 50;
  const tailH = 35;
  const svgH = noseH + totalH + tailH + 10;
  const gradId = svgId || 'fuselageGrad';
  const clipId = `fClip_${svgId || 'def'}`;
  const noseR = fW / 2.5;

  const fuselagePath = `
    M ${fuseLeft} ${noseH}
    Q ${fuseLeft} ${noseH - noseR}, ${fW / 2} ${5}
    Q ${fuseRight} ${noseH - noseR}, ${fuseRight} ${noseH}
    L ${fuseRight} ${svgH - tailH}
    Q ${fuseRight} ${svgH - 5}, ${fW / 2} ${svgH}
    Q ${fuseLeft} ${svgH - 5}, ${fuseLeft} ${svgH - tailH}
    Z`;

  let html = `
    <svg viewBox="0 0 ${fW} ${svgH}" preserveAspectRatio="xMidYMin meet" style="width:100%;height:100%;" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${gradId}" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stop-color="rgba(100,116,139,0.15)"/>
          <stop offset="50%" stop-color="rgba(100,116,139,0.05)"/>
          <stop offset="100%" stop-color="rgba(100,116,139,0.15)"/>
        </linearGradient>
        <clipPath id="${clipId}"><path d="${fuselagePath}"/></clipPath>
      </defs>
      <path d="${fuselagePath}" fill="url(#${gradId})" stroke="rgba(100,116,139,0.3)" stroke-width="1.5"/>
  `;

  // Cockpit windows
  if (showCockpit) {
    const cwY = noseH - 12;
    html += `
      <rect x="${fW/2 - 12}" y="${cwY}" width="8" height="4" rx="1.5" fill="rgba(59,130,246,0.5)"/>
      <rect x="${fW/2 + 4}" y="${cwY}" width="8" height="4" rx="1.5" fill="rgba(59,130,246,0.5)"/>
    `;
  }

  // All cabin content clipped to fuselage outline
  html += `<g clip-path="url(#${clipId})">`;

  const seatStartY = showCockpit ? noseH + 6 : noseH - 10;
  let curY = seatStartY;

  // Helper: render one seat row
  function drawSeatRow(s, cc, y) {
    let rowHtml = '';
    const isLastRow = (s._row === s.numRows - 1);
    const seatsThisRow = isLastRow ? s.lastRowSeats : s.perRow;
    let seatIdx = 0;
    let x = seatLeft;
    for (let gi = 0; gi < s.groups.length; gi++) {
      const groupSize = s.groups[gi];
      for (let gs = 0; gs < groupSize; gs++) {
        const classAisles = s.groups.length - 1;
        const seatW = (seatWidth - classAisles * aisleWidth - (s.perRow - 1) * seatGap) / s.perRow;
        if (seatIdx < seatsThisRow) {
          rowHtml += `<rect x="${x}" y="${y}" width="${seatW}" height="${s.rowH}" rx="2"
                    fill="${cc.bg}" stroke="${cc.border}" stroke-width="0.5" opacity="0.85"/>`;
        } else {
          rowHtml += `<rect x="${x}" y="${y}" width="${seatW}" height="${s.rowH}" rx="2"
                    fill="rgba(100,116,139,0.1)" stroke="rgba(100,116,139,0.2)" stroke-width="0.5"/>`;
        }
        x += seatW + seatGap;
        seatIdx++;
      }
      if (gi < s.groups.length - 1) x += aisleWidth - seatGap;
    }
    return rowHtml;
  }

  // Front lavatory pair
  if (frontPair) {
    html += _renderLavatoryBlock(seatLeft, curY, seatWidth, TOILET_BLOCK_H, 2);
    curY += TOILET_BLOCK_H + TOILET_GAP;
  }

  // Render sections — mid-cabin toilets inserted within economy
  for (const s of sections) {
    const cc = CLASS_COLORS[s.cls];
    // Section header
    html += `
      <line x1="${fW * 0.2}" y1="${curY + 2}" x2="${fW * 0.8}" y2="${curY + 2}" stroke="${cc.bg}" stroke-width="0.5" opacity="0.5"/>
      <text x="${fW / 2}" y="${curY + 12}" text-anchor="middle" fill="${cc.bg}" font-size="7" font-weight="600" font-family="system-ui, sans-serif" opacity="0.8">${cc.label.toUpperCase()}</text>
    `;
    curY += 18;

    if (s.cls === 'economy' && midPairs > 0) {
      // Split economy rows into (midPairs+1) chunks with toilet pairs between
      const chunkSize = Math.max(1, Math.floor(s.numRows / (midPairs + 1)));
      let rowsInChunk = 0;
      let pairsInserted = 0;

      for (let row = 0; row < s.numRows; row++) {
        // Insert toilet pair block when chunk is full
        if (pairsInserted < midPairs && rowsInChunk >= chunkSize) {
          html += _renderLavatoryBlock(seatLeft, curY, seatWidth, TOILET_BLOCK_H, 2);
          curY += TOILET_BLOCK_H + TOILET_GAP;
          pairsInserted++;
          rowsInChunk = 0;
        }
        s._row = row;
        html += drawSeatRow(s, cc, curY);
        curY += s.rowH + ROW_GAP;
        rowsInChunk++;
      }
      // Remaining pairs at end of economy
      while (pairsInserted < midPairs) {
        html += _renderLavatoryBlock(seatLeft, curY, seatWidth, TOILET_BLOCK_H, 2);
        curY += TOILET_BLOCK_H + TOILET_GAP;
        pairsInserted++;
      }
    } else {
      for (let row = 0; row < s.numRows; row++) {
        s._row = row;
        html += drawSeatRow(s, cc, curY);
        curY += s.rowH + ROW_GAP;
      }
    }
  }

  // Back lavatory pair
  if (backPair) {
    html += _renderLavatoryBlock(seatLeft, curY, seatWidth, TOILET_BLOCK_H, 2);
    curY += TOILET_BLOCK_H + TOILET_GAP;
  }

  html += `</g>`;
  html += `</svg>`;
  return html;
}


// ======================================================================
// Refit confirmation modal — shown over the cabin configurator overlay
// ======================================================================
function _showRefitConfirmModal(configuratorOverlay, confirmInfo, onApply, result) {
  const { registration, days, aircraftName } = confirmInfo;
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10001;display:flex;justify-content:center;align-items:center;padding:1rem;';

  modal.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border-color);border-radius:10px;width:100%;max-width:420px;overflow:hidden;">
      <div style="padding:1rem 1.25rem;border-bottom:1px solid var(--border-color);display:flex;align-items:center;gap:0.75rem;">
        <div style="width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;background:rgba(245,158,11,0.15);color:#f59e0b;">&#9888;</div>
        <div>
          <h3 style="margin:0;font-size:1rem;color:var(--text-primary);font-weight:600;">Confirm Cabin Refit</h3>
          <div style="font-size:0.75rem;color:var(--accent-color);font-weight:600;font-family:monospace;">${registration}</div>
        </div>
      </div>
      <div style="padding:1.25rem;">
        <p style="margin:0 0 0.75rem 0;color:var(--text-secondary);font-size:0.85rem;line-height:1.5;">
          ${aircraftName || 'This aircraft'} will be taken <strong style="color:var(--warning-color);">out of service for ${days} day${days > 1 ? 's' : ''}</strong> (game time) while the cabin is reconfigured.
        </p>
        <p style="margin:0 0 0.75rem 0;color:var(--text-secondary);font-size:0.85rem;line-height:1.5;">
          During the refit, <strong>${registration}</strong> cannot be assigned to routes or fly.
        </p>
        <p style="margin:0;color:var(--text-muted);font-size:0.75rem;font-style:italic;">
          Any routes currently using this aircraft will be unassigned.
        </p>
      </div>
      <div style="padding:0.75rem 1.25rem;border-top:1px solid var(--border-color);display:flex;gap:0.5rem;justify-content:flex-end;">
        <button id="refitCancelBtn" style="padding:0.5rem 1.25rem;font-size:0.85rem;font-weight:600;border-radius:6px;cursor:pointer;background:var(--surface-elevated);color:var(--text-secondary);border:1px solid var(--border-color);transition:all 0.15s;">Cancel</button>
        <button id="refitConfirmBtn" style="padding:0.5rem 1.25rem;font-size:0.85rem;font-weight:600;border-radius:6px;cursor:pointer;background:#d29922;color:#fff;border:1px solid transparent;transition:all 0.15s;">Begin Refit</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  document.getElementById('refitCancelBtn').addEventListener('click', () => {
    modal.remove();
  });

  document.getElementById('refitConfirmBtn').addEventListener('click', () => {
    modal.remove();
    document.body.removeChild(configuratorOverlay);
    if (onApply) onApply(result);
  });

  // Hover effects
  const confirmBtn = document.getElementById('refitConfirmBtn');
  confirmBtn.addEventListener('mouseover', () => { confirmBtn.style.background = '#b57d12'; });
  confirmBtn.addEventListener('mouseout', () => { confirmBtn.style.background = '#d29922'; });
  const cancelBtn = document.getElementById('refitCancelBtn');
  cancelBtn.addEventListener('mouseover', () => { cancelBtn.style.background = 'var(--border-color)'; cancelBtn.style.color = 'var(--text-primary)'; });
  cancelBtn.addEventListener('mouseout', () => { cancelBtn.style.background = 'var(--surface-elevated)'; cancelBtn.style.color = 'var(--text-secondary)'; });
}


// ======================================================================
// Single-deck cabin configurator
// ======================================================================
function showCabinConfigurator(aircraft, onApply, existingConfig, options) {
  if (!aircraft || !SEAT_LAYOUTS[aircraft.type]) return;

  const ddConfig = getDoubleDeckConfig(aircraft);
  if (ddConfig) {
    showDoubleDeckConfigurator(aircraft, ddConfig, onApply, existingConfig, options);
    return;
  }

  const acType = aircraft.type;

  // Check for per-aircraft layout override (e.g. 777 = 10-abreast, 767 = 7-abreast)
  const acStr = `${aircraft.manufacturer || ''} ${aircraft.model || ''} ${aircraft.icaoCode || ''}`;
  const wbOverride = acType === 'Widebody' ? WIDEBODY_OVERRIDES.find(o => o.match.test(acStr)) : null;
  const layouts = wbOverride ? wbOverride.layout : SEAT_LAYOUTS[acType];

  function classPerRow(cls) {
    return layouts[cls] ? layouts[cls].reduce((s, g) => s + g, 0) : 0;
  }

  const econPerRow = classPerRow('economy');
  const totalSpace = aircraft.passengerCapacity / econPerRow;

  // Round existing seats down to full rows so we never start with partial rows
  function roundToRow(seats, cls) {
    const pr = classPerRow(cls);
    return pr > 0 ? Math.floor((seats || 0) / pr) * pr : (seats || 0);
  }
  const config = {
    first:       roundToRow(existingConfig?.firstSeats, 'first'),
    business:    roundToRow(existingConfig?.businessSeats, 'business'),
    economyPlus: roundToRow(existingConfig?.economyPlusSeats, 'economyPlus'),
    economy:     0
  };

  // Toilet state
  const toiletInfo = _toiletDefaults(aircraft.passengerCapacity);
  let toilets = existingConfig?.toilets != null ? existingConfig.toilets : toiletInfo.default;
  toilets = Math.max(toiletInfo.min, Math.min(toiletInfo.max, toilets));

  function midToiletRows() {
    // First 2 pairs (4 toilets) at nose/tail — free. Each mid-cabin pair costs 3 economy rows.
    const midPairs = Math.max(0, Math.floor(toilets / 2) - 2);
    return midPairs * 3;
  }

  function recalcEconomy() {
    const usedSpace = calcSpaceUsed(config.first, 'first')
                    + calcSpaceUsed(config.business, 'business')
                    + calcSpaceUsed(config.economyPlus, 'economyPlus')
                    + midToiletRows() * PITCH.economy;
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
               + calcSpaceUsed(config.economy, 'economy')
               + midToiletRows() * PITCH.economy;
    return Math.min(100, Math.round((used / totalSpace) * 100));
  }

  function canAdd(cabinClass) {
    const perRow = classPerRow(cabinClass);
    const testCount = config[cabinClass] + perRow;
    const toiletSpace = midToiletRows() * PITCH.economy;
    const testUsed = calcSpaceUsed(testCount, cabinClass)
                   + (['first','business','economyPlus'].filter(c => c !== cabinClass)
                       .reduce((s, c) => s + calcSpaceUsed(config[c], c), 0))
                   + toiletSpace;
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

  const fuselageWidth = (wbOverride && wbOverride.fuselageWidth) || FUSELAGE_WIDTHS[acType] || 190;

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

        <div style="padding: 0.6rem; background: var(--surface-elevated); border-radius: 6px; border-left: 3px solid rgba(148,163,184,0.5); margin-top: 0.4rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem;">
            <span style="font-size: 0.75rem; font-weight: 600; color: rgba(148,163,184,0.8);">LAVATORIES</span>
            <div style="display: flex; align-items: center; gap: 0.35rem;">
              <button class="toilet-adj-btn" data-delta="-2"
                style="width: 24px; height: 24px; border: 1px solid var(--border-color); border-radius: 4px;
                       background: var(--surface); color: var(--text-primary); cursor: pointer; font-size: 0.85rem;
                       display: flex; align-items: center; justify-content: center; padding: 0;">−</button>
              <span id="toiletCount" style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary); min-width: 2rem; text-align: center;">${toilets}</span>
              <button class="toilet-adj-btn" data-delta="2"
                style="width: 24px; height: 24px; border: 1px solid var(--border-color); border-radius: 4px;
                       background: var(--surface); color: var(--text-primary); cursor: pointer; font-size: 0.85rem;
                       display: flex; align-items: center; justify-content: center; padding: 0;">+</button>
            </div>
          </div>
          <div id="toiletNote" style="font-size: 0.55rem; color: var(--text-muted);">Added in pairs · first 4 at nose/tail · extras replace 3 rows each</div>
        </div>

        ${options?.refitWarning ? `
        <div style="margin-top: 0.75rem; padding: 0.5rem 0.65rem; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25); border-left: 3px solid #f59e0b; border-radius: 4px; display: flex; align-items: center; gap: 0.5rem;">
          <span style="font-size: 0.9rem; flex-shrink: 0;">&#9888;</span>
          <span style="font-size: 0.65rem; color: var(--warning-color); line-height: 1.3;">${options.refitWarning}</span>
        </div>
        ` : ''}

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
    container.innerHTML = renderFuselage(config, layouts, fuselageWidth, 'fuselageGrad', true, toilets) + renderLegend();
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
    // Toilet count + note
    const tcEl = document.getElementById('toiletCount');
    if (tcEl) tcEl.textContent = toilets;
    const noteEl = document.getElementById('toiletNote');
    if (noteEl) {
      const midPrs = Math.max(0, Math.floor(toilets / 2) - 2);
      noteEl.textContent = midPrs > 0
        ? `${midPrs} mid-cabin pair${midPrs > 1 ? 's' : ''} replacing ${midPrs * 3 * econPerRow} seats`
        : 'Added in pairs · first 4 at nose/tail';
    }
    // Toilet button states
    const tMin = overlay.querySelector('.toilet-adj-btn[data-delta="-2"]');
    const tPlus = overlay.querySelector('.toilet-adj-btn[data-delta="2"]');
    if (tMin) { tMin.style.opacity = toilets > toiletInfo.min ? '1' : '0.3'; tMin.style.cursor = toilets > toiletInfo.min ? 'pointer' : 'default'; }
    if (tPlus) { tPlus.style.opacity = toilets < toiletInfo.max ? '1' : '0.3'; tPlus.style.cursor = toilets < toiletInfo.max ? 'pointer' : 'default'; }
    renderDiagram();
  }

  // Toilet buttons
  overlay.querySelectorAll('.toilet-adj-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const delta = parseInt(btn.dataset.delta);
      const newVal = toilets + delta;
      if (newVal >= toiletInfo.min && newVal <= toiletInfo.max) {
        toilets = newVal;
        updateUI();
      }
    });
  });

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
    const result = {
      firstSeats: config.first,
      businessSeats: config.business,
      economyPlusSeats: config.economyPlus,
      economySeats: config.economy,
      toilets: toilets
    };
    if (options?.refitConfirm) {
      _showRefitConfirmModal(overlay, options.refitConfirm, onApply, result);
    } else {
      document.body.removeChild(overlay);
      if (onApply) onApply(result);
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
function showDoubleDeckConfigurator(aircraft, ddConfig, onApply, existingConfig, options) {
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
    // Round each deck's seats down to full rows
    for (const cls of ['first', 'business', 'economyPlus']) {
      const upr = deckPerRow(ddConfig.upperLayout, cls);
      if (upr > 0) upperConfig[cls] = Math.floor(upperConfig[cls] / upr) * upr;
      const mpr = deckPerRow(ddConfig.mainLayout, cls);
      if (mpr > 0) mainConfig[cls] = Math.floor(mainConfig[cls] / mpr) * mpr;
    }
  } else {
    // Start with each deck filled with economy
    upperConfig.economy = Math.floor(upperTotalSpace) * upperEconPerRow;
    mainConfig.economy = Math.floor(mainTotalSpace) * mainEconPerRow;
  }

  // Toilet state — each deck has its own minimum (from config)
  const toiletInfo = _toiletDefaults(totalCapacity);
  const minUpper = ddConfig.minToiletsUpper || 2;
  const minMain = ddConfig.minToiletsMain || 4;
  toiletInfo.min = Math.max(toiletInfo.min, minUpper + minMain);
  if (toiletInfo.default < toiletInfo.min) toiletInfo.default = toiletInfo.min;
  if (toiletInfo.max < toiletInfo.min) toiletInfo.max = toiletInfo.min;
  let toilets = existingConfig?.toilets != null ? existingConfig.toilets : toiletInfo.default;
  toilets = Math.max(toiletInfo.min, Math.min(toiletInfo.max, toilets));

  // Toilet split per deck — each deck gets its configured minimum,
  // extra mid-cabin pairs distributed proportionally between decks
  function getDeckToilets() {
    const extra = Math.max(0, toilets - minUpper - minMain);
    let upperExtra = Math.round(extra * ddConfig.upperRatio);
    if (upperExtra % 2 !== 0) upperExtra = Math.max(0, upperExtra - 1);
    return { upper: minUpper + upperExtra, main: minMain + (extra - upperExtra) };
  }
  function deckMidPenalty(deckToiletCount) {
    // Each mid-cabin pair (beyond first 2 pairs) costs 3 economy rows
    return Math.max(0, Math.floor(deckToiletCount / 2) - 2) * 3;
  }

  // Apply initial toilet penalty to economy (recalcDeckEconomy is hoisted)
  {
    const dt0 = getDeckToilets();
    recalcDeckEconomy(upperConfig, ddConfig.upperLayout, upperTotalSpace, deckMidPenalty(dt0.upper));
    recalcDeckEconomy(mainConfig, ddConfig.mainLayout, mainTotalSpace, deckMidPenalty(dt0.main));
  }

  function canDeckAdd(dc, layout, totalSp, cls) {
    const perRow = deckPerRow(layout, cls);
    if (perRow === 0) return false;

    if (cls === 'economy') {
      // Economy: must fit alongside everything else INCLUDING toilet space
      const dt = getDeckToilets();
      const deckT = dc === upperConfig ? dt.upper : dt.main;
      const toiletSpace = deckMidPenalty(deckT) * PITCH.economy;
      let totalUsed = toiletSpace;
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

  // Recalculate economy to fill remaining space (auto-fill, like single-deck)
  function recalcDeckEconomy(dc, layout, totalSp, midPenalty) {
    const econPR = deckPerRow(layout, 'economy');
    if (econPR === 0) return;
    let premiumUsed = 0;
    for (const c of ['first', 'business', 'economyPlus']) {
      const pr = deckPerRow(layout, c);
      if (pr > 0 && dc[c] > 0) premiumUsed += Math.ceil(dc[c] / pr) * PITCH[c];
    }
    premiumUsed += (midPenalty || 0) * PITCH.economy;
    const maxEconRows = Math.floor(Math.max(0, totalSp - premiumUsed) / PITCH.economy);
    dc.economy = maxEconRows * econPR;
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

      ${options?.refitWarning ? `
      <div style="padding: 0.4rem 1.25rem; border-top: 1px solid rgba(245,158,11,0.2); background: rgba(245,158,11,0.06); display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;">
        <span style="font-size: 0.85rem; flex-shrink: 0;">&#9888;</span>
        <span style="font-size: 0.65rem; color: var(--warning-color); line-height: 1.3;">${options.refitWarning}</span>
      </div>
      ` : ''}
      <!-- Summary footer -->
      <div style="padding: 0.6rem 1.25rem; border-top: 1px solid var(--border-color); display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; flex-shrink: 0;">
        <div style="display: flex; align-items: baseline; gap: 0.4rem;">
          <span id="ddTotalPax" style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary);">${totalPax()}</span>
          <span style="font-size: 0.65rem; color: var(--text-muted);">passengers</span>
        </div>
        <div id="ddLegend" style="display: flex; gap: 0.5rem; flex: 1; flex-wrap: wrap;"></div>
        <div style="display: flex; align-items: center; gap: 0.3rem; padding: 0.3rem 0.6rem; background: var(--surface-elevated); border-radius: 5px; border: 1px solid rgba(148,163,184,0.2);">
          <span style="font-size: 0.6rem; font-weight: 600; color: rgba(148,163,184,0.8);">WC</span>
          <button class="dd-toilet-btn" data-delta="-2"
            style="width: 20px; height: 20px; border: 1px solid var(--border-color); border-radius: 3px;
                   background: var(--surface); color: var(--text-primary); cursor: pointer; font-size: 0.75rem;
                   display: flex; align-items: center; justify-content: center; padding: 0;">−</button>
          <span id="ddToiletCount" style="font-weight: 700; font-size: 0.75rem; color: var(--text-primary); min-width: 1.4rem; text-align: center;">${toilets}</span>
          <button class="dd-toilet-btn" data-delta="2"
            style="width: 20px; height: 20px; border: 1px solid var(--border-color); border-radius: 3px;
                   background: var(--surface); color: var(--text-primary); cursor: pointer; font-size: 0.75rem;
                   display: flex; align-items: center; justify-content: center; padding: 0;">+</button>
        </div>
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

    // Toilet count + button states
    const tcEl = document.getElementById('ddToiletCount');
    if (tcEl) tcEl.textContent = toilets;
    const tMin = overlay.querySelector('.dd-toilet-btn[data-delta="-2"]');
    const tPlus = overlay.querySelector('.dd-toilet-btn[data-delta="2"]');
    if (tMin) { tMin.style.opacity = toilets > toiletInfo.min ? '1' : '0.3'; tMin.style.cursor = toilets > toiletInfo.min ? 'pointer' : 'default'; }
    if (tPlus) { tPlus.style.opacity = toilets < toiletInfo.max ? '1' : '0.3'; tPlus.style.cursor = toilets < toiletInfo.max ? 'pointer' : 'default'; }

    // Diagrams — split toilets evenly between decks (always pairs)
    const dt = getDeckToilets();
    const ud = document.getElementById('upperDiagram');
    if (ud) ud.innerHTML = renderFuselage(upperConfig, ddConfig.upperLayout, ddConfig.upperWidth, 'gradUpper', ddConfig.cockpitDeck === 'upper', dt.upper);
    const md = document.getElementById('mainDiagram');
    if (md) md.innerHTML = renderFuselage(mainConfig, ddConfig.mainLayout, ddConfig.mainWidth, 'gradMain', ddConfig.cockpitDeck === 'main', dt.main);
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

      const dt = getDeckToilets();
      const penalty = deck === 'upper' ? deckMidPenalty(dt.upper) : deckMidPenalty(dt.main);
      if (delta > 0 && canDeckAdd(dc, layout, ts, cls)) {
        dc[cls] += perRow;
        if (cls !== 'economy') {
          recalcDeckEconomy(dc, layout, ts, penalty);
        }
      } else if (delta < 0 && dc[cls] > 0) {
        dc[cls] = Math.max(0, dc[cls] - perRow);
        if (cls !== 'economy') {
          recalcDeckEconomy(dc, layout, ts, penalty);
        }
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

  // Toilet buttons
  overlay.querySelectorAll('.dd-toilet-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const delta = parseInt(btn.dataset.delta);
      const newVal = toilets + delta;
      if (newVal >= toiletInfo.min && newVal <= toiletInfo.max) {
        toilets = newVal;
        // Adding toilets may cost economy rows — trim both decks using per-deck penalty
        const dt = getDeckToilets();
        recalcDeckEconomy(upperConfig, ddConfig.upperLayout, upperTotalSpace, deckMidPenalty(dt.upper));
        recalcDeckEconomy(mainConfig, ddConfig.mainLayout, mainTotalSpace, deckMidPenalty(dt.main));
        updateUI();
      }
    });
  });

  // Apply — sum both decks
  document.getElementById('ddApplyBtn').addEventListener('click', () => {
    const result = {
      firstSeats: upperConfig.first + mainConfig.first,
      businessSeats: upperConfig.business + mainConfig.business,
      economyPlusSeats: upperConfig.economyPlus + mainConfig.economyPlus,
      economySeats: upperConfig.economy + mainConfig.economy,
      toilets: toilets
    };
    if (options?.refitConfirm) {
      _showRefitConfirmModal(overlay, options.refitConfirm, onApply, result);
    } else {
      document.body.removeChild(overlay);
      if (onApply) onApply(result);
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
  if (cfg.toilets > 0) parts.push(cfg.toilets + ' WC');
  return parts.join(' / ');
}

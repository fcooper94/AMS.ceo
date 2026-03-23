/**
 * Cabin Configurator
 * Visual aircraft cabin layout editor for configuring seat classes.
 * Shows a top-down aircraft diagram with live-updating seat rows.
 */

// Seat group layouts per aircraft type and class
// Each array = groups of seats separated by aisles
const SEAT_LAYOUTS = {
  Regional: {
    economy:     [2, 2],       // 4 abreast
    economyPlus: [2, 2],       // 4 abreast
    business:    [1, 1],       // 2 abreast
    first:       [1, 1]        // 2 abreast
  },
  Narrowbody: {
    economy:     [3, 3],       // 6 abreast
    economyPlus: [3, 3],       // 6 abreast
    business:    [2, 2],       // 4 abreast (recliner style)
    first:       [1, 1]        // 2 abreast
  },
  Widebody: {
    economy:     [3, 3, 3],    // 9 abreast (A330/A340 default)
    economyPlus: [2, 3, 2],    // 7 abreast (premium economy)
    business:    [1, 2, 1],    // 4 abreast (reverse herringbone / lie-flat)
    first:       [1, 2, 1]     // 4 abreast (suites)
  },
  Cargo: null
};

// Pitch multiplier per class (row height relative to economy)
// 1-2-1 lie-flat business takes ~2x economy pitch; first class suites ~3x
const PITCH = {
  economy: 1.0,
  economyPlus: 1.15,
  business: 1.7,
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
const FUSELAGE_WIDTHS = { Regional: 130, Narrowbody: 280, Widebody: 400 };

// Era year — set from the host page via setCabinEraYear().
// Classes not yet invented are rendered as locked/greyed cards.
//   Business class:    introduced 1978 (El Al, then widespread)
//   Economy Plus:      introduced 1992 (EVA Air / Virgin Atlantic)
let _cabinEraYear = 9999;
window.setCabinEraYear = (year) => { _cabinEraYear = year; };
const CLASS_ERA = { business: 1978, economyPlus: 1992 }; // first & economy have no era gate

// Per-aircraft layout overrides for single-deck widebodies
// (Double-deck aircraft like A380/747 have their own configs in DOUBLE_DECK)
const WIDEBODY_OVERRIDES = [
  {
    match: /777/i,
    fuselageWidth: 420,
    layout: {
      economy:     [3, 4, 3],  // 10 abreast (standard 777)
      economyPlus: [2, 4, 2],  // 8 abreast (premium economy)
      business:    [1, 2, 1],  // 4 abreast (reverse herringbone)
      first:       [1, 2, 1]   // 4 abreast (suites)
    }
  },
  {
    match: /767/i,
    fuselageWidth: 340,
    layout: {
      economy:     [2, 3, 2],  // 7 abreast
      economyPlus: [2, 3, 2],  // 7 abreast
      business:    [1, 2, 1],  // 4 abreast (staggered)
      first:       [1, 1]      // 2 abreast
    }
  }
];

// Row pixel heights per class (SVG units — larger = more visible seats)
const ROW_HEIGHTS = { economy: 22, economyPlus: 26, business: 32, first: 42 };
const ROW_GAP = 3;

/** Calculate default / min / max toilet counts for an aircraft.
 *  Scales realistically with aircraft size:
 *    ≤19 seats  → 0  (tiny regional, no lav needed)
 *    20–45      → 1  (single toilet + small galley, compact)
 *    46–100     → 2  (1 pair: regional jet / small narrowbody)
 *    101–200    → 4  (2 pairs: narrowbody)
 *    201–350    → 6  (3 pairs: small widebody, e.g. 767/A330)
 *    351–500    → 8  (4 pairs: large widebody, e.g. 747/777)
 *    500+       → 10 (5 pairs: very large, e.g. A380)
 */
function _toiletDefaults(passengerCapacity) {
  let def, min;
  if      (passengerCapacity <= 19)  return { min: 0, default: 0, max: 0 };  // too small for toilets
  else if (passengerCapacity <= 45)  return { min: 1, default: 1, max: 1 };  // fixed compact lav
  else if (passengerCapacity <= 100) { def = 2;  min = 0; }
  else if (passengerCapacity <= 200) { def = 4;  min = 2; }
  else if (passengerCapacity <= 350) { def = 6;  min = 4; }
  else if (passengerCapacity <= 500) { def = 8;  min = 4; }
  else                               { def = 10; min = 4; }
  const mx = Math.min(16, def + 4);
  return { min, default: def, max: mx };
}

/** Render a single realistic seat (top-down view with backrest and cushion) */
function _renderSeat(x, y, w, h, fillColor, borderColor, isEmpty) {
  if (isEmpty) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5"
              fill="rgba(100,116,139,0.06)" stroke="rgba(100,116,139,0.12)" stroke-width="0.3"/>`;
  }
  let s = '';
  const backH = Math.max(2, h * 0.28);
  const cushionH = h - backH - 0.5;
  const armW = Math.max(0.6, w * 0.08);
  // Seat back (darker, top)
  s += `<rect x="${x}" y="${y}" width="${w}" height="${backH}" rx="1.5"
          fill="${borderColor}" stroke="${borderColor}" stroke-width="0.3" opacity="0.95"/>`;
  // Seat cushion (lighter, below back)
  s += `<rect x="${x + armW}" y="${y + backH + 0.5}" width="${w - armW * 2}" height="${cushionH}" rx="1.2"
          fill="${fillColor}" stroke="${borderColor}" stroke-width="0.4" opacity="0.85"/>`;
  // Armrests (thin strips on sides)
  s += `<rect x="${x}" y="${y + backH}" width="${armW}" height="${cushionH + 0.5}" rx="0.5"
          fill="${borderColor}" opacity="0.4"/>`;
  s += `<rect x="${x + w - armW}" y="${y + backH}" width="${armW}" height="${cushionH + 0.5}" rx="0.5"
          fill="${borderColor}" opacity="0.4"/>`;
  return s;
}

/** Render a single toilet cubicle with male/female restroom icon
 * @param {boolean} rotateIcon - if true, rotate icon 90° so figures stand upright in landscape
 */
function _renderToiletCubicle(x, y, w, h, rotateIcon) {
  let s = '';
  // Cubicle room with walls
  s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2"
          fill="rgba(100,116,139,0.15)" stroke="rgba(100,116,139,0.4)" stroke-width="0.6"/>`;
  const cx = x + w / 2, cy = y + h / 2;
  const sc = Math.min(w, h) / 40;
  // Wrap icon in rotation group to stand upright in landscape mode
  if (rotateIcon) s += `<g transform="rotate(90,${cx},${cy})">`;
  // Male/female restroom icon (centered in cubicle)
  const figH = 14 * sc;   // total figure height
  const gap = 2 * sc;     // gap between figures
  const headR = 1.5 * sc; // head radius
  // Male figure (left)
  const mx = cx - gap / 2 - 2 * sc;
  const my = cy - figH / 2;
  // Head
  s += `<circle cx="${mx}" cy="${my + headR}" r="${headR}"
          fill="rgba(148,163,184,0.5)"/>`;
  // Body
  s += `<line x1="${mx}" y1="${my + headR * 2 + 0.5*sc}" x2="${mx}" y2="${my + figH * 0.6}"
          stroke="rgba(148,163,184,0.5)" stroke-width="${1.2*sc}" stroke-linecap="round"/>`;
  // Arms
  s += `<line x1="${mx - 2.5*sc}" y1="${my + figH * 0.35}" x2="${mx + 2.5*sc}" y2="${my + figH * 0.35}"
          stroke="rgba(148,163,184,0.5)" stroke-width="${1*sc}" stroke-linecap="round"/>`;
  // Legs
  s += `<line x1="${mx}" y1="${my + figH * 0.6}" x2="${mx - 2*sc}" y2="${my + figH}"
          stroke="rgba(148,163,184,0.5)" stroke-width="${1*sc}" stroke-linecap="round"/>`;
  s += `<line x1="${mx}" y1="${my + figH * 0.6}" x2="${mx + 2*sc}" y2="${my + figH}"
          stroke="rgba(148,163,184,0.5)" stroke-width="${1*sc}" stroke-linecap="round"/>`;
  // Divider line
  s += `<line x1="${cx}" y1="${my + headR * 0.5}" x2="${cx}" y2="${my + figH}"
          stroke="rgba(148,163,184,0.3)" stroke-width="${0.5*sc}"/>`;
  // Female figure (right)
  const fx = cx + gap / 2 + 2 * sc;
  // Head
  s += `<circle cx="${fx}" cy="${my + headR}" r="${headR}"
          fill="rgba(148,163,184,0.5)"/>`;
  // Body (shorter, to skirt)
  s += `<line x1="${fx}" y1="${my + headR * 2 + 0.5*sc}" x2="${fx}" y2="${my + figH * 0.45}"
          stroke="rgba(148,163,184,0.5)" stroke-width="${1.2*sc}" stroke-linecap="round"/>`;
  // Arms
  s += `<line x1="${fx - 2.5*sc}" y1="${my + figH * 0.35}" x2="${fx + 2.5*sc}" y2="${my + figH * 0.35}"
          stroke="rgba(148,163,184,0.5)" stroke-width="${1*sc}" stroke-linecap="round"/>`;
  // Skirt (triangle)
  s += `<path d="M${fx},${my + figH * 0.45} L${fx - 2.8*sc},${my + figH * 0.75} L${fx + 2.8*sc},${my + figH * 0.75} Z"
          fill="rgba(148,163,184,0.4)"/>`;
  // Legs (from under skirt)
  s += `<line x1="${fx - 1*sc}" y1="${my + figH * 0.75}" x2="${fx - 1.5*sc}" y2="${my + figH}"
          stroke="rgba(148,163,184,0.5)" stroke-width="${1*sc}" stroke-linecap="round"/>`;
  s += `<line x1="${fx + 1*sc}" y1="${my + figH * 0.75}" x2="${fx + 1.5*sc}" y2="${my + figH}"
          stroke="rgba(148,163,184,0.5)" stroke-width="${1*sc}" stroke-linecap="round"/>`;
  if (rotateIcon) s += `</g>`;
  return s;
}

/** Render an exit door marker on the fuselage wall with EXIT label inside
 * @param {function|null} trFn - landscape text rotation function: (x,y) => transform attr string
 */
function _renderExitDoor(x, y, isLeft, fW, fuseLeft, fuseRight, trFn) {
  let s = '';
  const doorW = 16;
  const doorH = 28;
  const dx = isLeft ? (fuseLeft - 6) : (fuseRight - doorW + 6);
  // Door rectangle
  s += `<rect x="${dx}" y="${y}" width="${doorW}" height="${doorH}" rx="2.5"
          fill="rgba(239,68,68,0.20)" stroke="rgba(239,68,68,0.65)" stroke-width="1.2"/>`;
  // EXIT label centered inside the door
  const _tx = dx + doorW / 2, _ty = y + doorH / 2;
  const _tt = trFn ? trFn(_tx, _ty) : '';
  s += `<text x="${_tx}" y="${_ty}" text-anchor="middle" dominant-baseline="central" fill="rgba(239,68,68,0.85)" font-size="6" font-weight="800"
          font-family="system-ui,sans-serif" letter-spacing="0.8"${_tt}>EXIT</text>`;
  return s;
}

/**
 * Render a combined service area (galley + lavatories integrated).
 * Real aircraft have toilets built into the galley/service zones near doors.
 * @param {number} toiletCount - number of toilet cubicles to show (0 = galley only)
 */
function _renderServiceArea(x, y, width, height, toiletCount, textTransform, isLandscape) {
  const _tt = textTransform || '';
  let s = '';
  // Service area background
  s += `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="3"
          fill="rgba(100,116,139,0.10)" stroke="rgba(100,116,139,0.3)" stroke-width="0.6"/>`;

  const pad = 4;
  const innerH = height - pad * 2;
  const innerY = y + pad;

  if (toiletCount <= 0) {
    // Pure galley — fill with cart bays
    const bayW = (width - pad * 2 - 4) / 4;
    for (let i = 0; i < 4; i++) {
      const bx = x + pad + 1 + i * (bayW + 1);
      s += `<rect x="${bx}" y="${innerY}" width="${bayW}" height="${innerH}" rx="1.5"
              fill="rgba(148,163,184,0.08)" stroke="rgba(148,163,184,0.22)" stroke-width="0.4"/>`;
      // Cart handle line
      s += `<line x1="${bx + bayW * 0.3}" y1="${innerY + 2}" x2="${bx + bayW * 0.7}" y2="${innerY + 2}"
              stroke="rgba(148,163,184,0.2)" stroke-width="0.3"/>`;
    }
    const _lx = x + width / 2, _ly = y + height / 2 + 2;
    s += `<text x="${_lx}" y="${_ly}" text-anchor="middle"
            fill="rgba(148,163,184,0.35)" font-size="6" font-weight="700" font-family="system-ui, sans-serif"
            letter-spacing="1.5"${_tt}>GALLEY</text>`;
  } else {
    // Combined: toilet cubicles on the sides, galley carts in the center
    const cubW = Math.min(width * 0.28, innerH * 1.1);

    // Left toilet cubicle
    if (toiletCount >= 1) {
      s += _renderToiletCubicle(x + pad, innerY, cubW, innerH, isLandscape);
    }
    // Right toilet cubicle
    if (toiletCount >= 2) {
      s += _renderToiletCubicle(x + width - pad - cubW, innerY, cubW, innerH, isLandscape);
    }

    // Center galley section between the toilets
    const galleyX = x + pad + (toiletCount >= 1 ? cubW + 3 : 0);
    const galleyEndX = x + width - pad - (toiletCount >= 2 ? cubW + 3 : 0);
    const galleyW = galleyEndX - galleyX;
    if (galleyW > 10) {
      // Divider lines
      s += `<line x1="${galleyX}" y1="${y}" x2="${galleyX}" y2="${y + height}"
              stroke="rgba(100,116,139,0.15)" stroke-width="0.3"/>`;
      s += `<line x1="${galleyEndX}" y1="${y}" x2="${galleyEndX}" y2="${y + height}"
              stroke="rgba(100,116,139,0.15)" stroke-width="0.3"/>`;
      // Cart bays in center
      const numCarts = Math.max(1, Math.floor(galleyW / ((innerH * 0.6) + 2)));
      const cartW = (galleyW - 4) / numCarts - 1;
      for (let i = 0; i < numCarts; i++) {
        const bx = galleyX + 2 + i * (cartW + 1);
        s += `<rect x="${bx}" y="${innerY}" width="${cartW}" height="${innerH}" rx="1.5"
                fill="rgba(148,163,184,0.07)" stroke="rgba(148,163,184,0.2)" stroke-width="0.3"/>`;
      }
      // GALLEY label over center section
      const _glx = galleyX + galleyW / 2, _gly = y + height / 2 + 2;
      s += `<text x="${_glx}" y="${_gly}" text-anchor="middle"
              fill="rgba(148,163,184,0.35)" font-size="5" font-weight="700" font-family="system-ui, sans-serif"
              letter-spacing="1"${_tt}>GALLEY</text>`;
    }
  }
  return s;
}

/** Render a compact service area for small aircraft: 1 toilet on one side, small galley on the other */
function _renderCompactServiceArea(x, y, width, height, textTransform, isLandscape) {
  const _tt = textTransform || '';
  let s = '';
  // Background
  s += `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="3"
          fill="rgba(100,116,139,0.10)" stroke="rgba(100,116,139,0.3)" stroke-width="0.6"/>`;
  const pad = 3;
  const innerH = height - pad * 2;
  const innerY = y + pad;
  const halfW = (width - pad * 2 - 2) / 2;
  // Left side: small galley (cart bays)
  const galleyX = x + pad;
  s += `<rect x="${galleyX}" y="${innerY}" width="${halfW}" height="${innerH}" rx="1.5"
          fill="rgba(148,163,184,0.07)" stroke="rgba(148,163,184,0.2)" stroke-width="0.3"/>`;
  // Cart handle lines
  const cartH = (innerH - 3) / 2;
  s += `<rect x="${galleyX + 2}" y="${innerY + 1}" width="${halfW - 4}" height="${cartH}" rx="1"
          fill="rgba(148,163,184,0.06)" stroke="rgba(148,163,184,0.15)" stroke-width="0.3"/>`;
  s += `<rect x="${galleyX + 2}" y="${innerY + cartH + 2}" width="${halfW - 4}" height="${cartH}" rx="1"
          fill="rgba(148,163,184,0.06)" stroke="rgba(148,163,184,0.15)" stroke-width="0.3"/>`;
  const _glx = galleyX + halfW / 2, _gly = y + height / 2 + 1.5;
  s += `<text x="${_glx}" y="${_gly}" text-anchor="middle" fill="rgba(148,163,184,0.3)" font-size="4" font-weight="700"
          font-family="system-ui, sans-serif" letter-spacing="0.8"${_tt}>GALLEY</text>`;
  // Divider
  const divX = x + pad + halfW + 1;
  s += `<line x1="${divX}" y1="${y}" x2="${divX}" y2="${y + height}" stroke="rgba(100,116,139,0.15)" stroke-width="0.3"/>`;
  // Right side: single toilet cubicle
  const toiletX = x + pad + halfW + 2;
  s += _renderToiletCubicle(toiletX, innerY, halfW, innerH, isLandscape);
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
      business:    [1, 2, 1],  // 4 abreast (reverse herringbone)
      first:       [1, 2, 1]   // 4 abreast (suites)
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
      business:    [1, 2, 1],  // 4 abreast (reverse herringbone)
      first:       [1, 2, 1]   // 4 abreast (suites)
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
// landscape: if true, renders nose-left horizontal orientation
function renderFuselage(seatConfig, deckLayout, fWidth, svgId, showCockpit = true, toiletCount = 0, cargoDeckPct = 0, landscape = false, midPosFractions = null) {
  if (!deckLayout) return '';

  const fW = fWidth;
  const isSmallAircraft = fW <= 150;
  const aisleWidth = isSmallAircraft ? 14 : 20;
  const seatGap = 2;

  // Fuselage wall positions — tighter for small aircraft
  const wallInset = isSmallAircraft ? 0.06 : 0.10;
  const fuseLeft = fW * wallInset;
  const fuseRight = fW * (1 - wallInset);
  const bodyPad = isSmallAircraft ? 2 : 6;
  const seatLeft = fuseLeft + bodyPad;
  const seatRight = fuseRight - bodyPad;
  const seatWidth = seatRight - seatLeft;

  // Toilet distribution: handles odd counts (1 = compact single toilet at rear)
  // front pair in front service area, back pair in rear service area,
  // extra pairs as mid-cabin service areas (galley+toilets combined, like real aircraft)
  const isCompactLav = toiletCount === 1; // single toilet + small galley for small aircraft
  const totalPairs = Math.floor(toiletCount / 2);
  const frontToilets = isCompactLav ? 0 : (totalPairs >= 1 ? 2 : 0);
  const rearToilets = isCompactLav ? 0 : (totalPairs >= 2 ? 2 : 0);
  const midPairs = isCompactLav ? 0 : Math.max(0, totalPairs - 2);
  const SERVICE_BLOCK_H = 4.5 * (ROW_HEIGHTS.economy + ROW_GAP); // combined galley+toilet block height
  const COMPACT_SERVICE_H = 2.5 * (ROW_HEIGHTS.economy + ROW_GAP); // smaller for single-toilet aircraft
  const SERVICE_GAP = 6;

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

  // Calculate passenger section height
  let seatContentH = 0;
  if (isCompactLav) {
    seatContentH += COMPACT_SERVICE_H + SERVICE_GAP; // compact rear service area only
  } else if (toiletCount > 0) {
    seatContentH += SERVICE_BLOCK_H + SERVICE_GAP; // front service area
    seatContentH += midPairs * (SERVICE_BLOCK_H + SERVICE_GAP); // mid-cabin service areas
    if (rearToilets > 0) seatContentH += SERVICE_BLOCK_H + SERVICE_GAP; // rear service area
  }
  for (const s of sections) {
    seatContentH += s.numRows * (s.rowH + ROW_GAP) + 4; // rows + small class gap
  }
  if (seatContentH === 0) seatContentH = 40;

  // Combi: cargo deck block at front + bulkhead divider
  const BULKHEAD_H = cargoDeckPct > 0 ? 9 : 0;
  const cargoBlockH = cargoDeckPct > 0
    ? Math.max(60, Math.round(seatContentH * cargoDeckPct / Math.max(0.05, 1 - cargoDeckPct)))
    : 0;
  const totalH = seatContentH + cargoBlockH + BULKHEAD_H;

  // Fuselage shape — clean streamlined silhouette matching professional airline seatmaps
  // Nose must be taller than half the body width to look pointed
  const bodyW = fuseRight - fuseLeft;
  const noseH = Math.round(bodyW * (isSmallAircraft ? 1.0 : 0.55));
  const tailH = Math.round(bodyW * (isSmallAircraft ? 0.7 : 0.25));
  const svgH = noseH + totalH + tailH + 10;
  const gradId = svgId || 'fuselageGrad';
  const clipId = `fClip_${svgId || 'def'}`;
  const cx = fW / 2;
  const bodyEnd = svgH - tailH;

  // Nose: cubic bezier — hugs body wall then converges sharply to tip
  // Tail: gentle rounded cone
  const fuselagePath = `
    M ${fuseLeft} ${noseH}
    C ${fuseLeft} ${noseH * 0.45}, ${cx - 2} ${noseH * 0.04}, ${cx} ${2}
    C ${cx + 2} ${noseH * 0.04}, ${fuseRight} ${noseH * 0.45}, ${fuseRight} ${noseH}
    L ${fuseRight} ${bodyEnd}
    Q ${fuseRight} ${bodyEnd + tailH * 0.85}, ${cx} ${svgH - 1}
    Q ${fuseLeft} ${bodyEnd + tailH * 0.85}, ${fuseLeft} ${bodyEnd}
    Z`;

  // Landscape mode: SVG is built in portrait coords, then rotated -90° so nose points left
  const lsViewW = landscape ? svgH : fW;
  const lsViewH = landscape ? fW : svgH;
  // In landscape: large rendering so individual seats are clearly visible.
  // Height = fuselage cross-section scaled up; width from aspect ratio + stretch.
  const lsH = isSmallAircraft ? 200 : 320;
  const lsW = Math.round(lsH * (lsViewW / lsViewH));
  const lsStyle = landscape
    ? `height:${lsH}px;width:${lsW}px;flex-shrink:0;`
    : `width:100%;height:100%;`;

  let html = `
    <svg viewBox="0 0 ${lsViewW} ${lsViewH}" preserveAspectRatio="xMinYMid meet" style="${lsStyle}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${gradId}" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stop-color="rgba(100,116,139,0.15)"/>
          <stop offset="50%" stop-color="rgba(100,116,139,0.05)"/>
          <stop offset="100%" stop-color="rgba(100,116,139,0.15)"/>
        </linearGradient>
        <clipPath id="${clipId}"><path d="${fuselagePath}"/></clipPath>
      </defs>
  `;

  // Landscape: open rotation group — rotates entire portrait drawing -90° so nose points LEFT
  if (landscape) html += `<g transform="translate(0,${fW}) rotate(-90)">`;

  html += `<path d="${fuselagePath}" fill="url(#${gradId})" stroke="rgba(100,116,139,0.35)" stroke-width="0.8"/>`;

  // Helper: makes text readable in landscape mode by counter-rotating +90° around its anchor
  const _tr = landscape
    ? (x, y) => ` transform="rotate(90,${x},${y})"`
    : () => '';

  // Cockpit area — simple darkened nose with label (like professional seatmaps)
  if (showCockpit) {
    // Darkened cockpit floor filling the nose (matches fuselage cubic bezier)
    html += `<path d="M${fuseLeft + 1},${noseH}
              C${fuseLeft},${noseH * 0.45} ${cx - 2},${noseH * 0.04} ${cx},${2}
              C${cx + 2},${noseH * 0.04} ${fuseRight},${noseH * 0.45} ${fuseRight - 1},${noseH} Z"
              fill="rgba(15,23,42,0.45)" stroke="none"/>`;
    // Bulkhead line separating cockpit from cabin
    html += `<line x1="${fuseLeft + 2}" y1="${noseH}" x2="${fuseRight - 2}" y2="${noseH}"
              stroke="rgba(100,116,139,0.4)" stroke-width="0.8"/>`;
    // COCKPIT label
    const labelY = noseH * 0.65;
    html += `<text x="${cx}" y="${labelY}" text-anchor="middle" dominant-baseline="central" fill="rgba(148,163,184,0.35)" font-size="${isSmallAircraft ? 5 : 7}" font-weight="700"
              font-family="system-ui, sans-serif" letter-spacing="1.5"${_tr(cx, labelY)}>COCKPIT</text>`;
  }

  // All cabin content clipped to fuselage outline
  html += `<g clip-path="url(#${clipId})">`;

  const seatStartY = showCockpit ? noseH + 8 : noseH - 10;
  let curY = seatStartY;

  // Collect aisle X positions for floor shading & row numbers
  function getAislePositions(groups) {
    const classAisles = groups.length - 1;
    const perRow = groups.reduce((s, g) => s + g, 0);
    const seatW = (seatWidth - classAisles * aisleWidth - (perRow - 1) * seatGap) / perRow;
    const positions = [];
    let x = seatLeft;
    for (let gi = 0; gi < groups.length; gi++) {
      x += groups[gi] * (seatW + seatGap) - seatGap;
      if (gi < groups.length - 1) {
        positions.push({ x: x, width: aisleWidth });
        x += aisleWidth;
      }
    }
    return positions;
  }

  // Draw aisle floor shading for entire cabin height
  if (sections.length > 0) {
    const mainAisles = getAislePositions(sections[0].groups);
    for (const a of mainAisles) {
      html += `<rect x="${a.x}" y="${seatStartY}" width="${a.width}" height="${seatContentH}"
                fill="rgba(100,116,139,0.06)" rx="0"/>`;
      // Aisle center line (dotted)
      html += `<line x1="${a.x + a.width/2}" y1="${seatStartY}" x2="${a.x + a.width/2}" y2="${seatStartY + seatContentH}"
                stroke="rgba(100,116,139,0.12)" stroke-width="0.4" stroke-dasharray="3,4"/>`;
    }
  }

  // Track Y positions for exit door placement
  const exitDoorPositions = [];
  const serviceAreaRanges = []; // Y ranges where service areas are (no windows)

  // Helper: render one seat row with realistic seat shapes
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
        const isEmpty = seatIdx >= seatsThisRow;
        rowHtml += _renderSeat(x, y, seatW, s.rowH, cc.bg, cc.border, isEmpty);
        x += seatW + seatGap;
        seatIdx++;
      }
      if (gi < s.groups.length - 1) {
        x += aisleWidth - seatGap;
      }
    }
    return rowHtml;
  }

  // Build a flat list of all seat rows with their class info, then determine
  // where mid-cabin service areas go (at evenly spaced positions through the
  // total row count). This allows service areas to split any class, not just economy.
  const allRows = [];
  for (const s of sections) {
    for (let row = 0; row < s.numRows; row++) {
      allRows.push({ section: s, row, cls: s.cls });
    }
  }
  const totalRows = allRows.length;

  // Determine which absolute row indices get a service area BEFORE them
  // Uses custom fractional positions if provided, otherwise evenly distributed
  // Map: rowIndex → array of midPair indices at that row (handles overlaps)
  const midServiceAtRow = {};
  if (midPairs > 0 && totalRows > 0) {
    for (let i = 0; i < midPairs; i++) {
      let pos;
      if (midPosFractions && midPosFractions.length > i) {
        const frac = Math.max(0, Math.min(1, midPosFractions[i]));
        pos = Math.max(1, Math.min(totalRows - 1, Math.round(frac * totalRows)));
      } else {
        pos = Math.round((i + 1) * totalRows / (midPairs + 1));
      }
      if (!midServiceAtRow[pos]) midServiceAtRow[pos] = [];
      midServiceAtRow[pos].push(i);
    }
  }
  const midServicePositions = new Set(Object.keys(midServiceAtRow).map(Number));

  // --- Render: front service area, then rows with mid-service areas, then rear ---

  // Front service area (galley + front toilets) — skip for 0 or 1 toilet aircraft
  if (!isCompactLav && toiletCount > 0) {
    html += _renderServiceArea(seatLeft, curY, seatWidth, SERVICE_BLOCK_H, frontToilets,
      _tr(seatLeft + seatWidth/2, curY + SERVICE_BLOCK_H/2 + 2), landscape);
    serviceAreaRanges.push({ y1: curY, y2: curY + SERVICE_BLOCK_H });
    exitDoorPositions.push(curY + SERVICE_BLOCK_H/2 - 14);
    curY += SERVICE_BLOCK_H + SERVICE_GAP;
  }

  const seatAreaStartY = curY;  // first row Y — used for drag bounds

  let lastCls = null;
  // Track class section Y ranges for bracket labels
  const classBrackets = []; // { cls, color, label, startY, endY }
  let currentBracket = null;

  for (let ri = 0; ri < allRows.length; ri++) {
    const r = allRows[ri];
    const s = r.section;
    const cc = CLASS_COLORS[r.cls];

    // Insert mid-cabin service area at this position?
    if (midServicePositions.has(ri)) {
      const handleIndices = midServiceAtRow[ri] || [0];
      // Close current bracket before service area
      if (currentBracket) { currentBracket.endY = curY; classBrackets.push(currentBracket); currentBracket = null; }
      exitDoorPositions.push(curY + SERVICE_BLOCK_H/2 - 14);
      html += _renderServiceArea(seatLeft, curY, seatWidth, SERVICE_BLOCK_H, 2,
        _tr(seatLeft + seatWidth/2, curY + SERVICE_BLOCK_H/2 + 2), landscape);
      serviceAreaRanges.push({ y1: curY, y2: curY + SERVICE_BLOCK_H });
      // Draggable overlay for each mid-cabin service area at this row
      for (const hidx of handleIndices) {
        html += `<rect class="mid-drag-handle" data-mid-idx="${hidx}" x="${seatLeft}" y="${curY}" width="${seatWidth}" height="${SERVICE_BLOCK_H}"
                  fill="rgba(148,163,184,0.0)" stroke="none" cursor="grab" pointer-events="all"
                  onmouseover="this.setAttribute('fill','rgba(148,163,184,0.15)');this.setAttribute('stroke','rgba(148,163,184,0.5)');this.setAttribute('stroke-width','1')"
                  onmouseout="this.setAttribute('fill','rgba(148,163,184,0.0)');this.setAttribute('stroke','none')"/>`;
      }
      curY += SERVICE_BLOCK_H + SERVICE_GAP;
      // Re-start bracket for same class continuing after service area
      if (r.cls === lastCls) {
        currentBracket = { cls: r.cls, color: cc.bg, label: cc.label.toUpperCase(), startY: curY };
      }
    }

    // Class header when class changes
    if (r.cls !== lastCls) {
      if (currentBracket) { currentBracket.endY = curY; classBrackets.push(currentBracket); }
      curY += 4; // small gap between classes
      currentBracket = { cls: r.cls, color: cc.bg, label: cc.label.toUpperCase(), startY: curY };
      lastCls = r.cls;
    }

    s._row = r.row;
    html += drawSeatRow(s, cc, curY);
    curY += s.rowH + ROW_GAP;
  }
  // Close final bracket
  if (currentBracket) { currentBracket.endY = curY; classBrackets.push(currentBracket); }

  const seatAreaEndY = curY;  // last row end Y — used for drag bounds

  // Compact rear service area for small aircraft (1 toilet + small galley)
  if (isCompactLav) {
    html += _renderCompactServiceArea(seatLeft, curY, seatWidth, COMPACT_SERVICE_H,
      _tr(seatLeft + seatWidth/2, curY + COMPACT_SERVICE_H/2 + 2), landscape);
    serviceAreaRanges.push({ y1: curY, y2: curY + COMPACT_SERVICE_H });
    exitDoorPositions.push(curY + COMPACT_SERVICE_H/2 - 14);
    curY += COMPACT_SERVICE_H + SERVICE_GAP;
  }

  // Rear service area — only if rear toilets exist (i.e., more than 2 total toilets)
  if (rearToilets > 0) {
    html += _renderServiceArea(seatLeft, curY, seatWidth, SERVICE_BLOCK_H, rearToilets,
      _tr(seatLeft + seatWidth/2, curY + SERVICE_BLOCK_H/2 + 2), landscape);
    serviceAreaRanges.push({ y1: curY, y2: curY + SERVICE_BLOCK_H });
    exitDoorPositions.push(curY + SERVICE_BLOCK_H/2 - 14);
    curY += SERVICE_BLOCK_H + SERVICE_GAP;
  }

  // Combi: cargo deck block at the tail of the cabin, after passenger seats
  if (cargoDeckPct > 0 && cargoBlockH > 0) {
    // Bulkhead divider bar first
    html += `<rect x="${seatLeft - 2}" y="${curY}" width="${seatWidth + 4}" height="${BULKHEAD_H}" rx="1"
               fill="rgba(100,116,139,0.4)" stroke="rgba(100,116,139,0.55)" stroke-width="0.5"/>`;
    html += `<text x="${fW/2}" y="${curY + BULKHEAD_H/2 + 2}" text-anchor="middle" fill="rgba(200,210,220,0.75)" font-size="4.5" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif"${_tr(fW/2, curY + BULKHEAD_H/2 + 2)}>BULKHEAD</text>`;
    curY += BULKHEAD_H;
    // Cargo deck block
    html += `<rect x="${seatLeft}" y="${curY}" width="${seatWidth}" height="${cargoBlockH}" rx="3"
               fill="rgba(251,146,60,0.12)" stroke="rgba(251,146,60,0.5)" stroke-width="0.8" stroke-dasharray="4,2"/>`;
    const clabelY = curY + cargoBlockH / 2;
    html += `<text x="${fW/2}" y="${clabelY - 4}" text-anchor="middle" fill="rgba(251,146,60,0.9)" font-size="8" font-weight="700" font-family="system-ui, sans-serif"${_tr(fW/2, clabelY - 4)}>CARGO DECK</text>`;
    html += `<text x="${fW/2}" y="${clabelY + 6}" text-anchor="middle" fill="rgba(251,146,60,0.6)" font-size="6" font-family="system-ui, sans-serif"${_tr(fW/2, clabelY + 6)}>Main Deck · Freight</text>`;
  }

  // Seat letter labels at the start of each class section (like airline seatmaps)
  // Uses airline convention: A, B, C, D, E, F, G, H, J, K (skip I)
  if (landscape) {
    const SEAT_LETTERS = ['A','B','C','D','E','F','G','H','J','K'];
    const labelledClasses = new Set();
    for (const b of classBrackets) {
      if (labelledClasses.has(b.cls)) continue;
      labelledClasses.add(b.cls);
      // Find the section matching this class to get its groups
      const sec = sections.find(s => s.cls === b.cls);
      if (!sec) continue;
      const perRow = sec.groups.reduce((s, g) => s + g, 0);
      const classAisles = sec.groups.length - 1;
      const seatW = (seatWidth - classAisles * aisleWidth - (perRow - 1) * seatGap) / perRow;
      // Position letters at the class start Y
      const letterY = b.startY - 1;
      let seatIdx = 0;
      let lx = seatLeft;
      for (let gi = 0; gi < sec.groups.length; gi++) {
        for (let gs = 0; gs < sec.groups[gi]; gs++) {
          const letter = seatIdx < SEAT_LETTERS.length ? SEAT_LETTERS[seatIdx] : '';
          const lcx = lx + seatW / 2;
          html += `<text x="${lcx}" y="${letterY}" text-anchor="middle" dominant-baseline="auto" fill="rgba(148,163,184,0.45)" font-size="3.5" font-weight="600"
                    font-family="system-ui, sans-serif"${_tr(lcx, letterY)}>${letter}</text>`;
          lx += seatW + seatGap;
          seatIdx++;
        }
        if (gi < sec.groups.length - 1) lx += aisleWidth - seatGap;
      }
    }
  }

  html += `</g>`;

  // If widebody with no mid-cabin service areas, add 2 mid-cabin exit doors
  const isWidebody = fW >= 350;
  if (isWidebody && midPairs === 0 && seatAreaEndY > seatAreaStartY) {
    const seatRange = seatAreaEndY - seatAreaStartY;
    exitDoorPositions.push(seatAreaStartY + seatRange * 0.33);
    exitDoorPositions.push(seatAreaStartY + seatRange * 0.66);
  }

  // Exit doors on fuselage walls with EXIT labels
  for (const doorY of exitDoorPositions) {
    html += _renderExitDoor(0, doorY, true, fW, fuseLeft, fuseRight, landscape ? _tr : null);
    html += _renderExitDoor(0, doorY, false, fW, fuseLeft, fuseRight, landscape ? _tr : null);
  }

  // Window dots along fuselage walls (skip near doors and service areas)
  const windowSpacing = 10;
  const windowR = 1.5;
  for (let wy = noseH + 15; wy < svgH - tailH - 10; wy += windowSpacing) {
    const nearDoor = exitDoorPositions.some(dy => Math.abs(wy - dy) < 12);
    const inServiceArea = serviceAreaRanges.some(r => wy >= r.y1 - 3 && wy <= r.y2 + 3);
    if (!nearDoor && !inServiceArea) {
      html += `<circle cx="${fuseLeft + 3}" cy="${wy}" r="${windowR}" fill="rgba(148,163,184,0.12)" stroke="rgba(148,163,184,0.22)" stroke-width="0.4"/>`;
      html += `<circle cx="${fuseRight - 3}" cy="${wy}" r="${windowR}" fill="rgba(148,163,184,0.12)" stroke="rgba(148,163,184,0.22)" stroke-width="0.4"/>`;
    }
  }

  // Class section bracket labels (rendered outside the fuselage wall)
  if (landscape && classBrackets.length > 0) {
    const bracketX = fuseLeft - 2; // just outside left fuselage wall (becomes top in landscape)
    for (const b of classBrackets) {
      const by1 = b.startY + 2;
      const by2 = b.endY - 2;
      const bMid = (by1 + by2) / 2;
      const tickLen = 3;
      // Bracket: horizontal line with ticks at ends
      html += `<line x1="${bracketX}" y1="${by1}" x2="${bracketX}" y2="${by2}" stroke="${b.color}" stroke-width="0.8" opacity="0.6"/>`;
      html += `<line x1="${bracketX}" y1="${by1}" x2="${bracketX + tickLen}" y2="${by1}" stroke="${b.color}" stroke-width="0.8" opacity="0.6"/>`;
      html += `<line x1="${bracketX}" y1="${by2}" x2="${bracketX + tickLen}" y2="${by2}" stroke="${b.color}" stroke-width="0.8" opacity="0.6"/>`;
      // Label (counter-rotated for landscape readability)
      const _lx = bracketX - 3, _ly = bMid;
      html += `<text x="${_lx}" y="${_ly}" text-anchor="middle" dominant-baseline="central" fill="${b.color}" font-size="5" font-weight="700"
                font-family="system-ui, sans-serif" letter-spacing="0.5" opacity="0.7"${_tr(_lx, _ly)}>${b.label}</text>`;
    }
  }

  // Hidden metadata for drag bounds (portrait Y coords of seat area)
  html += `<rect class="seat-bounds-meta" data-start-y="${seatAreaStartY}" data-end-y="${seatAreaEndY}" data-total-rows="${totalRows}" width="0" height="0" visibility="hidden"/>`;

  // Close landscape rotation group
  if (landscape) html += `</g>`;

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

  // Mid-cabin service area positions (fractional 0–1, front to rear)
  let midPositions = existingConfig?.midPositions ? [...existingConfig.midPositions] : [];

  function ensureMidPositions() {
    const midPairs = Math.max(0, Math.floor(toilets / 2) - 2);
    // Grow array with evenly spaced defaults
    while (midPositions.length < midPairs) {
      const idx = midPositions.length;
      midPositions.push((idx + 1) / (midPairs + 1));
    }
    // Shrink if needed
    if (midPositions.length > midPairs) midPositions.length = midPairs;
  }
  ensureMidPositions();

  function midToiletRows() {
    // Mid-cabin service areas (galley + toilets) are visually shown but do not cost seat capacity.
    return 0;
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
                display: flex; flex-direction: column; max-width: 1100px; width: 100%; max-height: 90vh; overflow: hidden;">
      <!-- Top controls bar -->
      <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color); overflow-y: auto; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem; flex-wrap: wrap;">
          <div style="flex-shrink: 0;">
            <h2 style="margin: 0 0 0.15rem 0; color: var(--text-primary); font-size: 1rem;">CABIN CONFIGURATION</h2>
            <div style="color: var(--text-muted); font-size: 0.65rem;">${aircraft.manufacturer} ${aircraft.model}${aircraft.variant ? ' ' + aircraft.variant : ''} · ${acType}</div>
          </div>
          <div style="padding: 0.4rem 0.75rem; background: var(--surface-elevated); border-radius: 6px; display: flex; align-items: center; gap: 0.6rem; flex-shrink: 0;">
            <span style="font-size: 0.7rem; color: var(--text-secondary);">Total</span>
            <span id="cabinTotalPax" style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary);">${totalPax()}</span>
            <div style="width: 60px; height: 6px; background: var(--surface); border-radius: 3px; overflow: hidden;">
              <div id="cabinSpaceBar" style="height: 100%; border-radius: 3px; transition: width 0.3s ease, background 0.3s ease;
                   width: ${spaceUsedPercent()}%; background: ${spaceUsedPercent() > 95 ? '#EF4444' : '#10B981'};"></div>
            </div>
            <span id="cabinSpacePercent" style="font-size: 0.5rem; color: var(--text-muted);">${spaceUsedPercent()}%</span>
          </div>
        </div>

        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: stretch;">
          ${buildClassCtrl('first')}
          ${buildClassCtrl('business')}
          ${buildClassCtrl('economyPlus')}
          ${buildEconDisp()}

          <div style="padding: 0.5rem 0.6rem; background: var(--surface-elevated); border-radius: 6px; border-left: 3px solid rgba(148,163,184,0.5); display: flex; flex-direction: column; justify-content: center;">
            <div style="display: flex; align-items: center; gap: 0.35rem; margin-bottom: 0.2rem;">
              <span style="font-size: 0.65rem; font-weight: 600; color: rgba(148,163,184,0.8);">WC</span>
              <button class="toilet-adj-btn" data-delta="-2"
                style="width: 22px; height: 22px; border: 1px solid var(--border-color); border-radius: 4px;
                       background: var(--surface); color: var(--text-primary); cursor: pointer; font-size: 0.8rem;
                       display: flex; align-items: center; justify-content: center; padding: 0;">−</button>
              <span id="toiletCount" style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary); min-width: 1.5rem; text-align: center;">${toilets}</span>
              <button class="toilet-adj-btn" data-delta="2"
                style="width: 22px; height: 22px; border: 1px solid var(--border-color); border-radius: 4px;
                       background: var(--surface); color: var(--text-primary); cursor: pointer; font-size: 0.8rem;
                       display: flex; align-items: center; justify-content: center; padding: 0;">+</button>
            </div>
            <div id="toiletNote" style="font-size: 0.5rem; color: var(--text-muted); white-space: nowrap;">Pairs · nose/tail</div>
          </div>

          ${options?.refitWarning ? `
          <div style="padding: 0.4rem 0.6rem; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25); border-left: 3px solid #f59e0b; border-radius: 4px; display: flex; align-items: center; gap: 0.4rem;">
            <span style="font-size: 0.85rem; flex-shrink: 0;">&#9888;</span>
            <span style="font-size: 0.6rem; color: var(--warning-color); line-height: 1.2;">${options.refitWarning}</span>
          </div>
          ` : ''}

          <div style="display: flex; gap: 0.4rem; align-items: center; margin-left: auto;">
            <button id="cabinApplyBtn" class="btn btn-primary" style="padding: 0.5rem 1.25rem; font-size: 0.8rem;">Apply</button>
            <button id="cabinCancelBtn" class="btn btn-secondary" style="padding: 0.5rem 1.25rem; font-size: 0.8rem;">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Landscape diagram area — scrollable in both directions -->
      <div id="cabinDiagramScroll" style="flex: 1; min-height: 0; background: rgba(0,0,0,0.2); overflow: auto; padding: 0.5rem 0.75rem;">
        <div id="cabinDiagramContainer" style="display: flex; flex-direction: column; align-items: flex-start;"></div>
      </div>
    </div>
  `;

  function buildClassCtrl(cls) {
    const cc       = CLASS_COLORS[cls];
    const perRow   = classPerRow(cls);
    const groups   = layouts[cls];
    const eraFrom  = CLASS_ERA[cls];
    const eraLocked = eraFrom != null && _cabinEraYear < eraFrom;

    if (eraLocked) {
      config[cls] = 0;
      return `
        <div style="padding: 0.4rem 0.6rem; background: var(--surface-elevated); border-radius: 6px;
                    border-left: 3px solid ${cc.bg}; opacity: 0.38; cursor: not-allowed; min-width: 120px;"
             title="${cc.label} class was introduced in ${eraFrom}. Not available in this era.">
          <div style="font-size: 0.65rem; font-weight: 600; color: ${cc.bg}; margin-bottom: 0.15rem;">${cc.label.toUpperCase()}</div>
          <div style="font-size: 0.5rem; color: var(--text-muted); font-style: italic;">Available ${eraFrom}</div>
        </div>
      `;
    }

    return `
      <div style="padding: 0.4rem 0.6rem; background: var(--surface-elevated); border-radius: 6px; border-left: 3px solid ${cc.bg}; min-width: 120px;">
        <div style="font-size: 0.65rem; font-weight: 600; color: ${cc.bg}; margin-bottom: 0.2rem;">${cc.label.toUpperCase()}</div>
        <div style="display: flex; align-items: center; gap: 0.3rem;">
          <button class="cabin-adj-btn" data-class="${cls}" data-delta="-1"
            style="width: 22px; height: 22px; border: 1px solid var(--border-color); border-radius: 4px;
                   background: var(--surface); color: var(--text-primary); cursor: pointer; font-size: 0.8rem;
                   display: flex; align-items: center; justify-content: center; padding: 0;">−</button>
          <span id="cabinCount_${cls}" style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary); min-width: 1.8rem; text-align: center;">${config[cls]}</span>
          <button class="cabin-adj-btn" data-class="${cls}" data-delta="1"
            style="width: 22px; height: 22px; border: 1px solid var(--border-color); border-radius: 4px;
                   background: var(--surface); color: var(--text-primary); cursor: pointer; font-size: 0.8rem;
                   display: flex; align-items: center; justify-content: center; padding: 0;">+</button>
        </div>
        <div style="font-size: 0.45rem; color: var(--text-muted); margin-top: 0.15rem;">${groups.join('-')} · ${perRow}/row</div>
      </div>
    `;
  }

  function buildEconDisp() {
    const cc = CLASS_COLORS.economy;
    return `
      <div style="padding: 0.4rem 0.6rem; background: var(--surface-elevated); border-radius: 6px; border-left: 3px solid ${cc.bg}; min-width: 120px;">
        <div style="font-size: 0.65rem; font-weight: 600; color: ${cc.bg}; margin-bottom: 0.2rem;">ECONOMY</div>
        <span id="cabinCount_economy" style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">${config.economy}</span>
        <div style="font-size: 0.45rem; color: var(--text-muted); margin-top: 0.15rem;">${layouts.economy.join('-')} · ${econPerRow}/row · auto</div>
      </div>
    `;
  }

  document.body.appendChild(overlay);

  function renderLegend() {
    const classOrder = ['first', 'business', 'economyPlus', 'economy'];
    let html = `<div style="display: flex; gap: 0.75rem; margin-top: 0.4rem; flex-wrap: wrap; justify-content: center; align-items: center;">`;
    for (const cls of classOrder) {
      if (config[cls] > 0) {
        const cc = CLASS_COLORS[cls];
        html += `<div style="display: flex; align-items: center; gap: 0.25rem;">
          <div style="width: 10px; height: 10px; border-radius: 2px; background: ${cc.bg}; border: 1px solid ${cc.border};"></div>
          <span style="font-size: 0.6rem; color: var(--text-secondary);">${cc.label} (${config[cls]})</span>
        </div>`;
      }
    }
    // Exit door legend
    html += `<div style="display: flex; align-items: center; gap: 0.25rem;">
      <div style="width: 10px; height: 6px; border-radius: 1px; background: rgba(239,68,68,0.25); border: 1px solid rgba(239,68,68,0.6);"></div>
      <span style="font-size: 0.6rem; color: var(--text-secondary);">Exit</span>
    </div>`;
    html += `</div>`;
    return html;
  }

  function renderDiagram() {
    const container = document.getElementById('cabinDiagramContainer');
    if (!container) return;
    const cdp = aircraft.isCombi && aircraft.cargoCapacityKg > 0
      ? Math.min(0.75, aircraft.cargoCapacityKg / (aircraft.cargoCapacityKg + (aircraft.passengerCapacity || 1) * 100))
      : 0;
    container.innerHTML = renderFuselage(config, layouts, fuselageWidth, 'fuselageGrad', true, toilets, cdp, true, midPositions) + renderLegend();
  }

  // Drag handling for mid-cabin service areas
  let _midDrag = null;   // { idx, startY, endY, totalRows, lastRow }

  function _screenToSvgY(svg, clientX, clientY) {
    // Use SVG's CTM to accurately convert screen coords → SVG viewBox coords
    // In landscape mode, viewBox X corresponds to portrait Y (cabin length)
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return 0;
    const svgPt = pt.matrixTransform(ctm.inverse());
    return svgPt.x; // viewBox X = portrait Y in landscape
  }

  function setupMidDragHandles() {
    const container = document.getElementById('cabinDiagramContainer');
    if (!container) return;
    const svg = container.querySelector('svg');
    if (!svg) return;

    const meta = svg.querySelector('.seat-bounds-meta');
    if (!meta) return;
    const startY = parseFloat(meta.dataset.startY);
    const endY = parseFloat(meta.dataset.endY);
    const totalRows = parseInt(meta.dataset.totalRows);

    svg.querySelectorAll('.mid-drag-handle').forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const idx = parseInt(handle.dataset.midIdx);
        // Calculate what row this currently sits at
        const currentRow = Math.round(midPositions[idx] * totalRows);
        _midDrag = { idx, startY, endY, totalRows, lastRow: currentRow };
        document.body.style.cursor = 'grabbing';
        const scrollEl = document.getElementById('cabinDiagramScroll');
        if (scrollEl) scrollEl.style.overflow = 'hidden';
      });
    });
  }

  // Global mouse handlers for drag (attached to overlay)
  overlay.addEventListener('mousemove', (e) => {
    if (!_midDrag) return;
    e.preventDefault();
    const container = document.getElementById('cabinDiagramContainer');
    if (!container) return;
    const svg = container.querySelector('svg');
    if (!svg) return;

    const portraitY = _screenToSvgY(svg, e.clientX, e.clientY);
    const range = _midDrag.endY - _midDrag.startY;
    if (range <= 0) return;

    // Convert portrait Y to a row index, clamped to valid range
    const frac = (portraitY - _midDrag.startY) / range;
    const rowIdx = Math.max(1, Math.min(_midDrag.totalRows - 1, Math.round(frac * _midDrag.totalRows)));

    // Only re-render when the row actually changes (snap to rows)
    if (rowIdx !== _midDrag.lastRow) {
      _midDrag.lastRow = rowIdx;
      midPositions[_midDrag.idx] = rowIdx / _midDrag.totalRows;
      renderDiagram();
      setupMidDragHandles();
    }
  });

  function _endMidDrag() {
    if (_midDrag) {
      document.body.style.cursor = '';
      _midDrag = null;
      const scrollEl = document.getElementById('cabinDiagramScroll');
      if (scrollEl) scrollEl.style.overflow = 'auto';
    }
  }
  overlay.addEventListener('mouseup', _endMidDrag);
  overlay.addEventListener('mouseleave', _endMidDrag);

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
      if (toilets === 0) {
        noteEl.textContent = 'No lavatories · tap + to add';
      } else if (toilets === 1) {
        noteEl.textContent = 'Single rear lav + galley';
      } else {
        const midPrs = Math.max(0, Math.floor(toilets / 2) - 2);
        noteEl.textContent = midPrs > 0
          ? `${midPrs} mid-cabin pair${midPrs > 1 ? 's' : ''} with galley`
          : 'Added in pairs · first 4 at nose/tail';
      }
    }
    // Toilet button states
    const tMin = overlay.querySelector('.toilet-adj-btn[data-delta="-1"]');
    const tPlus = overlay.querySelector('.toilet-adj-btn[data-delta="1"]');
    if (tMin) { tMin.style.opacity = toilets > toiletInfo.min ? '1' : '0.3'; tMin.style.cursor = toilets > toiletInfo.min ? 'pointer' : 'default'; }
    if (tPlus) { tPlus.style.opacity = toilets < toiletInfo.max ? '1' : '0.3'; tPlus.style.cursor = toilets < toiletInfo.max ? 'pointer' : 'default'; }
    ensureMidPositions();
    renderDiagram();
    setupMidDragHandles();
  }

  // Toilet buttons
  overlay.querySelectorAll('.toilet-adj-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const delta = parseInt(btn.dataset.delta);
      const newVal = toilets + delta;
      if (newVal >= toiletInfo.min && newVal <= toiletInfo.max) {
        toilets = newVal;
        ensureMidPositions();
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
      toilets: toilets,
      midPositions: midPositions.length > 0 ? [...midPositions] : undefined
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

  // Auto-scroll diagram container to show nose of aircraft on open
  requestAnimationFrame(() => {
    const scrollParent = document.getElementById('cabinDiagramContainer')?.parentElement;
    if (scrollParent) { scrollParent.scrollLeft = 0; scrollParent.scrollTop = 0; }
  });
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
    // Mid-cabin service areas are visually shown but do not cost seat capacity
    return 0;
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

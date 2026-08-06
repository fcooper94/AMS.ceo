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
  Airship: {                   // narrow gondola — fallback (see getAirshipCabin)
    economy:     [1, 1],       // 2 abreast, single seat each side of the aisle
    economyPlus: [1, 1],
    business:    [1, 1],
    first:       [1, 1]
  },
  Cargo: null
};

// Airship gondola cabin scales with capacity: a small blimp is a single-seat-
// each-side aisle; larger craft (Airlander) widen to 2-1 / 2-2. Returns
// { layout, fuselageWidth }. Rendered with a cylindrical (capsule) fuselage.
function getAirshipCabin(aircraft) {
  const cap = aircraft.passengerCapacity || 0;
  if (cap <= 20) {
    return { layout: { economy: [1, 1], economyPlus: [1, 1], business: [1, 1], first: [1, 1] }, fuselageWidth: 100 };
  }
  if (cap <= 40) {
    return { layout: { economy: [2, 1], economyPlus: [2, 1], business: [1, 1], first: [1, 1] }, fuselageWidth: 130 };
  }
  return { layout: { economy: [2, 2], economyPlus: [2, 2], business: [1, 1], first: [1, 1] }, fuselageWidth: 155 };
}

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
const FUSELAGE_WIDTHS = { Regional: 130, Narrowbody: 280, Widebody: 400, Airship: 100 };

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

// ---------------------------------------------------------------------------
// Real per-aircraft cabin cross-sections, keyed by ICAO type code.
// The type category (Regional/Narrowbody/Widebody) is too coarse — a 30-seat
// DC-3 and a 180-seat 737 are both "Narrowbody" — so this table carries the
// ACTUAL seats-abreast for every airframe in the fleet. ICAO code == fuselage
// cross-section, so variants that share a code (combis, sub-variants) correctly
// share one entry.
//
// Value shapes:
//   [g, ...]                         economy groups; premium classes derived,
//                                    fuselage width derived from total abreast.
//   { eco, ep?, biz?, fst?, fw? }    explicit per-class groups (used for
//                                    twin-aisle widebodies where the real
//                                    premium cabins matter). Any omitted class
//                                    is derived; width derived unless `fw` set.
//
// Excluded (never open the single-deck configurator): Cargo airframes and
// Airships (no cabin config), and the 747 / A380 families (handled by the
// double-deck configurator via DOUBLE_DECK).
const AIRCRAFT_CABIN = {
  // ---- Widebodies — twin-aisle, real premium cabins ----
  A306: { eco: [2,4,2], ep: [2,3,2], biz: [2,2,2], fst: [1,2,1] }, // A300
  A30B: { eco: [2,4,2], ep: [2,3,2], biz: [2,2,2], fst: [1,2,1] }, // A300
  A310: { eco: [2,4,2], ep: [2,3,2], biz: [2,2,2], fst: [1,2,1] },
  A332: { eco: [2,4,2], ep: [2,3,2], biz: [1,2,1], fst: [1,2,1] }, // A330
  A333: { eco: [2,4,2], ep: [2,3,2], biz: [1,2,1], fst: [1,2,1] },
  A338: { eco: [2,4,2], ep: [2,3,2], biz: [1,2,1], fst: [1,2,1] },
  A339: { eco: [2,4,2], ep: [2,3,2], biz: [1,2,1], fst: [1,2,1] },
  A342: { eco: [2,4,2], ep: [2,3,2], biz: [1,2,1], fst: [1,2,1] }, // A340
  A343: { eco: [2,4,2], ep: [2,3,2], biz: [1,2,1], fst: [1,2,1] },
  A345: { eco: [2,4,2], ep: [2,3,2], biz: [1,2,1], fst: [1,2,1] },
  A346: { eco: [2,4,2], ep: [2,3,2], biz: [1,2,1], fst: [1,2,1] },
  A358: { eco: [3,3,3], ep: [2,4,2], biz: [1,2,1], fst: [1,2,1] }, // A350
  A359: { eco: [3,3,3], ep: [2,4,2], biz: [1,2,1], fst: [1,2,1] },
  A35K: { eco: [3,3,3], ep: [2,4,2], biz: [1,2,1], fst: [1,2,1] },
  B762: { eco: [2,3,2], ep: [2,2,2], biz: [1,2,1], fst: [1,2,1] }, // 767
  B763: { eco: [2,3,2], ep: [2,2,2], biz: [1,2,1], fst: [1,2,1] },
  B764: { eco: [2,3,2], ep: [2,2,2], biz: [1,2,1], fst: [1,2,1] },
  B772: { eco: [3,4,3], ep: [2,4,2], biz: [1,2,1], fst: [1,2,1] }, // 777 (10-ab)
  B773: { eco: [3,4,3], ep: [2,4,2], biz: [1,2,1], fst: [1,2,1] },
  B77W: { eco: [3,4,3], ep: [2,4,2], biz: [1,2,1], fst: [1,2,1] },
  B778: { eco: [3,4,3], ep: [2,4,2], biz: [1,2,1], fst: [1,2,1] },
  B779: { eco: [3,4,3], ep: [2,4,2], biz: [1,2,1], fst: [1,2,1] },
  B788: { eco: [3,3,3], ep: [2,3,2], biz: [1,2,1], fst: [1,2,1] }, // 787
  B789: { eco: [3,3,3], ep: [2,3,2], biz: [1,2,1], fst: [1,2,1] },
  B78X: { eco: [3,3,3], ep: [2,3,2], biz: [1,2,1], fst: [1,2,1] },
  DC10: { eco: [2,5,2], ep: [2,3,2], biz: [2,2,2], fst: [2,2,2] },
  L101: { eco: [2,5,2], ep: [2,3,2], biz: [2,2,2], fst: [2,2,2] }, // L-1011
  MD11: { eco: [2,5,2], ep: [2,3,2], biz: [2,2,2], fst: [1,2,1] },
  IL86: { eco: [3,3,3], ep: [2,3,2], biz: [2,2,2], fst: [2,2,2] },
  IL96: { eco: [3,3,3], ep: [2,3,2], biz: [2,2,2], fst: [1,2,1] },

  // ---- Narrowbody jets — 3-3 (6 abreast) ----
  A20N: [3,3], A21N: [3,3], A318: [3,3], A319: [3,3], A320: [3,3], A321: [3,3],
  B37M: [3,3], B38M: [3,3], B39M: [3,3], B3XM: [3,3],
  B731: [3,3], B732: [3,3], B733: [3,3], B734: [3,3], B735: [3,3], B736: [3,3],
  B737: [3,3], B738: [3,3], B739: [3,3],
  B703: [3,3], B721: [3,3], B722: [3,3], B752: [3,3], B753: [3,3],
  DC85: [3,3], DC86: [3,3],
  T104: [3,3], T154: [3,3], T204: [3,3], IL18: [3,3], IL62: [3,3], YK42: [3,3],
  MC23: [3,3], L188: [3,3],
  B461: [3,3], B462: [3,3], B463: [3,3], RJ70: [3,3], RJ85: [3,3], RJ1H: [3,3], // BAe 146 / Avro RJ

  // ---- 5 abreast (2-3) ----
  DC91: [2,3], DC93: [2,3], // DC-9
  MD80: [2,3], MD81: [2,3], MD82: [2,3], MD83: [2,3], MD87: [2,3], MD88: [2,3], MD90: [2,3],
  BA11: [2,3], S210: [2,3], T134: [2,3], // BAC 1-11, Caravelle, Tu-134
  BCS1: [2,3], BCS3: [2,3], // A220
  COMT: [2,3], // Comet 4
  F28: [2,3], F70: [2,3], F100: [2,3], // Fokker jets
  SU95: [2,3], A148: [2,3], A158: [2,3],
  DC6B: [2,3], DC7: [2,3], CONI: [2,3], // high-density pistons

  // ---- 4 abreast (2-2) ----
  CONC: [2,2], // Concorde — narrow supersonic tube
  DC4: [2,2], DC6: [2,2], L749: [2,2], B377: [2,2], HPH4: [2,2], AVYO: [2,2], // pistons
  IL12: [2,2], IL14: [2,2], YK40: [2,2], SC90: [2,2], N262: [2,2], HPR7: [2,2],
  YS11: [2,2], VISC: [2,2], CVLP: [2,2], CVLT: [2,2], C46: [2,2], M202: [2,2],
  M404: [2,2], SDRM: [2,2], A140: [2,2], AN24: [2,2], ATP: [2,2], B17C: [2,2],
  B17W: [2,2], C212: [2,2], CL15: [2,2],
  F27: [2,2], F50: [2,2], F60: [2,2], // Fokker turboprops
  DHC7: [2,2], DH8A: [2,2], DH8B: [2,2], DH8C: [2,2], DH8D: [2,2], // Dash 8
  AT43: [2,2], AT44: [2,2], AT45: [2,2], AT46: [2,2], AT72: [2,2], AT75: [2,2], AT76: [2,2], // ATR
  CRJ1: [2,2], CRJ2: [2,2], CRJ7: [2,2], CRJ9: [2,2], CRJX: [2,2], // CRJ
  E170: [2,2], E75S: [2,2], E75L: [2,2], E190: [2,2], E195: [2,2], E290: [2,2], E295: [2,2], // E-jets

  // ---- 3 abreast (2-1) ----
  DC3: [2,1], E120: [2,1], SF34: [2,1], SB20: [2,1], D328: [2,1], J328: [2,1],
  SH33: [2,1], SH36: [2,1], C208: [2,1], HERN: [2,1], NOMA: [2,1], Y12: [2,1],

  // ---- 3 abreast (1-2) — regional jets/turboprops with single+double rows ----
  E110: [1,2], E135: [1,2], E140: [1,2], E145: [1,2], // Bandeirante, ERJ
  JS31: [1,2], JS32: [1,2], JS41: [1,2], // Jetstream
  D228: [1,2], L410: [1,2], DHC6: [1,2], SC7: [1,2], C408: [1,2],

  // ---- 3 abreast bench (no aisle) ----
  BN2P: [3], TRIS: [3], // Islander, Trislander

  // ---- 2 abreast (1-1) — light singles/twins & narrow commuters ----
  SW4: [1,1], B190: [1,1], BE99: [1,1], // Metro, Beech 1900, Beech 99
  C182: [1,1], P68: [1,1], TBM9: [1,1], PA46: [1,1], DHC2: [1,1], DA62: [1,1],
  DH2T: [1,1], GA8: [1,1], PA31: [1,1], P750: [1,1], PC6T: [1,1], DHC3: [1,1],
  K100: [1,1], BE18: [1,1], DOVE: [1,1], PAY3: [1,1], C441: [1,1], PC12: [1,1],
  PC24: [1,1], P212: [1,1], AN2: [1,1], G21: [1,1], F406: [1,1]
};

// Visual fuselage width for a given total seats-abreast (single source of truth
// so a 2-2 regional and a 2-2 Concorde render at the same width).
const FUSELAGE_WIDTH_BY_ABREAST = { 1: 80, 2: 95, 3: 120, 4: 145, 5: 180, 6: 235, 7: 300, 8: 340, 9: 380, 10: 410 };
function _abreastOf(groups) { return groups.reduce((s, g) => s + g, 0); }
function _widthForAbreast(n) { return FUSELAGE_WIDTH_BY_ABREAST[n] || (n > 10 ? 410 : 190); }
// Premium derived from economy: one fewer seat per side (min 1). Used for
// single-aisle/regional types, which were historically single-class or have
// era-locked premium cabins anyway.
function _derivePremium(eco) { return eco.map(g => Math.max(1, g - 1)); }

// Resolve the real cabin for an ICAO code → { layout, fuselageWidth } or null.
function getIcaoCabin(icaoCode) {
  const d = icaoCode && AIRCRAFT_CABIN[icaoCode];
  if (!d) return null;
  const isArr = Array.isArray(d);
  const eco = isArr ? d : d.eco;
  const layout = {
    economy:     eco,
    economyPlus: (!isArr && d.ep)  ? d.ep  : eco.slice(),             // same abreast, more pitch
    business:    (!isArr && d.biz) ? d.biz : _derivePremium(eco),
    first:       (!isArr && d.fst) ? d.fst : ((!isArr && d.biz) ? d.biz : _derivePremium(eco))
  };
  const fuselageWidth = (!isArr && d.fw) ? d.fw : _widthForAbreast(_abreastOf(eco));
  return { layout, fuselageWidth };
}

// Blanket small-aircraft rule — FALLBACK only, for any airframe missing from
// AIRCRAFT_CABIN above. Scales the abreast count down by passenger capacity
// (first threshold that fits wins), applied only when it yields a NARROWER
// cabin than the type default — it only narrows.
//   ≤12 pax → 1-1 (2 abreast, e.g. Beech 1900 / Twin Otter)
//   ≤30 pax → 2-1 (3 abreast, e.g. DC-3 / Saab 340 / EMB-120)
//   ≤50 pax → 2-2 (4 abreast, e.g. ATR / CRJ)
const SMALL_AIRCRAFT_LAYOUTS = [
  { maxCapacity: 12, fuselageWidth: 95,  layout: { economy: [1, 1], economyPlus: [1, 1], business: [1, 1], first: [1, 1] } },
  { maxCapacity: 30, fuselageWidth: 120, layout: { economy: [2, 1], economyPlus: [2, 1], business: [1, 1], first: [1, 1] } },
  { maxCapacity: 50, fuselageWidth: 135, layout: { economy: [2, 2], economyPlus: [2, 2], business: [1, 1], first: [1, 1] } }
];

// Returns { layout, fuselageWidth } for a small aircraft, or null when the type
// default is already as narrow (never widens an aircraft's cabin).
function getSmallAircraftOverride(capacity, typeLayout) {
  if (!capacity || capacity <= 0) return null;
  const rule = SMALL_AIRCRAFT_LAYOUTS.find(r => capacity <= r.maxCapacity);
  if (!rule) return null;
  const typeEcon = typeLayout && typeLayout.economy ? typeLayout.economy.reduce((s, g) => s + g, 0) : 99;
  const ruleEcon = rule.layout.economy.reduce((s, g) => s + g, 0);
  return ruleEcon < typeEcon ? rule : null;
}

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
  // Galley labels rotate around their OWN position (not the block centre that
  // the caller's textTransform uses), so an off-centre galley stays aligned.
  const _ltr = isLandscape ? (lx, ly) => ` transform="rotate(90,${lx},${ly})"` : () => '';
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
            letter-spacing="1.5"${_ltr(_lx, _ly)}>GALLEY</text>`;
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
              letter-spacing="1"${_ltr(_glx, _gly)}>GALLEY</text>`;
    }
  }
  return s;
}

/** Render a compact service area for small aircraft: 1 toilet on one side, small galley on the other */
function _renderCompactServiceArea(x, y, width, height, textTransform, isLandscape) {
  // Galley label rotates around its own (left-side) position, not the block centre.
  const _ltr = isLandscape ? (lx, ly) => ` transform="rotate(90,${lx},${ly})"` : () => '';
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
          font-family="system-ui, sans-serif" letter-spacing="0.8"${_ltr(_glx, _gly)}>GALLEY</text>`;
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

// Build the deckSpec for one deck ('upper' | 'main') of a double-deck aircraft,
// used to render a single-deck configurator for just that deck. Returns null if
// the aircraft isn't double-deck.
function getDeckSpec(aircraft, deck) {
  const dd = getDoubleDeckConfig(aircraft);
  if (!dd) return null;
  const total = aircraft.passengerCapacity || 0;
  const upperCapacity = Math.round(total * dd.upperRatio);
  const mainCapacity = total - upperCapacity;
  if (deck === 'upper') {
    return {
      deck: 'upper', label: 'Upper Deck', layout: dd.upperLayout,
      capacity: upperCapacity, fuselageWidth: dd.upperWidth,
      showCockpit: dd.cockpitDeck === 'upper', minToilets: dd.minToiletsUpper || 2
    };
  }
  return {
    deck: 'main', label: 'Main Deck', layout: dd.mainLayout,
    capacity: mainCapacity, fuselageWidth: dd.mainWidth,
    showCockpit: dd.cockpitDeck === 'main', minToilets: dd.minToiletsMain || 4
  };
}

function seatsPerRow(aircraftType, cabinClass) {
  const layout = SEAT_LAYOUTS[aircraftType];
  if (!layout || !layout[cabinClass]) return 0;
  return layout[cabinClass].reduce((s, g) => s + g, 0);
}

// --- Schematic seat map renderer ---
// Pure airline-style seat map: clean rectangles, row numbers, seat letters.
// Horizontal layout: X = cabin length (nose-left), Y = cross-section (top-down).
function renderSeatMap(seatConfig, deckLayout, acType, svgId, toiletCount, midPosFractions, aircraft, barState, deckSpec) {
  if (!deckLayout) return null;

  const isUpperDeck = deckSpec && deckSpec.deck === 'upper';

  // Sizing constants
  const SEAT_ACROSS = 14;  // seat height in cross-section (Y)
  const SEAT_DEEP = 12;    // seat depth along cabin (X) — base for economy
  const SEAT_GAP = 2;      // gap between adjacent seats (Y)
  const SEAT_R = 2;        // corner radius
  const AISLE_GAP = 10;    // aisle width (Y)
  const ROW_GAP = 2;       // gap between rows (X)
  const CLASS_PITCH = { economy: 14, economyPlus: 17, business: 22, first: 30 };
  const SERVICE_DEPTH = 30; // galley/WC block along cabin (X)
  const SERVICE_SPACING = 3;
  const EXIT_DEPTH = 3;
  const MARGIN = { top: 12, left: 10, right: 10, bottom: 8 };
  const classOrder = ['first', 'business', 'economyPlus', 'economy'];

  // Build sections
  // Bar seat reduction: compute per-class
  const barDef_ = typeof CABIN_UPGRADES !== 'undefined' ? CABIN_UPGRADES.cocktailBar : null;
  function barRowsFor_(cls) {
    if (!barState || !barState[cls]) return 0;
    return (barDef_?.seatReduction?.[cls]) || 2;
  }

  const sections = [];
  for (const cls of classOrder) {
    const count = seatConfig[cls];
    if (!count || count <= 0) continue;
    const groups = deckLayout[cls];
    if (!groups) continue;
    const perRow = groups.reduce((s, g) => s + g, 0);
    // Keep full row count — bar rows are handled in the rendering loop
    const numRows = Math.ceil(count / perRow);
    const lastRowSeats = count - (numRows - 1) * perRow;
    sections.push({ cls, groups, perRow, numRows, lastRowSeats, pitch: CLASS_PITCH[cls] || 14 });
  }
  if (sections.length === 0) return null;

  // Cross-section height (Y): use largest abreast config
  const maxGroups = sections.reduce((best, s) => {
    const total = s.groups.reduce((a, b) => a + b, 0);
    return total > best.total ? { groups: s.groups, total } : best;
  }, { groups: sections[0].groups, total: 0 }).groups;
  const totalAcross = maxGroups.reduce((s, g) => s + g, 0);
  const numAisles = maxGroups.length - 1;
  const crossH = totalAcross * (SEAT_ACROSS + SEAT_GAP) - SEAT_GAP + numAisles * AISLE_GAP;

  // Toilet/service areas
  const isCompactLav = toiletCount === 1;
  const totalPairs = Math.floor(toiletCount / 2);
  const hasFront = !isCompactLav && toiletCount > 0;
  const hasRear = !isCompactLav && totalPairs >= 2;
  const midPairs = isCompactLav ? 0 : Math.max(0, totalPairs - 2);
  let midPos = midPosFractions ? [...midPosFractions] : [];
  while (midPos.length < midPairs) midPos.push((midPos.length + 1) / (midPairs + 1));
  if (midPos.length > midPairs) midPos.length = midPairs;

  // Total rows for mid-service positioning
  const allRows = [];
  for (const s of sections) for (let r = 0; r < s.numRows; r++) allRows.push(s);
  const totalRows = allRows.length;
  const midAtRow = {};
  for (let i = 0; i < midPairs; i++) {
    const frac = midPos[i] || (i + 1) / (midPairs + 1);
    const pos = Math.max(1, Math.min(totalRows - 1, Math.round(frac * totalRows)));
    if (!midAtRow[pos]) midAtRow[pos] = [];
    midAtRow[pos].push(i);
  }

  // Cache Y positions per class (needed before row X calculation)
  const seatYByClass = {};
  for (const s of sections) {
    if (!seatYByClass[s.cls]) seatYByClass[s.cls] = computeSeatYPositions(s.groups);
  }

  // Pre-calculate row X positions
  let cx = 0; // current X along cabin
  if (hasFront) cx += SERVICE_DEPTH + SERVICE_SPACING + 10;
  if (isCompactLav) cx += 20 + SERVICE_SPACING;

  const rowPositions = [];
  let gRow = 0;
  let prevSectionCls = null;
  for (const s of sections) {
    prevSectionCls = s.cls;
    for (let r = 0; r < s.numRows; r++) {
      if (midAtRow[gRow]) cx += SERVICE_DEPTH + SERVICE_SPACING + 2;
      rowPositions.push({ x: cx, s, row: r, cls: s.cls, pitch: s.pitch });
      cx += s.pitch + ROW_GAP;
      gRow++;
    }
    cx += 3; // class gap
  }

  // Combi: cargo block at the aft end of the main deck (after rear WC).
  // Only applies to main deck — upper deck on double-deckers is all-passenger.
  const isCombi = aircraft && aircraft.isCombi && aircraft.cargoCapacityKg > 0 && !isUpperDeck;
  const BULKHEAD_W = isCombi ? 4 : 0;
  const CARGO_BLOCK_W = isCombi ? Math.max(60, Math.round(cx * 0.30)) : 0;

  // Rear WC comes before cargo on combis (end of passenger cabin)
  if (hasRear || isCompactLav) cx += SERVICE_SPACING + SERVICE_DEPTH + 2;
  if (isCombi) cx += BULKHEAD_W + CARGO_BLOCK_W + 4;
  const cabinLen = cx;

  const contentW = MARGIN.left + cabinLen + MARGIN.right;

  // Extra vertical space for a universal aircraft silhouette
  const wingPad = Math.max(24, Math.min(78, crossH * 0.68));
  const svgH = MARGIN.top + wingPad + crossH + wingPad + MARGIN.bottom;

  // Lock the viewBox width to the maximum possible for this aircraft type
  const maxPerRow = maxGroups.reduce((s, g) => s + g, 0) || 6;
  const maxPossibleRows = Math.ceil((aircraft?.passengerCapacity || 300) / maxPerRow);
  const maxCabinLen = (hasFront ? SERVICE_DEPTH + SERVICE_SPACING + 10 : 0)
    + maxPossibleRows * (CLASS_PITCH.economy + ROW_GAP) + 20
    + (hasRear || isCompactLav ? SERVICE_SPACING + SERVICE_DEPTH + 2 : 0) + 10;
  const svgW = Math.max(contentW, MARGIN.left + maxCabinLen + MARGIN.right);

  // ── Precompute Y positions for each class ──────────────────────
  function computeSeatYPositions(groups) {
    const totalSeats = groups.reduce((a, b) => a + b, 0);
    const aisles = groups.length - 1;
    const totalAisleH = aisles * AISLE_GAP;
    const availableForSeats = crossH - totalAisleH - (totalSeats - 1) * SEAT_GAP;
    const seatH = Math.max(SEAT_ACROSS, availableForSeats / totalSeats);
    const positions = [];
    let y = 0;
    for (let gi = 0; gi < groups.length; gi++) {
      for (let gs = 0; gs < groups[gi]; gs++) {
        positions.push({ y, h: seatH });
        y += seatH + SEAT_GAP;
      }
      if (gi < groups.length - 1) y += AISLE_GAP - SEAT_GAP;
    }
    return positions;
  }

  // ── Universal aircraft silhouette dimensions ───────────────────
  const fuseWall = Math.max(5, Math.min(12, crossH * 0.07));
  const fuseH = crossH + fuseWall * 2;
  const noseLen = Math.max(34, Math.min(105, crossH * 0.72));
  const tailLen = Math.max(48, Math.min(145, crossH * 0.95));

  const actualW = MARGIN.left + cabinLen + MARGIN.right + noseLen + tailLen;
  const container = document.getElementById('cabinDiagramContainer');

  // Track the widest render so far — viewBox can grow but never shrink
  if (container) {
    if (!container._maxViewW || actualW > container._maxViewW) {
      container._maxViewW = actualW;
    }
  }
  const useW = container?._maxViewW || actualW;

  let html = `<svg viewBox="0 0 ${useW} ${svgH}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;max-height:55vh;" xmlns="http://www.w3.org/2000/svg">`;

  const ox = MARGIN.left + noseLen;
  const oy = MARGIN.top + wingPad;

  // ── Universal plane-like silhouette ─────────────────────────────
  const fuseX1 = ox - fuseWall;
  const fuseX2 = ox + cabinLen + fuseWall;
  const fuseCY = oy + crossH / 2;
  const fuseTop = fuseCY - fuseH / 2;
  const fuseBot = fuseCY + fuseH / 2;
  const noseX = fuseX1 - noseLen;
  const tailX = fuseX2 + tailLen;

  // Wing position and span (needed for wing-root shading even when hidden)
  const wingRootX = fuseX1 + Math.max(cabinLen * 0.50, Math.min(cabinLen * 0.62, cabinLen - 36));
  const wingChord = Math.max(30, Math.min(88, cabinLen * 0.18));
  const wingHalfSpan = Math.max(wingPad * 0.82, fuseH * 0.82);
  const wingTipX = wingRootX + wingChord * 0.55;

  // Tailplane
  const tailRootX = fuseX2 + tailLen * 0.42;
  const tailChord = Math.max(18, Math.min(46, tailLen * 0.30));
  const tailHalfSpan = Math.max(fuseH * 0.48, wingPad * 0.42);

  if (!isUpperDeck) {
    // Upper wing
    html += `<path d="M ${wingRootX - wingChord * 0.45} ${fuseCY - fuseH * 0.24} L ${wingTipX + wingChord * 0.22} ${fuseCY - wingHalfSpan} L ${wingTipX + wingChord * 0.55} ${fuseCY - wingHalfSpan * 0.94} L ${wingRootX + wingChord * 0.52} ${fuseCY - fuseH * 0.10} Z" fill="rgba(51,65,85,0.38)" stroke="rgba(148,163,184,0.16)" stroke-width="0.8"/>`;
    // Lower wing
    html += `<path d="M ${wingRootX - wingChord * 0.45} ${fuseCY + fuseH * 0.24} L ${wingTipX + wingChord * 0.22} ${fuseCY + wingHalfSpan} L ${wingTipX + wingChord * 0.55} ${fuseCY + wingHalfSpan * 0.94} L ${wingRootX + wingChord * 0.52} ${fuseCY + fuseH * 0.10} Z" fill="rgba(51,65,85,0.38)" stroke="rgba(148,163,184,0.16)" stroke-width="0.8"/>`;

    // Upper stabiliser
    html += `<path d="M ${tailRootX - tailChord * 0.35} ${fuseCY - fuseH * 0.16} L ${tailRootX + tailChord * 0.55} ${fuseCY - tailHalfSpan} L ${tailRootX + tailChord} ${fuseCY - tailHalfSpan * 0.86} L ${tailRootX + tailChord * 0.48} ${fuseCY - fuseH * 0.05} Z" fill="rgba(51,65,85,0.34)" stroke="rgba(148,163,184,0.14)" stroke-width="0.7"/>`;
    // Lower stabiliser
    html += `<path d="M ${tailRootX - tailChord * 0.35} ${fuseCY + fuseH * 0.16} L ${tailRootX + tailChord * 0.55} ${fuseCY + tailHalfSpan} L ${tailRootX + tailChord} ${fuseCY + tailHalfSpan * 0.86} L ${tailRootX + tailChord * 0.48} ${fuseCY + fuseH * 0.05} Z" fill="rgba(51,65,85,0.34)" stroke="rgba(148,163,184,0.14)" stroke-width="0.7"/>`;
  }

  // Fuselage body
  html += `<path d="M ${fuseX1} ${fuseTop} C ${fuseX1 - noseLen * 0.28} ${fuseTop}, ${noseX + noseLen * 0.22} ${fuseCY - fuseH * 0.22}, ${noseX} ${fuseCY} C ${noseX + noseLen * 0.22} ${fuseCY + fuseH * 0.22}, ${fuseX1 - noseLen * 0.28} ${fuseBot}, ${fuseX1} ${fuseBot} L ${fuseX2} ${fuseBot} C ${fuseX2 + tailLen * 0.18} ${fuseBot}, ${tailX - tailLen * 0.20} ${fuseCY + fuseH * 0.18}, ${tailX} ${fuseCY} C ${tailX - tailLen * 0.20} ${fuseCY - fuseH * 0.18}, ${fuseX2 + tailLen * 0.18} ${fuseTop}, ${fuseX2} ${fuseTop} Z" fill="rgba(15,23,35,0.76)" stroke="rgba(148,163,184,0.28)" stroke-width="1.2"/>`;

  // Inner floor
  html += `<rect x="${ox - 1}" y="${oy - 1}" width="${cabinLen + 2}" height="${crossH + 2}" rx="${Math.max(3, fuseWall * 0.45)}" fill="rgba(10,18,30,0.28)" stroke="rgba(148,163,184,0.10)" stroke-width="0.6"/>`;

  if (!isUpperDeck) {
    // Cockpit windows — two trapezoid panels per side, angling along the nose
    const cwX1 = noseX + noseLen * 0.35;  // front of window (toward nose)
    const cwX2 = noseX + noseLen * 0.60;  // middle divider
    const cwX3 = fuseX1 - noseLen * 0.05; // rear of window (toward cabin)
    const cwGap = fuseH * 0.04;           // gap from centreline

    // The fuselage narrows toward the nose, so windows are narrower at front
    const cwOuterFront = fuseH * 0.14;    // outer edge distance at front
    const cwOuterMid = fuseH * 0.22;      // outer edge distance at middle
    const cwOuterRear = fuseH * 0.28;     // outer edge distance at rear

    // Upper side: front window
    html += `<path d="M ${cwX1} ${fuseCY - cwGap - cwOuterFront * 0.3} L ${cwX2} ${fuseCY - cwGap - cwOuterMid} L ${cwX2} ${fuseCY - cwGap - cwOuterMid * 0.45} L ${cwX1} ${fuseCY - cwGap} Z" fill="rgba(96,165,250,0.22)" stroke="rgba(148,197,255,0.18)" stroke-width="0.5"/>`;
    // Upper side: rear window
    html += `<path d="M ${cwX2 + 1} ${fuseCY - cwGap - cwOuterMid} L ${cwX3} ${fuseCY - cwGap - cwOuterRear} L ${cwX3} ${fuseCY - cwGap - cwOuterRear * 0.5} L ${cwX2 + 1} ${fuseCY - cwGap - cwOuterMid * 0.45} Z" fill="rgba(96,165,250,0.22)" stroke="rgba(148,197,255,0.18)" stroke-width="0.5"/>`;

    // Lower side: front window
    html += `<path d="M ${cwX1} ${fuseCY + cwGap + cwOuterFront * 0.3} L ${cwX2} ${fuseCY + cwGap + cwOuterMid} L ${cwX2} ${fuseCY + cwGap + cwOuterMid * 0.45} L ${cwX1} ${fuseCY + cwGap} Z" fill="rgba(96,165,250,0.22)" stroke="rgba(148,197,255,0.18)" stroke-width="0.5"/>`;
    // Lower side: rear window
    html += `<path d="M ${cwX2 + 1} ${fuseCY + cwGap + cwOuterMid} L ${cwX3} ${fuseCY + cwGap + cwOuterRear} L ${cwX3} ${fuseCY + cwGap + cwOuterRear * 0.5} L ${cwX2 + 1} ${fuseCY + cwGap + cwOuterMid * 0.45} Z" fill="rgba(96,165,250,0.22)" stroke="rgba(148,197,255,0.18)" stroke-width="0.5"/>`;
  }

  // Centreline and wing-root shading
  html += `<line x1="${noseX + noseLen * 0.72}" y1="${fuseCY}" x2="${tailX - tailLen * 0.12}" y2="${fuseCY}" stroke="rgba(148,163,184,0.055)" stroke-width="0.8"/>`;
  if (!isUpperDeck) {
    html += `<rect x="${wingRootX - wingChord * 0.22}" y="${fuseTop + 1}" width="${wingChord * 0.72}" height="${fuseH - 2}" rx="3" fill="rgba(71,85,105,0.10)"/>`;
  }

  // ── Helper: draw a service block ────────────────────────────────
  function svcBlock(x, label) {
    html += `<rect x="${ox + x}" y="${oy}" width="${SERVICE_DEPTH}" height="${crossH}" rx="2" fill="rgba(71,85,105,0.3)" stroke="rgba(148,163,184,0.2)" stroke-width="0.8"/>`;
    html += `<text x="${ox + x + SERVICE_DEPTH/2}" y="${oy + crossH/2}" text-anchor="middle" dominant-baseline="central" fill="rgba(148,163,184,0.55)" font-size="8" font-weight="700" font-family="system-ui,sans-serif" letter-spacing="0.5">${label}</text>`;
  }

  function exitMark(x) {
    html += `<rect x="${ox + x}" y="${oy - 1}" width="${EXIT_DEPTH}" height="${crossH + 2}" fill="rgba(239,68,68,0.25)" rx="1"/>`;
  }

  // Front service
  if (hasFront) {
    svcBlock(0, 'GALLEY');
  }

  // ── Bar state (per class) ─────────────────────────────────────────
  const barClassRowIdx = { first: 0, business: 0 };
  const barDrawn = { first: false, business: false };

  // ── Draw seat rows ──────────────────────────────────────────────
  let rowNum = 1;
  let prevCls = null;
  gRow = 0;

  for (const rp of rowPositions) {
    const x = ox + rp.x;
    const cc = CLASS_COLORS[rp.cls];
    const s = rp.s;
    const isLast = rp.row === s.numRows - 1;
    const seatsThisRow = isLast ? s.lastRowSeats : s.perRow;

    // Mid service (draggable)
    if (midAtRow[gRow]) {
      const midIndices = midAtRow[gRow];
      const mx = rp.x - SERVICE_DEPTH - SERVICE_SPACING;
      svcBlock(mx, 'WC');
      // Drag handle for each mid-service area at this position
      for (const hidx of midIndices) {
        html += `<rect class="mid-drag-handle" data-mid-idx="${hidx}" x="${ox + mx}" y="${oy}" width="${SERVICE_DEPTH}" height="${crossH}" fill="rgba(148,163,184,0.0)" stroke="none" cursor="grab" pointer-events="all" style="touch-action:none;" onmouseover="this.setAttribute('fill','rgba(148,163,184,0.12)');this.setAttribute('stroke','rgba(148,163,184,0.4)');this.setAttribute('stroke-width','1')" onmouseout="this.setAttribute('fill','rgba(148,163,184,0.0)');this.setAttribute('stroke','none')"/>`;
      }
    }

    // Class divider + seat letters at start of each new class
    if (prevCls && rp.cls !== prevCls) {
      html += `<line x1="${x - 2}" y1="${oy - 3}" x2="${x - 2}" y2="${oy + crossH + 3}" stroke="rgba(148,163,184,0.15)" stroke-width="0.8" stroke-dasharray="2,2"/>`;
    }
    prevCls = rp.cls;

    // Track bar class row index
    const clsBarRows = barRowsFor_(rp.cls);
    const clsBarOffset = barState?.[rp.cls]?.rowOffset || 0;
    const clsRowIdx = barClassRowIdx[rp.cls] || 0;
    const isBarRow = clsBarRows > 0 && clsRowIdx >= clsBarOffset && clsRowIdx < clsBarOffset + clsBarRows;

    barClassRowIdx[rp.cls] = clsRowIdx + 1;

    // Row number above the fuselage outline
    if (!isBarRow || barClassRowIdx === 1) {
      html += `<text x="${x + rp.pitch / 2}" y="${fuseTop - 4}" text-anchor="middle" fill="rgba(148,163,184,0.4)" font-size="5.5" font-weight="600" font-family="system-ui,sans-serif">${isBarRow ? 'BAR' : rowNum}</text>`;
    }

    // Class colour pip
    html += `<rect x="${x}" y="${oy - 2}" width="${rp.pitch}" height="1.5" fill="${isBarRow ? '#f472b6' : cc.bg}" opacity="0.5" rx="0.5"/>`;

    if (isBarRow) {
      // ── Render bar block instead of seats ────────────────────────
      if (!barDrawn[rp.cls]) {
        const barWidth = clsBarRows * (rp.pitch + ROW_GAP) - ROW_GAP;
        const barColor = rp.cls === 'first' ? '#f59e0b' : '#a78bfa';
        const barColorDim = rp.cls === 'first' ? 'rgba(245,158,11,' : 'rgba(167,139,250,';
        const bx = x;
        const by = oy;
        const bw = barWidth;
        const bh = crossH;
        const bcx = bx + bw / 2;
        const bcy = by + bh / 2;
        const pad = 2;

        // Background
        html += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="3" fill="${barColorDim}0.10)"/>`;

        // Top sofa — long rounded rectangle along upper edge
        const sofaH = Math.max(6, bh * 0.14);
        html += `<rect x="${bx + pad}" y="${by + pad}" width="${bw - pad * 2}" height="${sofaH}" rx="3" fill="${barColorDim}0.30)" stroke="${barColorDim}0.20)" stroke-width="0.6"/>`;

        // Bottom sofa
        html += `<rect x="${bx + pad}" y="${by + bh - pad - sofaH}" width="${bw - pad * 2}" height="${sofaH}" rx="3" fill="${barColorDim}0.30)" stroke="${barColorDim}0.20)" stroke-width="0.6"/>`;

        // Counter bar in the centre — prominent
        const counterH = Math.max(5, bh * 0.08);
        html += `<rect x="${bx + pad + 2}" y="${bcy - counterH / 2}" width="${bw - pad * 2 - 4}" height="${counterH}" rx="2" fill="${barColorDim}0.45)" stroke="${barColorDim}0.25)" stroke-width="0.5"/>`;

        // Stools along counter — both sides
        const stoolCount = Math.min(6, Math.floor((bw - pad * 2 - 4) / 10));
        const stoolSpacing = (bw - pad * 2 - 4) / (stoolCount + 1);
        for (let si = 1; si <= stoolCount; si++) {
          const sx = bx + pad + 2 + si * stoolSpacing;
          html += `<circle cx="${sx}" cy="${bcy - counterH / 2 - 5}" r="2.5" fill="${barColorDim}0.25)" stroke="${barColorDim}0.15)" stroke-width="0.4"/>`;
          html += `<circle cx="${sx}" cy="${bcy + counterH / 2 + 5}" r="2.5" fill="${barColorDim}0.25)" stroke="${barColorDim}0.15)" stroke-width="0.4"/>`;
        }

        // Label
        html += `<text x="${bcx}" y="${bcy}" text-anchor="middle" dominant-baseline="central" fill="${barColor}" font-size="8" font-weight="700" font-family="system-ui,sans-serif" opacity="0.55" letter-spacing="2">BAR</text>`;

        // Outer border
        html += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="3" fill="none" stroke="${barColor}" stroke-width="0.8" opacity="0.4"/>`;

        // Drag handle (invisible interactive overlay)
        // Store the class row range so the drag system knows valid positions
        html += `<rect class="bar-drag-handle" x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="transparent" cursor="grab" pointer-events="all" style="touch-action:none;" data-bar-class="${rp.cls}" data-bar-rows="${clsBarRows}" onmouseover="this.style.outline='2px solid ${barColor}'" onmouseout="this.style.outline='none'"/>`;

        barDrawn[rp.cls] = true;
      }
      // Skip seat rendering for bar rows
    } else {
      // ── Normal seat row ────────────────────────────────────────
      const yPositions = seatYByClass[rp.cls] || [];
      for (let seatIdx = 0; seatIdx < yPositions.length; seatIdx++) {
        const sp = yPositions[seatIdx];
        const sy = oy + sp.y;
        const sh = sp.h;
        const empty = seatIdx >= seatsThisRow;
        html += `<rect x="${x + 0.5}" y="${sy + 0.5}" width="${rp.pitch - 1}" height="${sh - 1}" rx="${SEAT_R}" ` +
          `fill="${empty ? 'rgba(51,65,85,0.15)' : cc.bg}" ` +
          `stroke="${empty ? 'rgba(71,85,105,0.2)' : cc.border}" ` +
          `stroke-width="${empty ? 0.4 : 0.8}" ` +
          `opacity="${empty ? 0.25 : 0.85}"/>`;
      }
    }

    rowNum++;
    gRow++;
  }

  // Rear WC — placed at the end of the passenger cabin (before cargo on combis)
  let rearWcEndX = 0;
  if (hasRear || isCompactLav) {
    const lastRp = rowPositions[rowPositions.length - 1];
    const rx = lastRp ? lastRp.x + lastRp.pitch + 4 : cabinLen - SERVICE_DEPTH - 4;
    svcBlock(rx, 'WC');
    rearWcEndX = rx + SERVICE_DEPTH + 2;
  }

  // Combi: bulkhead + cargo block after the rear WC
  if (isCombi && CARGO_BLOCK_W > 0) {
    let bx = rearWcEndX || (rowPositions.length > 0 ? rowPositions[rowPositions.length - 1].x + rowPositions[rowPositions.length - 1].pitch + 4 : 0);
    // Bulkhead divider
    html += `<rect x="${ox + bx}" y="${oy - 3}" width="${BULKHEAD_W}" height="${crossH + 6}" rx="1" fill="rgba(100,116,139,0.45)" stroke="rgba(100,116,139,0.6)" stroke-width="0.5"/>`;
    html += `<text x="${ox + bx + BULKHEAD_W / 2}" y="${fuseTop - 4}" text-anchor="middle" fill="rgba(200,210,220,0.6)" font-size="5" font-weight="700" letter-spacing="1" font-family="system-ui,sans-serif">BULKHEAD</text>`;
    bx += BULKHEAD_W + 2;
    // Cargo area
    html += `<rect x="${ox + bx}" y="${oy}" width="${CARGO_BLOCK_W}" height="${crossH}" rx="3" fill="rgba(251,146,60,0.08)" stroke="rgba(251,146,60,0.4)" stroke-width="0.8" stroke-dasharray="4,2"/>`;
    html += `<text x="${ox + bx + CARGO_BLOCK_W / 2}" y="${oy + crossH / 2}" text-anchor="middle" dominant-baseline="central" fill="rgba(251,146,60,0.7)" font-size="8" font-weight="700" font-family="system-ui,sans-serif" letter-spacing="0.5">MAIN DECK CARGO</text>`;
  }


  // ── Metadata for drag compatibility ─────────────────────────────
  const startX = rowPositions.length > 0 ? rowPositions[0].x : 0;
  const endX = rowPositions.length > 0 ? rowPositions[rowPositions.length - 1].x + rowPositions[rowPositions.length - 1].pitch : cabinLen;
  html += `<rect class="seat-bounds-meta" data-start-y="${startX}" data-end-y="${endX}" data-total-rows="${totalRows}" width="0" height="0" visibility="hidden"/>`;

  html += '</svg>';
  return html;
}

// --- Shared fuselage SVG renderer (legacy/fallback) ---
// landscape: if true, renders nose-left horizontal orientation
function renderFuselage(seatConfig, deckLayout, fWidth, svgId, showCockpit = true, toiletCount = 0, cargoDeckPct = 0, landscape = false, midPosFractions = null, shape = 'plane', aircraft = null) {
  const isCapsule = shape === 'capsule';
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

  // Combi: cargo deck block at front + bulkhead divider. On the CABIN diagram the
  // cargo deck is decorative (freight is set in the cargo configurator), so keep
  // it compact rather than proportional — otherwise it wastes most of the cabin.
  const BULKHEAD_H = cargoDeckPct > 0 ? 9 : 0;
  const cargoBlockH = cargoDeckPct > 0
    ? Math.max(70, Math.round(seatContentH * 0.32))
    : 0;
  const totalH = seatContentH + cargoBlockH + BULKHEAD_H;

  // Fuselage shape — a streamlined plane silhouette, or a cylindrical capsule
  // (rounded both ends) for airship gondolas.
  const bodyW = fuseRight - fuseLeft;
  const noseH = isCapsule ? Math.round(bodyW * 0.5) : Math.round(bodyW * (isSmallAircraft ? 1.0 : 0.55));
  const tailH = isCapsule ? Math.round(bodyW * 0.5) : Math.round(bodyW * (isSmallAircraft ? 0.7 : 0.25));
  const svgH = noseH + totalH + tailH + 10;
  const gradId = svgId || 'fuselageGrad';
  const clipId = `fClip_${svgId || 'def'}`;
  const cx = fW / 2;
  const bodyEnd = svgH - tailH;

  // Capsule: semicircular caps + straight sides (cylinder viewed top-down).
  // Plane: cubic-bezier pointed nose + rounded tail cone.
  const capR = bodyW / 2;
  const fuselagePath = isCapsule
    ? `
    M ${fuseLeft} ${noseH}
    A ${capR} ${capR} 0 0 1 ${fuseRight} ${noseH}
    L ${fuseRight} ${bodyEnd}
    A ${capR} ${capR} 0 0 1 ${fuseLeft} ${bodyEnd}
    Z`
    : `
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
  // In landscape: fit to container width by default. Zoom controls adjust scale.
  const lsH = isSmallAircraft ? 200 : 320;
  const lsW = Math.round(lsH * (lsViewW / lsViewH));
  const lsStyle = landscape
    ? `width:100%;height:auto;flex-shrink:0;`
    : `width:100%;height:100%;`;

  // ── Check for hand-drawn aircraft visual ──────────────────────────
  const visual = (aircraft && typeof AircraftSilhouettes !== 'undefined')
    ? AircraftSilhouettes.resolve(aircraft) : null;

  let html = '';

  if (!visual) {
    // ── GENERIC RENDERER (no artwork) ─────────────────────────────────
    html = `
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
    if (landscape) html += `<g transform="translate(0,${fW}) rotate(-90)">`;
    html += `<path d="${fuselagePath}" fill="url(#${gradId})" stroke="rgba(100,116,139,0.35)" stroke-width="0.8"/>`;
  }

  // Helper: makes text readable in landscape mode by counter-rotating +90° around its anchor
  // (only used in generic mode; visual mode is already horizontal)
  const _tr = (landscape && !visual)
    ? (x, y) => ` transform="rotate(90,${x},${y})"`
    : () => '';

  // Cockpit area — simple darkened nose with label (like professional seatmaps)
  if (showCockpit && !visual) {
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
  let bulkheadLabelY = null; // pax/cargo divider Y; label drawn above the body after the clip closes
  html += visual
    ? `<g class="live-cabin-content">`
    : `<g clip-path="url(#${clipId})">`;

  const seatStartY = isCapsule ? noseH + 6 : (showCockpit ? noseH + 8 : noseH - 10);
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
                  fill="rgba(148,163,184,0.0)" stroke="none" cursor="grab" pointer-events="all" style="touch-action: none;"
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
    // Bulkhead divider bar first (label is drawn above the fuselage, after the clip)
    html += `<rect x="${seatLeft - 2}" y="${curY}" width="${seatWidth + 4}" height="${BULKHEAD_H}" rx="1"
               fill="rgba(100,116,139,0.4)" stroke="rgba(100,116,139,0.55)" stroke-width="0.5"/>`;
    bulkheadLabelY = curY + BULKHEAD_H/2 + 2;
    curY += BULKHEAD_H;
    // Cargo deck block
    html += `<rect x="${seatLeft}" y="${curY}" width="${seatWidth}" height="${cargoBlockH}" rx="3"
               fill="rgba(251,146,60,0.12)" stroke="rgba(251,146,60,0.5)" stroke-width="0.8" stroke-dasharray="4,2"/>`;
    const clabelY = curY + cargoBlockH / 2;
    html += `<text x="${fW/2}" y="${clabelY}" text-anchor="middle" dominant-baseline="central" fill="rgba(251,146,60,0.9)" font-size="8" font-weight="700" font-family="system-ui, sans-serif"${_tr(fW/2, clabelY)}>CARGO DECK</text>`;
  }

  // Seat letter labels at the start of each class section (like airline seatmaps)
  // Uses airline convention: A, B, C, D, E, F, G, H, J, K (skip I)
  if (landscape && !visual) {
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

  // BULKHEAD label above the aircraft, aligned with the pax/cargo divider line
  if (bulkheadLabelY !== null) {
    const _bhX = fuseRight + 4;
    html += `<text x="${_bhX}" y="${bulkheadLabelY}" text-anchor="middle" dominant-baseline="central" fill="rgba(200,210,220,0.75)" font-size="4.5" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif"${_tr(_bhX, bulkheadLabelY)}>BULKHEAD</text>`;
  }

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
  if (!visual) {
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
  }

  // Class section bracket labels (rendered outside the fuselage wall)
  if (landscape && !visual && classBrackets.length > 0) {
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

  if (visual) {
    // ── VISUAL RENDERER — combine artwork + cabin into one SVG ────────
    // The cabin content in `html` was built in portrait coords (nose at top).
    // We need to rotate it -90° and scale it into the visual's cabinBox.
    //
    // Portrait cabin bounds:
    //   X: seatLeft → seatRight (width = seatWidth)
    //   Y: noseH → noseH + totalH
    //
    // Visual cabinBox is horizontal (nose-left).
    // After rotating -90°: portrait Y becomes horizontal X, portrait X becomes vertical Y.
    // Rotated bounds: width = totalH (portrait height), height = seatWidth (portrait width).

    const cb = visual.cabinBox;

    /*
     * Map the ACTUAL generated cabin content bounds — not the full generic
     * SVG which includes invisible nose/tail padding.
     *
     * contentX1..X2 = usable cabin width (fuselage walls + door margin)
     * contentY1..Y2 = first service area to last rendered row (seatStartY → curY)
     *
     * After rotating -90°:
     *   portrait contentH → visual horizontal (cabinBox width)
     *   portrait contentW → visual vertical (cabinBox height)
     */
    const contentX1 = fuseLeft - 8;
    const contentX2 = fuseRight + 8;
    const contentY1 = seatStartY;
    const contentY2 = curY;

    const contentW = contentX2 - contentX1;
    const contentH = contentY2 - contentY1;

    const scaleHorizontal = cb.width / contentH;
    const scaleVertical = cb.height / contentW;

    const cabinTransform = [
      `translate(${cb.x} ${cb.y + cb.height})`,
      `scale(${scaleHorizontal.toFixed(6)} ${scaleVertical.toFixed(6)})`,
      `rotate(-90)`,
      `translate(${(-contentX1).toFixed(3)} ${(-contentY1).toFixed(3)})`
    ].join(' ');

    const vw = visual.viewBox.width;
    const vh = visual.viewBox.height;
    const visualClipId = clipId + '_vis';

    const combined = `
      <svg viewBox="0 0 ${vw} ${vh}" preserveAspectRatio="xMidYMid meet"
           style="width:100%;height:auto;flex-shrink:0;" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gradId}" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stop-color="rgba(100,116,139,0.15)"/>
            <stop offset="50%" stop-color="rgba(100,116,139,0.05)"/>
            <stop offset="100%" stop-color="rgba(100,116,139,0.15)"/>
          </linearGradient>
          <clipPath id="${visualClipId}">
            <path d="${visual.fuselagePath}"/>
          </clipPath>
        </defs>

        ${typeof AircraftSilhouettes !== 'undefined' ? AircraftSilhouettes.getStyles() : ''}

        <g class="aircraft-rear" pointer-events="none">${visual.rearArtwork || ''}</g>

        <g class="aircraft-body" pointer-events="none">${visual.bodyArtwork || ''}</g>

        <g clip-path="url(#${visualClipId})">
          <g transform="${cabinTransform}">
            ${html}
          </g>
        </g>

        <g class="aircraft-front" pointer-events="none">${visual.frontArtwork || ''}</g>
      </svg>
    `;
    return combined;
  }

  // ── Generic fallback — close SVG ────────────────────────────────────
  if (landscape) html += `</g>`;
  html += `</svg>`;

  return html;
}


// ======================================================================
// Refit confirmation modal — shown over the cabin configurator overlay
// ======================================================================
function _ccMoney(v) {
  return typeof formatCurrency === 'function' ? formatCurrency(v) : '$' + Math.round(v).toLocaleString('en-US');
}

function _showCabinUpgradePanel(parentOverlay, cls, upgrades, config, gameYear, acType, aircraft, scopeFilter, onChanged, barAccessor) {
  // barAccessor: { get: () => barState, set: (v) => { barState = v; } } or null
  if (typeof getAvailableUpgrades !== 'function') return;

  const isSeatScope = scopeFilter === 'seat';
  const panelTitle = isSeatScope ? 'Seat Upgrades' : 'Aircraft Upgrades';

  // For seat upgrades, show era-unlocked classes (even with 0 seats — but disabled)
  // For aircraft upgrades, just use 'economy' as the class filter (they apply to all)
  const eraGate = { business: 1978, economyPlus: 1992 };
  const allClasses = ['first', 'business', 'economyPlus', 'economy']
    .filter(c => !eraGate[c] || gameYear >= eraGate[c]);
  const classesToShow = isSeatScope ? allClasses : ['economy'];

  const eraMult = typeof eraEconomicService !== 'undefined' ? eraEconomicService.getEraMultiplier(gameYear) : 0.1;

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10001;display:flex;justify-content:center;align-items:center;padding:1rem;';

  const classLabels = { first: 'First Class', business: 'Business', economyPlus: 'Economy Plus', economy: 'Economy' };
  const CLASS_COLORS_MAP = { first: '#f59e0b', business: '#a78bfa', economyPlus: '#34d399', economy: '#10b981' };

  // Build upgrade rows — for seat upgrades, group by class; for aircraft, flat list
  let listHtml = '';
  const allUpgradesByKey = {}; // track which class each upgrade targets

  if (isSeatScope) {
    // Landscape grid: generic upgrade names as rows, classes as columns
    // Collect all unique upgrade base keys across all classes
    const allUpgrades = [];
    const upgradeSeen = new Set();
    for (const c of classesToShow) {
      for (const upg of getAvailableUpgrades(c, gameYear, acType, 'seat')) {
        if (!upgradeSeen.has(upg.key)) { upgradeSeen.add(upg.key); allUpgrades.push(upg); }
      }
    }

    // Generic upgrade names (base definition, not class-specific)
    const BASE_NAMES = {
      reclinerSeats: 'Seat Recline', extraLegroom: 'Extra Legroom',
      personalIFE: 'In-Flight Entertainment', laptopPower: 'Laptop Power',
      acPower: 'AC Power', usbCharging: 'USB-A Charging', usbC: 'USB-C Charging',
      seatbackPhone: 'Seat Telephone'
    };

    // Header row
    listHtml += `<div style="display:grid;grid-template-columns:1.8fr ${classesToShow.map(() => '1fr').join(' ')};gap:1px;margin-bottom:2px;position:sticky;top:0;background:var(--surface);z-index:1;">`;
    listHtml += `<div style="padding:0.4rem 0.5rem;font-size:0.6rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Upgrade</div>`;
    for (const c of classesToShow) {
      const seatCount = config[c] || 0;
      const color = CLASS_COLORS_MAP[c];
      listHtml += `<div style="padding:0.4rem 0.3rem;text-align:center;border-bottom:2px solid ${color};">
        <div style="font-size:0.7rem;font-weight:700;color:${color};">${classLabels[c]}</div>
        <div style="font-size:0.55rem;color:var(--text-muted);">${seatCount} seats</div>
      </div>`;
    }
    listHtml += '</div>';

    // Upgrade rows
    for (const upg of allUpgrades) {
      const isObsolete = upg.eraObsolete && gameYear > upg.eraObsolete;
      const baseName = BASE_NAMES[upg.key] || upg.name;

      listHtml += `<div style="display:grid;grid-template-columns:1.8fr ${classesToShow.map(() => '1fr').join(' ')};gap:1px;border-bottom:1px solid rgba(148,163,184,0.08);align-items:center;">`;

      // Generic upgrade name
      listHtml += `<div style="padding:0.4rem 0.5rem;${isObsolete ? 'opacity:0.45;' : ''}">
        <div style="font-size:0.75rem;font-weight:600;color:var(--text-primary);">${baseName}${isObsolete ? ' <span style="font-size:0.5rem;color:#f59e0b;">(old)</span>' : ''}</div>
      </div>`;

      // Per-class cells
      for (const c of classesToShow) {
        const classUpg = getAvailableUpgrades(c, gameYear, acType, 'seat').find(u => u.key === upg.key);
        if (!classUpg) {
          listHtml += `<div style="padding:0.3rem;text-align:center;opacity:0.15;font-size:0.6rem;color:var(--text-muted);">—</div>`;
          continue;
        }
        const seatCount = config[c] || 0;
        const noSeats = seatCount === 0;
        const installed = (upgrades[c] || []).includes(upg.key);
        const perSeatCost = Math.round((classUpg.costPerSeat2024 || 0) * eraMult);
        const totalCost = perSeatCost * seatCount;
        const disabled = noSeats;
        const color = CLASS_COLORS_MAP[c];
        const cellId = `upg_${upg.key}_${c}`;

        listHtml += `<div id="${cellId}" class="upgrade-cell" data-key="${upg.key}" data-cls="${c}" data-installed="${installed ? '1' : '0'}" data-disabled="${disabled ? '1' : '0'}" data-color="${color}" data-per-seat="${perSeatCost}" data-seats="${seatCount}" style="padding:0.3rem;text-align:center;cursor:${disabled ? 'not-allowed' : 'pointer'};${disabled ? 'opacity:0.25;' : ''}border-radius:4px;transition:background 0.15s;">
          <div class="upg-check" style="width:22px;height:22px;border-radius:5px;border:2px solid ${installed ? color : 'rgba(148,163,184,0.25)'};background:${installed ? color : 'transparent'};display:inline-flex;align-items:center;justify-content:center;transition:all 0.15s;">
            ${installed ? '<svg width="14" height="14" viewBox="0 0 12 12"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/></svg>' : ''}
          </div>
          <div style="font-size:0.6rem;font-weight:600;color:var(--text-secondary);margin-top:0.15rem;">$${perSeatCost.toLocaleString('en-US')}/seat</div>
          ${seatCount > 0 ? `<div style="font-size:0.5rem;color:var(--text-muted);">$${totalCost.toLocaleString('en-US')} total</div>` : ''}
        </div>`;
      }
      listHtml += '</div>';
    }

    // Total cost summary
    listHtml += `<div id="upgradeTotalCost" style="padding:0.6rem 0.5rem;border-top:2px solid var(--border-color);margin-top:0.3rem;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:0.75rem;font-weight:600;color:var(--text-muted);">TOTAL UPGRADE COST</span>
      <span id="upgradeTotalAmount" style="font-size:0.9rem;font-weight:700;color:var(--accent-color);">$0</span>
    </div>`;
  } else {
    // Aircraft-wide: gather from ALL classes to catch class-restricted items like the bar
    const seen = new Set();
    const available = [];
    for (const c of ['economy', 'economyPlus', 'business', 'first']) {
      for (const upg of getAvailableUpgrades(c, gameYear, acType, 'aircraft')) {
        if (!seen.has(upg.key)) { seen.add(upg.key); available.push(upg); }
      }
    }
    const installed = new Set(upgrades._aircraft || []);
    const catGroups = {};
    for (const upg of available) { const cat = upg.category || 'other'; if (!catGroups[cat]) catGroups[cat] = []; catGroups[cat].push(upg); }
    const categories = typeof UPGRADE_CATEGORIES !== 'undefined' ? UPGRADE_CATEGORIES : [];
    for (const cat of categories) {
      const items = catGroups[cat.key];
      if (!items || items.length === 0) continue;
      listHtml += `<div style="margin-bottom:0.5rem;">
        <div style="font-size:0.6rem;font-weight:700;color:${cat.color};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.3rem;">${cat.label}</div>`;
      for (const upg of items) {
        allUpgradesByKey[upg.key] = '_aircraft';
        const isObsolete = upg.eraObsolete && gameYear > upg.eraObsolete;
        const lumpCost = Math.round((upg.lumpCost2024 || 0) * eraMult);

        // Special handling for cocktail bar
        if (upg.key === 'cocktailBar') {
          const _bars = barAccessor ? barAccessor.get() : null;
          const barDef = upg.seatReduction || {};
          const fRows = barDef.first || 2;
          const bRows = barDef.business || 3;
          // Get seats-per-row from standard layouts
          const stdLayout = typeof CABIN_LAYOUTS !== 'undefined' ? CABIN_LAYOUTS[acType] : null;
          const fPerRow = stdLayout?.first ? stdLayout.first.reduce((a, b) => a + b, 0) : (acType === 'Widebody' ? 4 : 2);
          const bPerRow = stdLayout?.business ? stdLayout.business.reduce((a, b) => a + b, 0) : (acType === 'Widebody' ? 4 : 4);
          const fMinSeats = (fRows + 1) * fPerRow;
          const bMinSeats = (bRows + 1) * bPerRow;
          const hasFirst = (config.first || 0) >= fMinSeats;
          const hasBusiness = (config.business || 0) >= bMinSeats;
          const canHaveBar = hasFirst || hasBusiness;
          const fBarOn = !!(_bars && _bars.first);
          const bBarOn = !!(_bars && _bars.business);
          const fDisabled = !hasFirst;
          const bDisabled = !hasBusiness;
          listHtml += `
            <div style="padding:0.4rem 0.5rem;border-radius:4px;border:1px solid var(--border-color);margin-bottom:0.3rem;">
              <div style="font-size:0.75rem;font-weight:600;color:var(--text-primary);margin-bottom:0.3rem;">${upg.name}</div>
              <div style="font-size:0.55rem;color:var(--text-muted);margin-bottom:0.4rem;">${upg.description || ''} · $${lumpCost.toLocaleString('en-US')} each · +${upg.yieldPct}% yield · +${upg.loadFactorPct}% LF</div>
              <div style="display:flex;gap:0.4rem;">
                <label style="flex:1;display:flex;align-items:center;gap:0.4rem;padding:0.3rem 0.5rem;border-radius:4px;border:1px solid ${fBarOn ? '#f59e0b' : 'var(--border-color)'};background:${fBarOn ? 'rgba(245,158,11,0.12)' : 'var(--surface)'};cursor:${fDisabled ? 'not-allowed' : 'pointer'};${fDisabled ? 'opacity:0.35;' : ''}">
                  <input type="checkbox" class="bar-toggle" data-bar-class="first" ${fBarOn ? 'checked' : ''} ${fDisabled ? 'disabled' : ''} style="flex-shrink:0;width:13px;height:13px;"/>
                  <div>
                    <div style="font-size:0.65rem;font-weight:600;color:${fDisabled ? 'var(--text-muted)' : '#f59e0b'};">First Class Bar</div>
                    <div style="font-size:0.5rem;color:var(--text-muted);">${fDisabled ? 'Need ' + fMinSeats + '+ seats' : 'Replaces ' + fRows + ' rows (' + fRows * fPerRow + ' seats)'}</div>
                  </div>
                </label>
                <label style="flex:1;display:flex;align-items:center;gap:0.4rem;padding:0.3rem 0.5rem;border-radius:4px;border:1px solid ${bBarOn ? '#a78bfa' : 'var(--border-color)'};background:${bBarOn ? 'rgba(139,92,246,0.12)' : 'var(--surface)'};cursor:${bDisabled ? 'not-allowed' : 'pointer'};${bDisabled ? 'opacity:0.35;' : ''}">
                  <input type="checkbox" class="bar-toggle" data-bar-class="business" ${bBarOn ? 'checked' : ''} ${bDisabled ? 'disabled' : ''} style="flex-shrink:0;width:13px;height:13px;"/>
                  <div>
                    <div style="font-size:0.65rem;font-weight:600;color:${bDisabled ? 'var(--text-muted)' : '#a78bfa'};">Business Bar</div>
                    <div style="font-size:0.5rem;color:var(--text-muted);">${bDisabled ? 'Need ' + bMinSeats + '+ seats' : 'Replaces ' + bRows + ' rows (' + bRows * bPerRow + ' seats)'}</div>
                  </div>
                </label>
              </div>
            </div>`;
          continue; // skip the generic template below
        }

        const isInstalled = installed.has(upg.key);
        listHtml += `
          <label style="display:flex;align-items:center;gap:0.5rem;padding:0.3rem 0.5rem;border-radius:4px;cursor:pointer;${isObsolete ? 'opacity:0.5;' : ''}" class="upgrade-row">
            <input type="checkbox" data-key="${upg.key}" data-cls="_aircraft" ${isInstalled ? 'checked' : ''} style="flex-shrink:0;width:14px;height:14px;" />
            <div style="flex:1;min-width:0;">
              <div style="font-size:0.75rem;font-weight:600;color:var(--text-primary);">${upg.name}${isObsolete ? ' <span style="font-size:0.55rem;color:#f59e0b;">(outdated)</span>' : ''}</div>
              <div style="font-size:0.55rem;color:var(--text-muted);">${upg.description || ''}</div>
            </div>
            <div style="text-align:right;flex-shrink:0;">
              <div style="font-size:0.65rem;color:var(--text-secondary);font-weight:600;">$${lumpCost.toLocaleString('en-US')}</div>
              <div style="font-size:0.5rem;color:var(--text-muted);">+${upg.yieldPct}% yield · +${upg.loadFactorPct}% LF</div>
            </div>
          </label>`;
      }
      listHtml += '</div>';
    }
  }

  modal.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border-color);border-radius:8px;width:${isSeatScope ? '780px' : '440px'};max-width:95vw;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.4);">
      <div style="padding:0.75rem 1rem;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;">
        <div style="font-weight:700;font-size:0.9rem;color:var(--text-primary);">${panelTitle}</div>
        <button id="upgradeCloseBtn" style="background:none;border:none;color:var(--text-muted);font-size:1.3rem;cursor:pointer;padding:0;line-height:1;">&times;</button>
      </div>
      <div style="flex:1;overflow-y:auto;padding:0.75rem 1rem;">
        ${listHtml || '<div style="color:var(--text-muted);font-size:0.8rem;">No upgrades available for this era.</div>'}
      </div>
      <div style="padding:0.5rem 1rem;border-top:1px solid var(--border-color);text-align:right;">
        <button id="upgradeDoneBtn" class="btn btn-primary" style="padding:0.4rem 1rem;font-size:0.8rem;">Done</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Handle upgrade cell clicks + standard checkboxes
  function updateCellVisual(cell, on) {
    const check = cell.querySelector('.upg-check');
    const color = cell.dataset.color || '#10b981';
    if (check) {
      check.style.borderColor = on ? color : 'rgba(148,163,184,0.25)';
      check.style.background = on ? color : 'transparent';
      check.innerHTML = on ? '<svg width="14" height="14" viewBox="0 0 12 12"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/></svg>' : '';
    }
    cell.dataset.installed = on ? '1' : '0';
  }

  function updateTotalCost() {
    const el = modal.querySelector('#upgradeTotalAmount');
    if (!el) return;
    let total = 0;
    modal.querySelectorAll('.upgrade-cell[data-installed="1"]').forEach(cell => {
      total += (parseInt(cell.dataset.perSeat) || 0) * (parseInt(cell.dataset.seats) || 0);
    });
    el.textContent = '$' + total.toLocaleString('en-US');
  }

  // Cell click handler (for seat upgrade grid)
  modal.querySelectorAll('.upgrade-cell').forEach(cell => {
    cell.addEventListener('click', () => {
      if (cell.dataset.disabled === '1') return;
      const key = cell.dataset.key;
      const targetCls = cell.dataset.cls;
      if (!key || !targetCls) return;
      if (!upgrades[targetCls]) upgrades[targetCls] = [];

      const isOn = cell.dataset.installed === '1';
      const def = typeof CABIN_UPGRADES !== 'undefined' ? CABIN_UPGRADES[key] : null;

      if (!isOn) {
        // Toggle ON
        if (!upgrades[targetCls].includes(key)) upgrades[targetCls].push(key);
        // Handle replaces
        if (def?.replaces && upgrades[targetCls].includes(def.replaces)) {
          upgrades[targetCls] = upgrades[targetCls].filter(k => k !== def.replaces);
          const replacedCell = modal.querySelector(`.upgrade-cell[data-key="${def.replaces}"][data-cls="${targetCls}"]`);
          if (replacedCell) updateCellVisual(replacedCell, false);
        }
        updateCellVisual(cell, true);
      } else {
        // Toggle OFF
        upgrades[targetCls] = upgrades[targetCls].filter(k => k !== key);
        updateCellVisual(cell, false);
      }
      updateTotalCost();
    });

    // Hover: floating tooltip with class-specific details
    cell.addEventListener('mouseenter', () => {
      if (cell.dataset.disabled !== '1') cell.style.background = 'rgba(148,163,184,0.06)';
      const key = cell.dataset.key;
      const c = cell.dataset.cls;
      if (!key || !c) return;
      const classUpg = getAvailableUpgrades(c, gameYear, acType, 'seat').find(u => u.key === key);
      if (!classUpg) return;
      let tip = document.getElementById('upgTooltip');
      if (!tip) {
        tip = document.createElement('div');
        tip.id = 'upgTooltip';
        tip.style.cssText = 'position:fixed;z-index:10010;background:var(--surface-elevated);border:1px solid var(--border-color);border-radius:6px;padding:0.5rem 0.65rem;box-shadow:0 4px 16px rgba(0,0,0,0.4);pointer-events:none;max-width:220px;';
        document.body.appendChild(tip);
      }
      const color = CLASS_COLORS_MAP[c] || '#ccc';
      const perSeat = parseInt(cell.dataset.perSeat) || 0;
      const seats = parseInt(cell.dataset.seats) || 0;
      tip.innerHTML = `<div style="font-size:0.8rem;font-weight:700;color:${color};margin-bottom:0.25rem;">${classUpg.name}</div>` +
        `<div style="font-size:0.65rem;color:var(--text-secondary);line-height:1.35;margin-bottom:0.35rem;">${classUpg.description || ''}</div>` +
        `<div style="display:flex;gap:0.6rem;font-size:0.65rem;margin-bottom:0.2rem;">` +
          `<span style="color:#34d399;">&#9650; ${classUpg.yieldPct}% revenue</span>` +
          `<span style="color:#60a5fa;">&#9650; ${classUpg.loadFactorPct}% load factor</span>` +
        `</div>` +
        (seats > 0 ? `<div style="font-size:0.6rem;color:var(--text-muted);border-top:1px solid var(--border-color);padding-top:0.25rem;">${seats} seats × $${perSeat.toLocaleString('en-US')} = <strong style="color:var(--text-primary);">$${(perSeat * seats).toLocaleString('en-US')}</strong></div>` : '');
      const rect = cell.getBoundingClientRect();
      tip.style.left = Math.min(rect.left, window.innerWidth - 230) + 'px';
      tip.style.top = (rect.bottom + 6) + 'px';
      tip.style.display = 'block';
    });
    cell.addEventListener('mouseleave', () => {
      cell.style.background = '';
      const tip = document.getElementById('upgTooltip');
      if (tip) tip.style.display = 'none';
    });
  });

  // Standard checkbox handler (for aircraft upgrades)
  modal.querySelectorAll('input[type="checkbox"][data-key]').forEach(cb => {
    cb.addEventListener('change', () => {
      const key = cb.dataset.key;
      const targetCls = cb.dataset.cls || cls;
      if (!upgrades[targetCls]) upgrades[targetCls] = [];
      const def = typeof CABIN_UPGRADES !== 'undefined' ? CABIN_UPGRADES[key] : null;
      if (cb.checked) {
        if (!upgrades[targetCls].includes(key)) upgrades[targetCls].push(key);
        if (def?.replaces && upgrades[targetCls].includes(def.replaces)) {
          upgrades[targetCls] = upgrades[targetCls].filter(k => k !== def.replaces);
          const rcb = modal.querySelector(`input[data-key="${def.replaces}"][data-cls="${targetCls}"]`);
          if (rcb) rcb.checked = false;
        }
      } else {
        upgrades[targetCls] = upgrades[targetCls].filter(k => k !== key);
      }
    });
  });

  // Initial total
  updateTotalCost();

  // Bar toggles — independent per class
  modal.querySelectorAll('.bar-toggle').forEach(cb => {
    cb.addEventListener('change', () => {
      if (!barAccessor) return;
      const cls = cb.dataset.barClass;
      let cur = barAccessor.get() || {};
      if (cb.checked) {
        cur[cls] = { rowOffset: 0 };
      } else {
        delete cur[cls];
        if (!cur.first && !cur.business) cur = null;
      }
      barAccessor.set(cur);
    });
  });

  const close = () => { const tip = document.getElementById('upgTooltip'); if (tip) tip.remove(); document.body.removeChild(modal); onChanged(); };
  modal.querySelector('#upgradeCloseBtn').addEventListener('click', close);
  modal.querySelector('#upgradeDoneBtn').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
}

function _showLayoutNameModal(parentOverlay, onConfirm) {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10001;display:flex;justify-content:center;align-items:center;padding:1rem;';
  modal.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border-color);border-radius:8px;padding:1.25rem;width:320px;box-shadow:0 8px 32px rgba(0,0,0,0.4);">
      <div style="font-weight:700;font-size:0.95rem;color:var(--text-primary);margin-bottom:0.75rem;">Save Layout</div>
      <input id="layoutNameInput" type="text" maxlength="20" placeholder="e.g. 3-Class Premium"
        style="width:100%;padding:0.5rem;background:var(--surface-elevated);border:1px solid var(--border-color);border-radius:4px;color:var(--text-primary);font-size:0.85rem;box-sizing:border-box;" />
      <div style="display:flex;gap:0.5rem;margin-top:0.75rem;justify-content:flex-end;">
        <button id="layoutNameCancel" class="btn btn-secondary" style="padding:0.4rem 1rem;font-size:0.8rem;">Cancel</button>
        <button id="layoutNameSave" class="btn btn-primary" style="padding:0.4rem 1rem;font-size:0.8rem;">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const input = document.getElementById('layoutNameInput');
  input.focus();
  const doSave = () => {
    const name = input.value.trim();
    if (!name) { input.style.borderColor = '#ef4444'; return; }
    document.body.removeChild(modal);
    onConfirm(name);
  };
  document.getElementById('layoutNameSave').addEventListener('click', doSave);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSave(); });
  document.getElementById('layoutNameCancel').addEventListener('click', () => document.body.removeChild(modal));
  modal.addEventListener('click', (e) => { if (e.target === modal) document.body.removeChild(modal); });
}

function _showRefitConfirmModal(configuratorOverlay, confirmInfo, onApply, result, refitCost) {
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
        ${refitCost != null ? (refitCost > 0 ? `
        <p style="margin:0 0 0.75rem 0;color:var(--text-secondary);font-size:0.85rem;line-height:1.5;">
          Cabin outfitting for new seats: <strong style="color:#f59e0b;">${_ccMoney(refitCost)}</strong> — charged when the refit begins.
        </p>` : `
        <p style="margin:0 0 0.75rem 0;color:var(--text-muted);font-size:0.8rem;line-height:1.5;">
          No outfitting cost — no seats are being added.
        </p>`) : ''}
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

  // deckSpec: render a SINGLE deck of a double-deck aircraft (upper or main)
  // rather than the combined two-deck view. Provided by the marketplace's
  // per-deck "Configure Upper/Lower Deck Cabin" buttons.
  const deckSpec = options && options.deckSpec;

  const ddConfig = getDoubleDeckConfig(aircraft);
  if (ddConfig && !deckSpec) {
    showDoubleDeckConfigurator(aircraft, ddConfig, onApply, existingConfig, options);
    return;
  }

  const acType = aircraft.type;

  // Airships get a capacity-scaled gondola cabin and a cylindrical (capsule)
  // fuselage rather than a plane silhouette.
  const isAirship = acType === 'Airship';
  const airshipCabin = (isAirship && !deckSpec) ? getAirshipCabin(aircraft) : null;

  // Resolve the cabin cross-section. Precedence: airship gondola → real per-ICAO
  // data → blanket small-aircraft fallback → widebody name override → type default.
  const acStr = `${aircraft.manufacturer || ''} ${aircraft.model || ''} ${aircraft.icaoCode || ''}`;
  const icaoCabin = (!deckSpec && !airshipCabin) ? getIcaoCabin(aircraft.icaoCode) : null;
  const smallOverride = (!deckSpec && !airshipCabin && !icaoCabin)
    ? getSmallAircraftOverride(aircraft.passengerCapacity, SEAT_LAYOUTS[acType]) : null;
  const wbOverride = (!deckSpec && !airshipCabin && !icaoCabin && !smallOverride && acType === 'Widebody')
    ? WIDEBODY_OVERRIDES.find(o => o.match.test(acStr)) : null;
  const layouts = deckSpec ? deckSpec.layout
    : (airshipCabin ? airshipCabin.layout
      : (icaoCabin ? icaoCabin.layout
        : (smallOverride ? smallOverride.layout
          : (wbOverride ? wbOverride.layout : SEAT_LAYOUTS[acType]))));

  function classPerRow(cls) {
    return layouts[cls] ? layouts[cls].reduce((s, g) => s + g, 0) : 0;
  }

  const econPerRow = classPerRow('economy');
  // For a single deck, budget by that deck's capacity rather than the whole aircraft.
  const deckCapacity = deckSpec ? deckSpec.capacity : aircraft.passengerCapacity;
  const totalSpace = deckCapacity / econPerRow;

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

  // Toilet state (scoped to the deck's own capacity + minimum when single-deck)
  const toiletInfo = _toiletDefaults(deckCapacity);
  if (deckSpec && deckSpec.minToilets != null) {
    toiletInfo.min = Math.max(0, deckSpec.minToilets);
    if (toiletInfo.default < toiletInfo.min) toiletInfo.default = toiletInfo.min;
    if (toiletInfo.max < toiletInfo.min) toiletInfo.max = toiletInfo.min;
  }
  let toilets = existingConfig?.toilets != null ? existingConfig.toilets : toiletInfo.default;
  toilets = Math.max(toiletInfo.min, Math.min(toiletInfo.max, toilets));

  // Mid-cabin service area positions (fractional 0–1, front to rear)
  let midPositions = existingConfig?.midPositions ? [...existingConfig.midPositions] : [];

  // ── Cabin upgrades state ─────────────────────────────────────────
  const upgrades = {
    first: [...(existingConfig?.cabinUpgrades?.first || [])],
    business: [...(existingConfig?.cabinUpgrades?.business || [])],
    economyPlus: [...(existingConfig?.cabinUpgrades?.economyPlus || [])],
    economy: [...(existingConfig?.cabinUpgrades?.economy || [])],
    _aircraft: [...(existingConfig?.cabinUpgrades?._aircraft || [])]
  };
  const gameYear = (() => {
    try {
      const wt = typeof window !== 'undefined' && typeof window.getGlobalWorldTime === 'function' ? window.getGlobalWorldTime() : null;
      return wt ? wt.getFullYear() : new Date().getFullYear();
    } catch (_) { return new Date().getFullYear(); }
  })();
  // Bar state: { first: { rowOffset: 0 }, business: { rowOffset: 0 } } or null
  // Each key present = that class has a bar installed
  let barState = existingConfig?.cabinUpgrades?._bar || null;
  // Migrate old single-class format
  if (barState && barState.class) {
    const old = barState;
    barState = { [old.class]: { rowOffset: old.rowOffset || 0 } };
  }

  function barRowsForClass(cls) {
    if (!barState || !barState[cls]) return 0;
    const barDef = typeof CABIN_UPGRADES !== 'undefined' ? CABIN_UPGRADES.cocktailBar : null;
    if (!barDef?.seatReduction) return 0;
    return barDef.seatReduction[cls] || 0;
  }

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

  // Economy auto-fills the space premium classes leave over — but the user can
  // cap it below that (down to 0, e.g. an all-First cabin) with the − button;
  // freed space simply stays empty. null = pure auto-fill.
  let econCapOverride = null;
  let autoEconomy = 0;

  function barSeatsConsumed(cls) {
    const rows = barRowsForClass(cls);
    if (rows <= 0) return 0;
    return rows * (classPerRow(cls) || 0);
  }

  function recalcEconomy() {
    validateBar();
    const usedSpace = calcSpaceUsed(config.first, 'first')
                    + calcSpaceUsed(config.business, 'business')
                    + calcSpaceUsed(config.economyPlus, 'economyPlus')
                    + midToiletRows() * PITCH.economy;
    const remainingSpace = Math.max(0, totalSpace - usedSpace);
    autoEconomy = Math.floor(remainingSpace) * econPerRow;
    if (econCapOverride != null && econCapOverride >= autoEconomy) econCapOverride = null;
    config.economy = econCapOverride != null
      ? Math.min(autoEconomy, Math.max(0, econCapOverride))
      : autoEconomy;
  }

  // Auto-remove bar if the class no longer has enough seats
  function validateBar() {
    if (!barState) return;
    const barDef = typeof CABIN_UPGRADES !== 'undefined' ? CABIN_UPGRADES.cocktailBar : null;
    for (const cls of ['first', 'business']) {
      if (!barState[cls]) continue;
      const perRow = classPerRow(cls);
      const barRows = (barDef?.seatReduction?.[cls]) || 2;
      const minSeats = (barRows + 1) * perRow;
      if ((config[cls] || 0) < minSeats) {
        delete barState[cls];
      } else {
        // Clamp rowOffset so bar doesn't extend past the class section
        const totalClassRows = Math.ceil((config[cls] || 0) / perRow);
        const maxOffset = Math.max(0, totalClassRows - barRows);
        if ((barState[cls].rowOffset || 0) > maxOffset) {
          barState[cls].rowOffset = maxOffset;
        }
      }
    }
    if (!barState.first && !barState.business) barState = null;
  }

  // Net seats after bar deduction (for display and Apply result)
  function netSeats(cls) {
    return Math.max(0, (config[cls] || 0) - barSeatsConsumed(cls));
  }

  function calcSpaceUsed(seatCount, cabinClass) {
    const perRow = classPerRow(cabinClass);
    if (perRow === 0 && seatCount === 0) return barRowsForClass(cabinClass) * PITCH[cabinClass];
    const seatRows = perRow > 0 ? Math.ceil(seatCount / perRow) : 0;
    return (seatRows + barRowsForClass(cabinClass)) * PITCH[cabinClass];
  }

  function totalPax() {
    return netSeats('first') + netSeats('business') + netSeats('economyPlus') + netSeats('economy');
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
    // <= totalSpace (not totalSpace - 1): premium classes may fill the entire
    // cabin — an all-First / all-Business / all-Plus aircraft is allowed, and
    // economy simply derives to 0 rows.
    return testUsed <= totalSpace;
  }

  function canRemove(cabinClass) {
    return config[cabinClass] > 0;
  }

  recalcEconomy();

  // Restore a deliberately reduced economy count (e.g. a saved all-premium
  // cabin) — only when the stored value is below what auto-fill would give.
  if (existingConfig?.economySeats != null) {
    const wanted = roundToRow(existingConfig.economySeats, 'economy');
    if (wanted < config.economy) {
      econCapOverride = wanted;
      recalcEconomy();
    }
  }

  const overlay = document.createElement('div');
  overlay.id = 'cabinConfigOverlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.85); z-index: 3000;
    display: flex; justify-content: center; align-items: stretch;
    padding: 0.5rem;
  `;

  const fuselageWidth = deckSpec ? deckSpec.fuselageWidth
    : (airshipCabin ? airshipCabin.fuselageWidth
       : (icaoCabin ? icaoCabin.fuselageWidth
          : ((smallOverride && smallOverride.fuselageWidth)
             || (wbOverride && wbOverride.fuselageWidth)
             || FUSELAGE_WIDTHS[acType] || 190)));

  overlay.innerHTML = `
    <div style="background: var(--surface); border: 1px solid var(--border-color); border-radius: 10px;
                display: flex; flex-direction: column; width: 95%; max-width: 1400px;
                max-height: 85vh; overflow: hidden; margin: auto;">
      <!-- Top controls bar -->
      <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color); overflow-y: auto; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem; flex-wrap: wrap;">
          <div style="flex-shrink: 0;">
            <h2 style="margin: 0 0 0.15rem 0; color: var(--text-primary); font-size: 1rem;">CABIN CONFIGURATION</h2>
            <div style="color: var(--text-muted); font-size: 0.65rem;">${aircraft.manufacturer} ${aircraft.model}${aircraft.variant ? ' ' + aircraft.variant : ''} · ${acType}${deckSpec ? ' · ' + deckSpec.label : ''}</div>
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

          ${toiletInfo.max === 0 ? `
          <div style="padding: 0.5rem 0.6rem; background: var(--surface-elevated); border-radius: 6px; border-left: 3px solid rgba(148,163,184,0.5); opacity: 0.38; cursor: not-allowed; display: flex; flex-direction: column; justify-content: center;"
               title="This aircraft is too small to fit a lavatory.">
            <div style="font-size: 0.65rem; font-weight: 600; color: rgba(148,163,184,0.8); margin-bottom: 0.15rem;">WC</div>
            <div style="font-size: 0.5rem; color: var(--text-muted); font-style: italic; white-space: nowrap;">Aircraft too small</div>
          </div>
          ` : `
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
          `}

          ${options?.refitWarning ? `
          <div style="padding: 0.4rem 0.6rem; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25); border-left: 3px solid #f59e0b; border-radius: 4px; display: flex; align-items: center; gap: 0.4rem;">
            <span style="font-size: 0.85rem; flex-shrink: 0;">&#9888;</span>
            <span style="font-size: 0.6rem; color: var(--warning-color); line-height: 1.2;">${options.refitWarning}<span id="cabinRefitCostNote" style="display:block;margin-top:0.15rem;font-weight:700;"></span></span>
          </div>
          ` : ''}

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.3rem; margin-left: auto; flex-shrink: 0; width: 220px;">
            <button id="cabinSaveLayoutBtn" class="btn" style="padding: 0.4rem 0; font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.4); color: #60a5fa; cursor: pointer; text-align: center;">Save Config</button>
            <button id="cabinLoadLayoutBtn" class="btn" style="padding: 0.4rem 0; font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; background: rgba(139,92,246,0.15); border: 1px solid rgba(139,92,246,0.4); color: #a78bfa; cursor: pointer; text-align: center;">Load Config</button>
            <button id="cabinApplyBtn" class="btn" style="padding: 0.4rem 0; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; background: rgba(16,185,129,0.2); border: 1px solid rgba(16,185,129,0.5); color: #34d399; cursor: pointer; text-align: center;">Apply</button>
            <button id="cabinCancelBtn" class="btn" style="padding: 0.4rem 0; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.4); color: #f87171; cursor: pointer; text-align: center;">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Upgrade buttons row -->
      <div style="display:flex;gap:0.4rem;padding:0.3rem 0.75rem;border-top:1px solid var(--border-color);flex-shrink:0;align-items:center;">
        <button id="seatUpgradesBtn" class="cabin-upgrade-btn" data-scope="seat" style="padding:0.3rem 0.7rem;font-size:0.65rem;font-weight:600;background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.3);border-radius:4px;color:#a78bfa;cursor:pointer;">&#9881; Seat Upgrades</button>
        <button id="aircraftUpgradesBtn" class="cabin-upgrade-btn" data-scope="aircraft" style="padding:0.3rem 0.7rem;font-size:0.65rem;font-weight:600;background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.3);border-radius:4px;color:#60a5fa;cursor:pointer;">&#9992; Aircraft Upgrades</button>
        <span id="upgradesSummary" style="font-size:0.55rem;color:var(--text-muted);margin-left:auto;"></span>
      </div>

      <!-- Landscape diagram area — fit-to-width by default, zoomable -->
      <div id="cabinDiagramScroll" style="flex: 1; min-height: 0; background: rgba(0,0,0,0.2); overflow: auto; padding: 0.5rem 0.75rem; position: relative;">
        <div id="cabinZoomControls" style="position:sticky;top:4px;left:0;z-index:10;display:flex;gap:3px;margin-bottom:4px;">
          <button onclick="window._cabinZoom(-1)" style="width:26px;height:26px;background:var(--surface);border:1px solid var(--border-color);border-radius:4px;color:var(--text-primary);cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;">&minus;</button>
          <button onclick="window._cabinZoom(0)" style="height:26px;padding:0 8px;background:var(--surface);border:1px solid var(--border-color);border-radius:4px;color:var(--text-muted);cursor:pointer;font-size:0.65rem;white-space:nowrap;" id="cabinZoomLabel">Fit</button>
          <button onclick="window._cabinZoom(1)" style="width:26px;height:26px;background:var(--surface);border:1px solid var(--border-color);border-radius:4px;color:var(--text-primary);cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;">+</button>
        </div>
        <div id="cabinDiagramContainer" style="display: flex; flex-direction: column; align-items: center; min-width: 100%; transform-origin: top left;"></div>
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
        <div style="display: flex; align-items: center; gap: 0.3rem;">
          <button class="cabin-adj-btn" data-class="economy" data-delta="-1"
            style="width: 22px; height: 22px; border: 1px solid var(--border-color); border-radius: 4px;
                   background: var(--surface); color: var(--text-primary); cursor: pointer; font-size: 0.8rem;
                   display: flex; align-items: center; justify-content: center; padding: 0;">−</button>
          <span id="cabinCount_economy" style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary); min-width: 1.8rem; text-align: center;">${config.economy}</span>
          <button class="cabin-adj-btn" data-class="economy" data-delta="1"
            style="width: 22px; height: 22px; border: 1px solid var(--border-color); border-radius: 4px;
                   background: var(--surface); color: var(--text-primary); cursor: pointer; font-size: 0.8rem;
                   display: flex; align-items: center; justify-content: center; padding: 0;">+</button>
        </div>
        <div id="econAutoNote" style="font-size: 0.45rem; color: var(--text-muted); margin-top: 0.15rem;">${layouts.economy.join('-')} · ${econPerRow}/row · auto</div>
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
    // Combi cargo block (with bulkhead): shown on a single-deck combi and on the
    // MAIN deck of a double-deck combi (that's where the freight rides — the upper
    // deck is all-passenger). Freight is still allocated in the cargo configurator.
    const combiHasCargoHere = aircraft.isCombi && aircraft.cargoCapacityKg > 0 && (!deckSpec || deckSpec.deck === 'main');
    const cdp = combiHasCargoHere
      ? Math.min(0.75, aircraft.cargoCapacityKg / (aircraft.cargoCapacityKg + (aircraft.passengerCapacity || 1) * 100))
      : 0;
    const showCockpit = deckSpec ? !!deckSpec.showCockpit : !isAirship;
    const shape = isAirship ? 'capsule' : 'plane';
    // Try schematic seat map first; fall back to legacy fuselage renderer
    const seatMapHtml = !isAirship ? renderSeatMap(config, layouts, acType, 'fuselageGrad', toilets, midPositions, aircraft, barState, deckSpec) : null;
    container.innerHTML = (seatMapHtml || renderFuselage(config, layouts, fuselageWidth, 'fuselageGrad', showCockpit, toilets, cdp, true, midPositions, shape, aircraft)) + renderLegend();
    // Bar is now rendered inline by renderSeatMap — no overlay needed
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
      handle.addEventListener('mousedown', (e) => _startMidDrag(e, handle));
      // Touch equivalent — iOS never fires mouse events for a finger drag.
      // passive:false so preventDefault() can stop the page scrolling.
      handle.addEventListener('touchstart', (e) => _startMidDrag(e, handle), { passive: false });
    });

    function _startMidDrag(e, handle) {
      e.preventDefault();
      e.stopPropagation();
      const idx = parseInt(handle.dataset.midIdx);
      // Calculate what row this currently sits at
      const currentRow = Math.round(midPositions[idx] * totalRows);
      _midDrag = { idx, startY, endY, totalRows, lastRow: currentRow };
      document.body.style.cursor = 'grabbing';
      const scrollEl = document.getElementById('cabinDiagramScroll');
      if (scrollEl) scrollEl.style.overflow = 'hidden';
    }
  }

  // Pull clientX/clientY from either a mouse or a touch event.
  function _dragPoint(e) {
    const t = e.touches && e.touches[0];
    return t ? { x: t.clientX, y: t.clientY } : { x: e.clientX, y: e.clientY };
  }

  // Global move handler for drag (attached to overlay)
  function _moveMidDrag(e) {
    if (!_midDrag) return;
    e.preventDefault();
    const container = document.getElementById('cabinDiagramContainer');
    if (!container) return;
    const svg = container.querySelector('svg');
    if (!svg) return;

    const pt = _dragPoint(e);
    const portraitY = _screenToSvgY(svg, pt.x, pt.y);
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
  }
  overlay.addEventListener('mousemove', _moveMidDrag);
  overlay.addEventListener('touchmove', _moveMidDrag, { passive: false });

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
  overlay.addEventListener('touchend', _endMidDrag);

  // ── Bar drag handling ─────────────────────────────────────────────
  // In the schematic seat map, the bar occupies N rows of its class.
  // barState.rowOffset determines where within the class it sits (0 = first rows).
  let _barDrag = null;

  function setupBarDragHandles() {
    const container = document.getElementById('cabinDiagramContainer');
    if (!container) return;
    const svg = container.querySelector('svg');
    if (!svg) return;
    svg.querySelectorAll('.bar-drag-handle').forEach(handle => {
      handle.addEventListener('mousedown', (e) => _startBarDrag(e, handle));
      handle.addEventListener('touchstart', (e) => _startBarDrag(e, handle), { passive: false });
    });
    function _startBarDrag(e, handle) {
      e.preventDefault(); e.stopPropagation();
      const barRows = parseInt(handle.dataset.barRows) || 2;
      const barClass = handle.dataset.barClass;
      // Count total rows in this class
      const perRow = classPerRow(barClass);
      const totalClassRows = perRow > 0 ? Math.ceil((config[barClass] || 0) / perRow) : 0;
      _barDrag = { barRows, totalClassRows, barClass };
      document.body.style.cursor = 'grabbing';
      const scrollEl = document.getElementById('cabinDiagramScroll');
      if (scrollEl) scrollEl.style.overflow = 'hidden';
    }
  }

  function _screenToSvgX(svg, clientX) {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = 0;
    const ctm = svg.getScreenCTM();
    if (!ctm) return 0;
    return pt.matrixTransform(ctm.inverse()).x;
  }

  function _moveBarDrag(e) {
    if (!_barDrag) return;
    e.preventDefault();
    if (!barState || !barState[_barDrag.barClass]) { _barDrag = null; return; }
    const container = document.getElementById('cabinDiagramContainer');
    if (!container) return;
    const svg = container.querySelector('svg');
    if (!svg) return;
    const pt = _dragPoint(e);
    const svgX = _screenToSvgX(svg, pt.x);
    const maxOffset = Math.max(0, _barDrag.totalClassRows - _barDrag.barRows);
    if (maxOffset <= 0) return;
    // Find the handle for THIS bar class
    const handle = svg.querySelector(`.bar-drag-handle[data-bar-class="${_barDrag.barClass}"]`);
    if (!handle) return;
    const hx = parseFloat(handle.getAttribute('x'));
    const hw = parseFloat(handle.getAttribute('width'));
    const rowPitch = hw / _barDrag.barRows;
    const delta = svgX - (hx + hw / 2);
    const rowShift = Math.round(delta / rowPitch);
    const currentOffset = barState[_barDrag.barClass].rowOffset || 0;
    const newOffset = Math.max(0, Math.min(maxOffset, currentOffset + rowShift));
    if (newOffset !== currentOffset) {
      barState[_barDrag.barClass].rowOffset = newOffset;
      renderDiagram();
      setupMidDragHandles();
      setupBarDragHandles();
    }
  }
  overlay.addEventListener('mousemove', _moveBarDrag);
  overlay.addEventListener('touchmove', _moveBarDrag, { passive: false });

  function _endBarDrag() {
    if (_barDrag) {
      document.body.style.cursor = '';
      _barDrag = null;
      const scrollEl = document.getElementById('cabinDiagramScroll');
      if (scrollEl) scrollEl.style.overflow = 'auto';
    }
  }
  overlay.addEventListener('mouseup', _endBarDrag);
  overlay.addEventListener('mouseleave', _endBarDrag);
  overlay.addEventListener('touchend', _endBarDrag);
  overlay.addEventListener('touchcancel', _endMidDrag);

  function updateUI() {
    recalcEconomy();
    for (const cls of ['first', 'business', 'economyPlus', 'economy']) {
      const el = document.getElementById(`cabinCount_${cls}`);
      if (el) el.textContent = netSeats(cls);
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
    // Economy buttons: − active while any economy remains; + only while capped
    // below the auto-fill amount
    const eMinus = overlay.querySelector('[data-class="economy"][data-delta="-1"]');
    const ePlus = overlay.querySelector('[data-class="economy"][data-delta="1"]');
    const eCanRemove = config.economy > 0;
    const eCanAdd = econCapOverride != null && config.economy < autoEconomy;
    if (eMinus) { eMinus.style.opacity = eCanRemove ? '1' : '0.3'; eMinus.style.cursor = eCanRemove ? 'pointer' : 'default'; }
    if (ePlus) { ePlus.style.opacity = eCanAdd ? '1' : '0.3'; ePlus.style.cursor = eCanAdd ? 'pointer' : 'default'; }
    const econNote = document.getElementById('econAutoNote');
    if (econNote) econNote.textContent =
      `${layouts.economy.join('-')} · ${econPerRow}/row · ${econCapOverride != null ? 'reduced' : 'auto'}`;
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
    // Live outfitting cost for seats being added (delta-up vs current config)
    const refitCostEl = document.getElementById('cabinRefitCostNote');
    if (refitCostEl && options?.refitCostFn) {
      const liveCost = options.refitCostFn({
        economySeats: config.economy, economyPlusSeats: config.economyPlus,
        businessSeats: config.business, firstSeats: config.first
      });
      refitCostEl.textContent = liveCost > 0
        ? `New-seat outfitting cost: ${_ccMoney(liveCost)} (charged on apply)`
        : 'No outfitting cost — no seats added';
    }
    ensureMidPositions();
    renderDiagram();
    setupMidDragHandles();
    if (typeof setupBarDragHandles === 'function') setupBarDragHandles();
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
      if (cls === 'economy') {
        // Economy auto-fills leftover space; − caps it below the auto amount
        // (freed space stays empty — enables all-premium cabins), + restores
        // toward auto (recalcEconomy clears the cap once it reaches auto).
        if (delta < 0 && config.economy > 0) {
          econCapOverride = Math.max(0, config.economy - perRow);
        } else if (delta > 0 && econCapOverride != null) {
          econCapOverride = config.economy + perRow;
        }
        updateUI();
        return;
      }
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
    // Filter out empty upgrade arrays
    const cleanUpgrades = {};
    for (const [cls, keys] of Object.entries(upgrades)) {
      if (keys.length > 0) cleanUpgrades[cls] = [...keys];
    }
    const result = {
      firstSeats: netSeats('first'),
      businessSeats: netSeats('business'),
      economyPlusSeats: netSeats('economyPlus'),
      economySeats: netSeats('economy'),
      toilets: toilets,
      midPositions: midPositions.length > 0 ? [...midPositions] : undefined,
      cabinUpgrades: Object.keys(cleanUpgrades).length > 0 || barState
        ? { ...cleanUpgrades, ...(barState ? { _bar: barState } : {}) } : null
    };
    if (options?.refitConfirm) {
      _showRefitConfirmModal(overlay, options.refitConfirm, onApply, result,
        options.refitCostFn ? options.refitCostFn(result) : null);
    } else {
      document.body.removeChild(overlay);
      if (onApply) onApply(result);
    }
  });

  document.getElementById('cabinCancelBtn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  // ── Cabin upgrade buttons ──────────────────────────────────────────
  function updateUpgradeSummary() {
    const allKeys = new Set();
    for (const keys of Object.values(upgrades)) { if (Array.isArray(keys)) keys.forEach(k => allKeys.add(k)); }
    const el = document.getElementById('upgradesSummary');
    if (el) el.textContent = allKeys.size > 0 ? allKeys.size + ' upgrade' + (allKeys.size > 1 ? 's' : '') + ' installed' : '';
    // Update button badges
    const seatBtn = document.getElementById('seatUpgradesBtn');
    const acBtn = document.getElementById('aircraftUpgradesBtn');
    if (seatBtn) {
      const seatCount = [...allKeys].filter(k => { const d = typeof CABIN_UPGRADES !== 'undefined' ? CABIN_UPGRADES[k] : null; return d?.scope === 'seat'; }).length;
      seatBtn.innerHTML = (seatCount ? '\u2713 ' : '\u2699 ') + 'Seat Upgrades' + (seatCount ? ' (' + seatCount + ')' : '');
    }
    if (acBtn) {
      const acCount = [...allKeys].filter(k => { const d = typeof CABIN_UPGRADES !== 'undefined' ? CABIN_UPGRADES[k] : null; return d?.scope === 'aircraft'; }).length;
      acBtn.innerHTML = (acCount ? '\u2713 ' : '\u2708 ') + 'Aircraft Upgrades' + (acCount ? ' (' + acCount + ')' : '');
    }
  }
  updateUpgradeSummary();

  document.getElementById('seatUpgradesBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    // Show seat upgrades — pick the first class with seats, or economy
    const activeClasses = ['first', 'business', 'economyPlus', 'economy'].filter(c => config[c] > 0);
    const cls = activeClasses[0] || 'economy';
    _showCabinUpgradePanel(overlay, cls, upgrades, config, gameYear, acType, aircraft, 'seat', () => {
      recalcEconomy(); updateUI(); updateUpgradeSummary();
    }, null);
  });

  document.getElementById('aircraftUpgradesBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const barAcc = { get: () => barState, set: (v) => { barState = v; } };
    _showCabinUpgradePanel(overlay, 'economy', upgrades, config, gameYear, acType, aircraft, 'aircraft', () => {
      recalcEconomy(); updateUI(); updateUpgradeSummary();
    }, barAcc);
  });

  // ── Zoom controls ─────────────────────────────────────────────────
  let _cabinZoomLevel = 0; // 0 = fit, positive = zoomed in
  const ZOOM_STEPS = [100, 150, 200]; // percentage of container width
  window._cabinZoom = function(dir) {
    if (dir === 0) { _cabinZoomLevel = 0; } // reset
    else { _cabinZoomLevel = Math.max(0, Math.min(ZOOM_STEPS.length - 1, _cabinZoomLevel + dir)); }
    const container = document.getElementById('cabinDiagramContainer');
    const label = document.getElementById('cabinZoomLabel');
    if (!container) return;
    if (_cabinZoomLevel === 0) {
      container.style.width = '100%';
      if (label) label.textContent = 'Fit';
    } else {
      container.style.width = ZOOM_STEPS[_cabinZoomLevel] + '%';
      if (label) label.textContent = ZOOM_STEPS[_cabinZoomLevel] + '%';
    }
  };

  // ── Save/Load layout handlers ─────────────────────────────────────
  // Resolve catalog Aircraft UUID: marketplace used aircraft have "used-" prefixed IDs
  // and store the real catalog UUID in variantId. Fleet reconfig passes ua.aircraft directly.
  const catalogAircraftId = aircraft.variantId || (typeof aircraft.id === 'string' && aircraft.id.startsWith('used-') ? null : aircraft.id);

  // Hide save/load if we can't resolve the catalog ID
  if (!catalogAircraftId) {
    const sb = document.getElementById('cabinSaveLayoutBtn');
    const lb = document.getElementById('cabinLoadLayoutBtn');
    if (sb) sb.style.display = 'none';
    if (lb) lb.style.display = 'none';
  }

  document.getElementById('cabinSaveLayoutBtn')?.addEventListener('click', () => {
    if (!catalogAircraftId) return;
    _showLayoutNameModal(overlay, async (name) => {
      try {
        const cargoState = typeof window !== 'undefined'
          ? (window.selectedCargoConfig?.cargoConfig || null) : null;
        const resp = await fetch('/api/fleet/cabin-layouts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aircraftId: catalogAircraftId,
            name,
            economySeats: config.economy,
            economyPlusSeats: config.economyPlus,
            businessSeats: config.business,
            firstSeats: config.first,
            toilets,
            cargoConfig: cargoState,
            cabinUpgrades: upgrades
          })
        });
        const btn = document.getElementById('cabinSaveLayoutBtn');
        if (resp.ok) {
          btn.textContent = 'Saved \u2713';
          setTimeout(() => { btn.textContent = 'Save Layout'; }, 2000);
        } else {
          const err = await resp.json();
          btn.textContent = err.error || 'Error';
          setTimeout(() => { btn.textContent = 'Save Layout'; }, 2000);
        }
      } catch (e) { console.error('Save layout error:', e); }
    });
  });

  document.getElementById('cabinLoadLayoutBtn').addEventListener('click', async () => {
    try {
      const resp = await fetch(`/api/fleet/cabin-layouts/${catalogAircraftId}`);
      if (!resp.ok) return;
      const { layouts } = await resp.json();
      if (!layouts || layouts.length === 0) {
        const btn = document.getElementById('cabinLoadLayoutBtn');
        btn.textContent = 'No saved layouts';
        setTimeout(() => { btn.textContent = 'Load Layout'; }, 2000);
        return;
      }
      // Show dropdown
      let existing = document.getElementById('cabinLayoutDropdown');
      if (existing) { existing.remove(); return; } // toggle off
      const dd = document.createElement('div');
      dd.id = 'cabinLayoutDropdown';
      dd.style.cssText = 'position:fixed;background:var(--surface);border:1px solid var(--border-color);border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,0.4);z-index:10001;min-width:220px;max-height:240px;overflow-y:auto;';
      dd.innerHTML = layouts.map(l => `
        <div style="display:flex;align-items:center;gap:0.4rem;padding:0.5rem 0.75rem;border-bottom:1px solid var(--border-color);cursor:pointer;" class="layout-row" data-id="${l.id}">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:0.8rem;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${l.name}</div>
            <div style="font-size:0.65rem;color:var(--text-muted);">${l.firstSeats ? l.firstSeats+'F ' : ''}${l.businessSeats ? l.businessSeats+'J ' : ''}${l.economyPlusSeats ? l.economyPlusSeats+'W ' : ''}${l.economySeats}Y</div>
          </div>
          <button class="layout-delete" data-id="${l.id}" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1rem;padding:0 0.2rem;line-height:1;" title="Delete">&times;</button>
        </div>
      `).join('');
      // Position relative to the load button
      const loadBtn = document.getElementById('cabinLoadLayoutBtn');
      const rect = loadBtn.getBoundingClientRect();
      dd.style.top = (rect.bottom + 4) + 'px';
      dd.style.left = Math.max(8, rect.right - 220) + 'px';
      document.body.appendChild(dd);
      // Click to load a layout
      dd.querySelectorAll('.layout-row').forEach(row => {
        row.addEventListener('click', (e) => {
          if (e.target.closest('.layout-delete')) return;
          const layout = layouts.find(l => l.id === row.dataset.id);
          if (!layout) return;
          config.first = layout.firstSeats || 0;
          config.business = layout.businessSeats || 0;
          config.economyPlus = layout.economyPlusSeats || 0;
          toilets = layout.toilets || 0;
          if (layout.cargoConfig && typeof window !== 'undefined') {
            window.selectedCargoConfig = { cargoConfig: layout.cargoConfig };
          }
          // Restore cabin upgrades
          if (layout.cabinUpgrades) {
            for (const k of ['first', 'business', 'economyPlus', 'economy', '_aircraft']) {
              upgrades[k] = Array.isArray(layout.cabinUpgrades[k]) ? [...layout.cabinUpgrades[k]] : [];
            }
          } else {
            for (const k of ['first', 'business', 'economyPlus', 'economy', '_aircraft']) upgrades[k] = [];
          }
          recalcEconomy();
          updateUI();
          if (typeof updateUpgradeSummary === 'function') updateUpgradeSummary();
          dd.remove();
        });
      });
      // Delete button
      dd.querySelectorAll('.layout-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          await fetch(`/api/fleet/cabin-layouts/${id}`, { method: 'DELETE' });
          btn.closest('.layout-row').remove();
          if (dd.children.length === 0) dd.remove();
        });
      });
      // Close on outside click
      const closeHandler = (e) => {
        if (!dd.contains(e.target) && e.target.id !== 'cabinLoadLayoutBtn') {
          dd.remove();
          document.removeEventListener('click', closeHandler);
        }
      };
      setTimeout(() => document.addEventListener('click', closeHandler), 0);
    } catch (e) { console.error('Load layout error:', e); }
  });

  updateUI();

  // Pin the modal width after the first render — the diagram's drawn length
  // varies with the seat mix (First rows are longer than economy rows), and a
  // fit-content modal makes the whole dialog jump as classes change. Pinned,
  // an outgrown diagram just scrolls inside #cabinDiagramScroll instead.
  const modalBox = overlay.firstElementChild;
  if (modalBox) {
    modalBox.style.width = Math.ceil(modalBox.getBoundingClientRect().width) + 'px';
  }

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
                display: flex; flex-direction: column; max-width: 1500px; width: 96%; max-height: 94vh; overflow: hidden;">

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
          <div style="font-size: 0.5rem; color: var(--text-muted); margin-bottom: 0.4rem;">${ddConfig.upperLayout.economy.join('-')} economy</div>

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
            <div style="display:flex;justify-content:space-between;padding:0.2rem 0.5rem;font-size:0.55rem;color:var(--text-muted);border-top:1px solid var(--border-color);margin-top:0.15rem;">
              <span>This deck: <strong id="upperDeckTotal" style="color:var(--text-primary);">${upperConfig.first + upperConfig.business + upperConfig.economyPlus + upperConfig.economy}</strong></span>
              <span>Both decks: <strong id="upperCombinedTotal" style="color:var(--accent-color);">—</strong></span>
            </div>
          </div>

          <div id="upperDiagram" style="flex: 1; min-height: 0; width: 100%; display: flex; justify-content: center; align-items: start; overflow: hidden;"></div>
        </div>

        <!-- Main Deck -->
        <div style="flex: 1; padding: 0.75rem; display: flex; flex-direction: column; align-items: center; min-height: 0;">
          <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-primary); letter-spacing: 0.05em;">MAIN DECK</div>
          <div style="font-size: 0.5rem; color: var(--text-muted); margin-bottom: 0.4rem;">${ddConfig.mainLayout.economy.join('-')} economy</div>

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
            <div style="display:flex;justify-content:space-between;padding:0.2rem 0.5rem;font-size:0.55rem;color:var(--text-muted);border-top:1px solid var(--border-color);margin-top:0.15rem;">
              <span>This deck: <strong id="mainDeckTotal" style="color:var(--text-primary);">${mainConfig.first + mainConfig.business + mainConfig.economyPlus + mainConfig.economy}</strong></span>
              <span>Both decks: <strong id="mainCombinedTotal" style="color:var(--accent-color);">—</strong></span>
            </div>
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
          <span style="font-size: 0.65rem; color: var(--text-muted);">total pax</span>
          <span id="ddClassBreakdown" style="font-size: 0.55rem; color: var(--text-muted); margin-left: 0.5rem;"></span>
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
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.3rem; margin-left: auto; flex-shrink: 0; width: 220px;">
          <button id="ddSaveLayoutBtn" class="btn" style="padding: 0.4rem 0; font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.4); color: #60a5fa; cursor: pointer; text-align: center;">Save Config</button>
          <button id="ddLoadLayoutBtn" class="btn" style="padding: 0.4rem 0; font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; background: rgba(139,92,246,0.15); border: 1px solid rgba(139,92,246,0.4); color: #a78bfa; cursor: pointer; text-align: center;">Load Config</button>
          <button id="ddApplyBtn" class="btn" style="padding: 0.4rem 0; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; background: rgba(16,185,129,0.2); border: 1px solid rgba(16,185,129,0.5); color: #34d399; cursor: pointer; text-align: center;">Apply</button>
          <button id="ddCancelBtn" class="btn" style="padding: 0.4rem 0; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.4); color: #f87171; cursor: pointer; text-align: center;">Cancel</button>
        </div>
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

    // Deck totals
    const upperTotal = upperConfig.first + upperConfig.business + upperConfig.economyPlus + upperConfig.economy;
    const mainTotal = mainConfig.first + mainConfig.business + mainConfig.economyPlus + mainConfig.economy;
    const combinedTotal = upperTotal + mainTotal;
    const udt = document.getElementById('upperDeckTotal');
    if (udt) udt.textContent = upperTotal;
    const mdt = document.getElementById('mainDeckTotal');
    if (mdt) mdt.textContent = mainTotal;
    const uct = document.getElementById('upperCombinedTotal');
    if (uct) uct.textContent = combinedTotal;
    const mct = document.getElementById('mainCombinedTotal');
    if (mct) mct.textContent = combinedTotal;

    // Update header total + class breakdown
    const totalEl = document.getElementById('ddTotalPax');
    if (totalEl) totalEl.textContent = combinedTotal;
    const bkdn = document.getElementById('ddClassBreakdown');
    if (bkdn) {
      const parts = [];
      for (const cls of ['first', 'business', 'economyPlus', 'economy']) {
        const total = (upperConfig[cls] || 0) + (mainConfig[cls] || 0);
        if (total > 0) {
          const cc = CLASS_COLORS[cls];
          parts.push(`<span style="color:${cc.bg};">${cc.code} ${total}</span>`);
        }
      }
      bkdn.innerHTML = parts.join(' · ');
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

    // Summary (total already updated above)
    const total = {
      first: upperConfig.first + mainConfig.first,
      business: upperConfig.business + mainConfig.business,
      economyPlus: upperConfig.economyPlus + mainConfig.economyPlus,
      economy: upperConfig.economy + mainConfig.economy
    };
    // Live outfitting cost for seats being added (delta-up vs current config)
    const ddRefitCostEl = document.getElementById('cabinRefitCostNote');
    if (ddRefitCostEl && options?.refitCostFn) {
      const liveCost = options.refitCostFn({
        economySeats: total.economy, economyPlusSeats: total.economyPlus,
        businessSeats: total.business, firstSeats: total.first
      });
      ddRefitCostEl.textContent = liveCost > 0
        ? `New-seat outfitting cost: ${_ccMoney(liveCost)} (charged on apply)`
        : 'No outfitting cost — no seats added';
    }
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
        // If remaining seats are fewer than a full row, snap to 0
        dc[cls] = dc[cls] <= perRow ? 0 : dc[cls] - perRow;
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
      _showRefitConfirmModal(overlay, options.refitConfirm, onApply, result,
        options.refitCostFn ? options.refitCostFn(result) : null);
    } else {
      document.body.removeChild(overlay);
      if (onApply) onApply(result);
    }
  });

  document.getElementById('ddCancelBtn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  // ── Save/Load layout handlers (double-deck) ──────────────────────
  const ddCatalogAircraftId = aircraft.variantId || (typeof aircraft.id === 'string' && aircraft.id.startsWith('used-') ? null : aircraft.id);

  if (!ddCatalogAircraftId) {
    const sb = document.getElementById('ddSaveLayoutBtn');
    const lb = document.getElementById('ddLoadLayoutBtn');
    if (sb) sb.style.display = 'none';
    if (lb) lb.style.display = 'none';
  }

  document.getElementById('ddSaveLayoutBtn')?.addEventListener('click', () => {
    if (!ddCatalogAircraftId) return;
    _showLayoutNameModal(overlay, async (name) => {
      try {
        const cargoState = typeof window !== 'undefined'
          ? (window.selectedCargoConfig?.cargoConfig || null) : null;
        const resp = await fetch('/api/fleet/cabin-layouts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aircraftId: ddCatalogAircraftId,
            name,
            economySeats: upperConfig.economy + mainConfig.economy,
            economyPlusSeats: upperConfig.economyPlus + mainConfig.economyPlus,
            businessSeats: upperConfig.business + mainConfig.business,
            firstSeats: upperConfig.first + mainConfig.first,
            toilets,
            cargoConfig: cargoState,
            cabinUpgrades: typeof upgrades !== 'undefined' ? upgrades : null
          })
        });
        const btn = document.getElementById('ddSaveLayoutBtn');
        if (resp.ok) {
          btn.textContent = 'Saved \u2713';
          setTimeout(() => { btn.textContent = 'Save Layout'; }, 2000);
        } else {
          const err = await resp.json();
          btn.textContent = err.error || 'Error';
          setTimeout(() => { btn.textContent = 'Save Layout'; }, 2000);
        }
      } catch (e) { console.error('Save layout error:', e); }
    });
  });

  document.getElementById('ddLoadLayoutBtn').addEventListener('click', async () => {
    try {
      if (!ddCatalogAircraftId) return;
      const resp = await fetch(`/api/fleet/cabin-layouts/${ddCatalogAircraftId}`);
      if (!resp.ok) return;
      const { layouts } = await resp.json();
      if (!layouts || layouts.length === 0) {
        const btn = document.getElementById('ddLoadLayoutBtn');
        btn.textContent = 'No saved layouts';
        setTimeout(() => { btn.textContent = 'Load Layout'; }, 2000);
        return;
      }
      let existing = document.getElementById('ddLayoutDropdown');
      if (existing) { existing.remove(); return; }
      const dd = document.createElement('div');
      dd.id = 'ddLayoutDropdown';
      dd.style.cssText = 'position:fixed;background:var(--surface);border:1px solid var(--border-color);border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,0.4);z-index:10001;min-width:220px;max-height:240px;overflow-y:auto;';
      dd.innerHTML = layouts.map(l => `
        <div style="display:flex;align-items:center;gap:0.4rem;padding:0.5rem 0.75rem;border-bottom:1px solid var(--border-color);cursor:pointer;" class="layout-row" data-id="${l.id}">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:0.8rem;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${l.name}</div>
            <div style="font-size:0.65rem;color:var(--text-muted);">${l.firstSeats ? l.firstSeats+'F ' : ''}${l.businessSeats ? l.businessSeats+'J ' : ''}${l.economyPlusSeats ? l.economyPlusSeats+'W ' : ''}${l.economySeats}Y</div>
          </div>
          <button class="layout-delete" data-id="${l.id}" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1rem;padding:0 0.2rem;line-height:1;" title="Delete">&times;</button>
        </div>
      `).join('');
      const loadBtn = document.getElementById('ddLoadLayoutBtn');
      const rect = loadBtn.getBoundingClientRect();
      dd.style.top = (rect.bottom + 4) + 'px';
      dd.style.left = Math.max(8, rect.right - 220) + 'px';
      document.body.appendChild(dd);
      dd.querySelectorAll('.layout-row').forEach(row => {
        row.addEventListener('click', (e) => {
          if (e.target.closest('.layout-delete')) return;
          const layout = layouts.find(l => l.id === row.dataset.id);
          if (!layout) return;
          // For double-deck: split evenly between upper and main decks
          // (user can adjust after loading)
          const splitSeats = (total, upperPct) => {
            const upper = Math.round(total * upperPct);
            return [upper, total - upper];
          };
          const totalCap = aircraft.passengerCapacity || 1;
          const upperPct = (upperSpec?.capacity || totalCap * 0.3) / totalCap;
          const [uF, mF] = splitSeats(layout.firstSeats || 0, upperPct);
          const [uJ, mJ] = splitSeats(layout.businessSeats || 0, upperPct);
          const [uW, mW] = splitSeats(layout.economyPlusSeats || 0, 0);
          const [uY, mY] = splitSeats(layout.economySeats || 0, 0);
          upperConfig.first = uF; mainConfig.first = mF;
          upperConfig.business = uJ; mainConfig.business = mJ;
          upperConfig.economyPlus = uW + mW; mainConfig.economyPlus = 0;
          upperConfig.economy = 0; mainConfig.economy = 0;
          toilets = layout.toilets || 0;
          if (layout.cargoConfig && typeof window !== 'undefined') {
            window.selectedCargoConfig = { cargoConfig: layout.cargoConfig };
          }
          // Restore cabin upgrades (double-deck shares same upgrades state)
          if (layout.cabinUpgrades) {
            for (const k of ['first', 'business', 'economyPlus', 'economy', '_aircraft']) {
              if (typeof upgrades !== 'undefined' && upgrades[k] !== undefined) {
                upgrades[k] = Array.isArray(layout.cabinUpgrades[k]) ? [...layout.cabinUpgrades[k]] : [];
              }
            }
          }
          recalcEconomy();
          updateUI();
          dd.remove();
        });
      });
      dd.querySelectorAll('.layout-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await fetch(`/api/fleet/cabin-layouts/${btn.dataset.id}`, { method: 'DELETE' });
          btn.closest('.layout-row').remove();
          if (dd.children.length === 0) dd.remove();
        });
      });
      const closeHandler = (e) => {
        if (!dd.contains(e.target) && e.target.id !== 'ddLoadLayoutBtn') {
          dd.remove();
          document.removeEventListener('click', closeHandler);
        }
      };
      setTimeout(() => document.addEventListener('click', closeHandler), 0);
    } catch (e) { console.error('Load layout error:', e); }
  });

  updateUI();
}


// ======================================================================
// Shared aircraft-image placeholder
// Rendered in place of a blank box when an aircraft has no photo (or all
// image fallbacks fail). Used by the marketplace, fleet and scheduling
// detail cards — cabin-configurator.js is loaded on all three pages, so it
// hosts this shared UI helper. Returns self-contained, theme-aware HTML.
// ======================================================================
window.aircraftNoImage = window.aircraftNoImage || function (opts) {
  opts = opts || {};
  const compact = !!opts.compact;          // smaller variant for thumbnails
  const icon = compact ? 30 : 46;
  return `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.4rem;width:100%;height:100%;padding:0.75rem;text-align:center;user-select:none;pointer-events:none;">
      <svg width="${icon}" height="${icon}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="opacity:0.22;">
        <path d="M21 16v-2l-8-5V3.5C13 2.67 12.33 2 11.5 2S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="var(--text-muted)"/>
      </svg>
      <div style="font-size:${compact ? '0.85rem' : '1.05rem'};font-weight:800;letter-spacing:0.3px;color:var(--text-secondary);opacity:0.85;line-height:1;">AMS<span style="color:var(--accent-color);font-weight:500;">.ceo</span></div>
      <div style="font-size:${compact ? '0.48rem' : '0.55rem'};text-transform:uppercase;letter-spacing:1.2px;color:var(--text-muted);opacity:0.7;">No Image Available</div>
    </div>`;
};

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

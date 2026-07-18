/**
 * Cargo Configurator
 * Allocates cargo capacity (kg) across 8 cargo types (Core + Special).
 * Uses CARGO_TYPES from cargo-types.js (must be loaded first).
 * Cargo aircraft show two sections: Main Deck + Cargo Hold (side-by-side).
 */

/* global CARGO_TYPES, CARGO_TYPE_KEYS, CORE_TYPE_KEYS, SPECIAL_TYPE_KEYS,
   getAvailableCargoTypes, emptyCargoConfig, migrateOldCargoConfig, cargoConfigSummary */

/** Tooltip data for each cargo type: title + example items */
const CARGO_DESCRIPTIONS = {
  general:    { title: 'General Cargo', examples: ['Boxes & packages', 'Consumer electronics', 'Clothing & textiles', 'Household goods', 'Auto parts'] },
  express:    { title: 'Express / Priority', examples: ['Time-sensitive parcels', 'Overnight deliveries', 'E-commerce orders', 'Urgent spare parts', 'Medical samples'] },
  heavy:      { title: 'Heavy / Dense Cargo', examples: ['Machinery & engines', 'Industrial equipment', 'Vehicle parts', 'Steel & metals', 'Construction materials'] },
  oversized:  { title: 'Oversized Cargo', note: 'Main deck only \u2014 Cargo aircraft', examples: ['Aircraft components', 'Wind turbine blades', 'Large machinery', 'Boats & yachts', 'Military vehicles'] },
  perishable: { title: 'Perishable Goods', examples: ['Fresh produce & fruit', 'Flowers & plants', 'Seafood & meat', 'Pharmaceuticals', 'Vaccines & organs'] },
  dangerous:  { title: 'Dangerous Goods', note: 'IATA DGR regulated', examples: ['Lithium batteries', 'Chemicals & solvents', 'Flammable liquids', 'Compressed gases', 'Radioactive materials'] },
  liveAnimal: { title: 'Live Animals', note: 'IATA LAR regulated', examples: ['Livestock & cattle', 'Zoo & exotic animals', 'Pets (dogs, cats)', 'Racing horses', 'Tropical fish'] },
  highValue:  { title: 'High-Value / Secure', examples: ['Jewelry & diamonds', 'Fine art & antiques', 'Gold bullion & currency', 'Sensitive electronics', 'Classified documents'] },
};

/** Inject custom tooltip styles (once) */
(function _injectTooltipStyles() {
  if (document.getElementById('cargo-tooltip-styles')) return;
  const style = document.createElement('style');
  style.id = 'cargo-tooltip-styles';
  style.textContent = `
    .cargo-tooltip {
      position: fixed;
      z-index: 9999;
      pointer-events: none;
      background: var(--surface-elevated, #1e293b);
      border: 1px solid var(--border-color, #334155);
      border-radius: 8px;
      padding: 0.6rem 0.75rem;
      max-width: 240px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      opacity: 0;
      transition: opacity 0.15s ease;
      font-family: system-ui, sans-serif;
    }
    .cargo-tooltip.visible { opacity: 1; }
    .cargo-tooltip .tt-title {
      font-size: 0.75rem;
      font-weight: 700;
      margin-bottom: 0.1rem;
    }
    .cargo-tooltip .tt-note {
      font-size: 0.55rem;
      color: var(--text-muted, #94a3b8);
      margin-bottom: 0.35rem;
      font-style: italic;
    }
    .cargo-tooltip .tt-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .cargo-tooltip .tt-list li {
      font-size: 0.65rem;
      color: var(--text-secondary, #cbd5e1);
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
  `;
  document.head.appendChild(style);
})();

/** Show / hide / position the shared tooltip element */
let _tooltipEl = null;
function _getTooltip() {
  if (!_tooltipEl) {
    _tooltipEl = document.createElement('div');
    _tooltipEl.className = 'cargo-tooltip';
    document.body.appendChild(_tooltipEl);
  }
  return _tooltipEl;
}

function _showCargoTooltip(type, anchorEl) {
  const desc = CARGO_DESCRIPTIONS[type];
  if (!desc) return;
  const ct = CARGO_TYPES[type];
  const tip = _getTooltip();

  let html = `<div class="tt-title" style="color:${ct.color};">${desc.title}</div>`;
  if (desc.note) html += `<div class="tt-note">${desc.note}</div>`;
  html += `<ul class="tt-list">${desc.examples.map(e =>
    `<li><span style="width:5px;height:5px;border-radius:50%;flex-shrink:0;display:inline-block;background:${ct.color};"></span>${e}</li>`
  ).join('')}</ul>`;
  tip.innerHTML = html;

  // Position near the anchor
  const rect = anchorEl.getBoundingClientRect();
  let left = rect.right + 10;
  let top = rect.top;
  // If it would go off-screen right, flip to left side
  if (left + 250 > window.innerWidth) left = rect.left - 260;
  if (top + 200 > window.innerHeight) top = window.innerHeight - 210;
  if (top < 10) top = 10;
  tip.style.left = left + 'px';
  tip.style.top = top + 'px';
  tip.classList.add('visible');
}

function _hideCargoTooltip() {
  if (_tooltipEl) _tooltipEl.classList.remove('visible');
}

/** Attach tooltip listeners to all [data-cargo-tip] elements within a container */
function _attachTooltips(container) {
  container.querySelectorAll('[data-cargo-tip]').forEach(el => {
    el.addEventListener('mouseenter', () => _showCargoTooltip(el.dataset.cargoTip, el));
    el.addEventListener('mouseleave', _hideCargoTooltip);
  });
}

/**
 * Render SVG aircraft fuselage (top-down view) filled with pallet blocks.
 * Each cargo type's allocation maps to a proportional number of coloured pallets
 * arranged in a 2-column grid inside the fuselage, clipped to its outline.
 */
function renderContainerHold(config, types, totalCapacity, holdHeight, idSuffix, paxBlockPct = 0, landscape = false) {
  const sfx = idSuffix || '';
  const activeTypes = types.filter(t => config[t] > 0);
  const W = 200;
  const H = holdHeight || 360;
  const cx = W / 2;

  // Landscape: the hold is drawn in portrait coords then rotated -90° so the
  // nose points LEFT (matching the cabin diagram). Text is counter-rotated +90°
  // around its anchor so it stays upright.
  const _tr = landscape ? (x, y) => ` transform="rotate(90,${x},${y})"` : () => '';

  // ── Fuselage silhouette ──
  // Landscape (single passenger/combi hold): a full aircraft shape matching the
  // cabin diagram — pointed nose + tapered tail + cockpit. Portrait (freighter
  // dual-hold view): the original capsule, since two holds sit side by side.
  const bL = landscape ? 20 : 16;
  const bR = W - (landscape ? 20 : 16);
  const bodyW = bR - bL;
  const noseH = Math.round(bodyW * 0.55);   // landscape pointed-nose region
  const tailH = Math.round(bodyW * 0.25);   // landscape rounded tail
  let bodyTop, bodyBot, fuselage;
  if (landscape) {
    bodyTop = noseH;                         // straight body starts after the nose
    bodyBot = H - tailH;                     // straight body ends before the tail
    fuselage = [
      `M ${bL} ${noseH}`,
      `C ${bL} ${noseH * 0.45}, ${cx - 2} ${noseH * 0.04}, ${cx} 2`,
      `C ${cx + 2} ${noseH * 0.04}, ${bR} ${noseH * 0.45}, ${bR} ${noseH}`,
      `L ${bR} ${bodyBot}`,
      `Q ${bR} ${bodyBot + tailH * 0.85}, ${cx} ${H - 1}`,
      `Q ${bL} ${bodyBot + tailH * 0.85}, ${bL} ${bodyBot}`,
      'Z'
    ].join(' ');
  } else {
    const noseY = 6;
    const tailY = H - 6;
    bodyTop = Math.round(H * 0.12);
    bodyBot = Math.round(H * 0.88);
    fuselage = [
      `M ${cx} ${noseY}`,
      `C ${cx + 46} ${noseY}, ${bR} ${bodyTop * 0.6}, ${bR} ${bodyTop}`,
      `L ${bR} ${bodyBot}`,
      `C ${bR} ${bodyBot + (tailY - bodyBot) * 0.65}, ${cx + 55} ${tailY}, ${cx} ${tailY}`,
      `C ${cx - 55} ${tailY}, ${bL} ${bodyBot + (tailY - bodyBot) * 0.65}, ${bL} ${bodyBot}`,
      `L ${bL} ${bodyTop}`,
      `C ${bL} ${bodyTop * 0.6}, ${cx - 46} ${noseY}, ${cx} ${noseY}`,
      'Z'
    ].join(' ');
  }

  const vbW = landscape ? H : W;
  const vbH = landscape ? W : H;
  const svgStyle = landscape
    ? 'width:100%;height:auto;display:block;margin:0 auto;'
    : 'width:100%;height:100%;max-height:100%;display:block;margin:0 auto;';

  let svg = `<svg viewBox="0 0 ${vbW} ${vbH}" preserveAspectRatio="xMidYMid meet"
    style="${svgStyle}"
    xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="fc${sfx}"><path d="${fuselage}"/></clipPath>
      <linearGradient id="fg${sfx}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="rgba(100,116,139,0.15)"/>
        <stop offset="50%" stop-color="rgba(100,116,139,0.04)"/>
        <stop offset="100%" stop-color="rgba(100,116,139,0.15)"/>
      </linearGradient>
    </defs>
    ${landscape ? `<g transform="translate(0,${W}) rotate(-90)">` : ''}

    <!-- Fuselage outline -->
    <path d="${fuselage}" fill="url(#fg${sfx})" stroke="rgba(100,116,139,0.35)" stroke-width="1.2"/>
    ${landscape ? `
    <!-- Cockpit — darkened nose + label + bulkhead line (matches cabin) -->
    <path d="M${bL + 1},${noseH} C${bL},${noseH * 0.45} ${cx - 2},${noseH * 0.04} ${cx},2 C${cx + 2},${noseH * 0.04} ${bR},${noseH * 0.45} ${bR - 1},${noseH} Z"
          fill="rgba(15,23,42,0.45)" stroke="none"/>
    <line x1="${bL + 2}" y1="${noseH}" x2="${bR - 2}" y2="${noseH}" stroke="rgba(100,116,139,0.4)" stroke-width="0.8"/>
    <text x="${cx}" y="${noseH * 0.6}" text-anchor="middle" dominant-baseline="central" fill="rgba(148,163,184,0.35)" font-size="8" font-weight="700" font-family="system-ui, sans-serif" letter-spacing="1.5"${_tr(cx, noseH * 0.6)}>COCKPIT</text>
    ` : `
    <!-- Center line -->
    <line x1="${cx}" y1="${bodyTop + 4}" x2="${cx}" y2="${bodyBot - 4}" stroke="rgba(100,116,139,0.07)" stroke-width="0.5" stroke-dasharray="3,3"/>
    <!-- Wing stubs -->
    <line x1="1" y1="${Math.round(H * 0.34)}" x2="${bL - 2}" y2="${Math.round(H * 0.34)}" stroke="rgba(100,116,139,0.22)" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="${bR + 2}" y1="${Math.round(H * 0.34)}" x2="${W - 1}" y2="${Math.round(H * 0.34)}" stroke="rgba(100,116,139,0.22)" stroke-width="2.5" stroke-linecap="round"/>
    `}`;

  if (activeTypes.length === 0) {
    // Combi: still show pax cabin block even when cargo hold is empty
    if (paxBlockPct > 0) {
      const holdUsableTop = bodyTop + 8;
      const pEndY = bodyBot - 6;
      const PAX_BULKHEAD_H = 6;
      const paxHoldH = Math.max(36, Math.round((pEndY - holdUsableTop) * paxBlockPct));
      const paxY = holdUsableTop;
      const plY = paxY + paxHoldH / 2;
      svg += `<g clip-path="url(#fc${sfx})">`;
      svg += `<rect x="${bL}" y="${paxY}" width="${bR - bL}" height="${paxHoldH}" fill="rgba(59,130,246,0.12)" stroke="rgba(59,130,246,0.45)" stroke-width="0.8" stroke-dasharray="3,2"/>`;
      svg += `<text x="${cx}" y="${plY}" text-anchor="middle" dominant-baseline="central" fill="rgba(59,130,246,0.9)" font-size="9" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif"${_tr(cx, plY)}>PAX CABIN</text>`;
      svg += `<rect x="${bL}" y="${paxY + paxHoldH}" width="${bR - bL}" height="${PAX_BULKHEAD_H}" fill="rgba(100,116,139,0.4)" stroke="rgba(100,116,139,0.5)" stroke-width="0.5"/>`;
      svg += `<text x="${cx}" y="${paxY + paxHoldH + PAX_BULKHEAD_H/2}" text-anchor="middle" dominant-baseline="central" fill="rgba(200,210,220,0.8)" font-size="4" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif"${_tr(cx, paxY + paxHoldH + PAX_BULKHEAD_H/2)}>BULKHEAD</text>`;
      svg += `</g>`;
    }
    svg += `<text x="${cx}" y="${H / 2}" text-anchor="middle" dominant-baseline="central"
              fill="rgba(100,116,139,0.35)" font-size="10" font-family="system-ui, sans-serif"${_tr(cx, H / 2)}>Empty</text>`;
  } else {
    // ── Pallet grid setup ──
    // Landscape: a 3-wide grid of square pallets — more of them to show how the
    // load is shared, while staying square and centred. Portrait keeps the
    // compact 2-wide layout used by the freighter view.
    const cols = landscape ? 3 : 2;
    const palletW = landscape ? 44 : 72;
    const palletH = landscape ? 44 : 24;
    const gapX = landscape ? 7 : 6;
    const gapY = landscape ? 7 : 4;
    const palletFont = landscape ? 13 : 9.5;
    const rowH = palletH + gapY;
    const gridW = cols * palletW + (cols - 1) * gapX;
    const gridX = (W - gridW) / 2;

    // Usable area inside fuselage body
    const holdUsableTop = bodyTop + 8;
    const pEndY = bodyBot - 6;
    // Combi: reserve top of hold for pax cabin block
    const PAX_BULKHEAD_H = paxBlockPct > 0 ? 6 : 0;
    const paxHoldH = paxBlockPct > 0 ? Math.max(36, Math.round((pEndY - holdUsableTop) * paxBlockPct)) : 0;
    const pStartY = holdUsableTop + paxHoldH + PAX_BULKHEAD_H;
    const numRows = Math.floor((pEndY - pStartY) / rowH);
    const totalSlots = numRows * cols;

    // Distribute slots proportionally to each type
    const slots = [];
    let remaining = totalSlots;
    for (let i = 0; i < activeTypes.length; i++) {
      const t = activeTypes[i];
      let count;
      if (i === activeTypes.length - 1) {
        count = remaining;
      } else {
        const minForRest = activeTypes.length - 1 - i; // at least 1 per remaining type
        count = Math.max(1, Math.round((config[t] / totalCapacity) * totalSlots));
        count = Math.min(count, remaining - minForRest);
      }
      for (let j = 0; j < count; j++) slots.push(t);
      remaining -= count;
    }

    // Render clipped pallet group
    svg += `<g clip-path="url(#fc${sfx})">`;

    // Combi: passenger cabin block at the nose of the hold
    if (paxBlockPct > 0 && paxHoldH > 0) {
      const paxY = holdUsableTop;
      const plY = paxY + paxHoldH / 2;
      svg += `<rect x="${bL}" y="${paxY}" width="${bR - bL}" height="${paxHoldH}" fill="rgba(59,130,246,0.12)" stroke="rgba(59,130,246,0.45)" stroke-width="0.8" stroke-dasharray="3,2"/>`;
      svg += `<text x="${cx}" y="${plY}" text-anchor="middle" dominant-baseline="central" fill="rgba(59,130,246,0.9)" font-size="9" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif"${_tr(cx, plY)}>PAX CABIN</text>`;
      // Bulkhead bar
      svg += `<rect x="${bL}" y="${paxY + paxHoldH}" width="${bR - bL}" height="${PAX_BULKHEAD_H}" fill="rgba(100,116,139,0.4)" stroke="rgba(100,116,139,0.5)" stroke-width="0.5"/>`;
      svg += `<text x="${cx}" y="${paxY + paxHoldH + PAX_BULKHEAD_H/2}" text-anchor="middle" dominant-baseline="central" fill="rgba(200,210,220,0.8)" font-size="4" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif"${_tr(cx, paxY + paxHoldH + PAX_BULKHEAD_H/2)}>BULKHEAD</text>`;
    }

    // Background zones — light tint behind each type group
    let zoneStart = 0;
    let prevType = slots[0];
    for (let i = 0; i <= slots.length; i++) {
      if (i === slots.length || slots[i] !== prevType) {
        const startRow = Math.floor(zoneStart / cols);
        const endRow = Math.floor((i - 1) / cols);
        const zy = pStartY + startRow * rowH - 1;
        const zh = (endRow - startRow + 1) * rowH + 2;
        const ct = CARGO_TYPES[prevType];
        svg += `<rect x="0" y="${zy}" width="${W}" height="${zh}" fill="${ct.color}" opacity="0.1"/>`;
        if (startRow > 0) {
          svg += `<line x1="${gridX}" y1="${zy}" x2="${gridX + gridW}" y2="${zy}"
                    stroke="rgba(255,255,255,0.08)" stroke-width="0.5"/>`;
        }
        if (i < slots.length) { prevType = slots[i]; zoneStart = i; }
      }
    }

    // Render pallets
    for (let i = 0; i < slots.length; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const t = slots[i];
      const ct = CARGO_TYPES[t];
      const px = gridX + col * (palletW + gapX);
      const py = pStartY + row * rowH;

      // Pallet body
      svg += `<rect x="${px}" y="${py}" width="${palletW}" height="${palletH}" rx="3" ry="3"
                fill="${ct.color}" opacity="0.6" stroke="${ct.border}" stroke-width="0.75"/>`;
      // Top accent strip (handle/latch bar)
      svg += `<rect x="${px + 1}" y="${py}" width="${palletW - 2}" height="3.5" rx="1.5" ry="1.5"
                fill="${ct.border}" opacity="0.55"/>`;
      // Bottom shadow
      svg += `<rect x="${px + 2}" y="${py + palletH - 2}" width="${palletW - 4}" height="2" rx="1" ry="1"
                fill="rgba(0,0,0,0.12)"/>`;
      // Label (outlined text for readability) — centred on the pallet
      svg += `<text x="${px + palletW / 2}" y="${py + palletH / 2}" text-anchor="middle" dominant-baseline="central"
                fill="white" font-size="${palletFont}" font-weight="600" letter-spacing="0.5"
                font-family="system-ui, sans-serif"
                stroke="rgba(0,0,0,0.35)" stroke-width="2" paint-order="stroke"${_tr(px + palletW / 2, py + palletH / 2)}>${ct.code}</text>`;
    }

    svg += `</g>`;
  }

  if (landscape) svg += `</g>`;
  svg += `</svg>`;
  return svg;
}

function showCargoConfigurator(aircraft, onApply, existingConfig, options) {
  if (!aircraft || !aircraft.cargoCapacityKg || aircraft.cargoCapacityKg <= 0) return;
  const isCargo = aircraft.type === 'Cargo';
  const hasDualDeck = isCargo && aircraft.mainDeckCapacityKg > 0 && aircraft.cargoHoldCapacityKg > 0;
  // options.sectionCapacity → configure a single named section (a combi's main
  // deck or belly hold) rather than the whole aircraft.
  if (hasDualDeck && !options?.sectionCapacity) return _showDualDeckConfigurator(aircraft, onApply, existingConfig);
  return _showSingleConfigurator(aircraft, onApply, existingConfig, options);
}

// Split a combi's total cargo capacity into a main-deck section (the primary
// freight area) and a smaller belly hold. Runtime-derived — no schema change.
function getCombiCargoSplit(aircraft) {
  const total = aircraft.cargoCapacityKg || 0;
  const mainDeck = Math.round(total * 0.7);
  return { mainDeck, hold: total - mainDeck };
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function _formatKg(kg) { return kg >= 1000 ? (kg / 1000).toFixed(1) + 't' : kg + 'kg'; }

/** Build a default cargo split across types for the given capacity.
 *  Allocates percentages to each non-general type, rounded to step sizes.
 *  General cargo auto-fills whatever remains. */
const _DEFAULT_SPLIT_PCT = {
  express:    0.10,
  heavy:      0.08,
  oversized:  0.05,
  perishable: 0.08,
  dangerous:  0.03,
  liveAnimal: 0.02,
  highValue:  0.02,
};

function _buildDefaultSplit(capacity, availableTypes) {
  const cfg = emptyCargoConfig();
  let used = 0;
  for (const t of availableTypes) {
    if (t === 'general') continue;
    const pct = _DEFAULT_SPLIT_PCT[t] || 0;
    if (pct <= 0) continue;
    const step = CARGO_TYPES[t].stepKg;
    const raw = capacity * pct;
    const rounded = Math.round(raw / step) * step;
    const alloc = Math.max(0, Math.min(rounded, capacity - used - step));
    cfg[t] = alloc;
    used += alloc;
  }
  cfg.general = Math.max(0, capacity - used);
  return cfg;
}

function _resolveExistingConfig(existingConfig) {
  if (!existingConfig) return null;
  if (existingConfig.cargoConfig) return { ...existingConfig.cargoConfig };
  if (existingConfig.cargoLightKg != null || existingConfig.cargoStandardKg != null || existingConfig.cargoHeavyKg != null) {
    return migrateOldCargoConfig(existingConfig.cargoLightKg, existingConfig.cargoStandardKg, existingConfig.cargoHeavyKg);
  }
  return null;
}

function _resolveExistingDeckConfig(existingConfig, field, oldFields, totalConfig, deckCap, totalCap) {
  if (!existingConfig) return null;
  if (existingConfig[field]) return { ...existingConfig[field] };
  if (existingConfig[oldFields[0]] != null) {
    return migrateOldCargoConfig(existingConfig[oldFields[0]], existingConfig[oldFields[1]], existingConfig[oldFields[2]]);
  }
  if (totalConfig && totalCap > 0) {
    const ratio = deckCap / totalCap;
    const cfg = emptyCargoConfig();
    CARGO_TYPE_KEYS.forEach(k => { cfg[k] = Math.round((totalConfig[k] || 0) * ratio); });
    return cfg;
  }
  return null;
}

/* ── Single-deck configurator ──────────────────────────────────────── */

function _showSingleConfigurator(aircraft, onApply, existingConfig, options) {
  // Section mode (combi main deck / belly hold): override capacity, label, types.
  const totalCapacity = options?.sectionCapacity || aircraft.cargoCapacityKg;
  const sectionLabel = options?.sectionLabel || null;
  const types = options?.types || getAvailableCargoTypes(aircraft.type);
  if (types.length === 0) return;

  const autoFillType = 'general';
  const config = emptyCargoConfig();
  const resolved = _resolveExistingConfig(existingConfig);
  if (resolved) { types.forEach(t => { config[t] = resolved[t] || 0; }); }
  else { const def = _buildDefaultSplit(totalCapacity, types); types.forEach(t => { config[t] = def[t]; }); }

  function recalcAutoFill() {
    let used = 0;
    for (const t of types) { if (t !== autoFillType) used += config[t]; }
    config[autoFillType] = Math.max(0, totalCapacity - used);
  }
  function totalAllocated() { let s = 0; for (const t of types) s += config[t]; return s; }
  function stepFor(type) { return CARGO_TYPES[type].stepKg; }
  function canAdd(type) {
    if (type === autoFillType) return false;
    let other = 0;
    for (const t of types) { if (t !== autoFillType && t !== type) other += config[t]; }
    return (config[type] + stepFor(type) + other) <= totalCapacity;
  }
  function canRemove(type) { return type !== autoFillType && config[type] >= stepFor(type); }
  recalcAutoFill();

  const overlay = document.createElement('div');
  overlay.id = 'cargoConfigOverlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:3000;display:flex;justify-content:center;align-items:center;padding:1rem;';

  function buildTypeCtrl(type) {
    const ct = CARGO_TYPES[type];
    const isAuto = (type === autoFillType);
    return `
      <div data-cargo-tip="${type}" style="padding:0.3rem 0.5rem;background:var(--surface-elevated);border-radius:5px;border-left:3px solid ${ct.color};cursor:default;display:flex;justify-content:space-between;align-items:center;gap:0.5rem;flex:0 1 auto;white-space:nowrap;">
        <span style="font-size:0.7rem;font-weight:600;color:${ct.color};white-space:nowrap;">${ct.label.toUpperCase().replace(/ CARGO$| GOODS$/, '')}</span>
        ${isAuto ? `
          <span id="cargoCount_${type}" style="font-weight:700;font-size:0.85rem;color:var(--text-primary);display:inline-block;width:3rem;text-align:center;">${_formatKg(config[type])}</span>
        ` : `
          <div style="display:flex;align-items:center;gap:0.3rem;">
            <button class="cargo-adj-btn" data-type="${type}" data-delta="-1"
              style="width:22px;height:22px;border:1px solid var(--border-color);border-radius:4px;background:var(--surface);color:var(--text-primary);cursor:pointer;font-size:0.85rem;display:flex;align-items:center;justify-content:center;padding:0;">\u2212</button>
            <span id="cargoCount_${type}" style="font-weight:700;font-size:0.85rem;color:var(--text-primary);display:inline-block;width:3rem;text-align:center;">${_formatKg(config[type])}</span>
            <button class="cargo-adj-btn" data-type="${type}" data-delta="1"
              style="width:22px;height:22px;border:1px solid var(--border-color);border-radius:4px;background:var(--surface);color:var(--text-primary);cursor:pointer;font-size:0.85rem;display:flex;align-items:center;justify-content:center;padding:0;">+</button>
          </div>
        `}
      </div>`;
  }

  function buildCategoryGroup(label, typeKeys) {
    const available = typeKeys.filter(k => types.includes(k));
    if (available.length === 0) return '';
    return `
      <div style="font-size:0.6rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.15rem;margin-top:0.3rem;">${label}</div>
      ${available.map(t => buildTypeCtrl(t)).join('')}`;
  }

  function buildBarSegments() {
    let html = '';
    for (const t of types) {
      if (config[t] <= 0) continue;
      const pct = (config[t] / totalCapacity) * 100;
      html += `<div style="width:${pct}%;height:100%;background:${CARGO_TYPES[t].color};transition:width 0.3s ease;"></div>`;
    }
    return html;
  }

  overlay.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border-color);border-radius:10px;display:flex;flex-direction:column;max-width:1500px;width:96%;max-height:94vh;overflow:hidden;">
      <!-- Top controls bar -->
      <div style="padding:0.85rem 1.1rem;border-bottom:1px solid var(--border-color);flex-shrink:0;">
        <div style="display:flex;align-items:center;gap:1rem;margin-bottom:0.6rem;flex-wrap:wrap;">
          <div style="flex-shrink:0;">
            <h2 style="margin:0 0 0.1rem 0;color:var(--text-primary);font-size:1rem;">CARGO CONFIGURATION${sectionLabel ? ' \u2014 ' + sectionLabel.toUpperCase() : ''}</h2>
            <div style="color:var(--text-muted);font-size:0.65rem;">${aircraft.manufacturer} ${aircraft.model}${aircraft.variant ? ' ' + aircraft.variant : ''} \u00B7 ${_formatKg(totalCapacity)} capacity</div>
          </div>
          <div style="padding:0.4rem 0.75rem;background:var(--surface-elevated);border-radius:6px;display:flex;align-items:center;gap:0.6rem;flex-shrink:0;">
            <span style="font-size:0.7rem;color:var(--text-secondary);">Allocated</span>
            <span id="cargoTotalLabel" style="font-size:0.95rem;font-weight:700;color:var(--text-primary);">${_formatKg(totalAllocated())} / ${_formatKg(totalCapacity)}</span>
            <div style="width:90px;height:6px;background:var(--surface);border-radius:3px;overflow:hidden;display:flex;">
              <div id="cargoBarSegments" style="display:flex;width:100%;height:100%;border-radius:3px;overflow:hidden;">${buildBarSegments()}</div>
            </div>
          </div>
          <div style="display:flex;gap:0.4rem;align-items:center;margin-left:auto;">
            <button id="cargoApplyBtn" class="btn btn-primary" style="padding:0.5rem 1.25rem;font-size:0.8rem;">Apply</button>
            <button id="cargoCancelBtn" class="btn btn-secondary" style="padding:0.5rem 1.25rem;font-size:0.8rem;">Cancel</button>
          </div>
        </div>
        <div id="cargoTypeControls" style="display:flex;gap:0.4rem;flex-wrap:wrap;align-items:stretch;">
          ${types.map(t => buildTypeCtrl(t)).join('')}
        </div>
      </div>

      <!-- Landscape hold diagram -->
      <div id="cargoDiagramScroll" style="flex:1;min-height:0;background:rgba(0,0,0,0.2);overflow:auto;padding:0.6rem 0.9rem;">
        <div id="cargoDiagramContainer" style="width:100%;display:flex;align-items:flex-start;justify-content:center;"></div>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  _attachTooltips(overlay);

  // Pax cabin block: shown on a combi's main-deck cargo section (freight sits
  // behind the passenger cabin). Callers can override (e.g. 0 for the belly hold).
  const paxBlockPct = options?.paxBlockPct != null
    ? options.paxBlockPct
    : (aircraft.isCombi && aircraft.passengerCapacity > 0
        ? Math.min(0.5, (aircraft.passengerCapacity * 100) / (aircraft.cargoCapacityKg + aircraft.passengerCapacity * 100))
        : 0);

  function renderDiagram() {
    const c = document.getElementById('cargoDiagramContainer');
    if (c) c.innerHTML = renderContainerHold(config, types, totalCapacity, 560, '_single', paxBlockPct, true);
  }

  function updateUI() {
    recalcAutoFill();
    for (const t of types) { const el = document.getElementById(`cargoCount_${t}`); if (el) el.textContent = _formatKg(config[t]); }
    const tl = document.getElementById('cargoTotalLabel');
    if (tl) tl.textContent = `${_formatKg(totalAllocated())} / ${_formatKg(totalCapacity)}`;
    const bar = document.getElementById('cargoBarSegments');
    if (bar) bar.innerHTML = buildBarSegments();
    for (const t of types) {
      if (t === autoFillType) continue;
      const mb = overlay.querySelector(`[data-type="${t}"][data-delta="-1"]`);
      const pb = overlay.querySelector(`[data-type="${t}"][data-delta="1"]`);
      if (mb) { mb.style.opacity = canRemove(t) ? '1' : '0.3'; mb.style.cursor = canRemove(t) ? 'pointer' : 'default'; }
      if (pb) { pb.style.opacity = canAdd(t) ? '1' : '0.3'; pb.style.cursor = canAdd(t) ? 'pointer' : 'default'; }
    }
    renderDiagram();
  }

  _attachAdjButtons(overlay, config, types, stepFor, canAdd, canRemove, updateUI);

  document.getElementById('cargoApplyBtn').addEventListener('click', () => {
    _hideCargoTooltip(); document.body.removeChild(overlay);
    if (onApply) {
      const result = { cargoConfig: {} };
      types.forEach(t => { result.cargoConfig[t] = config[t]; });
      CARGO_TYPE_KEYS.forEach(t => { if (result.cargoConfig[t] == null) result.cargoConfig[t] = 0; });
      onApply(result);
    }
  });
  document.getElementById('cargoCancelBtn').addEventListener('click', () => { _hideCargoTooltip(); document.body.removeChild(overlay); });
  updateUI();
}

/* ── Dual-deck configurator ─────────────────────────────────────────── */

function _showDualDeckConfigurator(aircraft, onApply, existingConfig) {
  const mainDeckCap = aircraft.mainDeckCapacityKg;
  const holdCap = aircraft.cargoHoldCapacityKg;
  const totalCapacity = aircraft.cargoCapacityKg;
  const types = getAvailableCargoTypes(aircraft.type);
  if (types.length === 0) return;

  // Oversized cargo only fits on the main deck
  const mdTypes = types;
  const chTypes = types.filter(t => t !== 'oversized');

  const autoFillType = 'general';
  const mainDeck = emptyCargoConfig();
  const cargoHold = emptyCargoConfig();

  const resolvedTotal = _resolveExistingConfig(existingConfig);
  const resolvedMD = _resolveExistingDeckConfig(existingConfig, 'mainDeckCargoConfig',
    ['mainDeckLightKg', 'mainDeckStandardKg', 'mainDeckHeavyKg'], resolvedTotal, mainDeckCap, totalCapacity);
  const resolvedCH = _resolveExistingDeckConfig(existingConfig, 'cargoHoldCargoConfig',
    ['cargoHoldLightKg', 'cargoHoldStandardKg', 'cargoHoldHeavyKg'], resolvedTotal, holdCap, totalCapacity);

  if (resolvedMD) { mdTypes.forEach(t => { mainDeck[t] = resolvedMD[t] || 0; }); }
  else { const def = _buildDefaultSplit(mainDeckCap, mdTypes); mdTypes.forEach(t => { mainDeck[t] = def[t]; }); }
  if (resolvedCH) { chTypes.forEach(t => { cargoHold[t] = resolvedCH[t] || 0; }); }
  else { const def = _buildDefaultSplit(holdCap, chTypes); chTypes.forEach(t => { cargoHold[t] = def[t]; }); }
  // Ensure oversized is always 0 in cargo hold
  cargoHold.oversized = 0;

  function stepFor(type) { return CARGO_TYPES[type].stepKg; }

  function makeSectionHelpers(cfg, cap, sectionTypes) {
    return {
      recalcAutoFill() {
        let used = 0;
        for (const t of sectionTypes) { if (t !== autoFillType) used += cfg[t]; }
        cfg[autoFillType] = Math.max(0, cap - used);
      },
      totalAllocated() { let s = 0; for (const t of sectionTypes) s += cfg[t]; return s; },
      canAdd(type) {
        if (type === autoFillType) return false;
        let other = 0;
        for (const t of sectionTypes) { if (t !== autoFillType && t !== type) other += cfg[t]; }
        return (cfg[type] + stepFor(type) + other) <= cap;
      },
      canRemove(type) { return type !== autoFillType && cfg[type] >= stepFor(type); }
    };
  }

  const mdH = makeSectionHelpers(mainDeck, mainDeckCap, mdTypes);
  const chH = makeSectionHelpers(cargoHold, holdCap, chTypes);
  mdH.recalcAutoFill();
  chH.recalcAutoFill();

  const overlay = document.createElement('div');
  overlay.id = 'cargoConfigOverlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:3000;display:flex;justify-content:center;align-items:center;padding:1rem;';

  function buildSectionTypeCtrl(section, type) {
    const ct = CARGO_TYPES[type];
    const isAuto = (type === autoFillType);
    const cfg = section === 'md' ? mainDeck : cargoHold;
    const id = `cargo_${section}_${type}`;
    return `
      <div data-cargo-tip="${type}" style="padding:0.35rem 0.45rem;background:var(--surface-elevated);border-radius:4px;border-left:3px solid ${ct.color};cursor:default;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:0.65rem;font-weight:600;color:${ct.color};">${ct.label.toUpperCase()}${type === 'oversized' ? ' <span style="font-size:0.45rem;font-weight:500;color:var(--text-muted);font-style:italic;">(Main deck only)</span>' : ''}</span>
          ${isAuto ? `
            <span id="${id}" style="font-weight:700;font-size:0.8rem;color:var(--text-primary);">${_formatKg(cfg[type])}</span>
          ` : `
            <div style="display:flex;align-items:center;gap:0.25rem;">
              <button class="cargo-adj-btn" data-section="${section}" data-type="${type}" data-delta="-1"
                style="width:22px;height:22px;border:1px solid var(--border-color);border-radius:3px;background:var(--surface);color:var(--text-primary);cursor:pointer;font-size:0.8rem;display:flex;align-items:center;justify-content:center;padding:0;">\u2212</button>
              <span id="${id}" style="font-weight:700;font-size:0.8rem;color:var(--text-primary);min-width:2.6rem;text-align:center;">${_formatKg(cfg[type])}</span>
              <button class="cargo-adj-btn" data-section="${section}" data-type="${type}" data-delta="1"
                style="width:22px;height:22px;border:1px solid var(--border-color);border-radius:3px;background:var(--surface);color:var(--text-primary);cursor:pointer;font-size:0.8rem;display:flex;align-items:center;justify-content:center;padding:0;">+</button>
            </div>
          `}
        </div>
        <div style="font-size:0.45rem;color:var(--text-muted);">${isAuto ? 'Auto-fill' : type === 'oversized' ? _formatKg(stepFor(type)) + ' steps · Main deck only' : _formatKg(stepFor(type)) + ' steps'}</div>
      </div>`;
  }

  function buildCategoryGroup(section, label, typeKeys) {
    const sTypes = section === 'md' ? mdTypes : chTypes;
    const available = typeKeys.filter(k => sTypes.includes(k));
    if (available.length === 0) return '';
    return `
      <div style="font-size:0.55rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.15rem;margin-top:0.2rem;">${label}</div>
      ${available.map(t => buildSectionTypeCtrl(section, t)).join('')}`;
  }

  function buildBarSegments(cfg, cap) {
    let html = '';
    for (const t of types) {
      if (cfg[t] <= 0) continue;
      const pct = (cfg[t] / cap) * 100;
      html += `<div style="width:${pct}%;height:100%;background:${CARGO_TYPES[t].color};transition:width 0.3s ease;"></div>`;
    }
    return html;
  }

  function grandTotalBar() {
    let html = '';
    for (const t of types) {
      const combined = (mainDeck[t] || 0) + (cargoHold[t] || 0);
      if (combined <= 0) continue;
      const pct = (combined / totalCapacity) * 100;
      html += `<div style="width:${pct}%;height:100%;background:${CARGO_TYPES[t].color};transition:width 0.3s ease;"></div>`;
    }
    return html;
  }

  overlay.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border-color);border-radius:10px;max-width:1100px;width:100%;max-height:96vh;overflow-y:auto;padding:1rem 1.2rem;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:0.2rem;">
        <h2 style="margin:0;color:var(--text-primary);font-size:1.15rem;">CARGO CONFIGURATION</h2>
        <span style="color:var(--text-muted);font-size:0.75rem;">
          ${aircraft.manufacturer} ${aircraft.model}${aircraft.variant ? ' ' + aircraft.variant : ''} \u00B7 ${_formatKg(totalCapacity)}
        </span>
      </div>

      <!-- Grand total bar -->
      <div style="margin-bottom:0.6rem;padding:0.4rem 0.6rem;background:var(--surface-elevated);border-radius:6px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.2rem;">
          <span style="font-size:0.65rem;color:var(--text-secondary);">Total Allocated</span>
          <span id="grandTotalLabel" style="font-size:0.9rem;font-weight:700;color:var(--text-primary);">${_formatKg(mdH.totalAllocated() + chH.totalAllocated())} / ${_formatKg(totalCapacity)}</span>
        </div>
        <div style="height:6px;background:var(--surface);border-radius:3px;overflow:hidden;display:flex;">
          <div id="grandTotalBar" style="display:flex;width:100%;height:100%;border-radius:3px;overflow:hidden;">${grandTotalBar()}</div>
        </div>
      </div>

      <!-- Side-by-side deck columns -->
      <div style="display:flex;gap:0.6rem;margin-bottom:0.6rem;">
        <!-- Main Deck -->
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;border:1px solid var(--border-color);border-radius:8px;overflow:hidden;">
          <div style="padding:0.5rem 0.6rem;background:rgba(139,92,246,0.1);border-bottom:1px solid var(--border-color);">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:0.8rem;font-weight:700;color:var(--text-primary);text-transform:uppercase;letter-spacing:0.5px;">Main Deck</span>
              <span style="font-size:0.7rem;font-weight:600;color:var(--text-muted);">${_formatKg(mainDeckCap)}</span>
            </div>
            <div style="height:5px;background:var(--surface);border-radius:3px;overflow:hidden;margin-top:0.25rem;display:flex;">
              <div id="bar_md" style="display:flex;width:100%;height:100%;border-radius:3px;overflow:hidden;">${buildBarSegments(mainDeck, mainDeckCap)}</div>
            </div>
          </div>
          <div style="display:flex;flex:1;min-height:0;">
            <div id="holdViz_md" style="width:200px;min-width:200px;padding:0.6rem;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.15);">
              ${renderContainerHold(mainDeck, mdTypes, mainDeckCap, 360, '_md')}
            </div>
            <div style="flex:1;padding:0.4rem 0.5rem;display:flex;flex-direction:column;gap:0.25rem;overflow-y:auto;">
              ${buildCategoryGroup('md', 'Core', CORE_TYPE_KEYS)}
              ${buildCategoryGroup('md', 'Special', SPECIAL_TYPE_KEYS)}
            </div>
          </div>
        </div>

        <!-- Cargo Hold -->
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;border:1px solid var(--border-color);border-radius:8px;overflow:hidden;">
          <div style="padding:0.5rem 0.6rem;background:rgba(59,130,246,0.1);border-bottom:1px solid var(--border-color);">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:0.8rem;font-weight:700;color:var(--text-primary);text-transform:uppercase;letter-spacing:0.5px;">Cargo Hold</span>
              <span style="font-size:0.7rem;font-weight:600;color:var(--text-muted);">${_formatKg(holdCap)}</span>
            </div>
            <div style="height:5px;background:var(--surface);border-radius:3px;overflow:hidden;margin-top:0.25rem;display:flex;">
              <div id="bar_ch" style="display:flex;width:100%;height:100%;border-radius:3px;overflow:hidden;">${buildBarSegments(cargoHold, holdCap)}</div>
            </div>
          </div>
          <div style="display:flex;flex:1;min-height:0;">
            <div id="holdViz_ch" style="width:200px;min-width:200px;padding:0.6rem;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.15);">
              ${renderContainerHold(cargoHold, chTypes, holdCap, 360, '_ch')}
            </div>
            <div style="flex:1;padding:0.4rem 0.5rem;display:flex;flex-direction:column;gap:0.25rem;overflow-y:auto;">
              ${buildCategoryGroup('ch', 'Core', CORE_TYPE_KEYS)}
              ${buildCategoryGroup('ch', 'Special', SPECIAL_TYPE_KEYS)}
            </div>
          </div>
        </div>
      </div>

      <!-- Action buttons -->
      <div style="display:flex;gap:0.5rem;">
        <button id="cargoApplyBtn" class="btn btn-primary" style="flex:1;padding:0.7rem;font-size:0.95rem;">Apply</button>
        <button id="cargoCancelBtn" class="btn btn-secondary" style="flex:1;padding:0.7rem;font-size:0.95rem;">Cancel</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  _attachTooltips(overlay);

  function updateHoldViz() {
    const mdViz = document.getElementById('holdViz_md');
    const chViz = document.getElementById('holdViz_ch');
    if (mdViz) mdViz.innerHTML = renderContainerHold(mainDeck, mdTypes, mainDeckCap, 360, '_md');
    if (chViz) chViz.innerHTML = renderContainerHold(cargoHold, chTypes, holdCap, 360, '_ch');
  }

  function updateUI() {
    mdH.recalcAutoFill();
    chH.recalcAutoFill();

    for (const t of mdTypes) {
      const mdEl = document.getElementById(`cargo_md_${t}`);
      if (mdEl) mdEl.textContent = _formatKg(mainDeck[t]);
    }
    for (const t of chTypes) {
      const chEl = document.getElementById(`cargo_ch_${t}`);
      if (chEl) chEl.textContent = _formatKg(cargoHold[t]);
    }

    const mdBar = document.getElementById('bar_md');
    const chBar = document.getElementById('bar_ch');
    if (mdBar) mdBar.innerHTML = buildBarSegments(mainDeck, mainDeckCap);
    if (chBar) chBar.innerHTML = buildBarSegments(cargoHold, holdCap);

    const gt = document.getElementById('grandTotalLabel');
    if (gt) gt.textContent = `${_formatKg(mdH.totalAllocated() + chH.totalAllocated())} / ${_formatKg(totalCapacity)}`;
    const gtBar = document.getElementById('grandTotalBar');
    if (gtBar) gtBar.innerHTML = grandTotalBar();

    for (const section of ['md', 'ch']) {
      const helpers = section === 'md' ? mdH : chH;
      const sTypes = section === 'md' ? mdTypes : chTypes;
      for (const t of sTypes) {
        if (t === autoFillType) continue;
        const mb = overlay.querySelector(`[data-section="${section}"][data-type="${t}"][data-delta="-1"]`);
        const pb = overlay.querySelector(`[data-section="${section}"][data-type="${t}"][data-delta="1"]`);
        if (mb) { mb.style.opacity = helpers.canRemove(t) ? '1' : '0.3'; mb.style.cursor = helpers.canRemove(t) ? 'pointer' : 'default'; }
        if (pb) { pb.style.opacity = helpers.canAdd(t) ? '1' : '0.3'; pb.style.cursor = helpers.canAdd(t) ? 'pointer' : 'default'; }
      }
    }

    updateHoldViz();
  }

  // Attach adjustment buttons
  overlay.querySelectorAll('.cargo-adj-btn').forEach(btn => {
    let holdTimer = null, holdInterval = null;
    function doStep() {
      const section = btn.dataset.section;
      const type = btn.dataset.type;
      const delta = parseInt(btn.dataset.delta);
      const cfg = section === 'md' ? mainDeck : cargoHold;
      const helpers = section === 'md' ? mdH : chH;
      const step = stepFor(type);
      if (delta > 0 && helpers.canAdd(type)) { cfg[type] += step; }
      else if (delta < 0 && helpers.canRemove(type)) { cfg[type] = Math.max(0, cfg[type] - step); }
      updateUI();
    }
    function stopHold() { clearTimeout(holdTimer); clearInterval(holdInterval); holdTimer = null; holdInterval = null; }
    btn.addEventListener('mousedown', (e) => { e.stopPropagation(); doStep(); holdTimer = setTimeout(() => { holdInterval = setInterval(doStep, 80); }, 400); });
    btn.addEventListener('mouseup', stopHold);
    btn.addEventListener('mouseleave', stopHold);
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); doStep(); holdTimer = setTimeout(() => { holdInterval = setInterval(doStep, 80); }, 400); });
    btn.addEventListener('touchend', stopHold);
    btn.addEventListener('touchcancel', stopHold);
  });

  document.getElementById('cargoApplyBtn').addEventListener('click', () => {
    _hideCargoTooltip(); document.body.removeChild(overlay);
    if (onApply) {
      const mdCfg = {};
      const chCfg = {};
      const totalCfg = {};
      CARGO_TYPE_KEYS.forEach(t => {
        mdCfg[t] = mainDeck[t] || 0;
        chCfg[t] = cargoHold[t] || 0;
        totalCfg[t] = mdCfg[t] + chCfg[t];
      });
      onApply({
        cargoConfig: totalCfg,
        mainDeckCargoConfig: mdCfg,
        cargoHoldCargoConfig: chCfg,
      });
    }
  });
  document.getElementById('cargoCancelBtn').addEventListener('click', () => { _hideCargoTooltip(); document.body.removeChild(overlay); });
  updateUI();
}

/* ── Shared helpers ──────────────────────────────────────────────────── */

function _attachAdjButtons(overlay, config, types, stepFor, canAdd, canRemove, updateUI) {
  overlay.querySelectorAll('.cargo-adj-btn').forEach(btn => {
    let holdTimer = null, holdInterval = null;
    function doStep() {
      const type = btn.dataset.type;
      const delta = parseInt(btn.dataset.delta);
      const step = stepFor(type);
      if (delta > 0 && canAdd(type)) { config[type] += step; }
      else if (delta < 0 && canRemove(type)) { config[type] = Math.max(0, config[type] - step); }
      updateUI();
    }
    function stopHold() { clearTimeout(holdTimer); clearInterval(holdInterval); holdTimer = null; holdInterval = null; }
    btn.addEventListener('mousedown', (e) => { e.stopPropagation(); doStep(); holdTimer = setTimeout(() => { holdInterval = setInterval(doStep, 80); }, 400); });
    btn.addEventListener('mouseup', stopHold);
    btn.addEventListener('mouseleave', stopHold);
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); doStep(); holdTimer = setTimeout(() => { holdInterval = setInterval(doStep, 80); }, 400); });
    btn.addEventListener('touchend', stopHold);
    btn.addEventListener('touchcancel', stopHold);
  });
}

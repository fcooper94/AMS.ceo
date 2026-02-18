/**
 * Cargo Configurator
 * Allocates cargo capacity (kg) between General, Light Freight, and Heavy Freight.
 * Shows a visual cargo hold diagram with colored blocks per type.
 */

const CARGO_COLORS = {
  light:    { bg: '#3B82F6', border: '#2563EB', label: 'General', code: 'Gen' },
  standard: { bg: '#10B981', border: '#059669', label: 'Light Freight', code: 'LF' },
  heavy:    { bg: '#F59E0B', border: '#D97706', label: 'Heavy Freight', code: 'HF' }
};

const CARGO_STEP = { light: 100, standard: 100, heavy: 500 }; // kg per click

/**
 * Render SVG cargo hold with proportional filled sections per type
 */
function renderCargoHold(config, types, totalCapacity, holdWidth) {
  const svgW = holdWidth;
  const svgH = 260;
  const pad = 8;
  const cornerR = 10;
  const innerX = pad + 4;
  const innerW = svgW - (innerX * 2);
  const innerY = pad + 4;
  const innerH = svgH - (innerY * 2);
  const innerR = 6;

  let html = `
    <svg viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="holdGrad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stop-color="rgba(100,116,139,0.18)"/>
          <stop offset="50%" stop-color="rgba(100,116,139,0.06)"/>
          <stop offset="100%" stop-color="rgba(100,116,139,0.18)"/>
        </linearGradient>
        <clipPath id="holdClip">
          <rect x="${innerX}" y="${innerY}" width="${innerW}" height="${innerH}" rx="${innerR}" ry="${innerR}"/>
        </clipPath>
      </defs>
      <!-- Hold outline -->
      <rect x="2" y="2" width="${svgW - 4}" height="${svgH - 4}" rx="${cornerR}" ry="${cornerR}"
            fill="url(#holdGrad)" stroke="rgba(100,116,139,0.35)" stroke-width="1.5"/>
      <!-- Inner hold area -->
      <rect x="${innerX}" y="${innerY}" width="${innerW}" height="${innerH}" rx="${innerR}" ry="${innerR}"
            fill="rgba(0,0,0,0.15)" stroke="rgba(100,116,139,0.2)" stroke-width="0.5"/>
  `;

  // Build proportional filled sections clipped to the inner hold
  const activeTypes = types.filter(t => config[t] > 0);
  if (activeTypes.length > 0) {
    html += `<g clip-path="url(#holdClip)">`;
    let curY = innerY;
    for (let i = 0; i < activeTypes.length; i++) {
      const t = activeTypes[i];
      const cc = CARGO_COLORS[t];
      const pct = config[t] / totalCapacity;
      const sectionH = i === activeTypes.length - 1
        ? (innerY + innerH) - curY  // last section fills remaining to avoid gaps
        : Math.round(innerH * pct);

      if (sectionH <= 0) continue;

      // Filled section
      html += `<rect x="${innerX}" y="${curY}" width="${innerW}" height="${sectionH}"
                fill="${cc.bg}" opacity="0.75"/>`;

      // Divider line between sections
      if (i > 0) {
        html += `<line x1="${innerX}" y1="${curY}" x2="${innerX + innerW}" y2="${curY}"
                  stroke="rgba(0,0,0,0.3)" stroke-width="1"/>`;
      }

      // Label + percentage in center of section
      const labelY = curY + sectionH / 2;
      const pctText = Math.round(pct * 100) + '%';
      if (sectionH > 22) {
        html += `<text x="${svgW / 2}" y="${labelY - 1}" text-anchor="middle" dominant-baseline="auto"
                  fill="rgba(255,255,255,0.9)" font-size="8" font-weight="700" font-family="system-ui, sans-serif">
                  ${cc.label.toUpperCase()}</text>`;
        html += `<text x="${svgW / 2}" y="${labelY + 10}" text-anchor="middle" dominant-baseline="auto"
                  fill="rgba(255,255,255,0.6)" font-size="6.5" font-weight="500" font-family="system-ui, sans-serif">
                  ${pctText}</text>`;
      } else if (sectionH > 12) {
        html += `<text x="${svgW / 2}" y="${labelY + 3}" text-anchor="middle" dominant-baseline="auto"
                  fill="rgba(255,255,255,0.8)" font-size="6.5" font-weight="700" font-family="system-ui, sans-serif">
                  ${cc.label.toUpperCase()} ${pctText}</text>`;
      }

      curY += sectionH;
    }
    html += `</g>`;
  } else {
    html += `<text x="${svgW / 2}" y="${svgH / 2}" text-anchor="middle" fill="rgba(100,116,139,0.4)"
              font-size="8" font-family="system-ui, sans-serif">Empty hold</text>`;
  }

  // Floor rail markers
  html += `
    <line x1="${pad + 8}" y1="${svgH - pad - 2}" x2="${svgW - pad - 8}" y2="${svgH - pad - 2}"
          stroke="rgba(100,116,139,0.15)" stroke-width="1" stroke-dasharray="4,3"/>
  `;

  html += `</svg>`;
  return html;
}

function showCargoConfigurator(aircraft, onApply, existingConfig) {
  if (!aircraft || !aircraft.cargoCapacityKg || aircraft.cargoCapacityKg <= 0) return;

  const totalCapacity = aircraft.cargoCapacityKg;

  // Which types does this aircraft support?
  const isCargo = aircraft.type === 'Cargo';
  const heavyCapable = aircraft.hasCargoHeavy || aircraft.type === 'Widebody' || isCargo;
  const types = [];
  if (!isCargo && aircraft.hasCargoLight !== false) types.push('light');
  if (aircraft.hasCargoStandard !== false) types.push('standard');
  if (heavyCapable) types.push('heavy');

  if (types.length === 0) return;

  // If only one type, auto-assign and skip modal
  if (types.length === 1) {
    const result = { cargoLightKg: 0, cargoStandardKg: 0, cargoHeavyKg: 0 };
    if (types[0] === 'light') result.cargoLightKg = totalCapacity;
    else if (types[0] === 'standard') result.cargoStandardKg = totalCapacity;
    else result.cargoHeavyKg = totalCapacity;
    if (onApply) onApply(result);
    return;
  }

  // The auto-fill type gets whatever remains (standard preferred, else last)
  // General (light) auto-fills remaining; for cargo aircraft (no general), light freight fills
  const autoFillType = types.includes('light') ? 'light' : types[0];

  const config = { light: 0, standard: 0, heavy: 0 };

  if (existingConfig) {
    config.light = existingConfig.cargoLightKg || 0;
    config.standard = existingConfig.cargoStandardKg || 0;
    config.heavy = existingConfig.cargoHeavyKg || 0;
  } else {
    config[autoFillType] = totalCapacity;
  }

  function recalcAutoFill() {
    let used = 0;
    for (const t of types) {
      if (t !== autoFillType) used += config[t];
    }
    config[autoFillType] = Math.max(0, totalCapacity - used);
  }

  function totalAllocated() {
    let sum = 0;
    for (const t of types) sum += config[t];
    return sum;
  }

  function stepFor(type) { return CARGO_STEP[type] || 100; }

  function canAdd(type) {
    if (type === autoFillType) return false;
    let otherUsed = 0;
    for (const t of types) {
      if (t !== autoFillType && t !== type) otherUsed += config[t];
    }
    return (config[type] + stepFor(type) + otherUsed) <= totalCapacity;
  }

  function canRemove(type) {
    if (type === autoFillType) return false;
    return config[type] >= stepFor(type);
  }

  recalcAutoFill();

  const overlay = document.createElement('div');
  overlay.id = 'cargoConfigOverlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.85); z-index: 3000;
    display: flex; justify-content: center; align-items: center;
    padding: 1rem;
  `;

  function formatKg(kg) {
    return kg >= 1000 ? (kg / 1000).toFixed(1) + 't' : kg + 'kg';
  }

  // Hold width varies by aircraft type
  const holdWidth = isCargo ? 220 : aircraft.type === 'Widebody' ? 200 : 160;

  function buildTypeCtrl(type) {
    const cc = CARGO_COLORS[type];
    const isAuto = (type === autoFillType);
    return `
      <div style="padding: 0.6rem; background: var(--surface-elevated); border-radius: 6px; border-left: 3px solid ${cc.bg};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem;">
          <span style="font-size: 0.75rem; font-weight: 600; color: ${cc.bg};">${cc.label.toUpperCase()}</span>
          ${isAuto ? `
            <span id="cargoCount_${type}" style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary);">${formatKg(config[type])}</span>
          ` : `
            <div style="display: flex; align-items: center; gap: 0.35rem;">
              <button class="cargo-adj-btn" data-type="${type}" data-delta="-1"
                style="width: 24px; height: 24px; border: 1px solid var(--border-color); border-radius: 4px;
                       background: var(--surface); color: var(--text-primary); cursor: pointer; font-size: 0.85rem;
                       display: flex; align-items: center; justify-content: center; padding: 0;">\u2212</button>
              <span id="cargoCount_${type}" style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary); min-width: 3rem; text-align: center;">${formatKg(config[type])}</span>
              <button class="cargo-adj-btn" data-type="${type}" data-delta="1"
                style="width: 24px; height: 24px; border: 1px solid var(--border-color); border-radius: 4px;
                       background: var(--surface); color: var(--text-primary); cursor: pointer; font-size: 0.85rem;
                       display: flex; align-items: center; justify-content: center; padding: 0;">+</button>
            </div>
          `}
        </div>
        <div style="font-size: 0.55rem; color: var(--text-muted);">${isAuto ? 'Fills remaining capacity' : 'Adjust in ' + formatKg(stepFor(type)) + ' increments'}</div>
      </div>
    `;
  }

  function renderLegend() {
    let html = `<div style="display: flex; gap: 0.6rem; margin-top: 0.5rem; flex-wrap: wrap; justify-content: center;">`;
    for (const t of types) {
      if (config[t] > 0) {
        const cc = CARGO_COLORS[t];
        html += `<div style="display: flex; align-items: center; gap: 0.25rem;">
          <div style="width: 8px; height: 8px; border-radius: 2px; background: ${cc.bg};"></div>
          <span style="font-size: 0.55rem; color: var(--text-muted);">${cc.label} (${formatKg(config[t])})</span>
        </div>`;
      }
    }
    html += `</div>`;
    return html;
  }

  overlay.innerHTML = `
    <div style="background: var(--surface); border: 1px solid var(--border-color); border-radius: 10px;
                display: flex; max-width: 700px; width: 100%; max-height: 90vh; overflow: hidden;">
      <!-- Left: Controls -->
      <div style="width: 280px; min-width: 280px; padding: 1.25rem; display: flex; flex-direction: column; border-right: 1px solid var(--border-color); overflow-y: auto;">
        <h2 style="margin: 0 0 0.4rem 0; color: var(--text-primary); font-size: 1rem;">CARGO CONFIGURATION</h2>
        <div style="color: var(--text-muted); font-size: 0.65rem; margin-bottom: 1rem;">
          ${aircraft.manufacturer} ${aircraft.model}${aircraft.variant ? ' ' + aircraft.variant : ''} \u00B7 ${formatKg(totalCapacity)} capacity
        </div>

        <div style="margin-bottom: 1rem; padding: 0.6rem; background: var(--surface-elevated); border-radius: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
            <span style="font-size: 0.7rem; color: var(--text-secondary);">Allocated</span>
            <span id="cargoTotalLabel" style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">${formatKg(totalAllocated())} / ${formatKg(totalCapacity)}</span>
          </div>
          <div style="height: 6px; background: var(--surface); border-radius: 3px; overflow: hidden; display: flex;">
            <div id="cargoBarSegments" style="display: flex; width: 100%; height: 100%; border-radius: 3px; overflow: hidden;">
              ${buildBarSegments()}
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 0.2rem;">
            <span style="font-size: 0.5rem; color: var(--text-muted);">Cargo hold</span>
            <span id="cargoSpacePercent" style="font-size: 0.5rem; color: var(--text-muted);">100%</span>
          </div>
        </div>

        <div id="cargoTypeControls" style="display: flex; flex-direction: column; gap: 0.6rem; flex: 1;">
          ${types.map(t => buildTypeCtrl(t)).join('')}
        </div>

        <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
          <button id="cargoApplyBtn" class="btn btn-primary" style="flex: 1; padding: 0.6rem; font-size: 0.85rem;">Apply</button>
          <button id="cargoCancelBtn" class="btn btn-secondary" style="flex: 1; padding: 0.6rem; font-size: 0.85rem;">Cancel</button>
        </div>
      </div>

      <!-- Right: Visual diagram -->
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: flex-start; align-items: center; padding: 1rem; min-height: 0; background: rgba(0,0,0,0.2);">
        <div id="cargoDiagramContainer" style="flex: 1; min-height: 0; width: 100%; display: flex; flex-direction: column; align-items: center; overflow: hidden;"></div>
      </div>
    </div>
  `;

  function buildBarSegments() {
    let html = '';
    for (const t of types) {
      if (config[t] <= 0) continue;
      const pct = (config[t] / totalCapacity) * 100;
      const cc = CARGO_COLORS[t];
      html += `<div style="width: ${pct}%; height: 100%; background: ${cc.bg}; transition: width 0.3s ease;"></div>`;
    }
    return html;
  }

  document.body.appendChild(overlay);

  function renderDiagram() {
    const container = document.getElementById('cargoDiagramContainer');
    if (!container) return;
    container.innerHTML = renderCargoHold(config, types, totalCapacity, holdWidth) + renderLegend();
  }

  function updateUI() {
    recalcAutoFill();
    for (const t of types) {
      const el = document.getElementById(`cargoCount_${t}`);
      if (el) el.textContent = formatKg(config[t]);
    }
    const totalLabel = document.getElementById('cargoTotalLabel');
    if (totalLabel) totalLabel.textContent = `${formatKg(totalAllocated())} / ${formatKg(totalCapacity)}`;

    const barEl = document.getElementById('cargoBarSegments');
    if (barEl) barEl.innerHTML = buildBarSegments();

    // Button states
    for (const t of types) {
      if (t === autoFillType) continue;
      const minusBtn = overlay.querySelector(`[data-type="${t}"][data-delta="-1"]`);
      const plusBtn = overlay.querySelector(`[data-type="${t}"][data-delta="1"]`);
      if (minusBtn) {
        minusBtn.style.opacity = canRemove(t) ? '1' : '0.3';
        minusBtn.style.cursor = canRemove(t) ? 'pointer' : 'default';
      }
      if (plusBtn) {
        plusBtn.style.opacity = canAdd(t) ? '1' : '0.3';
        plusBtn.style.cursor = canAdd(t) ? 'pointer' : 'default';
      }
    }
    renderDiagram();
  }

  overlay.querySelectorAll('.cargo-adj-btn').forEach(btn => {
    let holdTimer = null, holdInterval = null;
    function doStep() {
      const type = btn.dataset.type;
      const delta = parseInt(btn.dataset.delta);
      const step = stepFor(type);
      if (delta > 0 && canAdd(type)) {
        config[type] += step;
      } else if (delta < 0 && canRemove(type)) {
        config[type] = Math.max(0, config[type] - step);
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

  document.getElementById('cargoApplyBtn').addEventListener('click', () => {
    document.body.removeChild(overlay);
    if (onApply) {
      onApply({
        cargoLightKg: config.light,
        cargoStandardKg: config.standard,
        cargoHeavyKg: config.heavy
      });
    }
  });

  document.getElementById('cargoCancelBtn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  updateUI();
}

/**
 * Build a short cargo summary string like "5.0t Gen / 10.0t LF / 3.0t HF"
 */
function cargoConfigSummary(cfg) {
  if (!cfg) return null;
  const parts = [];
  if (cfg.cargoLightKg > 0) parts.push((cfg.cargoLightKg / 1000).toFixed(1) + 't Gen');
  if (cfg.cargoStandardKg > 0) parts.push((cfg.cargoStandardKg / 1000).toFixed(1) + 't LF');
  if (cfg.cargoHeavyKg > 0) parts.push((cfg.cargoHeavyKg / 1000).toFixed(1) + 't HF');
  return parts.join(' / ');
}

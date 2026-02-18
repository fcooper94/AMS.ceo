/**
 * Airspace Configuration
 * Allows the user to restrict FIR airspace regions, suspending routes that cross them.
 */

let map = null;
let firGeoJsonData = null;
let firLayerGroup = null;
let firLabelGroup = null;
let restrictedFirCodes = new Set();
let selectedFirCode = null;
let selectedFirName = null;
let firLayersByCode = new Map();
let pendingRemoveId = null;
let pendingRemoveFirCode = null;
let altFilterEnabled = false;

function toggleRestrictionsPanel() {
  document.getElementById('restrictionsPanel').classList.toggle('collapsed');
}

// ── Toast Notifications ──────────────────────────────────────────────────────

const TOAST_ICONS = {
  success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
  error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
};

function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

// ── Leaflet Loader ───────────────────────────────────────────────────────────

function loadLeaflet() {
  return new Promise((resolve, reject) => {
    if (typeof L !== 'undefined') { resolve(); return; }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Leaflet'));
    document.head.appendChild(script);
  });
}

// ── Initialization ───────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadLeaflet();
    initMap();
    await Promise.all([loadFirBoundaries(), loadRestrictions()]);
    renderFirBoundaries();

    // FIR search
    initFirSearch();

    // Altitude input hints
    const altMin = document.getElementById('altitudeMin');
    const altMax = document.getElementById('altitudeMax');
    if (altMin) altMin.addEventListener('input', () => updateAltitudeHint('altitudeMin', 'altMinHint'));
    if (altMax) altMax.addEventListener('input', () => updateAltitudeHint('altitudeMax', 'altMaxHint'));
  } catch (err) {
    console.error('[Airspace] Init failed:', err);
  }
});

function initMap() {
  map = L.map('map', {
    center: [30, 0],
    zoom: 3,
    minZoom: 2,
    maxZoom: 18,
    zoomControl: false,
    attributionControl: false,
    worldCopyJump: true,
    boxZoom: false
  });

  // Place zoom control top-right so it doesn't clash with the restrictions panel
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.control.attribution({ position: 'bottomleft' }).addAttribution(
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
  ).addTo(map);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 19,
    noWrap: false
  }).addTo(map);

  // Prevent map interaction through overlay panels
  document.querySelectorAll('.restrictions-panel, .altitude-filter-panel, .airspace-legend').forEach(el => {
    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);
  });
}

// ── Load FIR GeoJSON ─────────────────────────────────────────────────────────

async function loadFirBoundaries() {
  const response = await fetch('/data/fir-boundaries.geojson');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  firGeoJsonData = await response.json();
}

// ── Load Active Restrictions ─────────────────────────────────────────────────

async function loadRestrictions() {
  try {
    const response = await fetch('/api/airspace');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    restrictedFirCodes.clear();
    for (const r of data.restrictions) {
      restrictedFirCodes.add(r.firCode);
    }

    renderRestrictionsList(data.restrictions);
  } catch (err) {
    console.error('[Airspace] Failed to load restrictions:', err);
  }
}

function renderRestrictionsList(restrictions) {
  const list = document.getElementById('restrictionsList');
  const count = document.getElementById('restrictionCount');
  count.textContent = restrictions.length;

  const clearWrap = document.getElementById('clearAllWrap');
  if (clearWrap) clearWrap.style.display = restrictions.length > 1 ? '' : 'none';

  if (restrictions.length === 0) {
    list.innerHTML = '<div class="empty-state">No active airspace restrictions</div>';
    return;
  }

  list.innerHTML = restrictions.map(r => {
    const typeLabel = r.restrictionType === 'until_further_notice'
      ? 'Until further notice'
      : `${r.startDate} — ${r.endDate}`;
    const altLabel = (r.altitudeMin != null || r.altitudeMax != null)
      ? `FL${r.altitudeMin || 0}–FL${r.altitudeMax || 999}`
      : 'All altitudes';
    return `
      <div class="restriction-card" data-fir="${r.firCode}">
        <div class="restriction-card-header">
          <span class="restriction-fir-code">${r.firCode}</span>
          <button class="restriction-remove-btn" onclick="openRemoveModal('${r.id}', '${r.firCode}')" title="Remove restriction">Lift</button>
        </div>
        <div class="restriction-fir-name">${r.firName || r.firCode}</div>
        <div class="restriction-meta">
          <span>${typeLabel}</span>
          <span>${altLabel}</span>
        </div>
        <div class="restriction-meta" style="margin-top:0.2rem;">
          <span>${r.affectedRouteCount} route${r.affectedRouteCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ── Render FIR Polygons ──────────────────────────────────────────────────────

function renderFirBoundaries() {
  if (!firGeoJsonData || !map) return;

  if (firLayerGroup && map.hasLayer(firLayerGroup)) map.removeLayer(firLayerGroup);
  if (firLabelGroup && map.hasLayer(firLabelGroup)) map.removeLayer(firLabelGroup);

  firLayerGroup = L.layerGroup();
  firLabelGroup = L.layerGroup();
  firLayersByCode.clear();

  // Sort features so lower airspace renders on top (highest minFL first, lowest last = on top)
  const sortedData = {
    ...firGeoJsonData,
    features: [...firGeoJsonData.features].sort((a, b) => {
      const aMin = a.properties.minFL ?? 0;
      const bMin = b.properties.minFL ?? 0;
      return bMin - aMin;
    })
  };

  L.geoJSON(sortedData, {
    style: function(feature) {
      const firCode = feature.properties.id;
      const isRestricted = restrictedFirCodes.has(firCode);
      const isOceanic = feature.properties.oceanic === '1' || feature.properties.oceanic === 1;

      if (isRestricted) {
        return {
          color: 'rgba(248, 81, 73, 0.6)',
          weight: 1.5,
          fillColor: 'rgba(248, 81, 73, 0.12)',
          fillOpacity: 1,
          interactive: true
        };
      }
      return {
        color: isOceanic ? 'rgba(88, 166, 255, 0.25)' : 'rgba(88, 166, 255, 0.4)',
        weight: isOceanic ? 0.5 : 1,
        fillColor: 'rgba(88, 166, 255, 0.03)',
        fillOpacity: 1,
        dashArray: isOceanic ? '4, 4' : null,
        interactive: true
      };
    },
    onEachFeature: function(feature, layer) {
      const firCode = feature.properties.id;

      if (!firLayersByCode.has(firCode)) {
        firLayersByCode.set(firCode, []);
      }
      firLayersByCode.get(firCode).push(layer);

      firLayerGroup.addLayer(layer);

      // Tooltip with altitude info
      const p = feature.properties;
      const minLabel = p.minFL === 0 || p.minFL == null ? 'SFC' : `FL${p.minFL}`;
      const maxLabel = p.maxFL >= 999 || p.maxFL == null ? 'UNL' : `FL${p.maxFL}`;
      const altText = (p.minFL != null && p.maxFL != null) ? ` (${minLabel}–${maxLabel})` : '';
      layer.bindTooltip(`${firCode}${altText}`, {
        sticky: true,
        className: 'fir-tooltip',
        direction: 'top',
        offset: [0, -8]
      });

      layer.on('click', () => {
        if (restrictedFirCodes.has(firCode)) return;
        openRestrictionModal(firCode, feature.properties);
      });

      layer.on('mouseover', () => {
        if (!restrictedFirCodes.has(firCode)) {
          layer.setStyle({
            fillColor: 'rgba(88, 166, 255, 0.12)',
            color: 'rgba(88, 166, 255, 0.7)',
            weight: 2
          });
        }
      });
      layer.on('mouseout', () => {
        if (!restrictedFirCodes.has(firCode)) {
          const isOceanic = feature.properties.oceanic === '1' || feature.properties.oceanic === 1;
          layer.setStyle({
            color: isOceanic ? 'rgba(88, 166, 255, 0.25)' : 'rgba(88, 166, 255, 0.4)',
            weight: isOceanic ? 0.5 : 1,
            fillColor: 'rgba(88, 166, 255, 0.03)'
          });
        }
      });

      const props = feature.properties;
      if (props.label_lat && props.label_lon) {
        const isRestricted = restrictedFirCodes.has(firCode);
        const label = L.marker(
          [parseFloat(props.label_lat), parseFloat(props.label_lon)],
          {
            icon: L.divIcon({
              className: 'fir-label',
              html: `<span class="fir-label-text${isRestricted ? ' restricted' : ''}">${firCode}</span>`,
              iconSize: [60, 20],
              iconAnchor: [30, 10]
            }),
            interactive: false
          }
        );
        firLabelGroup.addLayer(label);
      }
    }
  });

  firLayerGroup.addTo(map);
  updateFirLabelVisibility();
  map.on('zoomend', updateFirLabelVisibility);

  // Re-apply altitude slider filter if active
  if (altFilterEnabled) {
    const fl = parseInt(document.getElementById('altSlider').value) || 0;
    if (fl > 0) applyAltitudeSlider(fl);
  }
}

function updateFirLabelVisibility() {
  if (!firLabelGroup) return;
  const zoom = map.getZoom();
  if (zoom >= 4) {
    if (!map.hasLayer(firLabelGroup)) firLabelGroup.addTo(map);
    // Re-apply altitude slider filter to labels if active
    if (altFilterEnabled) {
      const fl = parseInt(document.getElementById('altSlider').value) || 0;
      if (fl > 0) updateFilteredLabels(fl);
    }
  } else {
    if (map.hasLayer(firLabelGroup)) map.removeLayer(firLabelGroup);
  }
}

// ── FIR Search ───────────────────────────────────────────────────────────────

function initFirSearch() {
  const input = document.getElementById('firSearchInput');
  const results = document.getElementById('firSearchResults');
  if (!input || !results) return;

  input.addEventListener('input', () => {
    const query = input.value.trim().toUpperCase();
    if (query.length === 0) {
      results.classList.remove('visible');
      results.innerHTML = '';
      return;
    }
    renderFirSearchResults(query);
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.fir-search-wrap')) {
      results.classList.remove('visible');
    }
  });
}

function renderFirSearchResults(query) {
  const results = document.getElementById('firSearchResults');
  if (!firGeoJsonData) return;

  // Collect unique FIR codes with their properties
  const seen = new Set();
  const matches = [];
  for (const feature of firGeoJsonData.features) {
    const code = feature.properties.id;
    if (seen.has(code)) continue;
    seen.add(code);
    if (code.toUpperCase().includes(query)) {
      matches.push(feature.properties);
    }
  }

  // Sort: exact prefix match first, then alphabetical
  matches.sort((a, b) => {
    const aStarts = a.id.startsWith(query) ? 0 : 1;
    const bStarts = b.id.startsWith(query) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return a.id.localeCompare(b.id);
  });

  if (matches.length === 0) {
    results.classList.remove('visible');
    results.innerHTML = '';
    return;
  }

  results.innerHTML = matches.slice(0, 20).map(p => {
    const isRestricted = restrictedFirCodes.has(p.id);
    const minLabel = p.minFL === 0 || p.minFL == null ? 'SFC' : `FL${p.minFL}`;
    const maxLabel = p.maxFL >= 999 || p.maxFL == null ? 'UNL' : `FL${p.maxFL}`;
    const altText = (p.minFL != null && p.maxFL != null) ? `${minLabel}–${maxLabel}` : '';
    return `
      <div class="fir-search-item${isRestricted ? ' restricted' : ''}" data-fir="${p.id}" onclick="selectFirFromSearch('${p.id}')">
        <span class="fir-search-item-code">${p.id}</span>
        <span class="fir-search-item-alt">${altText}${isRestricted ? ' (restricted)' : ''}</span>
      </div>
    `;
  }).join('');

  results.classList.add('visible');
}

function selectFirFromSearch(firCode) {
  if (restrictedFirCodes.has(firCode)) return;

  // Find the feature properties for this FIR code
  const feature = firGeoJsonData.features.find(f => f.properties.id === firCode);
  if (!feature) return;

  // Close search
  const input = document.getElementById('firSearchInput');
  const results = document.getElementById('firSearchResults');
  input.value = '';
  results.classList.remove('visible');
  results.innerHTML = '';

  // Zoom to the FIR on the map
  const layers = firLayersByCode.get(firCode);
  if (layers && layers.length > 0) {
    const bounds = L.featureGroup(layers).getBounds();
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
  }

  // Open the restriction modal
  openRestrictionModal(firCode, feature.properties);
}

// ── Restriction Modal ────────────────────────────────────────────────────────

function toggleAltitudeMode() {
  const isCustom = document.querySelector('input[name="altitudeMode"][value="custom"]').checked;
  document.getElementById('altitudeRangeFields').style.display = isCustom ? 'flex' : 'none';
  document.getElementById('segAllAlt').classList.toggle('active', !isCustom);
  document.getElementById('segCustomAlt').classList.toggle('active', isCustom);
}

function updateAltitudeHint(inputId, hintId) {
  const val = parseInt(document.getElementById(inputId).value) || 0;
  const hint = document.getElementById(hintId);
  if (inputId === 'altitudeMin') {
    hint.textContent = val === 0 ? 'Surface' : `${(val * 100).toLocaleString()} ft`;
  } else {
    hint.textContent = val >= 999 ? 'Unlimited' : `${(val * 100).toLocaleString()} ft`;
  }
}

async function openRestrictionModal(firCode, props) {
  selectedFirCode = firCode;
  selectedFirName = props.id || firCode;

  document.getElementById('modalFirTitle').textContent = `Avoid Airspace — ${firCode}`;
  document.getElementById('modalFirCode').textContent = firCode;

  // Show altitude range if available
  const altEl = document.getElementById('modalFirAltitude');
  if (props.minFL != null && props.maxFL != null) {
    const minLabel = props.minFL === 0 ? 'SFC' : `FL${props.minFL}`;
    const maxLabel = props.maxFL >= 999 ? 'UNL' : `FL${props.maxFL}`;
    altEl.textContent = `${minLabel} — ${maxLabel}`;
  } else {
    altEl.textContent = '';
  }

  // Reset form
  document.querySelector('input[name="restrictionType"][value="until_further_notice"]').checked = true;
  toggleDateRange();

  // Reset altitude mode
  document.querySelector('input[name="altitudeMode"][value="all"]').checked = true;
  toggleAltitudeMode();
  document.getElementById('altitudeMin').value = props.minFL || 0;
  document.getElementById('altitudeMax').value = props.maxFL || 999;
  updateAltitudeHint('altitudeMin', 'altMinHint');
  updateAltitudeHint('altitudeMax', 'altMaxHint');

  // Reset confirm button
  const confirmBtn = document.getElementById('confirmBtn');
  confirmBtn.disabled = false;
  confirmBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:0.4rem;"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>AVOID AIRSPACE';

  // Show modal
  document.getElementById('restrictionModal').style.display = 'flex';

  // Show loading, hide results
  document.getElementById('affectedRoutesLoading').style.display = 'flex';
  document.getElementById('affectedRoutesList').style.display = 'none';
  document.getElementById('noAffectedRoutes').style.display = 'none';
  document.getElementById('warningBanner').style.display = 'none';
  const countBadge = document.getElementById('affectedCount');
  countBadge.textContent = '--';
  countBadge.classList.remove('zero');

  // Fetch affected routes
  try {
    const response = await fetch(`/api/airspace/affected-routes/${encodeURIComponent(firCode)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    document.getElementById('affectedRoutesLoading').style.display = 'none';
    countBadge.textContent = data.affectedRoutes.length;
    if (data.affectedRoutes.length === 0) countBadge.classList.add('zero');

    if (data.affectedRoutes.length === 0) {
      document.getElementById('noAffectedRoutes').style.display = 'block';
    } else {
      const list = document.getElementById('affectedRoutesList');
      list.style.display = 'block';
      list.innerHTML = data.affectedRoutes.map(r => {
        const depCode = r.departure?.icao || '???';
        const arrCode = r.arrival?.icao || '???';
        const reasonClass = r.reason;
        const reasonLabel = r.reason === 'departure' ? 'DEP IN FIR'
          : r.reason === 'arrival' ? 'ARR IN FIR'
          : 'TRANSIT';
        return `
          <div class="affected-route-row">
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <span class="route-pair">
                ${depCode} <span class="route-arrow">&rarr;</span> ${arrCode}
              </span>
              <span class="route-number">${r.routeNumber}</span>
            </div>
            <span class="route-reason ${reasonClass}">${reasonLabel}</span>
          </div>
        `;
      }).join('');

      // Show warning
      const airportRoutes = data.affectedRoutes.filter(r => r.reason === 'departure' || r.reason === 'arrival');
      const transitRoutes = data.affectedRoutes.filter(r => r.reason === 'transit');

      let warningText = '';
      if (airportRoutes.length > 0 && transitRoutes.length > 0) {
        warningText = `${airportRoutes.length} route(s) have airports inside this FIR and will be SUSPENDED. ${transitRoutes.length} route(s) transit through this airspace.`;
      } else if (airportRoutes.length > 0) {
        warningText = `${airportRoutes.length} route(s) have airports inside this FIR and will be SUSPENDED.`;
      } else {
        warningText = `${transitRoutes.length} route(s) transit through this airspace and will be SUSPENDED.`;
      }
      document.getElementById('warningText').textContent = warningText;
      document.getElementById('warningBanner').style.display = 'flex';
    }
  } catch (err) {
    console.error('[Airspace] Failed to fetch affected routes:', err);
    document.getElementById('affectedRoutesLoading').innerHTML = '<span style="color:#f85149;">Failed to check routes.</span>';
  }
}

function closeModal() {
  document.getElementById('restrictionModal').style.display = 'none';
  selectedFirCode = null;
  selectedFirName = null;
}

function toggleDateRange() {
  const isDateRange = document.querySelector('input[name="restrictionType"][value="date_range"]').checked;
  document.getElementById('dateRangeFields').style.display = isDateRange ? 'flex' : 'none';

  // Update segmented control active state
  document.getElementById('segUntilFurther').classList.toggle('active', !isDateRange);
  document.getElementById('segDateRange').classList.toggle('active', isDateRange);
}

// ── Create Restriction ───────────────────────────────────────────────────────

async function confirmRestriction() {
  if (!selectedFirCode) return;

  const restrictionType = document.querySelector('input[name="restrictionType"]:checked').value;
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;

  if (restrictionType === 'date_range' && (!startDate || !endDate)) {
    showToast('Please select both start and end dates.', 'error');
    return;
  }

  const confirmBtn = document.getElementById('confirmBtn');
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'APPLYING...';

  // Altitude filter
  const altitudeMode = document.querySelector('input[name="altitudeMode"]:checked').value;
  const altitudeMin = altitudeMode === 'custom' ? (parseInt(document.getElementById('altitudeMin').value) || 0) : null;
  const altitudeMax = altitudeMode === 'custom' ? (parseInt(document.getElementById('altitudeMax').value) || 999) : null;

  try {
    const response = await fetch('/api/airspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firCode: selectedFirCode,
        firName: selectedFirName,
        restrictionType,
        startDate: restrictionType === 'date_range' ? startDate : null,
        endDate: restrictionType === 'date_range' ? endDate : null,
        altitudeMin,
        altitudeMax
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to create restriction');
    }

    const data = await response.json();
    closeModal();
    await loadRestrictions();
    renderFirBoundaries();

    const count = data.suspendedRoutes?.length || 0;
    if (count > 0) {
      showToast(`${selectedFirCode || data.restriction.firCode} restricted — ${count} route(s) suspended`, 'success');
    } else {
      showToast(`${data.restriction.firCode} airspace restricted`, 'success');
    }
  } catch (err) {
    console.error('[Airspace] Failed to create restriction:', err);
    showToast(err.message, 'error');
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:0.4rem;"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>AVOID AIRSPACE';
  }
}

// ── Remove Restriction (styled modal) ────────────────────────────────────────

function openRemoveModal(id, firCode) {
  pendingRemoveId = id;
  pendingRemoveFirCode = firCode;
  document.getElementById('removeModalMessage').textContent = `Remove the airspace restriction for ${firCode}?`;
  document.getElementById('removeModal').style.display = 'flex';
}

function closeRemoveModal() {
  document.getElementById('removeModal').style.display = 'none';
  pendingRemoveId = null;
  pendingRemoveFirCode = null;
}

async function confirmRemoveRestriction() {
  if (!pendingRemoveId) return;

  const id = pendingRemoveId;
  const firCode = pendingRemoveFirCode;
  closeRemoveModal();

  try {
    const response = await fetch(`/api/airspace/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to remove restriction');
    }

    const data = await response.json();
    await loadRestrictions();
    renderFirBoundaries();

    if (data.reactivatedRouteCount > 0) {
      showToast(`${firCode} restriction lifted — ${data.reactivatedRouteCount} route(s) reactivated`, 'success');
    } else {
      showToast(`${firCode} restriction lifted`, 'success');
    }
  } catch (err) {
    console.error('[Airspace] Failed to remove restriction:', err);
    showToast(err.message, 'error');
  }
}

function clearAllRestrictions() {
  const count = restrictedFirCodes.size;
  if (count === 0) return;
  document.getElementById('clearAllMessage').textContent =
    `Remove all ${count} active airspace restriction${count !== 1 ? 's' : ''}?`;
  document.getElementById('clearAllModal').style.display = 'flex';
}

function closeClearAllModal() {
  document.getElementById('clearAllModal').style.display = 'none';
}

async function confirmClearAllRestrictions() {
  closeClearAllModal();
  try {
    const resp = await fetch('/api/airspace');
    if (!resp.ok) return;
    const data = await resp.json();
    const ids = data.restrictions.map(r => r.id);
    if (ids.length === 0) return;

    let lifted = 0;
    for (const id of ids) {
      const del = await fetch(`/api/airspace/${id}`, { method: 'DELETE' });
      if (del.ok) lifted++;
    }

    await loadRestrictions();
    renderFirBoundaries();
    showToast(`${lifted} restriction${lifted !== 1 ? 's' : ''} lifted`, 'success');
  } catch (err) {
    console.error('[Airspace] Failed to clear restrictions:', err);
    showToast(err.message, 'error');
  }
}

// ── Altitude Slider ──────────────────────────────────────────────────────────

function onAltSliderInput() {
  const slider = document.getElementById('altSlider');
  const fl = parseInt(slider.value) || 0;
  const readout = document.getElementById('altSliderReadout');

  // Update the filled portion of the track via CSS gradient
  const pct = (fl / 450) * 100;
  slider.style.background = `linear-gradient(to right, var(--accent-color, #58a6ff) ${pct}%, var(--surface-elevated, #161b22) ${pct}%)`;

  if (fl === 0) {
    // Slider at zero = show all sectors
    altFilterEnabled = false;
    readout.innerHTML = 'Sectors at <strong>all altitudes</strong>';
    resetAltitudeFilter();
    return;
  }

  altFilterEnabled = true;
  const feet = (fl * 100).toLocaleString();
  readout.innerHTML = `Sectors at <strong>FL${fl}</strong> (${feet}ft)`;

  applyAltitudeSlider(fl);
}

function applyAltitudeSlider(fl) {
  if (!firGeoJsonData || !map) return;

  let visible = 0;
  let hidden = 0;

  for (const feature of firGeoJsonData.features) {
    const firCode = feature.properties.id;
    const layers = firLayersByCode.get(firCode);
    if (!layers) continue;

    const firMin = feature.properties.minFL ?? 0;
    const firMax = feature.properties.maxFL ?? 999;

    // Sector is visible if the selected altitude falls within its range
    const contains = firMin <= fl && firMax >= fl;

    for (const layer of layers) {
      if (contains) {
        if (!firLayerGroup.hasLayer(layer)) firLayerGroup.addLayer(layer);
        visible++;
      } else {
        if (firLayerGroup.hasLayer(layer)) firLayerGroup.removeLayer(layer);
        hidden++;
      }
    }
  }

  // Update labels
  updateFilteredLabels(fl);

  // Stats
  const stats = document.getElementById('altSliderStats');
  stats.textContent = `${visible} visible · ${hidden} hidden`;
}

function updateFilteredLabels(fl) {
  if (!firLabelGroup || !firGeoJsonData) return;

  firLabelGroup.clearLayers();
  if (map.getZoom() < 4) return;

  for (const feature of firGeoJsonData.features) {
    const firCode = feature.properties.id;
    const firMin = feature.properties.minFL ?? 0;
    const firMax = feature.properties.maxFL ?? 999;

    if (firMin > fl || firMax < fl) continue;

    const props = feature.properties;
    if (props.label_lat && props.label_lon) {
      const isRestricted = restrictedFirCodes.has(firCode);
      const label = L.marker(
        [parseFloat(props.label_lat), parseFloat(props.label_lon)],
        {
          icon: L.divIcon({
            className: 'fir-label',
            html: `<span class="fir-label-text${isRestricted ? ' restricted' : ''}">${firCode}</span>`,
            iconSize: [60, 20],
            iconAnchor: [30, 10]
          }),
          interactive: false
        }
      );
      firLabelGroup.addLayer(label);
    }
  }
}

function resetAltitudeFilter() {
  if (!firGeoJsonData) return;

  for (const feature of firGeoJsonData.features) {
    const firCode = feature.properties.id;
    const layers = firLayersByCode.get(firCode);
    if (!layers) continue;

    for (const layer of layers) {
      if (!firLayerGroup.hasLayer(layer)) firLayerGroup.addLayer(layer);
    }
  }

  // Restore all labels
  if (firLabelGroup) {
    firLabelGroup.clearLayers();
    if (map.getZoom() >= 4) {
      for (const feature of firGeoJsonData.features) {
        const props = feature.properties;
        if (props.label_lat && props.label_lon) {
          const isRestricted = restrictedFirCodes.has(props.id);
          const label = L.marker(
            [parseFloat(props.label_lat), parseFloat(props.label_lon)],
            {
              icon: L.divIcon({
                className: 'fir-label',
                html: `<span class="fir-label-text${isRestricted ? ' restricted' : ''}">${props.id}</span>`,
                iconSize: [60, 20],
                iconAnchor: [30, 10]
              }),
              interactive: false
            }
          );
          firLabelGroup.addLayer(label);
        }
      }
    }
  }

  const stats = document.getElementById('altSliderStats');
  if (stats) stats.textContent = '';
}

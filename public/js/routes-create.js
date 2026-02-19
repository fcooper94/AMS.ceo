let baseAirport = null;
let worldInfo = null;

// Contractor timing multipliers (client-side mirror of contractorConfig.js)
const CONTRACTOR_MULTIPLIERS = {
  cleaning:  { budget: 0.85, standard: 1.0, premium: 1.20 },
  boarding:  { budget: 0.85, standard: 1.0, premium: 1.15 },
  deboarding:{ budget: 0.85, standard: 1.0, premium: 1.15 },
  fuelling:  { budget: 0.90, standard: 1.0, premium: 1.10 }
};

function getContractorModifiers() {
  if (!worldInfo) return null;
  const ct = worldInfo.cleaningContractor || 'standard';
  const gt = worldInfo.groundContractor || 'standard';
  return {
    cleaningMult: CONTRACTOR_MULTIPLIERS.cleaning[ct] || 1.0,
    boardingMult: CONTRACTOR_MULTIPLIERS.boarding[gt] || 1.0,
    deboardingMult: CONTRACTOR_MULTIPLIERS.deboarding[gt] || 1.0,
    fuellingMult: CONTRACTOR_MULTIPLIERS.fuelling[gt] || 1.0
  };
}
let availableAirports = [];
let selectedDestinationAirport = null;
let selectedTechStopAirport = null;
let userFleet = [];
let allRoutes = [];
let selectedDaysOfWeek = [1, 2, 3, 4, 5, 6, 0]; // Default: all days selected (Mon-Sun)
let globalPricing = null;
let aircraftTypePricing = {};
let aircraftDataById = {}; // Store aircraft data by ID for lookup
let demandDataCache = {}; // Cache demand data for airport pairs

// Route preview map variables
let routePreviewMap = null;
let routePreviewLine = null;
let routePreviewMarkers = [];
let expandedMap = null;
let expandedMapLayers = [];
let firGeoJsonCache = null;

// Debounced search for performance
let searchDebounceTimer = null;
function debouncedApplyFilters() {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    applyDestinationFilters();
  }, 150); // 150ms debounce
}

// Warning modal function
function showWarningModal(message, inputId = null) {
  // Highlight the input if provided
  if (inputId) {
    const input = document.getElementById(inputId);
    if (input) {
      input.style.borderColor = 'var(--warning-color)';
      input.style.boxShadow = '0 0 0 3px rgba(210, 153, 34, 0.3)';
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Remove highlight after 3 seconds
      setTimeout(() => {
        input.style.borderColor = '';
        input.style.boxShadow = '';
      }, 3000);
    }
  }

  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.id = 'warningModalOverlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.75);
    z-index: 2000;
    display: flex;
    justify-content: center;
    align-items: center;
  `;

  // Create modal content
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: var(--surface);
    border: 2px solid var(--warning-color);
    border-radius: 8px;
    padding: 1.5rem;
    width: 90%;
    max-width: 400px;
    text-align: center;
  `;

  modal.innerHTML = `
    <div style="margin-bottom: 1rem;">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--warning-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <circle cx="12" cy="17" r="0.5" fill="var(--warning-color)"></circle>
      </svg>
    </div>
    <p style="color: var(--text-primary); font-size: 1rem; margin-bottom: 1.5rem; line-height: 1.5;">${message}</p>
    <button id="warningModalCloseBtn" style="
      padding: 0.6rem 1.5rem;
      background: var(--warning-color);
      border: none;
      border-radius: 4px;
      color: #000;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.9rem;
    ">OK</button>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Close handlers
  const closeModal = () => {
    overlay.remove();
    if (inputId) {
      const input = document.getElementById(inputId);
      if (input) input.focus();
    }
  };

  document.getElementById('warningModalCloseBtn').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  });
}

// Loading overlay functions
function showLoadingOverlay(message = 'Loading...') {
  let overlay = document.getElementById('airportLoadingOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'airportLoadingOverlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(10, 15, 26, 0.95);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      color: var(--text-primary);
    `;
    overlay.innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: 1.5rem; margin-bottom: 1rem; color: var(--accent-color);">
          <div class="spinner" style="
            border: 4px solid var(--border-color);
            border-top: 4px solid var(--accent-color);
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1.5rem auto;
          "></div>
        </div>
        <div id="loadingMessage" style="font-size: 1.2rem; font-weight: 600; color: var(--text-primary);"></div>
        <div id="loading-quip-routes" style="font-size: 0.8rem; color: var(--text-muted); font-style: italic; margin-top: 0.75rem;"></div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    document.body.appendChild(overlay);
  }
  const messageEl = overlay.querySelector('#loadingMessage');
  if (messageEl) {
    messageEl.innerHTML = message;
  }
  overlay.style.display = 'flex';
  startLoadingQuips('loading-quip-routes');
}

function updateLoadingOverlay(message) {
  const overlay = document.getElementById('airportLoadingOverlay');
  if (overlay) {
    const messageEl = overlay.querySelector('#loadingMessage');
    if (messageEl) {
      messageEl.innerHTML = message;
    }
  }
}

function hideLoadingOverlay() {
  stopLoadingQuips();
  const overlay = document.getElementById('airportLoadingOverlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

// Leaflet loading for route preview map
function loadLeaflet() {
  return new Promise((resolve, reject) => {
    if (typeof L !== 'undefined') {
      resolve();
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Initialize route preview map
async function initRoutePreviewMap() {
  await loadLeaflet();
  const container = document.getElementById('routePreviewMap');
  if (!container || routePreviewMap) return;

  routePreviewMap = L.map('routePreviewMap', {
    center: [30, 0],
    zoom: 2,
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    touchZoom: false,
    doubleClickZoom: false,
    scrollWheelZoom: false,
    boxZoom: false,
    keyboard: false
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(routePreviewMap);
}

// Draw avoided FIR boundaries on a given map, returns array of added layers
async function drawAvoidedFirsOnMap(map, layers) {
  const avoidedFirs = autoAtcAvoidedFirs || [];
  if (avoidedFirs.length === 0) return;
  try {
    if (!firGeoJsonCache) {
      const resp = await fetch('/data/fir-boundaries.geojson');
      if (resp.ok) firGeoJsonCache = await resp.json();
    }
    if (!firGeoJsonCache) return;
    const avoidSet = new Set(avoidedFirs);
    const geoLayer = L.geoJSON(firGeoJsonCache, {
      filter: (feature) => avoidSet.has(feature.properties.id),
      style: () => ({
        color: 'rgba(248, 81, 73, 0.5)',
        weight: 1,
        fillColor: 'rgba(248, 81, 73, 0.08)',
        fillOpacity: 1,
        interactive: false
      })
    }).addTo(map);
    layers.push(geoLayer);
  } catch (e) { /* non-critical */ }
}

// Update route preview map
async function updateRoutePreview() {
  if (!routePreviewMap || !baseAirport || !selectedDestinationAirport) return;

  // If custom ATC is set, defer to that renderer
  if (customAtcWaypoints) {
    updateRoutePreviewWithCustomWaypoints();
    return;
  }

  // Clear existing markers and lines
  routePreviewMarkers.forEach(m => routePreviewMap.removeLayer(m));
  routePreviewMarkers = [];
  if (routePreviewLine) {
    routePreviewLine.forEach(l => routePreviewMap.removeLayer(l));
  }

  // Draw avoided FIR boundaries (underneath route)
  await drawAvoidedFirsOnMap(routePreviewMap, routePreviewMarkers);

  // Coordinates
  const dep = [parseFloat(baseAirport.latitude), parseFloat(baseAirport.longitude)];
  const arr = [parseFloat(selectedDestinationAirport.latitude), parseFloat(selectedDestinationAirport.longitude)];

  // Departure marker (green)
  const depMarker = L.circleMarker(dep, {
    radius: 8,
    fillColor: '#3fb950',
    fillOpacity: 1,
    color: '#fff',
    weight: 2
  }).addTo(routePreviewMap).bindPopup(`<b>${baseAirport.iataCode || baseAirport.icaoCode}</b><br>${baseAirport.name}`);
  routePreviewMarkers.push(depMarker);

  // Arrival marker (blue)
  const arrMarker = L.circleMarker(arr, {
    radius: 8,
    fillColor: '#58a6ff',
    fillOpacity: 1,
    color: '#fff',
    weight: 2
  }).addTo(routePreviewMap).bindPopup(`<b>${selectedDestinationAirport.iataCode || selectedDestinationAirport.icaoCode}</b><br>${selectedDestinationAirport.name}`);
  routePreviewMarkers.push(arrMarker);

  // Tech stop marker if present (yellow)
  if (selectedTechStopAirport) {
    const tech = [parseFloat(selectedTechStopAirport.latitude), parseFloat(selectedTechStopAirport.longitude)];
    const techMarker = L.circleMarker(tech, {
      radius: 6,
      fillColor: '#d29922',
      fillOpacity: 1,
      color: '#fff',
      weight: 2
    }).addTo(routePreviewMap).bindPopup(`<b>${selectedTechStopAirport.iataCode || selectedTechStopAirport.icaoCode}</b><br>Tech Stop`);
    routePreviewMarkers.push(techMarker);
  }

  // If auto ATC waypoints are available, draw the computed route
  if (autoAtcWaypoints && autoAtcWaypoints.length > 2) {
    const routeCoords = [dep];
    // Skip first (DEP) and last (ARR) — they are the airports
    const innerWps = autoAtcWaypoints.filter(wp => wp.name !== 'DEP' && wp.name !== 'ARR');
    for (const wp of innerWps) {
      const pt = [wp.lat, wp.lng];
      routeCoords.push(pt);

      // Small cyan waypoint marker
      const wpMarker = L.circleMarker(pt, {
        radius: 3, fillColor: '#22d3ee', fillOpacity: 1, color: 'rgba(34, 211, 238, 0.5)', weight: 1
      }).addTo(routePreviewMap).bindPopup(`<b>${wp.name}</b>`);
      routePreviewMarkers.push(wpMarker);
    }
    routeCoords.push(arr);

    // Solid cyan line through waypoints
    const line = L.polyline(routeCoords, {
      color: '#22d3ee',
      weight: 2,
      opacity: 0.8
    }).addTo(routePreviewMap);
    routePreviewLine = [line];

    // Draw NAT track overlay if present
    if (autoAtcNatTrack && autoAtcNatTrack.waypoints) {
      const natCoords = autoAtcNatTrack.waypoints.map(wp => [wp.lat, wp.lng]);
      const natLine = L.polyline(natCoords, {
        color: '#4ade80',
        weight: 2,
        opacity: 0.4,
        dashArray: '6, 4'
      }).addTo(routePreviewMap);
      routePreviewLine.push(natLine);
      routePreviewMarkers.push(natLine);

      // NAT track label at midpoint
      const midIdx = Math.floor(natCoords.length / 2);
      const natLabel = L.marker(natCoords[midIdx], {
        icon: L.divIcon({
          className: 'nat-preview-label',
          html: `<span>NAT ${autoAtcNatTrack.id}</span>`,
          iconSize: [50, 16],
          iconAnchor: [25, -4]
        })
      }).addTo(routePreviewMap);
      routePreviewMarkers.push(natLabel);
    }

    // Fit bounds to all points
    const bounds = L.latLngBounds(routeCoords);
    routePreviewMap.fitBounds(bounds, { padding: [15, 15], maxZoom: 8 });
  } else {
    // Fallback: dashed straight line
    routePreviewLine = drawRoutePreviewLine(dep, arr, selectedTechStopAirport);

    const bounds = L.latLngBounds([dep, arr]);
    if (selectedTechStopAirport) {
      bounds.extend([parseFloat(selectedTechStopAirport.latitude), parseFloat(selectedTechStopAirport.longitude)]);
    }
    routePreviewMap.fitBounds(bounds, { padding: [15, 15], maxZoom: 8 });
  }
}

// ── Expanded Route Map ──────────────────────────────────────────────────────

function openExpandedRouteMap() {
  if (!baseAirport || !selectedDestinationAirport) return;

  const modal = document.getElementById('expandedMapModal');
  modal.style.display = 'flex';

  // Set title
  const depCode = baseAirport.icaoCode || baseAirport.iataCode;
  const arrCode = selectedDestinationAirport.icaoCode || selectedDestinationAirport.iataCode;
  document.getElementById('expandedMapTitle').textContent = `ROUTE MAP — ${depCode} → ${arrCode}`;

  // Create map if needed, or just invalidate size
  const container = document.getElementById('expandedMapContainer');
  if (!expandedMap) {
    expandedMap = L.map(container, {
      center: [30, 0],
      zoom: 3,
      zoomControl: true,
      attributionControl: false,
      worldCopyJump: true
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(expandedMap);
  }

  // Small delay to let modal render, then invalidate + draw
  setTimeout(() => {
    expandedMap.invalidateSize();
    drawExpandedRoute();
  }, 100);

  // Close on Escape
  document.addEventListener('keydown', _expandedMapEsc);
}

function _expandedMapEsc(e) {
  if (e.key === 'Escape') closeExpandedRouteMap();
}

function closeExpandedRouteMap() {
  document.getElementById('expandedMapModal').style.display = 'none';
  document.removeEventListener('keydown', _expandedMapEsc);
}

async function drawExpandedRoute() {
  if (!expandedMap || !baseAirport || !selectedDestinationAirport) return;

  // Clear previous layers
  expandedMapLayers.forEach(l => expandedMap.removeLayer(l));
  expandedMapLayers = [];

  // Draw avoided FIR boundaries first (underneath the route) — interactive with tooltips
  const avoidedFirs = autoAtcAvoidedFirs || [];
  if (avoidedFirs.length > 0) {
    try {
      if (!firGeoJsonCache) {
        const resp = await fetch('/data/fir-boundaries.geojson');
        if (resp.ok) firGeoJsonCache = await resp.json();
      }
      if (firGeoJsonCache) {
        const avoidSet = new Set(avoidedFirs);
        const geoLayer = L.geoJSON(firGeoJsonCache, {
          filter: (feature) => avoidSet.has(feature.properties.id),
          style: () => ({
            color: 'rgba(248, 81, 73, 0.5)',
            weight: 1.5,
            fillColor: 'rgba(248, 81, 73, 0.1)',
            fillOpacity: 1,
            interactive: true
          }),
          onEachFeature: (feature, layer) => {
            const p = feature.properties;
            const minLabel = p.minFL === 0 || p.minFL == null ? 'SFC' : `FL${p.minFL}`;
            const maxLabel = p.maxFL >= 999 || p.maxFL == null ? 'UNL' : `FL${p.maxFL}`;
            layer.bindTooltip(`${p.id} (${minLabel}–${maxLabel})`, {
              sticky: true, className: 'fir-tooltip', direction: 'top', offset: [0, -8]
            });
          }
        }).addTo(expandedMap);
        expandedMapLayers.push(geoLayer);
      }
    } catch (e) { /* non-critical */ }
  }

  const dep = [parseFloat(baseAirport.latitude), parseFloat(baseAirport.longitude)];
  const arr = [parseFloat(selectedDestinationAirport.latitude), parseFloat(selectedDestinationAirport.longitude)];

  // Departure marker
  const depMarker = L.circleMarker(dep, {
    radius: 10, fillColor: '#3fb950', fillOpacity: 1, color: '#fff', weight: 2
  }).addTo(expandedMap).bindPopup(`<b>${baseAirport.iataCode || baseAirport.icaoCode}</b><br>${baseAirport.name}`);
  expandedMapLayers.push(depMarker);

  // Arrival marker
  const arrMarker = L.circleMarker(arr, {
    radius: 10, fillColor: '#58a6ff', fillOpacity: 1, color: '#fff', weight: 2
  }).addTo(expandedMap).bindPopup(`<b>${selectedDestinationAirport.iataCode || selectedDestinationAirport.icaoCode}</b><br>${selectedDestinationAirport.name}`);
  expandedMapLayers.push(arrMarker);

  // Tech stop
  if (selectedTechStopAirport) {
    const tech = [parseFloat(selectedTechStopAirport.latitude), parseFloat(selectedTechStopAirport.longitude)];
    const techMarker = L.circleMarker(tech, {
      radius: 7, fillColor: '#d29922', fillOpacity: 1, color: '#fff', weight: 2
    }).addTo(expandedMap).bindPopup(`<b>${selectedTechStopAirport.iataCode || selectedTechStopAirport.icaoCode}</b><br>Tech Stop`);
    expandedMapLayers.push(techMarker);
  }

  // Pick waypoints: custom or auto
  const wps = customAtcWaypoints || autoAtcWaypoints;

  if (wps && wps.length > 2) {
    const routeCoords = [dep];
    const innerWps = wps.filter(wp => wp.name !== 'DEP' && wp.name !== 'ARR');

    for (const wp of innerWps) {
      const pt = [wp.lat, wp.lng];
      routeCoords.push(pt);

      // Waypoint marker with label
      const wpMarker = L.circleMarker(pt, {
        radius: 4, fillColor: customAtcWaypoints ? '#e3b341' : '#22d3ee',
        fillOpacity: 1, color: 'rgba(255,255,255,0.3)', weight: 1
      }).addTo(expandedMap).bindPopup(`<b>${wp.name}</b>`);
      expandedMapLayers.push(wpMarker);

      // Waypoint name label (visible at higher zoom)
      const label = L.marker(pt, {
        icon: L.divIcon({
          className: 'expanded-wp-label',
          html: `<span style="font-size:9px; color:rgba(255,255,255,0.6); font-family:monospace; text-shadow:0 0 3px #000;">${wp.name}</span>`,
          iconSize: [60, 14],
          iconAnchor: [30, -6]
        }),
        interactive: false
      }).addTo(expandedMap);
      expandedMapLayers.push(label);
    }
    routeCoords.push(arr);

    const lineColor = customAtcWaypoints ? '#e3b341' : '#22d3ee';
    const line = L.polyline(routeCoords, { color: lineColor, weight: 2.5, opacity: 0.9 }).addTo(expandedMap);
    expandedMapLayers.push(line);

    // NAT track overlay
    if (!customAtcWaypoints && autoAtcNatTrack && autoAtcNatTrack.waypoints) {
      const natCoords = autoAtcNatTrack.waypoints.map(wp => [wp.lat, wp.lng]);
      const natLine = L.polyline(natCoords, {
        color: '#4ade80', weight: 2, opacity: 0.4, dashArray: '6, 4'
      }).addTo(expandedMap);
      expandedMapLayers.push(natLine);
    }

    expandedMap.fitBounds(L.latLngBounds(routeCoords), { padding: [40, 40], maxZoom: 10 });
  } else {
    // Fallback: dashed straight line
    const line = L.polyline([dep, arr], {
      color: '#58a6ff', weight: 2, opacity: 0.8, dashArray: '5, 10'
    }).addTo(expandedMap);
    expandedMapLayers.push(line);

    const bounds = L.latLngBounds([dep, arr]);
    expandedMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
  }
}

// Draw route line (handles tech stop) — fallback dashed line
function drawRoutePreviewLine(dep, arr, techStop) {
  const style = {
    color: '#58a6ff',
    weight: 2,
    opacity: 0.8,
    dashArray: '5, 10'
  };
  const lines = [];

  if (techStop) {
    const tech = [parseFloat(techStop.latitude), parseFloat(techStop.longitude)];
    lines.push(L.polyline([dep, tech], style).addTo(routePreviewMap));
    lines.push(L.polyline([tech, arr], style).addTo(routePreviewMap));
  } else {
    lines.push(L.polyline([dep, arr], style).addTo(routePreviewMap));
  }
  return lines;
}

// Fetch world info and base airport
async function fetchWorldInfo() {
  try {
    const response = await fetch('/api/world/info');
    if (response.ok) {
      worldInfo = await response.json();
      if (worldInfo.baseAirport) {
        baseAirport = worldInfo.baseAirport;
        document.getElementById('departureAirport').value =
          `${baseAirport.icaoCode} - ${baseAirport.name}`;
      }

      // Set route number prefix from airline IATA code
      if (worldInfo.iataCode) {
        document.getElementById('routePrefix').value = worldInfo.iataCode;
        document.getElementById('returnRoutePrefix').value = worldInfo.iataCode;
      }
    }
  } catch (error) {
    console.error('Error fetching world info:', error);
  }
}

// Fetch user's fleet
async function fetchUserFleet() {
  try {
    const response = await fetch('/api/fleet');
    if (response.ok) {
      userFleet = await response.json();
      populateFleetDropdown();
    }
  } catch (error) {
    console.error('Error fetching fleet:', error);
  }
}

// Fetch existing routes
async function fetchExistingRoutes() {
  try {
    const response = await fetch('/api/routes');
    if (response.ok) {
      allRoutes = await response.json();
    }
  } catch (error) {
    console.error('Error fetching routes:', error);
  }
}

// Populate fleet dropdown (by aircraft type only)
function populateFleetDropdown() {
  const select = document.getElementById('assignedAircraft');

  // Group aircraft by type and get unique types
  const aircraftTypes = {};
  userFleet.forEach(userAircraft => {
    const typeKey = `${userAircraft.aircraft.manufacturer} ${userAircraft.aircraft.model}${userAircraft.aircraft.variant ? (userAircraft.aircraft.variant.startsWith('-') ? userAircraft.aircraft.variant : '-' + userAircraft.aircraft.variant) : ''}`;
    if (!aircraftTypes[typeKey]) {
      aircraftTypes[typeKey] = {
        displayName: typeKey,
        aircraft: userAircraft.aircraft,
        userAircraftId: userAircraft.id, // Store the first UserAircraft ID of this type
        count: 0
      };
    }
    aircraftTypes[typeKey].count++;
  });

  // Build dropdown with aircraft types only and store aircraft data for lookup
  let html = '<option value="">-- Select aircraft type --</option>';

  Object.keys(aircraftTypes).sort().forEach(typeKey => {
    const typeInfo = aircraftTypes[typeKey];
    // Store aircraft data by UserAircraft ID for later lookup
    aircraftDataById[typeInfo.userAircraftId] = typeInfo.aircraft;
    // Store the UserAircraft ID in the value (not the Aircraft ID)
    html += `<option value='${typeInfo.userAircraftId}'>${typeInfo.displayName} (${typeInfo.count} available)</option>`;
  });

  select.innerHTML = html;
}

// Get aircraft type key from aircraft data
function getAircraftTypeKey(aircraftData) {
  if (!aircraftData) return null;
  return `${aircraftData.manufacturer}_${aircraftData.model}_${aircraftData.variant || 'default'}`;
}


// Handle aircraft selection change
function onAircraftSelectionChange() {
  const aircraftSelect = document.getElementById('assignedAircraft');
  const timingMapContainer = document.getElementById('flightTimingMapContainer');

  if (aircraftSelect.value) {
    try {
      // Look up aircraft data by ID
      const aircraftData = aircraftDataById[aircraftSelect.value];
      if (aircraftData) {
        updatePassengerClassAvailability(aircraftData);
        applyDefaultPricing(aircraftData);

        // Show flight timing and map container when aircraft is selected
        if (timingMapContainer) {
          timingMapContainer.style.display = 'grid';
          initRoutePreviewMap().then(() => {
            setTimeout(() => {
              if (routePreviewMap) {
                routePreviewMap.invalidateSize();
                updateRoutePreview();
              }
            }, 100);
          });
        }
      }
    } catch (e) {
      console.error('Error in aircraft selection change:', e);
    }
  } else {
    // No aircraft selected - hide timing/map container and reset fields
    if (timingMapContainer) {
      timingMapContainer.style.display = 'none';
    }
    updatePassengerClassAvailability(null);
  }

  calculateFlightTiming();
}

// Update passenger class field availability based on aircraft capabilities
function updatePassengerClassAvailability(aircraftData) {
  const economyField = document.getElementById('economyPrice');
  const economyPlusField = document.getElementById('economyPlusPrice');
  const businessField = document.getElementById('businessPrice');
  const firstField = document.getElementById('firstPrice');
  const cargoLightField = document.getElementById('cargoLightRate');
  const cargoStandardField = document.getElementById('cargoStandardRate');
  const cargoHeavyField = document.getElementById('cargoHeavyRate');

  if (!aircraftData) {
    // No aircraft selected - enable all fields
    [economyField, economyPlusField, businessField, firstField, cargoLightField, cargoStandardField, cargoHeavyField].forEach(field => {
      if (field) {
        field.disabled = false;
        field.style.opacity = '1';
        field.style.cursor = 'text';
        // Update label to remove "(not available)" text
        const label = field.closest('div').querySelector('label');
        if (label) {
          label.innerHTML = label.innerHTML.replace(' <span style="color: var(--text-muted); font-weight: normal;">(not available on this aircraft)</span>', '');
        }
      }
    });
    return;
  }

  // Economy class
  if (economyField) {
    const hasEconomy = aircraftData?.hasEconomy !== false;
    economyField.disabled = !hasEconomy;
    economyField.style.opacity = hasEconomy ? '1' : '0.5';
    economyField.style.cursor = hasEconomy ? 'text' : 'not-allowed';
    if (!hasEconomy) economyField.value = '';
    updateFieldLabel(economyField, hasEconomy);
  }

  // Economy Plus class
  if (economyPlusField) {
    const hasEconomyPlus = aircraftData?.hasEconomyPlus === true;
    economyPlusField.disabled = !hasEconomyPlus;
    economyPlusField.style.opacity = hasEconomyPlus ? '1' : '0.5';
    economyPlusField.style.cursor = hasEconomyPlus ? 'text' : 'not-allowed';
    if (!hasEconomyPlus) economyPlusField.value = '';
    updateFieldLabel(economyPlusField, hasEconomyPlus);
  }

  // Business class
  if (businessField) {
    const hasBusiness = aircraftData?.hasBusiness === true;
    businessField.disabled = !hasBusiness;
    businessField.style.opacity = hasBusiness ? '1' : '0.5';
    businessField.style.cursor = hasBusiness ? 'text' : 'not-allowed';
    if (!hasBusiness) businessField.value = '';
    updateFieldLabel(businessField, hasBusiness);
  }

  // First class
  if (firstField) {
    const hasFirst = aircraftData?.hasFirst === true;
    firstField.disabled = !hasFirst;
    firstField.style.opacity = hasFirst ? '1' : '0.5';
    firstField.style.cursor = hasFirst ? 'text' : 'not-allowed';
    if (!hasFirst) firstField.value = '';
    updateFieldLabel(firstField, hasFirst);
  }

  // Light cargo
  if (cargoLightField) {
    const hasCargoLight = aircraftData?.hasCargoLight !== false;
    cargoLightField.disabled = !hasCargoLight;
    cargoLightField.style.opacity = hasCargoLight ? '1' : '0.5';
    cargoLightField.style.cursor = hasCargoLight ? 'text' : 'not-allowed';
    if (!hasCargoLight) cargoLightField.value = '';
    updateFieldLabel(cargoLightField, hasCargoLight);
  }

  // Standard cargo
  if (cargoStandardField) {
    const hasCargoStandard = aircraftData?.hasCargoStandard !== false;
    cargoStandardField.disabled = !hasCargoStandard;
    cargoStandardField.style.opacity = hasCargoStandard ? '1' : '0.5';
    cargoStandardField.style.cursor = hasCargoStandard ? 'text' : 'not-allowed';
    if (!hasCargoStandard) cargoStandardField.value = '';
    updateFieldLabel(cargoStandardField, hasCargoStandard);
  }

  // Heavy cargo
  if (cargoHeavyField) {
    const hasCargoHeavy = aircraftData?.hasCargoHeavy === true;
    cargoHeavyField.disabled = !hasCargoHeavy;
    cargoHeavyField.style.opacity = hasCargoHeavy ? '1' : '0.5';
    cargoHeavyField.style.cursor = hasCargoHeavy ? 'text' : 'not-allowed';
    if (!hasCargoHeavy) cargoHeavyField.value = '';
    updateFieldLabel(cargoHeavyField, hasCargoHeavy);
  }

  console.log('Updated class/cargo availability:', {
    economy: aircraftData?.hasEconomy !== false,
    economyPlus: aircraftData?.hasEconomyPlus === true,
    business: aircraftData?.hasBusiness === true,
    first: aircraftData?.hasFirst === true,
    cargoLight: aircraftData?.hasCargoLight !== false,
    cargoStandard: aircraftData?.hasCargoStandard !== false,
    cargoHeavy: aircraftData?.hasCargoHeavy === true
  });
}

// Helper function to update field label with availability indicator
function updateFieldLabel(field, isAvailable) {
  const label = field.closest('div').querySelector('label');
  if (!label) return;

  // Remove existing "(not available)" text
  label.innerHTML = label.innerHTML.replace(' <span style="color: var(--text-muted); font-weight: normal;">(not available on this aircraft)</span>', '');

  // Add "(not available)" text if field is not available
  if (!isAvailable) {
    label.innerHTML += ' <span style="color: var(--text-muted); font-weight: normal;">(not available on this aircraft)</span>';
  }
}

// Fetch global pricing defaults
async function fetchGlobalPricing() {
  try {
    const response = await fetch('/api/pricing/global');
    if (response.ok) {
      globalPricing = await response.json();
      console.log('Global pricing loaded:', globalPricing);
      // Apply global defaults immediately if no aircraft selected
      applyDefaultPricing(null);
    }
  } catch (error) {
    console.error('Error fetching global pricing:', error);
  }
}

// Fetch aircraft type pricing
async function fetchAircraftTypePricing() {
  try {
    const response = await fetch('/api/pricing/aircraft-types');
    if (response.ok) {
      aircraftTypePricing = await response.json();
      console.log('Aircraft type pricing loaded:', Object.keys(aircraftTypePricing).length, 'types');
    }
  } catch (error) {
    console.error('Error fetching aircraft type pricing:', error);
  }
}

// Apply default pricing based on global defaults and aircraft type
function applyDefaultPricing(aircraftData) {
  if (!globalPricing) return; // No pricing loaded yet

  const typeKey = aircraftData ? getAircraftTypeKey(aircraftData) : null;
  const typePricing = typeKey ? aircraftTypePricing[typeKey] : null;

  // Helper to get effective price (aircraft type override or global default)
  const getPrice = (field) => {
    if (typePricing && typePricing[field] != null) {
      return typePricing[field];
    }
    return globalPricing[field] || 0;
  };

  // Only apply if fields are empty and enabled (don't override user input, skip disabled classes)
  const economyField = document.getElementById('economyPrice');
  const economyPlusField = document.getElementById('economyPlusPrice');
  const businessField = document.getElementById('businessPrice');
  const firstField = document.getElementById('firstPrice');
  const cargoLightField = document.getElementById('cargoLightRate');
  const cargoStandardField = document.getElementById('cargoStandardRate');
  const cargoHeavyField = document.getElementById('cargoHeavyRate');

  if (economyField && !economyField.disabled && !economyField.value) economyField.value = getPrice('economyPrice');
  if (economyPlusField && !economyPlusField.disabled && !economyPlusField.value) economyPlusField.value = getPrice('economyPlusPrice');
  if (businessField && !businessField.disabled && !businessField.value) businessField.value = getPrice('businessPrice');
  if (firstField && !firstField.disabled && !firstField.value) firstField.value = getPrice('firstPrice');
  if (cargoLightField && !cargoLightField.disabled && !cargoLightField.value) cargoLightField.value = getPrice('cargoLightRate');
  if (cargoStandardField && !cargoStandardField.disabled && !cargoStandardField.value) cargoStandardField.value = getPrice('cargoStandardRate');
  if (cargoHeavyField && !cargoHeavyField.disabled && !cargoHeavyField.value) cargoHeavyField.value = getPrice('cargoHeavyRate');
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3440.065; // Radius of Earth in nautical miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Load available airports for destination selection
async function loadAvailableAirports() {
  try {
    // Show loading state
    document.getElementById('availableAirportsList').innerHTML = `
      <div style="padding: 3rem; text-align: center; color: var(--text-muted);">
        <div style="margin-bottom: 0.5rem;">Loading airports & demand data...</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">This may take a moment on first load</div>
      </div>
    `;

    // Fetch airports and demand in parallel
    const [airportsResponse, demandResponse] = await Promise.all([
      fetch('/api/world/airports'),
      fetch(`/api/world/airports/${baseAirport.id}/demand?limit=500`)
    ]);

    if (airportsResponse.ok) {
      const data = await airportsResponse.json();
      const airports = data.airports || data;

      // Filter out the base airport and calculate distances
      availableAirports = airports
        .filter(airport => airport.icaoCode !== baseAirport.icaoCode)
        .map(airport => {
          const distance = calculateDistance(
            baseAirport.latitude,
            baseAirport.longitude,
            airport.latitude,
            airport.longitude
          );
          return { ...airport, distance };
        });

      // Process demand data if available
      if (demandResponse.ok) {
        const demandData = await demandResponse.json();
        if (demandData.destinations) {
          demandData.destinations.forEach(dest => {
            if (dest.airport) {
              demandDataCache[dest.airport.id] = {
                demand: dest.demand,
                demandCategory: dest.demandCategory,
                routeType: dest.routeType,
                indicators: dest.indicators || null
              };
            }
          });
        }
        // Mark remaining airports as having no demand
        availableAirports.forEach(airport => {
          if (!demandDataCache[airport.id]) {
            demandDataCache[airport.id] = {
              demand: 0,
              demandCategory: 'none',
              routeType: null
            };
          }
        });
      }

      // Now display everything at once
      populateCountryFilter();
      populateTimezoneFilter();
      applyDestinationFilters();
    }
  } catch (error) {
    console.error('Error loading airports:', error);
    document.getElementById('availableAirportsList').innerHTML = `
      <div style="padding: 3rem; text-align: center; color: var(--warning-color);">
        Error loading airports
      </div>
    `;
  }
}

// Fetch demand data for visible airports
async function loadDemandForAirports(airports) {
  if (!baseAirport || !airports || airports.length === 0) return;

  try {
    // Fetch top 500 destinations from base airport (increased from 100)
    const response = await fetch(`/api/world/airports/${baseAirport.id}/demand?limit=500`);
    if (response.ok) {
      const data = await response.json();

      // Cache demand data by destination airport ID
      if (data.destinations) {
        data.destinations.forEach(dest => {
          if (dest.airport) {
            demandDataCache[dest.airport.id] = {
              demand: dest.demand,
              demandCategory: dest.demandCategory,
              routeType: dest.routeType,
              indicators: dest.indicators || null
            };
          }
        });
      }

      // Mark remaining airports as having no demand data
      airports.forEach(airport => {
        if (!demandDataCache[airport.id]) {
          demandDataCache[airport.id] = {
            demand: 0,
            demandCategory: 'none',
            routeType: null
          };
        }
      });
    }
  } catch (error) {
    console.error('Error loading demand data:', error);
  }
}

// Populate country filter dropdown
function populateCountryFilter() {
  const countries = [...new Set(availableAirports.map(a => a.country))].sort();
  const countryFilter = document.getElementById('countryFilter');
  countryFilter.innerHTML = '<option value="">-- All countries --</option>' +
    countries.map(country => `<option value="${country}">${country}</option>`).join('');
}

// Populate timezone filter dropdown
function populateTimezoneFilter() {
  const timezones = [...new Set(availableAirports.map(a => a.timezone).filter(tz => tz))].sort();
  const timezoneFilter = document.getElementById('timezoneFilter');
  timezoneFilter.innerHTML = '<option value="">Any</option>' +
    timezones.map(tz => `<option value="${tz}">${tz}</option>`).join('');
}

// Filter airports by continent (updates country filter)
function filterAirportsByContinent() {
  const continent = document.getElementById('continentFilter').value;
  const countryFilter = document.getElementById('countryFilter');

  if (!continent) {
    // Show all countries
    populateCountryFilter();
  } else {
    // Filter countries by continent
    const filteredCountries = availableAirports
      .map(a => a.country)
      .filter(country => continentCountries[continent]?.includes(country));

    const uniqueCountries = [...new Set(filteredCountries)].sort();

    countryFilter.innerHTML = '<option value="">-- All countries --</option>' +
      uniqueCountries.map(country => `<option value="${country}">${country}</option>`).join('');
  }

  applyDestinationFilters();
}

// Apply haul type filter (sets range values and applies filters)
function applyHaulTypeFilter() {
  const haulType = document.getElementById('haulTypeFilter').value;
  const minRangeInput = document.getElementById('minRange');
  const maxRangeInput = document.getElementById('maxRange');

  switch (haulType) {
    case 'short':
      minRangeInput.value = '';
      maxRangeInput.value = '1500';
      break;
    case 'medium':
      minRangeInput.value = '1500';
      maxRangeInput.value = '3500';
      break;
    case 'long':
      minRangeInput.value = '3500';
      maxRangeInput.value = '';
      break;
    default:
      minRangeInput.value = '';
      maxRangeInput.value = '';
  }

  applyDestinationFilters();
}

// Continent to countries mapping (shared)
const continentCountries = {
  'Africa': ['South Africa', 'Nigeria', 'Kenya', 'Ethiopia', 'Morocco', 'Algeria', 'Tunisia', 'Ghana', 'Tanzania', 'Uganda', 'Zimbabwe', 'Angola', 'Mozambique', 'Egypt', 'Senegal', 'Ivory Coast', 'Cameroon', 'Zambia', 'Botswana', 'Namibia', 'Rwanda', 'Mauritius', 'Madagascar', 'Seychelles', 'Cape Verde', 'Libya', 'Sudan'],
  'Asia': ['China', 'Japan', 'South Korea', 'India', 'Singapore', 'Malaysia', 'Indonesia', 'Thailand', 'Philippines', 'Vietnam', 'Hong Kong', 'Taiwan', 'Pakistan', 'Bangladesh', 'Sri Lanka', 'Nepal', 'Myanmar', 'Cambodia', 'Laos', 'Brunei', 'Maldives', 'Mongolia', 'Kazakhstan', 'Uzbekistan', 'Turkmenistan', 'Kyrgyzstan', 'Tajikistan', 'Afghanistan', 'Iran', 'Iraq', 'Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Jordan', 'Lebanon', 'Israel', 'Syria', 'Yemen', 'Azerbaijan', 'Georgia', 'Armenia'],
  'Europe': ['United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Poland', 'Czech Republic', 'Czechia', 'Portugal', 'Greece', 'Turkey', 'Russia', 'Ukraine', 'Romania', 'Hungary', 'Bulgaria', 'Serbia', 'Croatia', 'Slovenia', 'Slovakia', 'Ireland', 'Iceland', 'Luxembourg', 'Estonia', 'Latvia', 'Lithuania', 'Belarus', 'Moldova', 'Albania', 'North Macedonia', 'Montenegro', 'Bosnia and Herzegovina', 'Kosovo', 'Malta', 'Cyprus'],
  'North America': ['United States', 'Canada', 'Mexico', 'Costa Rica', 'Panama', 'Cuba', 'Jamaica', 'Dominican Republic', 'Puerto Rico', 'Haiti', 'Guatemala', 'Honduras', 'El Salvador', 'Nicaragua', 'Belize', 'Bahamas', 'Trinidad and Tobago', 'Barbados', 'Bermuda', 'Cayman Islands', 'Aruba', 'Curacao'],
  'South America': ['Brazil', 'Argentina', 'Chile', 'Colombia', 'Peru', 'Venezuela', 'Ecuador', 'Bolivia', 'Paraguay', 'Uruguay', 'Guyana', 'Suriname', 'French Guiana'],
  'Oceania': ['Australia', 'New Zealand', 'Fiji', 'Papua New Guinea', 'Samoa', 'Tonga', 'Vanuatu', 'Solomon Islands', 'New Caledonia', 'French Polynesia', 'Guam']
};

// Apply all destination filters
function applyDestinationFilters() {
  const searchKeyword = document.getElementById('searchKeyword').value.toLowerCase();
  const continent = document.getElementById('continentFilter').value;
  const country = document.getElementById('countryFilter').value;
  const timezone = document.getElementById('timezoneFilter').value;
  const minRange = parseFloat(document.getElementById('minRange').value) || 0;
  const maxRange = parseFloat(document.getElementById('maxRange').value) || 0;
  const excludeExisting = document.getElementById('excludeExistingRoutes').checked;

  // Get existing route destinations
  const existingDestinations = allRoutes.map(r => r.arrivalAirport.icaoCode);

  let filtered = availableAirports.filter(airport => {
    // Search keyword filter
    if (searchKeyword && !(
      airport.icaoCode.toLowerCase().includes(searchKeyword) ||
      airport.iataCode?.toLowerCase().includes(searchKeyword) ||
      airport.name.toLowerCase().includes(searchKeyword) ||
      airport.city.toLowerCase().includes(searchKeyword)
    )) {
      return false;
    }

    // Continent filter
    if (continent && !continentCountries[continent]?.includes(airport.country)) {
      return false;
    }

    // Country filter
    if (country && airport.country !== country) {
      return false;
    }

    // Timezone filter
    if (timezone && airport.timezone !== timezone) {
      return false;
    }

    // Range filter
    if (minRange > 0 || maxRange > 0) {
      if (minRange > 0 && airport.distance < minRange) return false;
      if (maxRange > 0 && airport.distance > maxRange) return false;
    }

    // Exclude existing routes
    if (excludeExisting && existingDestinations.includes(airport.icaoCode)) {
      return false;
    }

    return true;
  });

  // Get sort order from dropdown
  const sortOrder = document.getElementById('sortOrder')?.value || 'demand';

  // Sort based on selected order
  filtered.sort((a, b) => {
    if (sortOrder === 'closest') {
      return a.distance - b.distance;
    } else if (sortOrder === 'furthest') {
      return b.distance - a.distance;
    } else {
      // Default: sort by demand (high to low), distance as tiebreaker
      const demandA = demandDataCache[a.id]?.demand || 0;
      const demandB = demandDataCache[b.id]?.demand || 0;
      if (demandB !== demandA) {
        return demandB - demandA;
      }
      return a.distance - b.distance;
    }
  });

  // Update badge
  const badge = document.getElementById('airportCountBadge');
  if (badge) {
    badge.textContent = `${filtered.length} AIRPORT${filtered.length !== 1 ? 'S' : ''}`;
  }

  // Display filtered airports
  displayAvailableAirports(filtered);
}

// Helper: factor bar for tooltip breakdowns (renders a small colored bar)
function tooltipFactorBar(value, max, label, color) {
  const pct = Math.round((value / max) * 100);
  return `
    <div style="display: flex; align-items: center; gap: 0.4rem; margin: 0.2rem 0;">
      <span style="width: 75px; font-size: 0.65rem; color: #ccc; text-align: right;">${label}</span>
      <div style="flex: 1; height: 5px; background: #333; border-radius: 2px; min-width: 60px;">
        <div style="width: ${pct}%; height: 100%; background: ${color}; border-radius: 2px;"></div>
      </div>
      <span style="font-size: 0.6rem; color: #aaa; width: 28px;">${value.toFixed ? value.toFixed(2) : value}</span>
    </div>`;
}

// Generate yield indicator (compact, no label)
function generateYieldIndicator(airport) {
  const demandData = demandDataCache[airport.id];
  const indicators = demandData?.indicators;

  if (!indicators) {
    return `<div style="text-align: center; color: var(--text-muted); font-size: 0.75rem;">--</div>`;
  }

  const score = indicators.yieldScore;
  const b = indicators.yieldBreakdown || {};
  let label, color;
  if (score >= 75) { label = '$$$$'; color = '#22c55e'; }
  else if (score >= 50) { label = '$$$'; color = '#84cc16'; }
  else if (score >= 25) { label = '$$'; color = '#f59e0b'; }
  else { label = '$'; color = '#ef4444'; }

  // Build pros/cons list for yield tooltip
  const yieldPoints = [];
  if (b.incomeFactor != null) {
    // Wealth assessment
    if (b.incomeFactor >= 1.4) yieldPoints.push({ good: true, text: 'Wealthy markets' });
    else if (b.incomeFactor >= 1.0) yieldPoints.push({ good: true, text: 'Good economies' });
    else if (b.incomeFactor >= 0.7) yieldPoints.push({ good: null, text: 'Average income' });
    else yieldPoints.push({ good: false, text: 'Low income markets' });

    // Hub/airport type assessment
    if (b.hubPremium != null) {
      if (b.hubPremium >= 1.10) yieldPoints.push({ good: true, text: 'Major destination airport' });
      else if (b.hubPremium <= 0.85) yieldPoints.push({ good: false, text: 'Small destination airport' });
    }

    // Distance assessment
    const dk = b.distKm || 0;
    if (dk < 500) yieldPoints.push({ good: false, text: 'Very short route' });
    else if (dk < 1200) yieldPoints.push({ good: null, text: 'Short haul' });
    else if (dk < 1800) yieldPoints.push({ good: true, text: 'Medium haul' });
    else if (dk < 4000) yieldPoints.push({ good: true, text: 'Ideal range' });
    else if (dk < 7000) yieldPoints.push({ good: null, text: 'Long haul' });
    else yieldPoints.push({ good: false, text: 'Ultra long haul' });
  }

  const tooltipContent = yieldPoints.length > 0 ? `
    <div style="font-weight: 600; margin-bottom: 0.4rem; font-size: 0.7rem; color: #fff;">Yield</div>
    ${yieldPoints.map(p => {
      const icon = p.good === true ? '+' : p.good === false ? '−' : '~';
      const col = p.good === true ? '#22c55e' : p.good === false ? '#ef4444' : '#f59e0b';
      return `<div style="display: flex; align-items: center; gap: 0.35rem; margin: 0.15rem 0;">
        <span style="font-size: 0.75rem; font-weight: 700; color: ${col}; width: 10px; text-align: center;">${icon}</span>
        <span style="font-size: 0.65rem; color: #ccc;">${p.text}</span>
      </div>`;
    }).join('')}
    <div style="margin-top: 0.35rem; font-size: 0.6rem; color: #888;">
      ${b.originCountry || '??'} $${(b.originGdp || 0).toLocaleString()} / ${b.destCountry || '??'} $${(b.destGdp || 0).toLocaleString()}<br>
      ${(b.distKm || 0).toLocaleString()} km
    </div>
  ` : '';

  return `
    <div class="indicator-hover" style="cursor: help;">
      <span style="font-size: 0.8rem; font-weight: 700; color: ${color}; letter-spacing: 0.5px;">${label}</span>
      ${tooltipContent ? `<div class="indicator-tooltip">${tooltipContent}</div>` : ''}
    </div>
  `;
}

// Generate class mix indicator (compact stacked bar with tooltip)
function generateClassMixIndicator(airport) {
  const demandData = demandDataCache[airport.id];
  const indicators = demandData?.indicators;

  if (!indicators || !indicators.classMix) {
    return `<div style="text-align: center; color: var(--text-muted); font-size: 0.75rem;">--</div>`;
  }

  const cm = indicators.classMix;
  const pe = cm.premiumEconomy || 0;

  // Label by dominant class character
  let label, color;
  const totalPremium = (cm.first || 0) + (cm.business || 0) + pe;
  if (cm.first >= 20) { label = 'First'; color = '#f59e0b'; }
  else if (cm.business >= 20) { label = 'Bus'; color = '#a78bfa'; }
  else if (totalPremium >= 15) { label = 'Mix'; color = '#60a5fa'; }
  else { label = 'Eco'; color = '#84cc16'; }

  const tooltipContent = `
    <div style="font-weight: 600; margin-bottom: 0.4rem; font-size: 0.7rem; color: #fff;">Cabin Class Mix</div>
    <div style="display: flex; height: 10px; border-radius: 3px; overflow: hidden; margin-bottom: 0.4rem;">
      ${cm.first > 0 ? `<div style="width: ${cm.first}%; background: #f59e0b;"></div>` : ''}
      ${cm.business > 0 ? `<div style="width: ${cm.business}%; background: #a78bfa;"></div>` : ''}
      ${pe > 0 ? `<div style="width: ${pe}%; background: #22d3ee;"></div>` : ''}
      <div style="width: ${cm.economy}%; background: #60a5fa;"></div>
    </div>
    <div style="font-size: 0.65rem; color: #ccc; line-height: 1.6;">
      ${cm.first > 0 ? `<div style="display: flex; justify-content: space-between;">
        <span><span style="display: inline-block; width: 7px; height: 7px; background: #f59e0b; border-radius: 1px; margin-right: 4px;"></span>First</span>
        <span style="font-weight: 600;">${cm.first}%</span>
      </div>` : ''}
      ${cm.business > 0 ? `<div style="display: flex; justify-content: space-between;">
        <span><span style="display: inline-block; width: 7px; height: 7px; background: #a78bfa; border-radius: 1px; margin-right: 4px;"></span>Business</span>
        <span style="font-weight: 600;">${cm.business}%</span>
      </div>` : ''}
      ${pe > 0 ? `<div style="display: flex; justify-content: space-between;">
        <span><span style="display: inline-block; width: 7px; height: 7px; background: #22d3ee; border-radius: 1px; margin-right: 4px;"></span>Prem Eco</span>
        <span style="font-weight: 600;">${pe}%</span>
      </div>` : ''}
      <div style="display: flex; justify-content: space-between;">
        <span><span style="display: inline-block; width: 7px; height: 7px; background: #60a5fa; border-radius: 1px; margin-right: 4px;"></span>Economy</span>
        <span style="font-weight: 600;">${cm.economy}%</span>
      </div>
    </div>
  `;

  return `
    <div class="indicator-hover" style="cursor: help;">
      <span style="font-size: 0.7rem; font-weight: 600; color: ${color};">${label}</span>
      <div class="indicator-tooltip">${tooltipContent}</div>
    </div>
  `;
}

// Generate competition indicator (compact, no label)
function generateCompetitionIndicator(airport) {
  const demandData = demandDataCache[airport.id];
  const indicators = demandData?.indicators;

  if (!indicators) {
    return `<div style="text-align: center; color: var(--text-muted); font-size: 0.75rem;">--</div>`;
  }

  const score = indicators.competitionScore;
  const count = indicators.competitorCount || 0;
  const b = indicators.competitionBreakdown || {};
  let label, color;
  if (count === 0) { label = 'None'; color = '#22c55e'; }
  else if (score >= 67) { label = 'High'; color = '#ef4444'; }
  else if (score >= 34) { label = 'Med'; color = '#f59e0b'; }
  else { label = 'Low'; color = '#22c55e'; }

  const tooltipContent = `
    <div style="font-weight: 600; margin-bottom: 0.3rem; font-size: 0.7rem; color: #fff;">Competition (Score: ${score})</div>
    <div style="font-size: 0.65rem; color: #ccc; line-height: 1.6;">
      <div style="display: flex; justify-content: space-between;">
        <span>Airlines on route:</span>
        <span style="color: ${count === 0 ? '#22c55e' : count >= 3 ? '#ef4444' : '#f59e0b'}; font-weight: 600;">${count}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>Rival hub here:</span>
        <span style="color: ${b.hasHub ? '#ef4444' : '#22c55e'}; font-weight: 600;">${b.hasHub ? 'Yes' : 'No'}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>Slot congestion:</span>
        <span style="color: ${(b.congestion || 0) > 0 ? '#f59e0b' : '#22c55e'}; font-weight: 600;">${b.congestion || 0}%</span>
      </div>
    </div>
  `;

  return `
    <div class="indicator-hover" style="cursor: help;">
      <span style="font-size: 0.75rem; font-weight: 600; color: ${color};">${label}</span>
      <div class="indicator-tooltip">${tooltipContent}</div>
    </div>
  `;
}

// Generate access indicator (compact, no label)
function generateAccessIndicator(airport) {
  const demandData = demandDataCache[airport.id];
  const indicators = demandData?.indicators;

  if (!indicators) {
    return `<div style="text-align: center; color: var(--text-muted); font-size: 0.75rem;">--</div>`;
  }

  const score = indicators.accessScore;
  const b = indicators.accessBreakdown || {};
  let label, color;
  if (score >= 67) { label = 'Hard'; color = '#ef4444'; }
  else if (score >= 34) { label = 'Med'; color = '#f59e0b'; }
  else { label = 'Easy'; color = '#22c55e'; }

  const tooltipContent = `
    <div style="font-weight: 600; margin-bottom: 0.3rem; font-size: 0.7rem; color: #fff;">Access (Score: ${score})</div>
    <div style="font-size: 0.65rem; color: #ccc; line-height: 1.6;">
      <div style="display: flex; justify-content: space-between;">
        <span>Airport type:</span>
        <span style="font-weight: 600;">${b.airportType || '?'}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>Type restriction:</span>
        <span style="color: ${(b.typeRisk || 0) > 15 ? '#ef4444' : (b.typeRisk || 0) > 5 ? '#f59e0b' : '#22c55e'}; font-weight: 600;">${b.typeRisk || 0}%</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>Congestion risk:</span>
        <span style="color: ${(b.congestionRisk || 0) > 0 ? '#f59e0b' : '#22c55e'}; font-weight: 600;">${b.congestionRisk || 0}%</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>Spare capacity:</span>
        <span style="font-weight: 600;">${b.spareCapacity != null ? b.spareCapacity + '%' : '?'}</span>
      </div>
    </div>
  `;

  return `
    <div class="indicator-hover" style="cursor: help;">
      <span style="font-size: 0.75rem; font-weight: 600; color: ${color};">${label}</span>
      <div class="indicator-tooltip">${tooltipContent}</div>
    </div>
  `;
}

// Generate demand indicator (compact bar + number)
function generateDemandIndicator(airport) {
  const demandData = demandDataCache[airport.id];

  if (!demandData) {
    return `<div style="text-align: center; color: var(--text-muted); font-size: 0.75rem;">--</div>`;
  }

  if (demandData.routeType === 'cargo') {
    return `<div style="text-align: center; color: #6366f1; font-size: 0.75rem; font-weight: 600;">Cargo</div>`;
  }

  const demand = demandData.demand || 0;
  const fillPercent = demand === 0 ? 0 : Math.round(Math.sqrt(demand / 100) * 100);

  let labelColor;
  if (demand >= 60) labelColor = '#22c55e';
  else if (demand >= 40) labelColor = '#84cc16';
  else if (demand >= 25) labelColor = '#eab308';
  else if (demand >= 12) labelColor = '#f59e0b';
  else labelColor = '#ef4444';

  return `
    <div style="display: flex; align-items: center; gap: 0.3rem; justify-content: center;">
      <div style="position: relative; width: 48px; height: 7px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08);">
        <div style="position: absolute; left: 0; top: 0; height: 100%; width: ${fillPercent}%;
          background: linear-gradient(90deg, #ef4444 0%, #f59e0b 25%, #eab308 45%, #84cc16 65%, #22c55e 100%);
          border-radius: 2px 0 0 2px;"></div>
      </div>
      <span style="font-size: 0.75rem; color: ${labelColor}; font-weight: 700; min-width: 16px;">${demand}</span>
    </div>
  `;
}

// Virtual scrolling state
let currentFilteredAirports = [];
let displayedAirportCount = 0;
const AIRPORTS_BATCH_SIZE = 50;
let airportListObserver = null;

// Render a single airport item
function renderAirportItem(airport) {
  const isSelected = selectedDestinationAirport?.id === airport.id;
  return `
    <div
      class="airport-row${isSelected ? ' selected' : ''}"
      data-airport-id="${airport.id}"
    >
      <div class="airport-select-zone" onclick="selectDestinationAirport('${airport.id}')">
        <span style="color: var(--text-primary); font-weight: 600; font-size: 0.85rem;">${airport.icaoCode}</span>
        <span style="color: var(--text-muted); font-size: 0.8rem; margin-left: 0.4rem;">${airport.city}, ${airport.country}</span>
      </div>
      <div style="text-align: center; color: var(--accent-color); font-weight: 600; font-size: 0.8rem; white-space: nowrap;">${Math.round(airport.distance)} <span style="font-weight: 400; font-size: 0.65rem; color: var(--text-muted);">nm</span></div>
      ${generateDemandIndicator(airport)}
      ${generateYieldIndicator(airport)}
      ${generateClassMixIndicator(airport)}
      ${generateCompetitionIndicator(airport)}
    </div>
  `;
}

// Load more airports (for infinite scroll)
function loadMoreAirports() {
  const container = document.getElementById('availableAirportsList');
  const loadMoreSentinel = document.getElementById('loadMoreSentinel');

  if (displayedAirportCount >= currentFilteredAirports.length) {
    // All airports displayed, remove sentinel
    if (loadMoreSentinel) loadMoreSentinel.remove();
    return;
  }

  const nextBatch = currentFilteredAirports.slice(
    displayedAirportCount,
    displayedAirportCount + AIRPORTS_BATCH_SIZE
  );

  const html = nextBatch.map(renderAirportItem).join('');

  // Insert before the sentinel
  if (loadMoreSentinel) {
    loadMoreSentinel.insertAdjacentHTML('beforebegin', html);
  } else {
    container.insertAdjacentHTML('beforeend', html);
  }

  displayedAirportCount += nextBatch.length;

  // Update remaining count on sentinel
  const remaining = currentFilteredAirports.length - displayedAirportCount;
  if (loadMoreSentinel && remaining > 0) {
    loadMoreSentinel.querySelector('.remaining-count').textContent = `${remaining} more`;
  } else if (loadMoreSentinel && remaining <= 0) {
    loadMoreSentinel.remove();
  }
}

// Display available airports with virtual scrolling
function displayAvailableAirports(airports) {
  const container = document.getElementById('availableAirportsList');

  // Clean up previous observer
  if (airportListObserver) {
    airportListObserver.disconnect();
    airportListObserver = null;
  }

  // Reset state
  currentFilteredAirports = airports;
  displayedAirportCount = 0;

  if (airports.length === 0) {
    container.innerHTML = `
      <div style="padding: 3rem; text-align: center; color: var(--text-muted);">
        No airports match your filters
      </div>
    `;
    return;
  }

  // Render initial batch
  const initialBatch = airports.slice(0, AIRPORTS_BATCH_SIZE);
  const html = initialBatch.map(renderAirportItem).join('');
  displayedAirportCount = initialBatch.length;

  // Add load more sentinel if there are more airports
  const remaining = airports.length - displayedAirportCount;
  const sentinelHtml = remaining > 0 ? `
    <div id="loadMoreSentinel" style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
      <span class="remaining-count">${remaining} more</span> airports • Scroll to load more
    </div>
  ` : '';

  const headerHtml = `
    <div class="airport-list-header">
      <span>Airport</span>
      <span>Dist</span>
      <span>Demand</span>
      <span>Yield</span>
      <span>Class</span>
      <span>Comp</span>
    </div>
  `;
  container.innerHTML = headerHtml + html + sentinelHtml;

  // Set up IntersectionObserver for infinite scroll
  if (remaining > 0) {
    const sentinel = document.getElementById('loadMoreSentinel');
    if (sentinel) {
      airportListObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          loadMoreAirports();
        }
      }, { rootMargin: '100px' });
      airportListObserver.observe(sentinel);
    }
  }
}

// Select destination airport
function selectDestinationAirport(airportId) {
  selectedDestinationAirport = availableAirports.find(a => a.id === airportId);

  // Update row selection visuals
  document.querySelectorAll('.airport-row').forEach(row => {
    row.classList.toggle('selected', row.dataset.airportId === airportId);
  });

  // Clear auto ATC waypoints and fetch new preview for new destination
  autoAtcWaypoints = null;
  autoAtcAvoidedFirs = [];
  if (selectedDestinationAirport) {
    fetchAtcRoutePreview();
  }

  // Clear any existing tech stop when changing destination
  if (selectedTechStopAirport) {
    selectedTechStopAirport = null;
    const techStopCheckbox = document.getElementById('includeTechStop');
    if (techStopCheckbox) {
      techStopCheckbox.checked = false;
      toggleTechStopSection();
    }
  }

  if (selectedDestinationAirport) {
    // Update selected destination panel in step 1
    const panelStep1 = document.getElementById('selectedDestinationPanelStep1');
    panelStep1.style.display = 'block';

    // Hide the search panel for cleaner UI
    document.getElementById('destinationSearchPanel').style.display = 'none';

    document.getElementById('selectedDestNameStep1').textContent =
      `${selectedDestinationAirport.icaoCode} - ${selectedDestinationAirport.name}`;

    document.getElementById('selectedDestDetailsStep1').textContent =
      `${selectedDestinationAirport.city}, ${selectedDestinationAirport.country} • ${selectedDestinationAirport.type}`;

    document.getElementById('selectedDestDistanceStep1').textContent =
      `${Math.round(selectedDestinationAirport.distance)} NM`;

    // Populate route stats from cached indicator data
    populateRouteStats(selectedDestinationAirport);

    // Fetch and display competing airlines
    fetchCompetitors(baseAirport.id, selectedDestinationAirport.id);

    // Scroll to selected destination panel
    panelStep1.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Populate route stats from cached indicator data
function populateRouteStats(airport) {
  const demandData = demandDataCache[airport.id];
  const indicators = demandData?.indicators;

  // Demand stat
  const demand = demandData?.demand;
  const demandEl = document.getElementById('statDemand');
  if (demand != null) {
    const cat = demandData.demandCategory || 'very_low';
    const catColors = { very_high: '#22c55e', high: '#3b82f6', medium: '#f59e0b', low: '#9ca3af', very_low: '#6b7280' };
    demandEl.style.color = catColors[cat] || '#9ca3af';
    demandEl.textContent = demand;
  } else {
    demandEl.textContent = '--';
    demandEl.style.color = 'var(--text-primary)';
  }

  // Yield stat
  const yieldEl = document.getElementById('statYield');
  if (indicators?.yieldScore != null) {
    const s = indicators.yieldScore;
    let label, color;
    if (s >= 75) { label = '$$$$'; color = '#22c55e'; }
    else if (s >= 50) { label = '$$$'; color = '#84cc16'; }
    else if (s >= 25) { label = '$$'; color = '#f59e0b'; }
    else { label = '$'; color = '#ef4444'; }
    yieldEl.textContent = label;
    yieldEl.style.color = color;
  } else {
    yieldEl.textContent = '--';
    yieldEl.style.color = 'var(--text-primary)';
  }

  // Class mix stat — stacked bar with labels
  const classEl = document.getElementById('statClassMix');
  if (indicators?.classMix) {
    const cm = indicators.classMix;
    const segments = [];
    if (cm.first > 0) segments.push({ pct: cm.first, label: 'First', color: '#f59e0b' });
    if (cm.business > 0) segments.push({ pct: cm.business, label: 'Bus', color: '#a78bfa' });
    if (cm.premiumEconomy > 0) segments.push({ pct: cm.premiumEconomy, label: 'Prm', color: '#22d3ee' });
    segments.push({ pct: cm.economy, label: 'Eco', color: '#84cc16' });

    const bar = segments.map(s =>
      `<div style="width: ${s.pct}%; background: ${s.color}; height: 100%; min-width: 2px;" title="${s.label} ${s.pct}%"></div>`
    ).join('');

    const labels = segments.map(s =>
      `<span style="color: ${s.color}; font-size: 0.65rem;">${s.label} <b>${s.pct}%</b></span>`
    ).join('<span style="color: var(--border-color); margin: 0 0.15rem;">·</span>');

    classEl.innerHTML = `
      <div style="display: flex; height: 6px; border-radius: 3px; overflow: hidden; background: #333; margin-bottom: 0.3rem;">${bar}</div>
      <div style="display: flex; justify-content: center; flex-wrap: wrap; gap: 0.1rem;">${labels}</div>
    `;
  } else {
    classEl.innerHTML = '--';
  }

  // Competition stat
  const compEl = document.getElementById('statCompetition');
  if (indicators?.competitionScore != null) {
    const cs = indicators.competitionScore;
    let label, color;
    if (cs >= 67) { label = 'High'; color = '#ef4444'; }
    else if (cs >= 34) { label = 'Medium'; color = '#f59e0b'; }
    else { label = 'Low'; color = '#22c55e'; }
    compEl.textContent = label;
    compEl.style.color = color;
  } else {
    compEl.textContent = '--';
    compEl.style.color = 'var(--text-primary)';
  }

  // Yield breakdown (pros/cons)
  const breakdownContainer = document.getElementById('selectedDestYieldBreakdown');
  const factorsList = document.getElementById('yieldFactorsList');
  if (indicators?.yieldBreakdown) {
    const b = indicators.yieldBreakdown;
    const points = [];

    // Wealth
    if (b.incomeFactor >= 1.4) points.push({ good: true, text: 'Wealthy markets' });
    else if (b.incomeFactor >= 1.0) points.push({ good: true, text: 'Good economies' });
    else if (b.incomeFactor >= 0.7) points.push({ good: null, text: 'Average income' });
    else points.push({ good: false, text: 'Low income markets' });

    // Hub type
    if (b.hubPremium >= 1.10) points.push({ good: true, text: 'Major destination' });
    else if (b.hubPremium <= 0.85) points.push({ good: false, text: 'Small airport' });

    // Distance
    const dk = b.distKm || 0;
    if (dk < 500) points.push({ good: false, text: 'Very short route' });
    else if (dk < 1200) points.push({ good: null, text: 'Short haul' });
    else if (dk < 1800) points.push({ good: true, text: 'Medium haul' });
    else if (dk < 4000) points.push({ good: true, text: 'Ideal range' });
    else if (dk < 7000) points.push({ good: null, text: 'Long haul' });
    else points.push({ good: false, text: 'Ultra long haul' });

    factorsList.innerHTML = points.map(p => {
      const icon = p.good === true ? '+' : p.good === false ? '−' : '~';
      const col = p.good === true ? '#22c55e' : p.good === false ? '#ef4444' : '#f59e0b';
      return `<span style="display: inline-flex; align-items: center; gap: 0.2rem; background: var(--surface-elevated); border-radius: 4px; padding: 0.2rem 0.5rem; font-size: 0.75rem;">
        <span style="font-weight: 700; color: ${col};">${icon}</span>
        <span style="color: var(--text-secondary);">${p.text}</span>
      </span>`;
    }).join('');
    breakdownContainer.style.display = 'block';
  } else {
    breakdownContainer.style.display = 'none';
  }
}

// Render 24-hour airport movements chart (departures + arrivals)
function renderTimeChart(movements) {
  const chartEl = document.getElementById('selectedDestTimeChart');
  const barsEl = document.getElementById('timeChartBars');
  const labelsEl = document.getElementById('timeChartLabels');

  if (!movements || movements.length === 0) {
    chartEl.style.display = 'none';
    return;
  }

  chartEl.style.display = 'block';

  // Bucket by hour
  const deps = new Array(24).fill(0);
  const arrs = new Array(24).fill(0);
  for (const m of movements) {
    if (m.hour >= 0 && m.hour < 24) {
      if (m.type === 'dep') deps[m.hour]++;
      else arrs[m.hour]++;
    }
  }

  const maxCount = Math.max(1, ...deps.map((d, i) => d + arrs[i]));

  barsEl.innerHTML = Array.from({ length: 24 }, (_, h) => {
    const d = deps[h];
    const a = arrs[h];
    const total = d + a;
    const depPct = (d / maxCount) * 100;
    const arrPct = (a / maxCount) * 100;
    const totalPct = total > 0 ? Math.max(6, depPct + arrPct) : 0;
    const tooltip = `${String(h).padStart(2, '0')}:00 — ${d} dep, ${a} arr (${total} total)`;
    // Stacked bar: arrivals on bottom (cyan), departures on top (amber)
    return `<div title="${tooltip}" style="flex: 1; height: ${totalPct}%; display: flex; flex-direction: column; justify-content: flex-end; min-width: 0; border-radius: 2px 2px 0 0; overflow: hidden; transition: opacity 0.15s;" onmouseenter="this.style.opacity='0.7'" onmouseleave="this.style.opacity='1'">${total > 0 ? `<div style="height: ${total > 0 ? (depPct / totalPct * 100) : 0}%; background: #f59e0b;"></div><div style="height: ${total > 0 ? (arrPct / totalPct * 100) : 0}%; background: #22d3ee;"></div>` : ''}</div>`;
  }).join('');

  labelsEl.innerHTML = Array.from({ length: 24 }, (_, h) => {
    const show = h % 3 === 0;
    return `<div style="flex: 1; text-align: center; font-size: 0.55rem; color: var(--text-muted); min-width: 0; overflow: hidden;">${show ? String(h).padStart(2, '0') : ''}</div>`;
  }).join('');
}

// Fetch and display competing airlines + popular origins
async function fetchCompetitors(fromAirportId, toAirportId) {
  const wrapper = document.getElementById('selectedDestRouteInfo');
  const list = document.getElementById('competitorsList');
  const countEl = document.getElementById('competitorCount');
  const originsList = document.getElementById('popularOriginsList');
  const originsCountEl = document.getElementById('popularOriginsCount');

  // Show loading state
  wrapper.style.display = 'grid';
  document.getElementById('selectedDestTimeChart').style.display = 'none';
  list.innerHTML = '<div style="color: var(--text-muted); font-size: 0.8rem; padding: 0.3rem 0;">Loading...</div>';
  originsList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.8rem; padding: 0.3rem 0;">Loading...</div>';
  countEl.textContent = '';
  originsCountEl.textContent = '';

  try {
    const resp = await fetch(`/api/world/routes/competitors/${fromAirportId}/${toAirportId}`);
    if (!resp.ok) throw new Error('Failed to fetch');
    const data = await resp.json();

    // Competitors
    const competitors = data.competitors || [];
    countEl.textContent = `(${competitors.length})`;

    if (competitors.length === 0) {
      list.innerHTML = '<div style="color: var(--text-muted); font-size: 0.78rem; padding: 0.5rem 0.6rem;">No airlines on this route</div>';
    } else {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const baseIcao = baseAirport?.icaoCode || '????';
      const destIcao = selectedDestinationAirport?.icaoCode || '????';
      const rc = data.routeCoords || {};
      list.innerHTML = competitors.map(c => {
        const depTime = c.departureTime ? c.departureTime.substring(0, 5) : '??:??';
        const fromIcao = c.isReverse ? destIcao : baseIcao;
        const toIcao = c.isReverse ? baseIcao : destIcao;
        const daysStr = c.daysOfWeek && c.daysOfWeek.length < 7
          ? c.daysOfWeek.map(d => dayNames[d]).join(' ')
          : 'Daily';
        const acft = c.aircraftIcao || '';
        const playerTag = c.isPlayer ? ' <span style="color: var(--accent-color); font-size: 0.6rem; font-weight: 600;">YOU</span>' : '';

        // Calculate arrival time using the same flight-timing.js as world map
        let arrTime = '??:??';
        if (c.departureTime && c.distanceNm && typeof calculateFlightMinutes === 'function') {
          const dh = parseInt(c.departureTime.substring(0, 2));
          const dm = parseInt(c.departureTime.substring(3, 5)) || 0;
          const cruiseSpeed = 450; // default; per-aircraft speed not available here
          const dLat = c.isReverse ? rc.toLat : rc.fromLat;
          const dLng = c.isReverse ? rc.toLng : rc.fromLng;
          const aLat = c.isReverse ? rc.fromLat : rc.toLat;
          const aLng = c.isReverse ? rc.fromLng : rc.toLng;
          const flightMins = calculateFlightMinutes(c.distanceNm, cruiseSpeed, dLng, aLng, dLat, aLat);
          const arrTotalMin = (dh * 60 + dm + flightMins) % 1440;
          arrTime = String(Math.floor(arrTotalMin / 60)).padStart(2, '0') + ':' + String(arrTotalMin % 60).padStart(2, '0');
        }

        return `
          <div style="padding: 0.35rem 0.6rem; border-bottom: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.15rem;">
              <span style="font-size: 0.78rem;"><span style="color: var(--text-primary); font-weight: 600;">${c.airlineCode}</span>${playerTag} <span style="color: var(--text-muted); font-size: 0.72rem;">${c.routeNumber || ''}</span>${acft ? `<span style="color: var(--text-muted); font-size: 0.68rem;"> · ${acft}</span>` : ''}</span>
              <span style="color: var(--text-muted); font-size: 0.68rem;">${daysStr}</span>
            </div>
            <div style="font-family: monospace; font-size: 0.72rem; display: flex; align-items: center; gap: 0.25rem;">
              <span style="color: var(--text-secondary);">${fromIcao}</span>
              <span style="color: var(--accent-color); font-weight: 600;">${depTime}</span>
              <span style="color: var(--text-muted);">→</span>
              <span style="color: var(--text-secondary);">${toIcao}</span>
              <span style="color: var(--accent-color); font-weight: 600;">${arrTime}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    // Airport movements time chart (departures + arrivals)
    renderTimeChart(data.airportMovements || []);

    // Popular origins
    const origins = data.popularOrigins || [];
    const totalInbound = data.totalInboundRoutes || 0;
    originsCountEl.textContent = totalInbound > 0 ? `(${totalInbound} routes)` : '';

    if (origins.length === 0) {
      originsList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.78rem; padding: 0.5rem 0.6rem;">No other routes into this airport</div>';
    } else {
      originsList.innerHTML = origins.map(o => {
        const airlineTags = o.airlines.map(a =>
          `<span style="background: var(--surface-elevated); color: var(--text-secondary); padding: 0.1rem 0.3rem; border-radius: 3px; font-size: 0.6rem; font-weight: 600;">${a}</span>`
        ).join(' ');

        return `
          <div style="display: grid; grid-template-columns: 50px 1fr 40px; gap: 0 0.4rem; align-items: center; padding: 0.3rem 0.6rem; border-bottom: 1px solid var(--border-color); font-size: 0.78rem;">
            <span style="color: var(--text-primary); font-weight: 600; white-space: nowrap;">${o.icao}</span>
            <div style="display: flex; gap: 0.15rem; flex-wrap: wrap;">${airlineTags}</div>
            <span style="color: var(--text-secondary); font-size: 0.75rem; white-space: nowrap; text-align: right;">${o.routeCount}</span>
          </div>
        `;
      }).join('');
    }

  } catch (err) {
    console.error('Error fetching competitors:', err);
    list.innerHTML = '<div style="color: var(--text-muted); font-size: 0.8rem; padding: 0.3rem 0;">Could not load</div>';
    originsList.innerHTML = '';
    countEl.textContent = '';
    originsCountEl.textContent = '';
    document.getElementById('selectedDestTimeChart').style.display = 'none';
  }
}

// Clear destination selection in step 1
function clearDestinationStep1() {
  selectedDestinationAirport = null;
  autoAtcWaypoints = null;
  autoAtcAvoidedFirs = [];
  const autoInfo = document.getElementById('autoAtcInfo');
  if (autoInfo) autoInfo.style.display = 'none';
  document.getElementById('selectedDestinationPanelStep1').style.display = 'none';

  // Show the search panel again
  document.getElementById('destinationSearchPanel').style.display = 'block';

  applyDestinationFilters();

  // Scroll to search section
  document.getElementById('searchKeyword').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Proceed to step 2 (route configuration)
function proceedToStep2() {
  if (!selectedDestinationAirport) {
    showWarningModal('Please select a destination airport first');
    return;
  }

  // Hide step 1, show step 2
  document.getElementById('step1Container').style.display = 'none';
  document.getElementById('step2Container').style.display = 'block';

  // Update step indicators
  document.getElementById('step1Indicator').style.background = 'var(--surface-elevated)';
  document.getElementById('step1Indicator').style.border = '1px solid var(--border-color)';
  document.getElementById('step1Indicator').style.color = 'var(--text-muted)';

  document.getElementById('step2Indicator').style.background = 'var(--accent-color)';
  document.getElementById('step2Indicator').style.border = 'none';
  document.getElementById('step2Indicator').style.color = 'white';

  // Update subtitle
  document.getElementById('stepSubtitle').textContent = 'STEP 2: CONFIGURE ROUTE';

  // Update arrival airport field
  document.getElementById('arrivalAirport').value =
    `${selectedDestinationAirport.icaoCode} - ${selectedDestinationAirport.name} (${Math.round(selectedDestinationAirport.distance)} NM)`;

  // Calculate return time
  calculateReturnTime();

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Go back to step 1 (destination selection)
function backToStep1() {
  // Show step 1, hide step 2
  document.getElementById('step1Container').style.display = 'block';
  document.getElementById('step2Container').style.display = 'none';

  // Update step indicators
  document.getElementById('step1Indicator').style.background = 'var(--accent-color)';
  document.getElementById('step1Indicator').style.border = 'none';
  document.getElementById('step1Indicator').style.color = 'white';

  document.getElementById('step2Indicator').style.background = 'var(--surface-elevated)';
  document.getElementById('step2Indicator').style.border = '1px solid var(--border-color)';
  document.getElementById('step2Indicator').style.color = 'var(--text-muted)';

  // Update subtitle
  document.getElementById('stepSubtitle').textContent = 'STEP 1: SELECT DESTINATION';

  // Reset tech stop
  const techStopCheckbox = document.getElementById('includeTechStop');
  if (techStopCheckbox) {
    techStopCheckbox.checked = false;
    toggleTechStopSection();
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Proceed to step 3 (pricing)
function proceedToStep3() {
  // Validate Step 2 required fields
  if (!document.getElementById('routeNumber').value.trim()) {
    showWarningModal('Please enter an outbound flight number', 'routeNumber');
    return;
  }
  if (!document.getElementById('returnRouteNumber').value.trim()) {
    showWarningModal('Please enter a return flight number', 'returnRouteNumber');
    return;
  }
  if (!document.getElementById('assignedAircraft').value) {
    showWarningModal('Please select an aircraft type', 'assignedAircraft');
    return;
  }
  if (!document.getElementById('departureTime').value) {
    showWarningModal('Please enter a schedule time', 'departureTime');
    return;
  }
  if (selectedDaysOfWeek.length === 0) {
    showWarningModal('Please select at least one day of operation', 'daysOfWeekContainer');
    return;
  }

  // Hide step 2, show step 3
  document.getElementById('step2Container').style.display = 'none';
  document.getElementById('step3Container').style.display = 'block';

  // Update step indicators
  updateStepIndicators(3);

  // Update subtitle
  document.getElementById('stepSubtitle').textContent = 'STEP 3: SET PRICING';

  // Populate route summary
  updateStep3Summary();

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Go back to step 2 (schedule)
function backToStep2() {
  // Show step 2, hide step 3
  document.getElementById('step3Container').style.display = 'none';
  document.getElementById('step2Container').style.display = 'block';

  // Update step indicators
  updateStepIndicators(2);

  // Update subtitle
  document.getElementById('stepSubtitle').textContent = 'STEP 2: CONFIGURE ROUTE';

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Update step indicators based on active step
function updateStepIndicators(activeStep) {
  const steps = [
    { id: 'step1Indicator', step: 1 },
    { id: 'step2Indicator', step: 2 },
    { id: 'step3Indicator', step: 3 }
  ];

  steps.forEach(({ id, step }) => {
    const el = document.getElementById(id);
    if (!el) return;

    if (step < activeStep) {
      // Completed step
      el.style.background = 'var(--surface-elevated)';
      el.style.border = '1px solid var(--success-color)';
      el.style.color = 'var(--success-color)';
    } else if (step === activeStep) {
      // Active step
      el.style.background = 'var(--accent-color)';
      el.style.border = 'none';
      el.style.color = 'white';
    } else {
      // Future step
      el.style.background = 'var(--surface-elevated)';
      el.style.border = '1px solid var(--border-color)';
      el.style.color = 'var(--text-muted)';
    }
  });
}

// Update Step 3 route summary
function updateStep3Summary() {
  const summary = document.getElementById('step3RouteSummary');
  if (!summary) return;

  const depCode = baseAirport?.iataCode || baseAirport?.icaoCode || '--';
  const arrCode = selectedDestinationAirport?.iataCode || selectedDestinationAirport?.icaoCode || '--';
  const prefix = worldInfo?.iataCode || '';
  const routeNum = prefix + document.getElementById('routeNumber').value.trim();
  const distance = Math.round(selectedDestinationAirport?.distance || 0);
  const techCode = selectedTechStopAirport ? (selectedTechStopAirport.iataCode || selectedTechStopAirport.icaoCode) : null;

  summary.innerHTML = `
    <div style="display: flex; align-items: center; gap: 1rem;">
      <span style="font-size: 1.1rem; font-weight: 700; color: var(--accent-color); font-family: monospace;">${routeNum}</span>
      <span style="color: var(--text-secondary);">${depCode} ${techCode ? '→ ' + techCode + ' ' : ''}→ ${arrCode}</span>
      <span style="color: var(--text-muted); font-size: 0.85rem;">${distance} NM</span>
    </div>
    <div style="color: var(--text-muted); font-size: 0.8rem;">
      ${document.getElementById('departureTime').value} departure
    </div>
  `;
}

// Toggle a specific day of the week
function toggleDay(day) {
  const dayIndex = selectedDaysOfWeek.indexOf(day);

  if (dayIndex > -1) {
    // Day is selected, remove it
    selectedDaysOfWeek.splice(dayIndex, 1);
  } else {
    // Day is not selected, add it
    selectedDaysOfWeek.push(day);
  }

  // Sort the array
  selectedDaysOfWeek.sort((a, b) => a - b);

  // Update button visual state
  updateDayButtonStates();

  // Update 7 day schedule checkbox state
  const sevenDayCheckbox = document.getElementById('sevenDaySchedule');
  sevenDayCheckbox.checked = selectedDaysOfWeek.length === 7;
}

// Toggle 7 day schedule
function toggleSevenDaySchedule() {
  const checkbox = document.getElementById('sevenDaySchedule');

  if (checkbox.checked) {
    // Select all days (Mon-Sun)
    selectedDaysOfWeek = [1, 2, 3, 4, 5, 6, 0];
  } else {
    // Deselect all days
    selectedDaysOfWeek = [];
  }

  updateDayButtonStates();
}

// Days of week section is always visible (no frequency dropdown anymore)

// Update the visual state of day buttons
function updateDayButtonStates() {
  const dayButtons = document.querySelectorAll('.day-button');

  dayButtons.forEach(button => {
    const day = parseInt(button.getAttribute('data-day'));
    const isSelected = selectedDaysOfWeek.includes(day);

    if (isSelected) {
      button.style.background = 'var(--accent-color)';
      button.style.borderColor = 'var(--accent-color)';
      button.style.color = 'white';
    } else {
      button.style.background = 'transparent';
      button.style.borderColor = 'var(--border-color)';
      button.style.color = 'var(--text-muted)';
    }
  });
}

// All timing calculations now use shared flight-timing.js library

// Handle turnaround time change - enforce minimum
function onTurnaroundTimeChange() {
  const turnaroundInput = document.getElementById('turnaroundTime');
  const minDisplay = document.getElementById('minTurnaroundDisplay');
  const minInfo = document.getElementById('turnaroundMinInfo');

  if (!selectedDestinationAirport) {
    calculateFlightTiming();
    return;
  }

  const aircraftSelect = document.getElementById('assignedAircraft');
  if (!aircraftSelect.value) {
    calculateFlightTiming();
    return;
  }

  const aircraftData = aircraftDataById[aircraftSelect.value];
  if (!aircraftData) {
    calculateFlightTiming();
    return;
  }

  const distance = selectedTechStopAirport && selectedDestinationAirport.routingDistance
    ? selectedDestinationAirport.routingDistance
    : selectedDestinationAirport.distance;

  const passengerCapacity = aircraftData.passengerCapacity || 0;
  const acType = aircraftData.type || 'Narrowbody';
  const rawBreakdown = calculateTurnaroundBreakdown(distance, passengerCapacity, acType);
  const minTurnaround = applyContractorModifiers(rawBreakdown, getContractorModifiers()).total;

  const currentValue = parseInt(turnaroundInput.value) || 0;

  // Enforce minimum
  if (currentValue < minTurnaround) {
    turnaroundInput.value = minTurnaround;
    turnaroundInput.style.borderColor = 'var(--warning-color)';
    setTimeout(() => {
      turnaroundInput.style.borderColor = '';
    }, 1000);
  }

  calculateFlightTiming();
}

// Calculate flight time using shared library with wind effects
function calculateFlightTimeForLeg(distanceNM, aircraftData, depLat, depLng, arrLat, arrLng) {
  const cruiseSpeed = aircraftData?.cruiseSpeed || 450;
  return calculateFlightMinutes(distanceNM, cruiseSpeed, depLng, arrLng, depLat, arrLat);
}

// Check aircraft range against route distance and show/hide warning
function checkAircraftRange() {
  const warningEl = document.getElementById('rangeWarning');
  if (!warningEl) return true; // no warning element yet

  const aircraftSelect = document.getElementById('assignedAircraft');
  if (!aircraftSelect.value || !selectedDestinationAirport) {
    warningEl.style.display = 'none';
    return true;
  }

  const aircraftData = aircraftDataById[aircraftSelect.value];
  if (!aircraftData || !aircraftData.rangeNm) {
    warningEl.style.display = 'none';
    return true;
  }

  const rangeNm = aircraftData.rangeNm;

  if (selectedTechStopAirport) {
    // With tech stop: check each individual leg
    const leg1 = Math.round(selectedTechStopAirport.distanceFromDeparture || 0);
    const leg2 = Math.round(selectedTechStopAirport.distanceToDestination || 0);
    const problems = [];
    if (leg1 > rangeNm) problems.push(`Leg 1 (${baseAirport.icaoCode} → ${selectedTechStopAirport.icaoCode}): ${leg1} NM`);
    if (leg2 > rangeNm) problems.push(`Leg 2 (${selectedTechStopAirport.icaoCode} → ${selectedDestinationAirport.icaoCode}): ${leg2} NM`);

    if (problems.length > 0) {
      warningEl.innerHTML = `<strong>Aircraft range exceeded</strong> — ${aircraftData.manufacturer} ${aircraftData.model} range is ${rangeNm.toLocaleString()} NM<br>${problems.join('<br>')}`;
      warningEl.style.display = 'block';
      return false;
    }
  } else {
    // Direct route: check full distance
    const dist = Math.round(selectedDestinationAirport.distance || 0);
    if (dist > rangeNm) {
      warningEl.innerHTML = `<strong>Aircraft range exceeded</strong> — ${aircraftData.manufacturer} ${aircraftData.model} range is ${rangeNm.toLocaleString()} NM but route distance is ${dist.toLocaleString()} NM. Add a technical stop to bring each leg within range.`;
      warningEl.style.display = 'block';
      return false;
    }
  }

  warningEl.style.display = 'none';
  return true;
}

// Calculate and display detailed flight timing
function calculateFlightTiming() {
  const timingContainer = document.getElementById('flightTimingDisplay');
  const turnaroundInput = document.getElementById('turnaroundTime');

  // Preserve turnaround details open state before rebuilding
  const existingDetails = document.getElementById('turnaroundDetails');
  const wasTurnaroundOpen = existingDetails ? existingDetails.open : false;
  const minDisplay = document.getElementById('minTurnaroundDisplay');
  const minInfo = document.getElementById('turnaroundMinInfo');

  if (!selectedDestinationAirport) {
    if (timingContainer) {
      timingContainer.style.display = 'none';
    }
    if (minInfo) minInfo.style.display = 'none';
    document.getElementById('calculatedReturnTime').value = '--:--';
    return;
  }

  const scheduleTime = document.getElementById('departureTime').value;
  if (!scheduleTime) {
    if (timingContainer) {
      timingContainer.style.display = 'none';
    }
    if (minInfo) minInfo.style.display = 'none';
    document.getElementById('calculatedReturnTime').value = '--:--';
    return;
  }

  // Get selected aircraft data - REQUIRED
  const aircraftSelect = document.getElementById('assignedAircraft');
  let aircraftData = null;
  if (!aircraftSelect.value) {
    // Aircraft is mandatory - hide timing until selected
    if (timingContainer) {
      timingContainer.style.display = 'none';
    }
    if (minInfo) minInfo.style.display = 'none';
    document.getElementById('calculatedReturnTime').value = '--:--';
    return;
  }

  // Look up aircraft data by ID
  aircraftData = aircraftDataById[aircraftSelect.value];
  if (!aircraftData) {
    console.error('Aircraft data not found for ID:', aircraftSelect.value);
    if (timingContainer) {
      timingContainer.style.display = 'none';
    }
    if (minInfo) minInfo.style.display = 'none';
    document.getElementById('calculatedReturnTime').value = '--:--';
    return;
  }

  // Check aircraft range
  checkAircraftRange();

  // Use routing distance if tech stop is present, otherwise use direct distance
  const effectiveDistance = selectedTechStopAirport && selectedDestinationAirport.routingDistance
    ? selectedDestinationAirport.routingDistance
    : selectedDestinationAirport.distance;

  const passengerCapacity = aircraftData.passengerCapacity || 0;
  const acType = aircraftData.type || 'Narrowbody';

  // Get airport coordinates for wind calculations
  const baseLat = parseFloat(baseAirport.latitude) || 0;
  const baseLng = parseFloat(baseAirport.longitude) || 0;
  const destLat = parseFloat(selectedDestinationAirport.latitude) || 0;
  const destLng = parseFloat(selectedDestinationAirport.longitude) || 0;

  // Calculate pre-flight and post-flight durations using shared library
  const outboundPreFlight = calculatePreFlightTotal(effectiveDistance, passengerCapacity, acType);
  const returnPostFlight = calculatePostFlightTotal(passengerCapacity, acType);

  // Calculate turnaround breakdown (includes 30min daily check always)
  const rawTurnaround = calculateTurnaroundBreakdown(effectiveDistance, passengerCapacity, acType);
  const turnaround = applyContractorModifiers(rawTurnaround, getContractorModifiers());
  const minTurnaround = turnaround.total;

  // Update minimum turnaround display
  if (minDisplay) minDisplay.textContent = minTurnaround;
  if (minInfo) minInfo.style.display = 'block';

  // Set turnaround input minimum and auto-update if needed
  turnaroundInput.min = minTurnaround;
  let turnaroundMinutes = parseInt(turnaroundInput.value) || minTurnaround;
  if (turnaroundMinutes < minTurnaround) {
    turnaroundMinutes = minTurnaround;
    turnaroundInput.value = minTurnaround;
  }

  // Calculate asymmetric flight times (wind affects outbound vs return differently)
  const outboundFlightMinutes = calculateFlightTimeForLeg(effectiveDistance, aircraftData, baseLat, baseLng, destLat, destLng);
  const returnFlightMinutes = calculateFlightTimeForLeg(effectiveDistance, aircraftData, destLat, destLng, baseLat, baseLng);

  // Tech stop refueling time (20 minutes per leg)
  const refuelingTimePerLeg = selectedTechStopAirport ? 20 : 0;

  const outboundBlockMinutes = outboundFlightMinutes + refuelingTimePerLeg;
  const returnBlockMinutes = returnFlightMinutes + refuelingTimePerLeg;

  // Parse schedule time (this is when pre-flight actions begin)
  const [hours, minutes] = scheduleTime.split(':').map(Number);

  // Calculate all timing points
  const preFlightStart = hours * 60 + minutes;
  const offBlocksOutbound = preFlightStart + outboundPreFlight.total;
  const onBlocksDestination = offBlocksOutbound + outboundBlockMinutes;

  // Turnaround at destination
  const actualOffBlocksReturn = onBlocksDestination + turnaroundMinutes;
  const actualOnBlocksBase = actualOffBlocksReturn + returnBlockMinutes;
  const actualPostFlightReturnEnd = actualOnBlocksBase + returnPostFlight.total;

  // Format times
  const formatTime = (totalMinutes) => {
    const days = Math.floor(totalMinutes / (24 * 60));
    const mins = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return days > 0 ? `${timeStr} (+${days}d)` : timeStr;
  };

  const formatDuration = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m}m`;
  };

  // Update return time field (this shows return off-blocks time)
  document.getElementById('calculatedReturnTime').value = formatTime(actualOffBlocksReturn);

  // Display compact timing breakdown
  if (timingContainer) {
    const depCode = baseAirport.iataCode || baseAirport.icaoCode;
    const destCode = selectedDestinationAirport.iataCode || selectedDestinationAirport.icaoCode;
    const techCode = selectedTechStopAirport ? (selectedTechStopAirport.iataCode || selectedTechStopAirport.icaoCode) : null;
    const hasTechStop = !!selectedTechStopAirport;

    // Compact time block helper
    const timeBlock = (label, time, color) => `
      <div style="text-align: center;">
        <div style="font-size: 0.55rem; color: var(--text-muted); text-transform: uppercase;">${label}</div>
        <div style="font-size: 0.85rem; font-weight: 700; color: ${color};">${formatTime(time)}</div>
      </div>
    `;

    // Action row helper for turnaround details
    const actionRow = (label, duration, color) => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.2rem 0;">
        <div style="display: flex; align-items: center; gap: 0.3rem;">
          <div style="width: 5px; height: 5px; border-radius: 50%; background: ${color};"></div>
          <span style="color: var(--text-secondary); font-size: 0.7rem;">${label}</span>
        </div>
        <span style="color: var(--text-primary); font-size: 0.7rem; font-weight: 600;">${duration}m</span>
      </div>
    `;

    timingContainer.style.display = 'block';
    timingContainer.innerHTML = `
      <div id="flightTimingContent" style="background: var(--surface-elevated); border: 1px solid var(--border-color); border-radius: 4px; padding: 0.75rem; height: 100%; box-sizing: border-box;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <span style="font-weight: 600; color: var(--text-primary); font-size: 0.8rem;">FLIGHT TIMING</span>
          <span style="color: var(--text-muted); font-size: 0.7rem;">${Math.round(effectiveDistance)} NM${hasTechStop ? ' (via ' + techCode + ')' : ''}</span>
        </div>
        ${hasTechStop ? `
        <div style="background: #f59e0b15; border: 1px solid #f59e0b30; border-radius: 4px; padding: 0.4rem 0.5rem; margin-bottom: 0.4rem; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 0.3rem;">
            <div style="width: 6px; height: 6px; border-radius: 50%; background: #f59e0b;"></div>
            <span style="font-size: 0.7rem; color: #f59e0b; font-weight: 600;">TECH STOP ${techCode}</span>
          </div>
          <span style="font-size: 0.65rem; color: var(--text-muted);">${Math.round(selectedTechStopAirport.distanceFromDeparture)} NM + ${Math.round(selectedTechStopAirport.distanceToDestination)} NM • 20m refuel/leg</span>
        </div>` : ''}

        <!-- OUTBOUND Timeline -->
        <div style="background: var(--surface); border-radius: 4px; padding: 0.5rem; margin-bottom: 0.4rem;">
          <div style="display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.4rem;">
            <div style="width: 8px; height: 8px; border-radius: 2px; background: #3b82f6;"></div>
            <span style="font-weight: 600; color: #3b82f6; font-size: 0.7rem;">OUTBOUND</span>
            <span style="color: var(--text-muted); font-size: 0.65rem;">${depCode} ${hasTechStop ? '→ ' + techCode + ' ' : ''}→ ${destCode} • ${formatDuration(outboundFlightMinutes)} flight${hasTechStop ? ' + 20m refuel' : ''}</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.25rem; text-align: center;">
            ${timeBlock('Pre-flight', preFlightStart, 'var(--text-secondary)')}
            ${timeBlock('Off Blocks', offBlocksOutbound, 'var(--accent-color)')}
            ${timeBlock('On Blocks', onBlocksDestination, 'var(--success-color)')}
          </div>
        </div>

        <!-- TURNAROUND - Expandable -->
        <details id="turnaroundDetails" style="margin-bottom: 0.4rem;">
          <summary style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.4rem; background: #a855f715; border-radius: 4px; cursor: pointer; list-style: none;">
            <div style="width: 6px; height: 6px; border-radius: 50%; background: #a855f7;"></div>
            <span style="font-weight: 600; color: #a855f7; font-size: 0.7rem;">TURNAROUND ${formatDuration(turnaroundMinutes)}</span>
            <span style="color: var(--text-muted); font-size: 0.65rem;">(min ${formatDuration(minTurnaround)})</span>
            <svg class="turnaround-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2" style="transition: transform 0.2s;">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </summary>
          <div style="background: #a855f710; border-radius: 0 0 4px 4px; padding: 0.5rem; margin-top: 2px; border: 1px solid #a855f730; border-top: none;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div>
                <div style="font-size: 0.6rem; color: #a855f7; font-weight: 600; margin-bottom: 0.3rem;">GROUND OPS</div>
                ${actionRow('Deboarding', turnaround.deboarding, '#22c55e')}
                ${actionRow('Cabin Service', turnaround.parallelCateringCleaning, '#f59e0b')}
                ${actionRow('Boarding', turnaround.boarding, '#3b82f6')}
              </div>
              <div>
                <div style="font-size: 0.6rem; color: #ef4444; font-weight: 600; margin-bottom: 0.3rem;">PARALLEL / CHECKS</div>
                ${actionRow('Fuelling', turnaround.fuelling, '#ef4444')}
                ${actionRow('Daily Check (if req\'d)', turnaround.dailyCheck, '#f97316')}
                <div style="margin-top: 0.3rem; padding: 0.3rem; background: var(--surface); border-radius: 4px; text-align: center;">
                  <div style="font-size: 0.55rem; color: var(--text-muted);">MIN REQUIRED</div>
                  <div style="font-size: 0.9rem; font-weight: 700; color: #a855f7;">${formatDuration(minTurnaround)}</div>
                </div>
              </div>
            </div>
          </div>
        </details>

        <!-- RETURN Timeline -->
        <div style="background: var(--surface); border-radius: 4px; padding: 0.5rem; margin-bottom: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.4rem;">
            <div style="width: 8px; height: 8px; border-radius: 2px; background: #60a5fa;"></div>
            <span style="font-weight: 600; color: #60a5fa; font-size: 0.7rem;">RETURN</span>
            <span style="color: var(--text-muted); font-size: 0.65rem;">${destCode} ${hasTechStop ? '→ ' + techCode + ' ' : ''}→ ${depCode} • ${formatDuration(returnFlightMinutes)} flight${hasTechStop ? ' + 20m refuel' : ''}</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.25rem; text-align: center;">
            ${timeBlock('Off Blocks', actualOffBlocksReturn, 'var(--accent-color)')}
            ${timeBlock('On Blocks', actualOnBlocksBase, 'var(--success-color)')}
            ${timeBlock('Complete', actualPostFlightReturnEnd, 'var(--text-secondary)')}
          </div>
        </div>

        <!-- Summary -->
        <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(168, 85, 247, 0.1)); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 4px; padding: 0.5rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; align-items: center; text-align: center;">
            <div>
              <div style="font-size: 0.6rem; color: var(--text-muted);">PRE-FLIGHT BEGINS</div>
              <div style="font-size: 1rem; font-weight: 700; color: var(--accent-color);">${formatTime(preFlightStart)}</div>
            </div>
            <div>
              <div style="font-size: 0.6rem; color: var(--text-muted);">A/C NEXT AVAILABLE</div>
              <div style="font-size: 1rem; font-weight: 700; color: var(--success-color);">${formatTime(actualPostFlightReturnEnd)}</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add expand/collapse behavior for turnaround details
    const details = document.getElementById('turnaroundDetails');
    if (details) {
      // Restore previous open state
      if (wasTurnaroundOpen) {
        details.open = true;
        const chevron = details.querySelector('.turnaround-chevron');
        if (chevron) {
          chevron.style.transform = 'rotate(180deg)';
        }
      }

      details.addEventListener('toggle', () => {
        const chevron = details.querySelector('.turnaround-chevron');
        if (chevron) {
          chevron.style.transform = details.open ? 'rotate(180deg)' : 'rotate(0)';
        }
        // Sync map height with timing panel after a small delay for DOM update
        setTimeout(syncMapHeight, 50);
      });
    }

    // Initial sync of map height
    setTimeout(syncMapHeight, 100);
  }
}

// Sync map container height with flight timing panel
function syncMapHeight() {
  const timingContent = document.getElementById('flightTimingContent');
  const mapContainer = document.getElementById('routePreviewMap');
  if (timingContent && mapContainer) {
    const timingHeight = timingContent.offsetHeight;
    mapContainer.style.height = (timingHeight - 30) + 'px'; // Subtract header height
    if (routePreviewMap) {
      routePreviewMap.invalidateSize();
    }
  }
}

// Backward compatibility - keep old function name
function calculateReturnTime() {
  calculateFlightTiming();
}

// Validate route number for duplicates (checking day conflicts)
function validateRouteNumber(fieldId) {
  const field = document.getElementById(fieldId);
  const numberPart = field.value.trim();

  // Clear previous validation
  let errorDiv = field.parentElement.parentElement.querySelector('.validation-error');
  if (errorDiv) {
    errorDiv.remove();
  }
  field.style.borderColor = '';

  if (!numberPart) return true;

  // Get the full route number (prefix + number)
  const prefix = worldInfo?.iataCode || '';
  const fullRouteNumber = prefix + numberPart;

  // Check if route number conflicts with existing routes on same days
  const conflictingRoute = allRoutes.find(route => {
    const matchesRouteNumber = route.routeNumber === fullRouteNumber || route.returnRouteNumber === fullRouteNumber;

    if (!matchesRouteNumber) return false;

    // Check if there's any overlap in operating days
    const existingDays = route.daysOfWeek || [];
    const hasOverlap = selectedDaysOfWeek.some(day => existingDays.includes(day));

    return hasOverlap;
  });

  if (conflictingRoute) {
    field.style.borderColor = 'var(--warning-color)';
    errorDiv = document.createElement('div');
    errorDiv.className = 'validation-error';
    errorDiv.style.cssText = 'color: var(--warning-color); font-size: 0.85rem; margin-top: 0.25rem;';
    errorDiv.textContent = `Route number ${fullRouteNumber} conflicts with existing route on selected days`;
    field.parentElement.parentElement.appendChild(errorDiv);
    return false;
  }

  return true;
}

// Update return route number suggestion
function suggestReturnRouteNumber() {
  const outboundNumber = document.getElementById('routeNumber').value.trim();
  const returnNumberField = document.getElementById('returnRouteNumber');

  // Validate for duplicates
  validateRouteNumber('routeNumber');

  if (!outboundNumber) {
    returnNumberField.value = '';
    returnNumberField.placeholder = '124';
    return;
  }

  // Parse the number and increment by 1
  const number = parseInt(outboundNumber);
  if (!isNaN(number)) {
    returnNumberField.value = (number + 1).toString();
  } else {
    // If not a valid number, just copy it
    returnNumberField.value = outboundNumber;
  }
}

// Update pricing section visibility based on transport type
function updatePricingVisibility() {
  const transportType = document.getElementById('transportType').value;
  const passengerSection = document.getElementById('passengerPricingSection');
  const cargoSection = document.getElementById('cargoPricingSection');

  passengerSection.style.display = (transportType === 'cargo_only') ? 'none' : 'block';
  cargoSection.style.display = (transportType === 'passengers_only') ? 'none' : 'block';
}

// Auto-calculate business and first class prices from economy
function autoCalculateBusinessFirst() {
  const economyPrice = parseFloat(document.getElementById('economyPrice').value) || 0;
  if (economyPrice > 0) {
    const businessField = document.getElementById('businessPrice');
    const firstField = document.getElementById('firstPrice');

    // Only auto-calculate if fields are enabled (available on this aircraft)
    if (!businessField.disabled) {
      businessField.value = Math.round(economyPrice * 2.6);
    }
    if (!firstField.disabled) {
      firstField.value = Math.round(economyPrice * 4.6);
    }
  }
}

// Adjust individual price field by percentage
function adjustPrice(fieldId, percentage) {
  const field = document.getElementById(fieldId);
  // Skip disabled fields (unavailable passenger classes)
  if (field.disabled) return;

  const currentValue = parseFloat(field.value) || 0;
  const newValue = Math.round(currentValue * (1 + percentage / 100));
  field.value = newValue;
}

// Bulk adjust all ticket prices
function adjustAllTicketPrices(percentage) {
  adjustPrice('economyPrice', percentage);
  adjustPrice('economyPlusPrice', percentage);
  adjustPrice('businessPrice', percentage);
  adjustPrice('firstPrice', percentage);
}

// Bulk adjust all cargo rates
function adjustAllCargoRates(percentage) {
  adjustPrice('cargoLightRate', percentage);
  adjustPrice('cargoStandardRate', percentage);
  adjustPrice('cargoHeavyRate', percentage);
}

// ── Custom ATC Route ──────────────────────────────────────────────────────────

let customAtcWaypoints = null; // [{name, lat, lng}, ...] — set when user applies a custom route
let customAtcRouteString = '';
let autoAtcWaypoints = null; // [{name, lat, lng}, ...] — auto-computed from server
let autoAtcAvoidedFirs = []; // FIR codes that were avoided
let autoAtcNatTrack = null;  // {id, name, direction, waypoints} — NAT track used if any
let _atcPreviewAbort = null; // AbortController for in-flight preview requests

async function fetchAtcRoutePreview() {
  if (!baseAirport || !selectedDestinationAirport) return;

  // Abort any in-flight request
  if (_atcPreviewAbort) _atcPreviewAbort.abort();
  _atcPreviewAbort = new AbortController();

  try {
    const response = await fetch('/api/routes/preview-atc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        departureAirportId: baseAirport.id,
        arrivalAirportId: selectedDestinationAirport.id
      }),
      signal: _atcPreviewAbort.signal
    });

    if (!response.ok) {
      autoAtcWaypoints = null;
      autoAtcAvoidedFirs = [];
      autoAtcNatTrack = null;
      return;
    }

    const data = await response.json();
    autoAtcWaypoints = data.waypoints && data.waypoints.length > 2 ? data.waypoints : null;
    autoAtcAvoidedFirs = data.avoidedFirs || [];
    autoAtcNatTrack = data.natTrack || null;

    // Update the info panel
    updateAutoAtcInfoPanel();

    // Update the map if no custom route is set
    if (!customAtcWaypoints) {
      updateRoutePreview();
    }
  } catch (e) {
    if (e.name !== 'AbortError') {
      autoAtcWaypoints = null;
      autoAtcAvoidedFirs = [];
      autoAtcNatTrack = null;
      updateAutoAtcInfoPanel();
    }
  }
}

function updateAutoAtcInfoPanel() {
  const infoEl = document.getElementById('autoAtcInfo');
  const textEl = document.getElementById('autoAtcInfoText');
  const avoidEl = document.getElementById('autoAtcAvoidInfo');
  if (!infoEl) return;

  if (autoAtcWaypoints && autoAtcWaypoints.length > 2) {
    const innerWps = autoAtcWaypoints.filter(wp => wp.name !== 'DEP' && wp.name !== 'ARR');

    // Build route string, replacing consecutive NAT track waypoints with "ENTRY NAT X EXIT"
    const parts = [];
    let inNat = false;
    let natEntry = null;
    let currentAirway = null;
    for (let i = 0; i < innerWps.length; i++) {
      const wp = innerWps[i];
      if (wp.natTrack) {
        if (!inNat) {
          natEntry = wp.name;
          inNat = true;
        }
        // Check if next wp is NOT on the same track (or end of list) — emit the full label
        const next = innerWps[i + 1];
        if (!next || !next.natTrack) {
          parts.push(`${natEntry} NAT ${wp.natTrack} ${wp.name}`);
        }
      } else {
        inNat = false;
        parts.push(wp.name);
        // Insert airway identifier after this fix if it changes from what was last shown
        if (wp.airway && wp.airway !== currentAirway) {
          parts.push(wp.airway);
          currentAirway = wp.airway;
        } else if (!wp.airway) {
          currentAirway = null;
        }
      }
    }
    const routeStr = parts.join(' ');
    textEl.textContent = `ATC Route: ${routeStr}`;
    infoEl.style.display = 'block';
  } else {
    textEl.textContent = 'ATC Route: Direct (too short for waypoints)';
    infoEl.style.display = 'block';
  }

  if (autoAtcAvoidedFirs.length > 0) {
    avoidEl.textContent = `Avoiding: ${autoAtcAvoidedFirs.join(', ')}`;
    avoidEl.style.display = 'block';
  } else {
    avoidEl.style.display = 'none';
  }
}

function openCustomAtcModal() {
  const modal = document.getElementById('customAtcModal');
  modal.style.display = 'flex';
  // Pre-fill with previous value if exists
  if (customAtcRouteString) {
    document.getElementById('atcRouteInput').value = customAtcRouteString;
  }
}

function closeCustomAtcModal() {
  document.getElementById('customAtcModal').style.display = 'none';
}

async function resolveCustomAtcRoute() {
  const input = document.getElementById('atcRouteInput').value.trim();
  if (!input) return;

  const resolveBtn = document.getElementById('resolveAtcBtn');
  resolveBtn.disabled = true;
  resolveBtn.textContent = 'RESOLVING...';

  try {
    const response = await fetch('/api/routes/resolve-atc-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        atcRouteString: input,
        departureAirportId: baseAirport?.id || null,
        arrivalAirportId: selectedDestinationAirport?.id || null
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to resolve route');
    }

    const data = await response.json();

    // Show results section
    document.getElementById('atcResolveResults').style.display = 'block';

    // Update counts
    document.getElementById('atcResolvedCount').textContent = `${data.resolved.length} resolved`;
    document.getElementById('atcAirwayCount').textContent = `${data.airways.length} airways`;

    // Unresolved
    const unresolvedSection = document.getElementById('atcUnresolvedSection');
    const unresolvedBadge = document.getElementById('atcUnresolvedCount');
    if (data.unresolved.length > 0) {
      unresolvedBadge.textContent = `${data.unresolved.length} unresolved`;
      unresolvedBadge.style.display = '';
      unresolvedSection.style.display = '';
      document.getElementById('atcUnresolvedList').textContent = data.unresolved.join(', ');
    } else {
      unresolvedBadge.style.display = 'none';
      unresolvedSection.style.display = 'none';
    }

    // Restriction warnings
    const restrictionSection = document.getElementById('atcRestrictionSection');
    if (data.restrictionWarnings && data.restrictionWarnings.length > 0) {
      restrictionSection.style.display = '';
      document.getElementById('atcRestrictionList').innerHTML = data.restrictionWarnings.map(w =>
        `<div style="margin: 0.2rem 0;">Waypoint <strong>${w.waypointName}</strong> is inside restricted FIR <strong>${w.firCode}</strong> (${w.firName || w.firCode})</div>`
      ).join('');
    } else {
      restrictionSection.style.display = 'none';
    }

    // Waypoint list
    const wpList = document.getElementById('atcWaypointList');
    if (data.resolved.length > 0) {
      wpList.innerHTML = data.resolved.map((wp, i) =>
        `<div class="atc-waypoint-row">
          <div style="display: flex; align-items: center;">
            <span class="wp-index">${i + 1}</span>
            <span class="wp-name">${wp.name}</span>
          </div>
          <span class="wp-coords">${wp.lat.toFixed(4)}, ${wp.lng.toFixed(4)}</span>
        </div>`
      ).join('');

      // Enable apply button
      const applyBtn = document.getElementById('applyAtcBtn');
      applyBtn.disabled = false;
      applyBtn.style.opacity = '1';
    } else {
      wpList.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-muted);">No fixes could be resolved from this route string.</div>';
      document.getElementById('applyAtcBtn').disabled = true;
      document.getElementById('applyAtcBtn').style.opacity = '0.5';
    }

    // Store temporarily for apply
    window._pendingAtcResolved = data.resolved;
    window._pendingAtcRouteString = input;
    window._pendingAtcRestrictionWarnings = data.restrictionWarnings || [];

  } catch (err) {
    console.error('[CustomATC] Resolve failed:', err);
    showWarningModal(err.message);
  } finally {
    resolveBtn.disabled = false;
    resolveBtn.textContent = 'RESOLVE ROUTE';
  }
}

function applyCustomAtcRoute() {
  if (!window._pendingAtcResolved || window._pendingAtcResolved.length === 0) return;

  customAtcWaypoints = window._pendingAtcResolved;
  customAtcRouteString = window._pendingAtcRouteString;

  // Show indicator below map
  const indicator = document.getElementById('customAtcIndicator');
  indicator.style.display = 'flex';
  document.getElementById('customAtcIndicatorText').textContent =
    `Custom ATC route set — ${customAtcWaypoints.length} waypoints`;

  // Update route preview with custom waypoints
  updateRoutePreviewWithCustomWaypoints();

  closeCustomAtcModal();
}

function clearCustomAtcRoute() {
  customAtcWaypoints = null;
  customAtcRouteString = '';
  document.getElementById('customAtcIndicator').style.display = 'none';
  // Reset to standard route preview
  updateRoutePreview();
}

async function updateRoutePreviewWithCustomWaypoints() {
  if (!routePreviewMap || !baseAirport || !selectedDestinationAirport || !customAtcWaypoints) return;

  // Clear existing markers and lines
  routePreviewMarkers.forEach(m => routePreviewMap.removeLayer(m));
  routePreviewMarkers = [];
  if (routePreviewLine) {
    routePreviewLine.forEach(l => routePreviewMap.removeLayer(l));
  }

  // Draw avoided FIR boundaries (underneath route)
  await drawAvoidedFirsOnMap(routePreviewMap, routePreviewMarkers);

  const dep = [parseFloat(baseAirport.latitude), parseFloat(baseAirport.longitude)];
  const arr = [parseFloat(selectedDestinationAirport.latitude), parseFloat(selectedDestinationAirport.longitude)];

  // Departure marker
  const depMarker = L.circleMarker(dep, {
    radius: 8, fillColor: '#3fb950', fillOpacity: 1, color: '#fff', weight: 2
  }).addTo(routePreviewMap).bindPopup(`<b>${baseAirport.iataCode || baseAirport.icaoCode}</b><br>${baseAirport.name}`);
  routePreviewMarkers.push(depMarker);

  // Arrival marker
  const arrMarker = L.circleMarker(arr, {
    radius: 8, fillColor: '#58a6ff', fillOpacity: 1, color: '#fff', weight: 2
  }).addTo(routePreviewMap).bindPopup(`<b>${selectedDestinationAirport.iataCode || selectedDestinationAirport.icaoCode}</b><br>${selectedDestinationAirport.name}`);
  routePreviewMarkers.push(arrMarker);

  // Build polyline through all waypoints
  const routeCoords = [dep];
  for (const wp of customAtcWaypoints) {
    const pt = [wp.lat, wp.lng];
    routeCoords.push(pt);

    // Small waypoint marker
    const wpMarker = L.circleMarker(pt, {
      radius: 3, fillColor: '#e3b341', fillOpacity: 1, color: 'rgba(227, 179, 65, 0.5)', weight: 1
    }).addTo(routePreviewMap).bindPopup(`<b>${wp.name}</b><br>${wp.lat.toFixed(4)}, ${wp.lng.toFixed(4)}`);
    routePreviewMarkers.push(wpMarker);
  }
  routeCoords.push(arr);

  // Draw the route line through waypoints
  const line = L.polyline(routeCoords, {
    color: '#e3b341',
    weight: 2,
    opacity: 0.9,
    dashArray: null
  }).addTo(routePreviewMap);
  routePreviewLine = [line];

  // Fit bounds
  const bounds = L.latLngBounds(routeCoords);
  routePreviewMap.fitBounds(bounds, { padding: [15, 15], maxZoom: 8 });
}

// Submit new route
async function submitNewRoute() {
  const prefix = worldInfo?.iataCode || '';
  const routeNumberPart = document.getElementById('routeNumber').value.trim();
  const returnRouteNumberPart = document.getElementById('returnRouteNumber').value.trim();

  // Validation - check for empty flight numbers
  if (!routeNumberPart) {
    showWarningModal('Please enter an outbound flight number', 'routeNumber');
    return;
  }

  if (!returnRouteNumberPart) {
    showWarningModal('Please enter a return flight number', 'returnRouteNumber');
    return;
  }

  const routeNumber = prefix + routeNumberPart;
  const returnRouteNumber = prefix + returnRouteNumberPart;
  const assignedAircraftId = document.getElementById('assignedAircraft').value || null;
  const departureTime = document.getElementById('departureTime').value;
  const turnaroundTime = parseInt(document.getElementById('turnaroundTime').value) || 45;

  // Get pricing values
  const economyPrice = parseFloat(document.getElementById('economyPrice').value) || 0;
  const economyPlusPrice = parseFloat(document.getElementById('economyPlusPrice').value) || 0;
  const businessPrice = parseFloat(document.getElementById('businessPrice').value) || 0;
  const firstPrice = parseFloat(document.getElementById('firstPrice').value) || 0;
  const transportType = document.getElementById('transportType').value;

  // Check for route number conflicts on same operating days
  if (!validateRouteNumber('routeNumber')) {
    showWarningModal('Route number conflicts with an existing route on the selected operating days. Choose a different route number or change the operating days.', 'routeNumber');
    return;
  }

  // Check for return route number conflicts on same operating days
  if (!validateRouteNumber('returnRouteNumber')) {
    showWarningModal('Return route number conflicts with an existing route on the selected operating days. Choose a different route number or change the operating days.', 'returnRouteNumber');
    return;
  }

  if (!selectedDestinationAirport) {
    showWarningModal('Please select a destination airport');
    return;
  }

  if (!departureTime) {
    showWarningModal('Please enter a departure time', 'departureTime');
    return;
  }

  if (!assignedAircraftId) {
    showWarningModal('Please select an aircraft type for route calculations', 'assignedAircraft');
    return;
  }

  // Validate aircraft range
  if (!checkAircraftRange()) {
    const acData = aircraftDataById[assignedAircraftId];
    const acName = acData ? `${acData.manufacturer} ${acData.model}` : 'Selected aircraft';
    showWarningModal(`${acName} does not have sufficient range for this route. Add a technical stop to bring each leg within the aircraft's range (${acData ? acData.rangeNm.toLocaleString() : '?'} NM).`, 'assignedAircraft');
    return;
  }

  // Validate pricing based on transport type
  if (transportType === 'passengers_only' || transportType === 'both') {
    const economyField = document.getElementById('economyPrice');
    // Only validate economy price if the field is enabled (aircraft has economy class)
    if (!economyField.disabled && (!economyPrice || economyPrice <= 0)) {
      showWarningModal('Please enter a valid Economy class ticket price', 'economyPrice');
      return;
    }
  }

  if (selectedDaysOfWeek.length === 0) {
    showWarningModal('Please select at least one day of operation', 'daysOfWeekContainer');
    return;
  }

  // Check if we should create separate routes for each day
  const createSeparateRoutes = document.getElementById('createSeparateDailyRoutes').checked;

  // Show loading overlay
  showLoadingOverlay(createSeparateRoutes ? `Creating ${selectedDaysOfWeek.length} routes...` : 'Creating route...');

  try {
    if (createSeparateRoutes && selectedDaysOfWeek.length > 1) {
      // Create separate routes for each selected day (same flight number, different days)
      let createdRoutes = [];
      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      for (let i = 0; i < selectedDaysOfWeek.length; i++) {
        const day = selectedDaysOfWeek[i];
        updateLoadingProgress(i + 1, selectedDaysOfWeek.length, `Creating ${routeNumber} (${dayLabels[day]})...`);
        const response = await fetch('/api/routes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            routeNumber: routeNumber, // Same flight number for all
            returnRouteNumber: returnRouteNumber, // Same return flight number for all
            departureAirportId: baseAirport.id,
            arrivalAirportId: selectedDestinationAirport.id,
            techStopAirportId: selectedTechStopAirport ? selectedTechStopAirport.id : null,
            assignedAircraftId: assignedAircraftId,
            distance: selectedTechStopAirport && selectedDestinationAirport.routingDistance
              ? selectedDestinationAirport.routingDistance
              : selectedDestinationAirport.distance,
            scheduledDepartureTime: departureTime,
            turnaroundTime,
            daysOfWeek: [day], // Single day only
            ticketPrice: economyPrice,
            economyPrice: economyPrice,
            economyPlusPrice: economyPlusPrice,
            businessPrice: businessPrice,
            firstPrice: firstPrice,
            cargoLightRate: parseFloat(document.getElementById('cargoLightRate').value) || 0,
            cargoStandardRate: parseFloat(document.getElementById('cargoStandardRate').value) || 0,
            cargoHeavyRate: parseFloat(document.getElementById('cargoHeavyRate').value) || 0,
            transportType: transportType,
            demand: 0,
            customWaypoints: customAtcWaypoints || autoAtcWaypoints || undefined
          })
        });

        const data = await response.json();

        if (!response.ok) {
          hideLoadingOverlay();
          // Check if it's a slot validation error
          if (data.error === 'Insufficient airport slots') {
            showSlotErrorModal(data);
            return;
          }
          throw new Error(data.error || `Failed to create route ${routeNumber} for ${dayLabels[day]}`);
        }

        createdRoutes.push(`${routeNumber} (${dayLabels[day]})`);
      }

      // Success - keep loading overlay visible during redirect
      window.location.href = `/routes?success=created&route=${encodeURIComponent(routeNumber + ' - ' + selectedDaysOfWeek.length + ' services')}`;
    } else {
      // Create single route with all selected days (default behavior)
      const response = await fetch('/api/routes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          routeNumber,
          returnRouteNumber,
          departureAirportId: baseAirport.id,
          arrivalAirportId: selectedDestinationAirport.id,
          techStopAirportId: selectedTechStopAirport ? selectedTechStopAirport.id : null,
          assignedAircraftId: assignedAircraftId,
          distance: selectedTechStopAirport && selectedDestinationAirport.routingDistance
            ? selectedDestinationAirport.routingDistance
            : selectedDestinationAirport.distance,
          scheduledDepartureTime: departureTime,
          turnaroundTime,
          daysOfWeek: selectedDaysOfWeek,
          ticketPrice: economyPrice,
          economyPrice: economyPrice,
          economyPlusPrice: economyPlusPrice,
          businessPrice: businessPrice,
          firstPrice: firstPrice,
          cargoLightRate: parseFloat(document.getElementById('cargoLightRate').value) || 0,
          cargoStandardRate: parseFloat(document.getElementById('cargoStandardRate').value) || 0,
          cargoHeavyRate: parseFloat(document.getElementById('cargoHeavyRate').value) || 0,
          transportType: transportType,
          demand: 0,
          customWaypoints: customAtcWaypoints || autoAtcWaypoints || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        hideLoadingOverlay();
        // Check if it's a slot validation error
        if (data.error === 'Insufficient airport slots') {
          showSlotErrorModal(data);
          return;
        }
        throw new Error(data.error || 'Failed to create route');
      }

      // Success - keep loading overlay visible during redirect
      window.location.href = `/routes?success=created&route=${encodeURIComponent(routeNumber)}`;
    }
  } catch (error) {
    hideLoadingOverlay();
    console.error('Error creating route:', error);
    showWarningModal(`Error: ${error.message}`);
  }
}

// Loading overlay functions
function showLoadingOverlay(message = 'Creating route...') {
  // Remove existing overlay if present
  hideLoadingOverlay();

  const overlay = document.createElement('div');
  overlay.id = 'loadingOverlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  overlay.innerHTML = `
    <div style="text-align: center;">
      <div class="loading-spinner" style="
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-top: 4px solid var(--accent-color);
        border-radius: 50%;
        width: 60px;
        height: 60px;
        animation: spin 1s linear infinite;
        margin: 0 auto 1.5rem auto;
      "></div>
      <div id="loadingMessage" style="
        color: white;
        font-size: 1.2rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
      ">${message}</div>
      <div id="loadingProgress" style="
        color: rgba(255, 255, 255, 0.7);
        font-size: 0.9rem;
      "></div>
      <div id="loading-quip-create" style="font-size: 0.8rem; color: rgba(255,255,255,0.5); font-style: italic; margin-top: 0.75rem;"></div>
    </div>
  `;

  // Add spinner animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(overlay);
  startLoadingQuips('loading-quip-create');
}

function updateLoadingProgress(current, total, message) {
  const messageEl = document.getElementById('loadingMessage');
  const progressEl = document.getElementById('loadingProgress');

  if (messageEl) {
    messageEl.textContent = message;
  }

  if (progressEl) {
    progressEl.textContent = `${current} of ${total} routes created`;
  }
}

function hideLoadingOverlay() {
  stopLoadingQuips();
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.remove();
  }
}

// Show slot validation error modal
function showSlotErrorModal(errorData) {
  const modal = document.createElement('div');
  modal.id = 'slotErrorModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(10, 15, 26, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  const airportName = errorData.reason === 'departure'
    ? baseAirport.name
    : selectedDestinationAirport.name;

  const airportCode = errorData.reason === 'departure'
    ? baseAirport.icaoCode
    : selectedDestinationAirport.icaoCode;

  const slots = errorData.reason === 'departure'
    ? errorData.departureSlots
    : errorData.arrivalSlots;

  modal.innerHTML = `
    <div style="
      background: var(--surface);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    ">
      <div style="
        padding: 1.5rem;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        align-items: center;
        gap: 1rem;
      ">
        <div style="
          width: 50px;
          height: 50px;
          background: rgba(239, 68, 68, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        ">⚠️</div>
        <div>
          <h2 style="margin: 0; font-size: 1.2rem; font-weight: 700;">No Available Slots</h2>
          <p style="margin: 0.25rem 0 0 0; color: var(--text-secondary); font-size: 0.9rem;">Cannot create route</p>
        </div>
      </div>

      <div style="padding: 1.5rem;">
        <p style="color: var(--text-primary); line-height: 1.6; margin: 0 0 1rem 0;">
          <strong>${airportName} (${airportCode})</strong> has no available landing slots.
        </p>

        <div style="
          background: var(--surface-elevated);
          border-radius: 6px;
          padding: 1rem;
          margin-bottom: 1rem;
        ">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span style="color: var(--text-secondary);">Total Slots:</span>
            <span style="color: var(--text-primary); font-weight: 600;">${slots?.totalSlots || 0}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span style="color: var(--text-secondary);">Used Slots:</span>
            <span style="color: var(--warning-color); font-weight: 600;">${slots?.usedSlots || 0}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-secondary);">Available:</span>
            <span style="color: var(--success-color); font-weight: 600;">${slots?.availableSlots || 0}</span>
          </div>
        </div>

        <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.5; margin: 0;">
          To create this route, you'll need to either:<br>
          • Remove or suspend an existing route at this airport<br>
          • Choose a different ${errorData.reason} airport with available slots
        </p>
      </div>

      <div style="
        padding: 1rem 1.5rem;
        border-top: 1px solid var(--border-color);
        display: flex;
        justify-content: flex-end;
      ">
        <button
          onclick="document.getElementById('slotErrorModal').remove()"
          style="
            padding: 0.65rem 1.5rem;
            background: var(--accent-color);
            border: none;
            border-radius: 4px;
            color: white;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.2s;
          "
          onmouseover="this.style.opacity='0.9'"
          onmouseout="this.style.opacity='1'"
        >
          OK
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // Close on Escape key
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
}

// Technical Stop Functions
function toggleTechStopSection() {
  const checkbox = document.getElementById('includeTechStop');
  const section = document.getElementById('techStopSection');

  if (checkbox.checked) {
    section.style.display = 'block';
  } else {
    section.style.display = 'none';
    clearTechStop();
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  // Haversine formula to calculate distance in nautical miles
  const R = 3440.065; // Earth's radius in nautical miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return Math.round(distance);
}

function searchTechStopAirports() {
  const searchInput = document.getElementById('techStopSearch');
  const searchTerm = searchInput.value.trim().toLowerCase();
  const resultsContainer = document.getElementById('techStopResults');

  if (searchTerm.length < 2) {
    resultsContainer.style.display = 'none';
    return;
  }

  // Filter airports based on search term
  const filteredAirports = availableAirports.filter(airport => {
    return (
      airport.icaoCode?.toLowerCase().includes(searchTerm) ||
      airport.iataCode?.toLowerCase().includes(searchTerm) ||
      airport.name?.toLowerCase().includes(searchTerm) ||
      airport.city?.toLowerCase().includes(searchTerm)
    );
  }).slice(0, 10); // Limit to 10 results

  if (filteredAirports.length === 0) {
    resultsContainer.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.75rem;">No airports found</div>';
    resultsContainer.style.display = 'block';
    return;
  }

  // Render results
  resultsContainer.innerHTML = filteredAirports.map(airport => `
    <div
      onclick="selectTechStop('${airport.id}')"
      style="padding: 0.5rem; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background 0.2s;"
      onmouseover="this.style.background='var(--surface)'"
      onmouseout="this.style.background='transparent'"
    >
      <div style="font-weight: 600; font-size: 0.8rem; color: var(--text-primary); margin-bottom: 0.15rem;">
        ${airport.icaoCode} - ${airport.name}
      </div>
      <div style="font-size: 0.7rem; color: var(--text-secondary);">
        ${airport.city}, ${airport.country}
      </div>
    </div>
  `).join('');

  resultsContainer.style.display = 'block';
}

function selectTechStop(airportId) {
  if (!baseAirport || !selectedDestinationAirport) {
    showWarningModal('Please select a destination first');
    return;
  }

  // Find the selected airport
  const airport = availableAirports.find(a => a.id === airportId);
  if (!airport) return;

  selectedTechStopAirport = airport;

  // Calculate distances for each leg
  const distanceFromDep = calculateDistance(
    baseAirport.latitude,
    baseAirport.longitude,
    airport.latitude,
    airport.longitude
  );

  const distanceToDest = calculateDistance(
    airport.latitude,
    airport.longitude,
    selectedDestinationAirport.latitude,
    selectedDestinationAirport.longitude
  );

  // Store leg distances on the tech stop object for later use
  selectedTechStopAirport.distanceFromDeparture = distanceFromDep;
  selectedTechStopAirport.distanceToDestination = distanceToDest;

  // Calculate total routing distance (one-way): A→B + B→C
  const totalRoutingDistance = distanceFromDep + distanceToDest;

  // Update the destination's distance to reflect the routing distance
  selectedDestinationAirport.routingDistance = totalRoutingDistance;

  // Update display
  document.getElementById('techStopName').textContent =
    `${airport.icaoCode} - ${airport.name}`;
  document.getElementById('techStopDetails').textContent =
    `${airport.city}, ${airport.country}`;
  document.getElementById('techStopDistanceFromDep').textContent =
    `${distanceFromDep} NM`;
  document.getElementById('techStopDistanceToDest').textContent =
    `${distanceToDest} NM`;

  // Hide search results and show selected tech stop
  document.getElementById('techStopResults').style.display = 'none';
  document.getElementById('selectedTechStop').style.display = 'block';
  document.getElementById('techStopSearch').value = '';

  // Recalculate flight timing with tech stop
  calculateFlightTiming();

  // Update route preview map
  updateRoutePreview();
}

function clearTechStop() {
  selectedTechStopAirport = null;

  // Clear routing distance from destination
  if (selectedDestinationAirport) {
    delete selectedDestinationAirport.routingDistance;
  }

  document.getElementById('selectedTechStop').style.display = 'none';
  document.getElementById('techStopSearch').value = '';
  document.getElementById('techStopResults').style.display = 'none';

  // Recalculate flight timing without tech stop
  calculateFlightTiming();

  // Update route preview map
  updateRoutePreview();
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
  await fetchWorldInfo();
  await fetchUserFleet();
  await fetchExistingRoutes();

  // Fetch pricing defaults in the background
  fetchGlobalPricing();
  fetchAircraftTypePricing();

  if (!baseAirport) {
    showWarningModal('Could not determine your base airport. Please set a base airport first.');
    setTimeout(() => { window.location.href = '/routes'; }, 2000);
    return;
  }

  await loadAvailableAirports();

  // Add event listeners for return route calculations
  document.getElementById('departureTime').addEventListener('change', calculateFlightTiming);
  document.getElementById('turnaroundTime').addEventListener('input', onTurnaroundTimeChange);
  document.getElementById('assignedAircraft').addEventListener('change', onAircraftSelectionChange);
  document.getElementById('routeNumber').addEventListener('input', suggestReturnRouteNumber);
  document.getElementById('returnRouteNumber').addEventListener('input', () => validateRouteNumber('returnRouteNumber'));

  // Add event listeners for pricing functionality
  const transportTypeEl = document.getElementById('transportType');
  if (transportTypeEl) {
    transportTypeEl.addEventListener('change', updatePricingVisibility);
  }

  const economyPriceEl = document.getElementById('economyPrice');
  if (economyPriceEl) {
    economyPriceEl.addEventListener('change', autoCalculateBusinessFirst);
  }

  // Check for pre-filled departure time from URL (e.g., from "Create Next Flight" button)
  const urlParams = new URLSearchParams(window.location.search);
  const prefilledTime = urlParams.get('time');
  if (prefilledTime) {
    const departureTimeInput = document.getElementById('departureTime');
    if (departureTimeInput) {
      departureTimeInput.value = prefilledTime;
      // Trigger change event to update flight timing calculations
      departureTimeInput.dispatchEvent(new Event('change'));
    }
  }
});

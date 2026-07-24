// World Map - Live Flight Tracking

let map = null;
let flightMarkers = new Map(); // Map of flight ID to marker
let routeLines = new Map(); // Map of flight ID to polyline
let airportMarkers = new Map(); // Map of airport ID to marker
let selectedFlightId = null;
let updateInterval = null;
let activeFlights = []; // Store flight data for selection
let airlineFilterMode = 'all'; // 'all' (default) or 'mine' — HQ filter removed 2026-07
let pendingAircraftSelect = null; // Aircraft registration to auto-select after loading
let flightsListOpen = false; // Hidden by default, user can toggle open
let waypointMarkers = []; // Waypoint dot markers for selected flight

// Sightseeing tours (scenic loops) — rendered alongside flights on the map
let activeTours = []; // Store active tour data
let tourMarkers = new Map(); // tour ID -> aircraft marker
let tourLoopLines = new Map(); // tour ID -> loop polyline
let selectedTourId = null; // Tour whose loop is currently shown

// FIR boundary overlay state
let firLayerGroup = null;    // L.layerGroup holding FIR polygons
let firLabelGroup = null;    // L.layerGroup holding FIR code labels
let firVisible = false;
let firDataLoaded = false;
let firGeoJsonData = null;
let firRestrictedCodes = new Set(); // Restricted FIR codes from airspace config

// NAT tracks overlay state
let natLayerGroup = null;    // L.layerGroup holding NAT track polylines + waypoint markers
let natLabelGroup = null;    // L.layerGroup holding NAT track name labels
let natVisible = false;
let natDataLoaded = false;
let natTrackData = null;

// Synchronized position updates - all aircraft jump together on each tick
let positionUpdateInterval = null;

// Update all marker positions in one synchronized batch
function syncUpdateAllPositions() {
  activeFlights.forEach(flight => {
    const marker = flightMarkers.get(flight.id);

    const position = calculateFlightPosition(flight);

    // Hide aircraft during turnaround or tech stop
    if (position.phase === 'turnaround' || position.phase === 'techstop') {
      if (marker) {
        map.removeLayer(marker);
        flightMarkers.delete(flight.id);
      }
      return;
    }

    // Re-create marker if it doesn't exist (e.g., exiting turnaround)
    if (!marker) {
      createFlightMarker(flight, position);
      return;
    }

    marker.setLatLng([position.lat, position.lng]);
    // Only update bearing if it changed significantly (>2 degrees).
    // Bearing is UNWRAPPED into a continuous angle (359°→1° becomes +2°,
    // not -358°) so the CSS rotation transition turns the short way.
    const bearing = calculateBearing(position.lat, position.lng, position.destLat, position.destLng);
    const prevBearing = flight._lastBearing !== undefined ? flight._lastBearing : bearing;
    let delta = ((bearing - (prevBearing % 360 + 360) % 360) + 540) % 360 - 180;
    if (Math.abs(delta) > 2) {
      const continuous = prevBearing + delta;
      flight._lastBearing = continuous;
      const iconEl = marker.getElement();
      if (iconEl) {
        const inner = iconEl.querySelector('.aircraft-marker-inner');
        if (inner) {
          inner.style.transform = `rotate(${continuous}deg)`;
        }
      }
    }
  });

  // Detect phase change for selected flight and redraw route if needed
  if (selectedFlightId) {
    const selectedFlight = activeFlights.find(f => f.id === selectedFlightId);
    if (selectedFlight) {
      const pos = calculateFlightPosition(selectedFlight);
      if (selectedFlight._lastDrawnPhase !== undefined && selectedFlight._lastDrawnPhase !== pos.phase) {
        // Phase changed - redraw route and info panel for new sector
        redrawSelectedFlightRoute(selectedFlight);
        showFlightInfo(selectedFlight);
      }
      selectedFlight._lastDrawnPhase = pos.phase;
    }
    updateFlightInfoProgress();
  }

  // Move sightseeing tour markers along their loops
  syncUpdateTourPositions();

  // Refresh flights list (only if open)
  if (flightsListOpen) updateFlightsListPositions();
}

// Start synchronized position updates (2 second interval - aircraft move slowly enough)
function startPositionUpdates() {
  if (positionUpdateInterval) return;
  positionUpdateInterval = setInterval(syncUpdateAllPositions, 2000);
}

// Stop position updates
function stopPositionUpdates() {
  if (positionUpdateInterval) {
    clearInterval(positionUpdateInterval);
    positionUpdateInterval = null;
  }
}

// Aircraft icon SVGs by category. Plan-view silhouettes, nose pointing up
// (north / bearing 0) so the marker rotation reads correctly. No fill here —
// colour is applied by CSS (own = accent, other = grey, selected = yellow) and
// inherited by the child shapes.
// Clean top-down airliner silhouettes (VATSIM-Radar style): smooth fuselage,
// swept wing, tail stabiliser, and teardrop engine pods. Built from overlapping
// same-fill shapes on a 48x48 grid. Size is driven by `px` (see createFlightMarker).
const AIRCRAFT_ICONS = {
  // Light / GA aircraft (<20 seats) — straight wings, nose propeller
  light: {
    px: 16,
    svg: `<svg viewBox="0 0 48 48"><path d="M24 8c1.3 0 1.3 1.4 1.3 3V38c0 1.4 0 2.5-1.3 2.5S22.7 39.4 22.7 38V11c0-1.6 0-3 1.3-3z"/><path d="M24 20l18 1.6v2.2L24 23 6 23.8v-2.2z"/><path d="M24 36l7 1v1.5l-7-.8-7 .8V37z"/></svg>`
  },
  // Small regional / turboprop — compact, short lightly-swept wings, two pods
  regional: {
    px: 20,
    svg: `<svg viewBox="0 0 48 48"><path d="M24 6c1.9 0 1.9 1.8 1.9 3.5V39c0 1.6 0 3-1.9 3s-1.9-1.4-1.9-3V9.5C22.1 7.8 22.1 6 24 6z"/><path d="M24 20l15 7v1.2l-15-3.7-15 3.7V27z"/><path d="M24 38l6 3.5v.8L24 40.5 18 42.3v-.8z"/><ellipse cx="15.5" cy="24.2" rx="1.4" ry="2.4"/><ellipse cx="32.5" cy="24.2" rx="1.4" ry="2.4"/></svg>`
  },
  // Short-haul narrowbody (A320 / 737) — swept wing, two pods
  shorthaul: {
    px: 24,
    svg: `<svg viewBox="0 0 48 48"><path d="M24 4.5c2.2 0 2.2 2 2.2 4V41c0 2 0 3-2.2 3s-2.2-1-2.2-3V8.5C21.8 6.5 21.8 4.5 24 4.5z"/><path d="M24 20l18 10v1.6l-18-6.1L6 31.6V30z"/><path d="M24 39.5l7 3.5v.9L24 41.8 17 43.9V43z"/><ellipse cx="16" cy="23.8" rx="1.8" ry="3"/><ellipse cx="32" cy="23.8" rx="1.8" ry="3"/></svg>`
  },
  // Twin-engine widebody (777 / A330 / 787) — larger, two big pods
  widebody2: {
    px: 30,
    svg: `<svg viewBox="0 0 48 48"><path d="M24 3.5c2.7 0 2.7 2.3 2.7 4.5V42c0 2 0 3-2.7 3s-2.7-1-2.7-3V8C21.3 5.8 21.3 3.5 24 3.5z"/><path d="M24 19l20 11v2l-20-6.5L4 32v-2z"/><path d="M24 40.5l8.5 3.7v1L24 42.8l-8.5 2.4v-1z"/><ellipse cx="15" cy="23" rx="2.2" ry="3.7"/><ellipse cx="33" cy="23" rx="2.2" ry="3.7"/></svg>`
  },
  // Four-engine widebody (747 / A340) — same size, four pods
  widebody4: {
    px: 31,
    svg: `<svg viewBox="0 0 48 48"><path d="M24 3.5c2.7 0 2.7 2.3 2.7 4.5V42c0 2 0 3-2.7 3s-2.7-1-2.7-3V8C21.3 5.8 21.3 3.5 24 3.5z"/><path d="M24 19l20 11v2l-20-6.5L4 32v-2z"/><path d="M24 40.5l8.5 3.7v1L24 42.8l-8.5 2.4v-1z"/><ellipse cx="18" cy="21.5" rx="1.9" ry="3.3"/><ellipse cx="30" cy="21.5" rx="1.9" ry="3.3"/><ellipse cx="11" cy="25" rx="1.9" ry="3.3"/><ellipse cx="37" cy="25" rx="1.9" ry="3.3"/></svg>`
  },
  // A380 — largest, very broad wing (spans nearly the full width), four pods
  a380: {
    px: 44,
    svg: `<svg viewBox="0 0 48 48"><path d="M24 3c3.1 0 3.1 2.5 3.1 5V42.5c0 2 0 3-3.1 3s-3.1-1-3.1-3V8C20.9 5.5 20.9 3 24 3z"/><path d="M24 18l23 12v2.6l-23-7.2-23 7.2V30z"/><path d="M24 40.5l10 4v1.1L24 43l-10 2.6v-1.1z"/><ellipse cx="17" cy="21" rx="2.1" ry="3.6"/><ellipse cx="31" cy="21" rx="2.1" ry="3.6"/><ellipse cx="9.5" cy="24.8" rx="2.1" ry="3.6"/><ellipse cx="38.5" cy="24.8" rx="2.1" ry="3.6"/></svg>`
  },
  // Concorde — long needle nose; slender delta wing starts mid-fuselage; twin nacelles
  concorde: {
    px: 26,
    svg: `<svg viewBox="0 0 48 48"><path d="M24 2.5c.8 0 1.2 1.7 1.2 4v16.5L44 40v1.6l-18.8-.6v3.5c0 1.2-.6 1.8-1.2 1.8s-1.2-.6-1.2-1.8v-3.5L4 41.6V40l18.8-17V6.5c0-2.3.4-4 1.2-4z"/><rect x="17.6" y="40.3" width="4" height="4.4" rx="1"/><rect x="26.4" y="40.3" width="4" height="4.4" rx="1"/></svg>`
  },
  // Airship / blimp — cigar body with tail fins and gondola, no wings
  airship: {
    px: 26,
    svg: `<svg viewBox="0 0 48 48"><ellipse cx="24" cy="21" rx="8.6" ry="16"/><path d="M24 35l6.4 6.2H17.6z"/><path d="M15.4 32.5l-5.8 3.8 2.4-6.6z"/><path d="M32.6 32.5l5.8 3.8-2.4-6.6z"/><rect x="21.4" y="26" width="5.2" height="7" rx="2.4"/></svg>`
  }
};

// Four-engine widebodies. Engine count isn't stored, so resolve by ICAO family:
// 747 (B74x) and A340 (A34x) plus a few misc heavies. Trijets and everything
// else widebody fall through to the twin icon (per design decision).
function isFourEngineWidebody(icao) {
  if (!icao) return false;
  icao = icao.toUpperCase();
  if (icao.startsWith('B74')) return true;   // 747 family (not the A380 — handled separately)
  if (icao.startsWith('A34')) return true;   // A340 family
  return icao === 'IL96' || icao === 'A124' || icao === 'A225' || icao === 'C5M';
}

// Map an aircraft type to one of the six icon categories.
function classifyAircraftIcon(at) {
  if (!at) return 'shorthaul';
  const type = (at.type || '').toLowerCase();
  const icao = (at.icaoCode || '').toUpperCase();
  const model = (at.model || '').toLowerCase();
  if (type === 'airship') return 'airship';
  if (icao === 'CONC' || model.includes('concorde')) return 'concorde';
  if (icao === 'A388' || model.includes('a380')) return 'a380';
  const cap = at.passengerCapacity || 0;
  if (cap > 0 && cap <= 19) return 'light'; // GA / commuter, smaller than regional
  if (type === 'regional') return 'regional';
  if (type === 'widebody' || type === 'cargo') {
    return isFourEngineWidebody(icao) ? 'widebody4' : 'widebody2';
  }
  return 'shorthaul'; // narrowbody / unknown
}

// Loading overlay for map
function showMapLoadingOverlay() {
  const mapContainer = document.getElementById('map');
  if (!mapContainer) return;

  // Remove existing overlay if any
  hideMapLoadingOverlay();

  const overlay = document.createElement('div');
  overlay.id = 'mapLoadingOverlay';
  overlay.innerHTML = `
    <div style="
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(13, 17, 23, 0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      gap: 1rem;
    ">
      <div style="
        width: 40px;
        height: 40px;
        border: 3px solid rgba(88, 166, 255, 0.3);
        border-top-color: #58a6ff;
        border-radius: 50%;
        animation: mapSpin 1s linear infinite;
      "></div>
      <div style="color: #8b949e; font-size: 0.9rem;">Populating flights...</div>
    </div>
    <style>
      @keyframes mapSpin {
        to { transform: rotate(360deg); }
      }
    </style>
  `;
  mapContainer.style.position = 'relative';
  mapContainer.appendChild(overlay);
}

function hideMapLoadingOverlay() {
  const overlay = document.getElementById('mapLoadingOverlay');
  if (overlay) {
    overlay.remove();
  }
}

function updateMapLoadingOverlayText(text) {
  const overlay = document.getElementById('mapLoadingOverlay');
  if (overlay) {
    const textEl = overlay.querySelector('div > div:last-child');
    if (textEl) textEl.textContent = text;
  }
}

function updateMapLoadingOverlayHtml(html) {
  const overlay = document.getElementById('mapLoadingOverlay');
  if (overlay) {
    const textEl = overlay.querySelector('div > div:last-child');
    if (textEl) textEl.innerHTML = html;
  }
}

function showFlightsLoadingOverlay() {
  const mapContainer = document.getElementById('map');
  if (!mapContainer || document.getElementById('flightsLoadingOverlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'flightsLoadingOverlay';
  overlay.innerHTML = `
    <div style="
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(13, 17, 23, 0.85);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      gap: 0.75rem;
    ">
      <div style="
        width: 36px; height: 36px;
        border: 3px solid rgba(88, 166, 255, 0.3);
        border-top-color: #58a6ff;
        border-radius: 50%;
        animation: mapSpin 1s linear infinite;
      "></div>
      <div id="flightsLoadingQuip" style="
        color: #e6edf3; font-size: 0.9rem; font-weight: 500;
      "></div>
    </div>
  `;
  mapContainer.style.position = 'relative';
  mapContainer.appendChild(overlay);
  startLoadingQuips('flightsLoadingQuip');
}

function hideFlightsLoadingOverlay() {
  stopLoadingQuips();
  const overlay = document.getElementById('flightsLoadingOverlay');
  if (overlay) overlay.remove();
}

async function checkBackfillThenLoad() {
  try {
    const res = await fetch('/api/world/airway-status');
    if (res.ok) {
      const status = await res.json();
      if (status.running) {
        const pct = status.total > 0 ? Math.round(((status.computed + status.skipped) / status.total) * 100) : 0;
        updateMapLoadingOverlayHtml(`Computing ATC routes for AI airlines (first time only)... ${pct}%<br><span style="font-size:0.8rem;opacity:0.7;">This runs in the background — feel free to come back when it's complete.</span>`);
        setTimeout(checkBackfillThenLoad, 2000);
        return;
      }
    }
  } catch (e) { /* continue to load */ }

  // Backfill done (or not running) — load flights normally
  loadActiveFlights();
  updateInterval = setInterval(loadActiveFlights, 10000);
}

// Wind adjustment for realistic flight times
// Jet stream flows west to east at mid-latitudes, making eastbound flights faster
const WIND_ADJUSTMENT_FACTOR = 0.13; // 13% variation for jet stream effect
const ROUTE_VARIATION_FACTOR = 0.035; // ±3.5% for natural-looking times

function getWindAdjustmentMultiplier(depLng, arrLng, depLat = 0, arrLat = 0) {
  // Calculate longitude difference (handling date line crossing)
  let lngDiff = arrLng - depLng;
  if (lngDiff > 180) lngDiff -= 360;
  else if (lngDiff < -180) lngDiff += 360;

  // Scale effect based on latitude (strongest at mid-latitudes 30-60°)
  const avgLat = Math.abs((depLat + arrLat) / 2);
  let latitudeScale = 1.0;
  if (avgLat < 20) latitudeScale = 0.2;
  else if (avgLat < 30) latitudeScale = 0.5;
  else if (avgLat > 60) latitudeScale = 0.6;

  // Only apply wind effect for significant east-west travel
  const totalLngTravel = Math.abs(lngDiff);
  if (totalLngTravel < 10) return 1.0;

  // Eastbound (positive lngDiff) = faster, Westbound = slower
  const direction = lngDiff > 0 ? -1 : 1;
  const eastWestRatio = Math.min(1, totalLngTravel / 90);
  const adjustment = direction * WIND_ADJUSTMENT_FACTOR * latitudeScale * eastWestRatio;

  return 1 + adjustment;
}

// Deterministic route-specific variation for natural-looking times
function getRouteVariation(depLat, depLng, arrLat, arrLng) {
  const coordSum = (depLat * 7.3) + (depLng * 11.7) + (arrLat * 13.1) + (arrLng * 17.9);
  const hash = Math.sin(coordSum) * 10000;
  const normalized = hash - Math.floor(hash);
  const variation = (normalized - 0.5) * 2 * ROUTE_VARIATION_FACTOR;
  return 1 + variation;
}

function calculateFlightDurationMs(distanceNm, depLng, arrLng, depLat, arrLat, cruiseSpeed = 450) {
  const baseHours = distanceNm / cruiseSpeed;
  const windMultiplier = getWindAdjustmentMultiplier(depLng, arrLng, depLat, arrLat);
  const routeVariation = getRouteVariation(depLat, depLng, arrLat, arrLng);
  return baseHours * windMultiplier * routeVariation * 60 * 60 * 1000;
}

// Round time string (HH:MM) to nearest 5 minutes
function roundTimeToNearest5(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const roundedMinutes = Math.round(minutes / 5) * 5;
  const adjustedHours = roundedMinutes === 60 ? (hours + 1) % 24 : hours;
  const finalMinutes = roundedMinutes === 60 ? 0 : roundedMinutes;
  return `${String(adjustedHours).padStart(2, '0')}:${String(finalMinutes).padStart(2, '0')}`;
}

// Dynamically load Leaflet library
function loadLeaflet() {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof L !== 'undefined') {
      console.log('[WorldMap] Leaflet already loaded');
      resolve();
      return;
    }

    console.log('[WorldMap] Loading Leaflet library...');

    // Load CSS first
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Load JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      console.log('[WorldMap] Leaflet loaded successfully');
      resolve();
    };
    script.onerror = () => {
      reject(new Error('Failed to load Leaflet'));
    };
    document.head.appendChild(script);
  });
}

// Initialize the map
function initMap() {
  console.log('[WorldMap] Initializing map...');

  // Show loading overlay while flights load
  showMapLoadingOverlay();

  // Check URL parameters for aircraft to auto-select
  const urlParams = new URLSearchParams(window.location.search);
  pendingAircraftSelect = urlParams.get('aircraft'); // Registration number
  if (pendingAircraftSelect) {
    console.log('[WorldMap] Will auto-select aircraft:', pendingAircraftSelect);
  }

  // Create map centered on world view with world wrapping enabled
  map = L.map('map', {
    center: [30, 0],
    zoom: 3,
    minZoom: 2,
    maxZoom: 18,
    zoomControl: true,
    attributionControl: true,
    worldCopyJump: true  // Enable seamless world wrapping when panning
  });

  // Keep attribution clear of the always-on global footer (bottom-right)
  map.attributionControl.setPosition('bottomleft');

  // ── Smooth aircraft movement ──────────────────────────────────────────────
  // Positions recompute every 2s (syncUpdateAllPositions); a CSS transition
  // on the marker transform makes Leaflet's setLatLng glide linearly between
  // updates — constant-speed flight, so linear interpolation is exact. The
  // transition must be OFF during zoom (Leaflet re-transforms every marker,
  // which would otherwise "swim" for 2s after each zoom) and when a marker
  // is first created (it would glide in from the map origin).
  const smoothStyle = document.createElement('style');
  smoothStyle.textContent = `
    .leaflet-marker-icon.aircraft-marker {
      transition: transform 2.1s linear;
    }
    .leaflet-zoom-anim .leaflet-marker-icon.aircraft-marker,
    .ac-no-transition .leaflet-marker-icon.aircraft-marker,
    .leaflet-marker-icon.aircraft-marker.just-created {
      transition: none;
    }
    /* Rotation lives on .aircraft-marker-inner — ease it too so heading
       changes at waypoints turn instead of snapping (bearing values are
       unwrapped in JS so 359°→1° turns 2° short way, not 358° around) */
    .leaflet-marker-icon.aircraft-marker .aircraft-marker-inner {
      transition: transform 2.1s linear;
    }
    .leaflet-zoom-anim .leaflet-marker-icon.aircraft-marker .aircraft-marker-inner,
    .ac-no-transition .leaflet-marker-icon.aircraft-marker .aircraft-marker-inner {
      transition: none;
    }
  `;
  document.head.appendChild(smoothStyle);
  map.on('zoomstart', () => map.getContainer().classList.add('ac-no-transition'));
  map.on('zoomend', () => {
    // Re-enable one frame after Leaflet has snapped final zoom positions
    requestAnimationFrame(() => requestAnimationFrame(() =>
      map.getContainer().classList.remove('ac-no-transition')));
  });

  // CartoDB basemap — dark or light to match the app theme. noWrap:false
  // lets tiles repeat for infinite horizontal scrolling.
  const tileUrl = (theme) =>
    `https://{s}.basemaps.cartocdn.com/${theme === 'light' ? 'light_all' : 'dark_all'}/{z}/{x}/{y}{r}.png`;
  let currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  const baseTileLayer = L.tileLayer(tileUrl(currentTheme), {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
    noWrap: false
  }).addTo(map);

  // Swap basemap live when the footer theme toggle is used.
  window.__onThemeChange = function (theme) {
    const t = theme === 'light' ? 'light' : 'dark';
    if (t === currentTheme) return;
    currentTheme = t;
    baseTileLayer.setUrl(tileUrl(t));
  };

  console.log('[WorldMap] Map initialized with', currentTheme, 'theme');

  // Check if ATC routes are still being computed, then load flights
  checkBackfillThenLoad();

  // Start synchronized position updates (all aircraft jump together)
  startPositionUpdates();

  // Click on map to deselect flight
  map.on('click', (e) => {
    if (e.originalEvent.target === map.getContainer() || e.originalEvent.target.classList.contains('leaflet-tile')) {
      deselectFlight();
    }
  });

  // Close button handler
  const closeBtn = document.getElementById('closePanelBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      deselectFlight();
    });
  }

  // Flights list toggle button
  const flightsToggle = document.getElementById('flightsListToggle');
  if (flightsToggle) {
    flightsToggle.addEventListener('click', toggleFlightsList);
  }

  // FIR boundaries toggle button
  const firToggle = document.getElementById('firToggle');
  if (firToggle) {
    firToggle.addEventListener('click', toggleFirBoundaries);
  }

  // NAT tracks toggle button — only available from 1961 onwards
  const natToggle = document.getElementById('natToggle');
  if (natToggle) {
    const gameTime = window.getGlobalWorldTime ? window.getGlobalWorldTime() : null;
    if (gameTime && gameTime.getFullYear() < 1961) {
      natToggle.style.display = 'none';
    } else {
      natToggle.addEventListener('click', toggleNatTracks);
    }
  }

  // Set initial flights list state based on screen size
  const flightsPanel = document.getElementById('flightsListPanel');
  if (flightsPanel) {
    if (flightsListOpen) {
      flightsPanel.style.display = 'flex';
      if (flightsToggle) flightsToggle.classList.add('active');
    } else {
      flightsPanel.style.display = 'none';
      if (flightsToggle) flightsToggle.classList.remove('active');
    }
  }
}

// Handle airline filter change
function handleAirlineFilterChange() {
  const select = document.getElementById('airlineFilter');
  airlineFilterMode = select.value;

  // Show/hide other airline legend (visible in 'all' mode)
  const otherLegend = document.querySelector('.other-airline-legend');
  if (otherLegend) {
    otherLegend.style.display = airlineFilterMode === 'all' ? 'flex' : 'none';
  }

  // Re-render FIR boundaries to show/hide restricted zones
  if (firVisible && firDataLoaded) renderFirBoundaries();

  // Clear current flights and reload
  clearMap();
  deselectFlight();
  showFlightsLoadingOverlay();
  loadActiveFlights();
}

// Attach filter change listener
document.getElementById('airlineFilter')?.addEventListener('change', handleAirlineFilterChange);

// Load active flights from API
async function loadActiveFlights() {
  loadActiveTours(); // refresh sightseeing tours on the same cadence (parallel)
  try {
    const endpoint = airlineFilterMode === 'all' ? '/api/schedule/active-all'
      : '/api/schedule/active';
    const response = await fetch(endpoint);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Merge deduplicated waypoints back into each flight's route
    if (data.routeWaypoints) {
      for (const flight of (data.flights || [])) {
        if (flight.route && !flight.route.waypoints && data.routeWaypoints[flight.route.id]) {
          flight.route.waypoints = data.routeWaypoints[flight.route.id];
        }
      }
    }

    if (data.flights && Array.isArray(data.flights)) {
      activeFlights = data.flights;
      updateFlightsOnMap(data.flights);
      // Hide loading overlays after first render
      hideMapLoadingOverlay();
      hideFlightsLoadingOverlay();
      // Update selected flight info if one is selected
      if (selectedFlightId) {
        const selectedFlight = activeFlights.find(f => f.id === selectedFlightId);
        if (selectedFlight) {
          showFlightInfo(selectedFlight);
        }
      }
      // Auto-select aircraft from URL parameter (only once)
      if (pendingAircraftSelect) {
        const flightToSelect = activeFlights.find(f =>
          f.aircraft?.registration === pendingAircraftSelect ||
          f.aircraft?.registration?.toUpperCase() === pendingAircraftSelect.toUpperCase()
        );
        if (flightToSelect) {
          console.log('[WorldMap] Auto-selecting flight for aircraft:', pendingAircraftSelect);
          selectFlight(flightToSelect.id);
        } else {
          console.log('[WorldMap] Aircraft not currently in flight:', pendingAircraftSelect);
        }
        pendingAircraftSelect = null; // Clear so we don't try again on refresh
      }
      // Update the flights list panel
      if (flightsListOpen) updateFlightsList();
      // Always update the toggle badge count
      const countEl = document.getElementById('flightsListCount');
      if (countEl) countEl.textContent = activeFlights.length;
    } else {
      activeFlights = [];
      clearMap();
      hideFlightInfo();
      hideMapLoadingOverlay();
      hideFlightsLoadingOverlay();
      if (flightsListOpen) updateFlightsList();
      const countEl = document.getElementById('flightsListCount');
      if (countEl) countEl.textContent = '0';
    }
  } catch (error) {
    console.error('[WorldMap] Error loading active flights:', error);
    hideMapLoadingOverlay();
    hideFlightsLoadingOverlay();
  }
}

// Update flights on map (only aircraft markers) - uses delta updates
function updateFlightsOnMap(flights) {
  // Track which flights are still active
  const activeFlightIds = new Set(flights.map(f => f.id));

  // Remove markers for flights that are no longer active
  for (const [flightId, marker] of flightMarkers) {
    if (!activeFlightIds.has(flightId)) {
      map.removeLayer(marker);
      flightMarkers.delete(flightId);

      // Also clean up route/airports if this was selected
      if (flightId === selectedFlightId) {
        clearSelectedFlightElements();
        selectedFlightId = null;
        hideFlightInfo();
      }
    }
  }

  // Add markers only for NEW flights (existing ones updated by syncUpdateAllPositions)
  flights.forEach(flight => {
    if (flightMarkers.has(flight.id)) return; // Already has a marker

    const position = calculateFlightPosition(flight);

    // Skip aircraft on the ground
    if (position.phase === 'turnaround' || position.phase === 'techstop') return;

    createFlightMarker(flight, position);
  });
}

// ===== Sightseeing tours on the map =====

// Load tours currently mid-flight and render them. Respects the airline filter:
// 'mine' shows only your tours; 'all' shows every airline's.
async function loadActiveTours() {
  try {
    const res = await fetch('/api/sightseeing-tours/active');
    if (!res.ok) return;
    const data = await res.json();
    let tours = Array.isArray(data.tours) ? data.tours : [];
    if (airlineFilterMode === 'mine') tours = tours.filter(t => t.isOwnFlight);
    activeTours = tours;
    updateToursOnMap(tours);
  } catch (e) {
    console.error('[WorldMap] Error loading active tours:', e);
  }
}

// Delta update: drop markers/loops for tours no longer active, add new ones.
function updateToursOnMap(tours) {
  const ids = new Set(tours.map(t => t.id));
  for (const [id, marker] of tourMarkers) {
    if (!ids.has(id)) {
      map.removeLayer(marker);
      tourMarkers.delete(id);
      const line = tourLoopLines.get(id);
      if (line) { map.removeLayer(line); tourLoopLines.delete(id); }
      if (id === selectedTourId) selectedTourId = null;
    }
  }
  tours.forEach(tour => {
    if (tourMarkers.has(tour.id)) return; // existing markers move via syncUpdateAllPositions
    const pos = calculateTourPosition(tour);
    if (!pos || !isFinite(pos.lat) || !isFinite(pos.lng)) return;
    createTourMarker(tour, pos);
  });
  // Keep the selected tour's loop drawn across refreshes (if it's still active)
  if (selectedTourId && !tourLoopLines.has(selectedTourId)) {
    const sel = tours.find(t => t.id === selectedTourId);
    if (sel) drawTourLoop(sel); else selectedTourId = null;
  }
}

// Click a tour marker to reveal its scenic loop (only one shown at a time).
function selectTour(tourId) {
  tourLoopLines.forEach(line => map.removeLayer(line));
  tourLoopLines.clear();
  selectedTourId = tourId;
  const tour = activeTours.find(t => t.id === tourId);
  if (tour) drawTourLoop(tour);
}

// Fraction along the loop from how far through the tour's flight window we are.
function calculateTourPosition(tour) {
  const currentTime = window.getGlobalWorldTime ? window.getGlobalWorldTime() : new Date();
  const loop = tour.loop;
  if (!Array.isArray(loop) || loop.length < 2) return null;
  if (!currentTime) return { lat: loop[0].lat, lng: loop[0].lng, destLat: loop[1].lat, destLng: loop[1].lng };
  if (!tour._depDateTime) tour._depDateTime = new Date(`${tour.scheduledDate}T${tour.departureTime}`);
  const durationMs = (tour.durationMin || 30) * 60 * 1000;
  const fraction = Math.max(0, Math.min(1, (currentTime - tour._depDateTime) / durationMs));
  return interpolateAlongWaypoints(loop, fraction);
}

// Aircraft marker for a tour — same icon system as flights, teal-tagged label.
function createTourMarker(tour, position) {
  const bearing = calculateBearing(position.lat, position.lng, position.destLat, position.destLng);
  const registration = tour.aircraft?.registration || '';
  const isOther = tour.isOwnFlight === false;
  const markerClass = isOther ? 'aircraft-marker-inner other-airline' : 'aircraft-marker-inner';
  const iconDef = AIRCRAFT_ICONS[classifyAircraftIcon(tour.aircraft?.aircraftType)] || AIRCRAFT_ICONS.shorthaul;
  const px = iconDef.px;
  const innerStyle = `transform: rotate(${bearing}deg); width: ${px}px; height: ${px}px`;
  const label = isOther ? '' : `<div class="aircraft-label">
        <div class="flight-number-label tour-label">${tour.name || 'Sightseeing Tour'}</div>
        ${registration ? `<div>${registration}</div>` : ''}
      </div>`;

  const icon = L.divIcon({
    className: 'aircraft-marker tour-marker just-created',
    html: `<div class="aircraft-marker-wrapper"><div class="${markerClass}" style="${innerStyle}">${iconDef.svg}</div>${label}</div>`,
    iconSize: [px, px],
    iconAnchor: [px / 2, px / 2]
  });

  const marker = L.marker([position.lat, position.lng], { icon }).addTo(map);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const el = marker.getElement();
    if (el) el.classList.remove('just-created');
  }));
  marker.bindTooltip(
    `<strong>${tour.name || 'Sightseeing Tour'}</strong><br>${tour.airlineName || ''}${registration ? ' · ' + registration : ''}<br>Scenic loop from ${tour.baseAirport?.icaoCode || ''}`,
    { direction: 'top', offset: [0, -px / 2], className: 'waypoint-tooltip' }
  );
  marker.on('click', (e) => {
    L.DomEvent.stopPropagation(e);
    selectTour(tour.id);
  });
  tourMarkers.set(tour.id, marker);
}

// Dashed loop path (teal for own tours, faint for other airlines').
function drawTourLoop(tour) {
  const loop = tour.loop;
  if (!Array.isArray(loop) || loop.length < 2) return;
  const line = L.polyline(loop.map(p => [p.lat, p.lng]), {
    color: tour.isOwnFlight === false ? 'rgba(255,255,255,0.28)' : 'rgba(45,212,191,0.65)',
    weight: 1.5,
    dashArray: '5,5',
    interactive: false
  }).addTo(map);
  tourLoopLines.set(tour.id, line);
}

// Move active tour markers each tick (mirrors syncUpdateAllPositions for flights).
function syncUpdateTourPositions() {
  activeTours.forEach(tour => {
    const marker = tourMarkers.get(tour.id);
    if (!marker) return;
    const pos = calculateTourPosition(tour);
    if (!pos || !isFinite(pos.lat) || !isFinite(pos.lng)) return;
    marker.setLatLng([pos.lat, pos.lng]);
    // Unwrapped continuous bearing — tours turn sharply at waypoints, and
    // the rotation transition must take the short way around (see flights)
    const bearing = calculateBearing(pos.lat, pos.lng, pos.destLat, pos.destLng);
    const prevBearing = tour._lastBearing !== undefined ? tour._lastBearing : bearing;
    const delta = ((bearing - (prevBearing % 360 + 360) % 360) + 540) % 360 - 180;
    if (Math.abs(delta) > 2) {
      const continuous = prevBearing + delta;
      tour._lastBearing = continuous;
      const el = marker.getElement();
      if (el) {
        const inner = el.querySelector('.aircraft-marker-inner');
        if (inner) inner.style.transform = `rotate(${continuous}deg)`;
      }
    }
  });
}

// Remove all tour markers + loop lines.
function clearTours() {
  tourMarkers.forEach(marker => map.removeLayer(marker));
  tourMarkers.clear();
  tourLoopLines.forEach(line => map.removeLayer(line));
  tourLoopLines.clear();
  activeTours = [];
  selectedTourId = null;
}

// Calculate total path distance along waypoints (in nautical miles)
function calculateWaypointPathDistance(waypoints) {
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    total += haversineDistanceNm(waypoints[i].lat, waypoints[i].lng, waypoints[i + 1].lat, waypoints[i + 1].lng);
  }
  return total;
}

// Haversine distance in nautical miles
function haversineDistanceNm(lat1, lng1, lat2, lng2) {
  const toRad = deg => deg * Math.PI / 180;
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Interpolate position along a waypoint path given a fraction (0-1)
// Returns {lat, lng, destLat, destLng} where dest is the next waypoint ahead
function interpolateAlongWaypoints(waypoints, fraction) {
  if (!waypoints || waypoints.length < 2) return null;
  if (fraction <= 0) return { lat: waypoints[0].lat, lng: waypoints[0].lng, destLat: waypoints[1].lat, destLng: waypoints[1].lng };
  if (fraction >= 1) {
    const last = waypoints[waypoints.length - 1];
    const prev = waypoints[waypoints.length - 2];
    return { lat: last.lat, lng: last.lng, destLat: last.lat, destLng: last.lng };
  }

  // Compute cumulative segment distances
  const segDists = [];
  let totalDist = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const d = haversineDistanceNm(waypoints[i].lat, waypoints[i].lng, waypoints[i + 1].lat, waypoints[i + 1].lng);
    segDists.push(d);
    totalDist += d;
  }

  const targetDist = fraction * totalDist;
  let cumDist = 0;

  for (let i = 0; i < segDists.length; i++) {
    if (cumDist + segDists[i] >= targetDist) {
      // Interpolate within this segment
      const segFraction = (targetDist - cumDist) / segDists[i];
      const pos = interpolateGreatCircle(waypoints[i].lat, waypoints[i].lng, waypoints[i + 1].lat, waypoints[i + 1].lng, segFraction);
      return {
        lat: pos.lat,
        lng: pos.lng,
        destLat: waypoints[i + 1].lat,
        destLng: waypoints[i + 1].lng
      };
    }
    cumDist += segDists[i];
  }

  // Fallback: at end
  const last = waypoints[waypoints.length - 1];
  return { lat: last.lat, lng: last.lng, destLat: last.lat, destLng: last.lng };
}

// Optimized version with pre-computed segment distances (avoids recalculating on every tick)
function interpolateAlongWaypointsCached(waypoints, fraction, segDists, totalDist) {
  if (fraction <= 0) return { lat: waypoints[0].lat, lng: waypoints[0].lng, destLat: waypoints[1].lat, destLng: waypoints[1].lng };
  if (fraction >= 1) {
    const last = waypoints[waypoints.length - 1];
    return { lat: last.lat, lng: last.lng, destLat: last.lat, destLng: last.lng };
  }

  const targetDist = fraction * totalDist;
  let cumDist = 0;

  for (let i = 0; i < segDists.length; i++) {
    if (cumDist + segDists[i] >= targetDist) {
      const segFraction = (targetDist - cumDist) / segDists[i];
      const pos = interpolateGreatCircle(waypoints[i].lat, waypoints[i].lng, waypoints[i + 1].lat, waypoints[i + 1].lng, segFraction);
      return {
        lat: pos.lat,
        lng: pos.lng,
        destLat: waypoints[i + 1].lat,
        destLng: waypoints[i + 1].lng
      };
    }
    cumDist += segDists[i];
  }

  const last = waypoints[waypoints.length - 1];
  return { lat: last.lat, lng: last.lng, destLat: last.lat, destLng: last.lng };
}

// Calculate current flight position based on departure time and flight duration
// Handles both outbound and return legs of a round-trip flight
// Includes wind adjustment (eastbound flights faster, westbound slower)
// Supports tech stop routes (DEP → TECH → ARR → TECH → DEP)
function calculateFlightPosition(flight) {
  const currentTime = window.getGlobalWorldTime ? window.getGlobalWorldTime() : new Date();

  if (!currentTime) {
    // Fallback: show at departure
    return {
      lat: parseFloat(flight.departureAirport.latitude),
      lng: parseFloat(flight.departureAirport.longitude),
      phase: 'outbound',
      routeNumber: flight.route.routeNumber
    };
  }

  // Parse departure time
  if (!flight._depDateTime) {
    flight._depDateTime = new Date(`${flight.scheduledDate}T${flight.departureTime}`);
  }
  const departureDateTime = flight._depDateTime;

  // Airport coordinates (cache parsed floats on the flight object)
  if (flight._coordsCached === undefined) {
    flight._depLat = parseFloat(flight.departureAirport.latitude);
    flight._depLng = parseFloat(flight.departureAirport.longitude);
    flight._arrLat = parseFloat(flight.arrivalAirport.latitude);
    flight._arrLng = parseFloat(flight.arrivalAirport.longitude);
    flight._coordsCached = true;
  }
  const depLat = flight._depLat;
  const depLng = flight._depLng;
  const arrLat = flight._arrLat;
  const arrLng = flight._arrLng;

  // Use aircraft's actual cruise speed, fallback to 450 if not available
  const speedKnots = flight.aircraft?.aircraftType?.cruiseSpeed || flight.aircraft?.cruiseSpeed || 450;
  const turnaroundMinutes = flight.route.turnaroundTime || 45;
  const turnaroundMs = turnaroundMinutes * 60 * 1000;

  // Calculate total elapsed time
  const elapsedMs = currentTime - departureDateTime;

  let position, progress, phase, routeNumber, destLat, destLng;

  // Check if this is a tech stop route
  const hasTechStop = flight.route?.techStopAirport;

  if (hasTechStop) {
    // Tech stop route: DEP → TECH → ARR → TECH → DEP
    // Cache tech stop coordinates and timeline
    if (!flight._techCached) {
      flight._techLat = parseFloat(flight.route.techStopAirport.latitude);
      flight._techLng = parseFloat(flight.route.techStopAirport.longitude);

      const distanceNm = parseFloat(flight.route.distance) || 500;
      const leg1Distance = flight.route.legOneDistance || Math.round(distanceNm * 0.4);
      const leg2Distance = flight.route.legTwoDistance || Math.round(distanceNm * 0.6);

      const techStopMs = 30 * 60 * 1000;

      flight._leg1Ms = calculateFlightDurationMs(leg1Distance, depLng, flight._techLng, depLat, flight._techLat, speedKnots);
      flight._leg2Ms = calculateFlightDurationMs(leg2Distance, flight._techLng, arrLng, flight._techLat, arrLat, speedKnots);
      flight._leg3Ms = calculateFlightDurationMs(leg2Distance, arrLng, flight._techLng, arrLat, flight._techLat, speedKnots);
      flight._leg4Ms = calculateFlightDurationMs(leg1Distance, flight._techLng, depLng, flight._techLat, depLat, speedKnots);

      flight._t1 = flight._leg1Ms;
      flight._t2 = flight._t1 + techStopMs;
      flight._t3 = flight._t2 + flight._leg2Ms;
      flight._t4 = flight._t3 + turnaroundMs;
      flight._t5 = flight._t4 + flight._leg3Ms;
      flight._t6 = flight._t5 + techStopMs;
      flight._techCached = true;
    }

    const techLat = flight._techLat;
    const techLng = flight._techLng;
    const leg1Ms = flight._leg1Ms;
    const leg2Ms = flight._leg2Ms;
    const leg3Ms = flight._leg3Ms;
    const leg4Ms = flight._leg4Ms;
    const t1 = flight._t1;
    const t2 = flight._t2;
    const t3 = flight._t3;
    const t4 = flight._t4;
    const t5 = flight._t5;
    const t6 = flight._t6;

    if (elapsedMs < t1) {
      // LEG 1: DEP → TECH
      phase = 'outbound';
      routeNumber = flight.route.routeNumber;
      progress = Math.max(0, Math.min(1, elapsedMs / leg1Ms));
      position = interpolateGreatCircle(depLat, depLng, techLat, techLng, progress);
      destLat = techLat;
      destLng = techLng;
    } else if (elapsedMs < t2) {
      // TECH STOP 1: at tech stop airport
      phase = 'techstop';
      routeNumber = flight.route.routeNumber;
      progress = 0;
      position = { lat: techLat, lng: techLng };
      destLat = arrLat;
      destLng = arrLng;
    } else if (elapsedMs < t3) {
      // LEG 2: TECH → ARR
      phase = 'outbound';
      routeNumber = flight.route.routeNumber;
      const legElapsed = elapsedMs - t2;
      progress = Math.max(0, Math.min(1, legElapsed / leg2Ms));
      position = interpolateGreatCircle(techLat, techLng, arrLat, arrLng, progress);
      destLat = arrLat;
      destLng = arrLng;
    } else if (elapsedMs < t4) {
      // TURNAROUND: at arrival airport
      phase = 'turnaround';
      routeNumber = flight.route.returnRouteNumber || flight.route.routeNumber;
      progress = 1;
      position = { lat: arrLat, lng: arrLng };
      destLat = techLat;
      destLng = techLng;
    } else if (elapsedMs < t5) {
      // LEG 3: ARR → TECH (return)
      phase = 'return';
      routeNumber = flight.route.returnRouteNumber || flight.route.routeNumber;
      const legElapsed = elapsedMs - t4;
      progress = Math.max(0, Math.min(1, legElapsed / leg3Ms));
      position = interpolateGreatCircle(arrLat, arrLng, techLat, techLng, progress);
      destLat = techLat;
      destLng = techLng;
    } else if (elapsedMs < t6) {
      // TECH STOP 2: at tech stop airport (return)
      phase = 'techstop';
      routeNumber = flight.route.returnRouteNumber || flight.route.routeNumber;
      progress = 0;
      position = { lat: techLat, lng: techLng };
      destLat = depLat;
      destLng = depLng;
    } else {
      // LEG 4: TECH → DEP (return home)
      phase = 'return';
      routeNumber = flight.route.returnRouteNumber || flight.route.routeNumber;
      const legElapsed = elapsedMs - t6;
      progress = Math.max(0, Math.min(1, legElapsed / leg4Ms));
      position = interpolateGreatCircle(techLat, techLng, depLat, depLng, progress);
      destLat = depLat;
      destLng = depLng;
    }
  } else {
    // Standard direct route - cache durations
    const waypoints = flight.route?.waypoints;
    if (!flight._durationsCached) {
      // Use actual path distance if waypoints exist, otherwise great circle distance
      const distanceNm = (waypoints && waypoints.length >= 2)
        ? calculateWaypointPathDistance(waypoints)
        : (parseFloat(flight.route.distance) || 500);
      flight._outboundFlightMs = calculateFlightDurationMs(distanceNm, depLng, arrLng, depLat, arrLat, speedKnots);
      flight._returnFlightMs = calculateFlightDurationMs(distanceNm, arrLng, depLng, arrLat, depLat, speedKnots);
      flight._durationsCached = true;
    }

    const outboundFlightMs = flight._outboundFlightMs;
    const returnFlightMs = flight._returnFlightMs;

    if (elapsedMs < outboundFlightMs) {
      // OUTBOUND LEG: departure → arrival
      phase = 'outbound';
      routeNumber = flight.route.routeNumber;
      progress = Math.max(0, Math.min(1, elapsedMs / outboundFlightMs));
      if (waypoints && waypoints.length >= 2) {
        // Cache waypoint segment distances for performance
        if (!flight._wpSegDists) {
          const segDists = [];
          let total = 0;
          for (let i = 0; i < waypoints.length - 1; i++) {
            const d = haversineDistanceNm(waypoints[i].lat, waypoints[i].lng, waypoints[i + 1].lat, waypoints[i + 1].lng);
            segDists.push(d);
            total += d;
          }
          flight._wpSegDists = segDists;
          flight._wpTotalDist = total;
        }
        const wpResult = interpolateAlongWaypointsCached(waypoints, progress, flight._wpSegDists, flight._wpTotalDist);
        position = { lat: wpResult.lat, lng: wpResult.lng };
        destLat = wpResult.destLat;
        destLng = wpResult.destLng;
      } else {
        position = interpolateGreatCircle(depLat, depLng, arrLat, arrLng, progress);
        destLat = arrLat;
        destLng = arrLng;
      }
    } else if (elapsedMs < outboundFlightMs + turnaroundMs) {
      // TURNAROUND: at arrival airport
      phase = 'turnaround';
      routeNumber = flight.route.returnRouteNumber || flight.route.routeNumber;
      progress = 1;
      position = { lat: arrLat, lng: arrLng };
      destLat = depLat;
      destLng = depLng;
    } else {
      // RETURN LEG: arrival → departure
      phase = 'return';
      routeNumber = flight.route.returnRouteNumber || flight.route.routeNumber;
      const returnElapsedMs = elapsedMs - outboundFlightMs - turnaroundMs;
      progress = Math.max(0, Math.min(1, returnElapsedMs / returnFlightMs));
      if (waypoints && waypoints.length >= 2) {
        // Cache reversed waypoint segment distances for performance
        if (!flight._wpRevSegDists) {
          const revWp = [...waypoints].reverse();
          const segDists = [];
          let total = 0;
          for (let i = 0; i < revWp.length - 1; i++) {
            const d = haversineDistanceNm(revWp[i].lat, revWp[i].lng, revWp[i + 1].lat, revWp[i + 1].lng);
            segDists.push(d);
            total += d;
          }
          flight._wpRevSegDists = segDists;
          flight._wpRevTotalDist = total;
          flight._wpReversed = revWp;
        }
        const wpResult = interpolateAlongWaypointsCached(flight._wpReversed, progress, flight._wpRevSegDists, flight._wpRevTotalDist);
        position = { lat: wpResult.lat, lng: wpResult.lng };
        destLat = wpResult.destLat;
        destLng = wpResult.destLng;
      } else {
        position = interpolateGreatCircle(arrLat, arrLng, depLat, depLng, progress);
        destLat = depLat;
        destLng = depLng;
      }
    }
  }

  return {
    lat: position.lat,
    lng: position.lng,
    destLat: destLat,
    destLng: destLng,
    progress: progress,
    phase: phase,
    routeNumber: routeNumber
  };
}

// Great circle interpolation
function interpolateGreatCircle(lat1, lng1, lat2, lng2, fraction) {
  const toRad = deg => deg * Math.PI / 180;
  const toDeg = rad => rad * 180 / Math.PI;

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const lambda1 = toRad(lng1);
  const lambda2 = toRad(lng2);

  const deltaPhi = phi2 - phi1;
  const deltaLambda = lambda2 - lambda1;

  const a = Math.sin(deltaPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const delta = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  if (delta === 0) {
    return { lat: lat1, lng: lng1 };
  }

  const A = Math.sin((1 - fraction) * delta) / Math.sin(delta);
  const B = Math.sin(fraction * delta) / Math.sin(delta);

  const x = A * Math.cos(phi1) * Math.cos(lambda1) + B * Math.cos(phi2) * Math.cos(lambda2);
  const y = A * Math.cos(phi1) * Math.sin(lambda1) + B * Math.cos(phi2) * Math.sin(lambda2);
  const z = A * Math.sin(phi1) + B * Math.sin(phi2);

  const phi = Math.atan2(z, Math.sqrt(x * x + y * y));
  const lambda = Math.atan2(y, x);

  return { lat: toDeg(phi), lng: toDeg(lambda) };
}

// Check if a route segment crosses the International Date Line
function crossesDateLine(lng1, lng2) {
  // If longitude difference is > 180°, route crosses date line
  return Math.abs(lng2 - lng1) > 180;
}

// Generate great circle path points that handle date line crossing
// Returns array of polyline segments (each segment is an array of [lat, lng] points)
function generateGreatCirclePath(lat1, lng1, lat2, lng2, numPoints = 50) {
  const points = [];

  // First, generate all points along the great circle
  for (let i = 0; i <= numPoints; i++) {
    const point = interpolateGreatCircle(lat1, lng1, lat2, lng2, i / numPoints);
    points.push(point);
  }

  // Check if route crosses date line by looking at the raw longitude difference
  const lngDiff = lng2 - lng1;
  const crossesDL = Math.abs(lngDiff) > 180;

  if (!crossesDL) {
    // No date line crossing - return single segment
    return [points.map(p => [p.lat, p.lng])];
  }

  // Route crosses date line - need to split into segments
  // Determine which direction we're crossing (east to west or west to east)
  const goingEast = (lngDiff < -180) || (lngDiff > 0 && lngDiff <= 180);

  const segments = [];
  let currentSegment = [];
  let prevLng = points[0].lng;

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    let adjustedLng = point.lng;

    // Detect when we cross the date line (sign change from ~180 to ~-180 or vice versa)
    if (i > 0) {
      const lngJump = point.lng - prevLng;

      if (Math.abs(lngJump) > 180) {
        // We crossed the date line - split here
        // First, calculate where the path intersects the date line
        const prevPoint = points[i - 1];

        // Interpolate to find exact crossing point
        // Using linear interpolation for simplicity at the crossing
        const crossingLat = (prevPoint.lat + point.lat) / 2;

        if (prevPoint.lng > 0) {
          // Crossing from east (positive) to west (negative)
          // End current segment at +180
          currentSegment.push([crossingLat, 180]);
          segments.push(currentSegment);

          // Start new segment at -180
          currentSegment = [[crossingLat, -180]];
        } else {
          // Crossing from west (negative) to east (positive)
          // End current segment at -180
          currentSegment.push([crossingLat, -180]);
          segments.push(currentSegment);

          // Start new segment at +180
          currentSegment = [[crossingLat, 180]];
        }
      }
    }

    currentSegment.push([point.lat, adjustedLng]);
    prevLng = point.lng;
  }

  // Add final segment
  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  return segments;
}

// Calculate bearing between two points
function calculateBearing(lat1, lng1, lat2, lng2) {
  const toRad = deg => deg * Math.PI / 180;
  const toDeg = rad => rad * 180 / Math.PI;

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaLambda = toRad(lng2 - lng1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Create a single aircraft marker
function createFlightMarker(flight, position) {
  const bearing = calculateBearing(position.lat, position.lng, position.destLat, position.destLng);

  const flightNumber = position.routeNumber || flight.route?.routeNumber || '';
  const registration = flight.aircraft?.registration || '';
  const model = flight.aircraft?.aircraftType?.model || '';
  const variant = flight.aircraft?.aircraftType?.variant || '';
  const aircraftModel = variant ? `${model}${variant.startsWith('-') ? variant : '-' + variant}` : model;

  const isOtherAirline = flight.isOwnFlight === false;
  const markerClass = isOtherAirline ? 'aircraft-marker-inner other-airline' : 'aircraft-marker-inner';

  // Pick the icon + size for this aircraft's category (regional, shorthaul,
  // widebody 2/4-engine, A380, airship) and scale the marker box to match.
  const iconDef = AIRCRAFT_ICONS[classifyAircraftIcon(flight.aircraft?.aircraftType)] || AIRCRAFT_ICONS.shorthaul;
  const px = iconDef.px;
  const innerStyle = `transform: rotate(${bearing}deg); width: ${px}px; height: ${px}px`;

  const icon = L.divIcon({
    // just-created: transitions OFF for the first frames so a marker
    // materialises at its position instead of gliding in from the map origin
    className: 'aircraft-marker just-created',
    html: isOtherAirline
      ? `<div class="aircraft-marker-wrapper"><div class="${markerClass}" style="${innerStyle}">${iconDef.svg}</div></div>`
      : `<div class="aircraft-marker-wrapper">
        <div class="${markerClass}" style="${innerStyle}">${iconDef.svg}</div>
        <div class="aircraft-label">
          ${flightNumber ? `<div class="flight-number-label">${flightNumber}</div>` : ''}
          ${registration ? `<div>${registration}</div>` : ''}
          ${aircraftModel ? `<div>${aircraftModel}</div>` : ''}
        </div>
      </div>`,
    iconSize: [px, px],
    iconAnchor: [px / 2, px / 2]
  });

  const marker = L.marker([position.lat, position.lng], { icon })
    .addTo(map);

  // Enable the smooth-movement transition once the initial position has
  // painted (two frames — one to insert, one to settle)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const el = marker.getElement();
    if (el) el.classList.remove('just-created');
  }));

  marker.on('click', (e) => {
    L.DomEvent.stopPropagation(e);
    selectFlight(flight.id);
  });

  flightMarkers.set(flight.id, marker);
}

// Redraw route line and airport markers for selected flight (on phase change)
function redrawSelectedFlightRoute(flight) {
  // Remove existing route lines
  const existingLines = routeLines.get(flight.id);
  if (existingLines) {
    if (Array.isArray(existingLines)) {
      existingLines.forEach(l => map.removeLayer(l));
    } else {
      map.removeLayer(existingLines);
    }
  }
  routeLines.delete(flight.id);

  // Remove waypoint markers
  waypointMarkers.forEach(m => map.removeLayer(m));
  waypointMarkers = [];

  // Remove and recreate airport markers
  airportMarkers.forEach(marker => map.removeLayer(marker));
  airportMarkers.clear();

  // Redraw for new phase
  createRouteLine(flight);
  createAirportMarkers(flight);
}

// Determine if a flight is currently in the return sector
function isReturnSector(flight) {
  const position = calculateFlightPosition(flight);
  const phase = position.phase;

  if (phase === 'turnaround' || phase === 'return') return true;

  if (phase === 'techstop' && flight._t3 !== undefined) {
    const currentTime = window.getGlobalWorldTime ? window.getGlobalWorldTime() : new Date();
    if (!flight._depDateTime) {
      flight._depDateTime = new Date(`${flight.scheduledDate}T${flight.departureTime}`);
    }
    const elapsed = currentTime - flight._depDateTime;
    return elapsed >= flight._t3;
  }

  return false;
}

// Create route line for selected flight - only draws current sector
function createRouteLine(flight) {
  const depLat = parseFloat(flight.departureAirport.latitude);
  const depLng = parseFloat(flight.departureAirport.longitude);
  const arrLat = parseFloat(flight.arrivalAirport.latitude);
  const arrLng = parseFloat(flight.arrivalAirport.longitude);

  const isReturn = isReturnSector(flight);
  const hasTechStop = flight.route?.techStopAirport;

  const lineStyle = {
    color: '#58a6ff',
    weight: 2,
    opacity: 0.6,
    dashArray: '5, 10',
    className: 'route-path'
  };

  const allPolylines = [];
  const waypoints = flight.route?.waypoints;

  if (hasTechStop) {
    const techLat = parseFloat(flight.route.techStopAirport.latitude);
    const techLng = parseFloat(flight.route.techStopAirport.longitude);

    if (isReturn) {
      // Return sector: ARR → TECH → DEP
      const segments1 = generateGreatCirclePath(arrLat, arrLng, techLat, techLng, 30);
      const segments2 = generateGreatCirclePath(techLat, techLng, depLat, depLng, 30);
      segments1.forEach(segment => {
        allPolylines.push(L.polyline(segment, lineStyle).addTo(map));
      });
      segments2.forEach(segment => {
        allPolylines.push(L.polyline(segment, lineStyle).addTo(map));
      });
    } else {
      // Outbound sector: DEP → TECH → ARR
      const segments1 = generateGreatCirclePath(depLat, depLng, techLat, techLng, 30);
      const segments2 = generateGreatCirclePath(techLat, techLng, arrLat, arrLng, 30);
      segments1.forEach(segment => {
        allPolylines.push(L.polyline(segment, lineStyle).addTo(map));
      });
      segments2.forEach(segment => {
        allPolylines.push(L.polyline(segment, lineStyle).addTo(map));
      });
    }
  } else if (waypoints && waypoints.length >= 2) {
    // Draw route through airway waypoints in current sector direction
    const wpToUse = isReturn ? [...waypoints].reverse() : waypoints;

    // Ensure route line connects from airport to first waypoint and last waypoint to airport
    // (custom routes may not include DEP/ARR markers)
    const firstWp = wpToUse[0];
    const lastWp = wpToUse[wpToUse.length - 1];
    const [startLat, startLng, endLat, endLng] = isReturn
      ? [arrLat, arrLng, depLat, depLng]
      : [depLat, depLng, arrLat, arrLng];

    const fullPath = [];
    // Prepend departure airport if first waypoint isn't already at the airport
    if (firstWp.name !== 'DEP' && firstWp.name !== 'ARR') {
      const distToFirst = Math.abs(firstWp.lat - startLat) + Math.abs(firstWp.lng - startLng);
      if (distToFirst > 0.01) fullPath.push({ lat: startLat, lng: startLng });
    }
    fullPath.push(...wpToUse);
    // Append arrival airport if last waypoint isn't already at the airport
    if (lastWp.name !== 'DEP' && lastWp.name !== 'ARR') {
      const distToLast = Math.abs(lastWp.lat - endLat) + Math.abs(lastWp.lng - endLng);
      if (distToLast > 0.01) fullPath.push({ lat: endLat, lng: endLng });
    }

    for (let i = 0; i < fullPath.length - 1; i++) {
      const segments = generateGreatCirclePath(
        fullPath[i].lat, fullPath[i].lng,
        fullPath[i + 1].lat, fullPath[i + 1].lng, 10
      );
      segments.forEach(segment => {
        allPolylines.push(L.polyline(segment, lineStyle).addTo(map));
      });
    }

    // Show waypoint fix markers with name tooltips (skip DEP/ARR which are airports)
    if (wpToUse.length > 2) {
      wpToUse.forEach(wp => {
        const fixName = wp.name || '';
        if (fixName === 'DEP' || fixName === 'ARR' || !fixName) return;
        const showLabel = true;
        const wpMarker = L.circleMarker([wp.lat, wp.lng], {
          radius: 3,
          color: '#58a6ff',
          fillColor: '#58a6ff',
          fillOpacity: 0.8,
          weight: 1,
          interactive: true
        }).addTo(map);
        if (showLabel) {
          wpMarker.bindTooltip(fixName, {
            permanent: false,
            direction: 'top',
            offset: [0, -6],
            className: 'waypoint-tooltip'
          });
        }
        waypointMarkers.push(wpMarker);
      });
    }
  } else {
    // Great circle in current sector direction
    const [fromLat, fromLng, toLat, toLng] = isReturn
      ? [arrLat, arrLng, depLat, depLng]
      : [depLat, depLng, arrLat, arrLng];
    const segments = generateGreatCirclePath(fromLat, fromLng, toLat, toLng, 50);
    segments.forEach(segment => {
      allPolylines.push(L.polyline(segment, lineStyle).addTo(map));
    });
  }

  routeLines.set(flight.id, allPolylines);
}

// Create airport markers for selected flight
function createAirportMarkers(flight) {
  // Departure airport (hub style - green)
  const depIcon = L.divIcon({
    className: 'airport-marker',
    html: `<div class="airport-marker-inner hub"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });

  const depMarker = L.marker(
    [parseFloat(flight.departureAirport.latitude), parseFloat(flight.departureAirport.longitude)],
    { icon: depIcon }
  ).addTo(map).bindPopup(
    `<div class="popup-title">${flight.departureAirport.iataCode || flight.departureAirport.icaoCode}</div>
     <div class="popup-info">
       <span>${flight.departureAirport.name}</span>
       <span>${flight.departureAirport.city}, ${flight.departureAirport.country}</span>
     </div>`
  );
  airportMarkers.set(`dep-${flight.id}`, depMarker);

  // Tech stop airport (yellow) - if exists
  if (flight.route?.techStopAirport) {
    const techIcon = L.divIcon({
      className: 'airport-marker',
      html: `<div class="airport-marker-inner techstop"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    const techMarker = L.marker(
      [parseFloat(flight.route.techStopAirport.latitude), parseFloat(flight.route.techStopAirport.longitude)],
      { icon: techIcon }
    ).addTo(map).bindPopup(
      `<div class="popup-title">${flight.route.techStopAirport.iataCode || flight.route.techStopAirport.icaoCode}</div>
       <div class="popup-info">
         <span>${flight.route.techStopAirport.name}</span>
         <span>${flight.route.techStopAirport.city}, ${flight.route.techStopAirport.country}</span>
         <span style="color: #d29922; font-weight: 600;">Tech Stop</span>
       </div>`
    );
    airportMarkers.set(`tech-${flight.id}`, techMarker);
  }

  // Arrival airport (green)
  const arrIcon = L.divIcon({
    className: 'airport-marker',
    html: `<div class="airport-marker-inner"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });

  const arrMarker = L.marker(
    [parseFloat(flight.arrivalAirport.latitude), parseFloat(flight.arrivalAirport.longitude)],
    { icon: arrIcon }
  ).addTo(map).bindPopup(
    `<div class="popup-title">${flight.arrivalAirport.iataCode || flight.arrivalAirport.icaoCode}</div>
     <div class="popup-info">
       <span>${flight.arrivalAirport.name}</span>
       <span>${flight.arrivalAirport.city}, ${flight.arrivalAirport.country}</span>
     </div>`
  );
  airportMarkers.set(`arr-${flight.id}`, arrMarker);
}

// Show flight info panel for selected flight
function showFlightInfo(flight) {
  const flightList = document.getElementById('flightList');
  const panel = document.getElementById('flightInfoPanel');
  if (!flightList || !panel) return;

  // Show the panel
  panel.style.display = 'flex';

  const position = calculateFlightPosition(flight);
  const phase = position.phase || 'outbound';

  // Aircraft info
  const registration = flight.aircraft?.registration || 'N/A';
  const model = flight.aircraft?.aircraftType?.model || '';
  const variant = flight.aircraft?.aircraftType?.variant || '';
  const aircraftModel = variant ? `${model}${variant.startsWith('-') ? variant : '-' + variant}` : (model || 'Unknown');
  const manufacturer = flight.aircraft?.aircraftType?.manufacturer || '';
  const fullAircraftName = manufacturer ? `${manufacturer} ${aircraftModel}` : aircraftModel;
  const passengerCapacity = flight.aircraft?.passengerCapacity || flight.aircraft?.aircraftType?.passengerCapacity || 0;

  // Route info
  const distance = Math.round(parseFloat(flight.route.distance) || 0);
  const turnaroundTime = flight.route.turnaroundTime || 45;
  // Prefer the live sector LF (exact load for this flight) over the route average.
  const loadFactor = (flight.route.currentLoadFactor != null)
    ? flight.route.currentLoadFactor
    : (flight.route.averageLoadFactor || 0);

  // Airport coordinates
  const depLat = parseFloat(flight.departureAirport.latitude);
  const depLng = parseFloat(flight.departureAirport.longitude);
  const arrLat = parseFloat(flight.arrivalAirport.latitude);
  const arrLng = parseFloat(flight.arrivalAirport.longitude);

  // Check for tech stop
  const hasTechStop = flight.route?.techStopAirport;
  const techCode = hasTechStop ? (flight.route.techStopAirport.iataCode || flight.route.techStopAirport.icaoCode) : null;
  const techLat = hasTechStop ? parseFloat(flight.route.techStopAirport.latitude) : null;
  const techLng = hasTechStop ? parseFloat(flight.route.techStopAirport.longitude) : null;

  // Use aircraft's actual cruise speed, fallback to 450 if not available
  const speedKnots = flight.aircraft?.aircraftType?.cruiseSpeed || flight.aircraft?.cruiseSpeed || 450;

  // Route numbers
  const outboundRouteNum = flight.route.routeNumber || '--';
  const returnRouteNum = flight.route.returnRouteNumber || outboundRouteNum;

  // Airport codes
  const depCode = flight.departureAirport.iataCode || flight.departureAirport.icaoCode;
  const arrCode = flight.arrivalAirport.iataCode || flight.arrivalAirport.icaoCode;
  const depIcao = (flight.departureAirport.icaoCode && flight.departureAirport.icaoCode !== depCode) ? flight.departureAirport.icaoCode : '';
  const arrIcao = (flight.arrivalAirport.icaoCode && flight.arrivalAirport.icaoCode !== arrCode) ? flight.arrivalAirport.icaoCode : '';
  const techIcao = hasTechStop ? ((flight.route.techStopAirport.icaoCode && flight.route.techStopAirport.icaoCode !== techCode) ? flight.route.techStopAirport.icaoCode : '') : '';

  // Calculate times for both sectors (rounded to nearest 5 minutes)
  const depTime = roundTimeToNearest5(flight.departureTime?.substring(0, 5) || '00:00');
  const depDateTime = new Date(`${flight.scheduledDate}T${flight.departureTime}`);

  // Current phase status
  let phaseStatus = '';
  let progressPercent = 0;
  if (phase === 'outbound') {
    phaseStatus = 'OUTBOUND';
    progressPercent = Math.round((position.progress || 0) * 100);
  } else if (phase === 'turnaround') {
    phaseStatus = 'TURNAROUND';
    progressPercent = 100;
  } else if (phase === 'techstop') {
    phaseStatus = 'TECH STOP';
    progressPercent = 100;
  } else {
    phaseStatus = 'RETURN';
    progressPercent = Math.round((position.progress || 0) * 100);
  }

  let sectorsHtml = '';

  if (hasTechStop) {
    // Tech stop route: DEP → TECH → ARR → TECH → DEP
    // Calculate leg distances (approximate - half each way through tech stop)
    const leg1Distance = flight.route.legOneDistance || Math.round(distance * 0.4);
    const leg2Distance = flight.route.legTwoDistance || Math.round(distance * 0.6);

    // Leg 1: DEP → TECH
    const leg1Ms = calculateFlightDurationMs(leg1Distance, depLng, techLng, depLat, techLat, speedKnots);
    const leg1Minutes = Math.round(leg1Ms / 60000 / 5) * 5;
    const leg1DurationStr = `${Math.floor(leg1Minutes / 60)}h ${String(leg1Minutes % 60).padStart(2, '0')}m`;
    const leg1Arrival = new Date(depDateTime.getTime() + leg1Ms);
    const leg1ArrivalTime = roundTimeToNearest5(leg1Arrival.toTimeString().substring(0, 5));

    // Tech stop ground time (shorter than turnaround - just refuel)
    const techStopMinutes = 30;

    // Leg 2: TECH → ARR
    const leg2Dep = new Date(leg1Arrival.getTime() + techStopMinutes * 60000);
    const leg2DepTime = roundTimeToNearest5(leg2Dep.toTimeString().substring(0, 5));
    const leg2Ms = calculateFlightDurationMs(leg2Distance, techLng, arrLng, techLat, arrLat, speedKnots);
    const leg2Minutes = Math.round(leg2Ms / 60000 / 5) * 5;
    const leg2DurationStr = `${Math.floor(leg2Minutes / 60)}h ${String(leg2Minutes % 60).padStart(2, '0')}m`;
    const leg2Arrival = new Date(leg2Dep.getTime() + leg2Ms);
    const leg2ArrivalTime = roundTimeToNearest5(leg2Arrival.toTimeString().substring(0, 5));

    // Turnaround at destination
    const returnDep = new Date(leg2Arrival.getTime() + turnaroundTime * 60000);
    const returnDepTime = roundTimeToNearest5(returnDep.toTimeString().substring(0, 5));

    // Leg 3: ARR → TECH (return)
    const leg3Ms = calculateFlightDurationMs(leg2Distance, arrLng, techLng, arrLat, techLat, speedKnots);
    const leg3Minutes = Math.round(leg3Ms / 60000 / 5) * 5;
    const leg3DurationStr = `${Math.floor(leg3Minutes / 60)}h ${String(leg3Minutes % 60).padStart(2, '0')}m`;
    const leg3Arrival = new Date(returnDep.getTime() + leg3Ms);
    const leg3ArrivalTime = roundTimeToNearest5(leg3Arrival.toTimeString().substring(0, 5));

    // Tech stop on return
    const leg4Dep = new Date(leg3Arrival.getTime() + techStopMinutes * 60000);
    const leg4DepTime = roundTimeToNearest5(leg4Dep.toTimeString().substring(0, 5));

    // Leg 4: TECH → DEP (return home)
    const leg4Ms = calculateFlightDurationMs(leg1Distance, techLng, depLng, techLat, depLat, speedKnots);
    const leg4Minutes = Math.round(leg4Ms / 60000 / 5) * 5;
    const leg4DurationStr = `${Math.floor(leg4Minutes / 60)}h ${String(leg4Minutes % 60).padStart(2, '0')}m`;
    const leg4Arrival = new Date(leg4Dep.getTime() + leg4Ms);
    const leg4ArrivalTime = roundTimeToNearest5(leg4Arrival.toTimeString().substring(0, 5));

    // Total outbound/return durations
    const totalOutboundMin = leg1Minutes + techStopMinutes + leg2Minutes;
    const totalOutboundStr = `${Math.floor(totalOutboundMin / 60)}h ${String(totalOutboundMin % 60).padStart(2, '0')}m`;
    const totalReturnMin = leg3Minutes + techStopMinutes + leg4Minutes;
    const totalReturnStr = `${Math.floor(totalReturnMin / 60)}h ${String(totalReturnMin % 60).padStart(2, '0')}m`;

    // Determine tech stop sector: outbound vs return
    let techSector = 'outbound';
    if (phase === 'turnaround') {
      techSector = 'turnaround';
    } else if (phase === 'return') {
      techSector = 'return';
    } else if (phase === 'techstop' && flight._t3 !== undefined) {
      const currentTime = window.getGlobalWorldTime ? window.getGlobalWorldTime() : new Date();
      const elapsed = currentTime - depDateTime;
      techSector = elapsed >= flight._t3 ? 'return' : 'outbound';
    }

    // Show only current sector
    if (techSector === 'outbound') {
      sectorsHtml = `
        <div class="sector-card active">
          <div class="sector-header">
            <span class="sector-flight-num">${outboundRouteNum}</span>
            <span class="sector-label">OUTBOUND</span>
            <span class="sector-total-time">${totalOutboundStr}</span>
          </div>
          <div class="sector-route tech-stop-route">
            <div class="sector-airport">
              <div class="airport-code">${depCode}</div>
              <div class="airport-icao">${depIcao}</div>
              <div class="airport-time">${depTime}</div>
            </div>
            <div class="sector-arrow small">
              <div class="arrow-line"></div>
              <div class="flight-duration">${leg1DurationStr}</div>
            </div>
            <div class="sector-airport techstop">
              <div class="airport-code" style="color: #d29922;">${techCode}</div>
              <div class="airport-icao" style="color: #d29922;">${techIcao}</div>
              <div class="airport-time">${leg1ArrivalTime}</div>
              <div class="tech-label">TECH</div>
            </div>
            <div class="sector-arrow small">
              <div class="arrow-line"></div>
              <div class="flight-duration">${leg2DurationStr}</div>
            </div>
            <div class="sector-airport">
              <div class="airport-code">${arrCode}</div>
              <div class="airport-icao">${arrIcao}</div>
              <div class="airport-time">${leg2ArrivalTime}</div>
            </div>
          </div>
        </div>
      `;
    } else if (techSector === 'turnaround') {
      sectorsHtml = `
        <div class="turnaround-indicator active">
          <span class="turnaround-icon">⟳</span>
          <span class="turnaround-text">${turnaroundTime} min turnaround at ${arrCode}</span>
        </div>
      `;
    } else {
      sectorsHtml = `
        <div class="sector-card active">
          <div class="sector-header">
            <span class="sector-flight-num">${returnRouteNum}</span>
            <span class="sector-label">RETURN</span>
            <span class="sector-total-time">${totalReturnStr}</span>
          </div>
          <div class="sector-route tech-stop-route">
            <div class="sector-airport">
              <div class="airport-code">${arrCode}</div>
              <div class="airport-icao">${arrIcao}</div>
              <div class="airport-time">${returnDepTime}</div>
            </div>
            <div class="sector-arrow small">
              <div class="arrow-line"></div>
              <div class="flight-duration">${leg3DurationStr}</div>
            </div>
            <div class="sector-airport techstop">
              <div class="airport-code" style="color: #d29922;">${techCode}</div>
              <div class="airport-icao" style="color: #d29922;">${techIcao}</div>
              <div class="airport-time">${leg3ArrivalTime}</div>
              <div class="tech-label">TECH</div>
            </div>
            <div class="sector-arrow small">
              <div class="arrow-line"></div>
              <div class="flight-duration">${leg4DurationStr}</div>
            </div>
            <div class="sector-airport">
              <div class="airport-code">${depCode}</div>
              <div class="airport-icao">${depIcao}</div>
              <div class="airport-time">${leg4ArrivalTime}</div>
            </div>
          </div>
        </div>
      `;
    }
  } else {
    // Standard route without tech stop
    // Outbound duration (with wind effect, rounded to nearest 5 minutes)
    const outboundFlightMs = calculateFlightDurationMs(distance, depLng, arrLng, depLat, arrLat, speedKnots);
    const outboundMinutes = Math.round(outboundFlightMs / 60000 / 5) * 5;
    const outboundDurationStr = `${Math.floor(outboundMinutes / 60)}h ${String(outboundMinutes % 60).padStart(2, '0')}m`;

    // Return duration (opposite wind effect, rounded to nearest 5 minutes)
    const returnFlightMs = calculateFlightDurationMs(distance, arrLng, depLng, arrLat, depLat, speedKnots);
    const returnMinutes = Math.round(returnFlightMs / 60000 / 5) * 5;
    const returnDurationStr = `${Math.floor(returnMinutes / 60)}h ${String(returnMinutes % 60).padStart(2, '0')}m`;

    // Outbound arrival time
    const outboundArrival = new Date(depDateTime.getTime() + outboundFlightMs);
    const outboundArrivalTime = roundTimeToNearest5(outboundArrival.toTimeString().substring(0, 5));

    // Return departure time (after turnaround)
    const returnDep = new Date(outboundArrival.getTime() + (turnaroundTime * 60 * 1000));
    const returnDepTime = roundTimeToNearest5(returnDep.toTimeString().substring(0, 5));

    // Return arrival time
    const returnArrival = new Date(returnDep.getTime() + returnFlightMs);
    const returnArrivalTime = roundTimeToNearest5(returnArrival.toTimeString().substring(0, 5));

    // Show only the current sector
    if (phase === 'outbound') {
      sectorsHtml = `
        <div class="sector-card active">
          <div class="sector-header">
            <span class="sector-flight-num">${outboundRouteNum}</span>
            <span class="sector-label">OUTBOUND</span>
          </div>
          <div class="sector-route">
            <div class="sector-airport">
              <div class="airport-code">${depCode}</div>
              <div class="airport-icao">${depIcao}</div>
              <div class="airport-time">${depTime}</div>
            </div>
            <div class="sector-arrow">
              <div class="arrow-line"></div>
              <div class="flight-duration">${outboundDurationStr}</div>
            </div>
            <div class="sector-airport">
              <div class="airport-code">${arrCode}</div>
              <div class="airport-icao">${arrIcao}</div>
              <div class="airport-time">${outboundArrivalTime}</div>
            </div>
          </div>
        </div>
      `;
    } else if (phase === 'turnaround') {
      sectorsHtml = `
        <div class="turnaround-indicator active">
          <span class="turnaround-icon">⟳</span>
          <span class="turnaround-text">${turnaroundTime} min turnaround at ${arrCode}</span>
        </div>
      `;
    } else {
      sectorsHtml = `
        <div class="sector-card active">
          <div class="sector-header">
            <span class="sector-flight-num">${returnRouteNum}</span>
            <span class="sector-label">RETURN</span>
          </div>
          <div class="sector-route">
            <div class="sector-airport">
              <div class="airport-code">${arrCode}</div>
              <div class="airport-icao">${arrIcao}</div>
              <div class="airport-time">${returnDepTime}</div>
            </div>
            <div class="sector-arrow">
              <div class="arrow-line"></div>
              <div class="flight-duration">${returnDurationStr}</div>
            </div>
            <div class="sector-airport">
              <div class="airport-code">${depCode}</div>
              <div class="airport-icao">${depIcao}</div>
              <div class="airport-time">${returnArrivalTime}</div>
            </div>
          </div>
        </div>
      `;
    }
  }

  // Check if this is another airline's flight
  const isOtherAirline = flight.isOwnFlight === false;
  const airlineName = flight.airlineName || '';
  const airlineCode = flight.airlineCode || '';

  flightList.innerHTML = `
    <div class="flight-detail-panel">
      ${isOtherAirline ? `
      <!-- Airline Info for other airlines -->
      <div class="airline-header" style="padding: 0.25rem 0 0.85rem; margin-bottom: 0.6rem; text-align: center; border-bottom: 1px solid var(--border-color);">
        <div style="font-size: 0.7rem; color: #f97316; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin-bottom: 0.55rem;">Other Airline</div>
        ${flight.logoSvg ? `<div style="display: flex; justify-content: center; margin-bottom: 0.55rem;"><span style="display: inline-flex; height: 60px; border-radius: 10px; overflow: hidden; line-height: 0; box-shadow: 0 3px 10px rgba(0,0,0,0.45);">${String(flight.logoSvg).replace('<svg ', '<svg style="height:100%;width:auto;display:block" ')}</span></div>` : ''}
        <div style="font-size: 1rem; font-weight: 700; color: #f97316;">${airlineName}</div>
        ${airlineCode ? `<div style="font-size: 0.8rem; color: var(--text-secondary); font-family: 'Courier New', monospace;">${airlineCode}</div>` : ''}
      </div>
      ` : ''}

      <!-- Aircraft Header -->
      <div class="aircraft-header">
        <div class="aircraft-reg">${registration}</div>
        <div class="aircraft-type">${fullAircraftName}</div>
      </div>

      <!-- Current Status -->
      <div class="current-status">
        <span class="status-badge ${phase}">${phaseStatus}</span>
        <span class="progress-text">${progressPercent}% complete</span>
      </div>

      ${sectorsHtml}

      ${(() => {
        const isReturn = phase === 'return';
        const fromCode = isReturn ? arrCode : depCode;
        const toCode = isReturn ? depCode : arrCode;
        const wps = flight.route?.waypoints;
        const fixes = (wps || []).filter(w => w.name && w.name !== 'DEP' && w.name !== 'ARR');
        const ordered = isReturn ? fixes.reverse() : fixes;
        const fixSpans = ordered.length > 0
          ? ordered.map(w => `<span class="atc-fix">${w.name}</span>`).join(' ')
          : '<span class="atc-fix" style="opacity: 0.5">DCT</span>';
        return `
          <div class="atc-route-section">
            <div class="atc-route-label">ATC ROUTE</div>
            <div class="atc-route-string"><span class="atc-fix atc-fix-apt">${fromCode}</span> ${fixSpans} <span class="atc-fix atc-fix-apt">${toCode}</span></div>
          </div>
        `;
      })()}

      <!-- Flight Stats -->
      <div class="flight-stats">
        <div class="stat-row">
          <span class="stat-label">Distance</span>
          <span class="stat-value">${distance} nm${hasTechStop ? ' (via ' + techCode + ')' : ''}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Capacity</span>
          <span class="stat-value">${passengerCapacity} pax</span>
        </div>
        ${!isOtherAirline ? `
        <div class="stat-row">
          <span class="stat-label">Load Factor</span>
          <span class="stat-value ${loadFactor >= 0.80 ? 'high' : loadFactor >= 0.50 ? 'medium' : 'low'}">${(loadFactor * 100).toFixed(1)}%</span>
        </div>
        ` : ''}
      </div>
    </div>
  `;

  // Shift dropdown when panel is shown
  const dropdown = document.querySelector('.map-filter-dropdown');
  if (dropdown) dropdown.classList.add('shifted');
}

// Lightweight update of just the progress/status in the flight info panel (called every 2s tick)
function updateFlightInfoProgress() {
  const flight = activeFlights.find(f => f.id === selectedFlightId);
  if (!flight) return;

  const position = calculateFlightPosition(flight);
  const phase = position.phase || 'outbound';

  // Update status badge
  const statusBadge = document.querySelector('.status-badge');
  if (statusBadge) {
    const phaseStatus = phase === 'outbound' ? 'OUTBOUND' : phase === 'turnaround' ? 'TURNAROUND'
      : phase === 'techstop' ? 'TECH STOP' : 'RETURN';
    statusBadge.textContent = phaseStatus;
    statusBadge.className = `status-badge ${phase}`;
  }

  // Update progress text
  const progressText = document.querySelector('.progress-text');
  if (progressText) {
    const progressPercent = (phase === 'turnaround' || phase === 'techstop') ? 100 : Math.round((position.progress || 0) * 100);
    progressText.textContent = `${progressPercent}% complete`;
  }
}

// Hide flight info panel
function hideFlightInfo() {
  const panel = document.getElementById('flightInfoPanel');
  if (panel) {
    panel.style.display = 'none';
  }

  // Unshift dropdown when panel is hidden
  const dropdown = document.querySelector('.map-filter-dropdown');
  if (dropdown) dropdown.classList.remove('shifted');
}

// Clear route line and airport markers for previously selected flight
function clearSelectedFlightElements() {
  // Remove selected highlight from previous aircraft marker
  if (selectedFlightId) {
    const prevMarker = flightMarkers.get(selectedFlightId);
    if (prevMarker) {
      const el = prevMarker.getElement();
      if (el) {
        const inner = el.querySelector('.aircraft-marker-inner');
        if (inner) inner.classList.remove('selected');
      }
    }
  }

  // Remove route lines (handle both single lines and arrays for tech stop routes)
  routeLines.forEach((line) => {
    if (Array.isArray(line)) {
      line.forEach(l => map.removeLayer(l));
    } else {
      map.removeLayer(line);
    }
  });
  routeLines.clear();

  // Remove airport markers
  airportMarkers.forEach((marker) => map.removeLayer(marker));
  airportMarkers.clear();

  // Remove waypoint markers
  waypointMarkers.forEach(m => map.removeLayer(m));
  waypointMarkers = [];
}

// Select a flight
function selectFlight(flightId) {
  // If clicking the same flight, deselect
  if (selectedFlightId === flightId) {
    deselectFlight();
    return;
  }

  // Clear previous selection
  clearSelectedFlightElements();

  selectedFlightId = flightId;

  // Find the flight data
  const flight = activeFlights.find(f => f.id === flightId);
  if (!flight) return;

  // Store initial phase for change detection
  const position = calculateFlightPosition(flight);
  flight._lastDrawnPhase = position.phase;

  // Create route line and airport markers for selected flight (current sector only)
  createRouteLine(flight);
  createAirportMarkers(flight);

  // Highlight the selected aircraft marker
  const selectedMarker = flightMarkers.get(flightId);
  if (selectedMarker) {
    const el = selectedMarker.getElement();
    if (el) {
      const inner = el.querySelector('.aircraft-marker-inner');
      if (inner) inner.classList.add('selected');
    }
  }

  // Show flight info
  showFlightInfo(flight);

  // Center map on the flight route
  const marker = flightMarkers.get(flightId);
  if (marker) {
    // Get bounds of the route
    const depLat = parseFloat(flight.departureAirport.latitude);
    const depLng = parseFloat(flight.departureAirport.longitude);
    const arrLat = parseFloat(flight.arrivalAirport.latitude);
    const arrLng = parseFloat(flight.arrivalAirport.longitude);

    const bounds = L.latLngBounds(
      [depLat, depLng],
      [arrLat, arrLng]
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
  }

  // Highlight in flights list
  if (flightsListOpen) updateFlightsList();
}

// Deselect flight
function deselectFlight() {
  clearSelectedFlightElements();
  selectedFlightId = null;
  hideFlightInfo();

  // Remove highlight from flights list
  if (flightsListOpen) updateFlightsList();
}


// Clear all map elements
function clearMap() {
  flightMarkers.forEach(marker => map.removeLayer(marker));
  flightMarkers.clear();
  clearTours();
  clearSelectedFlightElements();
}

// Expose selectFlight globally for onclick handlers
window.selectFlight = selectFlight;

// Toggle live flights list panel
function toggleFlightsList() {
  const panel = document.getElementById('flightsListPanel');
  const toggle = document.getElementById('flightsListToggle');
  if (!panel || !toggle) return;

  flightsListOpen = !flightsListOpen;
  panel.style.display = flightsListOpen ? 'flex' : 'none';
  toggle.classList.toggle('active', flightsListOpen);

  if (flightsListOpen) {
    updateFlightsList();
  }
}

// Update the live flights list with current flight data
function updateFlightsList() {
  const body = document.getElementById('flightsListBody');
  const countEl = document.getElementById('flightsListCount');
  const badgeEl = document.getElementById('flightsListBadge');
  if (!body) return;

  // Count only airborne flights (not turnaround/techstop)
  const airborneFlights = activeFlights.filter(f => {
    const pos = calculateFlightPosition(f);
    return pos.phase === 'outbound' || pos.phase === 'return';
  });

  const totalCount = activeFlights.length;
  if (countEl) countEl.textContent = totalCount;
  if (badgeEl) badgeEl.textContent = totalCount;

  if (totalCount === 0) {
    body.innerHTML = '<div class="no-flights">No active flights</div>';
    return;
  }

  // Sort: own flights first, then by route number
  const sorted = [...activeFlights].sort((a, b) => {
    // Own flights first
    if (a.isOwnFlight !== false && b.isOwnFlight === false) return -1;
    if (a.isOwnFlight === false && b.isOwnFlight !== false) return 1;
    // Then by route number
    const rA = a.route?.routeNumber || '';
    const rB = b.route?.routeNumber || '';
    return rA.localeCompare(rB);
  });

  let html = '';
  for (const flight of sorted) {
    const position = calculateFlightPosition(flight);
    const phase = position.phase || 'outbound';
    const isOther = flight.isOwnFlight === false;
    const depCode = flight.departureAirport?.iataCode || flight.departureAirport?.icaoCode || '???';
    const arrCode = flight.arrivalAirport?.iataCode || flight.arrivalAirport?.icaoCode || '???';
    const routeNum = position.routeNumber || flight.route?.routeNumber || '';
    const model = flight.aircraft?.aircraftType?.model || '';
    const variant = flight.aircraft?.aircraftType?.variant || '';
    const acType = variant ? `${model}-${variant}` : model;
    const reg = flight.aircraft?.registration || '';
    const isSelected = flight.id === selectedFlightId;

    html += `<div class="fl-entry${isOther ? ' other-airline' : ''}${isSelected ? ' selected' : ''}" data-flight-id="${flight.id}" onclick="focusFlight('${flight.id}')">
      <div class="fl-phase ${phase}"></div>
      <div class="fl-info">
        <div class="fl-row-top">
          <span class="fl-route-num">${routeNum}</span>
          <span class="fl-airports">${depCode}<span class="fl-arrow">${phase === 'return' ? ' ◂ ' : ' ▸ '}</span>${arrCode}</span>
        </div>
        <div class="fl-row-bottom">
          ${[
            acType ? `<span class="fl-aircraft">${acType}</span>` : '',
            reg ? `<span class="fl-aircraft">${reg}</span>` : ''
          ].filter(Boolean).join('<span class="fl-separator">·</span>')}
          ${isOther && flight.airlineName ? `<span class="fl-airline-name">${flight.airlineName}</span>` : ''}
        </div>
      </div>
    </div>`;
  }

  body.innerHTML = html;
}

// Lightweight update of flight list phase indicators (called every 1s tick)
function updateFlightsListPositions() {
  const body = document.getElementById('flightsListBody');
  if (!body) return;

  const entries = body.querySelectorAll('.fl-entry');
  entries.forEach(entry => {
    const flightId = entry.dataset.flightId;
    const flight = activeFlights.find(f => f.id === flightId);
    if (!flight) return;

    const position = calculateFlightPosition(flight);
    const phaseEl = entry.querySelector('.fl-phase');
    if (phaseEl) {
      phaseEl.className = `fl-phase ${position.phase || 'outbound'}`;
    }

    // Update arrow direction
    const arrowEl = entry.querySelector('.fl-arrow');
    if (arrowEl) {
      arrowEl.textContent = position.phase === 'return' ? ' ◂ ' : ' ▸ ';
    }
  });
}

// Focus map on a specific flight and select it
function focusFlight(flightId) {
  const flight = activeFlights.find(f => f.id === flightId);
  if (!flight) return;

  const position = calculateFlightPosition(flight);

  // If on the ground (turnaround), center on the airport position
  if (position.phase === 'turnaround') {
    map.setView([parseFloat(flight.arrivalAirport.latitude), parseFloat(flight.arrivalAirport.longitude)], 6);
  } else {
    // Center on current aircraft position
    map.setView([position.lat, position.lng], 5);
  }

  // Select the flight (shows route + details panel)
  selectFlight(flightId);

  // Update the list to highlight selected
  updateFlightsList();
}

// Make focusFlight available globally for onclick
window.focusFlight = focusFlight;

// ===== FIR Boundary Overlay =====

// Load FIR boundary GeoJSON (lazy-loaded on first toggle)
async function loadFirBoundaries() {
  if (firDataLoaded) return;
  try {
    console.log('[WorldMap] Loading FIR boundaries...');
    const [geoResp, restrictResp] = await Promise.all([
      fetch('/data/fir-boundaries-base.geojson'),
      fetch('/api/airspace').catch(() => null)
    ]);
    if (!geoResp.ok) throw new Error(`HTTP ${geoResp.status}`);
    firGeoJsonData = await geoResp.json();
    firDataLoaded = true;

    // Load restricted FIR codes
    firRestrictedCodes.clear();
    if (restrictResp && restrictResp.ok) {
      const data = await restrictResp.json();
      for (const r of (data.restrictions || [])) firRestrictedCodes.add(r.firCode);
    }

    console.log('[WorldMap] FIR boundaries loaded:', firGeoJsonData.features.length, 'regions');
    renderFirBoundaries();
  } catch (error) {
    console.error('[WorldMap] Failed to load FIR boundaries:', error);
  }
}

// Render FIR polygons and labels on map
function renderFirBoundaries() {
  if (!firGeoJsonData || !map) return;

  // Remove old layers before re-rendering
  if (firLayerGroup && map.hasLayer(firLayerGroup)) map.removeLayer(firLayerGroup);
  if (firLabelGroup && map.hasLayer(firLabelGroup)) map.removeLayer(firLabelGroup);

  firLayerGroup = L.layerGroup();
  firLabelGroup = L.layerGroup();

  const showRestricted = airlineFilterMode === 'mine' && firRestrictedCodes.size > 0;

  L.geoJSON(firGeoJsonData, {
    style: function(feature) {
      const firCode = feature.properties.id;
      const isRestricted = showRestricted && firRestrictedCodes.has(firCode);
      const isOceanic = feature.properties.oceanic === '1' || feature.properties.oceanic === 1;

      if (isRestricted) {
        return {
          color: 'rgba(248, 81, 73, 0.6)',
          weight: 1.5,
          fillColor: 'rgba(248, 81, 73, 0.12)',
          fillOpacity: 1,
          interactive: false
        };
      }
      return {
        color: isOceanic ? 'rgba(88, 166, 255, 0.25)' : 'rgba(88, 166, 255, 0.4)',
        weight: isOceanic ? 0.5 : 1,
        fillColor: 'rgba(88, 166, 255, 0.03)',
        fillOpacity: 1,
        dashArray: isOceanic ? '4, 4' : null,
        interactive: false
      };
    },
    onEachFeature: function(feature, layer) {
      firLayerGroup.addLayer(layer);

      const props = feature.properties;
      if (props.label_lat && props.label_lon) {
        const firCode = props.id;
        const isRestricted = showRestricted && firRestrictedCodes.has(firCode);
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

  // Show/hide restricted airspace legend
  const restrictedLegend = document.querySelector('.restricted-fir-legend');
  if (restrictedLegend) restrictedLegend.style.display = (firVisible && showRestricted) ? 'flex' : 'none';

  firLayerGroup.addTo(map);
  updateFirLabelVisibility();
  map.on('zoomend', updateFirLabelVisibility);
}

// Show/hide FIR labels based on zoom level
function updateFirLabelVisibility() {
  if (!firLabelGroup || !firVisible) return;

  const zoom = map.getZoom();
  if (zoom >= 4) {
    if (!map.hasLayer(firLabelGroup)) {
      firLabelGroup.addTo(map);
    }
  } else {
    if (map.hasLayer(firLabelGroup)) {
      map.removeLayer(firLabelGroup);
    }
  }
}

// Toggle FIR boundary layer on/off
function toggleFirBoundaries() {
  firVisible = !firVisible;

  const toggle = document.getElementById('firToggle');
  if (toggle) toggle.classList.toggle('active', firVisible);

  const firLegend = document.querySelector('.fir-legend');
  if (firLegend) firLegend.style.display = firVisible ? 'flex' : 'none';

  const restrictedLegend = document.querySelector('.restricted-fir-legend');
  if (restrictedLegend && !firVisible) restrictedLegend.style.display = 'none';

  if (firVisible) {
    if (!firDataLoaded) {
      loadFirBoundaries();
    } else {
      if (firLayerGroup) firLayerGroup.addTo(map);
      updateFirLabelVisibility();
    }
  } else {
    if (firLayerGroup && map.hasLayer(firLayerGroup)) {
      map.removeLayer(firLayerGroup);
    }
    if (firLabelGroup && map.hasLayer(firLabelGroup)) {
      map.removeLayer(firLabelGroup);
    }
  }
}

// ===== NAT Tracks Overlay =====

// Load NAT track data (lazy-loaded on first toggle)
async function loadNatTracks() {
  if (natDataLoaded) return;
  try {
    console.log('[WorldMap] Loading NAT tracks...');
    const response = await fetch('/data/nat-tracks.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    natTrackData = await response.json();
    natDataLoaded = true;
    console.log('[WorldMap] NAT tracks loaded:', natTrackData.length, 'tracks');
    renderNatTracks();
  } catch (error) {
    console.error('[WorldMap] Failed to load NAT tracks:', error);
  }
}

// Render NAT track polylines, waypoint markers, and labels
function renderNatTracks() {
  if (!natTrackData || !map) return;

  natLayerGroup = L.layerGroup();
  natLabelGroup = L.layerGroup();

  natTrackData.forEach(track => {
    const waypoints = track.waypoints;
    if (!waypoints || waypoints.length < 2) return;

    // Draw great-circle polyline segments between consecutive waypoints
    for (let i = 0; i < waypoints.length - 1; i++) {
      const segments = generateGreatCirclePath(
        waypoints[i].lat, waypoints[i].lng,
        waypoints[i + 1].lat, waypoints[i + 1].lng, 20
      );
      segments.forEach(segment => {
        const line = L.polyline(segment, {
          color: '#4ade80',
          weight: 1.5,
          opacity: 0.5,
          dashArray: '6, 4',
          interactive: false
        });
        natLayerGroup.addLayer(line);
      });
    }

    // Add small circle markers at each waypoint with tooltips
    waypoints.forEach(wp => {
      const circle = L.circleMarker([wp.lat, wp.lng], {
        radius: 2.5,
        color: '#4ade80',
        fillColor: '#4ade80',
        fillOpacity: 0.7,
        weight: 1,
        interactive: true
      });
      circle.bindTooltip(wp.name, {
        permanent: false,
        direction: 'top',
        offset: [0, -5],
        className: 'waypoint-tooltip nat-wp-tooltip'
      });
      natLayerGroup.addLayer(circle);
    });

    // Add track name label at the midpoint of the track
    const midIdx = Math.floor(waypoints.length / 2);
    const midWp = waypoints[midIdx];
    const label = L.marker([midWp.lat, midWp.lng], {
      icon: L.divIcon({
        className: 'nat-label',
        html: `<span class="nat-label-text">${track.id}</span>`,
        iconSize: [30, 16],
        iconAnchor: [15, 8]
      }),
      interactive: false
    });
    natLabelGroup.addLayer(label);
  });

  natLayerGroup.addTo(map);
  updateNatLabelVisibility();
  map.on('zoomend', updateNatLabelVisibility);
  map.on('moveend', updateNatLabelVisibility);
}

// Show/hide NAT labels based on zoom level and viewport
let natLabelDebounceTimer = null;
function updateNatLabelVisibility() {
  if (!natLabelGroup || !natVisible) return;

  const zoom = map.getZoom();
  if (zoom < 4) {
    if (map.hasLayer(natLabelGroup)) {
      map.removeLayer(natLabelGroup);
    }
    return;
  }

  if (natLabelDebounceTimer) clearTimeout(natLabelDebounceTimer);
  natLabelDebounceTimer = setTimeout(() => {
    if (!map.hasLayer(natLabelGroup)) {
      natLabelGroup.addTo(map);
    }
  }, 150);
}

// Toggle NAT tracks layer on/off
function toggleNatTracks() {
  natVisible = !natVisible;

  const toggle = document.getElementById('natToggle');
  if (toggle) toggle.classList.toggle('active', natVisible);

  const natLegend = document.querySelector('.nat-legend');
  if (natLegend) natLegend.style.display = natVisible ? 'flex' : 'none';

  if (natVisible) {
    if (!natDataLoaded) {
      loadNatTracks();
    } else {
      if (natLayerGroup) natLayerGroup.addTo(map);
      updateNatLabelVisibility();
    }
  } else {
    if (natLayerGroup && map.hasLayer(natLayerGroup)) {
      map.removeLayer(natLayerGroup);
    }
    if (natLabelGroup && map.hasLayer(natLabelGroup)) {
      map.removeLayer(natLabelGroup);
    }
  }
}

// Initialize the world map
async function initializeWorldMap() {
  console.log('[WorldMap] Initializing...');

  try {
    // Load Leaflet library first
    await loadLeaflet();

    // Wait a moment for the map container to be properly sized
    setTimeout(initMap, 100);
  } catch (error) {
    console.error('[WorldMap] Failed to initialize:', error);
  }
}

// Initialize when DOM is ready, or immediately if already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeWorldMap);
} else {
  // DOM already loaded (script loaded dynamically)
  initializeWorldMap();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
});

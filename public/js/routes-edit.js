let routeId = null;
let existingRoute = null;
let baseAirport = null;
let worldInfo = null;
let availableAirports = [];
let newDestinationAirport = null;
let userFleet = [];
let allRoutes = [];
let isChangingDestination = false;
let selectedDaysOfWeek = [];
let selectedTechStopAirport = null;   // user-selected tech stop (overrides route's stored one)
let techStopRoutingDistance = null;   // leg1 + leg2 NM when a tech stop is set

// Aircraft lookup by UserAircraft ID (populated in populateFleetDropdown) — needed by flight timing
let aircraftDataById = {};

// ── Ported from routes-create.js: route map preview + flight timing + custom ATC ──
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

// Route preview map variables
let routePreviewMap = null;
let routePreviewLine = null;
let routePreviewMarkers = [];
let expandedMap = null;
let expandedMapLayers = [];
let firGeoJsonCache = null;

// Custom / auto ATC route state
let customAtcWaypoints = null; // [{name, lat, lng}, ...] — set when user applies a custom route
let customAtcRouteString = '';
let autoAtcWaypoints = null; // [{name, lat, lng}, ...] — auto-computed from server
let autoAtcAvoidedFirs = []; // FIR codes that were avoided
let autoAtcNatTrack = null;  // {id, name, direction, waypoints} — NAT track used if any
let _atcPreviewAbort = null; // AbortController for in-flight preview requests
let _previousCustomRouteData = null; // Stored data from the previous-custom-route check

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
  const overlay = document.getElementById('airportLoadingOverlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

// Get route ID from URL
function getRouteIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
}

// Fetch existing route data
async function fetchRouteData() {
  try {
    const response = await fetch(`/api/routes`);
    if (response.ok) {
      const routes = await response.json();
      existingRoute = routes.find(r => r.id === routeId);

      if (!existingRoute) {
        alert('Route not found');
        window.location.href = '/routes';
        return;
      }

      populateFormFields();
      applyEraClassGating();

      // Initialize the route map preview, flight timing and auto ATC route now that
      // base airport, fleet and route data are all loaded.
      initRouteFeatures();
    }
  } catch (error) {
    console.error('Error fetching route:', error);
    alert('Error loading route data');
    window.location.href = '/routes';
  }
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
      const data = await response.json();
      userFleet = data.fleet || data; // endpoint returns { fleet, worldYear, ... }
      populateFleetDropdown();
    }
  } catch (error) {
    console.error('Error fetching fleet:', error);
  }
}

// Fetch existing routes for filtering
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

// Populate fleet dropdown with unique aircraft types
function populateFleetDropdown() {
  const select = document.getElementById('assignedAircraft');

  // Extract unique aircraft types
  const uniqueTypes = new Map();
  userFleet.forEach(aircraft => {
    const typeName = `${aircraft.aircraft.manufacturer} ${aircraft.aircraft.model}${aircraft.aircraft.variant ? (aircraft.aircraft.variant.startsWith('-') ? aircraft.aircraft.variant : '-' + aircraft.aircraft.variant) : ''}`;
    const typeKey = `${aircraft.aircraft.manufacturer}_${aircraft.aircraft.model}_${aircraft.aircraft.variant || ''}`;

    if (!uniqueTypes.has(typeKey)) {
      // Store first aircraft of this type (for reference, since backend expects aircraft ID)
      uniqueTypes.set(typeKey, {
        id: aircraft.id,
        name: typeName,
        aircraftTypeId: aircraft.aircraft.id
      });
      // Store aircraft type data keyed by the UserAircraft ID used as the option value,
      // so flight-timing can look it up (mirrors create page's aircraftDataById).
      aircraftDataById[aircraft.id] = aircraft.aircraft;
    }
  });

  // Build options - show only aircraft type names without registrations
  select.innerHTML = '<option value="">-- Select aircraft type --</option>' +
    Array.from(uniqueTypes.values()).map(type => `
      <option value="${type.id}">
        ${type.name}
      </option>
    `).join('');

  // Select current aircraft type if assigned
  if (existingRoute && existingRoute.assignedAircraft) {
    // Find option that matches the current aircraft's type
    const currentTypeKey = `${existingRoute.assignedAircraft.aircraft.manufacturer}_${existingRoute.assignedAircraft.aircraft.model}_${existingRoute.assignedAircraft.aircraft.variant || ''}`;
    const matchingType = Array.from(uniqueTypes.entries()).find(([key]) => key === currentTypeKey);
    if (matchingType) {
      select.value = matchingType[1].id;
    }
  }
}

// ─── Pricing adjust helpers (used by the +/- buttons in the HTML) ───
function adjustPrice(fieldId, percentage) {
  const field = document.getElementById(fieldId);
  if (!field || field.disabled) return;
  const current = parseFloat(field.value) || 0;
  field.value = Math.max(0, Math.round(current * (1 + percentage / 100)));
}

function adjustAllTicketPrices(percentage) {
  ['economyPrice', 'economyPlusPrice', 'businessPrice', 'firstPrice'].forEach(id => adjustPrice(id, percentage));
}

function adjustAllCargoRates(percentage) {
  const keys = (typeof CARGO_TYPE_KEYS !== 'undefined') ? CARGO_TYPE_KEYS : [];
  keys.forEach(k => adjustPrice(`cargoRate_${k}`, percentage));
}

// Render the per-cargo-type rate inputs from the shared CARGO_TYPES config,
// grouped Core / Special (matches the create-route page).
function renderCargoRateFields() {
  const container = document.getElementById('cargoRatesContainer');
  if (!container || typeof CARGO_TYPES === 'undefined') return;
  if (container.dataset.rendered === 'true') return;

  const inputStyle = 'width: 100%; padding: 0.6rem; background: var(--surface-elevated); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); font-size: 0.95rem;';
  const btnStyle = 'flex: 1; padding: 0.2rem; font-size: 0.7rem; background: var(--surface-elevated); border: 1px solid var(--border-color); color: var(--text-muted); border-radius: 3px; cursor: pointer; opacity: 0.7; transition: opacity 0.2s;';

  const fieldHtml = (key) => {
    const t = CARGO_TYPES[key];
    const fid = `cargoRate_${key}`;
    const btn = (pct, label) => `<button type="button" onclick="adjustPrice('${fid}', ${pct})" style="${btnStyle}" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">${label}</button>`;
    return `
      <div>
        <label style="display: block; margin-bottom: 0.35rem; color: var(--text-secondary); font-weight: 600; font-size: 0.8rem;">
          ${t.label} ($/tn)${t.cargoOnly ? ' <span style="color: var(--text-muted); font-weight: normal; font-size: 0.85em;">(freighter only)</span>' : ''}
        </label>
        <input type="number" id="${fid}" placeholder="${t.defaultRate}" min="0" step="10" style="${inputStyle}" />
        <div style="display: flex; gap: 0.25rem; margin-top: 0.4rem;">
          ${btn(-10, '-10%')}${btn(-5, '-5%')}${btn(5, '+5%')}${btn(10, '+10%')}
        </div>
      </div>`;
  };

  const groupHtml = (keys) => `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
      ${keys.map(fieldHtml).join('')}
    </div>`;

  const coreKeys = CARGO_TYPE_KEYS.filter(k => CARGO_TYPES[k].category === 'core');
  const specialKeys = CARGO_TYPE_KEYS.filter(k => CARGO_TYPES[k].category === 'special');

  container.innerHTML =
    `<div style="color: var(--text-muted); font-size: 0.72rem; font-weight: 600; margin-bottom: 0.4rem; letter-spacing: 0.03em;">CORE</div>` +
    groupHtml(coreKeys) +
    `<div style="color: var(--text-muted); font-size: 0.72rem; font-weight: 600; margin-bottom: 0.4rem; letter-spacing: 0.03em;">SPECIAL</div>` +
    groupHtml(specialKeys);

  container.dataset.rendered = 'true';
}

// Populate the cargo rate inputs from the route's stored rates, falling back to
// the legacy Light/Standard/Heavy columns for pre-migration routes.
function populateCargoRateFields() {
  if (typeof CARGO_TYPE_KEYS === 'undefined') return;
  const rates = existingRoute.cargoRates || {};
  const legacy = {
    general: existingRoute.cargoLightRate,
    express: existingRoute.cargoStandardRate,
    heavy: existingRoute.cargoHeavyRate
  };
  CARGO_TYPE_KEYS.forEach(k => {
    const field = document.getElementById(`cargoRate_${k}`);
    if (!field) return;
    let val = rates[k];
    if (val === undefined || val === null) val = legacy[k];
    val = parseFloat(val) || 0;
    field.value = val > 0 ? Math.round(val) : ''; // leave blank so placeholder (default) shows
  });
}

// Populate form fields with existing route data
function populateFormFields() {
  // Set prefix fields
  if (worldInfo && worldInfo.iataCode) {
    document.getElementById('routePrefix').value = worldInfo.iataCode;
    document.getElementById('returnRoutePrefix').value = worldInfo.iataCode;
  }

  // Extract route number suffix (remove prefix)
  const prefix = worldInfo?.iataCode || '';
  const routeNumSuffix = existingRoute.routeNumber.startsWith(prefix)
    ? existingRoute.routeNumber.substring(prefix.length)
    : existingRoute.routeNumber;
  const returnRouteNumSuffix = existingRoute.returnRouteNumber && existingRoute.returnRouteNumber.startsWith(prefix)
    ? existingRoute.returnRouteNumber.substring(prefix.length)
    : existingRoute.returnRouteNumber || '';

  document.getElementById('routeNumber').value = routeNumSuffix;
  document.getElementById('returnRouteNumber').value = returnRouteNumSuffix;
  document.getElementById('departureTime').value = existingRoute.scheduledDepartureTime;
  document.getElementById('isActive').checked = existingRoute.isActive;

  // Set turnaround time
  document.getElementById('turnaroundTime').value = roundTo5(existingRoute.turnaroundTime || 45);

  // Set transport type + show the matching pricing sections
  document.getElementById('transportType').value = existingRoute.transportType || 'both';
  updatePricingVisibility();

  // Set pricing values
  document.getElementById('economyPrice').value = existingRoute.economyPrice || 0;
  document.getElementById('economyPlusPrice').value = existingRoute.economyPlusPrice || 0;
  document.getElementById('businessPrice').value = existingRoute.businessPrice || 0;
  document.getElementById('firstPrice').value = existingRoute.firstPrice || 0;

  // Build and populate the cargo rate inputs (new 8-type model)
  renderCargoRateFields();
  populateCargoRateFields();

  // Set days of week
  if (existingRoute.daysOfWeek && existingRoute.daysOfWeek.length > 0) {
    selectedDaysOfWeek = [...existingRoute.daysOfWeek];
    selectedDaysOfWeek.forEach(day => {
      const button = document.querySelector(`button[data-day="${day}"]`);
      if (button) {
        button.style.background = 'var(--accent-color)';
        button.style.borderColor = 'var(--accent-color)';
        button.style.color = 'white';
      }
    });
  }

  // Show current destination
  document.getElementById('currentDestName').textContent =
    `${existingRoute.arrivalAirport.icaoCode} - ${existingRoute.arrivalAirport.name}`;
  document.getElementById('currentDestDetails').textContent =
    `${existingRoute.arrivalAirport.city}, ${existingRoute.arrivalAirport.country}`;
  document.getElementById('currentDestDistance').textContent =
    `${Math.round(existingRoute.distance)} NM`;

  // Show arrival airport in readonly field
  document.getElementById('arrivalAirport').value =
    `${existingRoute.arrivalAirport.icaoCode} - ${existingRoute.arrivalAirport.name}`;

  // Restore an existing technical stop into the editable UI
  restoreExistingTechStop();

  // Show the form
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('editForm').style.display = 'block';
}

// If the route already has a tech stop, tick the box, reveal the section, and
// seed the editable state so it displays and persists correctly.
function restoreExistingTechStop() {
  const t = existingRoute && existingRoute.techStopAirport;
  if (!t) return;
  const dest = getEditDestination();
  const leg1 = (baseAirport && t.latitude != null)
    ? Math.round(calculateDistance(baseAirport.latitude, baseAirport.longitude, t.latitude, t.longitude)) : 0;
  const leg2 = (dest && t.latitude != null && dest.latitude != null)
    ? Math.round(calculateDistance(t.latitude, t.longitude, dest.latitude, dest.longitude)) : 0;
  selectedTechStopAirport = { ...t, distanceFromDeparture: leg1, distanceToDestination: leg2 };
  techStopRoutingDistance = leg1 + leg2;

  const checkbox = document.getElementById('includeTechStop');
  if (checkbox) checkbox.checked = true;
  const section = document.getElementById('techStopSection');
  if (section) section.style.display = 'block';
  document.getElementById('techStopName').textContent = `${t.icaoCode} - ${t.name}`;
  document.getElementById('techStopDetails').textContent = `${t.city || ''}, ${t.country || ''}`;
  document.getElementById('techStopDistanceFromDep').textContent = `${leg1} NM`;
  document.getElementById('techStopDistanceToDest').textContent = `${leg2} NM`;
  document.getElementById('selectedTechStop').style.display = 'block';
}

// Disable class pricing fields that don't exist in the current game era.
// Business class: introduced 1978. Premium Economy: introduced 1992.
function applyEraClassGating() {
  const gameYear = worldInfo?.currentTime ? new Date(worldInfo.currentTime).getFullYear() : 9999;

  const gates = [
    { id: 'economyPlusPrice', from: 1992, label: 'available from 1992' },
    { id: 'businessPrice',    from: 1978, label: 'available from 1978' },
  ];

  for (const { id, from, label } of gates) {
    const field = document.getElementById(id);
    if (!field) continue;
    if (gameYear < from) {
      field.disabled = true;
      field.value    = '';
      field.style.opacity = '0.5';
      field.style.cursor  = 'not-allowed';
      const lbl = field.closest('div')?.querySelector('label');
      if (lbl) {
        const existing = lbl.querySelector('.class-avail-note');
        if (existing) existing.remove();
        const span = document.createElement('span');
        span.className = 'class-avail-note';
        span.style.cssText = 'color: var(--text-muted); font-weight: normal; font-size: 0.8em;';
        span.textContent = ` (${label})`;
        lbl.appendChild(span);
      }
    }
  }
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

// Show destination change panel
async function changeDestination() {
  isChangingDestination = true;
  document.getElementById('currentDestinationPanel').style.display = 'none';
  document.getElementById('destinationSelectionPanel').style.display = 'block';

  // Load airports if not already loaded
  if (availableAirports.length === 0) {
    await loadAvailableAirports();
  }
}

// Cancel destination change
function cancelDestinationChange() {
  isChangingDestination = false;
  newDestinationAirport = null;
  document.getElementById('currentDestinationPanel').style.display = 'block';
  document.getElementById('destinationSelectionPanel').style.display = 'none';
}

// Load available airports for destination selection
async function loadAvailableAirports() {
  // Show loading overlay
  showLoadingOverlay('Loading airports...');

  try {
    const response = await fetch('/api/world/airports');
    if (response.ok) {
      const data = await response.json();

      // Update loading message if it's first load
      if (data.isFirstLoad) {
        updateLoadingOverlay('Loading for the first time...<br><small style="opacity: 0.7;">This may take a moment</small>');
      }

      const airports = data.airports || data; // Support both new and old format

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

      // Populate country and timezone filters
      populateCountryFilter();
      populateTimezoneFilter();

      // Display airports
      applyDestinationFilters();

      // Hide loading overlay
      hideLoadingOverlay();
    }
  } catch (error) {
    console.error('Error loading airports:', error);
    hideLoadingOverlay();
    document.getElementById('availableAirportsList').innerHTML = `
      <div style="padding: 3rem; text-align: center; color: var(--warning-color);">
        Error loading airports
      </div>
    `;
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

  // Continent to countries mapping
  const continentCountries = {
    'Africa': ['South Africa', 'Nigeria', 'Kenya', 'Ethiopia', 'Morocco', 'Algeria', 'Tunisia', 'Ghana', 'Tanzania', 'Uganda', 'Zimbabwe', 'Angola', 'Mozambique'],
    'Asia': ['China', 'Japan', 'South Korea', 'India', 'Singapore', 'Malaysia', 'Indonesia', 'Thailand', 'Philippines', 'Vietnam', 'Hong Kong', 'Taiwan', 'Pakistan', 'Bangladesh', 'Sri Lanka', 'Nepal'],
    'Europe': ['United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Poland', 'Czech Republic', 'Portugal', 'Greece', 'Turkey', 'Russia', 'Ukraine', 'Romania', 'Hungary', 'Bulgaria', 'Serbia', 'Croatia', 'Slovenia', 'Slovakia', 'Ireland', 'Iceland', 'Luxembourg'],
    'North America': ['United States', 'Canada', 'Mexico', 'Costa Rica', 'Panama', 'Cuba', 'Jamaica'],
    'South America': ['Brazil', 'Argentina', 'Chile', 'Colombia', 'Peru', 'Venezuela', 'Ecuador', 'Bolivia', 'Paraguay', 'Uruguay'],
    'Oceania': ['Australia', 'New Zealand']
  };

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

// Apply all destination filters
function applyDestinationFilters() {
  const searchKeyword = document.getElementById('searchKeyword').value.toLowerCase();
  const country = document.getElementById('countryFilter').value;
  const infraOperator = document.getElementById('infraOperator').value;
  const infraLevel = parseInt(document.getElementById('infraLevel').value) || null;
  const trafficOperator = document.getElementById('trafficOperator').value;
  const trafficLevel = parseInt(document.getElementById('trafficLevel').value) || null;
  const timezone = document.getElementById('timezoneFilter').value;
  const minRange = parseFloat(document.getElementById('minRange').value) || 0;
  const maxRange = parseFloat(document.getElementById('maxRange').value) || 0;
  const excludeExisting = document.getElementById('excludeExistingRoutes').checked;

  // Get existing route destinations (excluding current route)
  const existingDestinations = allRoutes
    .filter(r => r.id !== routeId)
    .map(r => r.arrivalAirport.icaoCode);

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

    // Country filter
    if (country && airport.country !== country) {
      return false;
    }

    // Spare capacity filter
    if (infraLevel !== null) {
      const airportCapacity = airport.spareCapacity || 0;
      if (infraOperator === '=' && airportCapacity !== infraLevel) return false;
      if (infraOperator === '>=' && airportCapacity < infraLevel) return false;
      if (infraOperator === '<=' && airportCapacity > infraLevel) return false;
    }

    // Traffic level filter
    if (trafficLevel !== null) {
      const airportTraffic = airport.trafficDemand || 0;
      if (trafficOperator === '=' && airportTraffic !== trafficLevel) return false;
      if (trafficOperator === '>=' && airportTraffic < trafficLevel) return false;
      if (trafficOperator === '<=' && airportTraffic > trafficLevel) return false;
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

  // Sort by distance
  filtered.sort((a, b) => a.distance - b.distance);

  // Update badge
  const badge = document.getElementById('airportCountBadge');
  if (badge) {
    badge.textContent = `${filtered.length} AIRPORT${filtered.length !== 1 ? 'S' : ''}`;
  }

  // Display filtered airports
  displayAvailableAirports(filtered);
}

// Display available airports
function displayAvailableAirports(airports) {
  const container = document.getElementById('availableAirportsList');

  if (airports.length === 0) {
    container.innerHTML = `
      <div style="padding: 3rem; text-align: center; color: var(--text-muted);">
        No airports match your filters
      </div>
    `;
    return;
  }

  const html = airports.map(airport => {
    const isSelected = newDestinationAirport?.id === airport.id;
    return `
      <div
        onclick="selectDestinationAirport('${airport.id}')"
        style="
          padding: 1.25rem;
          border-bottom: 1px solid var(--border-color);
          cursor: pointer;
          background: ${isSelected ? 'var(--accent-color-dim)' : 'transparent'};
          transition: background 0.2s;
        "
        onmouseover="if (!${isSelected}) this.style.background='var(--surface-elevated)'"
        onmouseout="if (!${isSelected}) this.style.background='transparent'"
      >
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="flex: 1;">
            <div style="color: var(--text-primary); font-weight: 600; font-size: 1.05rem;">
              ${airport.icaoCode} ${airport.iataCode ? `(${airport.iataCode})` : ''} - ${airport.name}
            </div>
            <div style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.25rem;">
              ${airport.city}, ${airport.country} • ${airport.type}
            </div>
            <div style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.25rem;">
              Capacity: ${airport.spareCapacity || 0}% • Traffic: ${airport.trafficDemand}/20${airport.timezone ? ` • ${airport.timezone}` : ''}
            </div>
          </div>
          <div style="text-align: right; margin-left: 2rem;">
            <div style="color: var(--text-muted); font-size: 0.85rem;">Distance</div>
            <div style="color: var(--accent-color); font-weight: 600; font-size: 1.2rem;">${Math.round(airport.distance)} NM</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

// Select destination airport
function selectDestinationAirport(airportId) {
  newDestinationAirport = availableAirports.find(a => a.id === airportId);

  if (newDestinationAirport) {
    // Update current destination panel with new selection
    document.getElementById('currentDestName').textContent =
      `${newDestinationAirport.icaoCode} - ${newDestinationAirport.name}`;

    document.getElementById('currentDestDetails').textContent =
      `${newDestinationAirport.city}, ${newDestinationAirport.country}`;

    document.getElementById('currentDestDistance').textContent =
      `${Math.round(newDestinationAirport.distance)} NM`;

    // Update arrival airport field
    document.getElementById('arrivalAirport').value =
      `${newDestinationAirport.icaoCode} - ${newDestinationAirport.name}`;

    // Hide selection panel and show updated current destination
    document.getElementById('destinationSelectionPanel').style.display = 'none';
    document.getElementById('currentDestinationPanel').style.display = 'block';

    // Re-render list to show selection
    applyDestinationFilters();

    // Destination changed: clear any custom ATC route and re-run auto ATC + timing + map.
    customAtcWaypoints = null;
    customAtcRouteString = '';
    autoAtcWaypoints = null;
    autoAtcAvoidedFirs = [];
    autoAtcNatTrack = null;
    const indicator = document.getElementById('customAtcIndicator');
    if (indicator) indicator.style.display = 'none';
    // A tech stop chosen for the old destination no longer applies; clear it.
    if (selectedTechStopAirport) {
      selectedTechStopAirport = null;
      techStopRoutingDistance = null;
      const sel = document.getElementById('selectedTechStop');
      if (sel) sel.style.display = 'none';
      const chk = document.getElementById('includeTechStop');
      if (chk) chk.checked = false;
      const sect = document.getElementById('techStopSection');
      if (sect) sect.style.display = 'none';
    }
    initRouteFeatures();

    // Offer to reuse a previously-used custom ATC route for this new airport pair
    if (baseAirport && newDestinationAirport && newDestinationAirport.id) {
      checkPreviousCustomRoute(baseAirport.id, newDestinationAirport.id);
    }
  }
}

// Toggle day selection
function toggleDay(day) {
  const button = document.querySelector(`button[data-day="${day}"]`);
  if (!button) return;

  const index = selectedDaysOfWeek.indexOf(day);

  if (index > -1) {
    // Day is selected, remove it
    selectedDaysOfWeek.splice(index, 1);
    button.style.background = 'var(--surface-elevated)';
    button.style.borderColor = 'var(--border-color)';
    button.style.color = 'var(--text-muted)';
  } else {
    // Day is not selected, add it
    selectedDaysOfWeek.push(day);
    button.style.background = 'var(--accent-color)';
    button.style.borderColor = 'var(--accent-color)';
    button.style.color = 'white';
  }
}

// Show confirmation modal
function showConfirmationModal() {
  document.getElementById('confirmationModal').style.display = 'flex';
}

// Close confirmation modal
function closeConfirmationModal() {
  document.getElementById('confirmationModal').style.display = 'none';
}

// Confirm and submit route update
async function confirmRouteUpdate() {
  closeConfirmationModal();
  await submitRouteUpdate();
}

// Submit route update
async function submitRouteUpdate() {
  const prefix = worldInfo?.iataCode || '';
  const routeNumberPart = document.getElementById('routeNumber').value.trim();
  const returnRouteNumberPart = document.getElementById('returnRouteNumber').value.trim();
  const assignedAircraftId = document.getElementById('assignedAircraft').value || null;
  const departureTime = document.getElementById('departureTime').value;
  const turnaroundTime = roundTo5(parseInt(document.getElementById('turnaroundTime').value) || 45);
  const transportType = document.getElementById('transportType').value;
  const isActive = document.getElementById('isActive').checked;

  // Get pricing values. Era-gated classes (Business <1978, Economy Plus <1992) are
  // disabled and cleared by applyEraClassGating(); for those, keep the route's stored
  // value rather than overwriting it with a blank/0.
  const economyPlusField = document.getElementById('economyPlusPrice');
  const businessField = document.getElementById('businessPrice');
  const economyPrice = parseFloat(document.getElementById('economyPrice').value) || 0;
  const economyPlusPrice = economyPlusField.disabled
    ? (parseFloat(existingRoute.economyPlusPrice) || 0)
    : (parseFloat(economyPlusField.value) || 0);
  const businessPrice = businessField.disabled
    ? (parseFloat(existingRoute.businessPrice) || 0)
    : (parseFloat(businessField.value) || 0);
  const firstPrice = parseFloat(document.getElementById('firstPrice').value) || 0;

  // Validation
  if (!routeNumberPart) {
    alert('Please enter an outbound flight number');
    document.getElementById('routeNumber').focus();
    return;
  }

  if (!returnRouteNumberPart) {
    alert('Please enter a return flight number');
    document.getElementById('returnRouteNumber').focus();
    return;
  }

  if (selectedDaysOfWeek.length === 0) {
    alert('Please select at least one day of operation');
    return;
  }

  if (!departureTime) {
    alert('Please enter a departure time');
    document.getElementById('departureTime').focus();
    return;
  }

  if (!economyPrice || economyPrice <= 0) {
    alert('Please enter a valid economy class price');
    document.getElementById('economyPrice').focus();
    return;
  }

  // Only require a business price when the class exists in this era (field enabled)
  if (!businessField.disabled && (!businessPrice || businessPrice <= 0)) {
    alert('Please enter a valid business class price');
    businessField.focus();
    return;
  }

  if (!firstPrice || firstPrice <= 0) {
    alert('Please enter a valid first class price');
    document.getElementById('firstPrice').focus();
    return;
  }

  // Build cargo rates JSON from the per-type inputs (new 8-type model)
  const cargoRates = {};
  if (typeof CARGO_TYPE_KEYS !== 'undefined') {
    CARGO_TYPE_KEYS.forEach(k => {
      const el = document.getElementById(`cargoRate_${k}`);
      cargoRates[k] = parseFloat(el?.value) || 0;
    });
  }

  // Prepare update data
  const updateData = {
    routeNumber: prefix + routeNumberPart,
    returnRouteNumber: prefix + returnRouteNumberPart,
    assignedAircraftId,
    scheduledDepartureTime: departureTime,
    turnaroundTime,
    daysOfWeek: selectedDaysOfWeek,
    transportType,
    economyPrice,
    economyPlusPrice,
    businessPrice,
    firstPrice,
    cargoRates,
    // Keep legacy columns in sync for anything still reading them
    cargoLightRate: cargoRates.general || 0,
    cargoStandardRate: cargoRates.express || 0,
    cargoHeavyRate: cargoRates.heavy || 0,
    isActive
  };

  // If destination changed, include new destination and distance
  if (newDestinationAirport) {
    updateData.arrivalAirportId = newDestinationAirport.id;
    updateData.distance = newDestinationAirport.distance;
  }

  // Technical stop: persist the id (null clears it) and use the A→B→C routing
  // distance when a stop is set so the route reflects the longer path.
  updateData.techStopAirportId = selectedTechStopAirport ? selectedTechStopAirport.id : null;
  if (selectedTechStopAirport && techStopRoutingDistance) {
    updateData.distance = techStopRoutingDistance;
  }

  // Persist the ATC routing (waypoints + custom route string).
  // NOTE: the create page sends `customWaypoints`/`customRouteString`, and the POST
  // create handler remaps `customWaypoints` -> the Route model's `waypoints` column.
  // The edit PUT handler instead does a blanket `route.update(req.body)`, and Sequelize
  // only persists keys that match model attributes — `customWaypoints` is NOT a column
  // (the column is `waypoints`), so we must send `waypoints` directly here. We also
  // prepend DEP / append ARR when missing, mirroring the POST handler, so the stored
  // line connects to the airports.
  const routingWaypoints = customAtcWaypoints || autoAtcWaypoints || null;
  if (routingWaypoints && routingWaypoints.length > 0) {
    let finalWaypoints = routingWaypoints;
    const first = routingWaypoints[0];
    const last = routingWaypoints[routingWaypoints.length - 1];
    const hasDepArr = first && first.name === 'DEP' && last && last.name === 'ARR';
    const dest = getEditDestination();
    if (!hasDepArr && baseAirport && dest) {
      finalWaypoints = [
        { lat: parseFloat(baseAirport.latitude), lng: parseFloat(baseAirport.longitude), name: 'DEP' },
        ...routingWaypoints,
        { lat: parseFloat(dest.latitude), lng: parseFloat(dest.longitude), name: 'ARR' }
      ];
    }
    updateData.waypoints = finalWaypoints;
    // Only store a custom route string when the user set a custom route; auto routes clear it.
    updateData.customRouteString = customAtcWaypoints ? customAtcRouteString : null;
  }

  try {
    const response = await fetch(`/api/routes/${routeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update route');
    }

    // Navigate back to routes page
    window.location.href = '/routes';
  } catch (error) {
    console.error('Error updating route:', error);
    alert(`Error: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Route map preview + flight timing + custom ATC (ported/adapted from routes-create.js)
// ─────────────────────────────────────────────────────────────────────────────

// Effective destination: the newly-chosen airport if the user changed it, else the
// route's existing arrival airport (augmented with the stored distance).
function getEditDestination() {
  if (newDestinationAirport) return newDestinationAirport;
  if (existingRoute && existingRoute.arrivalAirport) {
    const a = existingRoute.arrivalAirport;
    return {
      ...a,
      distance: (a.distance != null) ? a.distance : existingRoute.distance
    };
  }
  return null;
}

// Effective tech stop (may be null). Full tech-stop editing is out of scope; we only
// draw it and feed leg distances to the timing panel so it doesn't show NaN.
function getEditTechStop() {
  // A tech stop the user just picked takes precedence over the route's stored one.
  if (selectedTechStopAirport) return selectedTechStopAirport;
  const t = existingRoute && existingRoute.techStopAirport ? existingRoute.techStopAirport : null;
  if (!t) return null;
  const dest = getEditDestination();
  if (baseAirport && dest && t.latitude != null && t.longitude != null) {
    const leg1 = calculateDistance(
      parseFloat(baseAirport.latitude), parseFloat(baseAirport.longitude),
      parseFloat(t.latitude), parseFloat(t.longitude)
    );
    const leg2 = calculateDistance(
      parseFloat(t.latitude), parseFloat(t.longitude),
      parseFloat(dest.latitude), parseFloat(dest.longitude)
    );
    return { ...t, distanceFromDeparture: leg1, distanceToDestination: leg2 };
  }
  return { ...t };
}

// ─── Route number / pricing / schedule handlers (ported from create) ───

// Warn if the entered flight number clashes with another route on overlapping days.
function validateRouteNumber(fieldId) {
  const field = document.getElementById(fieldId);
  if (!field) return true;
  const numberPart = field.value.trim();
  let errorDiv = field.parentElement.parentElement.querySelector('.validation-error');
  if (errorDiv) errorDiv.remove();
  field.style.borderColor = '';
  if (!numberPart) return true;

  const prefix = worldInfo?.iataCode || '';
  const fullRouteNumber = prefix + numberPart;
  const conflictingRoute = allRoutes.find(route => {
    if (route.id === routeId) return false; // don't clash with the route being edited
    const matches = route.routeNumber === fullRouteNumber || route.returnRouteNumber === fullRouteNumber;
    if (!matches) return false;
    const existingDays = route.daysOfWeek || [];
    return selectedDaysOfWeek.some(day => existingDays.includes(day));
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

// Show/hide passenger vs cargo pricing based on transport type.
function updatePricingVisibility() {
  const transportType = document.getElementById('transportType')?.value;
  const passengerSection = document.getElementById('passengerPricingSection');
  const cargoSection = document.getElementById('cargoPricingSection');
  if (passengerSection) passengerSection.style.display = (transportType === 'cargo_only') ? 'none' : 'block';
  if (cargoSection) cargoSection.style.display = (transportType === 'passengers_only') ? 'none' : 'block';
}

// Derive business/first prices from economy (skips era-disabled classes).
function autoCalculateBusinessFirst() {
  const economyPrice = parseFloat(document.getElementById('economyPrice').value) || 0;
  if (economyPrice <= 0) return;
  const businessField = document.getElementById('businessPrice');
  const firstField = document.getElementById('firstPrice');
  if (businessField && !businessField.disabled) businessField.value = Math.round(economyPrice * 2.6);
  if (firstField && !firstField.disabled) firstField.value = Math.round(economyPrice * 4.6);
}

// Re-apply the selected/deselected styling to every day button.
function updateEditDayButtonStates() {
  document.querySelectorAll('.day-button').forEach(button => {
    const day = parseInt(button.getAttribute('data-day'));
    if (selectedDaysOfWeek.includes(day)) {
      button.style.background = 'var(--accent-color)';
      button.style.borderColor = 'var(--accent-color)';
      button.style.color = 'white';
    } else {
      button.style.background = 'var(--surface-elevated)';
      button.style.borderColor = 'var(--border-color)';
      button.style.color = 'var(--text-muted)';
    }
  });
}

// "7 day schedule" checkbox — select all days or clear them.
function toggleSevenDaySchedule() {
  const checkbox = document.getElementById('sevenDaySchedule');
  selectedDaysOfWeek = checkbox && checkbox.checked ? [1, 2, 3, 4, 5, 6, 0] : [];
  updateEditDayButtonStates();
}

// ─── Technical stop (ported from create, adapted to edit state) ───

function toggleTechStopSection() {
  const checkbox = document.getElementById('includeTechStop');
  const section = document.getElementById('techStopSection');
  if (!section) return;
  if (checkbox.checked) {
    section.style.display = 'block';
    // Tech-stop search needs the airport list; load it if the user hasn't opened
    // "Change Destination" (which is what normally populates availableAirports).
    if (availableAirports.length === 0) loadAvailableAirports();
  } else {
    section.style.display = 'none';
    clearTechStop();
  }
}

function searchTechStopAirports() {
  const searchTerm = document.getElementById('techStopSearch').value.trim().toLowerCase();
  const resultsContainer = document.getElementById('techStopResults');
  if (searchTerm.length < 2) { resultsContainer.style.display = 'none'; return; }

  const filtered = availableAirports.filter(a =>
    a.icaoCode?.toLowerCase().includes(searchTerm) ||
    a.iataCode?.toLowerCase().includes(searchTerm) ||
    a.name?.toLowerCase().includes(searchTerm) ||
    a.city?.toLowerCase().includes(searchTerm)
  ).slice(0, 10);

  if (filtered.length === 0) {
    resultsContainer.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.75rem;">No airports found</div>';
    resultsContainer.style.display = 'block';
    return;
  }

  resultsContainer.innerHTML = filtered.map(a => `
    <div onclick="selectTechStop('${a.id}')"
      style="padding: 0.5rem; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background 0.2s;"
      onmouseover="this.style.background='var(--surface)'" onmouseout="this.style.background='transparent'">
      <div style="font-weight: 600; font-size: 0.8rem; color: var(--text-primary); margin-bottom: 0.15rem;">${a.icaoCode} - ${a.name}</div>
      <div style="font-size: 0.7rem; color: var(--text-secondary);">${a.city}, ${a.country}</div>
    </div>`).join('');
  resultsContainer.style.display = 'block';
}

function selectTechStop(airportId) {
  const dest = getEditDestination();
  if (!baseAirport || !dest) { showWarningModal('Please select a destination first'); return; }
  const airport = availableAirports.find(a => a.id === airportId);
  if (!airport) return;

  const leg1 = Math.round(calculateDistance(baseAirport.latitude, baseAirport.longitude, airport.latitude, airport.longitude));
  const leg2 = Math.round(calculateDistance(airport.latitude, airport.longitude, dest.latitude, dest.longitude));
  selectedTechStopAirport = { ...airport, distanceFromDeparture: leg1, distanceToDestination: leg2 };
  techStopRoutingDistance = leg1 + leg2;

  document.getElementById('techStopName').textContent = `${airport.icaoCode} - ${airport.name}`;
  document.getElementById('techStopDetails').textContent = `${airport.city}, ${airport.country}`;
  document.getElementById('techStopDistanceFromDep').textContent = `${leg1} NM`;
  document.getElementById('techStopDistanceToDest').textContent = `${leg2} NM`;
  document.getElementById('techStopResults').style.display = 'none';
  document.getElementById('selectedTechStop').style.display = 'block';
  document.getElementById('techStopSearch').value = '';

  calculateFlightTiming();
  updateRoutePreview();
}

function clearTechStop() {
  selectedTechStopAirport = null;
  techStopRoutingDistance = null;
  const sel = document.getElementById('selectedTechStop');
  if (sel) sel.style.display = 'none';
  const search = document.getElementById('techStopSearch');
  if (search) search.value = '';
  const results = document.getElementById('techStopResults');
  if (results) results.style.display = 'none';
  calculateFlightTiming();
  updateRoutePreview();
}

// Warning modal (self-contained; ported from create) — used by ATC resolve flows
function showWarningModal(message, inputId = null) {
  if (inputId) {
    const input = document.getElementById(inputId);
    if (input) {
      input.style.borderColor = 'var(--warning-color)';
      input.style.boxShadow = '0 0 0 3px rgba(210, 153, 34, 0.3)';
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        input.style.borderColor = '';
        input.style.boxShadow = '';
      }, 3000);
    }
  }
  const overlay = document.createElement('div');
  overlay.id = 'warningModalOverlay';
  overlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.75); z-index: 2000; display: flex; justify-content: center; align-items: center;`;
  const modal = document.createElement('div');
  modal.style.cssText = `background: var(--surface); border: 2px solid var(--warning-color); border-radius: 8px; padding: 1.5rem; width: 90%; max-width: 400px; text-align: center;`;
  modal.innerHTML = `
    <div style="margin-bottom: 1rem;">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--warning-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <circle cx="12" cy="17" r="0.5" fill="var(--warning-color)"></circle>
      </svg>
    </div>
    <p style="color: var(--text-primary); font-size: 1rem; margin-bottom: 1.5rem; line-height: 1.5;">${message}</p>
    <button id="warningModalCloseBtn" style="padding: 0.6rem 1.5rem; background: var(--warning-color); border: none; border-radius: 4px; color: #000; font-weight: 600; cursor: pointer; font-size: 0.9rem;">OK</button>
  `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  const closeModal = () => {
    overlay.remove();
    if (inputId) {
      const input = document.getElementById(inputId);
      if (input) input.focus();
    }
  };
  document.getElementById('warningModalCloseBtn').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); }
  });
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
  const destination = getEditDestination();
  const techStop = getEditTechStop();
  if (!routePreviewMap || !baseAirport || !destination) return;

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
  const arr = [parseFloat(destination.latitude), parseFloat(destination.longitude)];

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
  }).addTo(routePreviewMap).bindPopup(`<b>${destination.iataCode || destination.icaoCode}</b><br>${destination.name}`);
  routePreviewMarkers.push(arrMarker);

  // Tech stop marker if present (yellow)
  if (techStop) {
    const tech = [parseFloat(techStop.latitude), parseFloat(techStop.longitude)];
    const techMarker = L.circleMarker(tech, {
      radius: 6,
      fillColor: '#d29922',
      fillOpacity: 1,
      color: '#fff',
      weight: 2
    }).addTo(routePreviewMap).bindPopup(`<b>${techStop.iataCode || techStop.icaoCode}</b><br>Tech Stop`);
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
    routePreviewLine = drawRoutePreviewLine(dep, arr, techStop);

    const bounds = L.latLngBounds([dep, arr]);
    if (techStop) {
      bounds.extend([parseFloat(techStop.latitude), parseFloat(techStop.longitude)]);
    }
    routePreviewMap.fitBounds(bounds, { padding: [15, 15], maxZoom: 8 });
  }
}

// ── Expanded Route Map ──────────────────────────────────────────────────────

function openExpandedRouteMap() {
  const destination = getEditDestination();
  if (!baseAirport || !destination) return;

  const modal = document.getElementById('expandedMapModal');
  modal.style.display = 'flex';

  // Set title
  const depCode = baseAirport.icaoCode || baseAirport.iataCode;
  const arrCode = destination.icaoCode || destination.iataCode;
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
  const destination = getEditDestination();
  const techStop = getEditTechStop();
  if (!expandedMap || !baseAirport || !destination) return;

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
  const arr = [parseFloat(destination.latitude), parseFloat(destination.longitude)];

  // Departure marker
  const depMarker = L.circleMarker(dep, {
    radius: 10, fillColor: '#3fb950', fillOpacity: 1, color: '#fff', weight: 2
  }).addTo(expandedMap).bindPopup(`<b>${baseAirport.iataCode || baseAirport.icaoCode}</b><br>${baseAirport.name}`);
  expandedMapLayers.push(depMarker);

  // Arrival marker
  const arrMarker = L.circleMarker(arr, {
    radius: 10, fillColor: '#58a6ff', fillOpacity: 1, color: '#fff', weight: 2
  }).addTo(expandedMap).bindPopup(`<b>${destination.iataCode || destination.icaoCode}</b><br>${destination.name}`);
  expandedMapLayers.push(arrMarker);

  // Tech stop
  if (techStop) {
    const tech = [parseFloat(techStop.latitude), parseFloat(techStop.longitude)];
    const techMarker = L.circleMarker(tech, {
      radius: 7, fillColor: '#d29922', fillOpacity: 1, color: '#fff', weight: 2
    }).addTo(expandedMap).bindPopup(`<b>${techStop.iataCode || techStop.icaoCode}</b><br>Tech Stop`);
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

// Calculate flight time using shared library with wind effects
function calculateFlightTimeForLeg(distanceNM, aircraftData, depLat, depLng, arrLat, arrLng) {
  const cruiseSpeed = aircraftData?.cruiseSpeed || 450;
  return calculateFlightMinutes(distanceNM, cruiseSpeed, depLng, arrLng, depLat, arrLat);
}

// Check aircraft range against route distance and show/hide warning (warning element optional)
function checkAircraftRange() {
  const warningEl = document.getElementById('rangeWarning');
  if (!warningEl) return true; // no warning element on this page

  const destination = getEditDestination();
  const techStop = getEditTechStop();
  const aircraftSelect = document.getElementById('assignedAircraft');
  if (!aircraftSelect.value || !destination) {
    warningEl.style.display = 'none';
    return true;
  }

  const aircraftData = aircraftDataById[aircraftSelect.value];
  if (!aircraftData || !aircraftData.rangeNm) {
    warningEl.style.display = 'none';
    return true;
  }

  const rangeNm = aircraftData.rangeNm;

  if (techStop) {
    const leg1 = Math.round(techStop.distanceFromDeparture || 0);
    const leg2 = Math.round(techStop.distanceToDestination || 0);
    const problems = [];
    if (leg1 > rangeNm) problems.push(`Leg 1 (${baseAirport.icaoCode} → ${techStop.icaoCode}): ${leg1} NM`);
    if (leg2 > rangeNm) problems.push(`Leg 2 (${techStop.icaoCode} → ${destination.icaoCode}): ${leg2} NM`);

    if (problems.length > 0) {
      warningEl.innerHTML = `<strong>Aircraft range exceeded</strong> — ${aircraftData.manufacturer} ${aircraftData.model} range is ${rangeNm.toLocaleString()} NM<br>${problems.join('<br>')}`;
      warningEl.style.display = 'block';
      return false;
    }
  } else {
    const dist = Math.round(destination.distance || 0);
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
  const destination = getEditDestination();
  const techStop = getEditTechStop();
  const timingContainer = document.getElementById('flightTimingDisplay');
  const turnaroundInput = document.getElementById('turnaroundTime');

  // Preserve turnaround details open state before rebuilding
  const existingDetails = document.getElementById('turnaroundDetails');
  const wasTurnaroundOpen = existingDetails ? existingDetails.open : false;
  const minDisplay = document.getElementById('minTurnaroundDisplay');
  const minInfo = document.getElementById('turnaroundMinInfo');
  const calcReturnEl = document.getElementById('calculatedReturnTime');

  if (!destination) {
    if (timingContainer) timingContainer.style.display = 'none';
    if (minInfo) minInfo.style.display = 'none';
    if (calcReturnEl) calcReturnEl.value = '--:--';
    return;
  }

  const scheduleTime = document.getElementById('departureTime').value;
  if (!scheduleTime) {
    if (timingContainer) timingContainer.style.display = 'none';
    if (minInfo) minInfo.style.display = 'none';
    if (calcReturnEl) calcReturnEl.value = '--:--';
    return;
  }

  // Get selected aircraft data - REQUIRED
  const aircraftSelect = document.getElementById('assignedAircraft');
  let aircraftData = null;
  if (!aircraftSelect.value) {
    if (timingContainer) timingContainer.style.display = 'none';
    if (minInfo) minInfo.style.display = 'none';
    if (calcReturnEl) calcReturnEl.value = '--:--';
    return;
  }

  aircraftData = aircraftDataById[aircraftSelect.value];
  if (!aircraftData) {
    console.error('Aircraft data not found for ID:', aircraftSelect.value);
    if (timingContainer) timingContainer.style.display = 'none';
    if (minInfo) minInfo.style.display = 'none';
    if (calcReturnEl) calcReturnEl.value = '--:--';
    return;
  }

  // Check aircraft range
  checkAircraftRange();

  // Use routing distance if tech stop is present, otherwise use direct distance
  const effectiveDistance = techStop && destination.routingDistance
    ? destination.routingDistance
    : destination.distance;

  const passengerCapacity = aircraftData.passengerCapacity || 0;
  const acType = aircraftData.type || 'Narrowbody';

  // Get airport coordinates for wind calculations
  const baseLat = parseFloat(baseAirport.latitude) || 0;
  const baseLng = parseFloat(baseAirport.longitude) || 0;
  const destLat = parseFloat(destination.latitude) || 0;
  const destLng = parseFloat(destination.longitude) || 0;

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

  // Set turnaround input minimum and snap the value to the nearest 5 minutes.
  // (minTurnaround is already a multiple of 5 via the rounded ground-op durations.)
  turnaroundInput.min = minTurnaround;
  let turnaroundMinutes = roundTo5(parseInt(turnaroundInput.value) || minTurnaround);
  if (turnaroundMinutes < minTurnaround) turnaroundMinutes = minTurnaround;
  // This render is change-driven on the edit page, so writing back is safe.
  if (parseInt(turnaroundInput.value) !== turnaroundMinutes) turnaroundInput.value = turnaroundMinutes;

  // Calculate asymmetric flight times (wind affects outbound vs return differently)
  const outboundFlightMinutes = calculateFlightTimeForLeg(effectiveDistance, aircraftData, baseLat, baseLng, destLat, destLng);
  const returnFlightMinutes = calculateFlightTimeForLeg(effectiveDistance, aircraftData, destLat, destLng, baseLat, baseLng);

  // Tech stop refueling time (20 minutes per leg)
  const refuelingTimePerLeg = techStop ? 20 : 0;

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

  const formatDuration = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  // Update return time field (this shows return off-blocks time)
  if (calcReturnEl) calcReturnEl.value = formatTime(actualOffBlocksReturn);

  // Display compact timing breakdown
  if (timingContainer) {
    const depCode = baseAirport.iataCode || baseAirport.icaoCode;
    const destCode = destination.iataCode || destination.icaoCode;
    const techCode = techStop ? (techStop.iataCode || techStop.icaoCode) : null;
    const hasTechStop = !!techStop;

    const timeBlock = (label, time, color) => `
      <div style="text-align: center;">
        <div style="font-size: 0.55rem; color: var(--text-muted); text-transform: uppercase;">${label}</div>
        <div style="font-size: 0.85rem; font-weight: 700; color: ${color};">${formatTime(time)}</div>
      </div>
    `;

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
          <span style="font-size: 0.65rem; color: var(--text-muted);">${Math.round(techStop.distanceFromDeparture)} NM + ${Math.round(techStop.distanceToDestination)} NM • 20m refuel/leg</span>
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
      if (wasTurnaroundOpen) {
        details.open = true;
        const chevron = details.querySelector('.turnaround-chevron');
        if (chevron) chevron.style.transform = 'rotate(180deg)';
      }
      details.addEventListener('toggle', () => {
        const chevron = details.querySelector('.turnaround-chevron');
        if (chevron) chevron.style.transform = details.open ? 'rotate(180deg)' : 'rotate(0)';
        setTimeout(syncMapHeight, 50);
      });
    }

    setTimeout(syncMapHeight, 100);
  }
}

// Sync map container height with flight timing panel
function syncMapHeight() {
  const timingContent = document.getElementById('flightTimingContent');
  const mapContainer = document.getElementById('routePreviewMap');
  if (timingContent && mapContainer) {
    const timingHeight = timingContent.offsetHeight;
    mapContainer.style.height = (timingHeight - 30) + 'px';
    if (routePreviewMap) routePreviewMap.invalidateSize();
  }
}

// Backward compatibility — turnaround field onchange handler
function calculateReturnTime() {
  calculateFlightTiming();
}

// ── Custom ATC Route ──────────────────────────────────────────────────────────

async function fetchAtcRoutePreview() {
  const destination = getEditDestination();
  if (!baseAirport || !destination || !destination.id) return;

  // Abort any in-flight request
  if (_atcPreviewAbort) _atcPreviewAbort.abort();
  _atcPreviewAbort = new AbortController();

  try {
    const response = await fetch('/api/routes/preview-atc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        departureAirportId: baseAirport.id,
        arrivalAirportId: destination.id
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

    updateAutoAtcInfoPanel();

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

  if (customAtcWaypoints && customAtcRouteString) {
    textEl.textContent = `ATC Route: ${customAtcRouteString}`;
    infoEl.style.display = 'block';
    avoidEl.style.display = 'none';
    return;
  }

  if (autoAtcWaypoints && autoAtcWaypoints.length > 2) {
    const innerWps = autoAtcWaypoints.filter(wp => wp.name !== 'DEP' && wp.name !== 'ARR');

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
        const next = innerWps[i + 1];
        if (!next || !next.natTrack) {
          parts.push(`${natEntry} NAT ${wp.natTrack} ${wp.name}`);
        }
      } else {
        inNat = false;
        parts.push(wp.name);
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
  if (customAtcRouteString) {
    document.getElementById('atcRouteInput').value = customAtcRouteString;
  }
}

function closeCustomAtcModal() {
  document.getElementById('customAtcModal').style.display = 'none';
}

async function resolveCustomAtcRoute() {
  const destination = getEditDestination();
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
        arrivalAirportId: destination?.id || null
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to resolve route');
    }

    const data = await response.json();

    document.getElementById('atcResolveResults').style.display = 'block';

    document.getElementById('atcResolvedCount').textContent = `${data.resolved.length} resolved`;
    document.getElementById('atcAirwayCount').textContent = `${data.airways.length} airways`;

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

    const restrictionSection = document.getElementById('atcRestrictionSection');
    if (data.restrictionWarnings && data.restrictionWarnings.length > 0) {
      restrictionSection.style.display = '';
      document.getElementById('atcRestrictionList').innerHTML = data.restrictionWarnings.map(w =>
        `<div style="margin: 0.2rem 0;">Waypoint <strong>${w.waypointName}</strong> is inside restricted FIR <strong>${w.firCode}</strong> (${w.firName || w.firCode})</div>`
      ).join('');
    } else {
      restrictionSection.style.display = 'none';
    }

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

      const applyBtn = document.getElementById('applyAtcBtn');
      applyBtn.disabled = false;
      applyBtn.style.opacity = '1';
    } else {
      wpList.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-muted);">No fixes could be resolved from this route string.</div>';
      document.getElementById('applyAtcBtn').disabled = true;
      document.getElementById('applyAtcBtn').style.opacity = '0.5';
    }

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

  const indicator = document.getElementById('customAtcIndicator');
  indicator.style.display = 'flex';
  document.getElementById('customAtcIndicatorText').textContent =
    `Custom ATC route set — ${customAtcWaypoints.length} waypoints`;

  updateRoutePreviewWithCustomWaypoints();
  updateAutoAtcInfoPanel();

  closeCustomAtcModal();
}

function clearCustomAtcRoute() {
  customAtcWaypoints = null;
  customAtcRouteString = '';
  const indicator = document.getElementById('customAtcIndicator');
  if (indicator) indicator.style.display = 'none';
  updateRoutePreview();
  updateAutoAtcInfoPanel();
}

// ── Previous Custom Route Check ───────────────────────────────────────────────

async function checkPreviousCustomRoute(departureAirportId, arrivalAirportId) {
  try {
    const response = await fetch(`/api/routes/previous-custom-route?departureAirportId=${departureAirportId}&arrivalAirportId=${arrivalAirportId}`);
    if (!response.ok) return;
    const data = await response.json();
    if (data.found && data.routeString) {
      _previousCustomRouteData = data;
      document.getElementById('previousRouteStringDisplay').textContent = data.routeString;
      document.getElementById('previousCustomRouteModal').style.display = 'flex';
    }
  } catch (err) {
    console.error('[CustomRoute] Failed to check previous custom route:', err);
  }
}

function closePreviousCustomRouteModal() {
  document.getElementById('previousCustomRouteModal').style.display = 'none';
  _previousCustomRouteData = null;
}

async function usePreviousCustomRoute() {
  if (!_previousCustomRouteData) return;
  const destination = getEditDestination();

  const routeString = _previousCustomRouteData.routeString;
  const btn = document.getElementById('usePreviousRouteBtn');
  btn.disabled = true;
  btn.textContent = 'RESOLVING...';

  try {
    const response = await fetch('/api/routes/resolve-atc-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        atcRouteString: routeString,
        departureAirportId: baseAirport?.id || null,
        arrivalAirportId: destination?.id || null
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to resolve route');
    }

    const data = await response.json();

    if (data.resolved && data.resolved.length > 0) {
      customAtcWaypoints = data.resolved;
      customAtcRouteString = routeString;

      const indicator = document.getElementById('customAtcIndicator');
      indicator.style.display = 'flex';
      document.getElementById('customAtcIndicatorText').textContent =
        `Custom ATC route set — ${customAtcWaypoints.length} waypoints`;

      updateRoutePreviewWithCustomWaypoints();
      updateAutoAtcInfoPanel();
    } else {
      showWarningModal('Could not resolve previous custom route. The route fixes may no longer be valid.');
    }
  } catch (err) {
    console.error('[CustomRoute] Failed to resolve previous route:', err);
    showWarningModal('Failed to resolve previous custom route: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'USE PREVIOUS ROUTE';
    document.getElementById('previousCustomRouteModal').style.display = 'none';
    _previousCustomRouteData = null;
  }
}

async function updateRoutePreviewWithCustomWaypoints() {
  const destination = getEditDestination();
  if (!routePreviewMap || !baseAirport || !destination || !customAtcWaypoints) return;

  routePreviewMarkers.forEach(m => routePreviewMap.removeLayer(m));
  routePreviewMarkers = [];
  if (routePreviewLine) {
    routePreviewLine.forEach(l => routePreviewMap.removeLayer(l));
  }

  await drawAvoidedFirsOnMap(routePreviewMap, routePreviewMarkers);

  const dep = [parseFloat(baseAirport.latitude), parseFloat(baseAirport.longitude)];
  const arr = [parseFloat(destination.latitude), parseFloat(destination.longitude)];

  const depMarker = L.circleMarker(dep, {
    radius: 8, fillColor: '#3fb950', fillOpacity: 1, color: '#fff', weight: 2
  }).addTo(routePreviewMap).bindPopup(`<b>${baseAirport.iataCode || baseAirport.icaoCode}</b><br>${baseAirport.name}`);
  routePreviewMarkers.push(depMarker);

  const arrMarker = L.circleMarker(arr, {
    radius: 8, fillColor: '#58a6ff', fillOpacity: 1, color: '#fff', weight: 2
  }).addTo(routePreviewMap).bindPopup(`<b>${destination.iataCode || destination.icaoCode}</b><br>${destination.name}`);
  routePreviewMarkers.push(arrMarker);

  const routeCoords = [dep];
  for (const wp of customAtcWaypoints) {
    const pt = [wp.lat, wp.lng];
    routeCoords.push(pt);

    const wpMarker = L.circleMarker(pt, {
      radius: 3, fillColor: '#e3b341', fillOpacity: 1, color: 'rgba(227, 179, 65, 0.5)', weight: 1
    }).addTo(routePreviewMap).bindPopup(`<b>${wp.name}</b><br>${wp.lat.toFixed(4)}, ${wp.lng.toFixed(4)}`);
    routePreviewMarkers.push(wpMarker);
  }
  routeCoords.push(arr);

  const line = L.polyline(routeCoords, {
    color: '#e3b341',
    weight: 2,
    opacity: 0.9,
    dashArray: null
  }).addTo(routePreviewMap);
  routePreviewLine = [line];

  const bounds = L.latLngBounds(routeCoords);
  routePreviewMap.fitBounds(bounds, { padding: [15, 15], maxZoom: 8 });
}

// Orchestrator: reveal the timing+map container, init the map, compute auto ATC,
// render the flight timing, and draw the route. Called on load and after destination change.
async function initRouteFeatures() {
  const destination = getEditDestination();
  if (!baseAirport || !destination) return;

  const container = document.getElementById('flightTimingMapContainer');
  if (container) container.style.display = 'grid';

  // Recompute timing when the aircraft or departure time changes (wire once)
  const aircraftSelect = document.getElementById('assignedAircraft');
  if (aircraftSelect && !aircraftSelect.dataset.timingWired) {
    aircraftSelect.dataset.timingWired = 'true';
    aircraftSelect.addEventListener('change', () => {
      calculateFlightTiming();
      updateRoutePreview();
    });
  }
  const departureTimeEl = document.getElementById('departureTime');
  if (departureTimeEl && !departureTimeEl.dataset.timingWired) {
    departureTimeEl.dataset.timingWired = 'true';
    departureTimeEl.addEventListener('change', calculateFlightTiming);
  }

  // Render timing immediately (aircraft is pre-selected from the route)
  calculateFlightTiming();

  // Init map, then compute the auto ATC route and draw it
  await initRoutePreviewMap();
  setTimeout(() => {
    if (routePreviewMap) routePreviewMap.invalidateSize();
    updateRoutePreview();
  }, 100);

  await fetchAtcRoutePreview();
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
  routeId = getRouteIdFromUrl();

  if (!routeId) {
    alert('No route ID specified');
    window.location.href = '/routes';
    return;
  }

  await fetchWorldInfo();
  await fetchUserFleet();
  await fetchExistingRoutes();
  await fetchRouteData();
});

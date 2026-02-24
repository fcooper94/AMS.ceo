// Build list of ICAO codes to try for aircraft images (specific first, then common base)
function getAircraftImageCodes(aircraft) {
  const codes = [];
  if (aircraft.icaoCode) codes.push(aircraft.icaoCode);

  const BASE_CODES = {
    '737': 'B737', '747': 'B747', '757': 'B757', '767': 'B767', '777': 'B777', '787': 'B787',
    '707': 'B707', '727': 'B727',
    'A300': 'A300', 'A310': 'A310', 'A318': 'A318', 'A319': 'A319', 'A320': 'A320', 'A321': 'A321',
    'A330': 'A330', 'A340': 'A340', 'A350': 'A350', 'A380': 'A380', 'A220': 'A220',
    'DC-3': 'DC3', 'DC-4': 'DC4', 'DC-6': 'DC6', 'DC-7': 'DC7',
    'DC-8': 'DC8', 'DC-9': 'DC9', 'DC-10': 'DC10',
    'MD-80': 'MD80', 'MD-81': 'MD80', 'MD-82': 'MD80', 'MD-83': 'MD83',
    'MD-87': 'MD80', 'MD-88': 'MD80', 'MD-90': 'MD90', 'MD-11': 'MD11',
    'CRJ-100': 'CRJ1', 'CRJ-200': 'CRJ2', 'CRJ-700': 'CRJ7', 'CRJ-900': 'CRJ9', 'CRJ-1000': 'CRJX',
    'ERJ 135': 'E135', 'ERJ 140': 'E140', 'ERJ 145': 'E145',
    'E-170': 'E170', 'E-175': 'E170', 'E-190': 'E190', 'E-195': 'E195', 'E195-E2': 'E190',
    '42': 'AT45', '72': 'AT76',
    'DHC-6': 'DHC6', 'DHC-7': 'DHC7', 'DHC-8': 'DH8D', 'DHC-2': 'DH2T', 'DHC-3': 'DHC3', 'DHC-515': 'CL15',
    'L-1011': 'L101', 'L-1049': 'CONI', 'L-188': 'L188',
    '240': 'CVLP', '340': 'SF34', '440': 'CVLP', '580': 'CVLT', '4-0-4': 'M404',
    'Viscount': 'VISC', 'Comet 4': 'COMT',
    'Tu-134': 'T134', 'Tu-154': 'T154', 'Tu-104': 'T104', 'Tu-204': 'T204',
    'Il-14': 'IL14', 'Il-18': 'IL18', 'Il-62': 'IL62', 'Il-76': 'IL76', 'Il-86': 'IL86', 'Il-96': 'IL96',
    'An-24': 'AN24', 'An-2': 'AN2', 'An-140': 'A140', 'An-148': 'A148', 'An-158': 'A158',
    'Yak-40': 'YK40', 'Yak-42': 'YK42',
    'F28': 'F28', 'F-27': 'F27', 'F27': 'F27', '100': 'F100', '70': 'F70', '50': 'F50', '60': 'F60',
    '2000': 'SB20',
    'Q400': 'DH8D', 'Concorde': 'CONC',
    '146': 'B463', 'One-Eleven': 'BA11',
    'RJ70': 'RJ70', 'RJ85': 'RJ85', 'RJ100': 'RJ1H',
    'Superjet 100': 'SU95', 'SSJ-100': 'SU95', 'MC-21': 'MC23',
    'PC-6': 'PC6T', 'PC-12': 'PC12', 'PC-24': 'PC24',
    '208': 'C208', '208B': 'C208', '408': 'C408', '441': 'C441',
    'BN-2': 'BN2P', 'BN-2A': 'TRIS',
    '328': 'D328', 'SC.7': 'SC7', '330': 'SH33', '360': 'SH36',
    '1900': 'B190', 'Beech 1900D': 'B190', '99': 'BE99',
    'Jetstream': 'JS31', 'ATP': 'ATP',
    // 1940s–1950s Golden Age additions
    'L-749': 'L749', '377': 'B377', 'C-46': 'C46', '2-0-2': 'M202',
    'Il-12': 'IL12', 'Hermes': 'HPH4', 'Sandringham': 'SDRM',
    'York': 'AVYO', 'DC-6B': 'DC6',
  };

  const baseCode = BASE_CODES[aircraft.model];
  if (baseCode && !codes.includes(baseCode)) codes.push(baseCode);

  // For freighter/cargo variants, also try the passenger version
  if (aircraft.type === 'Cargo' || (aircraft.variant && /\bF\b|Freighter|Cargo/i.test(aircraft.variant))) {
    const FREIGHT_TO_PAX = {
      'B77L': 'B777', 'B748': 'B747', 'A332': 'A330', 'B763': 'B767', 'MD11': 'MD11',
      'B77F': 'B777', 'B74F': 'B747', 'A33F': 'A330', 'B76F': 'B767',
    };
    if (aircraft.icaoCode && FREIGHT_TO_PAX[aircraft.icaoCode]) {
      const paxCode = FREIGHT_TO_PAX[aircraft.icaoCode];
      if (!codes.includes(paxCode)) codes.push(paxCode);
    }
  }

  return codes;
}

let fleetData = [];
let filteredFleet = [];

// Load fleet data
async function loadFleet() {
  try {
    const response = await fetch('/api/fleet');
    const fleet = await response.json();

    if (!response.ok) {
      throw new Error(fleet.error || 'Failed to load fleet');
    }

    fleetData = fleet;
    window._fleetData = fleet;
    filteredFleet = fleet;
    populateTypeFilter();
    updateAircraftCount();
    displayFleet();
  } catch (error) {
    console.error('Error loading fleet:', error);
    document.getElementById('fleetGrid').innerHTML = `
      <div class="empty-message" style="color: var(--warning-color);">Error loading fleet data</div>
    `;
  }
}

// Populate type filter dropdown
function populateTypeFilter() {
  const typeFilter = document.getElementById('typeFilter');
  const types = new Set();

  fleetData.forEach(userAircraft => {
    const aircraft = userAircraft.aircraft;
    if (aircraft) {
      const typeName = `${aircraft.manufacturer} ${aircraft.model}${aircraft.variant ? (aircraft.variant.startsWith('-') ? aircraft.variant : '-' + aircraft.variant) : ''}`;
      types.add(typeName);
    }
  });

  const sortedTypes = Array.from(types).sort();
  typeFilter.innerHTML = '<option value="">All Types</option>' +
    sortedTypes.map(type => `<option value="${type}">${type}</option>`).join('');
}

// Filter fleet based on current filter values
function filterFleet() {
  const searchTerm = document.getElementById('searchFilter').value.toLowerCase();
  const typeFilter = document.getElementById('typeFilter').value;
  const statusFilter = document.getElementById('statusFilter').value;

  filteredFleet = fleetData.filter(userAircraft => {
    const aircraft = userAircraft.aircraft;
    if (!aircraft) return false;

    // Search filter (registration)
    if (searchTerm && !userAircraft.registration?.toLowerCase().includes(searchTerm)) {
      return false;
    }

    // Type filter
    if (typeFilter) {
      const typeName = `${aircraft.manufacturer} ${aircraft.model}${aircraft.variant ? (aircraft.variant.startsWith('-') ? aircraft.variant : '-' + aircraft.variant) : ''}`;
      if (typeName !== typeFilter) return false;
    }

    // Status filter
    if (statusFilter) {
      const isOwned = userAircraft.acquisitionType === 'purchase';
      if (statusFilter === 'owned' && !isOwned) return false;
      if (statusFilter === 'leased' && isOwned) return false;
      if (statusFilter === 'listed' && !['listed_sale', 'listed_lease'].includes(userAircraft.status)) return false;
      if (statusFilter === 'leased_out' && userAircraft.status !== 'leased_out') return false;
      if (statusFilter === 'storage' && !['storage', 'recalling'].includes(userAircraft.status)) return false;
      if (statusFilter === 'on_order' && userAircraft.status !== 'on_order') return false;
    }

    return true;
  });

  updateAircraftCount();
  displayFleet();
}

// Update aircraft count display
function updateAircraftCount() {
  document.getElementById('aircraftCount').textContent = filteredFleet.length;
}

// Get condition class based on percentage
function getConditionClass(conditionPercent) {
  if (conditionPercent >= 90) return 'cond-excellent';
  if (conditionPercent >= 70) return 'cond-good';
  if (conditionPercent >= 50) return 'cond-fair';
  return 'cond-poor';
}

// Display fleet
function displayFleet() {
  const grid = document.getElementById('fleetGrid');

  if (filteredFleet.length === 0) {
    grid.innerHTML = `
      <div class="table-empty" style="padding: 3rem; text-align: center;">
        <div class="empty-message" style="color: var(--text-muted);">NO AIRCRAFT FOUND</div>
        ${fleetData.length === 0 ? `
          <div style="margin-top: 1rem;">
            <button class="btn btn-primary" onclick="window.location.href='/aircraft-marketplace'">ADD AIRCRAFT</button>
          </div>
        ` : ''}
      </div>
    `;
    return;
  }

  // Group aircraft by type (manufacturer + model + variant)
  const groupedAircraft = {};
  filteredFleet.forEach(userAircraft => {
    const aircraft = userAircraft.aircraft;
    if (!aircraft) return;

    const typeKey = `${aircraft.manufacturer} ${aircraft.model}${aircraft.variant ? (aircraft.variant.startsWith('-') ? aircraft.variant : '-' + aircraft.variant) : ''}`;
    if (!groupedAircraft[typeKey]) {
      groupedAircraft[typeKey] = [];
    }
    groupedAircraft[typeKey].push(userAircraft);
  });

  // Generate HTML - wrap in 2-column grid
  let html = '<div class="fleet-grid-wrapper">';
  const sortedTypes = Object.keys(groupedAircraft).sort();

  sortedTypes.forEach((typeKey) => {
    const aircraftList = groupedAircraft[typeKey];
    const count = aircraftList.length;

    // Start type group container
    html += `<div class="fleet-type-group">`;

    // Type header
    html += `
      <div class="fleet-type-header">
        <h3>${typeKey} <span>(${count})</span></h3>
      </div>
    `;

    // Column headers
    html += `
      <div class="fleet-header">
        <span>REG</span>
        <span>PROFIT</span>
        <span>ACQN</span>
        <span>COND</span>
        <span>LOC</span>
        <span></span>
      </div>
    `;

    // Aircraft rows
    aircraftList.forEach(userAircraft => {
      const isOwned = userAircraft.acquisitionType === 'purchase';
      const conditionPercent = userAircraft.conditionPercentage || 100;
      const profit = userAircraft.profit || 0;
      const profitDisplay = profit !== 0 ? (profit > 0 ? '+' : '') + '$' + formatCurrency(Math.abs(profit)) : '$0';
      const profitColor = profit >= 0 ? 'var(--success-color)' : 'var(--warning-color)';

      // Status-aware badge
      let badgeText, badgeClass;
      if (userAircraft.status === 'recalling') { badgeText = 'Ferry'; badgeClass = 'status-recalling'; }
      else if (userAircraft.status === 'storage') { badgeText = 'Stored'; badgeClass = 'status-storage'; }
      else if (userAircraft.status === 'listed_sale') { badgeText = 'Sale'; badgeClass = 'status-listed-sale'; }
      else if (userAircraft.status === 'listed_lease') { badgeText = 'List'; badgeClass = 'status-listed-lease'; }
      else if (userAircraft.status === 'leased_out') { badgeText = 'L-Out'; badgeClass = 'status-leased-out'; }
      else if (userAircraft.status === 'maintenance') { badgeText = 'Maint'; badgeClass = 'status-maintenance'; }
      else if (userAircraft.status === 'cabin_refit') { badgeText = 'Refit'; badgeClass = 'status-maintenance'; }
      else if (userAircraft.status === 'on_order') { badgeText = 'Order'; badgeClass = 'status-on-order'; }
      else { badgeText = isOwned ? 'Own' : 'Lse'; badgeClass = isOwned ? 'status-owned' : 'status-leased'; }

      html += `
        <div class="fleet-row" onclick="showAircraftDetails('${userAircraft.id}')">
          <div class="fleet-cell fleet-reg">${userAircraft.registration || 'N/A'}</div>
          <div class="fleet-cell" style="color: ${profitColor}; font-weight: 600;">${profitDisplay}</div>
          <div class="fleet-cell">
            <span class="status-badge ${badgeClass}">${badgeText}</span>
          </div>
          <div class="fleet-cell">
            <span class="status-badge ${getConditionClass(conditionPercent)}">${conditionPercent}%</span>
          </div>
          <div class="fleet-cell" style="color: var(--text-primary);">${userAircraft.currentAirport || 'N/A'}</div>
          <div class="fleet-cell">
            <button class="btn btn-primary" style="padding: 0.2rem 0.4rem; font-size: 0.65rem;" onclick="event.stopPropagation(); showAircraftDetails('${userAircraft.id}')">VIEW</button>
          </div>
        </div>
      `;
    });

    // Close type group container
    html += `</div>`;
  });

  html += '</div>';
  grid.innerHTML = html;
}

// Show aircraft details
async function showAircraftDetails(userAircraftId) {
  const userAircraft = fleetData.find(a => a.id === userAircraftId);
  if (!userAircraft || !userAircraft.aircraft) return;

  const ac = userAircraft.aircraft;
  const ua = userAircraft;
  const isLeased = ua.acquisitionType === 'lease';
  const cond = ua.conditionPercentage || 100;

  // Calculate costs
  const burnRate = parseFloat(ua.fuelBurnPerHour) || 0;
  const maintHr = parseFloat(ua.maintenanceCostPerHour) || 0;
  const fuelHr = burnRate * 0.75;
  const totalHr = fuelHr + maintHr;
  const leaseWk = parseFloat(ua.leaseWeeklyPayment) || 0;
  const weeklyOps = totalHr * 8 * 7 + (isLeased ? leaseWk : 0);

  const condClr = cond >= 80 ? 'var(--success-color)' : cond >= 50 ? 'var(--warning-color)' : 'var(--danger-color)';
  const acCodes = getAircraftImageCodes(ac);
  const imgBase = '/api/aircraft/image/';
  const acName = `${ac.manufacturer} ${ac.model}${ac.variant ? (ac.model.endsWith('-') || ac.variant.startsWith('-') ? ac.variant : '-' + ac.variant) : ''}`;

  // Cabin config
  const hasSeats = ua.economySeats || ua.economyPlusSeats || ua.businessSeats || ua.firstSeats;
  const hasCargo = (ua.cargoConfig && Object.values(ua.cargoConfig).some(v => v > 0))
    || ua.cargoLightKg || ua.cargoStandardKg || ua.cargoHeavyKg;

  // Ownership line
  let ownershipHtml = '';
  if (ua.status === 'listed_sale') {
    ownershipHtml = `<span style="color:var(--warning-color)">For Sale</span> &mdash; $${formatCurrency(ua.listingPrice||0)}`;
  } else if (ua.status === 'listed_lease') {
    ownershipHtml = `<span style="color:#a855f7">For Lease</span> &mdash; $${formatCurrency(ua.listingPrice||0)}/wk`;
  } else if (ua.status === 'leased_out') {
    ownershipHtml = `<span style="color:#14b8a6">Leased Out</span> to ${ua.leaseOutTenantName||'NPC'} &mdash; $${formatCurrency(ua.leaseOutWeeklyRate||0)}/wk`;
  } else if (ua.status === 'recalling') {
    const toStorage = ua.currentAirport && ua.storageAirportCode && ua.currentAirport === ua.storageAirportCode;
    ownershipHtml = `<span style="color:#60a5fa">${toStorage ? 'Ferrying to '+ua.storageAirportCode : 'Recalling from '+(ua.storageAirportCode||'Storage')}</span>`;
  } else if (ua.status === 'on_order') {
    ownershipHtml = `<span style="color:#eab308">On Order</span> &mdash; delivery ${ua.expectedDeliveryDate ? new Date(ua.expectedDeliveryDate).toLocaleDateString('en-GB') : 'TBD'}`;
  } else if (ua.status === 'storage') {
    ownershipHtml = `<span style="color:#94a3b8">Stored</span> at ${ua.storageAirportCode||'N/A'} &mdash; $${formatCurrency(calculateStorageWeeklyCost(ua))}/wk`;
  } else if (isLeased) {
    ownershipHtml = `<span style="color:var(--accent-color)">Leased</span> ${ua.leaseDurationMonths}mo @ $${formatCurrency(leaseWk)}/wk &mdash; ends ${new Date(ua.leaseEndDate).toLocaleDateString('en-GB')}`;
  } else {
    ownershipHtml = `<span style="color:var(--success-color)">Owned</span> &mdash; purchased $${formatCurrency(ua.purchasePrice||0)} on ${new Date(ua.acquiredAt).toLocaleDateString('en-GB')}`;
  }

  const overlay = document.createElement('div');
  overlay.id = 'aircraftDetailOverlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:2000;display:flex;justify-content:center;align-items:center;padding:1rem;';

  overlay.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border-color);border-radius:8px;width:100%;max-width:950px;max-height:95vh;overflow-y:auto;display:flex;flex-direction:column;">

      <!-- Header Bar -->
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 1rem;border-bottom:1px solid var(--border-color);flex-shrink:0;">
        <div style="font-size:1.1rem;font-weight:700;color:var(--text-primary);">${acName}</div>
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <span style="font-size:0.65rem;font-weight:600;padding:0.15rem 0.5rem;border-radius:3px;${isLeased ? 'background:rgba(139,92,246,0.2);color:#a78bfa;' : 'background:rgba(16,185,129,0.2);color:#34d399;'}">${isLeased ? 'LEASED' : ua.status === 'storage' ? 'STORED' : ua.status === 'on_order' ? 'ON ORDER' : 'OWNED'}</span>
          <div style="font-size:1.2rem;font-weight:700;color:var(--accent-color);font-family:monospace;">${ua.registration}</div>
          <button onclick="document.getElementById('aircraftDetailOverlay').remove()" style="background:none;border:none;color:var(--text-muted);font-size:1.4rem;cursor:pointer;padding:0.2rem 0.4rem;line-height:1;" onmouseover="this.style.color='var(--text-primary)'" onmouseout="this.style.color='var(--text-muted)'">&times;</button>
        </div>
      </div>

      <!-- Top Section: Image Left + Details Right -->
      <div style="display:flex;gap:1rem;padding:0.75rem 1rem;">

        <!-- Left: Image + Ownership -->
        <div style="width:300px;flex-shrink:0;display:flex;flex-direction:column;gap:0.4rem;">
          <div style="width:300px;flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid var(--border-color);border-radius:6px;background:var(--surface-elevated);min-height:180px;">
            ${acCodes.length > 0 ? `<img src="${imgBase}${acCodes[0]}" alt="${acName}" style="max-width:100%;max-height:100%;object-fit:contain;filter:invert(1);mix-blend-mode:screen;"
              data-fallbacks='${JSON.stringify(acCodes.slice(1))}' data-base-url="${imgBase}"
              onerror="var fb=JSON.parse(this.dataset.fallbacks);if(fb.length>0){this.dataset.fallbacks=JSON.stringify(fb.slice(1));this.src=this.dataset.baseUrl+fb[0];}else{this.parentElement.innerHTML='<div style=\\'color:var(--text-muted);font-size:0.75rem;\\'>No image</div>';}">` : `<span style="color:var(--text-muted);font-size:0.75rem;">No image</span>`}
          </div>
          <div style="font-size:0.75rem;color:var(--text-secondary);padding:0.1rem 0;">${ownershipHtml}</div>
        </div>

        <!-- Right: Badges + Specs + Condition + Quick Info -->
        <div style="flex:1;display:flex;flex-direction:column;gap:0.4rem;">

          <!-- Type Badges -->
          <div style="display:flex;gap:0.3rem;flex-wrap:wrap;">
            <span style="background:rgba(59,130,246,0.15);color:var(--accent-color);padding:0.15rem 0.5rem;border-radius:3px;font-size:0.65rem;font-weight:600;">${ac.type}</span>
            <span style="background:rgba(16,185,129,0.15);color:#10b981;padding:0.15rem 0.5rem;border-radius:3px;font-size:0.65rem;font-weight:600;">${ac.rangeCategory}</span>
            ${ac.icaoCode ? `<span style="background:rgba(139,92,246,0.15);color:#8b5cf6;padding:0.15rem 0.5rem;border-radius:3px;font-size:0.65rem;font-weight:600;font-family:monospace;">${ac.icaoCode}</span>` : ''}
          </div>

          <!-- Specifications Grid (3x2) -->
          <div style="background:var(--surface-elevated);border:1px solid var(--border-color);border-radius:6px;padding:0.4rem;">
            <h4 style="margin:0 0 0.3rem 0;color:var(--text-muted);font-size:0.55rem;text-transform:uppercase;letter-spacing:0.5px;">Specifications</h4>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.25rem;">
              <div style="padding:0.25rem;background:var(--surface);border-radius:3px;">
                <div style="color:var(--text-muted);font-size:0.5rem;text-transform:uppercase;">Pax</div>
                <div style="color:var(--text-primary);font-weight:700;font-size:0.85rem;">${ac.passengerCapacity || 'N/A'}</div>
              </div>
              <div style="padding:0.25rem;background:var(--surface);border-radius:3px;">
                <div style="color:var(--text-muted);font-size:0.5rem;text-transform:uppercase;">Range</div>
                <div style="color:var(--text-primary);font-weight:700;font-size:0.85rem;">${formatCurrency(ac.rangeNm)}<span style="font-size:0.5rem;font-weight:400;">nm</span></div>
              </div>
              <div style="padding:0.25rem;background:var(--surface);border-radius:3px;">
                <div style="color:var(--text-muted);font-size:0.5rem;text-transform:uppercase;">Speed</div>
                <div style="color:var(--text-primary);font-weight:700;font-size:0.85rem;">${ac.cruiseSpeed || 'N/A'}<span style="font-size:0.5rem;font-weight:400;">kts</span></div>
              </div>
              <div style="padding:0.25rem;background:var(--surface);border-radius:3px;">
                <div style="color:var(--text-muted);font-size:0.5rem;text-transform:uppercase;">Fuel</div>
                <div style="color:var(--text-primary);font-weight:700;font-size:0.85rem;">${formatCurrency(burnRate)}<span style="font-size:0.5rem;font-weight:400;">L/h</span></div>
              </div>
              <div style="padding:0.25rem;background:var(--surface);border-radius:3px;">
                <div style="color:var(--text-muted);font-size:0.5rem;text-transform:uppercase;">Cargo</div>
                <div style="color:var(--text-primary);font-weight:700;font-size:0.85rem;">${ac.cargoCapacityKg ? (ac.cargoCapacityKg / 1000).toFixed(1) : '0'}<span style="font-size:0.5rem;font-weight:400;">t</span></div>
              </div>
              <div style="padding:0.25rem;background:var(--surface);border-radius:3px;">
                <div style="color:var(--text-muted);font-size:0.5rem;text-transform:uppercase;">Maint</div>
                <div style="color:var(--text-primary);font-weight:700;font-size:0.85rem;">$${formatCurrencyShort(Math.round(maintHr * 56))}<span style="font-size:0.5rem;font-weight:400;">/wk</span></div>
              </div>
            </div>
          </div>

          <!-- Condition Row (4 columns) -->
          <div style="background:var(--surface-elevated);border:1px solid var(--border-color);border-radius:6px;padding:0.4rem;">
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:0.25rem;">
              <div style="text-align:center;padding:0.25rem;background:var(--surface);border-radius:3px;">
                <div style="color:var(--text-muted);font-size:0.5rem;text-transform:uppercase;">Age</div>
                <div style="color:var(--text-primary);font-weight:700;font-size:0.85rem;">${ua.ageYears || 0}<span style="font-size:0.55rem;font-weight:400;">y</span></div>
              </div>
              <div style="text-align:center;padding:0.25rem;background:var(--surface);border-radius:3px;">
                <div style="color:var(--text-muted);font-size:0.5rem;text-transform:uppercase;">Cond</div>
                <div style="color:${condClr};font-weight:700;font-size:0.85rem;">${cond}%</div>
              </div>
              <div id="cCheckCell" style="text-align:center;padding:0.25rem;background:var(--surface);border-radius:3px;">
                <div style="color:var(--text-muted);font-size:0.5rem;text-transform:uppercase;">C Check</div>
                <div id="cCheckValue" style="color:var(--text-muted);font-weight:600;font-size:0.75rem;">...</div>
              </div>
              <div id="dCheckCell" style="text-align:center;padding:0.25rem;background:var(--surface);border-radius:3px;">
                <div style="color:var(--text-muted);font-size:0.5rem;text-transform:uppercase;">D Check</div>
                <div id="dCheckValue" style="color:var(--text-muted);font-weight:600;font-size:0.75rem;">...</div>
              </div>
            </div>
          </div>

          <!-- Quick Info: Location, Flight Hours, Routes -->
          <div style="display:flex;gap:0.4rem;font-size:0.7rem;">
            <div style="flex:1;padding:0.3rem 0.5rem;background:var(--surface-elevated);border:1px solid var(--border-color);border-radius:4px;">
              <span style="color:var(--text-muted);">Location:</span> <strong style="color:var(--accent-color);">${ua.currentAirport || 'N/A'}</strong>
            </div>
            <div style="flex:1;padding:0.3rem 0.5rem;background:var(--surface-elevated);border:1px solid var(--border-color);border-radius:4px;">
              <span style="color:var(--text-muted);">Flight Hrs:</span> <strong>${formatCurrency(parseFloat(ua.totalFlightHours) || 0)}</strong>
            </div>
            <div style="flex:1;padding:0.3rem 0.5rem;background:var(--surface-elevated);border:1px solid var(--border-color);border-radius:4px;">
              <span style="color:var(--text-muted);">Routes:</span> <strong id="routeCount">...</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Configuration Section -->
      <div style="padding:0 1rem 0.6rem;">
        <div style="font-size:0.6rem;font-weight:700;color:var(--text-muted);letter-spacing:0.05em;margin-bottom:0.3rem;text-transform:uppercase;">Configuration</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;">

          <!-- Cabin Column -->
          <div style="background:var(--surface-elevated);border:1px solid var(--border-color);border-radius:6px;padding:0.5rem 0.6rem;display:flex;flex-direction:column;">
            <div style="color:#a78bfa;font-size:0.6rem;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:0.4rem;">Cabin</div>
            ${hasSeats ? `
            <div style="flex:1;">
              ${[
                { seats: ua.economySeats, label: 'Economy', color: '#60a5fa' },
                { seats: ua.economyPlusSeats, label: 'Economy+', color: '#34d399' },
                { seats: ua.businessSeats, label: 'Business', color: '#fbbf24' },
                { seats: ua.firstSeats, label: 'First', color: '#a78bfa' }
              ].filter(c => c.seats).map(c => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:0.25rem 0;border-bottom:1px solid rgba(255,255,255,0.04);">
                <div style="display:flex;align-items:center;gap:0.4rem;">
                  <span style="width:3px;height:14px;border-radius:2px;background:${c.color};flex-shrink:0;"></span>
                  <span style="font-size:0.7rem;color:${c.color};">${c.label}</span>
                </div>
                <span style="font-weight:700;font-size:0.8rem;">${c.seats}</span>
              </div>`).join('')}
            </div>
            ` : `<div style="color:var(--text-muted);font-size:0.75rem;flex:1;display:flex;align-items:center;">Default layout &mdash; ${ac.passengerCapacity} pax</div>`}
            ${ua.status === 'active' && ac.type !== 'Cargo' && ac.passengerCapacity > 0 ? `
            <button onclick="reconfigureCabin('${ua.id}')" style="width:100%;margin-top:0.4rem;padding:0.3rem 0.5rem;background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);border-radius:4px;color:#a78bfa;font-size:0.6rem;font-weight:600;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.borderColor='#a78bfa';this.style.background='rgba(139,92,246,0.18)'" onmouseout="this.style.borderColor='rgba(139,92,246,0.3)';this.style.background='rgba(139,92,246,0.1)'">Reconfigure Cabin</button>
            ` : ''}
          </div>

          <!-- Cargo Column -->
          <div style="background:var(--surface-elevated);border:1px solid var(--border-color);border-radius:6px;padding:0.5rem 0.6rem;display:flex;flex-direction:column;">
            <div style="color:#60a5fa;font-size:0.6rem;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:0.4rem;">Cargo</div>
            ${hasCargo ? (() => {
              const _cargoConfig = ua.cargoConfig || (ua.cargoLightKg || ua.cargoStandardKg || ua.cargoHeavyKg ? {
                general: ua.cargoLightKg || 0, express: ua.cargoStandardKg || 0, heavy: ua.cargoHeavyKg || 0,
                oversized: 0, perishable: 0, dangerous: 0, liveAnimal: 0, highValue: 0
              } : null);
              const _hasDualDeck = ua.mainDeckCargoConfig || ua.mainDeckLightKg != null;
              const _renderCargoRows = (cfg) => {
                if (!cfg) return '';
                return CARGO_TYPE_KEYS.filter(k => (cfg[k] || 0) > 0).map(k => {
                  const ct = CARGO_TYPES[k];
                  const val = cfg[k];
                  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:0.25rem 0;border-bottom:1px solid rgba(255,255,255,0.04);">
                    <div style="display:flex;align-items:center;gap:0.4rem;">
                      <span style="width:6px;height:6px;border-radius:50%;background:${ct.color};flex-shrink:0;"></span>
                      <span style="font-size:0.7rem;color:${ct.color};">${ct.label}</span>
                    </div>
                    <span style="font-weight:700;font-size:0.8rem;">${(val / 1000).toFixed(1)}t</span>
                  </div>`;
                }).join('');
              };
              if (_hasDualDeck) {
                const mdConfig = ua.mainDeckCargoConfig || (ua.mainDeckLightKg != null ? {
                  general: ua.mainDeckLightKg || 0, express: ua.mainDeckStandardKg || 0, heavy: ua.mainDeckHeavyKg || 0,
                  oversized: 0, perishable: 0, dangerous: 0, liveAnimal: 0, highValue: 0
                } : null);
                const chConfig = ua.cargoHoldCargoConfig || (ua.cargoHoldLightKg != null ? {
                  general: ua.cargoHoldLightKg || 0, express: ua.cargoHoldStandardKg || 0, heavy: ua.cargoHoldHeavyKg || 0,
                  oversized: 0, perishable: 0, dangerous: 0, liveAnimal: 0, highValue: 0
                } : null);
                return `<div style="flex:1;">
                <div style="font-size:0.5rem;color:rgba(139,92,246,0.8);text-transform:uppercase;font-weight:600;margin-bottom:0.15rem;">Main Deck</div>
                ${_renderCargoRows(mdConfig)}
                <div style="font-size:0.5rem;color:rgba(59,130,246,0.8);text-transform:uppercase;font-weight:600;margin:0.3rem 0 0.15rem;padding-top:0.3rem;border-top:1px solid var(--border-color);">Cargo Hold</div>
                ${_renderCargoRows(chConfig)}
                </div>`;
              } else {
                return `<div style="flex:1;">${_renderCargoRows(_cargoConfig)}</div>`;
              }
            })() : `<div style="color:var(--text-muted);font-size:0.75rem;flex:1;display:flex;align-items:center;">No cargo configured</div>`}
            ${ua.status === 'active' && ac.cargoCapacityKg > 0 ? `
            <button onclick="reconfigureCargo('${ua.id}')" style="width:100%;margin-top:0.4rem;padding:0.3rem 0.5rem;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);border-radius:4px;color:#60a5fa;font-size:0.6rem;font-weight:600;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.borderColor='#60a5fa';this.style.background='rgba(59,130,246,0.18)'" onmouseout="this.style.borderColor='rgba(59,130,246,0.3)';this.style.background='rgba(59,130,246,0.1)'">Reconfigure Cargo</button>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Costs + Performance Section -->
      <div style="padding:0 1rem 0.6rem;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;">

          <!-- Operating Costs -->
          <div style="background:var(--surface-elevated);border:1px solid var(--border-color);border-radius:6px;padding:0.5rem 0.6rem;">
            <div style="color:var(--warning-color);font-size:0.6rem;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:0.4rem;">Operating Costs</div>
            <div style="font-size:0.8rem;">
              <div style="display:flex;justify-content:space-between;padding:0.2rem 0;border-bottom:1px solid var(--border-color);"><span style="color:var(--text-muted);">Fuel / wk</span><span style="font-weight:600;">$${formatCurrency(Math.round(fuelHr * 56))}</span></div>
              <div style="display:flex;justify-content:space-between;padding:0.2rem 0;border-bottom:1px solid var(--border-color);"><span style="color:var(--text-muted);">Maintenance / wk</span><span style="font-weight:600;">$${formatCurrency(Math.round(maintHr * 56))}</span></div>
              ${isLeased ? `<div style="display:flex;justify-content:space-between;padding:0.2rem 0;border-bottom:1px solid var(--border-color);"><span style="color:var(--text-muted);">Lease / wk</span><span style="font-weight:600;">$${formatCurrency(leaseWk)}</span></div>` : ''}
              <div style="display:flex;justify-content:space-between;padding:0.2rem 0;"><span style="color:var(--text-muted);">Total / wk</span><span style="font-weight:600;color:var(--danger-color);">$${formatCurrency(weeklyOps)}</span></div>
            </div>
          </div>

          <!-- Route Performance + Heavy Checks -->
          <div style="background:var(--surface-elevated);border:1px solid var(--border-color);border-radius:6px;padding:0.5rem 0.6rem;">
            <div style="margin-bottom:0.5rem;">
              <div style="color:var(--success-color);font-size:0.6rem;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:0.3rem;">Route Performance</div>
              <div id="routeInfo" style="color:var(--text-muted);font-size:0.8rem;">Loading...</div>
            </div>
            <div style="border-top:1px solid var(--border-color);padding-top:0.4rem;">
              <div style="color:var(--accent-color);font-size:0.6rem;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:0.3rem;">Heavy Checks</div>
              <div id="maintInfo" style="color:var(--text-muted);font-size:0.8rem;">Loading...</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="padding:0.6rem 1rem;border-top:1px solid var(--border-color);display:flex;gap:0.5rem;flex-shrink:0;">
        ${buildActionButtons(userAircraft)}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Fetch additional details
  try {
    const response = await fetch(`/api/fleet/${userAircraftId}/details`);
    const details = await response.json();

    document.getElementById('routeCount').textContent = details.activeRouteCount || 0;

    const routeInfoEl = document.getElementById('routeInfo');
    if (details.mostProfitable || details.leastProfitable) {
      let rh = '';
      if (details.mostProfitable) {
        const mp = details.mostProfitable;
        rh += `<div style="display:flex;justify-content:space-between;padding:0.15rem 0;"><span style="color:var(--success-color);font-weight:600;">${mp.origin}-${mp.destination}</span><span style="color:var(--success-color);">$${formatCurrency(mp.profit)}</span></div>`;
      }
      if (details.leastProfitable && details.leastProfitable.id !== details.mostProfitable?.id) {
        const lp = details.leastProfitable;
        const c = lp.profit >= 0 ? 'var(--warning-color)' : 'var(--danger-color)';
        rh += `<div style="display:flex;justify-content:space-between;padding:0.15rem 0;border-top:1px solid var(--border-color);margin-top:0.15rem;padding-top:0.2rem;"><span style="color:${c};font-weight:600;">${lp.origin}-${lp.destination}</span><span style="color:${c};">$${formatCurrency(lp.profit)}</span></div>`;
      }
      routeInfoEl.innerHTML = rh || '<span>No route data</span>';
    } else {
      routeInfoEl.innerHTML = '<span>No routes assigned</span>';
    }

    const maintInfoEl = document.getElementById('maintInfo');
    const maint = details.maintenance;
    const isStored = ['storage', 'recalling'].includes(ua.status);
    let mh = '';
    if (isStored) mh += `<div style="font-size:0.7rem;color:#94a3b8;margin-bottom:0.2rem;">Frozen in storage</div>`;
    if (maint.nextCCheck) {
      const cd = new Date(maint.nextCCheck);
      const du = Math.ceil((cd - new Date()) / 86400000);
      const cc = isStored ? '#94a3b8' : du < 30 ? 'var(--danger-color)' : du < 90 ? 'var(--warning-color)' : 'var(--text-primary)';
      const cCost = maint.cCheckCost ? `<span style="color:var(--text-muted);font-size:0.7rem;margin-left:0.4rem;">$${formatCurrency(maint.cCheckCost)}</span>` : '';
      mh += `<div style="display:flex;justify-content:space-between;align-items:baseline;padding:0.15rem 0;"><span style="color:var(--text-muted);">C-Check</span><span><span style="color:${cc};font-weight:600;">${cd.toLocaleDateString('en-GB')}</span>${cCost}</span></div>`;
    } else {
      const cCost = maint.cCheckCost ? `<span style="color:var(--text-muted);font-size:0.7rem;margin-left:0.4rem;">$${formatCurrency(maint.cCheckCost)}</span>` : '';
      mh += `<div style="display:flex;justify-content:space-between;align-items:baseline;padding:0.15rem 0;"><span style="color:var(--text-muted);">C-Check</span><span>N/A${cCost}</span></div>`;
    }
    if (maint.nextDCheck) {
      const dd = new Date(maint.nextDCheck);
      const du = Math.ceil((dd - new Date()) / 86400000);
      const dc = isStored ? '#94a3b8' : du < 90 ? 'var(--danger-color)' : du < 180 ? 'var(--warning-color)' : 'var(--text-primary)';
      const dCost = maint.dCheckCost ? `<span style="color:var(--text-muted);font-size:0.7rem;margin-left:0.4rem;">$${formatCurrency(maint.dCheckCost)}</span>` : '';
      mh += `<div style="display:flex;justify-content:space-between;align-items:baseline;padding:0.15rem 0;border-top:1px solid var(--border-color);margin-top:0.1rem;padding-top:0.15rem;"><span style="color:var(--text-muted);">D-Check</span><span><span style="color:${dc};font-weight:600;">${dd.toLocaleDateString('en-GB')}</span>${dCost}</span></div>`;
    } else {
      const dCost = maint.dCheckCost ? `<span style="color:var(--text-muted);font-size:0.7rem;margin-left:0.4rem;">$${formatCurrency(maint.dCheckCost)}</span>` : '';
      mh += `<div style="display:flex;justify-content:space-between;align-items:baseline;padding:0.15rem 0;border-top:1px solid var(--border-color);margin-top:0.1rem;padding-top:0.15rem;"><span style="color:var(--text-muted);">D-Check</span><span>N/A${dCost}</span></div>`;
    }
    maintInfoEl.innerHTML = mh;

    // Populate C/D check cells in condition row
    const cCheckEl = document.getElementById('cCheckValue');
    const dCheckEl = document.getElementById('dCheckValue');
    if (cCheckEl) {
      if (maint.nextCCheck) {
        const cd = new Date(maint.nextCCheck);
        const du = Math.ceil((cd - new Date()) / 86400000);
        const cc = isStored ? '#94a3b8' : du < 30 ? 'var(--danger-color)' : du < 90 ? 'var(--warning-color)' : 'var(--text-primary)';
        cCheckEl.textContent = cd.toLocaleDateString('en-GB');
        cCheckEl.style.color = cc;
        if (!isStored && du < 30) {
          const cell = document.getElementById('cCheckCell');
          if (cell) cell.style.background = 'rgba(239,68,68,0.08)';
        }
      } else {
        cCheckEl.textContent = 'N/A';
      }
    }
    if (dCheckEl) {
      if (maint.nextDCheck) {
        const dd = new Date(maint.nextDCheck);
        const du = Math.ceil((dd - new Date()) / 86400000);
        const dc = isStored ? '#94a3b8' : du < 90 ? 'var(--danger-color)' : du < 180 ? 'var(--warning-color)' : 'var(--text-primary)';
        dCheckEl.textContent = dd.toLocaleDateString('en-GB');
        dCheckEl.style.color = dc;
        if (!isStored && du < 90) {
          const cell = document.getElementById('dCheckCell');
          if (cell) cell.style.background = 'rgba(239,68,68,0.08)';
        }
      } else {
        dCheckEl.textContent = 'N/A';
      }
    }
  } catch (error) {
    console.error('Error fetching aircraft details:', error);
    document.getElementById('routeCount').textContent = '?';
    document.getElementById('routeInfo').innerHTML = '<span style="color:var(--danger-color);">Error</span>';
    document.getElementById('maintInfo').innerHTML = '<span style="color:var(--danger-color);">Error</span>';
    const cEl = document.getElementById('cCheckValue');
    const dEl = document.getElementById('dCheckValue');
    if (cEl) { cEl.textContent = '?'; cEl.style.color = 'var(--danger-color)'; }
    if (dEl) { dEl.textContent = '?'; dEl.style.color = 'var(--danger-color)'; }
  }

  // Close handlers
  document.getElementById('closeDetailBtn').addEventListener('click', () => document.body.removeChild(overlay));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) document.body.removeChild(overlay); });
  const escHandler = (e) => { if (e.key === 'Escape') { document.body.removeChild(overlay); document.removeEventListener('keydown', escHandler); } };
  document.addEventListener('keydown', escHandler);
}

// Build action buttons based on aircraft state
function buildActionButtons(ua) {
  const isLeased = ua.acquisitionType === 'lease';
  const isOwned = ua.acquisitionType === 'purchase';
  const status = ua.status;
  const isPlayerLease = !!ua.playerLessorAircraftId;
  let html = '';

  if (isLeased && ['active', 'maintenance', 'storage'].includes(status)) {
    const weeklyRate = parseFloat(ua.leaseWeeklyPayment) || 0;
    html += `<button class="btn btn-danger" onclick="event.stopPropagation(); confirmCancelLease('${ua.id}', '${ua.registration}', ${isPlayerLease}, ${weeklyRate})" style="flex:1; padding: 0.5rem; font-size: 0.9rem; cursor: pointer;">CANCEL LEASE</button>`;
  }
  if (isOwned && ['active', 'storage'].includes(status)) {
    html += `<button class="btn" onclick="event.stopPropagation(); showSellDialog('${ua.id}', '${ua.registration}', ${ua.purchasePrice || 0})" style="flex:1; padding: 0.5rem; font-size: 0.9rem; cursor: pointer; background: #d29922; border-color: #d29922; color: #fff;">SELL</button>`;
    html += `<button class="btn btn-primary" onclick="event.stopPropagation(); showLeaseOutDialog('${ua.id}', '${ua.registration}')" style="flex:1; padding: 0.5rem; font-size: 0.9rem; cursor: pointer;">LEASE OUT</button>`;
  }
  if (status === 'active') {
    html += `<button class="btn" onclick="event.stopPropagation(); confirmPutInStorage('${ua.id}', '${ua.registration}')" style="flex:1; padding: 0.5rem; font-size: 0.9rem; cursor: pointer; background: #64748b; border-color: #64748b; color: #fff;">STORE</button>`;
  }
  if (status === 'storage') {
    html += `<button class="btn" onclick="event.stopPropagation(); confirmTakeOutOfStorage('${ua.id}', '${ua.registration}')" style="flex:1; padding: 0.5rem; font-size: 0.9rem; cursor: pointer; background: var(--success-color); border-color: var(--success-color); color: #fff;">RECALL FROM STORAGE</button>`;
  }
  if (status === 'recalling') {
    const toStorage = ua.currentAirport && ua.storageAirportCode && ua.currentAirport === ua.storageAirportCode;
    html += `<span style="flex:1; padding: 0.5rem; font-size: 0.85rem; color: #60a5fa; text-align: center; font-weight: 600;">${toStorage ? 'Ferrying to storage...' : 'Recalling from storage...'}</span>`;
  }
  if (['listed_sale', 'listed_lease'].includes(status)) {
    html += `<button class="btn" onclick="event.stopPropagation(); withdrawListing('${ua.id}')" style="flex:1; padding: 0.5rem; font-size: 0.9rem; cursor: pointer; background: #d29922; border-color: #d29922; color: #fff;">WITHDRAW LISTING</button>`;
  }
  if (status === 'leased_out') {
    const weeklyRate = parseFloat(ua.leaseOutWeeklyRate) || 0;
    html += `<button class="btn btn-danger" onclick="event.stopPropagation(); confirmRecallAircraft('${ua.id}', '${ua.registration}', ${weeklyRate})" style="flex:1; padding: 0.5rem; font-size: 0.9rem; cursor: pointer;">RECALL AIRCRAFT</button>`;
  }
  if (status === 'on_order') {
    html += `<button class="btn btn-danger" onclick="event.stopPropagation(); confirmCancelOrder('${ua.id}', '${ua.registration}', ${ua.depositPaid || 0})" style="flex:1; padding: 0.5rem; font-size: 0.9rem; cursor: pointer;">CANCEL ORDER</button>`;
  }

  html += `<button id="closeDetailBtn" class="btn btn-secondary" style="flex:1; padding: 0.5rem; font-size: 0.9rem; cursor: pointer;">CLOSE</button>`;
  return html;
}

// ── Fleet Action Modal System ──

function showFleetModal({ icon, iconClass, title, registration, bodyHtml, confirmLabel, confirmClass, onConfirm, inputConfig, modalClass }) {
  // Remove any existing fleet modal
  document.querySelector('.fleet-modal-backdrop')?.remove();

  const backdrop = document.createElement('div');
  backdrop.className = 'fleet-modal-backdrop';

  const formattedDefault = inputConfig && inputConfig.defaultValue ? Number(inputConfig.defaultValue).toLocaleString() : '';
  const inputHtml = inputConfig ? `
    <div class="fleet-modal-input-group">
      <label>${inputConfig.label}</label>
      <div class="fleet-modal-input-wrap">
        <span class="input-prefix">$</span>
        <input type="text" inputmode="numeric" id="fleetModalInput" value="${formattedDefault}" placeholder="${inputConfig.placeholder || '0'}">
        ${inputConfig.suffix ? `<span class="input-suffix">${inputConfig.suffix}</span>` : ''}
      </div>
      <div class="fleet-modal-input-error" id="fleetModalError"></div>
    </div>
  ` : '';

  backdrop.innerHTML = `
    <div class="fleet-modal${modalClass ? ' ' + modalClass : ''}">
      <div class="fleet-modal-header">
        <div class="modal-icon ${iconClass}">${icon}</div>
        <div>
          <h3>${title}</h3>
          ${registration ? `<div class="modal-reg">${registration}</div>` : ''}
        </div>
      </div>
      <div class="fleet-modal-body">
        ${bodyHtml}
        ${inputHtml}
      </div>
      <div class="fleet-modal-footer">
        <button class="btn btn-cancel" id="fleetModalCancel">Cancel</button>
        <button class="btn ${confirmClass}" id="fleetModalConfirm">${confirmLabel}</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('visible'));

  const input = backdrop.querySelector('#fleetModalInput');
  if (input) {
    input.addEventListener('input', () => {
      const raw = input.value.replace(/[^0-9]/g, '');
      if (raw) {
        const num = parseInt(raw, 10);
        const cursorFromEnd = input.value.length - (input.selectionStart || 0);
        input.value = num.toLocaleString();
        const newPos = Math.max(0, input.value.length - cursorFromEnd);
        input.setSelectionRange(newPos, newPos);
      }
    });
    input.focus();
    input.select();
  }

  const close = () => {
    backdrop.classList.remove('visible');
    setTimeout(() => backdrop.remove(), 200);
  };

  // Cancel
  backdrop.querySelector('#fleetModalCancel').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  const escHandler = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); } };
  document.addEventListener('keydown', escHandler);

  // Confirm
  const doConfirm = () => {
    if (inputConfig) {
      const val = parseFloat(input.value.replace(/,/g, ''));
      if (!val || val <= 0) {
        backdrop.querySelector('#fleetModalError').textContent = inputConfig.errorMsg || 'Please enter a valid amount.';
        input.focus();
        return;
      }
      close();
      onConfirm(val);
    } else {
      close();
      onConfirm();
    }
  };

  backdrop.querySelector('#fleetModalConfirm').addEventListener('click', doConfirm);
  if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doConfirm(); });
}

// Cancel lease confirmation
function confirmCancelLease(aircraftId, registration, isPlayerLease, weeklyRate) {
  const penalty = isPlayerLease ? weeklyRate * 12 : 0;
  const penaltyHtml = isPlayerLease ? `
    <p style="margin-top: 0.5rem; padding: 0.6rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px;">
      <span style="color: #ef4444; font-weight: 700;">Early Termination Penalty:</span><br>
      <span style="font-size: 1.1rem; font-weight: 700; color: #ef4444;">$${formatCurrency(penalty)}</span>
      <span style="color: var(--text-muted); font-size: 0.8rem;">(12 weeks &times; $${formatCurrency(weeklyRate)}/wk)</span><br>
      <span style="color: var(--text-muted); font-size: 0.8rem;">This will be deducted from your balance and paid to the aircraft owner.</span>
    </p>
  ` : '';

  showFleetModal({
    icon: '&#9888;',
    iconClass: 'danger',
    title: 'Cancel Lease',
    registration,
    bodyHtml: `
      <p>The aircraft will be returned to the ${isPlayerLease ? 'owner' : 'lessor'}. All scheduled flights and maintenance will be removed.</p>
      ${penaltyHtml}
      <p class="modal-warning">This action cannot be undone.</p>
    `,
    confirmLabel: isPlayerLease ? `Pay $${formatCurrency(penalty)} & Cancel` : 'Cancel Lease',
    confirmClass: 'btn-confirm-danger',
    onConfirm: async () => {
      try {
        const res = await fetch(`/api/fleet/${aircraftId}/cancel-lease`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        document.getElementById('aircraftDetailOverlay')?.remove();
        loadFleet();
      } catch (err) {
        showFleetModal({ icon: '&#10060;', iconClass: 'danger', title: 'Error', bodyHtml: `<p>${err.message}</p>`, confirmLabel: 'OK', confirmClass: 'btn-confirm-primary', onConfirm: () => {} });
      }
    }
  });
}

// Cancel order confirmation
function confirmCancelOrder(aircraftId, registration, depositPaid) {
  showFleetModal({
    icon: '&#9888;',
    iconClass: 'danger',
    title: 'Cancel Order',
    registration,
    bodyHtml: `
      <p>Cancel this aircraft order? The aircraft will not be delivered.</p>
      <p style="margin-top: 0.5rem; padding: 0.6rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px;">
        <span style="color: #ef4444; font-weight: 700;">Deposit Forfeiture:</span><br>
        <span style="font-size: 1.1rem; font-weight: 700; color: #ef4444;">$${formatCurrency(depositPaid)}</span><br>
        <span style="color: var(--text-muted); font-size: 0.8rem;">Your deposit will not be refunded.</span>
      </p>
      <p class="modal-warning">This action cannot be undone.</p>
    `,
    confirmLabel: `Forfeit $${formatCurrency(depositPaid)} & Cancel`,
    confirmClass: 'btn-confirm-danger',
    onConfirm: async () => {
      try {
        const res = await fetch(`/api/fleet/${aircraftId}/cancel-order`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        document.getElementById('aircraftDetailOverlay')?.remove();
        loadFleet();
      } catch (err) {
        showFleetModal({ icon: '&#10060;', iconClass: 'danger', title: 'Error', bodyHtml: `<p>${err.message}</p>`, confirmLabel: 'OK', confirmClass: 'btn-confirm-primary', onConfirm: () => {} });
      }
    }
  });
}

// Sell dialog with price input
function showSellDialog(aircraftId, registration, purchasePrice) {
  const suggestedPrice = Math.round((purchasePrice || 0) * 0.8);
  const userAircraft = fleetData.find(a => a.id === aircraftId);
  const aircraftTypeId = userAircraft?.aircraftId;

  const loadingSpinner = '<p id="sellMarketData" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;"><span class="spinner-dots">Loading market data</span></p>';

  showFleetModal({
    icon: '&#128181;',
    iconClass: 'warning',
    title: 'List for Sale',
    registration,
    bodyHtml: `
      <p>Set an asking price to list this aircraft on the used market. Scheduled flights and maintenance will be removed.</p>
      <p style="font-size: 0.8rem; color: var(--text-muted);">Original purchase price: <strong style="color: var(--text-primary);">$${formatCurrency(purchasePrice || 0)}</strong></p>
      ${aircraftTypeId ? loadingSpinner : ''}
    `,
    confirmLabel: 'List for Sale',
    confirmClass: 'btn-confirm-warning',
    inputConfig: {
      label: 'Asking Price',
      defaultValue: suggestedPrice || '',
      placeholder: 'Enter price',
      errorMsg: 'Please enter a valid price.'
    },
    onConfirm: async (askingPrice) => {
      try {
        const res = await fetch(`/api/fleet/${aircraftId}/sell`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ askingPrice })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        document.getElementById('aircraftDetailOverlay')?.remove();
        loadFleet();
      } catch (err) {
        showFleetModal({ icon: '&#10060;', iconClass: 'danger', title: 'Error', bodyHtml: `<p>${err.message}</p>`, confirmLabel: 'OK', confirmClass: 'btn-confirm-primary', onConfirm: () => {} });
      }
    }
  });

  // Fetch market data in background and update modal
  if (aircraftTypeId) {
    fetch(`/api/fleet/market-averages/${aircraftTypeId}`)
      .then(res => res.ok ? res.json() : null)
      .then(market => {
        const el = document.getElementById('sellMarketData');
        if (!el) return;
        if (market && market.sale.count > 0) {
          el.innerHTML = `Market avg sale price: <strong style="color: var(--accent-color);">$${formatCurrency(market.sale.avg)}</strong> <span style="opacity: 0.7;">($${formatCurrency(market.sale.min)} – $${formatCurrency(market.sale.max)})</span>`;
        } else {
          el.remove();
        }
      })
      .catch(() => {
        document.getElementById('sellMarketData')?.remove();
      });
  }
}

// Lease out dialog with weekly rate input
function showLeaseOutDialog(aircraftId, registration) {
  const userAircraft = fleetData.find(a => a.id === aircraftId);
  const aircraftTypeId = userAircraft?.aircraftId;

  const loadingSpinner = '<p id="leaseMarketData" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;"><span class="spinner-dots">Loading market data</span></p>';

  showFleetModal({
    icon: '&#9992;',
    iconClass: 'primary',
    title: 'Lease Out Aircraft',
    registration,
    bodyHtml: `
      <p>Set a weekly rate to list this aircraft for lease. Scheduled flights and maintenance will be removed while listed.</p>
      ${aircraftTypeId ? loadingSpinner : ''}
    `,
    confirmLabel: 'List for Lease',
    confirmClass: 'btn-confirm-primary',
    inputConfig: {
      label: 'Weekly Lease Rate',
      defaultValue: '',
      placeholder: 'Enter weekly rate',
      suffix: '/wk',
      errorMsg: 'Please enter a valid weekly rate.'
    },
    onConfirm: async (weeklyRate) => {
      try {
        const res = await fetch(`/api/fleet/${aircraftId}/lease-out`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weeklyRate })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        document.getElementById('aircraftDetailOverlay')?.remove();
        loadFleet();
      } catch (err) {
        showFleetModal({ icon: '&#10060;', iconClass: 'danger', title: 'Error', bodyHtml: `<p>${err.message}</p>`, confirmLabel: 'OK', confirmClass: 'btn-confirm-primary', onConfirm: () => {} });
      }
    }
  });

  // Fetch market data in background and update modal
  if (aircraftTypeId) {
    fetch(`/api/fleet/market-averages/${aircraftTypeId}`)
      .then(res => res.ok ? res.json() : null)
      .then(market => {
        const el = document.getElementById('leaseMarketData');
        if (!el) return;
        if (market && market.lease.count > 0) {
          el.innerHTML = `Market avg lease rate: <strong style="color: var(--accent-color);">$${formatCurrency(market.lease.avg)}/wk</strong> <span style="opacity: 0.7;">($${formatCurrency(market.lease.min)} – $${formatCurrency(market.lease.max)}/wk)</span>`;
          // Also update input with suggested rate
          const input = document.getElementById('fleetModalInput');
          if (input && !input.value) {
            input.value = Number(market.lease.avg).toLocaleString();
          }
        } else {
          el.remove();
        }
      })
      .catch(() => {
        document.getElementById('leaseMarketData')?.remove();
      });
  }
}

// Withdraw listing
function withdrawListing(aircraftId) {
  showFleetModal({
    icon: '&#8617;',
    iconClass: 'warning',
    title: 'Withdraw Listing',
    bodyHtml: `
      <p>Remove this aircraft from the market? It will return to active status and can be scheduled for flights again.</p>
    `,
    confirmLabel: 'Withdraw',
    confirmClass: 'btn-confirm-warning',
    onConfirm: async () => {
      try {
        const res = await fetch(`/api/fleet/${aircraftId}/withdraw-listing`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        document.getElementById('aircraftDetailOverlay')?.remove();
        loadFleet();
      } catch (err) {
        showFleetModal({ icon: '&#10060;', iconClass: 'danger', title: 'Error', bodyHtml: `<p>${err.message}</p>`, confirmLabel: 'OK', confirmClass: 'btn-confirm-primary', onConfirm: () => {} });
      }
    }
  });
}

// Recall aircraft from player lessee
function confirmRecallAircraft(aircraftId, registration, weeklyRate) {
  const compensation = weeklyRate * 3;
  showFleetModal({
    icon: '&#8617;',
    iconClass: 'danger',
    title: 'Recall Aircraft',
    registration,
    bodyHtml: `
      <p>Recall this aircraft from the current lessee? Their scheduled flights and maintenance will be removed and the aircraft will return to your fleet.</p>
      <p style="margin-top: 0.5rem; padding: 0.6rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px;">
        <span style="color: #ef4444; font-weight: 700;">Early Recall Compensation:</span><br>
        <span style="font-size: 1.1rem; font-weight: 700; color: #ef4444;">$${formatCurrency(compensation)}</span>
        <span style="color: var(--text-muted); font-size: 0.8rem;">(3 weeks &times; $${formatCurrency(weeklyRate)}/wk)</span><br>
        <span style="color: var(--text-muted); font-size: 0.8rem;">This will be deducted from your balance and paid to the lessee as compensation.</span>
      </p>
      <p class="modal-warning">This action cannot be undone.</p>
    `,
    confirmLabel: `Pay $${formatCurrency(compensation)} & Recall`,
    confirmClass: 'btn-confirm-danger',
    onConfirm: async () => {
      try {
        const res = await fetch(`/api/fleet/${aircraftId}/recall-aircraft`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        document.getElementById('aircraftDetailOverlay')?.remove();
        loadFleet();
      } catch (err) {
        showFleetModal({ icon: '&#10060;', iconClass: 'danger', title: 'Error', bodyHtml: `<p>${err.message}</p>`, confirmLabel: 'OK', confirmClass: 'btn-confirm-primary', onConfirm: () => {} });
      }
    }
  });
}

// Calculate storage weekly cost using per-airport rate
function calculateStorageWeeklyCost(userAircraft) {
  const purchasePrice = parseFloat(userAircraft.purchasePrice) || 0;
  if (userAircraft.storageAirportCode && window.STORAGE_AIRPORTS) {
    const sa = window.STORAGE_AIRPORTS.find(a => a.icao === userAircraft.storageAirportCode);
    if (sa) return Math.round(purchasePrice * sa.weeklyRatePercent / 100);
  }
  return Math.round(purchasePrice * 0.005);
}

// Put aircraft into storage - with airport selection
function confirmPutInStorage(aircraftId, registration) {
  const userAircraft = fleetData.find(a => a.id === aircraftId);
  const purchasePrice = parseFloat(userAircraft?.purchasePrice) || 0;

  // Show modal immediately with loading state
  showFleetModal({
    icon: '&#128230;',
    iconClass: 'secondary',
    title: 'Select Storage Facility',
    registration,
    modalClass: 'fleet-modal-wide',
    bodyHtml: `
      <p style="margin-bottom: 0.5rem;">Choose a storage facility. Cost, condition wear, and recall time vary by location.</p>
      <div id="storageTableContainer" style="min-height: 100px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-color); border-radius: 6px; margin-bottom: 0.75rem; padding: 1.5rem;">
        <span class="spinner-dots" style="font-size: 0.9rem;">Loading storage facilities</span>
      </div>
      <p style="font-size: 0.8rem; color: var(--text-muted);">All maintenance and route assignments will be removed. The aircraft will ferry to the storage facility before entering storage.</p>
    `,
    confirmLabel: 'Store Aircraft',
    confirmClass: 'btn-confirm-warning',
    onConfirm: async () => {
      const selected = document.querySelector('input[name="storageAirport"]:checked');
      if (!selected) return;
      try {
        const res = await fetch(`/api/fleet/${aircraftId}/put-in-storage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storageAirportCode: selected.value })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        document.getElementById('aircraftDetailOverlay')?.remove();
        loadFleet();
      } catch (err) {
        showFleetModal({ icon: '&#10060;', iconClass: 'danger', title: 'Error', bodyHtml: `<p>${err.message}</p>`, confirmLabel: 'OK', confirmClass: 'btn-confirm-primary', onConfirm: () => {} });
      }
    }
  });

  // Disable confirm until data loads
  const confirmBtn = document.getElementById('fleetModalConfirm');
  if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.style.opacity = '0.5'; }

  // Fetch storage airports in background
  fetch('/api/fleet/storage-airports')
    .then(res => res.json().then(data => { if (!res.ok) throw new Error(data.error); return data; }))
    .then(storageAirports => {
      const container = document.getElementById('storageTableContainer');
      if (!container) return;

      if (storageAirports.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted);">No storage facilities are available in the current era.</p>';
        return;
      }

      const tierClass = (t) => t === 'Very Cheap' ? 'vcheap' : t === 'Cheap' ? 'cheap' : t === 'Middle' ? 'middle' : t === 'Mid-Expensive' ? 'midexp' : 'expensive';
      let tableHtml = `<table class="storage-table">
        <thead><tr>
          <th></th><th>Location</th><th>Tier</th><th style="text-align:right">Cost/wk</th><th style="text-align:right">Wear</th><th style="text-align:right">Ferry</th><th style="text-align:right">Dist</th>
        </tr></thead><tbody>`;
      storageAirports.forEach((sa, i) => {
        const weeklyCost = Math.round(purchasePrice * sa.weeklyRatePercent / 100);
        tableHtml += `
          <tr class="${i === 0 ? 'selected-row' : ''}" onclick="this.querySelector('input').checked=true; this.closest('tbody').querySelectorAll('tr').forEach(r=>r.classList.remove('selected-row')); this.classList.add('selected-row');">
            <td><input type="radio" name="storageAirport" value="${sa.icao}" ${i === 0 ? 'checked' : ''}></td>
            <td><div class="loc-name">${sa.icao}</div><div class="loc-detail">${sa.city}, ${sa.country}</div></td>
            <td><span class="tier-badge tier-${tierClass(sa.costTier)}">${sa.costTier}</span></td>
            <td class="num">$${weeklyCost.toLocaleString()}</td>
            <td class="num">${sa.annualConditionLoss}%/yr</td>
            <td class="num">${sa.recallDays}d</td>
            <td class="num">${sa.distanceNm.toLocaleString()}nm</td>
          </tr>`;
      });
      tableHtml += '</tbody></table>';

      container.style.cssText = 'max-height: 300px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px; margin-bottom: 0.75rem;';
      container.innerHTML = tableHtml;

      // Enable confirm button
      const btn = document.getElementById('fleetModalConfirm');
      if (btn) { btn.disabled = false; btn.style.opacity = ''; }
    })
    .catch(err => {
      const container = document.getElementById('storageTableContainer');
      if (container) container.innerHTML = `<p style="color: var(--danger-color);">Failed to load storage facilities: ${err.message}</p>`;
    });
}

// Recall aircraft from storage
function confirmTakeOutOfStorage(aircraftId, registration) {
  const userAircraft = fleetData.find(a => a.id === aircraftId);
  const storageCode = userAircraft?.storageAirportCode;
  const storageAirport = storageCode && window.STORAGE_AIRPORTS ? window.STORAGE_AIRPORTS.find(sa => sa.icao === storageCode) : null;

  // Calculate storage breakdown with local data first
  const gameTime = typeof calculateCurrentWorldTime === 'function' ? calculateCurrentWorldTime() : null;
  const storedAt = userAircraft?.storedAt ? new Date(userAircraft.storedAt) : null;
  const conditionAtStorage = userAircraft?.conditionPercentage ?? 100;
  const annualLoss = storageAirport?.annualConditionLoss ?? 0;

  let daysInStorage = 0;
  let totalWear = 0;
  let conditionAfter = conditionAtStorage;
  if (storedAt && gameTime) {
    const msInStorage = gameTime.getTime() - storedAt.getTime();
    daysInStorage = Math.max(0, Math.floor(msInStorage / (1000 * 60 * 60 * 24)));
    totalWear = Math.round((annualLoss / 365) * daysInStorage);
    conditionAfter = Math.max(0, conditionAtStorage - totalWear);
  }

  const fmtDate = (d) => d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const locationName = storageAirport ? `${storageAirport.name}, ${storageAirport.country}` : (storageCode || 'Unknown');
  const r = 'display: flex; justify-content: space-between; padding: 0.25rem 0;';
  const sep = 'border-bottom: 1px solid rgba(148,163,184,0.15);';

  // Show modal immediately with placeholder for ferry info
  showFleetModal({
    icon: '&#9992;',
    iconClass: 'success',
    title: 'Recall from Storage',
    registration,
    bodyHtml: `
      <p style="margin-bottom: 0.5rem;">Recall from <strong>${storageCode}</strong> — ${locationName}?</p>
      <div style="padding: 0.6rem; background: rgba(148, 163, 184, 0.08); border: 1px solid rgba(148, 163, 184, 0.25); border-radius: 6px; font-size: 0.85rem;">
        <div style="${r} ${sep}">
          <span style="color: var(--text-muted);">Entered Storage</span>
          <span style="font-weight: 600; color: var(--text-primary);">${fmtDate(storedAt)} &nbsp;— &nbsp;${conditionAtStorage}% condition</span>
        </div>
        <div style="${r} ${sep}">
          <span style="color: var(--text-muted);">Recalled</span>
          <span style="font-weight: 600; color: var(--text-primary);">${fmtDate(gameTime)} &nbsp;— &nbsp;${conditionAfter}% condition</span>
        </div>
        <div style="${r} ${sep}">
          <span style="color: var(--text-muted);">Total Days in Storage</span>
          <span style="font-weight: 600; color: var(--text-primary);">${daysInStorage.toLocaleString()} days</span>
        </div>
        <div style="${r}">
          <span style="color: var(--text-muted);">Total Wear Incurred</span>
          <span style="font-weight: 600; color: ${totalWear > 0 ? 'var(--warning-color)' : 'var(--success-color)'};">${totalWear > 0 ? '-' : ''}${totalWear}%</span>
        </div>
      </div>
      <div id="recallFerryInfo" style="margin-top: 0.5rem; padding: 0.45rem 0.6rem; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 6px; font-size: 0.85rem; text-align: center;">
        <span class="spinner-dots">Loading ferry details</span>
      </div>
      <p style="margin-top: 0.5rem; font-size: 0.78rem; color: var(--text-muted);">A ferry exemption will be granted to position the aircraft back to base. C and D check validity is preserved during storage. Once returned, a Daily, Weekly, or A check may be required before the aircraft can be scheduled to operate.</p>
    `,
    confirmLabel: 'Recall',
    confirmClass: 'btn-confirm-primary',
    onConfirm: async () => {
      try {
        const res = await fetch(`/api/fleet/${aircraftId}/take-out-of-storage`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        document.getElementById('aircraftDetailOverlay')?.remove();
        loadFleet();
      } catch (err) {
        showFleetModal({ icon: '&#10060;', iconClass: 'danger', title: 'Error', bodyHtml: `<p>${err.message}</p>`, confirmLabel: 'OK', confirmClass: 'btn-confirm-primary', onConfirm: () => {} });
      }
    }
  });

  // Fetch ferry details in background
  if (storageAirport) {
    fetch('/api/fleet/storage-airports')
      .then(res => res.ok ? res.json() : null)
      .then(airports => {
        const ferryEl = document.getElementById('recallFerryInfo');
        if (!ferryEl) return;
        let recallDays = '?';
        if (airports) {
          const match = airports.find(a => a.icao === storageCode);
          if (match) recallDays = match.recallDays;
        }
        const recallDaysNum = typeof recallDays === 'number' ? recallDays : parseInt(recallDays) || 0;
        let arrivalDate = null;
        if (gameTime && recallDaysNum > 0) {
          arrivalDate = new Date(gameTime.getTime() + recallDaysNum * 24 * 60 * 60 * 1000);
        }
        ferryEl.style.textAlign = '';
        ferryEl.innerHTML = `
          <div style="${r} ${sep}">
            <span style="color: var(--text-muted);">Ferry Time</span>
            <span style="font-weight: 600; color: var(--accent-color);">${recallDays} days</span>
          </div>
          <div style="${r}">
            <span style="color: var(--text-muted);">Arrives at Base</span>
            <span style="font-weight: 600; color: var(--accent-color);">${fmtDate(arrivalDate)}</span>
          </div>
        `;
        // Update confirm button label
        const btn = document.getElementById('fleetModalConfirm');
        if (btn) btn.textContent = `Recall (${recallDays}d ferry)`;
      })
      .catch(() => {
        const ferryEl = document.getElementById('recallFerryInfo');
        if (ferryEl) ferryEl.remove();
      });
  }
}

// Format currency
function formatCurrency(amount) {
  const numAmount = Number(amount) || 0;
  return numAmount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

// ── Reconfigure Cargo (instant) ───────────────────────────────────────────────
function reconfigureCargo(userAircraftId) {
  const ua = window._fleetData?.find(a => a.id === userAircraftId)
    || (typeof userFleet !== 'undefined' && userFleet.find(a => a.id === userAircraftId));
  if (!ua || !ua.aircraft) return;

  const aircraft = {
    ...ua.aircraft,
    cargoCapacityKg: ua.aircraft.cargoCapacityKg
  };

  // Build existing config from current state
  const existingConfig = ua.cargoConfig || ua.mainDeckCargoConfig ? {
    cargoConfig: ua.cargoConfig,
    mainDeckCargoConfig: ua.mainDeckCargoConfig,
    cargoHoldCargoConfig: ua.cargoHoldCargoConfig
  } : null;

  if (typeof showCargoConfigurator !== 'function') return;

  showCargoConfigurator(aircraft, async (config) => {
    try {
      const res = await fetch(`/api/fleet/${userAircraftId}/reconfig-cargo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cargoConfig: config.cargoConfig || null,
          mainDeckCargoConfig: config.mainDeckCargoConfig || null,
          cargoHoldCargoConfig: config.cargoHoldCargoConfig || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update cargo config');
      // Close detail overlay and reload fleet
      const overlay = document.getElementById('aircraftDetailOverlay');
      if (overlay) document.body.removeChild(overlay);
      loadFleet();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }, existingConfig);
}

// ── Reconfigure Cabin (triggers refit downtime) ──────────────────────────────
function reconfigureCabin(userAircraftId) {
  const ua = window._fleetData?.find(a => a.id === userAircraftId)
    || (typeof userFleet !== 'undefined' && userFleet.find(a => a.id === userAircraftId));
  if (!ua || !ua.aircraft) return;

  const aircraft = {
    ...ua.aircraft,
    passengerCapacity: ua.aircraft.passengerCapacity
  };

  const existingConfig = ua.economySeats || ua.businessSeats || ua.firstSeats || ua.economyPlusSeats ? {
    economySeats: ua.economySeats,
    economyPlusSeats: ua.economyPlusSeats,
    businessSeats: ua.businessSeats,
    firstSeats: ua.firstSeats,
    toilets: ua.toilets
  } : null;

  if (typeof showCabinConfigurator !== 'function') return;

  // Calculate refit duration
  const acType = ua.aircraft.type;
  const pax = ua.aircraft.passengerCapacity || 0;
  let days = 2;
  if (acType === 'Regional') days = 1;
  else if (acType === 'Narrowbody') days = 2;
  else if (acType === 'Widebody') days = pax > 400 ? 7 : 5;

  const acName = `${ua.aircraft.manufacturer} ${ua.aircraft.model}`;

  showCabinConfigurator(aircraft, async (config) => {
    try {
      const res = await fetch(`/api/fleet/${userAircraftId}/reconfig-cabin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          economySeats: config.economySeats || 0,
          economyPlusSeats: config.economyPlusSeats || 0,
          businessSeats: config.businessSeats || 0,
          firstSeats: config.firstSeats || 0,
          toilets: config.toilets || 0
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start cabin refit');
      const overlay = document.getElementById('aircraftDetailOverlay');
      if (overlay) document.body.removeChild(overlay);
      loadFleet();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }, existingConfig, {
    refitWarning: `Cabin refit will take ${ua.registration} out of service for ${days} day${days > 1 ? 's' : ''} (game time).`,
    refitConfirm: { registration: ua.registration, days, aircraftName: acName }
  });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  // Only auto-load fleet on the fleet page (has fleetGrid element)
  if (document.getElementById('fleetGrid')) {
    loadFleet();
    // Pass game year to cabin configurator so era-locked classes are shown correctly
    fetch('/api/world/info').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.currentTime && typeof setCabinEraYear === 'function') {
        setCabinEraYear(new Date(d.currentTime).getFullYear());
      }
    }).catch(() => {});
  }
});

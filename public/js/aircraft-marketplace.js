// Build list of ICAO codes to try for aircraft images (specific first, then common base)
function getAircraftImageCodes(aircraft) {
  const codes = [];
  if (aircraft.icaoCode) codes.push(aircraft.icaoCode);

  // Common base codes - maps model families to their base image code on doc8643
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

let allAircraft = [];
let currentCategory = '';
let selectedAircraft = null;
let registrationPrefix = 'N-'; // Default prefix, will be updated from world info
let baseCountry = null;
let isSinglePlayer = false; // SP worlds cache inventory in sessionStorage
let purchaseQuantity = 1; // Quantity for bulk new aircraft purchases
let selectedCabinConfig = null; // Cabin class configuration
let selectedCargoConfig = null; // Cargo type allocation

// Contract signing animation
function showContractSigningAnimation(type, aircraftName, registration, price) {
  return new Promise((resolve) => {
    // Get CEO name and airline from DOM (populated by layout.js)
    const ceoName = document.getElementById('userName')?.textContent?.trim() || 'Chief Executive';
    const airlineName = document.getElementById('airlineName')?.textContent?.trim() || 'Airline';

    const overlay = document.createElement('div');
    overlay.id = 'contractOverlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(10, 15, 26, 0.95);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    const formattedPrice = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);

    const today = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const contractType = type === 'lease' ? 'AIRCRAFT LEASE AGREEMENT' : type === 'order' ? 'AIRCRAFT ORDER AGREEMENT' : 'AIRCRAFT PURCHASE AGREEMENT';
    const actionText = type === 'lease' ? 'lease' : type === 'order' ? 'order' : 'purchase';

    overlay.innerHTML = `
      <div class="contract-container" style="
        background: #f5f0e6;
        background-image: linear-gradient(to bottom, #f5f0e6, #e8e0d0);
        width: 500px;
        max-width: 90%;
        padding: 2.5rem;
        border-radius: 4px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5), inset 0 0 100px rgba(0,0,0,0.05);
        font-family: 'Times New Roman', serif;
        color: #2c2c2c;
        position: relative;
        transform: scale(0.9);
        opacity: 0;
        transition: all 0.4s ease;
      ">
        <!-- Decorative border -->
        <div style="
          position: absolute;
          top: 12px;
          left: 12px;
          right: 12px;
          bottom: 12px;
          border: 2px solid #8b7355;
          pointer-events: none;
        "></div>

        <!-- Header -->
        <div style="text-align: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #8b7355;">
          <div style="font-size: 0.7rem; letter-spacing: 3px; color: #666; margin-bottom: 0.3rem;">OFFICIAL DOCUMENT</div>
          <h2 style="font-size: 1.3rem; font-weight: bold; margin: 0; letter-spacing: 1px;">${contractType}</h2>
        </div>

        <!-- Contract body -->
        <div style="font-size: 0.9rem; line-height: 1.8; text-align: justify;">
          <p style="margin-bottom: 1rem;">
            This agreement, executed on <strong>${today}</strong>, hereby confirms the ${actionText} of the following aircraft:
          </p>

          <div style="background: rgba(139, 115, 85, 0.1); padding: 1rem; margin: 1rem 0; border-left: 3px solid #8b7355;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <span>Aircraft:</span>
              <strong>${aircraftName}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <span>Registration:</span>
              <strong>${registration}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>${type === 'lease' ? 'Weekly Rate:' : type === 'order' ? 'Deposit Paid:' : 'Purchase Price:'}</span>
              <strong>${formattedPrice}</strong>
            </div>
          </div>

          <p style="font-size: 0.8rem; color: #666; margin-top: 1rem;">
            The undersigned agrees to all terms and conditions as set forth in the standard aviation ${actionText} agreement.
          </p>
        </div>

        <!-- Signature area -->
        <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #8b7355;">
          <div style="display: flex; justify-content: space-between; align-items: flex-end;">
            <div style="flex: 1;">
              <div style="font-size: 0.75rem; color: #666; margin-bottom: 0.5rem;">AUTHORIZED SIGNATURE</div>
              <div id="signatureArea" style="position: relative; height: 60px; border-bottom: 1px solid #2c2c2c; margin-right: 2rem; overflow: hidden;">
                <!-- Signature text revealed progressively -->
                <div id="signatureText" style="
                  position: absolute;
                  bottom: 16px;
                  left: 8px;
                  font-family: 'Segoe Script', 'Apple Chancery', 'Brush Script MT', 'Dancing Script', cursive;
                  font-size: 1.55rem;
                  color: #1a3a6e;
                  white-space: nowrap;
                  clip-path: inset(0 100% 0 0);
                ">${ceoName}</div>
                <!-- CEO title fades in after signature -->
                <div id="signatureTitle" style="
                  position: absolute;
                  bottom: 1px;
                  left: 10px;
                  font-family: 'Times New Roman', serif;
                  font-size: 0.6rem;
                  color: #555;
                  letter-spacing: 0.5px;
                  opacity: 0;
                  transition: opacity 0.4s ease;
                ">CEO &mdash; ${airlineName}</div>
                <!-- Pen that follows the writing -->
                <div id="penCursor" style="
                  position: absolute;
                  bottom: 16px;
                  left: 0;
                  font-size: 1.2rem;
                  opacity: 0;
                  transform: rotate(-30deg) scaleX(-1);
                  pointer-events: none;
                  z-index: 2;
                ">&#9999;&#65039;</div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.75rem; color: #666;">DATE</div>
              <div style="font-size: 0.9rem; font-weight: bold;">${today}</div>
            </div>
          </div>
        </div>

        <!-- Stamp that appears after signing -->
        <div id="approvedStamp" style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-15deg) scale(0);
          width: 150px;
          height: 150px;
          border: 4px solid #22c55e;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          font-weight: bold;
          color: #22c55e;
          text-transform: uppercase;
          letter-spacing: 2px;
          opacity: 0;
          transition: all 0.3s ease;
        ">
          <div style="text-align: center;">
            <div>&#10003;</div>
            <div>APPROVED</div>
          </div>
        </div>
      </div>

      <style>
        @keyframes stampAppear {
          0% { transform: translate(-50%, -50%) rotate(-15deg) scale(0); opacity: 0; }
          50% { transform: translate(-50%, -50%) rotate(-15deg) scale(1.2); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) rotate(-15deg) scale(1); opacity: 0.9; }
        }
      </style>
    `;

    document.body.appendChild(overlay);

    // Trigger animations
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      const container = overlay.querySelector('.contract-container');
      container.style.transform = 'scale(1)';
      container.style.opacity = '1';

      // Start pen and signature animation after contract appears
      setTimeout(() => {
        const pen = document.getElementById('penCursor');
        const sigText = document.getElementById('signatureText');
        const sigTitle = document.getElementById('signatureTitle');
        const writeDuration = 1.5; // seconds

        // Measure signature text width for pen travel
        const textWidth = sigText.scrollWidth;
        const penEndX = Math.min(textWidth + 8, 280);

        // Show pen and animate writing
        pen.style.opacity = '1';
        pen.style.transition = `left ${writeDuration}s ease-in-out`;
        sigText.style.transition = `clip-path ${writeDuration}s ease-in-out`;

        requestAnimationFrame(() => {
          // Reveal text left-to-right and move pen across
          sigText.style.clipPath = 'inset(0 0 0 0)';
          pen.style.left = penEndX + 'px';
        });

        // After writing completes: hide pen, show title, then stamp
        setTimeout(() => {
          pen.style.transition = 'opacity 0.3s ease';
          pen.style.opacity = '0';
          sigTitle.style.opacity = '1';

          // Show approved stamp
          setTimeout(() => {
            const stamp = document.getElementById('approvedStamp');
            stamp.style.animation = 'stampAppear 0.4s ease-out forwards';

            // Fade out and resolve
            setTimeout(() => {
              overlay.style.opacity = '0';
              setTimeout(() => {
                overlay.remove();
                resolve();
              }, 300);
            }, 4500);
          }, 400);
        }, (writeDuration * 1000) + 100);
      }, 500);
    });
  });
}

// Fetch world info (registration prefix, balance, airline name, world type)
async function fetchWorldInfo() {
  try {
    const response = await fetch('/api/world/info');
    if (!response.ok) return;
    const data = await response.json();

    // Registration prefix
    if (data.baseAirport && data.baseAirport.country) {
      baseCountry = data.baseAirport.country;
      registrationPrefix = getRegistrationPrefix(baseCountry);
    }

    // World type — SP worlds can cache inventory
    isSinglePlayer = data.worldType === 'singleplayer';

    // Pass game year to cabin configurator so era-locked classes are shown correctly
    if (data.currentTime && typeof setCabinEraYear === 'function') {
      setCabinEraYear(new Date(data.currentTime).getFullYear());
    }

    // Balance display
    const balanceEl = document.getElementById('marketplaceBalance');
    if (!data.error) {
      playerBalance = Number(data.balance) || 0;
      const balance = playerBalance;
      balanceEl.textContent = `$${Math.round(balance).toLocaleString('en-US')}`;
      if (balance < 0) {
        balanceEl.style.color = 'var(--warning-color)';
      } else if (balance < 100000) {
        balanceEl.style.color = 'var(--text-secondary)';
      } else {
        balanceEl.style.color = 'var(--success-color)';
      }
    }

    // Airline name
    const airlineEl = document.getElementById('marketplaceAirlineName');
    if (airlineEl && !data.error) {
      airlineEl.textContent = data.airlineName || '--';
    }
  } catch (error) {
    console.error('Error fetching world info:', error);
  }
}

// Load aircraft based on category (SP worlds use sessionStorage cache)
async function loadAircraft() {
  try {
    // Get category from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    currentCategory = urlParams.get('category') || 'used';

    // Update page title and subtitle based on category
    const titleElement = document.getElementById('marketplaceTitle');
    const subtitleElement = document.getElementById('marketplaceSubtitle');

    if (currentCategory === 'new') {
      titleElement.textContent = 'NEW AIRCRAFT FROM MANUFACTURER';
      subtitleElement.textContent = 'PURCHASE BRAND NEW AIRCRAFT';
    } else {
      titleElement.textContent = 'USED AIRCRAFT MARKET';
      subtitleElement.textContent = 'BROWSE PREVIOUSLY OWNED AIRCRAFT';
    }

    // SP worlds: try sessionStorage cache first
    const cacheKey = `aircraft_inventory_v2_${currentCategory}`;
    if (isSinglePlayer) {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          allAircraft = JSON.parse(cached);
          populateManufacturerFilter(allAircraft);
          displayAircraft(allAircraft);
          updateActiveTab();
          return;
        }
      } catch (e) { /* cache miss or parse error, fetch normally */ }
    }

    // Fetch aircraft from API based on category
    const response = await fetch(`/api/aircraft?category=${currentCategory}`);
    const aircraft = await response.json();

    if (!response.ok) {
      throw new Error(aircraft.error || 'Failed to fetch aircraft');
    }

    allAircraft = aircraft;

    // SP worlds: cache the result in sessionStorage
    if (isSinglePlayer) {
      try { sessionStorage.setItem(cacheKey, JSON.stringify(aircraft)); } catch (e) { /* quota exceeded */ }
    }

    populateManufacturerFilter(allAircraft);
    displayAircraft(allAircraft);
    updateActiveTab(); // Update the active tab after loading
  } catch (error) {
    console.error('Error loading aircraft:', error);
    document.getElementById('aircraftGrid').innerHTML = `
      <div class="empty-message">Error loading aircraft inventory</div>
    `;
  }
}

// Clear the cached aircraft inventory (call after purchase/lease to refresh on next load)
function clearAircraftCache() {
  try {
    sessionStorage.removeItem('aircraft_inventory_used');
    sessionStorage.removeItem('aircraft_inventory_new');
    sessionStorage.removeItem('aircraft_inventory_v2_used');
    sessionStorage.removeItem('aircraft_inventory_v2_new');
  } catch (e) { /* ignore */ }
}

// Display aircraft in card grid format
function displayAircraft(aircraftArray) {
  const grid = document.getElementById('aircraftGrid');

  if (aircraftArray.length === 0) {
    grid.innerHTML = `
      <div class="empty-message">No aircraft found matching your criteria</div>
    `;
    return;
  }

  // Group aircraft by manufacturer + model (type key)
  const groupedAircraft = {};
  aircraftArray.forEach(aircraft => {
    const typeKey = `${aircraft.manufacturer} ${aircraft.model}`;
    if (!groupedAircraft[typeKey]) {
      groupedAircraft[typeKey] = {
        manufacturer: aircraft.manufacturer,
        model: aircraft.model,
        type: aircraft.type,
        passengerCapacity: aircraft.passengerCapacity,
        rangeNm: aircraft.rangeNm,
        icaoCodes: new Set(),
        variants: []
      };
    }
    if (aircraft.icaoCode) {
      groupedAircraft[typeKey].icaoCodes.add(aircraft.icaoCode);
    }
    groupedAircraft[typeKey].variants.push(aircraft);
  });

  // Get condition class
  function getConditionClass(conditionPercent) {
    if (conditionPercent >= 90) return 'cond-excellent';
    if (conditionPercent >= 70) return 'cond-good';
    if (conditionPercent >= 50) return 'cond-fair';
    return 'cond-poor';
  }

  // Convert condition to percentage
  function conditionToPercentage(condition) {
    switch(condition) {
      case 'New': return 100;
      case 'Excellent': return 90;
      case 'Very Good': return 80;
      case 'Good': return 70;
      case 'Fair': return 60;
      case 'Poor': return 40;
      default: return 50;
    }
  }

  // Generate HTML - wrap in 2-column grid
  let html = '<div class="market-grid-wrapper">';
  const sortedTypes = Object.keys(groupedAircraft).sort();

  sortedTypes.forEach((typeKey) => {
    const typeData = groupedAircraft[typeKey];
    const variantCount = typeData.variants.length;

    // Start type group container
    html += `<div class="market-type-group">`;

    // Type header
    const icaoCodesStr = typeData.icaoCodes.size > 0 ? Array.from(typeData.icaoCodes).join('/') : '';
    html += `
      <div class="market-type-header">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <h3>${typeKey}</h3>
          ${icaoCodesStr ? `<span style="font-size: 0.7rem; color: var(--text-muted); font-family: monospace;">${icaoCodesStr}</span>` : ''}
        </div>
        <span class="type-badge">${typeData.type}</span>
      </div>
    `;

    // Specs bar
    html += `
      <div class="market-specs">
        <span><strong>${typeData.passengerCapacity || 'N/A'}</strong> pax</span>
        <span><strong>${typeData.rangeNm || 'N/A'}</strong> nm</span>
        <span style="margin-left: auto; color: var(--text-secondary);">${variantCount} variant${variantCount !== 1 ? 's' : ''}</span>
      </div>
    `;

    // Column headers
    html += `
      <div class="market-header">
        <span>VARIANT</span>
        <span>AGE</span>
        <span>COND</span>
        <span>PURCHASE</span>
        <span>LEASE/WK</span>
        <span></span>
      </div>
    `;

    // Aircraft rows
    typeData.variants.forEach(aircraft => {
      const ageDisplay = aircraft.age !== undefined ? `${aircraft.age}y` : 'New';
      const conditionPercent = aircraft.conditionPercentage || conditionToPercentage(aircraft.condition || 'New');
      const variantName = aircraft.variant || 'Base';
      const icaoCode = aircraft.icaoCode || '';
      const lessorName = aircraft.lessor?.shortName || '';
      const isPlayer = aircraft.isPlayerListing;
      const playerType = aircraft.playerListingType; // 'sale' or 'lease'

      // Seller label: player listings show airline name in distinct color
      let sellerLabel = '';
      if (isPlayer) {
        const labelColor = playerType === 'sale' ? '#f59e0b' : '#a855f7';
        const labelText = playerType === 'sale' ? 'Seller' : 'Lessor';
        sellerLabel = `<div style="font-size: 0.55rem; color: ${labelColor}; margin-top: 0.1rem;">${labelText}: ${lessorName}</div>`;
      } else if (lessorName && currentCategory !== 'new') {
        sellerLabel = `<div style="font-size: 0.55rem; color: var(--accent-color); margin-top: 0.1rem;">Lease: ${lessorName}</div>`;
      }

      // Price display: player listings only show their listing type
      const purchaseDisplay = aircraft.purchasePrice ? `$${formatCurrencyShort(aircraft.purchasePrice)}` : '—';
      const leaseDisplay = aircraft.leasePrice ? `$${formatCurrencyShort(aircraft.leasePrice)}` : '—';
      const purchaseColor = aircraft.purchasePrice ? 'var(--success-color)' : 'var(--text-muted)';
      const leaseColor = aircraft.leasePrice ? 'var(--accent-color)' : 'var(--text-muted)';

      html += `
        <div class="market-row" onclick="showAircraftDetails('${aircraft.id}')"${isPlayer ? ' style="border-left: 2px solid ' + (playerType === 'sale' ? '#f59e0b' : '#a855f7') + ';"' : ''}>
          <div class="market-cell market-variant" style="flex-direction: column; align-items: flex-start;">
            <div>
              ${variantName}
              ${icaoCode ? `<span style="font-size: 0.65rem; color: var(--text-muted); margin-left: 0.25rem; font-family: monospace;">${icaoCode}</span>` : ''}
            </div>
            ${sellerLabel}
          </div>
          <div class="market-cell">${ageDisplay}</div>
          <div class="market-cell">
            <span class="status-badge ${getConditionClass(conditionPercent)}">${conditionPercent}%</span>
          </div>
          <div class="market-cell" style="color: ${purchaseColor}; font-weight: 600;">${purchaseDisplay}</div>
          <div class="market-cell" style="color: ${leaseColor}; font-weight: 600;">${leaseDisplay}${aircraft.leasePrice ? '<span style="font-size: 0.6rem; color: var(--text-muted); font-weight: 400;">/wk</span>' : ''}</div>
          <div class="market-cell">
            <button class="btn btn-primary" style="padding: 0.2rem 0.4rem; font-size: 0.65rem;" onclick="event.stopPropagation(); showAircraftDetails('${aircraft.id}')">VIEW</button>
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

// Format currency short (e.g., 125M, 2.5M, 850K)
function formatCurrencyShort(amount) {
  const numAmount = Number(amount) || 0;
  if (numAmount >= 1000000000) {
    return (numAmount / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (numAmount >= 1000000) {
    return (numAmount / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (numAmount >= 1000) {
    return (numAmount / 1000).toFixed(0) + 'K';
  }
  return numAmount.toString();
}

// Format currency for display
function formatCurrency(amount) {
  const numAmount = Number(amount) || 0;
  return numAmount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

// Populate manufacturer filter dropdown from loaded aircraft data
function populateManufacturerFilter(aircraft) {
  const select = document.getElementById('manufacturerFilter');
  const manufacturers = [...new Set(aircraft.map(a => a.manufacturer).filter(Boolean))].sort();
  // Keep the "All Manufacturers" option, remove any old dynamic options
  select.length = 1;
  manufacturers.forEach(m => {
    const option = document.createElement('option');
    option.value = m;
    option.textContent = m;
    select.appendChild(option);
  });
}

// Search aircraft
function searchAircraft() {
  const searchTerm = document.getElementById('searchAircraftInput').value.toLowerCase();

  if (!searchTerm) {
    displayAircraft(allAircraft);
    return;
  }

  const filteredAircraft = allAircraft.filter(aircraft =>
    (aircraft.model && aircraft.model.toLowerCase().includes(searchTerm)) ||
    (aircraft.manufacturer && aircraft.manufacturer.toLowerCase().includes(searchTerm)) ||
    (aircraft.type && aircraft.type.toLowerCase().includes(searchTerm)) ||
    (aircraft.variant && aircraft.variant.toLowerCase().includes(searchTerm)) ||
    (aircraft.icaoCode && aircraft.icaoCode.toLowerCase().includes(searchTerm)) ||
    (aircraft.description && aircraft.description.toLowerCase().includes(searchTerm))
  );

  displayAircraft(filteredAircraft);
}

// Filter aircraft by multiple criteria
function filterAircraft() {
  const manufacturer = document.getElementById('manufacturerFilter').value;
  const type = document.getElementById('typeFilter').value;
  const range = document.getElementById('rangeFilter').value;

  let filteredAircraft = [...allAircraft];

  if (manufacturer) {
    filteredAircraft = filteredAircraft.filter(aircraft =>
      aircraft.manufacturer === manufacturer
    );
  }

  if (type) {
    filteredAircraft = filteredAircraft.filter(aircraft =>
      aircraft.type === type
    );
  }

  if (range) {
    filteredAircraft = filteredAircraft.filter(aircraft =>
      aircraft.rangeCategory === range
    );
  }

  displayAircraft(filteredAircraft);
}

// Show aircraft details in modal
function showAircraftDetails(aircraftId) {
  const aircraft = allAircraft.find(a => a.id === aircraftId);

  if (!aircraft) return;

  // Store selected aircraft for purchase/lease
  selectedAircraft = aircraft;
  purchaseQuantity = 1; // Reset quantity on each detail view
  selectedCabinConfig = null; // Reset cabin config
  selectedCargoConfig = null; // Reset cargo config
  window.selectedCabinConfig = null;
  window.selectedCargoConfig = null;
  selectedFinancingMethod = 'cash'; // Reset financing state
  selectedBankId = null;
  selectedLoanTermWeeks = 156;

  const conditionPercent = aircraft.conditionPercentage || (aircraft.condition === 'New' ? 100 : 70);
  const ageYears = aircraft.age !== undefined ? aircraft.age : 0;
  const isNew = currentCategory === 'new';

  const detailContent = document.getElementById('aircraftDetailContent');
  const acImgBase = '/api/aircraft/image/';
  const acImgCodes = getAircraftImageCodes(aircraft);
  detailContent.innerHTML = `
    <!-- Main content: Image left, details right -->
    <div style="display: flex; gap: 1rem; margin-bottom: 0.6rem;">
      <div style="width: 300px; flex-shrink: 0; display: flex; flex-direction: column; gap: 0.4rem;">
        <div id="acImageContainer" style="width: 300px; min-height: 180px; flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid var(--border-color); border-radius: 6px; background: var(--surface-elevated);">
          ${acImgCodes.length > 0 ? `<img src="${acImgBase}${acImgCodes[0]}" alt="${aircraft.manufacturer} ${aircraft.model}" style="max-width: 100%; max-height: 100%; object-fit: contain; filter: invert(1); mix-blend-mode: screen;"
            data-fallbacks='${JSON.stringify(acImgCodes.slice(1))}' data-base-url="${acImgBase}"
            onerror="var fb=JSON.parse(this.dataset.fallbacks);if(fb.length>0){this.dataset.fallbacks=JSON.stringify(fb.slice(1));this.src=this.dataset.baseUrl+fb[0];}else{this.parentElement.innerHTML='<span style=\\'color:var(--text-muted);font-size:0.75rem;\\'>No image</span>';}">` : `<span style="color: var(--text-muted); font-size: 0.75rem;">No image</span>`}
        </div>
        ${aircraft.description ? `<div style="font-size: 0.7rem; color: var(--text-secondary); line-height: 1.3;">${aircraft.description}</div>` : ''}
      </div>
      <div style="flex: 1; display: flex; flex-direction: column; gap: 0.4rem;">
        <!-- Type Badges -->
        <div style="display: flex; gap: 0.3rem; flex-wrap: wrap;">
          <span style="background: rgba(59, 130, 246, 0.15); color: var(--accent-color); padding: 0.15rem 0.5rem; border-radius: 3px; font-size: 0.65rem; font-weight: 600;">${aircraft.type}</span>
          <span style="background: rgba(16, 185, 129, 0.15); color: #10b981; padding: 0.15rem 0.5rem; border-radius: 3px; font-size: 0.65rem; font-weight: 600;">${aircraft.rangeCategory}</span>
          ${aircraft.icaoCode ? `<span style="background: rgba(139, 92, 246, 0.15); color: #8b5cf6; padding: 0.15rem 0.5rem; border-radius: 3px; font-size: 0.65rem; font-weight: 600; font-family: monospace;">${aircraft.icaoCode}</span>` : ''}
        </div>

        <!-- Specifications Grid -->
        <div style="background: var(--surface-elevated); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.4rem;">
          <h4 style="margin: 0 0 0.3rem 0; color: var(--text-muted); font-size: 0.55rem; text-transform: uppercase; letter-spacing: 0.5px;">Specifications</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.25rem;">
            <div style="padding: 0.25rem; background: var(--surface); border-radius: 3px;">
              <div style="color: var(--text-muted); font-size: 0.5rem; text-transform: uppercase;">Pax</div>
              <div style="color: var(--text-primary); font-weight: 700; font-size: 0.85rem;">${aircraft.passengerCapacity || 'N/A'}</div>
            </div>
            <div style="padding: 0.25rem; background: var(--surface); border-radius: 3px;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="color: var(--text-muted); font-size: 0.5rem; text-transform: uppercase;">Range</div>
                <button onclick="showRangeMap(${aircraft.rangeNm || 0})" title="Show range map" style="background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.35);border-radius:3px;padding:0.1rem 0.35rem;cursor:pointer;color:#10b981;font-size:0.55rem;font-weight:600;font-family:system-ui,sans-serif;letter-spacing:0.3px;line-height:1.4;" onmouseover="this.style.background='rgba(16,185,129,0.22)'" onmouseout="this.style.background='rgba(16,185,129,0.12)'">MAP</button>
              </div>
              <div style="color: var(--text-primary); font-weight: 700; font-size: 0.85rem;">${aircraft.rangeNm || 'N/A'}<span style="font-size: 0.5rem; font-weight: 400;">nm</span></div>
            </div>
            <div style="padding: 0.25rem; background: var(--surface); border-radius: 3px;">
              <div style="color: var(--text-muted); font-size: 0.5rem; text-transform: uppercase;">Speed</div>
              <div style="color: var(--text-primary); font-weight: 700; font-size: 0.85rem;">${aircraft.cruiseSpeed || 'N/A'}<span style="font-size: 0.5rem; font-weight: 400;">kts</span></div>
            </div>
            <div style="padding: 0.25rem; background: var(--surface); border-radius: 3px;">
              <div style="color: var(--text-muted); font-size: 0.5rem; text-transform: uppercase;">Fuel</div>
              <div style="color: var(--text-primary); font-weight: 700; font-size: 0.85rem;">${aircraft.fuelBurnPerHour ? Math.round(aircraft.fuelBurnPerHour) : 'N/A'}<span style="font-size: 0.5rem; font-weight: 400;">L/h</span></div>
            </div>
            <div style="padding: 0.25rem; background: var(--surface); border-radius: 3px;">
              <div style="color: var(--text-muted); font-size: 0.5rem; text-transform: uppercase;">Cargo</div>
              <div style="color: var(--text-primary); font-weight: 700; font-size: 0.85rem;">${aircraft.cargoCapacityKg ? (aircraft.cargoCapacityKg / 1000).toFixed(1) : 'N/A'}<span style="font-size: 0.5rem; font-weight: 400;">t</span></div>
            </div>
            <div style="padding: 0.25rem; background: var(--surface); border-radius: 3px;">
              <div style="color: var(--text-muted); font-size: 0.5rem; text-transform: uppercase;">Maint</div>
              <div style="color: var(--text-primary); font-weight: 700; font-size: 0.85rem;">$${formatCurrencyShort(Math.round((aircraft.maintenanceCostPerMonth || (aircraft.maintenanceCostPerHour || 0) * 56) / 4.33))}<span style="font-size: 0.5rem; font-weight: 400;">/wk</span></div>
            </div>
          </div>
        </div>

        <!-- Condition & Checks (for used aircraft) -->
        ${!isNew ? `
        <div style="background: var(--surface-elevated); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.4rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 0.25rem;">
            <div style="text-align: center; padding: 0.25rem; background: var(--surface); border-radius: 3px;">
              <div style="color: var(--text-muted); font-size: 0.5rem; text-transform: uppercase;">Age</div>
              <div style="color: var(--text-primary); font-weight: 700; font-size: 0.85rem;">${ageYears}<span style="font-size: 0.55rem; font-weight: 400;">y</span></div>
            </div>
            <div style="text-align: center; padding: 0.25rem; background: var(--surface); border-radius: 3px;">
              <div style="color: var(--text-muted); font-size: 0.5rem; text-transform: uppercase;">Cond</div>
              <div style="color: ${conditionPercent >= 80 ? '#10b981' : conditionPercent >= 60 ? '#f59e0b' : '#ef4444'}; font-weight: 700; font-size: 0.85rem;">${conditionPercent}%</div>
            </div>
            <div style="padding: 0.25rem; background: rgba(220, 38, 38, 0.1); border: 1px solid rgba(220, 38, 38, 0.3); border-radius: 3px;">
              <div style="color: #DC2626; font-size: 0.5rem; font-weight: 600;">C CHECK</div>
              <div style="color: ${aircraft.cCheckRemainingDays < 180 ? '#DC2626' : 'var(--text-primary)'}; font-weight: 600; font-size: 0.75rem;">${aircraft.cCheckRemaining || 'Full'}</div>
              ${aircraft.cCheckCost ? `<div style="color: var(--text-muted); font-size: 0.45rem;">$${formatCurrencyShort(aircraft.cCheckCost)}</div>` : ''}
            </div>
            <div style="padding: 0.25rem; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 3px;">
              <div style="color: #10B981; font-size: 0.5rem; font-weight: 600;">D CHECK</div>
              <div style="color: ${aircraft.dCheckRemainingDays < 365 ? '#FFA500' : 'var(--text-primary)'}; font-weight: 600; font-size: 0.75rem;">${aircraft.dCheckRemaining || 'Full'}</div>
              ${aircraft.dCheckCost ? `<div style="color: var(--text-muted); font-size: 0.45rem;">$${formatCurrencyShort(aircraft.dCheckCost)}</div>` : ''}
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Check Costs -->
        ${aircraft.dailyCheckCost ? `
        <div style="background: var(--surface-elevated); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.4rem;">
          <h4 style="margin: 0 0 0.25rem 0; color: var(--text-muted); font-size: 0.55rem; text-transform: uppercase; letter-spacing: 0.5px;">Check Costs</h4>
          <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.25rem;">
            <div style="padding: 0.2rem; background: var(--surface); border-radius: 3px; text-align: center;">
              <div style="color: var(--text-muted); font-size: 0.45rem; text-transform: uppercase;">Daily</div>
              <div style="color: var(--text-primary); font-weight: 600; font-size: 0.7rem;">$${formatCurrencyShort(aircraft.dailyCheckCost)}</div>
            </div>
            <div style="padding: 0.2rem; background: var(--surface); border-radius: 3px; text-align: center;">
              <div style="color: var(--text-muted); font-size: 0.45rem; text-transform: uppercase;">Weekly</div>
              <div style="color: var(--text-primary); font-weight: 600; font-size: 0.7rem;">$${formatCurrencyShort(aircraft.weeklyCheckCost)}</div>
            </div>
            <div style="padding: 0.2rem; background: var(--surface); border-radius: 3px; text-align: center;">
              <div style="color: var(--text-muted); font-size: 0.45rem; text-transform: uppercase;">A Check</div>
              <div style="color: var(--text-primary); font-weight: 600; font-size: 0.7rem;">$${formatCurrencyShort(aircraft.aCheckCost)}</div>
            </div>
            <div style="padding: 0.2rem; background: var(--surface); border-radius: 3px; text-align: center;">
              <div style="color: var(--text-muted); font-size: 0.45rem; text-transform: uppercase;">C Check</div>
              <div style="color: #DC2626; font-weight: 600; font-size: 0.7rem;">$${formatCurrencyShort(aircraft.cCheckCost)}</div>
            </div>
            <div style="padding: 0.2rem; background: var(--surface); border-radius: 3px; text-align: center;">
              <div style="color: var(--text-muted); font-size: 0.45rem; text-transform: uppercase;">D Check</div>
              <div style="color: #f59e0b; font-weight: 600; font-size: 0.7rem;">$${formatCurrencyShort(aircraft.dCheckCost)}</div>
            </div>
          </div>
        </div>
        ` : ''}

      </div>
    </div>

    ${aircraft.isPlayerListing ? `
    <div style="background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 6px; padding: 0.5rem 0.75rem; margin-bottom: 0.6rem; font-size: 0.7rem; color: #a855f7;">
      <strong>Player Listing</strong> — ${aircraft.seller?.name || 'Another airline'}
    </div>
    ` : ''}

    ${(aircraft.type !== 'Cargo' || aircraft.cargoCapacityKg > 0) ? `
    <div style="font-size: 0.6rem; font-weight: 700; color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: 0.3rem;">REQUIRED BEFORE PURCHASE</div>
    ` : ''}

    ${aircraft.type !== 'Cargo' && aircraft.passengerCapacity > 0 ? `
    <div id="cabinConfigBtn" onclick="openCabinConfigurator()" style="background: rgba(239, 68, 68, 0.06); border: 2px solid rgba(239, 68, 68, 0.4); border-radius: 6px; padding: 0.5rem 0.7rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;" onmouseover="var d=window.selectedCabinConfig;this.style.borderColor=d?'#10B981':'#EF4444';this.style.background=d?'rgba(16,185,129,0.12)':'rgba(239,68,68,0.1)'" onmouseout="var d=window.selectedCabinConfig;this.style.borderColor=d?'rgba(16,185,129,0.4)':'rgba(239,68,68,0.4)';this.style.background=d?'rgba(16,185,129,0.06)':'rgba(239,68,68,0.06)'">
      <div id="cabinConfigCheck" style="width: 20px; height: 20px; border: 2px solid rgba(239, 68, 68, 0.5); border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 0.7rem;"></div>
      <div style="flex: 1;">
        <div style="color: #EF4444; font-weight: 700; font-size: 0.75rem;">Configure Cabin</div>
        <div id="cabinConfigSummary" style="color: var(--text-muted); font-size: 0.55rem;">Required — set seat layout</div>
      </div>
      <div style="color: rgba(239, 68, 68, 0.6); font-size: 0.9rem;">&#9654;</div>
    </div>
    ` : ''}

    ${aircraft.cargoCapacityKg > 0 ? `
    <div id="cargoConfigBtn" onclick="openCargoConfigurator()" style="background: rgba(239, 68, 68, 0.06); border: 2px solid rgba(239, 68, 68, 0.4); border-radius: 6px; padding: 0.5rem 0.7rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;" onmouseover="var d=window.selectedCargoConfig;this.style.borderColor=d?'#10B981':'#EF4444';this.style.background=d?'rgba(16,185,129,0.12)':'rgba(239,68,68,0.1)'" onmouseout="var d=window.selectedCargoConfig;this.style.borderColor=d?'rgba(16,185,129,0.4)':'rgba(239,68,68,0.4)';this.style.background=d?'rgba(16,185,129,0.06)':'rgba(239,68,68,0.06)'">
      <div id="cargoConfigCheck" style="width: 20px; height: 20px; border: 2px solid rgba(239, 68, 68, 0.5); border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 0.7rem;"></div>
      <div style="flex: 1;">
        <div style="color: #EF4444; font-weight: 700; font-size: 0.75rem;">Configure Cargo</div>
        <div id="cargoConfigSummary" style="color: var(--text-muted); font-size: 0.55rem;">Required — set cargo allocation</div>
      </div>
      <div style="color: rgba(239, 68, 68, 0.6); font-size: 0.9rem;">&#9654;</div>
    </div>
    ` : ''}

    <!-- Bottom: Purchase & Lease side by side -->
    ${isNew && !aircraft.isPlayerListing ? `
    ${buildNewAircraftAcquisitionCards(aircraft)}
    ` : `
    <div style="display: grid; grid-template-columns: ${aircraft.purchasePrice && aircraft.leasePrice ? '1fr 1fr' : '1fr'}; gap: 0.5rem;">
      ${aircraft.purchasePrice ? `
      <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%); border: 2px solid rgba(16, 185, 129, 0.3); border-radius: 6px; padding: 0.5rem 0.6rem; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='#10b981'; this.style.transform='translateY(-1px)'" onmouseout="this.style.borderColor='rgba(16, 185, 129, 0.3)'; this.style.transform='none'" onclick="processPurchase()">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
          <div>
            <div style="color: #10b981; font-weight: 700; font-size: 0.8rem;">PURCHASE</div>
            <div style="color: var(--text-muted); font-size: 0.6rem;">${aircraft.isPlayerListing ? 'Buy from ' + (aircraft.seller?.name || 'player') : 'Own outright'}</div>
            ${aircraft.seller ? `<div style="color: var(--text-muted); font-size: 0.55rem;">From: <strong style="color: var(--text-primary);">${aircraft.seller.shortName}</strong> ${aircraft.seller.country ? `<span style="font-size: 0.5rem;">${aircraft.seller.country}</span>` : ''}</div>` : ''}
          </div>
          <div style="color: #10b981; font-weight: 700; font-size: 1.1rem;">$${formatCurrencyShort(aircraft.purchasePrice)}</div>
        </div>
        <div style="font-size: 0.55rem; color: var(--text-secondary);">
          ✓ Full ownership &nbsp; ✓ No weekly fees &nbsp; ✓ Sell anytime
        </div>
      </div>
      ` : ''}

      ${aircraft.leasePrice ? `
      <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%); border: 2px solid rgba(59, 130, 246, 0.3); border-radius: 6px; padding: 0.5rem 0.6rem; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='#3b82f6'; this.style.transform='translateY(-1px)'" onmouseout="this.style.borderColor='rgba(59, 130, 246, 0.3)'; this.style.transform='none'" onclick="processLease()">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
          <div>
            <div style="color: #3b82f6; font-weight: 700; font-size: 0.8rem;">LEASE</div>
            <div style="color: var(--text-muted); font-size: 0.6rem;">${aircraft.isPlayerListing ? 'Lease from ' + (aircraft.lessor?.name || 'player') : '3 year minimum'}</div>
          </div>
          <div style="color: #3b82f6; font-weight: 700; font-size: 1.1rem;">$${formatCurrencyShort(aircraft.leasePrice)}<span style="font-size: 0.65rem; font-weight: 400;">/wk</span></div>
        </div>
        ${aircraft.lessor ? `
        <div style="font-size: 0.55rem; color: var(--text-muted); margin-bottom: 0.2rem;">
          <span style="color: var(--text-secondary);">${aircraft.lessor.isPlayer ? 'Owner:' : 'Lessor:'}</span> <strong style="color: var(--text-primary);">${aircraft.lessor.shortName}</strong>
          ${aircraft.lessor.country ? `<span style="color: var(--text-muted); font-size: 0.5rem;">${aircraft.lessor.country}</span>` : ''}
        </div>
        ` : ''}
        <div style="font-size: 0.55rem; color: var(--text-secondary);">
          ✓ Lower upfront &nbsp; ✓ Flexible &nbsp; ✓ Available now
        </div>
      </div>
      ` : ''}
    </div>
    `}
  `;

  const fullName = `${aircraft.manufacturer} ${aircraft.model}${aircraft.variant ? ' ' + aircraft.variant : ''}`;
  document.getElementById('detailModalTitle').textContent = fullName;
  document.getElementById('aircraftDetailModal').style.display = 'flex';

  // Hide the default purchase button since we have inline buttons now
  const purchaseBtn = document.getElementById('purchaseAircraftBtn');
  if (purchaseBtn) {
    purchaseBtn.style.display = 'none';
  }
}

// Transaction discount: 0% for single, scaling to 55% at qty 10+
function transactionDiscountPercent(qty) {
  if (qty <= 1) return 0;
  return Math.round(Math.min(55, ((qty - 1) / 9) * 55));
}
function transactionUnitPrice(listPrice, qty) {
  return Math.round(listPrice * (1 - transactionDiscountPercent(qty) / 100));
}

// Client-side loan payment calculator (mirrors bankConfig.calculateFixedPayment)
function calculateWeeklyLoanPayment(principal, annualRate, termWeeks) {
  const weeklyRate = annualRate / 100 / 52;
  if (weeklyRate === 0) return Math.round(principal / termWeeks * 100) / 100;
  const payment = principal * (weeklyRate * Math.pow(1 + weeklyRate, termWeeks)) /
    (Math.pow(1 + weeklyRate, termWeeks) - 1);
  return Math.round(payment * 100) / 100;
}

// Cached bank offers for financing selector
let cachedBankOffers = null;
async function fetchBankOffers() {
  if (cachedBankOffers) return cachedBankOffers;
  try {
    const resp = await fetch('/api/loans/offers');
    if (resp.ok) {
      cachedBankOffers = await resp.json();
      return cachedBankOffers;
    }
  } catch (e) { console.error('Error fetching bank offers:', e); }
  return null;
}

// Selected financing state
let selectedFinancingMethod = 'cash'; // 'cash' or 'loan'
let selectedBankId = null;
let selectedLoanTermWeeks = 156; // default 3 years
let playerBalance = 0; // Updated by fetchWorldInfo()

// Build compact acquisition buttons for the detail modal (ORDER + LEASE)
function buildNewAircraftAcquisitionCards(aircraft) {
  const listPrice = aircraft.purchasePrice;
  const txnPrice = transactionUnitPrice(listPrice, 1);
  const discPct = transactionDiscountPercent(1);

  return `
    <div style="display: grid; grid-template-columns: ${aircraft.leasePrice ? '1fr 1fr' : '1fr'}; gap: 0.5rem;">
      <!-- ORDER NEW button -->
      <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%); border: 2px solid rgba(16, 185, 129, 0.3); border-radius: 6px; padding: 0.6rem 0.75rem; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='#10b981'; this.style.transform='translateY(-1px)'" onmouseout="this.style.borderColor='rgba(16, 185, 129, 0.3)'; this.style.transform='none'" onclick="closeAircraftDetailModal(); showOrderDialog()">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem;">
          <div>
            <div style="color: #10b981; font-weight: 700; font-size: 0.85rem;">ORDER NEW</div>
            <div style="color: var(--text-muted); font-size: 0.6rem;">Own outright · Available immediately</div>
          </div>
          <div style="text-align: right;">
            <div style="color: #10b981; font-weight: 700; font-size: 1.1rem;">$${formatCurrencyShort(listPrice)}</div>
            <div style="color: var(--text-muted); font-size: 0.55rem;">Bulk discounts available</div>
          </div>
        </div>
        <div style="font-size: 0.55rem; color: var(--text-secondary);">
          ✓ Full ownership &nbsp; ✓ Sell anytime &nbsp; ✓ Residual value
        </div>
      </div>

      ${aircraft.leasePrice ? `
      <!-- OPERATING LEASE button -->
      <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%); border: 2px solid rgba(59, 130, 246, 0.3); border-radius: 6px; padding: 0.6rem 0.75rem; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='#3b82f6'; this.style.transform='translateY(-1px)'" onmouseout="this.style.borderColor='rgba(59, 130, 246, 0.3)'; this.style.transform='none'" onclick="processLease()">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem;">
          <div>
            <div style="color: #3b82f6; font-weight: 700; font-size: 0.85rem;">OPERATING LEASE</div>
            <div style="color: var(--text-muted); font-size: 0.6rem;">3-12 year term · Available now</div>
          </div>
          <div style="text-align: right;">
            <div style="color: #3b82f6; font-weight: 700; font-size: 1.1rem;">$${formatCurrencyShort(aircraft.leasePrice)}<span style="font-size: 0.65rem; font-weight: 400;">/wk</span></div>
            <div style="color: var(--text-muted); font-size: 0.55rem;">Bulk discounts available</div>
          </div>
        </div>
        <div style="font-size: 0.55rem; color: var(--text-secondary);">
          ✓ No deposit &nbsp; ✓ Flexible &nbsp; ✓ Lower capital
        </div>
      </div>
      ` : ''}
    </div>
  `;
}

// Get delivery delay in weeks for frontend display
function getDeliveryDelayWeeks(aircraft) {
  return 0; // 1st aircraft always immediate; bulk stagger handled separately
}

// Dedicated order dialog for new aircraft (replaces inline cards + multi-purchase dialog)
function showOrderDialog() {
  if (!selectedAircraft) return;
  const aircraft = selectedAircraft;
  const listPrice = aircraft.purchasePrice;
  const conditionPercent = aircraft.conditionPercentage || (aircraft.condition === 'New' ? 100 : 70);

  const fullName = aircraft.variant
    ? `${aircraft.manufacturer} ${aircraft.model}${aircraft.variant.startsWith('-') ? aircraft.variant : '-' + aircraft.variant}`
    : `${aircraft.manufacturer} ${aircraft.model}`;

  // Local order state
  let orderQty = 1;
  let orderFinancing = 'cash';
  let orderBankId = null;
  let orderTermWeeks = 156;

  function discPct() { return transactionDiscountPercent(orderQty); }
  function unitPrice() { return transactionUnitPrice(listPrice, orderQty); }
  function depositPer() { return Math.round(unitPrice() * 0.30); }
  function totalDeposit() { return depositPer() * orderQty; }

  const overlay = document.createElement('div');
  overlay.id = 'orderDialogOverlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.8); z-index: 2000;
    display: flex; justify-content: center; align-items: center;
    overflow-y: auto; padding: 2rem 0;
  `;

  function renderDialog() {
    const deliveryNote = orderQty > 1 ? `1st immediate, then 1/week (${orderQty - 1} more)` : 'Available immediately';

    overlay.innerHTML = `
      <div style="background: var(--surface); border: 1px solid var(--accent-color); border-radius: 8px; padding: 1.5rem; width: 95%; max-width: 1050px; margin: auto;">
        <h2 style="margin: 0 0 1rem 0; color: var(--accent-color); text-align: center; font-size: 1.2rem;">ORDER NEW AIRCRAFT</h2>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
          <!-- Left Column -->
          <div>
            <!-- Aircraft Info -->
            <div style="margin-bottom: 1rem; padding: 0.75rem; background: var(--surface-elevated); border-radius: 6px;">
              <h3 style="margin: 0 0 0.5rem 0; color: var(--text-primary); font-size: 1rem;">${fullName}</h3>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; font-size: 0.85rem;">
                <div><span style="color: var(--text-muted);">Type:</span> <strong>${aircraft.type}</strong></div>
                <div><span style="color: var(--text-muted);">Pax:</span> <strong>${aircraft.passengerCapacity || 0}</strong></div>
                <div><span style="color: var(--text-muted);">Range:</span> <strong>${aircraft.rangeNm || 0}nm</strong></div>
              </div>
            </div>

            <!-- Pricing -->
            <div style="margin-bottom: 1rem; padding: 0.75rem; background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.03) 100%); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 6px;">
              <div id="orderListPriceRow" style="display: none; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <span style="color: var(--text-muted); font-size: 0.8rem;">List Price</span>
                <span style="color: var(--text-muted); font-size: 0.9rem; text-decoration: line-through;">$${formatCurrencyShort(listPrice)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <span id="orderPriceLabel" style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem;">Unit Price</span>
                <div style="text-align: right;">
                  <span id="orderUnitPrice" style="color: #10b981; font-weight: 700; font-size: 1.3rem;">$${formatCurrencyShort(unitPrice())}</span>
                  <span id="orderDiscBadge" style="color: #F59E0B; font-size: 0.75rem; font-weight: 600; margin-left: 0.3rem; display: none;"></span>
                </div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.5rem; border-top: 1px solid rgba(16, 185, 129, 0.15);">
                <span style="color: var(--text-secondary); font-size: 0.85rem;">30% Deposit</span>
                <span id="orderDepositDisplay" style="color: #10b981; font-weight: 700; font-size: 1.1rem;">$${formatCurrencyShort(totalDeposit())}</span>
              </div>
            </div>

            <!-- Quantity Selector -->
            <div style="margin-bottom: 1rem; padding: 0.75rem; background: var(--surface-elevated); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem;">Quantity</div>
                  <div id="orderDeliveryNote" style="color: var(--text-muted); font-size: 0.75rem;">${deliveryNote}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.6rem;">
                  <button id="orderQtyDown" style="width: 32px; height: 32px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--surface); color: var(--text-primary); cursor: pointer; font-size: 1.1rem; font-weight: 700; display: flex; align-items: center; justify-content: center;">\u2212</button>
                  <span id="orderQtyDisplay" style="font-weight: 700; font-size: 1.3rem; color: var(--text-primary); min-width: 2rem; text-align: center;">${orderQty}</span>
                  <button id="orderQtyUp" style="width: 32px; height: 32px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--surface); color: var(--text-primary); cursor: pointer; font-size: 1.1rem; font-weight: 700; display: flex; align-items: center; justify-content: center;">+</button>
                </div>
              </div>
            </div>

            <!-- Financing Method -->
            <div>
              <div style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 0.5rem;">Payment at Delivery</div>
              <div style="display: flex; gap: 0.5rem;">
                <button id="orderCashBtn" style="flex: 1; padding: 0.5rem; border: 2px solid ${orderFinancing === 'cash' ? '#10b981' : 'var(--border-color)'}; border-radius: 6px; background: ${orderFinancing === 'cash' ? 'rgba(16, 185, 129, 0.1)' : 'transparent'}; color: ${orderFinancing === 'cash' ? '#10b981' : 'var(--text-muted)'}; font-size: 0.85rem; font-weight: 600; cursor: pointer;">CASH AT DELIVERY</button>
                <button id="orderLoanBtn" style="flex: 1; padding: 0.5rem; border: 2px solid ${orderFinancing === 'loan' ? '#3b82f6' : 'var(--border-color)'}; border-radius: 6px; background: ${orderFinancing === 'loan' ? 'rgba(59, 130, 246, 0.1)' : 'transparent'}; color: ${orderFinancing === 'loan' ? '#3b82f6' : 'var(--text-muted)'}; font-size: 0.85rem; font-weight: 600; cursor: pointer;">FINANCE WITH LOAN</button>
              </div>
            </div>
          </div>

          <!-- Right Column -->
          <div>
            <!-- Order Terms -->
            <div style="margin-bottom: 1rem; padding: 0.75rem; background: var(--surface-elevated); border-radius: 6px;">
              <h4 style="margin: 0 0 0.5rem 0; color: var(--text-muted); font-size: 0.7rem; text-transform: uppercase;">Order Terms</h4>
              <ul style="margin: 0; padding-left: 1rem; font-size: 0.8rem; color: var(--text-secondary);">
                <li>30% deposit charged now, remaining 70% due at delivery</li>
                <li>Cancellation forfeits deposit (no refund)</li>
                <li>${orderQty > 1 ? `Staggered delivery: 1st immediate, then 1 per week` : 'Delivery: Available immediately'}</li>
              </ul>
            </div>

            <!-- Order Summary -->
            <div style="margin-bottom: 1rem; padding: 0.75rem; background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.03) 100%); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <span style="color: var(--text-muted); font-size: 0.85rem;">Aircraft</span>
                <span style="color: var(--text-primary); font-weight: 600;">${fullName} ${orderQty > 1 ? '<span id="orderSummaryQty">x' + orderQty + '</span>' : ''}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <span style="color: var(--text-muted); font-size: 0.85rem;">Payment Method</span>
                <span id="orderSummaryFinancing" style="color: var(--text-primary); font-weight: 600;">${orderFinancing === 'loan' ? 'Loan' : 'Cash at Delivery'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.4rem; border-top: 1px solid rgba(16, 185, 129, 0.15);">
                <span style="color: var(--text-primary); font-weight: 700; font-size: 0.95rem;">Deposit Due Now</span>
                <span id="orderSummaryDeposit" style="color: #10b981; font-weight: 700; font-size: 1.2rem;">$${formatCurrencyShort(totalDeposit())}</span>
              </div>
            </div>

            <!-- Insufficient Funds Warning -->
            <div id="orderFundsWarning" style="display: none; margin-bottom: 1rem; padding: 0.75rem; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px;">
              <div style="display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.5rem;">
                <span style="color: #EF4444; font-size: 1.1rem;">&#9888;</span>
                <span style="color: #EF4444; font-weight: 700; font-size: 0.9rem;">Insufficient Funds</span>
              </div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.4rem;">
                <span>Your balance: </span><strong id="orderPlayerBalance" style="color: var(--text-primary);">$0</strong><br>
                <span>Total cost (deposit + delivery): </span><strong id="orderTotalCost" style="color: #EF4444;">$0</strong><br>
                <span>Shortfall: </span><strong id="orderShortfall" style="color: #EF4444;">$0</strong>
              </div>
              <div style="font-size: 0.8rem; color: var(--text-muted); border-top: 1px solid rgba(239, 68, 68, 0.15); padding-top: 0.4rem; margin-top: 0.3rem;">
                <span id="orderFundsSuggestion">Consider <strong style="color: #3b82f6; cursor: pointer;" id="orderSwitchToLoan">financing with a loan</strong> to spread the remaining 70% over weekly payments, or browse <strong>used aircraft</strong> and <strong>operating leases</strong> for lower-cost options.</span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div style="display: flex; gap: 0.75rem;">
              <button id="orderConfirmBtn" class="btn btn-primary" style="flex: 1; padding: 0.75rem; font-size: 0.95rem;">Continue — Registration</button>
              <button id="orderCancelBtn" class="btn btn-secondary" style="flex: 1; padding: 0.75rem; font-size: 0.95rem;">Cancel</button>
            </div>
          </div>
        </div>

        <!-- Loan Details Panel (full width, below the grid) -->
        <div id="orderLoanPanel" style="display: ${orderFinancing === 'loan' ? 'block' : 'none'}; margin-top: 1rem; padding: 0.75rem; background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 6px;">
          <label style="color: var(--text-secondary); font-size: 0.8rem; display: block; margin-bottom: 0.4rem; font-weight: 600;">Select Bank</label>

          <!-- No bank can cover warning -->
          <div id="orderNoBankWarning" style="display: none; margin-bottom: 0.5rem; padding: 0.5rem; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 4px;">
            <div style="display: flex; align-items: center; gap: 0.3rem;">
              <span style="color: #EF4444; font-size: 1rem;">&#9888;</span>
              <span style="color: #EF4444; font-weight: 700; font-size: 0.8rem;">No bank can cover this loan</span>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">
              Loan needed: <strong id="orderLoanNeeded" style="color: #EF4444;">$0</strong>.
              Reduce quantity or consider cash / used aircraft.
            </div>
          </div>

          <!-- Bank cards grid (full width, 3 columns) -->
          <div id="orderBankCards" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem; margin-bottom: 0.6rem;">
            <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 0.6rem; font-size: 0.8rem;">Loading banks...</div>
          </div>

          <!-- Term slider + preview row -->
          <div style="display: flex; gap: 1rem; align-items: center;">
            <div style="flex: 1;">
              <label style="color: var(--text-secondary); font-size: 0.8rem; display: block; margin-bottom: 0.3rem;">Term (weeks)</label>
              <input id="orderTermInput" type="range" min="104" max="260" value="${orderTermWeeks}" step="26" style="width: 100%; accent-color: #3b82f6;">
              <div style="display: flex; justify-content: space-between; color: var(--text-muted); font-size: 0.75rem; margin-top: 0.2rem;">
                <span>2 yr</span>
                <span id="orderTermDisplay" style="color: #3b82f6; font-weight: 600;">${(orderTermWeeks / 52).toFixed(1)} yr</span>
                <span>5 yr</span>
              </div>
            </div>
            <div id="orderLoanPreview" style="color: #3b82f6; font-weight: 600; text-align: center; padding: 0.5rem 1rem; background: rgba(59, 130, 246, 0.1); border-radius: 4px; font-size: 0.85rem; min-width: 200px;">
              Calculating...
            </div>
          </div>
        </div>
      </div>
      <style>
        .toggle-switch input:checked + .toggle-slider { background-color: var(--accent-color); }
        .toggle-switch .toggle-slider:before {
          content: ""; position: absolute;
          height: calc(100% - 4px); aspect-ratio: 1;
          left: 2px; bottom: 2px;
          background-color: white; transition: 0.3s; border-radius: 50%;
        }
        .toggle-switch input:checked + .toggle-slider:before { transform: translateX(calc(100% - 2px)); }
      </style>
    `;
  }

  renderDialog();
  document.body.appendChild(overlay);

  // --- Dynamic UI updates ---
  function updatePricing() {
    const deliveryNote = orderQty > 1 ? `1st immediate, then 1/week (${orderQty - 1} more)` : 'Available immediately';
    const hasDiscount = discPct() > 0;
    const unitPriceEl = document.getElementById('orderUnitPrice');
    const discBadgeEl = document.getElementById('orderDiscBadge');
    const listPriceRow = document.getElementById('orderListPriceRow');
    const priceLabelEl = document.getElementById('orderPriceLabel');
    const depositEl = document.getElementById('orderDepositDisplay');
    const qtyEl = document.getElementById('orderQtyDisplay');
    const deliveryEl = document.getElementById('orderDeliveryNote');
    const confirmBtn = document.getElementById('orderConfirmBtn');

    if (unitPriceEl) unitPriceEl.textContent = '$' + formatCurrencyShort(unitPrice());
    if (listPriceRow) listPriceRow.style.display = hasDiscount ? 'flex' : 'none';
    if (priceLabelEl) priceLabelEl.textContent = hasDiscount ? 'Discounted Unit Price' : 'Unit Price';
    if (discBadgeEl) { discBadgeEl.textContent = '-' + discPct() + '%'; discBadgeEl.style.display = hasDiscount ? 'inline' : 'none'; }
    if (depositEl) depositEl.textContent = '$' + formatCurrencyShort(totalDeposit());
    if (qtyEl) qtyEl.textContent = orderQty;
    if (deliveryEl) deliveryEl.textContent = deliveryNote;
    // Update summary section
    const summaryQty = document.getElementById('orderSummaryQty');
    const summaryFinancing = document.getElementById('orderSummaryFinancing');
    const summaryDeposit = document.getElementById('orderSummaryDeposit');
    if (summaryQty) summaryQty.textContent = 'x' + orderQty;
    if (summaryFinancing) summaryFinancing.textContent = orderFinancing === 'loan' ? 'Loan' : 'Cash at Delivery';
    if (summaryDeposit) summaryDeposit.textContent = '$' + formatCurrencyShort(totalDeposit());

    if (orderFinancing === 'loan' && cachedBankOffers) renderBankCards();
    else updateLoanPreviewLocal();
    updateFundsWarning();
  }

  // --- Funds affordability check ---
  function updateFundsWarning() {
    const warningEl = document.getElementById('orderFundsWarning');
    const confirmBtn = document.getElementById('orderConfirmBtn');
    if (!warningEl) return;

    // Deposit is always due upfront regardless of financing method
    const deposit = totalDeposit();
    // Cash mode: need full cost (deposit + remaining 70%)
    // Loan mode: only need the deposit (loan covers the rest)
    const amountNeeded = orderFinancing === 'loan' ? deposit : unitPrice() * orderQty;
    const label = orderFinancing === 'loan' ? 'Deposit due now' : 'Total cost (deposit + delivery)';

    // Hide/show loan panel based on deposit affordability
    const loanPanel = document.getElementById('orderLoanPanel');
    const cantAffordDeposit = playerBalance < deposit;
    if (loanPanel && orderFinancing === 'loan') {
      loanPanel.style.display = cantAffordDeposit ? 'none' : 'block';
    }

    if (playerBalance >= amountNeeded) {
      warningEl.style.display = 'none';
      if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.style.opacity = '1'; }
    } else {
      warningEl.style.display = 'block';
      const balEl = document.getElementById('orderPlayerBalance');
      const costEl = document.getElementById('orderTotalCost');
      const shortEl = document.getElementById('orderShortfall');
      if (balEl) balEl.textContent = '$' + formatCurrencyShort(playerBalance);
      if (costEl) costEl.textContent = '$' + formatCurrencyShort(amountNeeded);
      if (shortEl) shortEl.textContent = '$' + formatCurrencyShort(amountNeeded - playerBalance);
      // Update the label text
      const costLabelEl = costEl?.previousElementSibling;
      if (costLabelEl) costLabelEl.textContent = label + ': ';
      if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.style.opacity = '0.5'; }
      // Update suggestion text based on financing mode
      const suggestionEl = document.getElementById('orderFundsSuggestion');
      if (suggestionEl) {
        if (orderFinancing === 'loan') {
          suggestionEl.innerHTML = 'Reduce the order quantity, or browse <strong>used aircraft</strong> and <strong>operating leases</strong> for lower-cost options.';
        } else {
          suggestionEl.innerHTML = 'Consider <strong style="color: #3b82f6; cursor: pointer;" id="orderSwitchToLoan">financing with a loan</strong> to spread the remaining 70% over weekly payments, or browse <strong>used aircraft</strong> and <strong>operating leases</strong> for lower-cost options.';
          document.getElementById('orderSwitchToLoan')?.addEventListener('click', switchToLoan);
        }
      }
    }
  }

  // --- Quantity ---
  document.getElementById('orderQtyDown').addEventListener('click', () => {
    if (orderQty <= 1) return;
    orderQty--;
    purchaseQuantity = orderQty;
    updatePricing();
  });
  document.getElementById('orderQtyUp').addEventListener('click', () => {
    if (orderQty >= 10) return;
    orderQty++;
    purchaseQuantity = orderQty;
    updatePricing();
  });

  // --- Financing ---
  document.getElementById('orderCashBtn').addEventListener('click', () => {
    orderFinancing = 'cash';
    selectedFinancingMethod = 'cash';
    const cashBtn = document.getElementById('orderCashBtn');
    const loanBtn = document.getElementById('orderLoanBtn');
    const loanPanel = document.getElementById('orderLoanPanel');
    cashBtn.style.border = '2px solid #10b981'; cashBtn.style.background = 'rgba(16, 185, 129, 0.1)'; cashBtn.style.color = '#10b981';
    loanBtn.style.border = '2px solid var(--border-color)'; loanBtn.style.background = 'transparent'; loanBtn.style.color = 'var(--text-muted)';
    if (loanPanel) loanPanel.style.display = 'none';
    updateFundsWarning();
    updatePricing();
  });

  function switchToLoan() {
    document.getElementById('orderLoanBtn')?.click();
  }

  document.getElementById('orderLoanBtn').addEventListener('click', () => {
    orderFinancing = 'loan';
    selectedFinancingMethod = 'loan';
    const cashBtn = document.getElementById('orderCashBtn');
    const loanBtn = document.getElementById('orderLoanBtn');
    const loanPanel = document.getElementById('orderLoanPanel');
    loanBtn.style.border = '2px solid #3b82f6'; loanBtn.style.background = 'rgba(59, 130, 246, 0.1)'; loanBtn.style.color = '#3b82f6';
    cashBtn.style.border = '2px solid var(--border-color)'; cashBtn.style.background = 'transparent'; cashBtn.style.color = 'var(--text-muted)';
    if (loanPanel) loanPanel.style.display = 'block';
    loadBankSelectorLocal();
    updateFundsWarning();
    updatePricing();
  });

  // Wire "financing with a loan" link in the funds warning
  document.getElementById('orderSwitchToLoan')?.addEventListener('click', switchToLoan);

  // --- Bank/Loan ---
  const riskColors = {
    conservative: { bg: 'rgba(46, 160, 67, 0.12)', color: '#2ea043', label: 'Conservative' },
    moderate: { bg: 'rgba(210, 153, 34, 0.12)', color: '#d29922', label: 'Moderate' },
    aggressive: { bg: 'rgba(248, 81, 73, 0.12)', color: '#f85149', label: 'Aggressive' }
  };

  function renderBankCards() {
    const container = document.getElementById('orderBankCards');
    const warningEl = document.getElementById('orderNoBankWarning');
    const loanNeededEl = document.getElementById('orderLoanNeeded');
    if (!container) return;

    const data = cachedBankOffers;
    if (!data || !data.offers || data.offers.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 0.6rem; font-size: 0.8rem;">No banks available.</div>';
      return;
    }

    const totalLoanNeeded = (unitPrice() - depositPer()) * orderQty;
    let anyAvailable = false;
    let html = '';

    for (const bank of data.offers) {
      const fleetType = bank.loanTypes?.find(lt => lt.type === 'fleet_expansion');
      const rate = fleetType?.rate || bank.loanTypes?.[1]?.rate || 0;
      const exceedsLimit = totalLoanNeeded > bank.maxLoanAmount;
      const creditTooLow = !bank.meetsRequirement;
      const disabled = exceedsLimit || creditTooLow;
      const isSelected = bank.bankId === orderBankId;
      if (!disabled) anyAvailable = true;

      const risk = riskColors[bank.riskAppetite] || riskColors.moderate;

      html += `
        <div class="order-bank-card${disabled ? ' disabled' : ''}" data-bank-id="${bank.bankId}"
             style="padding: 0.5rem 0.6rem; border: 2px solid ${isSelected && !disabled ? '#3b82f6' : disabled ? 'rgba(255,255,255,0.05)' : 'var(--border-color)'}; border-radius: 6px; background: ${isSelected && !disabled ? 'rgba(59, 130, 246, 0.08)' : disabled ? 'rgba(255,255,255,0.02)' : 'var(--surface-elevated)'}; cursor: ${disabled ? 'not-allowed' : 'pointer'}; opacity: ${disabled ? '0.45' : '1'}; transition: border-color 0.15s, background 0.15s;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <span style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">${bank.shortName}</span>
              <span style="font-size: 0.55rem; padding: 0.1rem 0.35rem; border-radius: 3px; font-weight: 600; background: ${risk.bg}; color: ${risk.color};">${risk.label}</span>
            </div>
            <span style="font-weight: 700; font-size: 0.9rem; color: ${disabled ? 'var(--text-muted)' : '#3b82f6'}; font-family: 'Courier New', monospace;">${rate.toFixed(1)}%</span>
          </div>
          <div style="display: flex; gap: 0.7rem; font-size: 0.7rem; color: var(--text-secondary); margin-bottom: 0.2rem;">
            <span>Max: <strong style="color: var(--text-primary);">$${formatCurrencyShort(bank.maxLoanAmount)}</strong></span>
            <span>Early fee: <strong style="color: var(--text-primary);">${bank.earlyRepaymentFee > 0 ? bank.earlyRepaymentFee + '%' : 'None'}</strong></span>
            <span>Holidays: <strong style="color: var(--text-primary);">${bank.paymentHolidays}</strong></span>
          </div>
          <div style="display: flex; gap: 0.25rem; flex-wrap: wrap;">
            ${(bank.features || []).map(f => `<span style="font-size: 0.55rem; padding: 0.08rem 0.3rem; border-radius: 3px; background: rgba(200,210,225,0.08); color: var(--text-secondary); font-weight: 600;">${f}</span>`).join('')}
          </div>
          ${exceedsLimit ? `<div style="margin-top: 0.25rem; font-size: 0.7rem; color: #EF4444; font-weight: 600;">&#9888; Exceeds max loan: $${formatCurrencyShort(bank.maxLoanAmount)} (need $${formatCurrencyShort(totalLoanNeeded)})</div>` : ''}
          ${creditTooLow ? `<div style="margin-top: 0.25rem; font-size: 0.7rem; color: var(--text-muted); font-weight: 600;">&#128274; Requires credit score ${bank.minCreditScore}+</div>` : ''}
        </div>`;
    }

    container.innerHTML = html;

    // Show/hide the "no bank can cover this" warning
    if (warningEl) {
      warningEl.style.display = anyAvailable ? 'none' : 'block';
      if (loanNeededEl) loanNeededEl.textContent = '$' + formatCurrencyShort(totalLoanNeeded);
    }

    // If current selection is now invalid, auto-select first available
    const currentValid = data.offers.find(b => b.bankId === orderBankId && b.meetsRequirement && totalLoanNeeded <= b.maxLoanAmount);
    if (!currentValid) {
      const firstValid = data.offers.find(b => b.meetsRequirement && totalLoanNeeded <= b.maxLoanAmount);
      if (firstValid) {
        orderBankId = firstValid.bankId;
        selectedBankId = firstValid.bankId;
        // Re-highlight the new selection
        container.querySelectorAll('.order-bank-card').forEach(c => {
          const id = c.getAttribute('data-bank-id');
          if (id === firstValid.bankId) {
            c.style.borderColor = '#3b82f6';
            c.style.background = 'rgba(59, 130, 246, 0.08)';
          }
        });
      } else {
        orderBankId = null;
        selectedBankId = null;
      }
    }

    updateLoanPreviewLocal();
  }

  let bankCardsWired = false;
  async function loadBankSelectorLocal() {
    const container = document.getElementById('orderBankCards');
    if (!container) return;
    const data = await fetchBankOffers();
    if (!data || !data.offers) return;

    renderBankCards();

    // Wire event delegation once
    if (!bankCardsWired) {
      bankCardsWired = true;
      container.addEventListener('click', (e) => {
        const card = e.target.closest('.order-bank-card:not(.disabled)');
        if (!card) return;
        const bankId = card.getAttribute('data-bank-id');

        container.querySelectorAll('.order-bank-card').forEach(c => {
          if (!c.classList.contains('disabled')) {
            c.style.borderColor = 'var(--border-color)';
            c.style.background = 'var(--surface-elevated)';
          }
        });

        card.style.borderColor = '#3b82f6';
        card.style.background = 'rgba(59, 130, 246, 0.08)';

        orderBankId = bankId;
        selectedBankId = bankId;
        updateLoanPreviewLocal();
      });
    }
  }

  function updateLoanPreviewLocal() {
    const termInput = document.getElementById('orderTermInput');
    const termDisplay = document.getElementById('orderTermDisplay');
    const preview = document.getElementById('orderLoanPreview');
    const confirmBtn = document.getElementById('orderConfirmBtn');
    if (!termInput) return;

    orderTermWeeks = parseInt(termInput.value);
    selectedLoanTermWeeks = orderTermWeeks;
    const years = (orderTermWeeks / 52).toFixed(1);
    if (termDisplay) termDisplay.textContent = `${years} yr`;

    const remainingPerUnit = unitPrice() - depositPer();
    const totalLoanNeeded = remainingPerUnit * orderQty;
    let rate = 6.0;
    let earlyFee = 0;
    let holidays = 0;
    let bankName = '';
    let exceedsLimit = false;

    if (cachedBankOffers && cachedBankOffers.offers && orderBankId) {
      const bank = cachedBankOffers.offers.find(b => b.bankId === orderBankId);
      if (bank) {
        const fleetType = bank.loanTypes?.find(lt => lt.type === 'fleet_expansion');
        rate = fleetType?.rate || bank.loanTypes?.[1]?.rate || 6.0;
        earlyFee = bank.earlyRepaymentFee || 0;
        holidays = bank.paymentHolidays || 0;
        bankName = bank.shortName;
        exceedsLimit = totalLoanNeeded > bank.maxLoanAmount;
      }
    }

    const weeklyPayment = calculateWeeklyLoanPayment(remainingPerUnit, rate, orderTermWeeks);

    if (preview) {
      if (!orderBankId || exceedsLimit) {
        preview.innerHTML = '<span style="color: var(--text-muted);">Select an eligible bank above</span>';
      } else {
        let detailParts = [`${bankName} @ ${rate.toFixed(1)}%`];
        if (earlyFee > 0) detailParts.push(`${earlyFee}% early fee`);
        if (holidays > 0) detailParts.push(`${holidays} payment holiday${holidays > 1 ? 's' : ''}`);
        preview.innerHTML = `
          <div style="font-size: 0.95rem;">~$${formatCurrencyShort(weeklyPayment)}/wk for ${years} years</div>
          <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 0.15rem;">${detailParts.join(' &middot; ')}</div>`;
      }
    }

    // Manage confirm button for loan mode
    if (orderFinancing === 'loan' && confirmBtn) {
      const canAffordDeposit = playerBalance >= totalDeposit();
      const validSelection = orderBankId && !exceedsLimit && canAffordDeposit;
      confirmBtn.disabled = !validSelection;
      confirmBtn.style.opacity = validSelection ? '1' : '0.5';
    }
  }

  const termInput = document.getElementById('orderTermInput');
  if (termInput) {
    termInput.addEventListener('input', updateLoanPreviewLocal);
    termInput.addEventListener('change', updateLoanPreviewLocal);
  }

  // Initial funds check
  updateFundsWarning();

  // --- Confirm: sync state and open registration dialog (step 2) ---
  const confirmBtn = document.getElementById('orderConfirmBtn');
  confirmBtn.addEventListener('click', () => {
    if (confirmBtn.disabled) return;
    purchaseQuantity = orderQty;
    selectedFinancingMethod = orderFinancing;
    selectedBankId = orderBankId;
    selectedLoanTermWeeks = orderTermWeeks;
    document.body.removeChild(overlay);
    showOrderRegistrationDialog();
  });

  // --- Cancel ---
  document.getElementById('orderCancelBtn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
}

// Step 2: Registration + Maintenance dialog (called after order config)
function showOrderRegistrationDialog() {
  if (!selectedAircraft) return;
  const aircraft = selectedAircraft;
  const qty = purchaseQuantity || 1;
  const listPrice = aircraft.purchasePrice;
  const uPrice = transactionUnitPrice(listPrice, qty);
  const deposit = Math.round(uPrice * 0.30) * qty;

  const fullName = aircraft.variant
    ? `${aircraft.manufacturer} ${aircraft.model}${aircraft.variant.startsWith('-') ? aircraft.variant : '-' + aircraft.variant}`
    : `${aircraft.manufacturer} ${aircraft.model}`;

  const overlay = document.createElement('div');
  overlay.id = 'orderRegOverlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.8); z-index: 2000;
    display: flex; justify-content: center; align-items: center;
    overflow-y: auto; padding: 2rem 0;
  `;

  function buildRegInputs() {
    if (qty === 1) {
      return `
        <div style="display: flex; align-items: stretch; border: 1px solid var(--border-color); border-radius: 4px; overflow: hidden; background: var(--surface-elevated);" id="regContainer0">
          <div style="padding: 0.6rem 0.75rem; background: var(--surface); border-right: 1px solid var(--border-color); color: var(--text-secondary); font-weight: 600; font-size: 0.95rem; display: flex; align-items: center;">${registrationPrefix}</div>
          <input type="text" id="regSuffix0"
            placeholder="${typeof getSuffixPlaceholder === 'function' ? getSuffixPlaceholder(registrationPrefix) : (registrationPrefix === 'N-' ? '12345' : 'ABCD')}"
            maxlength="${typeof getExpectedSuffixLength === 'function' ? getExpectedSuffixLength(registrationPrefix) : 6}"
            style="flex: 1; padding: 0.6rem; background: transparent; border: none; color: var(--text-primary); font-size: 0.95rem; outline: none; text-transform: uppercase;" />
        </div>
        <div id="regStatus0" style="margin-top: 0.3rem; font-size: 0.8rem; color: var(--text-muted);"></div>`;
    }
    let rows = '';
    for (let i = 0; i < qty; i++) {
      rows += `
        <tr>
          <td style="padding: 0.4rem 0.5rem; color: var(--text-muted); font-size: 0.85rem; text-align: center;">${i + 1}</td>
          <td style="padding: 0.4rem 0.5rem;">
            <div style="display: flex; align-items: stretch; border: 1px solid var(--border-color); border-radius: 4px; overflow: hidden; background: var(--surface-elevated);" id="regContainer${i}">
              <div style="padding: 0.4rem 0.6rem; background: var(--surface); border-right: 1px solid var(--border-color); color: var(--text-secondary); font-weight: 600; font-size: 0.85rem; display: flex; align-items: center;">${registrationPrefix}</div>
              <input type="text" id="regSuffix${i}"
                placeholder="${typeof getSuffixPlaceholder === 'function' ? getSuffixPlaceholder(registrationPrefix) : (registrationPrefix === 'N-' ? '12345' : 'ABCD')}"
                maxlength="${typeof getExpectedSuffixLength === 'function' ? getExpectedSuffixLength(registrationPrefix) : 6}"
                style="flex: 1; padding: 0.4rem; background: transparent; border: none; color: var(--text-primary); font-size: 0.85rem; outline: none; text-transform: uppercase; min-width: 60px;" />
            </div>
          </td>
          <td style="padding: 0.4rem 0.5rem; text-align: center;">
            <span id="regStatus${i}" style="font-size: 0.8rem; color: var(--text-muted);">—</span>
          </td>
        </tr>`;
    }
    return `
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border-color);">
            <th style="padding: 0.3rem 0.5rem; color: var(--text-muted); font-size: 0.7rem; text-transform: uppercase; text-align: center; width: 30px;">#</th>
            <th style="padding: 0.3rem 0.5rem; color: var(--text-muted); font-size: 0.7rem; text-transform: uppercase; text-align: left;">Registration</th>
            <th style="padding: 0.3rem 0.5rem; color: var(--text-muted); font-size: 0.7rem; text-transform: uppercase; text-align: center; width: 60px;">Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  function makeToggle(id, label, color = '#10b981') {
    return `
      <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.3rem 0;">
        <label class="toggle-switch" style="position: relative; width: 36px; height: 20px; flex-shrink: 0;">
          <input type="checkbox" id="${id}" data-toggle-color="${color}" checked style="opacity: 0; width: 0; height: 0;">
          <span class="toggle-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${color}; border: 1px solid ${color}; transition: 0.3s; border-radius: 20px;"></span>
        </label>
        <span style="color: var(--text-secondary); font-size: 0.85rem;">${label}</span>
      </label>`;
  }

  const financingLabel = selectedFinancingMethod === 'loan' ? 'Loan' : 'Cash at Delivery';

  overlay.innerHTML = `
    <div style="background: var(--surface); border: 1px solid var(--accent-color); border-radius: 8px; padding: 1.5rem; width: 95%; max-width: 700px; margin: auto;">
      <h2 style="margin: 0 0 1rem 0; color: var(--accent-color); text-align: center; font-size: 1.2rem;">REGISTRATION & SCHEDULING</h2>

      <!-- Order summary bar -->
      <div style="margin-bottom: 1.25rem; padding: 0.6rem 0.75rem; background: var(--surface-elevated); border-radius: 6px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; font-size: 0.85rem;">
        <span style="color: var(--text-primary); font-weight: 600;">${fullName}${qty > 1 ? ' x' + qty : ''}</span>
        <span style="color: var(--text-muted);">${financingLabel}</span>
        <span style="color: #10b981; font-weight: 700;">Deposit: $${formatCurrencyShort(deposit)}</span>
      </div>

      <div style="display: grid; grid-template-columns: ${qty > 1 ? '1fr 1fr' : '1fr'}; gap: 1.25rem;">
        <!-- Registration Section -->
        <div>
          <label style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; display: block; margin-bottom: 0.5rem;">Aircraft Registration${qty > 1 ? 's' : ''}</label>
          <div id="regSection" style="max-height: 320px; overflow-y: auto;">
            ${buildRegInputs()}
          </div>
        </div>

        <!-- Maintenance Scheduling -->
        <div>
          <label style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; display: block; margin-bottom: 0.5rem;">Auto-Schedule Maintenance</label>
          <div style="padding: 0.75rem; background: var(--surface-elevated); border-radius: 6px;">
            ${makeToggle('regAutoAll', 'Auto-Schedule All', '#10b981')}
            <div style="border-top: 1px solid var(--border-color); margin: 0.4rem 0;"></div>
            ${makeToggle('regAutoDaily', 'Daily Check', '#FFA500')}
            ${makeToggle('regAutoWeekly', 'Weekly Check', '#8B5CF6')}
            ${makeToggle('regAutoA', 'A Check', '#17A2B8')}
            ${makeToggle('regAutoC', 'C Check', '#6B7280')}
            ${makeToggle('regAutoD', 'D Check', '#4B5563')}
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="display: flex; gap: 0.75rem; margin-top: 1.25rem;">
        <button id="regBackBtn" class="btn btn-secondary" style="padding: 0.75rem 1.5rem; font-size: 0.95rem;">Back</button>
        <button id="regConfirmBtn" class="btn btn-primary" style="flex: 1; padding: 0.75rem; font-size: 0.95rem; opacity: 0.5;" disabled>Place Order — Deposit $${formatCurrencyShort(deposit)}</button>
      </div>
    </div>
    <style>
      .toggle-switch .toggle-slider:before {
        content: ""; position: absolute;
        height: calc(100% - 4px); aspect-ratio: 1;
        left: 2px; bottom: 2px;
        background-color: white; transition: 0.3s; border-radius: 50%;
      }
      .toggle-switch input:checked + .toggle-slider:before { transform: translateX(calc(100% - 2px)); }
    </style>
  `;

  document.body.appendChild(overlay);

  // Apply toggle colors dynamically
  overlay.querySelectorAll('.toggle-switch input[data-toggle-color]').forEach(input => {
    const color = input.getAttribute('data-toggle-color');
    const slider = input.nextElementSibling;
    input.addEventListener('change', () => {
      slider.style.backgroundColor = input.checked ? color : 'rgba(255,255,255,0.12)';
      slider.style.borderColor = input.checked ? color : 'rgba(255,255,255,0.15)';
    });
  });

  // --- Auto-schedule toggles ---
  const autoAll = document.getElementById('regAutoAll');
  const autoAllSlider = autoAll.nextElementSibling;
  const autoAllColor = autoAll.getAttribute('data-toggle-color');
  const autoToggles = ['Daily', 'Weekly', 'A', 'C', 'D'].map(l => document.getElementById('regAuto' + l));
  function syncAutoAllColor() {
    autoAllSlider.style.backgroundColor = autoAll.checked ? autoAllColor : 'rgba(255,255,255,0.12)';
    autoAllSlider.style.borderColor = autoAll.checked ? autoAllColor : 'rgba(255,255,255,0.15)';
  }
  autoAll.addEventListener('change', () => { autoToggles.forEach(t => { if (!t) return; t.checked = autoAll.checked; t.dispatchEvent(new Event('change')); }); syncAutoAllColor(); });
  autoToggles.forEach(t => {
    if (!t) return;
    t.addEventListener('change', () => {
      autoAll.checked = autoToggles.every(t => t && t.checked);
      syncAutoAllColor();
    });
  });

  // --- Registration validation ---
  const regValidStates = [];
  const regCheckTimers = [];
  const confirmBtn = document.getElementById('regConfirmBtn');

  function validateReg(suffix) {
    const trimmed = suffix.trim().toUpperCase();
    if (typeof validateRegistrationSuffix === 'function') {
      const v = validateRegistrationSuffix(trimmed, registrationPrefix);
      if (!v.valid) return v;
      return { valid: true, value: registrationPrefix + v.value };
    }
    if (trimmed.length < 1) return { valid: false, message: 'Enter a registration' };
    if (!/^[A-Z0-9-]+$/.test(trimmed)) return { valid: false, message: 'Invalid characters' };
    return { valid: true, value: registrationPrefix + trimmed };
  }

  function updateConfirmState() {
    const allValid = regValidStates.length === qty && regValidStates.every(v => v);
    confirmBtn.disabled = !allValid;
    confirmBtn.style.opacity = allValid ? '1' : '0.5';
  }

  function checkDuplicates() {
    const regs = [];
    for (let i = 0; i < qty; i++) {
      const input = document.getElementById(`regSuffix${i}`);
      if (!input) continue;
      const suffix = input.value.trim().toUpperCase();
      if (!suffix) continue;
      const v = validateReg(suffix);
      if (v.valid) regs.push({ idx: i, reg: v.value });
    }
    const seen = {};
    const dupes = new Set();
    for (const { idx, reg } of regs) {
      if (seen[reg] !== undefined) { dupes.add(idx); dupes.add(seen[reg]); }
      else seen[reg] = idx;
    }
    return dupes;
  }

  function wireRegInput(i) {
    const input = document.getElementById(`regSuffix${i}`);
    if (!input) return;
    const statusEl = document.getElementById(`regStatus${i}`);
    const containerEl = document.getElementById(`regContainer${i}`);

    input.addEventListener('input', () => {
      const suffix = input.value.trim();
      if (!suffix) {
        regValidStates[i] = false;
        if (statusEl) { statusEl.textContent = qty > 1 ? '—' : ''; statusEl.style.color = 'var(--text-muted)'; }
        if (containerEl) containerEl.style.borderColor = 'var(--border-color)';
        updateConfirmState();
        return;
      }
      const v = validateReg(suffix);
      if (!v.valid) {
        regValidStates[i] = false;
        if (statusEl) { statusEl.textContent = '!'; statusEl.style.color = '#EF4444'; }
        if (containerEl) containerEl.style.borderColor = '#EF4444';
        updateConfirmState();
        return;
      }
      if (qty > 1) {
        const dupes = checkDuplicates();
        if (dupes.has(i)) {
          regValidStates[i] = false;
          if (statusEl) { statusEl.textContent = 'DUP'; statusEl.style.color = '#F59E0B'; }
          if (containerEl) containerEl.style.borderColor = '#F59E0B';
          updateConfirmState();
          return;
        }
      }
      if (statusEl) { statusEl.textContent = '...'; statusEl.style.color = 'var(--text-muted)'; }
      if (containerEl) containerEl.style.borderColor = 'var(--border-color)';

      clearTimeout(regCheckTimers[i]);
      regCheckTimers[i] = setTimeout(async () => {
        try {
          const resp = await fetch(`/api/fleet/check-registration?registration=${encodeURIComponent(v.value)}`);
          const data = await resp.json();
          if (input.value.trim().toUpperCase() !== suffix.toUpperCase()) return;
          if (data.inUse) {
            regValidStates[i] = false;
            if (statusEl) { statusEl.innerHTML = '&#10007;'; statusEl.style.color = '#EF4444'; }
            if (containerEl) containerEl.style.borderColor = '#EF4444';
          } else {
            regValidStates[i] = true;
            if (statusEl) { statusEl.innerHTML = '&#10003;'; statusEl.style.color = '#10B981'; }
            if (containerEl) containerEl.style.borderColor = '#10B981';
          }
        } catch (e) {
          regValidStates[i] = true;
          if (statusEl) { statusEl.innerHTML = '&#10003;'; statusEl.style.color = '#10B981'; }
          if (containerEl) containerEl.style.borderColor = '#10B981';
        }
        if (qty > 1) {
          const dupes2 = checkDuplicates();
          for (let j = 0; j < qty; j++) {
            const st = document.getElementById(`regStatus${j}`);
            const ct = document.getElementById(`regContainer${j}`);
            if (dupes2.has(j) && regValidStates[j]) {
              regValidStates[j] = false;
              if (st) { st.textContent = 'DUP'; st.style.color = '#F59E0B'; }
              if (ct) ct.style.borderColor = '#F59E0B';
            }
          }
        }
        updateConfirmState();
      }, 350);
    });

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const next = document.getElementById(`regSuffix${i + 1}`);
        if (next) next.focus();
        else if (!confirmBtn.disabled) confirmBtn.click();
      }
    });
  }

  // Wire up all registration inputs
  for (let i = 0; i < qty; i++) {
    regValidStates.push(false);
    regCheckTimers.push(null);
    wireRegInput(i);
  }
  document.getElementById('regSuffix0')?.focus();

  // --- Confirm: place order ---
  confirmBtn.addEventListener('click', () => {
    if (confirmBtn.disabled) return;

    const registrations = [];
    for (let i = 0; i < qty; i++) {
      const suffix = document.getElementById(`regSuffix${i}`).value.trim();
      const v = validateReg(suffix);
      if (!v.valid) return;
      registrations.push(v.value);
    }

    const autoSchedulePrefs = {
      autoScheduleDaily: document.getElementById('regAutoDaily')?.checked || false,
      autoScheduleWeekly: document.getElementById('regAutoWeekly')?.checked || false,
      autoScheduleA: document.getElementById('regAutoA')?.checked || false,
      autoScheduleC: document.getElementById('regAutoC')?.checked || false,
      autoScheduleD: document.getElementById('regAutoD')?.checked || false
    };

    document.body.removeChild(overlay);

    if (qty > 1) {
      confirmMultiPurchase(registrations, autoSchedulePrefs);
    } else {
      confirmPurchase(registrations[0], autoSchedulePrefs);
    }
  });

  // --- Back: return to order config ---
  document.getElementById('regBackBtn').addEventListener('click', () => {
    document.body.removeChild(overlay);
    showOrderDialog();
  });
}

// Open cabin configurator for the selected aircraft
function openCabinConfigurator() {
  if (!selectedAircraft || typeof showCabinConfigurator !== 'function') return;
  showCabinConfigurator(selectedAircraft, (config) => {
    selectedCabinConfig = config;
    window.selectedCabinConfig = config;
    const summaryEl = document.getElementById('cabinConfigSummary');
    const btnEl = document.getElementById('cabinConfigBtn');
    const checkEl = document.getElementById('cabinConfigCheck');
    if (summaryEl && config) {
      const summary = typeof cabinConfigSummary === 'function' ? cabinConfigSummary(config) : 'Configured';
      summaryEl.innerHTML = summary;
      summaryEl.style.color = 'var(--text-secondary)';
    }
    if (checkEl) {
      checkEl.innerHTML = '&#10003;';
      checkEl.style.borderColor = '#10B981';
      checkEl.style.color = '#10B981';
      checkEl.style.background = 'rgba(16, 185, 129, 0.1)';
    }
    if (btnEl) {
      btnEl.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      btnEl.style.background = 'rgba(16, 185, 129, 0.06)';
      btnEl.querySelector('div:last-child').style.color = 'rgba(16, 185, 129, 0.6)';
      const labelEl = btnEl.querySelector('div[style*="font-weight: 700"]');
      if (labelEl) labelEl.style.color = '#10B981';
    }
  }, selectedCabinConfig);
}

// Open cargo configurator for the selected aircraft
function openCargoConfigurator() {
  if (!selectedAircraft || typeof showCargoConfigurator !== 'function') return;
  showCargoConfigurator(selectedAircraft, (config) => {
    selectedCargoConfig = config;
    window.selectedCargoConfig = config;
    const summaryEl = document.getElementById('cargoConfigSummary');
    const btnEl = document.getElementById('cargoConfigBtn');
    const checkEl = document.getElementById('cargoConfigCheck');
    if (summaryEl && config) {
      const summary = typeof cargoConfigSummary === 'function' ? cargoConfigSummary(config) : 'Configured';
      summaryEl.innerHTML = summary;
      summaryEl.style.color = 'var(--text-secondary)';
    }
    if (checkEl) {
      checkEl.innerHTML = '&#10003;';
      checkEl.style.borderColor = '#10B981';
      checkEl.style.color = '#10B981';
      checkEl.style.background = 'rgba(16, 185, 129, 0.1)';
    }
    if (btnEl) {
      btnEl.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      btnEl.style.background = 'rgba(16, 185, 129, 0.06)';
      btnEl.querySelector('div:last-child').style.color = 'rgba(16, 185, 129, 0.6)';
      const labelEl = btnEl.querySelector('div[style*="font-weight: 700"]');
      if (labelEl) labelEl.style.color = '#10B981';
    }
  }, selectedCargoConfig);
}

// Check if required configurations are missing (returns error message or null)
function getMissingConfigs() {
  if (!selectedAircraft) return null;
  const parts = [];
  const needsCabin = selectedAircraft.type !== 'Cargo' && selectedAircraft.passengerCapacity > 0;
  const needsCargo = selectedAircraft.cargoCapacityKg > 0;
  if (needsCabin && !selectedCabinConfig) parts.push('cabin layout');
  if (needsCargo && !selectedCargoConfig) parts.push('cargo allocation');
  if (parts.length === 0) return null;
  return `Please configure ${parts.join(' and ')} before proceeding`;
}

// Flash the uncompleted config buttons red
function flashMissingConfigs() {
  const needsCabin = selectedAircraft.type !== 'Cargo' && selectedAircraft.passengerCapacity > 0;
  const needsCargo = selectedAircraft.cargoCapacityKg > 0;
  const btns = [];
  if (needsCabin && !selectedCabinConfig) btns.push(document.getElementById('cabinConfigBtn'));
  if (needsCargo && !selectedCargoConfig) btns.push(document.getElementById('cargoConfigBtn'));
  for (const btn of btns) {
    if (!btn) continue;
    btn.style.borderColor = '#EF4444';
    btn.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.4)';
    setTimeout(() => {
      btn.style.boxShadow = 'none';
    }, 1500);
  }
}

// Close aircraft detail modal
function closeAircraftDetailModal() {
  document.getElementById('aircraftDetailModal').style.display = 'none';
}

// Purchase aircraft
function purchaseAircraft() {
  if (!selectedAircraft) {
    showErrorMessage('No aircraft selected');
    return;
  }

  // Close detail modal
  closeAircraftDetailModal();

  // Show purchase/lease confirmation modal
  showPurchaseConfirmationModal();
}

// Show purchase/lease confirmation modal
function showPurchaseConfirmationModal() {
  if (!selectedAircraft) return;

  // Calculate condition percentage
  const conditionPercent = selectedAircraft.conditionPercentage || (selectedAircraft.condition === 'New' ? 100 : 70);
  const ageYears = selectedAircraft.age || 0;

  // Create confirmation modal overlay
  const overlay = document.createElement('div');
  overlay.id = 'purchaseConfirmationOverlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 2000;
    display: flex;
    justify-content: center;
    align-items: center;
  `;

  overlay.innerHTML = `
    <div style="background: var(--surface); border: 1px solid var(--border-color); border-radius: 8px; padding: 2rem; width: 90%; max-width: 600px;">
      <h2 style="margin-bottom: 1.5rem; color: var(--text-primary); text-align: center;">CONFIRM ACQUISITION</h2>

      <div style="margin-bottom: 2rem; padding: 1rem; background: var(--surface-elevated); border-radius: 4px;">
        <h3 style="margin: 0 0 1rem 0; color: var(--accent-color);">${selectedAircraft.manufacturer} ${selectedAircraft.model}${selectedAircraft.variant ? (selectedAircraft.variant.startsWith('-') ? selectedAircraft.variant : '-' + selectedAircraft.variant) : ''}</h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; font-size: 0.9rem;">
          <div><span style="color: var(--text-secondary);">Condition:</span> <strong>${conditionPercent}%</strong></div>
          <div><span style="color: var(--text-secondary);">Age:</span> <strong>${ageYears} years</strong></div>
          <div><span style="color: var(--text-secondary);">Capacity:</span> <strong>${selectedAircraft.passengerCapacity} pax</strong></div>
          <div><span style="color: var(--text-secondary);">Range:</span> <strong>${selectedAircraft.rangeNm} nm</strong></div>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem;">
        ${selectedAircraft.purchasePrice ? `
        <button id="confirmPurchaseBtn" class="btn btn-primary" style="padding: 1.5rem; font-size: 1.1rem; display: flex; justify-content: space-between; align-items: center;">
          <span>PURCHASE OUTRIGHT</span>
          <strong style="color: var(--success-color);">$${formatCurrency(selectedAircraft.purchasePrice)}</strong>
        </button>
        ` : ''}
        ${selectedAircraft.leasePrice ? `
        <button id="confirmLeaseBtn" class="btn btn-secondary" style="padding: 1.5rem; font-size: 1.1rem; display: flex; justify-content: space-between; align-items: center;">
          <span>LEASE (12 MONTHS)</span>
          <strong style="color: var(--accent-color);">$${formatCurrency(selectedAircraft.leasePrice)}/wk</strong>
        </button>
        ` : ''}
      </div>

      <button id="cancelPurchaseBtn" class="btn btn-logout" style="width: 100%; padding: 0.75rem;">Cancel</button>
    </div>
  `;

  document.body.appendChild(overlay);

  // Add event listeners
  const purchaseBtn = document.getElementById('confirmPurchaseBtn');
  if (purchaseBtn) {
    purchaseBtn.addEventListener('click', () => {
      if (getMissingConfigs()) { processPurchase(); return; }
      document.body.removeChild(overlay);
      processPurchase();
    });
  }

  const leaseBtn = document.getElementById('confirmLeaseBtn');
  if (leaseBtn) {
    leaseBtn.addEventListener('click', () => {
      if (getMissingConfigs()) { processLease(); return; }
      document.body.removeChild(overlay);
      processLease();
    });
  }

  document.getElementById('cancelPurchaseBtn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
}

// Show purchase confirmation dialog
function processPurchase() {
  if (!selectedAircraft) return;

  // Validate required configurations
  const missing = getMissingConfigs();
  if (missing) {
    showErrorMessage(missing);
    flashMissingConfigs();
    return;
  }

  closeAircraftDetailModal();
  const isNewOrder = currentCategory === 'new' && !selectedAircraft.isPlayerListing;

  if (isNewOrder) {
    // New aircraft: open dedicated order dialog
    showOrderDialog();
  } else {
    // Used aircraft / player listing: instant purchase via confirmation dialog
    const fullName = selectedAircraft.variant
      ? `${selectedAircraft.manufacturer} ${selectedAircraft.model}${selectedAircraft.variant.startsWith('-') ? selectedAircraft.variant : '-' + selectedAircraft.variant}`
      : `${selectedAircraft.manufacturer} ${selectedAircraft.model}`;
    const condition = selectedAircraft.condition || 'New';
    const price = selectedAircraft.purchasePrice;
    showConfirmationDialog(
      'CONFIRM PURCHASE',
      fullName,
      condition,
      `$${formatCurrency(price)}`,
      'Purchase',
      confirmPurchase
    );
  }
}

// Show processing/ordering overlay
function showProcessingOverlay(actionType = 'order') {
  // Remove any existing processing overlay
  hideProcessingOverlay();

  const overlay = document.createElement('div');
  overlay.id = 'processingOverlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.85);
    z-index: 3000;
    display: flex;
    justify-content: center;
    align-items: center;
  `;

  const actionText = actionType === 'lease' ? 'Leasing' : 'Purchasing';
  const icon = actionType === 'lease' ? '📋' : '🛒';

  overlay.innerHTML = `
    <div style="background: var(--surface); border: 1px solid var(--accent-color); border-radius: 8px; padding: 3rem; width: 90%; max-width: 400px; text-align: center;">
      <div style="margin-bottom: 1.5rem;">
        <div class="processing-spinner" style="width: 60px; height: 60px; border: 4px solid var(--border-color); border-top-color: var(--accent-color); border-radius: 50%; margin: 0 auto; animation: spin 1s linear infinite;"></div>
      </div>
      <h2 style="margin: 0 0 0.75rem 0; color: var(--text-primary); font-size: 1.3rem;">${actionText} Aircraft</h2>
      <p style="margin: 0; color: var(--text-secondary); font-size: 0.95rem;">Processing your order, please wait...</p>
      <div id="loading-quip-market" style="font-size: 0.8rem; color: var(--text-muted); font-style: italic; margin-top: 0.75rem;"></div>
    </div>
    <style>
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `;

  document.body.appendChild(overlay);
  startLoadingQuips('loading-quip-market');
}

// Hide processing overlay
function hideProcessingOverlay() {
  stopLoadingQuips();
  const existing = document.getElementById('processingOverlay');
  if (existing) {
    existing.remove();
  }
}

// Actually process the purchase after confirmation
async function confirmPurchase(registration, autoSchedulePrefs = {}) {
  if (!selectedAircraft) return;

  const isNewOrder = currentCategory === 'new' && !selectedAircraft.isPlayerListing;
  const aircraftName = selectedAircraft.variant
    ? `${selectedAircraft.manufacturer} ${selectedAircraft.model}${selectedAircraft.model.endsWith('-') || selectedAircraft.variant.startsWith('-') ? selectedAircraft.variant : '-' + selectedAircraft.variant}`
    : `${selectedAircraft.manufacturer} ${selectedAircraft.model}`;

  // Show contract signing animation
  if (isNewOrder) {
    const txnPrice = transactionUnitPrice(selectedAircraft.purchasePrice, 1);
    const deposit = Math.round(txnPrice * 0.30);
    await showContractSigningAnimation('order', aircraftName, registration, deposit);
  } else {
    await showContractSigningAnimation('purchase', aircraftName, registration, selectedAircraft.purchasePrice);
  }

  showProcessingOverlay('purchase');

  try {
    const conditionPercent = selectedAircraft.conditionPercentage || (selectedAircraft.condition === 'New' ? 100 : 70);
    const ageYears = selectedAircraft.age || 0;
    const aircraftId = selectedAircraft.variantId || selectedAircraft.id;

    const payload = {
      aircraftId: aircraftId,
      category: currentCategory,
      condition: selectedAircraft.condition || 'New',
      conditionPercentage: conditionPercent,
      ageYears: ageYears,
      purchasePrice: selectedAircraft.purchasePrice,
      maintenanceCostPerHour: selectedAircraft.maintenanceCostPerHour,
      fuelBurnPerHour: selectedAircraft.fuelBurnPerHour,
      registration: registration,
      cCheckRemainingDays: selectedAircraft.cCheckRemainingDays || null,
      dCheckRemainingDays: selectedAircraft.dCheckRemainingDays || null,
      autoScheduleDaily: autoSchedulePrefs.autoScheduleDaily || false,
      autoScheduleWeekly: autoSchedulePrefs.autoScheduleWeekly || false,
      autoScheduleA: autoSchedulePrefs.autoScheduleA || false,
      autoScheduleC: autoSchedulePrefs.autoScheduleC || false,
      autoScheduleD: autoSchedulePrefs.autoScheduleD || false,
      playerListingId: selectedAircraft.playerListingId || null,
      economySeats: selectedCabinConfig?.economySeats || null,
      economyPlusSeats: selectedCabinConfig?.economyPlusSeats || null,
      businessSeats: selectedCabinConfig?.businessSeats || null,
      firstSeats: selectedCabinConfig?.firstSeats || null,
      toilets: selectedCabinConfig?.toilets || null,
      cargoConfig: selectedCargoConfig?.cargoConfig || null,
      mainDeckCargoConfig: selectedCargoConfig?.mainDeckCargoConfig || null,
      cargoHoldCargoConfig: selectedCargoConfig?.cargoHoldCargoConfig || null
    };

    // Add financing info for new aircraft orders
    if (isNewOrder) {
      payload.financingMethod = selectedFinancingMethod;
      if (selectedFinancingMethod === 'loan') {
        payload.financingBankId = selectedBankId;
        payload.financingTermWeeks = selectedLoanTermWeeks;
      }
    }

    const response = await fetch('/api/fleet/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    hideProcessingOverlay();

    if (response.ok) {
      if (data.orderType === 'new') {
        showSuccessMessage(`Aircraft ordered! ${data.aircraft.registration} — Available immediately. Deposit: $${formatCurrency(data.deposit)}`, data.newBalance);
      } else {
        showSuccessMessage(`Aircraft purchased successfully! Registration: ${data.aircraft.registration}`, data.newBalance);
      }
      clearAircraftCache();
      fetchWorldInfo();
    } else {
      const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error;
      showErrorMessage(`${isNewOrder ? 'Order' : 'Purchase'} failed: ${errorMsg}`);
    }
  } catch (error) {
    console.error('Error purchasing aircraft:', error);
    hideProcessingOverlay();
    showErrorMessage('Failed to purchase aircraft. Please try again.');
  }
}

// Confirm bulk purchase - send all registrations to server
async function confirmMultiPurchase(registrations, autoSchedulePrefs = {}) {
  if (!selectedAircraft) return;

  const qty = registrations.length;
  const aircraftName = selectedAircraft.variant
    ? `${selectedAircraft.manufacturer} ${selectedAircraft.model}${selectedAircraft.model.endsWith('-') || selectedAircraft.variant.startsWith('-') ? selectedAircraft.variant : '-' + selectedAircraft.variant}`
    : `${selectedAircraft.manufacturer} ${selectedAircraft.model}`;

  // Show contract animation with total deposit amount
  const displayReg = qty > 1 ? `${registrations[0]} (+${qty - 1} more)` : registrations[0];
  const txnUnit = transactionUnitPrice(selectedAircraft.purchasePrice, qty);
  const totalDeposit = Math.round(txnUnit * 0.30) * qty;
  await showContractSigningAnimation('order', aircraftName, displayReg, totalDeposit);

  showProcessingOverlay('purchase');

  try {
    const payload = {
      aircraftId: selectedAircraft.id,
      purchasePrice: selectedAircraft.purchasePrice,
      registrations,
      autoScheduleDaily: autoSchedulePrefs.autoScheduleDaily || false,
      autoScheduleWeekly: autoSchedulePrefs.autoScheduleWeekly || false,
      autoScheduleA: autoSchedulePrefs.autoScheduleA || false,
      autoScheduleC: autoSchedulePrefs.autoScheduleC || false,
      autoScheduleD: autoSchedulePrefs.autoScheduleD || false,
      economySeats: selectedCabinConfig?.economySeats || null,
      economyPlusSeats: selectedCabinConfig?.economyPlusSeats || null,
      businessSeats: selectedCabinConfig?.businessSeats || null,
      firstSeats: selectedCabinConfig?.firstSeats || null,
      toilets: selectedCabinConfig?.toilets || null,
      cargoConfig: selectedCargoConfig?.cargoConfig || null,
      mainDeckCargoConfig: selectedCargoConfig?.mainDeckCargoConfig || null,
      cargoHoldCargoConfig: selectedCargoConfig?.cargoHoldCargoConfig || null,
      // Financing
      financingMethod: selectedFinancingMethod
    };
    if (selectedFinancingMethod === 'loan') {
      payload.financingBankId = selectedBankId;
      payload.financingTermWeeks = selectedLoanTermWeeks;
    }

    const response = await fetch('/api/fleet/bulk-purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    hideProcessingOverlay();

    if (response.ok) {
      const regList = data.aircraft.map(a => a.registration).join(', ');
      showSuccessMessage(`${qty} aircraft ordered! Deposit: $${formatCurrency(data.totalDeposit)}. Registrations: ${regList}`, data.newBalance);
      clearAircraftCache();
      fetchWorldInfo();
    } else {
      const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error;
      showErrorMessage(`Bulk order failed: ${errorMsg}`);
    }
  } catch (error) {
    console.error('Error in bulk order:', error);
    hideProcessingOverlay();
    showErrorMessage('Failed to complete bulk order. Please try again.');
  }
}

// Show confirmation dialog with registration input
function showConfirmationDialog(title, aircraftName, condition, price, actionType, confirmCallback) {
  const overlay = document.createElement('div');
  overlay.id = 'registrationConfirmOverlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 2000;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow-y: auto;
    padding: 2rem 0;
  `;

  overlay.innerHTML = `
    <div style="background: var(--surface); border: 1px solid var(--border-color); border-radius: 8px; padding: 2rem; width: 90%; max-width: 650px; margin: auto;">
      <h2 style="margin-bottom: 1.5rem; color: var(--text-primary); text-align: center;">${title}</h2>

      <div style="margin-bottom: 1.5rem; padding: 1rem; background: var(--surface-elevated); border-radius: 4px;">
        <h3 style="margin: 0 0 0.75rem 0; color: var(--accent-color); font-size: 1.1rem;">${aircraftName}</h3>
        <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 0.5rem;">
          <span style="color: var(--text-secondary);">Condition:</span>
          <strong>${condition}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
          <span style="color: var(--text-secondary);">Price:</span>
          <strong style="color: var(--success-color);">${price}</strong>
        </div>
      </div>

      <div style="margin-bottom: 1.5rem;">
        <label style="display: block; margin-bottom: 0.5rem; color: var(--text-primary); font-weight: 600;">Aircraft Registration</label>
        <div style="display: flex; align-items: stretch; border: 1px solid var(--border-color); border-radius: 4px; overflow: hidden; background: var(--surface-elevated);">
          <div id="registrationPrefix" style="padding: 0.75rem; background: var(--surface); border-right: 1px solid var(--border-color); color: var(--text-secondary); font-weight: 600; font-size: 1rem; display: flex; align-items: center;">${registrationPrefix}</div>
          <input
            type="text"
            id="registrationSuffix"
            placeholder="${typeof getSuffixPlaceholder === 'function' ? getSuffixPlaceholder(registrationPrefix) : (registrationPrefix === 'N-' ? '12345' : 'ABCD')}"
            maxlength="${typeof getExpectedSuffixLength === 'function' ? getExpectedSuffixLength(registrationPrefix) : 6}"
            style="flex: 1; padding: 0.75rem; background: transparent; border: none; color: var(--text-primary); font-size: 1rem; outline: none; text-transform: uppercase;"
          />
        </div>
        <div id="registrationHint" style="margin-top: 0.25rem; color: var(--text-muted); font-size: 0.8rem;">${typeof getRegistrationHint === 'function' ? getRegistrationHint(registrationPrefix, baseCountry) : `Based on ${baseCountry || 'your base location'}`}</div>
        <div id="registrationError" style="margin-top: 0.5rem; color: var(--warning-color); font-size: 0.85rem; display: none;"></div>
      </div>

      <!-- Maintenance Auto-Scheduling Options -->
      <div style="margin-bottom: 1.5rem; padding: 1rem; background: var(--surface-elevated); border-radius: 4px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <label style="color: var(--text-primary); font-weight: 600;">Maintenance Scheduling</label>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 0.8rem; color: var(--text-secondary);">Auto All</span>
            <label class="toggle-switch" style="position: relative; display: inline-block; width: 44px; height: 24px;">
              <input type="checkbox" id="autoScheduleAll" checked style="opacity: 0; width: 0; height: 0;">
              <span class="toggle-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #4b5563; transition: 0.3s; border-radius: 24px;"></span>
            </label>
          </div>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">
          Auto-schedule recurring maintenance checks to keep them valid.
        </div>
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.4rem; padding: 0.5rem 0.6rem; background: var(--surface); border-radius: 4px;">
            <span style="font-size: 0.75rem; color: #FFA500; white-space: nowrap;">Daily</span>
            <label class="toggle-switch" style="position: relative; display: inline-block; width: 32px; min-width: 32px; height: 18px;">
              <input type="checkbox" id="autoScheduleDaily" checked style="opacity: 0; width: 0; height: 0;">
              <span class="toggle-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #4b5563; transition: 0.3s; border-radius: 18px;"></span>
            </label>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.4rem; padding: 0.5rem 0.6rem; background: var(--surface); border-radius: 4px;">
            <span style="font-size: 0.75rem; color: #8B5CF6; white-space: nowrap;">Weekly</span>
            <label class="toggle-switch" style="position: relative; display: inline-block; width: 32px; min-width: 32px; height: 18px;">
              <input type="checkbox" id="autoScheduleWeekly" checked style="opacity: 0; width: 0; height: 0;">
              <span class="toggle-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #4b5563; transition: 0.3s; border-radius: 18px;"></span>
            </label>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.4rem; padding: 0.5rem 0.6rem; background: var(--surface); border-radius: 4px;">
            <span style="font-size: 0.75rem; color: #3B82F6; white-space: nowrap;">A Chk</span>
            <label class="toggle-switch" style="position: relative; display: inline-block; width: 32px; min-width: 32px; height: 18px;">
              <input type="checkbox" id="autoScheduleA" checked style="opacity: 0; width: 0; height: 0;">
              <span class="toggle-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #4b5563; transition: 0.3s; border-radius: 18px;"></span>
            </label>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.4rem; padding: 0.5rem 0.6rem; background: var(--surface); border-radius: 4px;">
            <span style="font-size: 0.75rem; color: #10B981; white-space: nowrap;">C Chk</span>
            <label class="toggle-switch" style="position: relative; display: inline-block; width: 32px; min-width: 32px; height: 18px;">
              <input type="checkbox" id="autoScheduleC" checked style="opacity: 0; width: 0; height: 0;">
              <span class="toggle-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #4b5563; transition: 0.3s; border-radius: 18px;"></span>
            </label>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.4rem; padding: 0.5rem 0.6rem; background: var(--surface); border-radius: 4px;">
            <span style="font-size: 0.75rem; color: #EF4444; white-space: nowrap;">D Chk</span>
            <label class="toggle-switch" style="position: relative; display: inline-block; width: 32px; min-width: 32px; height: 18px;">
              <input type="checkbox" id="autoScheduleD" checked style="opacity: 0; width: 0; height: 0;">
              <span class="toggle-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #4b5563; transition: 0.3s; border-radius: 18px;"></span>
            </label>
          </div>
        </div>
      </div>

      <div style="display: flex; gap: 1rem;">
        <button id="confirmActionBtn" class="btn btn-primary" style="flex: 1; padding: 0.75rem;">${actionType}</button>
        <button id="cancelActionBtn" class="btn btn-secondary" style="flex: 1; padding: 0.75rem;">Cancel</button>
      </div>
    </div>
    <style>
      .toggle-switch input:checked + .toggle-slider {
        background-color: var(--accent-color);
      }
      .toggle-switch .toggle-slider:before {
        content: "";
        position: absolute;
        height: calc(100% - 4px);
        aspect-ratio: 1;
        left: 2px;
        bottom: 2px;
        background-color: white;
        transition: 0.3s;
        border-radius: 50%;
      }
      .toggle-switch input:checked + .toggle-slider:before {
        transform: translateX(calc(100% - 2px));
      }
    </style>
  `;

  document.body.appendChild(overlay);

  const registrationSuffix = document.getElementById('registrationSuffix');
  const registrationError = document.getElementById('registrationError');
  const confirmBtn = document.getElementById('confirmActionBtn');
  const inputContainer = registrationSuffix.parentElement;

  // Auto-schedule toggle handlers for all check types
  const autoScheduleAll = document.getElementById('autoScheduleAll');
  const autoScheduleDaily = document.getElementById('autoScheduleDaily');
  const autoScheduleWeekly = document.getElementById('autoScheduleWeekly');
  const autoScheduleA = document.getElementById('autoScheduleA');
  const autoScheduleC = document.getElementById('autoScheduleC');
  const autoScheduleD = document.getElementById('autoScheduleD');

  const individualToggles = [autoScheduleDaily, autoScheduleWeekly, autoScheduleA, autoScheduleC, autoScheduleD];

  // Auto All toggle
  autoScheduleAll.addEventListener('change', () => {
    const checked = autoScheduleAll.checked;
    individualToggles.forEach(toggle => {
      toggle.checked = checked;
    });
  });

  // Individual toggles update Auto All state
  individualToggles.forEach(toggle => {
    toggle.addEventListener('change', () => {
      const allChecked = individualToggles.every(t => t.checked);
      const noneChecked = individualToggles.every(t => !t.checked);
      autoScheduleAll.checked = allChecked;
      autoScheduleAll.indeterminate = !allChecked && !noneChecked;
    });
  });

  // Validate registration suffix and combine with prefix
  function validateRegistration(suffix) {
    const trimmedSuffix = suffix.trim().toUpperCase();

    // Use country-specific validation if available
    if (typeof validateRegistrationSuffix === 'function') {
      const validation = validateRegistrationSuffix(trimmedSuffix, registrationPrefix);
      if (!validation.valid) {
        return validation;
      }
      // Combine prefix and suffix
      return { valid: true, value: registrationPrefix + validation.value };
    }

    // Fallback validation if country-specific rules not available
    if (trimmedSuffix.length < 1) {
      return { valid: false, message: 'Please enter a registration suffix' };
    }

    // Suffix should be alphanumeric (and hyphens for some countries)
    if (!/^[A-Z0-9-]+$/.test(trimmedSuffix)) {
      return { valid: false, message: 'Registration can only contain letters, numbers, and hyphens' };
    }

    // Combine prefix and suffix
    const fullRegistration = registrationPrefix + trimmedSuffix;

    if (fullRegistration.length > 10) {
      return { valid: false, message: 'Registration is too long (max 10 characters)' };
    }

    return { valid: true, value: fullRegistration };
  }

  // Add event listener for confirm button
  confirmBtn.addEventListener('click', () => {
    const suffix = registrationSuffix.value.trim();
    const validation = validateRegistration(suffix);

    if (!validation.valid) {
      registrationError.textContent = validation.message;
      registrationError.style.display = 'block';
      inputContainer.style.borderColor = 'var(--warning-color)';
      return;
    }

    // Collect auto-schedule preferences for all check types
    const autoSchedulePrefs = {
      autoScheduleDaily: autoScheduleDaily.checked,
      autoScheduleWeekly: autoScheduleWeekly.checked,
      autoScheduleA: autoScheduleA.checked,
      autoScheduleC: autoScheduleC.checked,
      autoScheduleD: autoScheduleD.checked
    };

    // Remove overlay and call confirm callback with registration and auto-schedule prefs
    document.body.removeChild(overlay);
    confirmCallback(validation.value, autoSchedulePrefs);
  });

  // Add event listener for cancel button
  document.getElementById('cancelActionBtn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  // Live registration availability check
  let regCheckTimer = null;
  let lastCheckedReg = '';

  registrationSuffix.addEventListener('input', () => {
    registrationError.style.display = 'none';
    inputContainer.style.borderColor = 'var(--border-color)';

    clearTimeout(regCheckTimer);
    const suffix = registrationSuffix.value.trim();
    if (!suffix) { lastCheckedReg = ''; return; }

    const validation = validateRegistration(suffix);
    if (!validation.valid) return;

    const fullReg = validation.value;
    if (fullReg === lastCheckedReg) return;

    regCheckTimer = setTimeout(async () => {
      try {
        const resp = await fetch(`/api/fleet/check-registration?registration=${encodeURIComponent(fullReg)}`);
        const data = await resp.json();
        lastCheckedReg = fullReg;
        if (data.inUse) {
          registrationError.textContent = `${fullReg} is already in use`;
          registrationError.style.display = 'block';
          inputContainer.style.borderColor = 'var(--warning-color)';
        }
      } catch (e) { /* ignore network errors */ }
    }, 400);
  });

  // Allow Enter key to submit
  registrationSuffix.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      confirmBtn.click();
    }
  });

  // Auto-focus the suffix input
  registrationSuffix.focus();
}

// Show lease confirmation dialog — route new aircraft to bulk lease order flow
function processLease() {
  if (!selectedAircraft) return;

  // Validate required configurations
  const missing = getMissingConfigs();
  if (missing) {
    showErrorMessage(missing);
    flashMissingConfigs();
    return;
  }

  closeAircraftDetailModal();
  if (currentCategory === 'new') {
    showLeaseOrderDialog();
  } else {
    showLeaseConfirmationDialogUsed();
  }
}

// Lease order state (shared between step 1 and step 2)
let leaseOrderQty = 1;
let leaseOrderDurationMonths = 36;
let leaseOrderWeeklyRate = 0;

// Step 1: Lease order configuration dialog (qty, duration, pricing) for new aircraft
function showLeaseOrderDialog() {
  if (!selectedAircraft) return;
  const aircraft = selectedAircraft;
  const baseLeasePrice = aircraft.leasePrice || 0;

  const fullName = aircraft.variant
    ? `${aircraft.manufacturer} ${aircraft.model}${aircraft.variant.startsWith('-') ? aircraft.variant : '-' + aircraft.variant}`
    : `${aircraft.manufacturer} ${aircraft.model}`;

  // Local order state
  let orderQty = leaseOrderQty || 1;
  let leaseYears = 3;
  let leaseMonths = 0;
  const minTotalMonths = 36;
  const maxTotalMonths = 144;

  function discPct() { return transactionDiscountPercent(orderQty); }
  function unitWeekly() { return Math.round(baseLeasePrice * (1 - discPct() / 100)); }
  function totalWeekly() { return unitWeekly() * orderQty; }
  function getTotalMonths() { return leaseYears * 12 + leaseMonths; }
  function totalCommitment() { return totalWeekly() * getTotalMonths() * 4.33; }

  const overlay = document.createElement('div');
  overlay.id = 'leaseOrderOverlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.8); z-index: 2000;
    display: flex; justify-content: center; align-items: center;
    overflow-y: auto; padding: 2rem 0;
  `;

  function renderDialog() {
    overlay.innerHTML = `
      <div style="background: var(--surface); border: 1px solid #3b82f6; border-radius: 8px; padding: 1.5rem; width: 95%; max-width: 1050px; margin: auto;">
        <h2 style="margin: 0 0 1rem 0; color: #3b82f6; text-align: center; font-size: 1.2rem;">OPERATING LEASE</h2>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
          <!-- Left Column -->
          <div>
            <!-- Aircraft Info -->
            <div style="margin-bottom: 1rem; padding: 0.75rem; background: var(--surface-elevated); border-radius: 6px;">
              <h3 style="margin: 0 0 0.5rem 0; color: var(--text-primary); font-size: 1rem;">${fullName}</h3>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; font-size: 0.85rem;">
                <div><span style="color: var(--text-muted);">Type:</span> <strong>${aircraft.type}</strong></div>
                <div><span style="color: var(--text-muted);">Pax:</span> <strong>${aircraft.passengerCapacity || 0}</strong></div>
                <div><span style="color: var(--text-muted);">Range:</span> <strong>${aircraft.rangeNm || 0}nm</strong></div>
              </div>
            </div>

            <!-- Lease Pricing -->
            <div style="margin-bottom: 1rem; padding: 0.75rem; background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.03) 100%); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 6px;">
              <div id="leaseListPriceRow" style="display: ${discPct() > 0 ? 'flex' : 'none'}; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <span style="color: var(--text-muted); font-size: 0.8rem;">List Rate</span>
                <span style="color: var(--text-muted); font-size: 0.9rem; text-decoration: line-through;">$${formatCurrencyShort(baseLeasePrice)}/wk</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <span id="leasePriceLabel" style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem;">${discPct() > 0 ? 'Discounted Rate' : 'Weekly Rate'}</span>
                <div style="text-align: right;">
                  <span id="leaseUnitWeekly" style="color: #3b82f6; font-weight: 700; font-size: 1.3rem;">$${formatCurrencyShort(unitWeekly())}/wk</span>
                  <span id="leaseDiscBadge" style="color: #F59E0B; font-size: 0.75rem; font-weight: 600; margin-left: 0.3rem; display: ${discPct() > 0 ? 'inline' : 'none'};">${discPct() > 0 ? '-' + discPct() + '%' : ''}</span>
                </div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.5rem; border-top: 1px solid rgba(59, 130, 246, 0.15);">
                <span style="color: var(--text-secondary); font-size: 0.85rem;">Total Weekly (x${orderQty})</span>
                <span id="leaseTotalWeekly" style="color: #3b82f6; font-weight: 700; font-size: 1.1rem;">$${formatCurrencyShort(totalWeekly())}/wk</span>
              </div>
            </div>

            <!-- Quantity Selector -->
            <div style="margin-bottom: 1rem; padding: 0.75rem; background: var(--surface-elevated); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem;">Quantity</div>
                  <div id="leaseDeliveryNote" style="color: var(--text-muted); font-size: 0.75rem;">${orderQty > 1 ? `1st immediate, then 1/week (${orderQty - 1} more)` : 'Available immediately'}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.6rem;">
                  <button id="leaseQtyDown" style="width: 32px; height: 32px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--surface); color: var(--text-primary); cursor: pointer; font-size: 1.1rem; font-weight: 700; display: flex; align-items: center; justify-content: center;">\u2212</button>
                  <span id="leaseQtyDisplay" style="font-weight: 700; font-size: 1.3rem; color: var(--text-primary); min-width: 2rem; text-align: center;">${orderQty}</span>
                  <button id="leaseQtyUp" style="width: 32px; height: 32px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--surface); color: var(--text-primary); cursor: pointer; font-size: 1.1rem; font-weight: 700; display: flex; align-items: center; justify-content: center;">+</button>
                </div>
              </div>
            </div>

            <!-- Lease Duration -->
            <div>
              <div style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 0.5rem;">Lease Duration</div>
              <div style="display: flex; gap: 0.75rem; align-items: center;">
                <div style="flex: 1; display: flex; align-items: center; background: var(--surface-elevated); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.25rem;">
                  <button type="button" id="leaseYearsDown" style="width: 32px; height: 32px; background: var(--surface); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); cursor: pointer; font-size: 1.1rem; font-weight: 700; display: flex; align-items: center; justify-content: center;">\u2212</button>
                  <div style="flex: 1; text-align: center;">
                    <div id="leaseYearsValue" style="font-weight: 700; font-size: 1.3rem; color: #3b82f6;">${leaseYears}</div>
                    <div style="font-size: 0.6rem; color: var(--text-muted); margin-top: -2px;">years</div>
                  </div>
                  <button type="button" id="leaseYearsUp" style="width: 32px; height: 32px; background: var(--surface); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); cursor: pointer; font-size: 1.1rem; font-weight: 700; display: flex; align-items: center; justify-content: center;">+</button>
                </div>
                <div style="flex: 1; display: flex; align-items: center; background: var(--surface-elevated); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.25rem;">
                  <button type="button" id="leaseMonthsDown" style="width: 32px; height: 32px; background: var(--surface); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); cursor: pointer; font-size: 1.1rem; font-weight: 700; display: flex; align-items: center; justify-content: center;">\u2212</button>
                  <div style="flex: 1; text-align: center;">
                    <div id="leaseMonthsValue" style="font-weight: 700; font-size: 1.3rem; color: #3b82f6;">${leaseMonths}</div>
                    <div style="font-size: 0.6rem; color: var(--text-muted); margin-top: -2px;">months</div>
                  </div>
                  <button type="button" id="leaseMonthsUp" style="width: 32px; height: 32px; background: var(--surface); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); cursor: pointer; font-size: 1.1rem; font-weight: 700; display: flex; align-items: center; justify-content: center;">+</button>
                </div>
              </div>
              <div style="margin-top: 0.3rem; text-align: center; font-size: 0.75rem; color: var(--text-muted);">
                Total: <span id="leaseDurationTotal" style="color: var(--text-primary); font-weight: 600;">${getTotalMonths()} months</span> (min 3 yrs, max 12 yrs)
              </div>
            </div>
          </div>

          <!-- Right Column -->
          <div>
            <!-- Lease Terms -->
            <div style="margin-bottom: 1rem; padding: 0.75rem; background: var(--surface-elevated); border-radius: 6px;">
              <h4 style="margin: 0 0 0.5rem 0; color: var(--text-muted); font-size: 0.7rem; text-transform: uppercase;">Lease Terms</h4>
              <ul style="margin: 0; padding-left: 1rem; font-size: 0.8rem; color: var(--text-secondary);">
                <li>No deposit required — first weekly payment charged now</li>
                <li>${orderQty > 1 ? `Staggered delivery: 1st immediate, then 1 per week` : 'Aircraft available immediately upon signing'}</li>
                <li style="color: #f59e0b;">Early termination: <strong>12 weeks</strong> of weekly payments</li>
                ${orderQty > 1 ? '<li>Bulk lease discount applied to all aircraft</li>' : ''}
              </ul>
            </div>

            <!-- Lease Summary -->
            <div style="margin-bottom: 1rem; padding: 0.75rem; background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.03) 100%); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <span style="color: var(--text-muted); font-size: 0.85rem;">Aircraft</span>
                <span style="color: var(--text-primary); font-weight: 600;">${fullName} ${orderQty > 1 ? '<span id="leaseSummaryQty">x' + orderQty + '</span>' : ''}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <span style="color: var(--text-muted); font-size: 0.85rem;">Duration</span>
                <span id="leaseSummaryDuration" style="color: var(--text-primary); font-weight: 600;">${getTotalMonths()} months</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <span style="color: var(--text-muted); font-size: 0.85rem;">Weekly Payment</span>
                <span id="leaseSummaryWeekly" style="color: #3b82f6; font-weight: 700; font-size: 1.1rem;">$${formatCurrencyShort(totalWeekly())}/wk</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.4rem; border-top: 1px solid rgba(59, 130, 246, 0.15);">
                <span style="color: var(--text-muted); font-size: 0.85rem;">Total Commitment</span>
                <span id="leaseSummaryTotal" style="color: var(--text-secondary); font-weight: 600; font-size: 0.95rem;">$${formatCurrencyShort(totalCommitment())}</span>
              </div>
            </div>

            <!-- First Payment / Funds Warning -->
            <div style="margin-bottom: 1rem; padding: 0.75rem; background: var(--surface-elevated); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem;">
                <span style="color: var(--text-muted); font-size: 0.85rem;">First Payment Due Now</span>
                <span id="leaseFirstPayment" style="color: #3b82f6; font-weight: 700;">$${formatCurrencyShort(totalWeekly())}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-muted); font-size: 0.85rem;">Your Balance</span>
                <span style="color: var(--text-primary); font-weight: 600;">$${formatCurrencyShort(playerBalance)}</span>
              </div>
            </div>

            <!-- Insufficient Funds Warning -->
            <div id="leaseFundsWarning" style="display: none; margin-bottom: 1rem; padding: 0.75rem; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px;">
              <div style="display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.5rem;">
                <span style="color: #EF4444; font-size: 1.1rem;">&#9888;</span>
                <span style="color: #EF4444; font-weight: 700; font-size: 0.9rem;">Insufficient Funds</span>
              </div>
              <div style="font-size: 0.8rem; color: var(--text-secondary);">
                First weekly payment ($<span id="leaseWarningCost">${formatCurrencyShort(totalWeekly())}</span>) exceeds your balance ($<span id="leaseWarningBalance">${formatCurrencyShort(playerBalance)}</span>).
                Reduce quantity or browse <strong>used aircraft</strong> for lower-cost leases.
              </div>
            </div>

            <!-- Early Termination Info -->
            <div style="margin-bottom: 1rem; padding: 0.5rem 0.75rem; background: rgba(245, 158, 11, 0.06); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 6px;">
              <div style="font-size: 0.8rem; color: var(--text-secondary);">
                Early termination penalty: <strong style="color: #f59e0b;" id="leaseTerminationFee">$${formatCurrencyShort(unitWeekly() * 12 * orderQty)}</strong>
                <span style="color: var(--text-muted); font-size: 0.75rem;">(12 wks x ${orderQty} aircraft)</span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div style="display: flex; gap: 0.75rem;">
              <button id="leaseConfirmBtn" class="btn btn-primary" style="flex: 1; padding: 0.75rem; font-size: 0.95rem;">Continue — Registration</button>
              <button id="leaseCancelBtn" class="btn btn-secondary" style="flex: 1; padding: 0.75rem; font-size: 0.95rem;">Cancel</button>
            </div>
          </div>
        </div>
      </div>
      <style>
        .toggle-switch input:checked + .toggle-slider { background-color: var(--accent-color); }
        .toggle-switch .toggle-slider:before {
          content: ""; position: absolute;
          height: calc(100% - 4px); aspect-ratio: 1;
          left: 2px; bottom: 2px;
          background-color: white; transition: 0.3s; border-radius: 50%;
        }
        .toggle-switch input:checked + .toggle-slider:before { transform: translateX(calc(100% - 2px)); }
      </style>
    `;
  }

  renderDialog();
  document.body.appendChild(overlay);

  // --- Dynamic UI updates ---
  function updateLeasePricing() {
    const hasDiscount = discPct() > 0;
    const leaseDeliveryNote = orderQty > 1 ? `1st immediate, then 1/week (${orderQty - 1} more)` : 'Available immediately';
    const unitWeeklyEl = document.getElementById('leaseUnitWeekly');
    const discBadgeEl = document.getElementById('leaseDiscBadge');
    const listPriceRow = document.getElementById('leaseListPriceRow');
    const priceLabelEl = document.getElementById('leasePriceLabel');
    const totalWeeklyEl = document.getElementById('leaseTotalWeekly');
    const qtyEl = document.getElementById('leaseQtyDisplay');
    const deliveryEl = document.getElementById('leaseDeliveryNote');
    const firstPaymentEl = document.getElementById('leaseFirstPayment');
    const summaryQtyEl = document.getElementById('leaseSummaryQty');
    const summaryWeeklyEl = document.getElementById('leaseSummaryWeekly');
    const summaryTotalEl = document.getElementById('leaseSummaryTotal');
    const summaryDurationEl = document.getElementById('leaseSummaryDuration');
    const terminationFeeEl = document.getElementById('leaseTerminationFee');

    if (unitWeeklyEl) unitWeeklyEl.textContent = '$' + formatCurrencyShort(unitWeekly()) + '/wk';
    if (listPriceRow) listPriceRow.style.display = hasDiscount ? 'flex' : 'none';
    if (priceLabelEl) priceLabelEl.textContent = hasDiscount ? 'Discounted Rate' : 'Weekly Rate';
    if (discBadgeEl) { discBadgeEl.textContent = '-' + discPct() + '%'; discBadgeEl.style.display = hasDiscount ? 'inline' : 'none'; }
    if (totalWeeklyEl) totalWeeklyEl.textContent = '$' + formatCurrencyShort(totalWeekly()) + '/wk';
    if (qtyEl) qtyEl.textContent = orderQty;
    if (deliveryEl) deliveryEl.textContent = leaseDeliveryNote;
    if (firstPaymentEl) firstPaymentEl.textContent = '$' + formatCurrencyShort(totalWeekly());
    if (summaryQtyEl) summaryQtyEl.textContent = 'x' + orderQty;
    if (summaryWeeklyEl) summaryWeeklyEl.textContent = '$' + formatCurrencyShort(totalWeekly()) + '/wk';
    if (summaryTotalEl) summaryTotalEl.textContent = '$' + formatCurrencyShort(totalCommitment());
    if (summaryDurationEl) summaryDurationEl.textContent = getTotalMonths() + ' months';
    if (terminationFeeEl) terminationFeeEl.textContent = '$' + formatCurrencyShort(unitWeekly() * 12 * orderQty);

    // Update the total weekly label
    const totalLabel = totalWeeklyEl?.parentElement?.querySelector('span:first-child');
    if (totalLabel) totalLabel.textContent = `Total Weekly (x${orderQty})`;

    // Update the termination info
    const termInfoEl = terminationFeeEl?.parentElement;
    if (termInfoEl) {
      const spanEl = termInfoEl.querySelector('span');
      if (spanEl) spanEl.textContent = `(12 wks x ${orderQty} aircraft)`;
    }

    updateLeaseFundsWarning();
  }

  // --- Funds warning ---
  function updateLeaseFundsWarning() {
    const warningEl = document.getElementById('leaseFundsWarning');
    const confirmBtn = document.getElementById('leaseConfirmBtn');
    if (!warningEl) return;

    const firstPayment = totalWeekly();

    if (playerBalance >= firstPayment) {
      warningEl.style.display = 'none';
      if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.style.opacity = '1'; }
    } else {
      warningEl.style.display = 'block';
      const costEl = document.getElementById('leaseWarningCost');
      const balEl = document.getElementById('leaseWarningBalance');
      if (costEl) costEl.textContent = formatCurrencyShort(firstPayment);
      if (balEl) balEl.textContent = formatCurrencyShort(playerBalance);
      if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.style.opacity = '0.5'; }
    }
  }

  // --- Duration spinner ---
  const yearsValueEl = document.getElementById('leaseYearsValue');
  const monthsValueEl = document.getElementById('leaseMonthsValue');
  const totalDisplayEl = document.getElementById('leaseDurationTotal');

  function updateDurationDisplay() {
    if (yearsValueEl) yearsValueEl.textContent = leaseYears;
    if (monthsValueEl) monthsValueEl.textContent = leaseMonths;
    if (totalDisplayEl) totalDisplayEl.textContent = `${getTotalMonths()} months`;
    updateLeasePricing();
  }

  function adjustYears(delta) {
    const newYears = leaseYears + delta;
    const newTotal = newYears * 12 + leaseMonths;
    if (newYears < 0 || newYears > 12) return;
    if (newTotal < minTotalMonths || newTotal > maxTotalMonths) return;
    leaseYears = newYears;
    updateDurationDisplay();
  }

  function adjustMonths(delta) {
    let newMonths = leaseMonths + delta;
    let newYears = leaseYears;
    if (newMonths < 0) {
      if (newYears > 0) { newYears--; newMonths = 11; }
      else return;
    } else if (newMonths > 11) {
      if (newYears < 12) { newYears++; newMonths = 0; }
      else return;
    }
    const newTotal = newYears * 12 + newMonths;
    if (newTotal < minTotalMonths || newTotal > maxTotalMonths) return;
    leaseYears = newYears;
    leaseMonths = newMonths;
    updateDurationDisplay();
  }

  document.getElementById('leaseYearsDown').addEventListener('click', () => adjustYears(-1));
  document.getElementById('leaseYearsUp').addEventListener('click', () => adjustYears(1));
  document.getElementById('leaseMonthsDown').addEventListener('click', () => adjustMonths(-1));
  document.getElementById('leaseMonthsUp').addEventListener('click', () => adjustMonths(1));

  // --- Quantity ---
  document.getElementById('leaseQtyDown').addEventListener('click', () => {
    if (orderQty <= 1) return;
    orderQty--;
    updateLeasePricing();
  });
  document.getElementById('leaseQtyUp').addEventListener('click', () => {
    if (orderQty >= 10) return;
    orderQty++;
    updateLeasePricing();
  });

  // Initial funds check
  updateLeaseFundsWarning();

  // --- Confirm: sync state and open registration dialog (step 2) ---
  document.getElementById('leaseConfirmBtn').addEventListener('click', () => {
    const confirmBtn = document.getElementById('leaseConfirmBtn');
    if (confirmBtn.disabled) return;
    leaseOrderQty = orderQty;
    leaseOrderDurationMonths = getTotalMonths();
    leaseOrderWeeklyRate = unitWeekly();
    document.body.removeChild(overlay);
    showLeaseRegistrationDialog();
  });

  // --- Cancel ---
  document.getElementById('leaseCancelBtn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
}

// Step 2: Lease Registration + Maintenance dialog
function showLeaseRegistrationDialog() {
  if (!selectedAircraft) return;
  const aircraft = selectedAircraft;
  const qty = leaseOrderQty || 1;
  const weeklyRate = leaseOrderWeeklyRate;
  const totalWeekly = weeklyRate * qty;

  const fullName = aircraft.variant
    ? `${aircraft.manufacturer} ${aircraft.model}${aircraft.variant.startsWith('-') ? aircraft.variant : '-' + aircraft.variant}`
    : `${aircraft.manufacturer} ${aircraft.model}`;

  const overlay = document.createElement('div');
  overlay.id = 'leaseRegOverlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.8); z-index: 2000;
    display: flex; justify-content: center; align-items: center;
    overflow-y: auto; padding: 2rem 0;
  `;

  function buildRegInputs() {
    if (qty === 1) {
      return `
        <div style="display: flex; align-items: stretch; border: 1px solid var(--border-color); border-radius: 4px; overflow: hidden; background: var(--surface-elevated);" id="leaseRegContainer0">
          <div style="padding: 0.6rem 0.75rem; background: var(--surface); border-right: 1px solid var(--border-color); color: var(--text-secondary); font-weight: 600; font-size: 0.95rem; display: flex; align-items: center;">${registrationPrefix}</div>
          <input type="text" id="leaseRegSuffix0"
            placeholder="${typeof getSuffixPlaceholder === 'function' ? getSuffixPlaceholder(registrationPrefix) : (registrationPrefix === 'N-' ? '12345' : 'ABCD')}"
            maxlength="${typeof getExpectedSuffixLength === 'function' ? getExpectedSuffixLength(registrationPrefix) : 6}"
            style="flex: 1; padding: 0.6rem; background: transparent; border: none; color: var(--text-primary); font-size: 0.95rem; outline: none; text-transform: uppercase;" />
        </div>
        <div id="leaseRegStatus0" style="margin-top: 0.3rem; font-size: 0.8rem; color: var(--text-muted);"></div>`;
    }
    let rows = '';
    for (let i = 0; i < qty; i++) {
      rows += `
        <tr>
          <td style="padding: 0.3rem; color: var(--text-muted); font-size: 0.8rem; text-align: center;">${i + 1}</td>
          <td style="padding: 0.3rem;">
            <div style="display: flex; align-items: stretch; border: 1px solid var(--border-color); border-radius: 4px; overflow: hidden; background: var(--surface-elevated);" id="leaseRegContainer${i}">
              <div style="padding: 0.35rem 0.4rem; background: var(--surface); border-right: 1px solid var(--border-color); color: var(--text-secondary); font-weight: 600; font-size: 0.8rem; display: flex; align-items: center;">${registrationPrefix}</div>
              <input type="text" id="leaseRegSuffix${i}"
                placeholder="${typeof getSuffixPlaceholder === 'function' ? getSuffixPlaceholder(registrationPrefix) : (registrationPrefix === 'N-' ? '12345' : 'ABCD')}"
                maxlength="${typeof getExpectedSuffixLength === 'function' ? getExpectedSuffixLength(registrationPrefix) : 6}"
                style="flex: 1; padding: 0.35rem; background: transparent; border: none; color: var(--text-primary); font-size: 0.8rem; outline: none; text-transform: uppercase; min-width: 0; width: 100%;" />
            </div>
          </td>
          <td style="padding: 0.3rem; text-align: center;">
            <span id="leaseRegStatus${i}" style="font-size: 0.75rem; color: var(--text-muted);">—</span>
          </td>
        </tr>`;
    }
    return `
      <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border-color);">
            <th style="padding: 0.3rem 0.3rem; color: var(--text-muted); font-size: 0.7rem; text-transform: uppercase; text-align: center; width: 24px;">#</th>
            <th style="padding: 0.3rem 0.3rem; color: var(--text-muted); font-size: 0.7rem; text-transform: uppercase; text-align: left;">Registration</th>
            <th style="padding: 0.3rem 0.3rem; color: var(--text-muted); font-size: 0.7rem; text-transform: uppercase; text-align: center; width: 36px;"></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  function makeToggle(id, label, color = '#3b82f6') {
    return `
      <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.3rem 0;">
        <label class="toggle-switch" style="position: relative; width: 36px; height: 20px; flex-shrink: 0;">
          <input type="checkbox" id="${id}" data-toggle-color="${color}" checked style="opacity: 0; width: 0; height: 0;">
          <span class="toggle-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${color}; border: 1px solid ${color}; transition: 0.3s; border-radius: 20px;"></span>
        </label>
        <span style="color: var(--text-secondary); font-size: 0.85rem;">${label}</span>
      </label>`;
  }

  overlay.innerHTML = `
    <div style="background: var(--surface); border: 1px solid #3b82f6; border-radius: 8px; padding: 1.5rem; width: 95%; max-width: 700px; margin: auto;">
      <h2 style="margin: 0 0 1rem 0; color: #3b82f6; text-align: center; font-size: 1.2rem;">LEASE — REGISTRATION & SCHEDULING</h2>

      <!-- Lease summary bar -->
      <div style="margin-bottom: 1.25rem; padding: 0.6rem 0.75rem; background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.15); border-radius: 6px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; font-size: 0.85rem;">
        <span style="color: var(--text-primary); font-weight: 600;">${fullName}${qty > 1 ? ' x' + qty : ''}</span>
        <span style="color: var(--text-muted);">${leaseOrderDurationMonths} months</span>
        <span style="color: #3b82f6; font-weight: 700;">$${formatCurrencyShort(totalWeekly)}/wk</span>
      </div>

      <div style="display: grid; grid-template-columns: ${qty > 1 ? '1fr 1fr' : '1fr'}; gap: 1.25rem; overflow: hidden;">
        <!-- Registration Section -->
        <div style="min-width: 0;">
          <label style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; display: block; margin-bottom: 0.5rem;">Aircraft Registration${qty > 1 ? 's' : ''}</label>
          <div id="leaseRegSection" style="max-height: 320px; overflow-y: auto; overflow-x: hidden;">
            ${buildRegInputs()}
          </div>
        </div>

        <!-- Maintenance Scheduling -->
        <div>
          <label style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; display: block; margin-bottom: 0.5rem;">Auto-Schedule Maintenance</label>
          <div style="padding: 0.75rem; background: var(--surface-elevated); border-radius: 6px;">
            ${makeToggle('leaseRegAutoAll', 'Auto-Schedule All', '#3b82f6')}
            <div style="border-top: 1px solid var(--border-color); margin: 0.4rem 0;"></div>
            ${makeToggle('leaseRegAutoDaily', 'Daily Check', '#FFA500')}
            ${makeToggle('leaseRegAutoWeekly', 'Weekly Check', '#8B5CF6')}
            ${makeToggle('leaseRegAutoA', 'A Check', '#17A2B8')}
            ${makeToggle('leaseRegAutoC', 'C Check', '#6B7280')}
            ${makeToggle('leaseRegAutoD', 'D Check', '#4B5563')}
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="display: flex; gap: 0.75rem; margin-top: 1.25rem;">
        <button id="leaseRegBackBtn" class="btn btn-secondary" style="padding: 0.75rem 1.5rem; font-size: 0.95rem;">Back</button>
        <button id="leaseRegConfirmBtn" class="btn btn-primary" style="flex: 1; padding: 0.75rem; font-size: 0.95rem; opacity: 0.5;" disabled>Sign Lease — $${formatCurrencyShort(totalWeekly)}/wk</button>
      </div>
    </div>
    <style>
      .toggle-switch .toggle-slider:before {
        content: ""; position: absolute;
        height: calc(100% - 4px); aspect-ratio: 1;
        left: 2px; bottom: 2px;
        background-color: white; transition: 0.3s; border-radius: 50%;
      }
      .toggle-switch input:checked + .toggle-slider:before { transform: translateX(calc(100% - 2px)); }
    </style>
  `;

  document.body.appendChild(overlay);

  // Apply toggle colors dynamically
  overlay.querySelectorAll('.toggle-switch input[data-toggle-color]').forEach(input => {
    const color = input.getAttribute('data-toggle-color');
    const slider = input.nextElementSibling;
    input.addEventListener('change', () => {
      slider.style.backgroundColor = input.checked ? color : 'rgba(255,255,255,0.12)';
      slider.style.borderColor = input.checked ? color : 'rgba(255,255,255,0.15)';
    });
  });

  // --- Auto-schedule toggles ---
  const autoAll = document.getElementById('leaseRegAutoAll');
  const autoAllSlider = autoAll.nextElementSibling;
  const autoAllColor = autoAll.getAttribute('data-toggle-color');
  const autoToggles = ['Daily', 'Weekly', 'A', 'C', 'D'].map(l => document.getElementById('leaseRegAuto' + l));
  function syncAutoAllColor() {
    autoAllSlider.style.backgroundColor = autoAll.checked ? autoAllColor : 'rgba(255,255,255,0.12)';
    autoAllSlider.style.borderColor = autoAll.checked ? autoAllColor : 'rgba(255,255,255,0.15)';
  }
  autoAll.addEventListener('change', () => { autoToggles.forEach(t => { if (!t) return; t.checked = autoAll.checked; t.dispatchEvent(new Event('change')); }); syncAutoAllColor(); });
  autoToggles.forEach(t => {
    if (!t) return;
    t.addEventListener('change', () => {
      autoAll.checked = autoToggles.every(t => t && t.checked);
      syncAutoAllColor();
    });
  });

  // --- Registration validation ---
  const regValidStates = [];
  const regCheckTimers = [];
  const confirmBtn = document.getElementById('leaseRegConfirmBtn');

  function validateReg(suffix) {
    const trimmed = suffix.trim().toUpperCase();
    if (typeof validateRegistrationSuffix === 'function') {
      const v = validateRegistrationSuffix(trimmed, registrationPrefix);
      if (!v.valid) return v;
      return { valid: true, value: registrationPrefix + v.value };
    }
    if (trimmed.length < 1) return { valid: false, message: 'Enter a registration' };
    if (!/^[A-Z0-9-]+$/.test(trimmed)) return { valid: false, message: 'Invalid characters' };
    return { valid: true, value: registrationPrefix + trimmed };
  }

  function updateConfirmState() {
    const allValid = regValidStates.length === qty && regValidStates.every(v => v);
    confirmBtn.disabled = !allValid;
    confirmBtn.style.opacity = allValid ? '1' : '0.5';
  }

  function checkDuplicates() {
    const regs = [];
    for (let i = 0; i < qty; i++) {
      const input = document.getElementById(`leaseRegSuffix${i}`);
      if (!input) continue;
      const suffix = input.value.trim().toUpperCase();
      if (!suffix) continue;
      const v = validateReg(suffix);
      if (v.valid) regs.push({ idx: i, reg: v.value });
    }
    const seen = {};
    const dupes = new Set();
    for (const { idx, reg } of regs) {
      if (seen[reg] !== undefined) { dupes.add(idx); dupes.add(seen[reg]); }
      else seen[reg] = idx;
    }
    return dupes;
  }

  function wireRegInput(i) {
    const input = document.getElementById(`leaseRegSuffix${i}`);
    if (!input) return;
    const statusEl = document.getElementById(`leaseRegStatus${i}`);
    const containerEl = document.getElementById(`leaseRegContainer${i}`);

    input.addEventListener('input', () => {
      const suffix = input.value.trim();
      if (!suffix) {
        regValidStates[i] = false;
        if (statusEl) { statusEl.textContent = qty > 1 ? '—' : ''; statusEl.style.color = 'var(--text-muted)'; }
        if (containerEl) containerEl.style.borderColor = 'var(--border-color)';
        updateConfirmState();
        return;
      }
      const v = validateReg(suffix);
      if (!v.valid) {
        regValidStates[i] = false;
        if (statusEl) { statusEl.textContent = '!'; statusEl.style.color = '#EF4444'; }
        if (containerEl) containerEl.style.borderColor = '#EF4444';
        updateConfirmState();
        return;
      }
      if (qty > 1) {
        const dupes = checkDuplicates();
        if (dupes.has(i)) {
          regValidStates[i] = false;
          if (statusEl) { statusEl.textContent = 'DUP'; statusEl.style.color = '#F59E0B'; }
          if (containerEl) containerEl.style.borderColor = '#F59E0B';
          updateConfirmState();
          return;
        }
      }
      if (statusEl) { statusEl.textContent = '...'; statusEl.style.color = 'var(--text-muted)'; }
      if (containerEl) containerEl.style.borderColor = 'var(--border-color)';

      clearTimeout(regCheckTimers[i]);
      regCheckTimers[i] = setTimeout(async () => {
        try {
          const resp = await fetch(`/api/fleet/check-registration?registration=${encodeURIComponent(v.value)}`);
          const data = await resp.json();
          if (input.value.trim().toUpperCase() !== suffix.toUpperCase()) return;
          if (data.inUse) {
            regValidStates[i] = false;
            if (statusEl) { statusEl.innerHTML = '&#10007;'; statusEl.style.color = '#EF4444'; }
            if (containerEl) containerEl.style.borderColor = '#EF4444';
          } else {
            regValidStates[i] = true;
            if (statusEl) { statusEl.innerHTML = '&#10003;'; statusEl.style.color = '#10B981'; }
            if (containerEl) containerEl.style.borderColor = '#10B981';
          }
        } catch (e) {
          regValidStates[i] = true;
          if (statusEl) { statusEl.innerHTML = '&#10003;'; statusEl.style.color = '#10B981'; }
          if (containerEl) containerEl.style.borderColor = '#10B981';
        }
        if (qty > 1) {
          const dupes2 = checkDuplicates();
          for (let j = 0; j < qty; j++) {
            const st = document.getElementById(`leaseRegStatus${j}`);
            const ct = document.getElementById(`leaseRegContainer${j}`);
            if (dupes2.has(j) && regValidStates[j]) {
              regValidStates[j] = false;
              if (st) { st.textContent = 'DUP'; st.style.color = '#F59E0B'; }
              if (ct) ct.style.borderColor = '#F59E0B';
            }
          }
        }
        updateConfirmState();
      }, 350);
    });

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const next = document.getElementById(`leaseRegSuffix${i + 1}`);
        if (next) next.focus();
        else if (!confirmBtn.disabled) confirmBtn.click();
      }
    });
  }

  for (let i = 0; i < qty; i++) {
    regValidStates.push(false);
    regCheckTimers.push(null);
    wireRegInput(i);
  }
  document.getElementById('leaseRegSuffix0')?.focus();

  // --- Confirm: place bulk lease ---
  confirmBtn.addEventListener('click', () => {
    if (confirmBtn.disabled) return;

    const registrations = [];
    for (let i = 0; i < qty; i++) {
      const suffix = document.getElementById(`leaseRegSuffix${i}`).value.trim();
      const v = validateReg(suffix);
      if (!v.valid) return;
      registrations.push(v.value);
    }

    const autoSchedulePrefs = {
      autoScheduleDaily: document.getElementById('leaseRegAutoDaily')?.checked || false,
      autoScheduleWeekly: document.getElementById('leaseRegAutoWeekly')?.checked || false,
      autoScheduleA: document.getElementById('leaseRegAutoA')?.checked || false,
      autoScheduleC: document.getElementById('leaseRegAutoC')?.checked || false,
      autoScheduleD: document.getElementById('leaseRegAutoD')?.checked || false
    };

    document.body.removeChild(overlay);
    confirmBulkLease(registrations, autoSchedulePrefs);
  });

  // --- Back: return to lease order config ---
  document.getElementById('leaseRegBackBtn').addEventListener('click', () => {
    document.body.removeChild(overlay);
    showLeaseOrderDialog();
  });
}

// Execute bulk lease API call
async function confirmBulkLease(registrations, autoSchedulePrefs = {}) {
  if (!selectedAircraft) return;

  const qty = registrations.length;
  const aircraftName = selectedAircraft.variant
    ? `${selectedAircraft.manufacturer} ${selectedAircraft.model}${selectedAircraft.model.endsWith('-') || selectedAircraft.variant.startsWith('-') ? selectedAircraft.variant : '-' + selectedAircraft.variant}`
    : `${selectedAircraft.manufacturer} ${selectedAircraft.model}`;

  const displayReg = qty > 1 ? `${registrations[0]} (+${qty - 1} more)` : registrations[0];
  await showContractSigningAnimation('lease', aircraftName, displayReg, leaseOrderWeeklyRate * qty);

  showProcessingOverlay('lease');

  try {
    const response = await fetch('/api/fleet/bulk-lease', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aircraftId: selectedAircraft.id,
        leaseWeeklyPayment: leaseOrderWeeklyRate,
        leaseDurationMonths: leaseOrderDurationMonths,
        registrations,
        autoScheduleDaily: autoSchedulePrefs.autoScheduleDaily || false,
        autoScheduleWeekly: autoSchedulePrefs.autoScheduleWeekly || false,
        autoScheduleA: autoSchedulePrefs.autoScheduleA || false,
        autoScheduleC: autoSchedulePrefs.autoScheduleC || false,
        autoScheduleD: autoSchedulePrefs.autoScheduleD || false,
        cargoConfig: selectedCargoConfig?.cargoConfig || null,
        mainDeckCargoConfig: selectedCargoConfig?.mainDeckCargoConfig || null,
        cargoHoldCargoConfig: selectedCargoConfig?.cargoHoldCargoConfig || null
      })
    });

    const data = await response.json();
    hideProcessingOverlay();

    if (response.ok) {
      const regList = data.aircraft.map(a => a.registration).join(', ');
      showSuccessMessage(`${qty} aircraft leased! Weekly: $${formatCurrency(data.totalWeeklyPayment)}. Registrations: ${regList}`, data.newBalance);
      clearAircraftCache();
      fetchWorldInfo();
    } else {
      const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error;
      showErrorMessage(`Bulk lease failed: ${errorMsg}`);
    }
  } catch (error) {
    console.error('Error in bulk lease:', error);
    hideProcessingOverlay();
    showErrorMessage('Failed to complete bulk lease. Please try again.');
  }
}

// Used/player aircraft lease confirmation dialog (single aircraft, legacy flow)
function showLeaseConfirmationDialogUsed() {
  if (!selectedAircraft) return;

  const fullName = selectedAircraft.variant
    ? `${selectedAircraft.manufacturer} ${selectedAircraft.model}${selectedAircraft.variant.startsWith('-') ? selectedAircraft.variant : '-' + selectedAircraft.variant}`
    : `${selectedAircraft.manufacturer} ${selectedAircraft.model}`;

  const conditionPercent = selectedAircraft.conditionPercentage || (selectedAircraft.condition === 'New' ? 100 : 70);
  const lessor = selectedAircraft.lessor;

  const overlay = document.createElement('div');
  overlay.id = 'leaseConfirmOverlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.8); z-index: 2000;
    display: flex; justify-content: center; align-items: center;
    overflow-y: auto; padding: 2rem 0;
  `;

  overlay.innerHTML = `
    <div style="background: var(--surface); border: 1px solid var(--accent-color); border-radius: 8px; padding: 1.5rem; width: 95%; max-width: 950px; margin: auto;">
      <h2 style="margin-bottom: 1rem; color: var(--accent-color); text-align: center; font-size: 1.2rem;">CONFIRM LEASE</h2>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
        <!-- Left Column -->
        <div>
          ${lessor ? `
          <div style="margin-bottom: 1rem; padding: 0.75rem; background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="color: var(--text-muted); font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.2rem;">Lessor</div>
                <div style="color: var(--text-primary); font-weight: 700; font-size: 1rem;">${lessor.name}</div>
                <div style="color: var(--text-muted); font-size: 0.75rem;">${lessor.country}</div>
              </div>
              <div style="text-align: right;">
                <div style="color: var(--text-muted); font-size: 0.6rem;">Professional Lessor</div>
              </div>
            </div>
          </div>
          ` : ''}

          <div style="margin-bottom: 1rem; padding: 0.75rem; background: var(--surface-elevated); border-radius: 6px;">
            <h3 style="margin: 0 0 0.5rem 0; color: var(--text-primary); font-size: 0.95rem;">${fullName}</h3>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; font-size: 0.8rem;">
              <div><span style="color: var(--text-muted);">Cond:</span> <strong style="color: ${conditionPercent >= 80 ? '#10b981' : conditionPercent >= 60 ? '#f59e0b' : '#ef4444'};">${conditionPercent}%</strong></div>
              <div><span style="color: var(--text-muted);">Pax:</span> <strong>${selectedAircraft.passengerCapacity}</strong></div>
              <div><span style="color: var(--text-muted);">Range:</span> <strong>${selectedAircraft.rangeNm}nm</strong></div>
            </div>
          </div>

          <div style="margin-bottom: 1rem; padding: 0.75rem; background: var(--surface-elevated); border-radius: 6px;">
            <h4 style="margin: 0 0 0.5rem 0; color: var(--text-muted); font-size: 0.7rem; text-transform: uppercase;">Maintenance Status</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
              <div style="padding: 0.5rem; background: rgba(220, 38, 38, 0.1); border: 1px solid rgba(220, 38, 38, 0.3); border-radius: 4px;">
                <div style="color: #DC2626; font-size: 0.65rem; font-weight: 600;">C CHECK DUE</div>
                <div style="color: ${(selectedAircraft.cCheckRemainingDays || 0) < 180 ? '#DC2626' : 'var(--text-primary)'}; font-weight: 700; font-size: 0.9rem;">${selectedAircraft.cCheckRemaining || 'Full'}</div>
                <div style="color: var(--text-muted); font-size: 0.6rem;">${selectedAircraft.cCheckRemainingDays || 0} days</div>
              </div>
              <div style="padding: 0.5rem; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 4px;">
                <div style="color: #10B981; font-size: 0.65rem; font-weight: 600;">D CHECK DUE</div>
                <div style="color: ${(selectedAircraft.dCheckRemainingDays || 0) < 365 ? '#FFA500' : 'var(--text-primary)'}; font-weight: 700; font-size: 0.9rem;">${selectedAircraft.dCheckRemaining || 'Full'}</div>
                <div style="color: var(--text-muted); font-size: 0.6rem;">${selectedAircraft.dCheckRemainingDays || 0} days</div>
              </div>
            </div>
          </div>

          <!-- Lease Duration -->
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.4rem; color: var(--text-primary); font-weight: 600; font-size: 0.85rem;">Lease Duration</label>
            <div style="display: flex; gap: 1rem; align-items: center;">
              <div style="flex: 1; display: flex; align-items: center; background: var(--surface-elevated); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.25rem;">
                <button type="button" id="leaseYearsDown" style="width: 36px; height: 36px; background: var(--surface); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); cursor: pointer; font-size: 1.2rem; font-weight: 700; display: flex; align-items: center; justify-content: center;">\u2212</button>
                <div style="flex: 1; text-align: center;">
                  <div id="leaseYearsValue" style="font-weight: 700; font-size: 1.4rem; color: var(--accent-color);">3</div>
                  <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: -2px;">years</div>
                </div>
                <button type="button" id="leaseYearsUp" style="width: 36px; height: 36px; background: var(--surface); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); cursor: pointer; font-size: 1.2rem; font-weight: 700; display: flex; align-items: center; justify-content: center;">+</button>
              </div>
              <div style="flex: 1; display: flex; align-items: center; background: var(--surface-elevated); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.25rem;">
                <button type="button" id="leaseMonthsDown" style="width: 36px; height: 36px; background: var(--surface); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); cursor: pointer; font-size: 1.2rem; font-weight: 700; display: flex; align-items: center; justify-content: center;">\u2212</button>
                <div style="flex: 1; text-align: center;">
                  <div id="leaseMonthsValue" style="font-weight: 700; font-size: 1.4rem; color: var(--accent-color);">0</div>
                  <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: -2px;">months</div>
                </div>
                <button type="button" id="leaseMonthsUp" style="width: 36px; height: 36px; background: var(--surface); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); cursor: pointer; font-size: 1.2rem; font-weight: 700; display: flex; align-items: center; justify-content: center;">+</button>
              </div>
            </div>
            <div style="margin-top: 0.4rem; text-align: center; font-size: 0.75rem; color: var(--text-muted);">
              Total: <span id="leaseDurationTotal" style="color: var(--text-primary); font-weight: 600;">36 months</span> (min 3 years, max 12 years)
            </div>
          </div>

          <!-- Pricing Summary -->
          <div style="padding: 0.75rem; background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="color: var(--text-muted); font-size: 0.65rem;">Weekly Payment</div>
                <div style="color: var(--accent-color); font-weight: 700; font-size: 1.2rem;" id="leaseWeeklyDisplay">$${formatCurrency(selectedAircraft.leasePrice || 0)}</div>
              </div>
              <div style="text-align: right;">
                <div style="color: var(--text-muted); font-size: 0.65rem;">Total Commitment</div>
                <div style="color: var(--text-secondary); font-weight: 600; font-size: 0.95rem;" id="leaseTotalDisplay">$${formatCurrency((selectedAircraft.leasePrice || 0) * 36 * 4.33)}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column -->
        <div>
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.4rem; color: var(--text-primary); font-weight: 600; font-size: 0.85rem;">Aircraft Registration</label>
            <div style="display: flex; align-items: stretch; border: 1px solid var(--border-color); border-radius: 4px; overflow: hidden; background: var(--surface-elevated);">
              <div id="leaseRegistrationPrefix" style="padding: 0.6rem; background: var(--surface); border-right: 1px solid var(--border-color); color: var(--text-secondary); font-weight: 600; font-size: 0.95rem; display: flex; align-items: center;">${registrationPrefix}</div>
              <input type="text" id="leaseRegistrationSuffix"
                placeholder="${typeof getSuffixPlaceholder === 'function' ? getSuffixPlaceholder(registrationPrefix) : (registrationPrefix === 'N-' ? '12345' : 'ABCD')}"
                maxlength="${typeof getExpectedSuffixLength === 'function' ? getExpectedSuffixLength(registrationPrefix) : 6}"
                style="flex: 1; padding: 0.6rem; background: transparent; border: none; color: var(--text-primary); font-size: 0.95rem; outline: none; text-transform: uppercase;" />
            </div>
            <div id="leaseRegistrationError" style="margin-top: 0.4rem; color: var(--warning-color); font-size: 0.8rem; display: none;"></div>
          </div>

          <div style="margin-bottom: 1rem; padding: 0.75rem; background: var(--surface-elevated); border-radius: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <label style="color: var(--text-primary); font-weight: 600; font-size: 0.85rem;">Maintenance Scheduling</label>
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <span style="font-size: 0.75rem; color: var(--text-secondary);">Auto All</span>
                <label class="toggle-switch" style="position: relative; display: inline-block; width: 40px; height: 22px;">
                  <input type="checkbox" id="leaseAutoScheduleAll" checked style="opacity: 0; width: 0; height: 0;">
                  <span class="toggle-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #4b5563; transition: 0.3s; border-radius: 22px;"></span>
                </label>
              </div>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.75rem;">Auto-schedule recurring maintenance checks.</div>
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.4rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.3rem; padding: 0.4rem 0.5rem; background: var(--surface); border-radius: 4px;">
                <span style="font-size: 0.7rem; color: #FFA500;">Daily</span>
                <label class="toggle-switch" style="position: relative; display: inline-block; width: 28px; min-width: 28px; height: 16px;">
                  <input type="checkbox" id="leaseAutoScheduleDaily" checked style="opacity: 0; width: 0; height: 0;">
                  <span class="toggle-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #4b5563; transition: 0.3s; border-radius: 16px;"></span>
                </label>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.3rem; padding: 0.4rem 0.5rem; background: var(--surface); border-radius: 4px;">
                <span style="font-size: 0.7rem; color: #8B5CF6;">Wkly</span>
                <label class="toggle-switch" style="position: relative; display: inline-block; width: 28px; min-width: 28px; height: 16px;">
                  <input type="checkbox" id="leaseAutoScheduleWeekly" checked style="opacity: 0; width: 0; height: 0;">
                  <span class="toggle-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #4b5563; transition: 0.3s; border-radius: 16px;"></span>
                </label>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.3rem; padding: 0.4rem 0.5rem; background: var(--surface); border-radius: 4px;">
                <span style="font-size: 0.7rem; color: #3B82F6;">A</span>
                <label class="toggle-switch" style="position: relative; display: inline-block; width: 28px; min-width: 28px; height: 16px;">
                  <input type="checkbox" id="leaseAutoScheduleA" checked style="opacity: 0; width: 0; height: 0;">
                  <span class="toggle-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #4b5563; transition: 0.3s; border-radius: 16px;"></span>
                </label>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.3rem; padding: 0.4rem 0.5rem; background: var(--surface); border-radius: 4px;">
                <span style="font-size: 0.7rem; color: #10B981;">C</span>
                <label class="toggle-switch" style="position: relative; display: inline-block; width: 28px; min-width: 28px; height: 16px;">
                  <input type="checkbox" id="leaseAutoScheduleC" checked style="opacity: 0; width: 0; height: 0;">
                  <span class="toggle-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #4b5563; transition: 0.3s; border-radius: 16px;"></span>
                </label>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.3rem; padding: 0.4rem 0.5rem; background: var(--surface); border-radius: 4px;">
                <span style="font-size: 0.7rem; color: #EF4444;">D</span>
                <label class="toggle-switch" style="position: relative; display: inline-block; width: 28px; min-width: 28px; height: 16px;">
                  <input type="checkbox" id="leaseAutoScheduleD" checked style="opacity: 0; width: 0; height: 0;">
                  <span class="toggle-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #4b5563; transition: 0.3s; border-radius: 16px;"></span>
                </label>
              </div>
            </div>
          </div>

          <div style="margin-bottom: 1rem; padding: 0.75rem; background: var(--surface-elevated); border-radius: 6px;">
            <h4 style="margin: 0 0 0.5rem 0; color: var(--text-muted); font-size: 0.7rem; text-transform: uppercase;">Lease Terms</h4>
            <ul style="margin: 0; padding-left: 1rem; font-size: 0.75rem; color: var(--text-secondary);">

              <li>Aircraft must be returned in good condition</li>
              <li style="color: #f59e0b;">Early termination penalty: <strong>12 weeks</strong> of weekly payments ($${formatCurrency((selectedAircraft.leasePrice || 0) * 12)})</li>
            </ul>
          </div>

          <div style="display: flex; gap: 0.75rem;">
            <button id="confirmLeaseBtn" class="btn btn-primary" style="flex: 1; padding: 0.7rem; font-size: 0.9rem;">Sign Lease Agreement</button>
            <button id="cancelLeaseBtn" class="btn btn-secondary" style="flex: 1; padding: 0.7rem; font-size: 0.9rem;">Cancel</button>
          </div>
        </div>
      </div>
    </div>
    <style>
      .toggle-switch input:checked + .toggle-slider { background-color: var(--accent-color); }
      .toggle-switch .toggle-slider:before { content: ""; position: absolute; height: calc(100% - 4px); aspect-ratio: 1; left: 2px; bottom: 2px; background-color: white; transition: 0.3s; border-radius: 50%; }
      .toggle-switch input:checked + .toggle-slider:before { transform: translateX(calc(100% - 2px)); }
    </style>
  `;

  document.body.appendChild(overlay);

  // Duration spinner logic
  let leaseYears = 3;
  let leaseMonths = 0;
  const minTotalMonths = 36;
  const maxTotalMonths = 144;

  const yearsValueEl = document.getElementById('leaseYearsValue');
  const monthsValueEl = document.getElementById('leaseMonthsValue');
  const totalDisplayEl = document.getElementById('leaseDurationTotal');
  const totalCommitmentEl = document.getElementById('leaseTotalDisplay');

  function getTotalMonths() { return leaseYears * 12 + leaseMonths; }

  function updateDurationDisplay() {
    yearsValueEl.textContent = leaseYears;
    monthsValueEl.textContent = leaseMonths;
    totalDisplayEl.textContent = `${getTotalMonths()} months`;
    const weeklyPrice = selectedAircraft.leasePrice || 0;
    totalCommitmentEl.textContent = '$' + formatCurrency(weeklyPrice * getTotalMonths() * 4.33);
  }

  function adjustYears(delta) {
    const newYears = leaseYears + delta;
    const newTotal = newYears * 12 + leaseMonths;
    if (newYears < 0 || newYears > 12 || newTotal < minTotalMonths || newTotal > maxTotalMonths) return;
    leaseYears = newYears;
    updateDurationDisplay();
  }

  function adjustMonths(delta) {
    let newMonths = leaseMonths + delta;
    let newYears = leaseYears;
    if (newMonths < 0) { if (newYears > 0) { newYears--; newMonths = 11; } else return; }
    else if (newMonths > 11) { if (newYears < 12) { newYears++; newMonths = 0; } else return; }
    const newTotal = newYears * 12 + newMonths;
    if (newTotal < minTotalMonths || newTotal > maxTotalMonths) return;
    leaseYears = newYears;
    leaseMonths = newMonths;
    updateDurationDisplay();
  }

  document.getElementById('leaseYearsDown').addEventListener('click', () => adjustYears(-1));
  document.getElementById('leaseYearsUp').addEventListener('click', () => adjustYears(1));
  document.getElementById('leaseMonthsDown').addEventListener('click', () => adjustMonths(-1));
  document.getElementById('leaseMonthsUp').addEventListener('click', () => adjustMonths(1));
  updateDurationDisplay();

  const autoScheduleAll = document.getElementById('leaseAutoScheduleAll');
  const autoScheduleDaily = document.getElementById('leaseAutoScheduleDaily');
  const autoScheduleWeekly = document.getElementById('leaseAutoScheduleWeekly');
  const autoScheduleA = document.getElementById('leaseAutoScheduleA');
  const autoScheduleC = document.getElementById('leaseAutoScheduleC');
  const autoScheduleD = document.getElementById('leaseAutoScheduleD');
  const individualToggles = [autoScheduleDaily, autoScheduleWeekly, autoScheduleA, autoScheduleC, autoScheduleD];

  autoScheduleAll.addEventListener('change', () => { individualToggles.forEach(toggle => { toggle.checked = autoScheduleAll.checked; }); });
  individualToggles.forEach(toggle => {
    toggle.addEventListener('change', () => {
      autoScheduleAll.checked = individualToggles.every(t => t.checked);
      autoScheduleAll.indeterminate = !autoScheduleAll.checked && !individualToggles.every(t => !t.checked);
    });
  });

  const registrationSuffix = document.getElementById('leaseRegistrationSuffix');
  const registrationError = document.getElementById('leaseRegistrationError');

  function validateLeaseRegistration(suffix) {
    const trimmedSuffix = suffix.trim().toUpperCase();
    if (typeof validateRegistrationSuffix === 'function') {
      const validation = validateRegistrationSuffix(trimmedSuffix, registrationPrefix);
      if (!validation.valid) return validation;
      return { valid: true, value: registrationPrefix + validation.value };
    }
    if (trimmedSuffix.length < 1) return { valid: false, message: 'Please enter a registration suffix' };
    if (!/^[A-Z0-9-]+$/.test(trimmedSuffix)) return { valid: false, message: 'Registration can only contain letters, numbers, and hyphens' };
    return { valid: true, value: registrationPrefix + trimmedSuffix };
  }

  document.getElementById('confirmLeaseBtn').addEventListener('click', () => {
    const suffix = registrationSuffix.value.trim();
    const validation = validateLeaseRegistration(suffix);
    if (!validation.valid) {
      registrationError.textContent = validation.message;
      registrationError.style.display = 'block';
      return;
    }
    const autoSchedulePrefs = {
      autoScheduleDaily: autoScheduleDaily.checked,
      autoScheduleWeekly: autoScheduleWeekly.checked,
      autoScheduleA: autoScheduleA.checked,
      autoScheduleC: autoScheduleC.checked,
      autoScheduleD: autoScheduleD.checked
    };
    document.body.removeChild(overlay);
    confirmLease(validation.value, autoSchedulePrefs, getTotalMonths());
  });

  document.getElementById('cancelLeaseBtn').addEventListener('click', () => { document.body.removeChild(overlay); });

  let regCheckTimer = null;
  let lastCheckedReg = '';
  const leaseInputContainer = registrationSuffix.parentElement;

  registrationSuffix.addEventListener('input', () => {
    registrationError.style.display = 'none';
    leaseInputContainer.style.borderColor = 'var(--border-color)';
    clearTimeout(regCheckTimer);
    const suffix = registrationSuffix.value.trim();
    if (!suffix) { lastCheckedReg = ''; return; }
    const validation = validateLeaseRegistration(suffix);
    if (!validation.valid) return;
    const fullReg = validation.value;
    if (fullReg === lastCheckedReg) return;
    regCheckTimer = setTimeout(async () => {
      try {
        const resp = await fetch(`/api/fleet/check-registration?registration=${encodeURIComponent(fullReg)}`);
        const data = await resp.json();
        lastCheckedReg = fullReg;
        if (data.inUse) {
          registrationError.textContent = `${fullReg} is already in use`;
          registrationError.style.display = 'block';
          leaseInputContainer.style.borderColor = 'var(--warning-color)';
        }
      } catch (e) { /* ignore */ }
    }, 400);
  });

  registrationSuffix.focus();
}

// Actually process the lease after confirmation
async function confirmLease(registration, autoSchedulePrefs = {}, leaseDurationMonths = 12) {
  if (!selectedAircraft) return;

  // Show contract signing animation
  const aircraftName = selectedAircraft.variant
    ? `${selectedAircraft.manufacturer} ${selectedAircraft.model}${selectedAircraft.model.endsWith('-') || selectedAircraft.variant.startsWith('-') ? selectedAircraft.variant : '-' + selectedAircraft.variant}`
    : `${selectedAircraft.manufacturer} ${selectedAircraft.model}`;
  await showContractSigningAnimation('lease', aircraftName, registration, selectedAircraft.leasePrice || selectedAircraft.weeklyLease);

  // Show processing overlay
  showProcessingOverlay('lease');

  try {
    const conditionPercent = selectedAircraft.conditionPercentage || (selectedAircraft.condition === 'New' ? 100 : 70);
    const ageYears = selectedAircraft.age || 0;

    // Use variantId for used aircraft, id for new aircraft
    const aircraftId = selectedAircraft.variantId || selectedAircraft.id;

    // Get lessor info
    const lessor = selectedAircraft.lessor;

    const response = await fetch('/api/fleet/lease', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        aircraftId: aircraftId,
        category: currentCategory,
        condition: selectedAircraft.condition || 'New',
        conditionPercentage: conditionPercent,
        ageYears: ageYears,
        leaseWeeklyPayment: selectedAircraft.leasePrice,
        leaseDurationMonths: leaseDurationMonths,
        lessorName: lessor?.name || null,
        lessorShortName: lessor?.shortName || null,
        lessorCountry: lessor?.country || null,
        maintenanceCostPerHour: selectedAircraft.maintenanceCostPerHour,
        fuelBurnPerHour: selectedAircraft.fuelBurnPerHour,
        purchasePrice: selectedAircraft.purchasePrice, // For reference
        registration: registration,
        // Check validity for used aircraft
        cCheckRemainingDays: selectedAircraft.cCheckRemainingDays || null,
        dCheckRemainingDays: selectedAircraft.dCheckRemainingDays || null,
        // Auto-schedule preferences for all check types
        autoScheduleDaily: autoSchedulePrefs.autoScheduleDaily || false,
        autoScheduleWeekly: autoSchedulePrefs.autoScheduleWeekly || false,
        autoScheduleA: autoSchedulePrefs.autoScheduleA || false,
        autoScheduleC: autoSchedulePrefs.autoScheduleC || false,
        autoScheduleD: autoSchedulePrefs.autoScheduleD || false,
        // Player-to-player listing
        playerListingId: selectedAircraft.playerListingId || null,
        // Cabin configuration
        economySeats: selectedCabinConfig?.economySeats || null,
        economyPlusSeats: selectedCabinConfig?.economyPlusSeats || null,
        businessSeats: selectedCabinConfig?.businessSeats || null,
        firstSeats: selectedCabinConfig?.firstSeats || null,
        toilets: selectedCabinConfig?.toilets || null,
        // Cargo allocation
        cargoConfig: selectedCargoConfig?.cargoConfig || null,
        mainDeckCargoConfig: selectedCargoConfig?.mainDeckCargoConfig || null,
        cargoHoldCargoConfig: selectedCargoConfig?.cargoHoldCargoConfig || null
      })
    });

    const data = await response.json();

    // Hide processing overlay
    hideProcessingOverlay();

    if (response.ok) {
      // Show success message
      showSuccessMessage(`Aircraft leased successfully! Registration: ${data.aircraft.registration}`, data.newBalance);

      // Clear cached inventory so next load fetches fresh data
      clearAircraftCache();

      // Reload marketplace info to update balance
      fetchWorldInfo();
    } else {
      // Show error message
      const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error;
      showErrorMessage(`Lease failed: ${errorMsg}`);
    }
  } catch (error) {
    console.error('Error leasing aircraft:', error);
    hideProcessingOverlay();
    showErrorMessage('Failed to lease aircraft. Please try again.');
  }
}

// Show success message
function showSuccessMessage(message, newBalance) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 2000;
    display: flex;
    justify-content: center;
    align-items: center;
  `;

  overlay.innerHTML = `
    <div style="background: var(--surface); border: 1px solid var(--success-color); border-radius: 8px; padding: 2rem; width: 90%; max-width: 500px; text-align: center;">
      <div style="font-size: 3rem; color: var(--success-color); margin-bottom: 1rem;">✓</div>
      <h2 style="margin-bottom: 1rem; color: var(--text-primary);">SUCCESS</h2>
      <p style="margin-bottom: 1.5rem; color: var(--text-secondary);">${message}</p>
      <p style="margin-bottom: 2rem; color: var(--text-secondary);">New Balance: <strong style="color: var(--success-color);">$${formatCurrency(newBalance)}</strong></p>
      <button id="viewFleetBtn" class="btn btn-primary" style="width: 100%; margin-bottom: 0.5rem;">View My Fleet</button>
      <button id="continueShoppingBtn" class="btn btn-secondary" style="width: 100%;">Purchase / Lease More Aircraft</button>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('viewFleetBtn').addEventListener('click', () => {
    window.location.href = '/fleet';
  });

  document.getElementById('continueShoppingBtn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
}

// Show error message
function showErrorMessage(message) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 2000;
    display: flex;
    justify-content: center;
    align-items: center;
  `;

  overlay.innerHTML = `
    <div style="background: var(--surface); border: 1px solid var(--warning-color); border-radius: 8px; padding: 2rem; width: 90%; max-width: 500px; text-align: center;">
      <div style="font-size: 3rem; color: var(--warning-color); margin-bottom: 1rem;">⚠</div>
      <h2 style="margin-bottom: 1rem; color: var(--text-primary);">ERROR</h2>
      <p style="margin-bottom: 2rem; color: var(--text-secondary);">${message}</p>
      <button id="closeErrorBtn" class="btn btn-primary" style="width: 100%;">Close</button>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('closeErrorBtn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
}

// Update active tab based on current category
function updateActiveTab() {
  const usedTab = document.getElementById('usedTab');
  const newTab = document.getElementById('newTab');

  usedTab.classList.remove('active-tab');
  newTab.classList.remove('active-tab');

  if (currentCategory === 'new') {
    newTab.classList.add('active-tab');
  } else {
    usedTab.classList.add('active-tab');
  }
}

// Kept for backwards compat — now handled by fetchWorldInfo()
async function loadMarketplaceInfo() {
  // No-op: world info (balance, airline name) is now loaded in fetchWorldInfo()
}

// ── Range Map Modal ────────────────────────────────────────────────────────────
function showRangeMap(rangeNm) {
  if (!rangeNm) return;

  // Overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:9000;display:flex;justify-content:center;align-items:center;padding:1rem;';

  overlay.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border-color);border-radius:10px;width:100%;max-width:800px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 1rem;border-bottom:1px solid var(--border-color);">
        <div>
          <span style="font-size:0.95rem;font-weight:700;color:var(--text-primary);">Range Map</span>
          <span style="font-size:0.75rem;color:var(--text-muted);margin-left:0.6rem;">${rangeNm.toLocaleString()} nm from home base</span>
        </div>
        <button id="rangeMapClose" style="background:none;border:none;color:var(--text-muted);font-size:1.2rem;cursor:pointer;padding:0.2rem 0.4rem;">&times;</button>
      </div>
      <div id="rangeMapContainer" style="flex:1;min-height:480px;position:relative;"></div>
    </div>`;

  document.body.appendChild(overlay);
  overlay.querySelector('#rangeMapClose').addEventListener('click', () => document.body.removeChild(overlay));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) document.body.removeChild(overlay); });

  // Load Leaflet then render
  function _initRangeMap(lat, lng, airportName) {
    const container = document.getElementById('rangeMapContainer');
    if (!container) return;

    const map = L.map(container, {
      center: [lat, lng],
      zoom: 3,
      minZoom: 2,
      maxZoom: 8,
      zoomControl: true,
      attributionControl: true,
      worldCopyJump: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19
    }).addTo(map);

    // Range circle (great circle) — 1 nm = 1852 m
    const circle = L.circle([lat, lng], {
      radius: rangeNm * 1852,
      color: '#10b981',
      weight: 1.5,
      opacity: 0.9,
      fillColor: '#10b981',
      fillOpacity: 0.07,
      dashArray: '6,4'
    }).addTo(map);

    // Home base marker
    const icon = L.divIcon({
      html: '<div style="width:10px;height:10px;background:#10b981;border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px rgba(16,185,129,0.8);"></div>',
      iconSize: [10, 10],
      iconAnchor: [5, 5],
      className: ''
    });
    L.marker([lat, lng], { icon }).addTo(map)
      .bindTooltip(airportName || 'Home Base', { permanent: true, direction: 'top', offset: [0, -8], className: 'leaflet-tooltip' });

    // Fit map to the range circle bounds
    map.fitBounds(circle.getBounds(), { padding: [20, 20] });

    // Invalidate size after modal is visible
    setTimeout(() => map.invalidateSize(), 50);
  }

  function _loadLeafletAndRender(lat, lng, name) {
    if (window.L) {
      _initRangeMap(lat, lng, name);
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => _initRangeMap(lat, lng, name);
    script.onerror = () => {
      const c = document.getElementById('rangeMapContainer');
      if (c) c.innerHTML = '<div style="color:var(--text-muted);padding:2rem;text-align:center;">Could not load map library</div>';
    };
    document.head.appendChild(script);
  }

  // Get home base from cached worldInfo or fetch it
  const wi = window._worldInfo || window.worldInfo;
  if (wi && wi.baseAirport && wi.baseAirport.latitude != null) {
    _loadLeafletAndRender(wi.baseAirport.latitude, wi.baseAirport.longitude, `${wi.baseAirport.icaoCode} – ${wi.baseAirport.name}`);
  } else {
    fetch('/api/world/info').then(r => r.json()).then(info => {
      const ap = info.baseAirport;
      if (ap && ap.latitude != null) {
        _loadLeafletAndRender(ap.latitude, ap.longitude, `${ap.icaoCode} – ${ap.name}`);
      } else {
        const c = document.getElementById('rangeMapContainer');
        if (c) c.innerHTML = '<div style="color:var(--text-muted);padding:2rem;text-align:center;">Home base location not available</div>';
      }
    }).catch(() => {
      const c = document.getElementById('rangeMapContainer');
      if (c) c.innerHTML = '<div style="color:var(--text-muted);padding:2rem;text-align:center;">Could not load world info</div>';
    });
  }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
  clearAircraftCache(); // Clear stale prices on page load
  await fetchWorldInfo(); // Must complete first — sets isSinglePlayer for cache decision
  loadAircraft();
});
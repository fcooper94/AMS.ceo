let selectedWorldId = null;
let bankruptcyWorldId = null;
let endWorldId = null;
let rejoinWorldId = null;
let rejoinAirportId = null;
let rejoinSearchTimeout = null;
let selectedAirportId = null;
let airportSearchTimeout = null;
let allAirports = [];
let filteredAirports = [];

// SP modal state
let spSelectedAirportId = null;
let spAirportSearchTimeout = null;
let airportBrowserContext = 'join'; // 'join' or 'sp'

// AI count — same across all difficulties (~800), difficulty only affects AI behaviour
const AI_TOTAL_COUNTS = { easy: 800, medium: 800, hard: 800 };

// Airport loading overlay functions
function showAirportLoadingOverlay(message = 'Loading...') {
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
        <div id="airportLoadingMessage" style="font-size: 1.2rem; font-weight: 600; color: var(--text-primary);"></div>
        <div id="loading-quip-world" style="font-size: 0.8rem; color: var(--text-muted); font-style: italic; margin-top: 0.75rem;"></div>
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
  const messageEl = overlay.querySelector('#airportLoadingMessage');
  if (messageEl) {
    messageEl.innerHTML = message;
  }
  overlay.style.display = 'flex';
  startLoadingQuips('loading-quip-world');
}

function updateAirportLoadingOverlay(message) {
  const overlay = document.getElementById('airportLoadingOverlay');
  if (overlay) {
    const messageEl = overlay.querySelector('#airportLoadingMessage');
    if (messageEl) {
      messageEl.innerHTML = message;
    }
  }
}

function hideAirportLoadingOverlay() {
  stopLoadingQuips();
  const overlay = document.getElementById('airportLoadingOverlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

// Mode selection
function selectMode(mode) {
  document.getElementById('modeSelector').style.display = 'none';
  document.getElementById('worldListView').style.display = 'block';
  document.getElementById('singlePlayerSection').style.display = mode === 'sp' ? 'block' : 'none';
  document.getElementById('multiplayerSection').style.display = mode === 'mp' ? 'block' : 'none';
}

function backToModeSelector() {
  document.getElementById('modeSelector').style.display = 'block';
  document.getElementById('worldListView').style.display = 'none';
}

// World time tracking for live clocks
let worldTimeReferences = {}; // { worldId: { referenceTime, referenceTimestamp, acceleration } }
let worldCardsClockInterval = null;

// Calculate current time for a specific world
function calculateWorldTime(worldId) {
  const ref = worldTimeReferences[worldId];
  if (!ref) return null;

  // Paused worlds don't advance
  if (ref.isPaused) return new Date(ref.referenceTime.getTime());

  const realElapsedMs = Date.now() - ref.referenceTimestamp;
  const gameElapsedMs = realElapsedMs * ref.acceleration;
  return new Date(ref.referenceTime.getTime() + gameElapsedMs);
}

// Update all world clocks on the page
function updateAllWorldClocks() {
  Object.keys(worldTimeReferences).forEach(worldId => {
    const currentTime = calculateWorldTime(worldId);
    if (!currentTime) return;

    // Find all time elements for this world
    const timeElements = document.querySelectorAll(`[data-world-id="${worldId}"] .world-current-time`);
    timeElements.forEach(el => {
      el.textContent = currentTime.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      });
    });
  });
}

// Start the real-time clock updates
function startWorldClocks() {
  if (worldCardsClockInterval) {
    clearInterval(worldCardsClockInterval);
  }
  worldCardsClockInterval = setInterval(updateAllWorldClocks, 100); // Update every 100ms
}

// Show a general loading overlay
function showLoadingOverlay(message = 'Loading...') {
  let overlay = document.getElementById('generalLoadingOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'generalLoadingOverlay';
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
          <div class="general-spinner" style="
            border: 4px solid var(--border-color);
            border-top: 4px solid var(--accent-color);
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: generalSpin 1s linear infinite;
            margin: 0 auto 1.5rem auto;
          "></div>
        </div>
        <div id="generalLoadingMessage" style="font-size: 1.2rem; font-weight: 600; color: var(--text-primary);"></div>
      </div>
      <style>
        @keyframes generalSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    document.body.appendChild(overlay);
  }
  const messageEl = overlay.querySelector('#generalLoadingMessage');
  if (messageEl) {
    messageEl.innerHTML = message;
  }
  overlay.style.display = 'flex';
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('generalLoadingOverlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

// Load available worlds
async function loadWorlds() {
  // Show loading message in both lists
  const loadingHtml = `
    <div style="text-align: center; padding: 3rem; color: var(--text-secondary); grid-column: 1 / -1;">
      <div style="
        border: 3px solid var(--border-color);
        border-top: 3px solid var(--accent-color);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: worldsLoadSpin 1s linear infinite;
        margin: 0 auto 1rem auto;
      "></div>
      <div style="font-size: 1rem;">Loading worlds...</div>
    </div>
    <style>
      @keyframes worldsLoadSpin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
  const spListLoading = document.getElementById('singlePlayerList');
  if (spListLoading) spListLoading.innerHTML = loadingHtml;

  try {
    const response = await fetch('/api/worlds/available');

    if (!response.ok) {
      if (response.status === 401) {
        // Not authenticated, redirect to login
        window.location.href = '/';
        return;
      }
      throw new Error(`Failed to load worlds: ${response.status} ${response.statusText}`);
    }

    const worlds = await response.json();

    // Fetch user credits to determine if join buttons should be enabled
    let userCredits = 0;
    let userUnlimited = false;
    try {
      const authResponse = await fetch('/auth/status');
      const authData = await authResponse.json();
      if (authData.authenticated && authData.user) {
        userCredits = authData.user.credits !== undefined ? authData.user.credits : 0;
        userUnlimited = !!authData.user.unlimitedCredits;
      }
    } catch (e) {
      console.error('Error fetching user credits for world cards:', e);
    }

    const spList = document.getElementById('singlePlayerList');
    const mpList = document.getElementById('multiplayerList');
    const mpSection = document.getElementById('multiplayerSection');

    if (!Array.isArray(worlds)) {
      console.error('Invalid response format:', worlds);
      spList.innerHTML = '<div class="empty-message">Error loading worlds. Please refresh the page.</div>';
      return;
    }

    // Split by world type
    const spWorlds = worlds.filter(w => w.worldType === 'singleplayer');
    const mpWorlds = worlds.filter(w => w.worldType !== 'singleplayer');

    // Sort: member worlds first (by last visited), then available worlds (by name)
    const sortWorlds = (list) => {
      list.sort((a, b) => {
        if (a.isMember && !b.isMember) return -1;
        if (!a.isMember && b.isMember) return 1;
        if (a.isMember && b.isMember) {
          const aTime = a.lastVisited ? new Date(a.lastVisited).getTime() : 0;
          const bTime = b.lastVisited ? new Date(b.lastVisited).getTime() : 0;
          if (bTime !== aTime) return bTime - aTime;
        }
        return (a.name || '').localeCompare(b.name || '');
      });
    };
    sortWorlds(spWorlds);
    sortWorlds(mpWorlds);

    // Store time references for active worlds only (ended/paused worlds don't tick)
    worlds.forEach(world => {
      if (world.status !== 'completed') {
        worldTimeReferences[world.id] = {
          referenceTime: new Date(world.currentTime),
          referenceTimestamp: Date.now(),
          acceleration: world.timeAcceleration || 60,
          isPaused: !!world.isPaused
        };
      }
    });

    // Populate single player section
    spList.innerHTML = '';
    if (spWorlds.length > 0) {
      spWorlds.forEach(world => {
        const cardElement = createWorldCard(world, world.isMember, userCredits, userUnlimited);
        spList.appendChild(cardElement);
      });
    }
    // Always append the "create new world" card
    spList.appendChild(createNewWorldCard());

    // Populate multiplayer section
    mpList.innerHTML = '';
    if (mpWorlds.length > 0) {
      mpWorlds.forEach(world => {
        const cardElement = createWorldCard(world, world.isMember, userCredits, userUnlimited);
        mpList.appendChild(cardElement);
      });
    } else {
      mpList.innerHTML = '<div class="empty-message" style="grid-column: 1 / -1;">No multiplayer worlds available.</div>';
    }

    // Update global stats bar - credits shown immediately
    const statCredits = document.getElementById('statCredits');
    if (statCredits) {
      statCredits.textContent = userUnlimited ? '\u221E' : userCredits;
    }
    const statsBar = document.getElementById('globalStatsBar');
    if (statsBar) statsBar.style.display = 'flex';

    // Fetch global stats (all airlines, aircraft, routes across all worlds)
    try {
      const statsRes = await fetch('/api/worlds/global-stats');
      if (statsRes.ok) {
        const stats = await statsRes.json();
        const fmt = n => Number(n).toLocaleString();
        const elAirlines = document.getElementById('statTotalAirlines');
        const elAircraft = document.getElementById('statTotalAircraft');
        const elRoutes = document.getElementById('statTotalRoutes');
        if (elAirlines) elAirlines.textContent = fmt(stats.totalAirlines);
        if (elAircraft) elAircraft.textContent = fmt(stats.totalAircraft);
        if (elRoutes) elRoutes.textContent = fmt(stats.totalRoutes);
      }
    } catch (e) {
      // Non-critical, leave as dashes
    }

    // Start real-time clock updates
    startWorldClocks();

    // Check for ?rejoin=WORLD_ID query param (from bankruptcy "Start Fresh" button)
    const urlParams = new URLSearchParams(window.location.search);
    const rejoinId = urlParams.get('rejoin');
    if (rejoinId) {
      // Clean the URL so refreshing doesn't re-trigger
      window.history.replaceState({}, '', window.location.pathname);
      // Find the world name from loaded data
      const rejoinWorld = worlds.find(w => w.id === rejoinId);
      if (rejoinWorld && rejoinWorld.worldType === 'singleplayer' && rejoinWorld.status !== 'completed') {
        // Auto-switch to SP view and open rejoin modal
        selectMode('sp');
        openRejoinModal(rejoinId, rejoinWorld.name || 'SP World');
      }
    }

  } catch (error) {
    console.error('Error loading worlds:', error);
    const spListErr = document.getElementById('singlePlayerList');
    if (spListErr) {
      spListErr.innerHTML = '<div class="empty-message" style="grid-column: 1 / -1;">Error loading worlds. Please refresh the page.</div>';
    }
  }
}

// Create world card element (returns DOM element)
function createWorldCard(world, isMember, userCredits, userUnlimited) {
  const isSP = world.worldType === 'singleplayer';
  const isEnded = world.status === 'completed';
  const timeDate = new Date(world.currentTime);
  const formattedDate = timeDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const formattedTime = timeDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // SP worlds always have fixed pricing regardless of stored DB values
  const weeklyCost = isSP ? 1 : (world.weeklyCost !== undefined ? world.weeklyCost : 1);
  const joinCost = isSP ? 10 : (world.joinCost !== undefined ? world.joinCost : 10);
  const freeWeeks = world.freeWeeks || 0;

  // Calculate remaining free weeks
  // SP: from world startDate. MP members: from joinedAt. MP non-members: show promo text.
  let freeWeeksRemaining = 0;
  if (freeWeeks > 0 && world.currentTime) {
    const referenceDate = isSP ? world.startDate : (isMember ? world.joinedAt : null);
    if (referenceDate) {
      const weeksElapsed = Math.floor((new Date(world.currentTime) - new Date(referenceDate)) / (7 * 24 * 60 * 60 * 1000));
      freeWeeksRemaining = Math.max(0, freeWeeks - weeksElapsed);
    }
  }
  const canAffordJoin = !isMember && !isEnded && (userUnlimited || (userCredits || 0) >= joinCost);

  // Difficulty badge colors
  const difficultyColors = { easy: '#22c55e', medium: '#f59e0b', hard: '#ef4444' };
  const difficultyColor = difficultyColors[world.difficulty] || '#f59e0b';

  // Check if world is ending within 6 game months
  let endingBannerHtml = '';
  if (world.endDate) {
    const endDate = new Date(world.endDate);
    const currentGameTime = new Date(world.currentTime);
    const sixMonthsMs = 6 * 30 * 24 * 60 * 60 * 1000; // ~6 months in ms
    const timeRemaining = endDate.getTime() - currentGameTime.getTime();

    if (isEnded) {
      const endDateFormatted = new Date(world.endDate).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
      endingBannerHtml = `
        <div class="world-card-ending-banner ended-banner">
          This world ended on ${endDateFormatted}
        </div>
      `;
    } else if (timeRemaining <= sixMonthsMs && timeRemaining > 0) {
      const endDateFormatted = endDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      endingBannerHtml = `
        <div class="world-card-ending-banner">
          This world will end at 23:59 on ${endDateFormatted}
        </div>
      `;
    }
  }

  const card = document.createElement('div');
  card.className = `world-card ${isMember ? 'member' : ''} ${isEnded ? 'ended' : ''}`;
  card.setAttribute('data-world-id', world.id);

  // Build the 4th stat column differently for SP vs MP
  const fourthStat = isSP
    ? `<div class="world-card-stat">
        <div class="world-card-stat-label">AI Airlines</div>
        <div class="world-card-stat-value">${world.aiCount || 0}</div>
      </div>`
    : `<div class="world-card-stat">
        <div class="world-card-stat-label">Members</div>
        <div class="world-card-stat-value">${world.memberCount || 0}/${world.maxPlayers || 100}</div>
      </div>`;

  // Build header badges - type icon + label
  const mpIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -1px; margin-right: 3px;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
  const spIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -1px; margin-right: 3px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

  const typeBadge = isSP
    ? `<span class="world-card-status" style="background: rgba(99, 102, 241, 0.2); color: #818cf8;">${spIcon}Single Player</span>`
    : `<span class="world-card-status" style="background: rgba(37, 99, 235, 0.15); color: var(--accent-color);">${mpIcon}Multiplayer</span>`;

  const memberStatusBadge = isEnded
    ? `<span class="world-card-status" style="background: rgba(107, 114, 128, 0.2); color: #9ca3af;">Ended</span>`
    : (isSP
      ? ''
      : (isMember
        ? `<span class="world-card-status" style="background: rgba(5, 150, 105, 0.15); color: var(--success-color);">Joined</span>`
        : `<span class="world-card-status">Available</span>`));

  const difficultyBadge = isSP && world.difficulty
    ? `<span class="world-card-status" style="background: ${difficultyColor}22; color: ${difficultyColor}; text-transform: uppercase;">${world.difficulty}</span>`
    : '';

  // Build footer
  let footerHtml;
  if (isEnded && isMember) {
    footerHtml = `
      <div class="world-card-costs">
        <span class="cost-badge weekly" style="background: rgba(107, 114, 128, 0.15); color: #9ca3af;">No longer active</span>
      </div>
      <button class="btn btn-primary continue-game-btn" style="background: #4b5563; border-color: #6b7280;">VIEW</button>
    `;
  } else if (isEnded) {
    footerHtml = `
      <div class="world-card-costs">
        <span class="cost-badge weekly" style="background: rgba(107, 114, 128, 0.15); color: #9ca3af;">This world has ended</span>
      </div>
    `;
  } else if (isSP && isMember) {
    footerHtml = `
      <div class="world-card-costs">
        <span class="cost-badge weekly">${weeklyCost} Credit/wk</span>
        ${freeWeeksRemaining > 0 ? `<span class="cost-badge free">${freeWeeksRemaining} free wk${freeWeeksRemaining !== 1 ? 's' : ''} remaining</span>` : ''}
      </div>
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        <button class="btn btn-primary continue-game-btn" style="flex: 1;">CONTINUE</button>
        <button class="end-world-btn" title="End World" style="
          padding: 0.5rem;
          background: transparent;
          border: 1px solid rgba(248, 81, 73, 0.3);
          border-radius: 4px;
          color: #f85149;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        " onmouseenter="this.style.background='rgba(248,81,73,0.15)'" onmouseleave="this.style.background='transparent'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>
        </button>
      </div>
    `;
  } else if (isSP && !isMember) {
    footerHtml = `
      <div class="world-card-costs">
        <span class="cost-badge weekly" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b;">No active airline</span>
      </div>
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        <button class="btn btn-primary rejoin-world-btn" style="flex: 1; background: #22c55e; border-color: #16a34a;">REJOIN</button>
        <button class="end-world-btn" title="End World" style="
          padding: 0.5rem;
          background: transparent;
          border: 1px solid rgba(248, 81, 73, 0.3);
          border-radius: 4px;
          color: #f85149;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        " onmouseenter="this.style.background='rgba(248,81,73,0.15)'" onmouseleave="this.style.background='transparent'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>
        </button>
      </div>
    `;
  } else {
    footerHtml = `
      <div class="world-card-costs">
        <span class="cost-badge weekly">${weeklyCost} Credit/wk</span>
        ${!isMember ? `<span class="cost-badge join">${joinCost} to join</span>` : ''}
        ${!isMember && freeWeeks > 0 ? `<span class="cost-badge free">First ${freeWeeks} wks free!</span>` : ''}
        ${isMember && freeWeeksRemaining > 0 ? `<span class="cost-badge free">${freeWeeksRemaining} free wk${freeWeeksRemaining !== 1 ? 's' : ''} remaining</span>` : ''}
      </div>
      ${isMember ? `
        <button class="btn btn-primary continue-game-btn">CONTINUE</button>
      ` : (canAffordJoin ? `
        <button class="btn btn-primary join-game-btn">JOIN</button>
      ` : `
        <button class="btn btn-primary join-game-btn disabled" disabled title="Not enough credits">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align: -2px; margin-right: 4px;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
          </svg>JOIN
        </button>
      `)}
    `;
  }

  card.innerHTML = `
    <div class="world-card-header">
      ${typeBadge}
      ${memberStatusBadge}
      ${difficultyBadge}
      <span class="world-card-era">ERA ${world.era || 2010}</span>
    </div>

    ${endingBannerHtml}

    <div class="world-card-body">
      <div class="world-card-name">${world.name || 'Unnamed World'}</div>
      ${isMember && world.airlineName ? `
        <div class="world-card-airline">${world.airlineName} (${world.airlineCode})</div>
      ` : ''}
      ${!isSP && world.description ? `
        <div class="world-card-description">${world.description}</div>
      ` : ''}
      <div class="world-card-stats">
        ${isEnded ? `
        <div class="world-card-stat" style="grid-column: 1 / 4; text-align: center;">
          <div class="world-card-stat-label">Status</div>
          <div class="world-card-stat-value" style="color: #9ca3af;">Ended</div>
        </div>
        ` : `
        <div class="world-card-stat">
          <div class="world-card-stat-label">Date</div>
          <div class="world-card-stat-value">${formattedDate}</div>
        </div>
        <div class="world-card-stat">
          <div class="world-card-stat-label">Time</div>
          <div class="world-card-stat-value world-current-time">${formattedTime}</div>
        </div>
        <div class="world-card-stat">
          <div class="world-card-stat-label">Speed</div>
          <div class="world-card-stat-value">${world.isPaused ? '<span style="color: #f59e0b;">PAUSED</span>' : `${world.timeAcceleration || 60}x`}</div>
        </div>
        `}
        ${fourthStat}
      </div>
    </div>

    <div class="world-card-footer">
      ${footerHtml}
    </div>
  `;

  // Click on entire card body navigates
  const cardBody = card.querySelector('.world-card-body');
  if (cardBody) {
    cardBody.addEventListener('click', () => {
      if (isSP && !isMember && !isEnded) {
        openRejoinModal(world.id, world.name);
      } else if (isMember || isSP) {
        enterWorld(world.id);
      } else {
        openJoinModal(world.id, world.name, world.joinCost, world.weeklyCost, world.freeWeeks);
      }
    });
  }

  const continueGameBtn = card.querySelector('.continue-game-btn');
  const joinGameBtn = card.querySelector('.join-game-btn');

  if (continueGameBtn) {
    continueGameBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      enterWorld(world.id);
    });
  }

  const rejoinBtn = card.querySelector('.rejoin-world-btn');
  if (rejoinBtn) {
    rejoinBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      openRejoinModal(world.id, world.name);
    });
  }

  const endWorldBtn = card.querySelector('.end-world-btn');
  if (endWorldBtn) {
    endWorldBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      openEndWorldModal(world.id, world.name);
    });
  }

  if (joinGameBtn) {
    joinGameBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      openJoinModal(world.id, world.name, world.joinCost, world.weeklyCost, world.freeWeeks);
    });
  }

  return card;
}

// Create the "create new world" card for SP section
function createNewWorldCard() {
  const card = document.createElement('div');
  card.className = 'world-card';
  card.style.cssText = 'border: 2px dashed var(--border-color); border-left: 3px dashed var(--border-color); cursor: pointer; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 200px; transition: all 0.2s;';

  card.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 1rem; opacity: 0.7;">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="16"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
      </svg>
      <div style="font-size: 1.1rem; font-weight: 700; color: var(--primary-color); margin-bottom: 0.5rem;">CREATE NEW WORLD</div>
      <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4;">Start a new single player airline with AI competition</div>
      <div style="margin-top: 0.75rem; font-size: 0.75rem; color: var(--text-muted);">
        <span style="background: rgba(99, 102, 241, 0.15); color: #818cf8; padding: 0.2rem 0.5rem; border-radius: 3px; font-weight: 600;">10 Credits</span>
        <span style="margin-left: 0.4rem;">First 4 weeks free</span>
      </div>
    </div>
  `;

  card.addEventListener('mouseenter', () => {
    card.style.borderColor = 'var(--primary-color)';
    card.style.background = 'var(--surface-elevated)';
  });
  card.addEventListener('mouseleave', () => {
    card.style.borderColor = 'var(--border-color)';
    card.style.background = 'var(--surface)';
  });
  card.addEventListener('click', () => openCreateSPModal());

  return card;
}

// Update starting capital info based on world
async function updateStartingInfo() {
  const capitalEl = document.getElementById('startingCapital');

  if (!selectedWorldId) {
    capitalEl.textContent = 'Starting Capital: Select a world first';
    return;
  }

  try {
    // Fetch era-appropriate starting capital from server
    const response = await fetch(`/api/worlds/${selectedWorldId}/starting-capital`);
    const data = await response.json();

    if (response.ok) {
      capitalEl.textContent = `Starting Capital: ${data.formattedCapital} (${data.eraName})`;
    } else {
      console.error('Failed to fetch starting capital:', data.error);
      capitalEl.textContent = 'Starting Capital: Error loading';
    }
  } catch (error) {
    console.error('Error fetching starting capital:', error);
    capitalEl.textContent = 'Starting Capital: Error loading';
  }
}

// Search airports
async function searchAirports(query) {
  if (!query || query.length < 2) {
    document.getElementById('airportResults').style.display = 'none';
    return;
  }

  try {
    // Pass the selected world ID to filter airports by operational dates
    const worldParam = selectedWorldId ? `&worldId=${selectedWorldId}` : '';
    const response = await fetch(`/api/world/airports?search=${encodeURIComponent(query)}${worldParam}`);

    const resultsDiv = document.getElementById('airportResults');

    if (!response.ok) {
      resultsDiv.innerHTML = '<div style="padding: 1rem; color: var(--warning-color);">Error loading airports</div>';
      resultsDiv.style.display = 'block';
      return;
    }

    const data = await response.json();
    const airports = data.airports || data; // Support both new and old format

    if (!Array.isArray(airports) || airports.length === 0) {
      resultsDiv.innerHTML = '<div style="padding: 1rem; color: var(--text-secondary);">No airports found</div>';
      resultsDiv.style.display = 'block';
      return;
    }

    resultsDiv.innerHTML = airports.slice(0, 10).map(airport => `
      <div class="airport-result-item" onclick="selectAirport('${airport.id}', '${airport.name.replace(/'/g, "\\'")}', '${airport.city}', '${airport.country}', '${airport.icaoCode}', ${airport.trafficDemand || 10}, ${airport.spareCapacity || 0}, ${airport.annualPassengers || 1})" style="
        padding: 0.75rem 1rem;
        cursor: pointer;
        border-bottom: 1px solid var(--border-color);
      " onmouseover="this.style.background='var(--surface)'" onmouseout="this.style.background='var(--surface-elevated)'">
        <div style="font-weight: 600; color: var(--text-primary);">${airport.name} (${airport.icaoCode})</div>
        <div style="font-size: 0.85rem; color: var(--text-secondary);">${airport.city}, ${airport.country} • ${airport.type}</div>
        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem; display: flex; gap: 1rem;">
          <span>Demand: ${airport.trafficDemand || 10}/20</span>
          <span>Spare Capacity: ${airport.spareCapacity || 0}%</span>
          <span>Airlines: ${airport.airlinesBasedHere || 0}</span>
        </div>
      </div>
    `).join('');

    resultsDiv.style.display = 'block';
  } catch (error) {
    console.error('Error searching airports:', error);
  }
}

// Generate colored scale visualization (1-20)
function generateLevelScale(level) {
  const dots = [];
  for (let i = 1; i <= 20; i++) {
    let color;
    if (i <= 6) color = '#ef4444'; // Red for low (1-6)
    else if (i <= 12) color = '#f59e0b'; // Orange for medium (7-12)
    else if (i <= 16) color = '#eab308'; // Yellow for medium-high (13-16)
    else color = '#22c55e'; // Green for high (17-20)

    const isFilled = i <= level;
    dots.push(`
      <div style="
        width: 14px;
        height: 14px;
        border-radius: 2px;
        background: ${isFilled ? color : 'transparent'};
        border: 1.5px solid ${color};
        opacity: ${isFilled ? '1' : '0.3'};
        flex-shrink: 0;
      "></div>
    `);
  }

  return `
    <div style="display: flex; gap: 2px; align-items: center;">
      ${dots.join('')}
      <span style="margin-left: 0.5rem; font-size: 0.75rem; color: var(--text-primary); font-weight: 600; white-space: nowrap;">${level}/20</span>
    </div>
  `;
}

// Generate colored scale visualization for percentage (0-100%)
function generateCapacityScale(percentage) {
  const dots = [];
  for (let i = 1; i <= 20; i++) {
    const threshold = (i / 20) * 100; // Convert to percentage
    let color;
    if (threshold <= 30) color = '#22c55e'; // Green for low capacity (more spare)
    else if (threshold <= 60) color = '#eab308'; // Yellow for medium
    else if (threshold <= 80) color = '#f59e0b'; // Orange for high
    else color = '#ef4444'; // Red for very high (little spare capacity)

    const isFilled = threshold <= percentage;
    dots.push(`
      <div style="
        width: 14px;
        height: 14px;
        border-radius: 2px;
        background: ${isFilled ? color : 'transparent'};
        border: 1.5px solid ${color};
        opacity: ${isFilled ? '1' : '0.3'};
        flex-shrink: 0;
      "></div>
    `);
  }

  return `
    <div style="display: flex; gap: 2px; align-items: center;">
      ${dots.join('')}
      <span style="margin-left: 0.5rem; font-size: 0.75rem; color: var(--text-primary); font-weight: 600; white-space: nowrap;">${percentage}%</span>
    </div>
  `;
}

// Select airport
function selectAirport(id, name, city, country, icao, trafficDemand, spareCapacity, annualPassengers) {
  selectedAirportId = id;
  document.getElementById('baseAirport').value = id;
  document.getElementById('selectedAirportName').textContent = `${name} (${icao})`;
  document.getElementById('selectedAirportLocation').textContent = `${city}, ${country}`;

  // Set traffic demand scale
  document.getElementById('selectedAirportTraffic').innerHTML = generateLevelScale(trafficDemand || 5, 'Traffic');

  // Display annual passengers
  const paxText = annualPassengers >= 1
    ? `${annualPassengers.toFixed(1)}M passengers/year`
    : `${(annualPassengers * 1000).toFixed(0)}K passengers/year`;
  document.getElementById('selectedAirportPassengers').textContent = paxText;

  // Set spare capacity scale
  document.getElementById('selectedAirportInfrastructure').innerHTML = generateCapacityScale(spareCapacity || 0);

  document.getElementById('selectedAirportDisplay').style.display = 'block';
  document.getElementById('airportSearch').style.display = 'none';
  document.getElementById('airportResults').style.display = 'none';
  document.getElementById('joinError').style.display = 'none';
}

// Clear selected airport
function clearSelectedAirport() {
  selectedAirportId = null;
  document.getElementById('baseAirport').value = '';
  document.getElementById('airportSearch').value = '';
  document.getElementById('airportSearch').style.display = 'block';
  document.getElementById('selectedAirportDisplay').style.display = 'none';
  document.getElementById('airportResults').style.display = 'none';
}

// Open join modal
async function openJoinModal(worldId, worldName, joinCost, weeklyCost, freeWeeks) {
  selectedWorldId = worldId;
  selectedAirportId = null;
  const worldJoinCost = joinCost !== undefined ? joinCost : 10;
  const worldWeeklyCost = weeklyCost !== undefined ? weeklyCost : 1;
  const worldFreeWeeks = freeWeeks || 0;

  document.getElementById('selectedWorldName').textContent = worldName;
  document.getElementById('airlineName').value = '';
  document.getElementById('airlineCode').value = '';
  document.getElementById('iataCode').value = '';
  document.getElementById('baseAirport').value = '';
  document.getElementById('airportSearch').value = '';
  document.getElementById('airportSearch').style.display = 'block';
  document.getElementById('selectedAirportDisplay').style.display = 'none';
  document.getElementById('airportResults').style.display = 'none';
  document.getElementById('joinError').style.display = 'none';
  document.getElementById('startingCapital').textContent = 'Starting Capital: Loading...';

  // Update join cost display dynamically
  const creditCostEl = document.getElementById('creditCost');
  if (creditCostEl) {
    creditCostEl.innerHTML = `
      <span style="color: var(--warning-color); font-weight: 600;">Join Cost: ${worldJoinCost} Credits</span>
      <span id="modalUserCredits" style="margin-left: 0.5rem; color: var(--text-secondary);">(Loading...)</span>
    `;
  }
  const weeklyInfoEl = document.getElementById('weeklyMembershipCost');
  if (weeklyInfoEl) {
    let weeklyText = `+ ${worldWeeklyCost} credit${worldWeeklyCost !== 1 ? 's' : ''} per game week to maintain membership`;
    if (worldFreeWeeks > 0) {
      weeklyText += ` (first ${worldFreeWeeks} week${worldFreeWeeks !== 1 ? 's' : ''} free!)`;
    }
    weeklyInfoEl.textContent = weeklyText;
  }

  document.getElementById('joinModal').style.display = 'flex';

  // Fetch and display starting capital for this world
  updateStartingInfo();

  // Fetch and display user's current credits
  try {
    const response = await fetch('/auth/status');
    const data = await response.json();
    const creditsEl = document.getElementById('modalUserCredits');

    if (data.authenticated && data.user) {
      const credits = data.user.credits !== undefined ? data.user.credits : 0;
      const unlimited = !!data.user.unlimitedCredits;
      if (unlimited) {
        creditsEl.textContent = '(Unlimited credits)';
        creditsEl.style.color = 'var(--success-color)';
      } else if (credits >= worldJoinCost) {
        creditsEl.textContent = `(You have ${credits} credits)`;
        creditsEl.style.color = 'var(--success-color)';
      } else {
        creditsEl.textContent = `(You only have ${credits} credits - need ${worldJoinCost})`;
        creditsEl.style.color = 'var(--danger-color)';
      }
    } else {
      creditsEl.textContent = '(Not logged in)';
      creditsEl.style.color = 'var(--danger-color)';
    }
  } catch (error) {
    console.error('Error fetching user credits:', error);
    document.getElementById('userCredits').textContent = '(Error loading credits)';
  }
}

// Close join modal
function closeJoinModal() {
  document.getElementById('joinModal').style.display = 'none';
  selectedWorldId = null;
}

// Confirm join
async function confirmJoin() {
  const airlineName = document.getElementById('airlineName').value.trim();
  const airlineCode = document.getElementById('airlineCode').value.trim().toUpperCase();
  const iataCode = document.getElementById('iataCode').value.trim().toUpperCase();
  const baseAirportId = document.getElementById('baseAirport').value;
  const errorDiv = document.getElementById('joinError');

  // Validation
  if (!airlineName || !airlineCode || !iataCode) {
    errorDiv.textContent = 'Please fill in all required fields';
    errorDiv.style.display = 'block';
    return;
  }

  if (!baseAirportId) {
    errorDiv.textContent = 'Please select a base airport';
    errorDiv.style.display = 'block';
    return;
  }

  if (!/^[A-Z]{3}$/.test(airlineCode)) {
    errorDiv.textContent = 'ICAO code must be exactly 3 uppercase letters';
    errorDiv.style.display = 'block';
    return;
  }

  if (!/^[A-Z]{2}$/.test(iataCode)) {
    errorDiv.textContent = 'IATA code must be exactly 2 uppercase letters';
    errorDiv.style.display = 'block';
    return;
  }

  try {
    const response = await fetch('/api/worlds/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        worldId: selectedWorldId,
        airlineName,
        airlineCode,
        iataCode,
        baseAirportId
      })
    });

    const data = await response.json();

    if (response.ok) {
      // Successfully joined, reload worlds
      closeJoinModal();
      loadWorlds();

      // Show credits deducted message
      if (data.creditsDeducted) {
        console.log(`Joined world! ${data.creditsDeducted} credits deducted. Remaining: ${data.creditsRemaining}`);
      }
    } else {
      // Check if it's a credits error and show helpful message
      if (data.creditsRequired !== undefined) {
        errorDiv.innerHTML = `<strong>Not enough credits!</strong><br>You need ${data.creditsRequired} credits but only have ${data.creditsAvailable}.<br><small style="color: var(--text-secondary);">Credits are earned by playing and completing flights.</small>`;
      } else {
        errorDiv.textContent = data.error || 'Failed to join world';
      }
      errorDiv.style.display = 'block';
    }
  } catch (error) {
    console.error('Error joining world:', error);
    errorDiv.textContent = 'Network error. Please try again.';
    errorDiv.style.display = 'block';
  }
}

// Open bankruptcy modal
function leaveWorld(worldId, worldName) {
  bankruptcyWorldId = worldId;
  document.getElementById('bankruptcyWorldName').textContent = worldName;
  document.getElementById('bankruptcyModal').style.display = 'flex';
}

// Close bankruptcy modal
function closeBankruptcyModal() {
  document.getElementById('bankruptcyModal').style.display = 'none';
  bankruptcyWorldId = null;
}

// Confirm bankruptcy
async function confirmBankruptcy() {
  if (!bankruptcyWorldId) {
    return;
  }

  try {
    const response = await fetch('/api/worlds/leave', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ worldId: bankruptcyWorldId })
    });

    if (response.ok) {
      closeBankruptcyModal();
      loadWorlds();
    } else {
      const data = await response.json();
      showErrorMessage(data.error || 'Failed to leave world');
    }
  } catch (error) {
    console.error('Error leaving world:', error);
    showErrorMessage('Network error. Please try again.');
  }
}

// === End World Modal ===
function openEndWorldModal(worldId, worldName) {
  endWorldId = worldId;
  document.getElementById('endWorldName').textContent = worldName;
  document.getElementById('endWorldModal').style.display = 'flex';
}

function closeEndWorldModal() {
  document.getElementById('endWorldModal').style.display = 'none';
  endWorldId = null;
}

async function confirmEndWorld() {
  if (!endWorldId) return;

  try {
    const response = await fetch('/api/worlds/end-sp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worldId: endWorldId })
    });

    if (response.ok) {
      closeEndWorldModal();
      loadWorlds();
    } else {
      const data = await response.json();
      showErrorMessage(data.error || 'Failed to end world');
    }
  } catch (error) {
    console.error('Error ending world:', error);
    showErrorMessage('Network error. Please try again.');
  }
}

// === Rejoin World Modal ===
function openRejoinModal(worldId, worldName) {
  rejoinWorldId = worldId;
  rejoinAirportId = null;
  document.getElementById('rejoinWorldName').textContent = worldName;
  document.getElementById('rejoinAirlineName').value = '';
  document.getElementById('rejoinAirlineCode').value = '';
  document.getElementById('rejoinIataCode').value = '';
  document.getElementById('rejoinAirportSearch').value = '';
  document.getElementById('rejoinAirportResults').style.display = 'none';
  document.getElementById('rejoinSelectedAirport').style.display = 'none';
  document.getElementById('rejoinError').style.display = 'none';
  document.getElementById('rejoinWorldModal').style.display = 'flex';

  // Set up airport search
  const searchInput = document.getElementById('rejoinAirportSearch');
  searchInput.removeEventListener('input', handleRejoinAirportSearch);
  searchInput.addEventListener('input', handleRejoinAirportSearch);
}

function closeRejoinModal() {
  document.getElementById('rejoinWorldModal').style.display = 'none';
  rejoinWorldId = null;
  rejoinAirportId = null;
}

function handleRejoinAirportSearch() {
  const query = this.value.trim();
  clearTimeout(rejoinSearchTimeout);

  if (query.length < 2) {
    document.getElementById('rejoinAirportResults').style.display = 'none';
    return;
  }

  rejoinSearchTimeout = setTimeout(async () => {
    try {
      const res = await fetch(`/api/airports/search?q=${encodeURIComponent(query)}&limit=8`);
      if (!res.ok) return;
      const airports = await res.json();

      const resultsDiv = document.getElementById('rejoinAirportResults');
      if (airports.length === 0) {
        resultsDiv.innerHTML = '<div style="padding: 0.75rem; color: var(--text-muted); text-align: center;">No airports found</div>';
      } else {
        resultsDiv.innerHTML = airports.map(ap => `
          <div style="padding: 0.5rem 0.75rem; cursor: pointer; border-bottom: 1px solid var(--border-color); transition: background 0.15s;"
               onmouseenter="this.style.background='var(--surface-elevated)'"
               onmouseleave="this.style.background='transparent'"
               onclick="selectRejoinAirport('${ap.id}', '${ap.icaoCode}', '${(ap.name || '').replace(/'/g, "\\'")}', '${(ap.city || '').replace(/'/g, "\\'")}')">
            <div style="font-weight: 600; color: var(--text-primary);">${ap.icaoCode} - ${ap.name}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${ap.city || ''}, ${ap.country || ''} (${ap.type || ''})</div>
          </div>
        `).join('');
      }
      resultsDiv.style.display = 'block';
    } catch (e) {
      // ignore
    }
  }, 300);
}

function selectRejoinAirport(id, icao, name, city) {
  rejoinAirportId = id;
  document.getElementById('rejoinAirportSearch').style.display = 'none';
  document.getElementById('rejoinAirportResults').style.display = 'none';
  const selected = document.getElementById('rejoinSelectedAirport');
  selected.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span><strong>${icao}</strong> - ${name} (${city})</span>
      <button onclick="clearRejoinAirport()" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.1rem;">&times;</button>
    </div>
  `;
  selected.style.display = 'block';
}

function clearRejoinAirport() {
  rejoinAirportId = null;
  document.getElementById('rejoinAirportSearch').value = '';
  document.getElementById('rejoinAirportSearch').style.display = 'block';
  document.getElementById('rejoinSelectedAirport').style.display = 'none';
}

async function confirmRejoin() {
  if (!rejoinWorldId) return;

  const airlineName = document.getElementById('rejoinAirlineName').value.trim();
  const airlineCode = document.getElementById('rejoinAirlineCode').value.trim().toUpperCase();
  const iataCode = document.getElementById('rejoinIataCode').value.trim().toUpperCase();
  const errorDiv = document.getElementById('rejoinError');

  if (!airlineName || !airlineCode || !iataCode || !rejoinAirportId) {
    errorDiv.textContent = 'Please fill in all fields and select a base airport.';
    errorDiv.style.display = 'block';
    return;
  }

  if (airlineCode.length < 3 || airlineCode.length > 4) {
    errorDiv.textContent = 'ICAO code must be 3-4 characters.';
    errorDiv.style.display = 'block';
    return;
  }

  if (iataCode.length !== 2) {
    errorDiv.textContent = 'IATA code must be exactly 2 characters.';
    errorDiv.style.display = 'block';
    return;
  }

  try {
    const response = await fetch('/api/worlds/rejoin-sp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        worldId: rejoinWorldId,
        airlineName,
        airlineCode,
        iataCode,
        baseAirportId: rejoinAirportId
      })
    });

    if (response.ok) {
      closeRejoinModal();
      enterWorld(rejoinWorldId);
    } else {
      const data = await response.json();
      errorDiv.textContent = data.error || 'Failed to rejoin world.';
      errorDiv.style.display = 'block';
    }
  } catch (error) {
    console.error('Error rejoining world:', error);
    errorDiv.textContent = 'Network error. Please try again.';
    errorDiv.style.display = 'block';
  }
}

// Enter world (navigate to dashboard with world context)
async function enterWorld(worldId) {
  // Show loading overlay
  showLoadingOverlay('Joining world...');

  try {
    // Set the active world in the session
    const response = await fetch('/api/worlds/set-active', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ worldId })
    });

    if (response.ok) {
      // Navigate to dashboard
      window.location.href = '/dashboard';
    } else {
      hideLoadingOverlay();
      const data = await response.json();
      showErrorMessage(data.error || 'Failed to enter world');
    }
  } catch (error) {
    hideLoadingOverlay();
    console.error('Error entering world:', error);
    showErrorMessage('Network error. Please try again.');
  }
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

// Airport Browser Functions
async function openAirportBrowser(context) {
  airportBrowserContext = context || 'join';
  document.getElementById('airportBrowserModal').style.display = 'flex';
  await loadAllAirports();
}

function closeAirportBrowser() {
  document.getElementById('airportBrowserModal').style.display = 'none';
}

async function loadAllAirports() {
  // Show loading overlay
  showAirportLoadingOverlay('Loading airports...');

  try {
    const params = new URLSearchParams();
    if (selectedWorldId) params.set('worldId', selectedWorldId);
    if (airportBrowserContext === 'sp') {
      const era = document.getElementById('spEra')?.value;
      if (era) params.set('era', era);
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/world/airports${qs}`);

    if (!response.ok) {
      throw new Error('Failed to load airports');
    }

    const data = await response.json();

    // Update loading message if it's first load
    if (data.isFirstLoad) {
      updateAirportLoadingOverlay('Loading for the first time...<br><small style="opacity: 0.7;">This may take a moment</small>');
    }

    allAirports = data.airports || data; // Support both new and old format

    // Sort by traffic demand (highest to lowest)
    allAirports.sort((a, b) => (b.trafficDemand || 0) - (a.trafficDemand || 0));

    // Populate region filter
    const regions = [...new Set(allAirports.map(a => getRegionFromCountry(a.country)))].sort();
    const regionFilter = document.getElementById('regionFilter');
    regionFilter.innerHTML = '<option value="">All Regions</option>' +
      regions.map(r => `<option value="${r}">${r}</option>`).join('');

    // Populate country filter
    const countries = [...new Set(allAirports.map(a => a.country))].sort();
    const countryFilter = document.getElementById('countryFilter');
    countryFilter.innerHTML = '<option value="">All Countries</option>' +
      countries.map(c => `<option value="${c}">${c}</option>`).join('');

    // Initial render
    filteredAirports = allAirports;
    renderAirportBrowser();

    // Hide loading overlay
    hideAirportLoadingOverlay();
  } catch (error) {
    console.error('Error loading airports:', error);
    hideAirportLoadingOverlay();
    document.getElementById('airportBrowserList').innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--warning-color);">
        Error loading airports. Please try again.
      </div>
    `;
  }
}

function getRegionFromCountry(country) {
  // Comprehensive region mapping including historical country names
  const regionMap = {
    // North America
    'United States': 'North America',
    'Canada': 'North America',
    'Mexico': 'North America',

    // Europe (Modern)
    'United Kingdom': 'Europe',
    'France': 'Europe',
    'Germany': 'Europe',
    'West Germany': 'Europe',
    'East Germany': 'Europe',
    'Spain': 'Europe',
    'Italy': 'Europe',
    'Netherlands': 'Europe',
    'Belgium': 'Europe',
    'Switzerland': 'Europe',
    'Austria': 'Europe',
    'Austria-Hungary': 'Europe',
    'Sweden': 'Europe',
    'Norway': 'Europe',
    'Denmark': 'Europe',
    'Finland': 'Europe',
    'Ireland': 'Europe',
    'Portugal': 'Europe',
    'Poland': 'Europe',

    // Central/Eastern Europe
    'Czech Republic': 'Europe',
    'Czechoslovakia': 'Europe',
    'Protectorate of Bohemia and Moravia': 'Europe',
    'Slovakia': 'Europe',
    'Hungary': 'Europe',
    'Romania': 'Europe',

    // Former Soviet Union
    'Russia': 'Europe/Asia',
    'Russian Empire': 'Europe/Asia',
    'Soviet Union': 'Europe/Asia',
    'Ukraine': 'Europe',
    'Belarus': 'Europe',
    'Kazakhstan': 'Asia',
    'Uzbekistan': 'Asia',
    'Georgia': 'Europe/Asia',
    'Armenia': 'Europe/Asia',
    'Azerbaijan': 'Europe/Asia',
    'Lithuania': 'Europe',
    'Latvia': 'Europe',
    'Estonia': 'Europe',
    'Moldova': 'Europe',

    // Former Yugoslavia
    'Yugoslavia': 'Europe',
    'Serbia and Montenegro': 'Europe',
    'Croatia': 'Europe',
    'Serbia': 'Europe',
    'Montenegro': 'Europe',
    'Slovenia': 'Europe',
    'Bosnia and Herzegovina': 'Europe',
    'Macedonia': 'Europe',
    'North Macedonia': 'Europe',

    // Middle East
    'Turkey': 'Europe/Middle East',
    'Ottoman Empire': 'Middle East',
    'United Arab Emirates': 'Middle East',
    'Trucial States': 'Middle East',
    'Saudi Arabia': 'Middle East',
    'Qatar': 'Middle East',
    'British Protectorate': 'Middle East',
    'Oman': 'Middle East',
    'Jordan': 'Middle East',

    // Africa
    'Egypt': 'Africa',
    'South Africa': 'Africa',
    'Kenya': 'Africa',
    'Nigeria': 'Africa',
    'Morocco': 'Africa',
    'Zimbabwe': 'Africa',
    'Rhodesia': 'Africa',
    'Zambia': 'Africa',
    'Northern Rhodesia': 'Africa',
    'Namibia': 'Africa',
    'South West Africa': 'Africa',
    'Tanzania': 'Africa',
    'Tanganyika': 'Africa',

    // Asia (East & Southeast)
    'China': 'Asia',
    'Japan': 'Asia',
    'Japanese Taiwan': 'Asia',
    'South Korea': 'Asia',
    'North Korea': 'Asia',
    'Korea': 'Asia',
    'Hong Kong': 'Asia',
    'British Hong Kong': 'Asia',
    'Taiwan': 'Asia',
    'Singapore': 'Asia',
    'British Singapore': 'Asia',
    'Malaysia': 'Asia',
    'British Malaya': 'Asia',
    'Federation of Malaya': 'Asia',
    'Thailand': 'Asia',
    'Siam': 'Asia',
    'Indonesia': 'Asia',
    'Dutch East Indies': 'Asia',
    'Philippines': 'Asia',
    'Vietnam': 'Asia',
    'South Vietnam': 'Asia',
    'French Indochina': 'Asia',

    // South Asia
    'India': 'Asia',
    'British India': 'Asia',
    'Pakistan': 'Asia',
    'Bangladesh': 'Asia',
    'Myanmar': 'Asia',
    'Burma': 'Asia',
    'Sri Lanka': 'Asia',
    'Ceylon': 'Asia',

    // Oceania
    'Australia': 'Oceania',
    'New Zealand': 'Oceania',

    // South America
    'Brazil': 'South America',
    'Argentina': 'South America',
    'Chile': 'South America',
    'Colombia': 'South America',
    'Peru': 'South America'
  };

  return regionMap[country] || 'Other';
}

function filterAirportBrowser() {
  const regionFilter = document.getElementById('regionFilter').value;
  const countryFilter = document.getElementById('countryFilter').value;

  // Update country dropdown based on selected region
  if (regionFilter) {
    const countriesInRegion = [...new Set(
      allAirports
        .filter(a => getRegionFromCountry(a.country) === regionFilter)
        .map(a => a.country)
    )].sort();

    const countryDropdown = document.getElementById('countryFilter');
    const currentValue = countryDropdown.value;

    countryDropdown.innerHTML = '<option value="">All Countries</option>' +
      countriesInRegion.map(c => `<option value="${c}">${c}</option>`).join('');

    // Restore selection if it's still valid
    if (countriesInRegion.includes(currentValue)) {
      countryDropdown.value = currentValue;
    }
  } else {
    // Reset to all countries if no region selected
    const allCountries = [...new Set(allAirports.map(a => a.country))].sort();
    const countryDropdown = document.getElementById('countryFilter');
    const currentValue = countryDropdown.value;

    countryDropdown.innerHTML = '<option value="">All Countries</option>' +
      allCountries.map(c => `<option value="${c}">${c}</option>`).join('');

    if (allCountries.includes(currentValue)) {
      countryDropdown.value = currentValue;
    }
  }

  // Filter airports
  filteredAirports = allAirports.filter(airport => {
    const matchesRegion = !regionFilter || getRegionFromCountry(airport.country) === regionFilter;
    const matchesCountry = !countryFilter || airport.country === countryFilter;
    return matchesRegion && matchesCountry;
  });

  renderAirportBrowser();
}

function renderAirportBrowser() {
  const listDiv = document.getElementById('airportBrowserList');
  const countSpan = document.getElementById('airportCount');

  countSpan.textContent = filteredAirports.length;

  if (filteredAirports.length === 0) {
    listDiv.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
        No airports found matching your filters.
      </div>
    `;
    return;
  }

  listDiv.innerHTML = filteredAirports.map(airport => `
    <div onclick="selectAirportFromBrowser('${airport.id}', '${airport.name.replace(/'/g, "\\'")}', '${airport.city}', '${airport.country}', '${airport.icaoCode}', ${airport.trafficDemand || 10}, ${airport.spareCapacity || 0}, ${airport.annualPassengers || 1}, '${(airport.type || 'Regional').replace(/'/g, "\\'")}')" style="
      padding: 1rem;
      margin-bottom: 0.75rem;
      background: var(--surface-elevated);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    " onmouseover="this.style.borderColor='var(--primary-color)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='var(--border-color)'; this.style.transform='translateY(0)'">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 1rem; color: var(--text-primary); margin-bottom: 0.25rem;">
            ${airport.name} (${airport.icaoCode})
          </div>
          <div style="font-size: 0.85rem; color: var(--text-secondary);">
            ${airport.city}, ${airport.country} • ${airport.type}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.75rem; color: var(--text-secondary);">Airlines</div>
          <div style="font-weight: 600; color: var(--text-primary);">${airport.airlinesBasedHere || 0}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 0.75rem;">
        <div>
          <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Traffic Demand</div>
          ${generateLevelScaleCompact(airport.trafficDemand || 5)}
          <div style="margin-top: 0.25rem; font-size: 0.7rem; color: var(--text-secondary);">
            ${airport.annualPassengers >= 1
              ? `${airport.annualPassengers.toFixed(1)}M pax/year`
              : `${(airport.annualPassengers * 1000).toFixed(0)}K pax/year`}
          </div>
        </div>
        <div>
          <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Spare Capacity</div>
          ${generateCapacityScaleCompact(airport.spareCapacity || 0)}
        </div>
      </div>
    </div>
  `).join('');
}

function generateLevelScaleCompact(level) {
  const dots = [];
  for (let i = 1; i <= 20; i++) {
    let color;
    if (i <= 6) color = '#ef4444';
    else if (i <= 12) color = '#f59e0b';
    else if (i <= 16) color = '#eab308';
    else color = '#22c55e';

    const isFilled = i <= level;
    dots.push(`
      <div style="
        width: 14px;
        height: 14px;
        border-radius: 2px;
        background: ${isFilled ? color : 'transparent'};
        border: 1px solid ${color};
        opacity: ${isFilled ? '1' : '0.3'};
      "></div>
    `);
  }

  return `
    <div style="display: flex; gap: 2px; align-items: center; flex-wrap: wrap;">
      ${dots.join('')}
      <span style="margin-left: 0.5rem; font-size: 0.75rem; color: var(--text-primary); font-weight: 600;">${level}/20</span>
    </div>
  `;
}

function generateCapacityScaleCompact(percentage) {
  const dots = [];
  for (let i = 1; i <= 20; i++) {
    const threshold = (i / 20) * 100;
    let color;
    if (threshold <= 30) color = '#22c55e'; // Green for low capacity (more spare)
    else if (threshold <= 60) color = '#eab308'; // Yellow for medium
    else if (threshold <= 80) color = '#f59e0b'; // Orange for high
    else color = '#ef4444'; // Red for very high (little spare capacity)

    const isFilled = threshold <= percentage;
    dots.push(`
      <div style="
        width: 14px;
        height: 14px;
        border-radius: 2px;
        background: ${isFilled ? color : 'transparent'};
        border: 1px solid ${color};
        opacity: ${isFilled ? '1' : '0.3'};
      "></div>
    `);
  }

  return `
    <div style="display: flex; gap: 2px; align-items: center; flex-wrap: wrap;">
      ${dots.join('')}
      <span style="margin-left: 0.5rem; font-size: 0.75rem; color: var(--text-primary); font-weight: 600;">${percentage}%</span>
    </div>
  `;
}

function selectAirportFromBrowser(id, name, city, country, icao, trafficDemand, spareCapacity, annualPassengers, airportType) {
  // Close the browser modal
  closeAirportBrowser();

  if (airportBrowserContext === 'sp') {
    selectSPAirport(id, name, city, country, icao, trafficDemand, spareCapacity, annualPassengers, airportType);
  } else {
    selectAirport(id, name, city, country, icao, trafficDemand, spareCapacity, annualPassengers);
  }
}

// ============================
// Single-Player World Creation
// ============================

function openCreateSPModal() {
  spSelectedAirportId = null;
  document.getElementById('spAirlineName').value = '';
  document.getElementById('spAirlineCode').value = '';
  document.getElementById('spIataCode').value = '';
  document.getElementById('spEra').value = '2010';
  document.getElementById('spSpeed').value = '60';
  document.querySelector('input[name="spDifficulty"][value="medium"]').checked = true;
  document.getElementById('spBaseAirport').value = '';
  document.getElementById('spBaseAirportType').value = '';
  document.getElementById('spAirportSearch').value = '';
  document.getElementById('spAirportSearch').style.display = 'block';
  document.getElementById('spSelectedAirportDisplay').style.display = 'none';
  document.getElementById('spAirportResults').style.display = 'none';
  document.getElementById('spCreateError').style.display = 'none';
  document.getElementById('spAICountPreview').textContent = 'AI Competitors: Select airport to calculate';
  updateSPPreview();
  document.getElementById('createSPModal').style.display = 'flex';

  // Fetch and display user credits
  fetch('/auth/status')
    .then(r => r.json())
    .then(data => {
      const creditsEl = document.getElementById('spUserCredits');
      if (data.authenticated && data.user) {
        const credits = data.user.credits !== undefined ? data.user.credits : 0;
        const unlimited = !!data.user.unlimitedCredits;
        if (unlimited) {
          creditsEl.textContent = '(Unlimited credits)';
          creditsEl.style.color = 'var(--success-color)';
        } else if (credits >= 10) {
          creditsEl.textContent = `(You have ${credits} credits)`;
          creditsEl.style.color = 'var(--success-color)';
        } else {
          creditsEl.textContent = `(You only have ${credits} credits - need 10)`;
          creditsEl.style.color = 'var(--warning-color)';
        }
      }
    })
    .catch(() => {});
}

function closeCreateSPModal() {
  document.getElementById('createSPModal').style.display = 'none';
}

function updateSPPreview() {
  const era = parseInt(document.getElementById('spEra').value) || 2010;
  const difficulty = document.querySelector('input[name="spDifficulty"]:checked')?.value || 'medium';
  const airportType = document.getElementById('spBaseAirportType').value;

  // Update starting capital preview
  // Simple era-based multiplier (mirrors eraEconomicService)
  const eraMultipliers = {
    1950: 0.10, 1960: 0.15, 1970: 0.25, 1980: 0.35,
    1990: 0.50, 2000: 0.70, 2010: 0.85, 2020: 1.00
  };
  const decade = Math.floor(era / 10) * 10;
  const mult = eraMultipliers[decade] || 1.0;
  const baseCapital = 37500000;
  const capital = Math.round(baseCapital * mult);
  const capitalFormatted = capital >= 1000000
    ? `$${(capital / 1000000).toFixed(1)}M`
    : `$${(capital / 1000).toFixed(0)}K`;
  document.getElementById('spStartingCapital').textContent = `Starting Capital: ${capitalFormatted}`;

  // Update AI count preview
  const aiCount = AI_TOTAL_COUNTS[difficulty] || AI_TOTAL_COUNTS['medium'];
  document.getElementById('spAICountPreview').textContent = `AI Competitors: ~${aiCount} airlines`;
}

// SP Airport search
async function searchSPAirports(query) {
  if (!query || query.length < 2) {
    document.getElementById('spAirportResults').style.display = 'none';
    return;
  }

  try {
    const era = document.getElementById('spEra').value;
    const response = await fetch(`/api/world/airports?search=${encodeURIComponent(query)}&era=${era}`);
    const resultsDiv = document.getElementById('spAirportResults');

    if (!response.ok) {
      resultsDiv.innerHTML = '<div style="padding: 1rem; color: var(--warning-color);">Error loading airports</div>';
      resultsDiv.style.display = 'block';
      return;
    }

    const data = await response.json();
    const airports = data.airports || data;

    if (!Array.isArray(airports) || airports.length === 0) {
      resultsDiv.innerHTML = '<div style="padding: 1rem; color: var(--text-secondary);">No airports found</div>';
      resultsDiv.style.display = 'block';
      return;
    }

    resultsDiv.innerHTML = airports.slice(0, 10).map(airport => `
      <div class="airport-result-item" onclick="selectSPAirport('${airport.id}', '${airport.name.replace(/'/g, "\\'")}', '${airport.city}', '${airport.country}', '${airport.icaoCode}', ${airport.trafficDemand || 10}, ${airport.spareCapacity || 0}, ${airport.annualPassengers || 1}, '${(airport.type || 'Regional').replace(/'/g, "\\'")}')" style="
        padding: 0.75rem 1rem;
        cursor: pointer;
        border-bottom: 1px solid var(--border-color);
      " onmouseover="this.style.background='var(--surface)'" onmouseout="this.style.background='var(--surface-elevated)'">
        <div style="font-weight: 600; color: var(--text-primary);">${airport.name} (${airport.icaoCode})</div>
        <div style="font-size: 0.85rem; color: var(--text-secondary);">${airport.city}, ${airport.country} &bull; ${airport.type}</div>
      </div>
    `).join('');

    resultsDiv.style.display = 'block';
  } catch (error) {
    console.error('Error searching airports:', error);
  }
}

function selectSPAirport(id, name, city, country, icao, trafficDemand, spareCapacity, annualPassengers, airportType) {
  spSelectedAirportId = id;
  document.getElementById('spBaseAirport').value = id;
  document.getElementById('spBaseAirportType').value = airportType || 'Regional';
  document.getElementById('spSelectedAirportName').textContent = `${name} (${icao})`;
  document.getElementById('spSelectedAirportLocation').textContent = `${city}, ${country}`;
  document.getElementById('spSelectedAirportTraffic').innerHTML = generateLevelScale(trafficDemand || 5);

  const paxText = annualPassengers >= 1
    ? `${annualPassengers.toFixed(1)}M passengers/year`
    : `${(annualPassengers * 1000).toFixed(0)}K passengers/year`;
  document.getElementById('spSelectedAirportPassengers').textContent = paxText;
  document.getElementById('spSelectedAirportInfrastructure').innerHTML = generateCapacityScale(spareCapacity || 0);

  document.getElementById('spSelectedAirportDisplay').style.display = 'block';
  document.getElementById('spAirportSearch').style.display = 'none';
  document.getElementById('spAirportResults').style.display = 'none';
  document.getElementById('spCreateError').style.display = 'none';

  updateSPPreview();
}

function clearSPSelectedAirport() {
  spSelectedAirportId = null;
  document.getElementById('spBaseAirport').value = '';
  document.getElementById('spBaseAirportType').value = '';
  document.getElementById('spAirportSearch').value = '';
  document.getElementById('spAirportSearch').style.display = 'block';
  document.getElementById('spSelectedAirportDisplay').style.display = 'none';
  document.getElementById('spAirportResults').style.display = 'none';
  document.getElementById('spAICountPreview').textContent = 'AI Competitors: Select airport to calculate';
}

async function createSinglePlayerWorld() {
  const era = document.getElementById('spEra').value;
  const timeAcceleration = document.getElementById('spSpeed').value;
  const difficulty = document.querySelector('input[name="spDifficulty"]:checked')?.value;
  const airlineName = document.getElementById('spAirlineName').value.trim();
  const airlineCode = document.getElementById('spAirlineCode').value.trim().toUpperCase();
  const iataCode = document.getElementById('spIataCode').value.trim().toUpperCase();
  const baseAirportId = document.getElementById('spBaseAirport').value;
  const errorDiv = document.getElementById('spCreateError');

  // Auto-generate world name from username, always using next available number
  const userName = (document.getElementById('userName')?.textContent || 'My').trim();
  const existingNames = new Set(
    Array.from(document.querySelectorAll('#singlePlayerList .world-card-name'))
      .map(el => el.textContent.trim())
  );
  let worldNum = 1;
  let name = `${userName}'s World`;
  while (existingNames.has(name)) {
    worldNum++;
    name = `${userName}'s World #${worldNum}`;
  }

  // Validation
  if (!airlineName) {
    errorDiv.textContent = 'Please enter an airline name';
    errorDiv.style.display = 'block';
    return;
  }
  if (!/^[A-Z]{3}$/.test(airlineCode)) {
    errorDiv.textContent = 'ICAO code must be exactly 3 uppercase letters';
    errorDiv.style.display = 'block';
    return;
  }
  if (!/^[A-Z]{2}$/.test(iataCode)) {
    errorDiv.textContent = 'IATA code must be exactly 2 uppercase letters';
    errorDiv.style.display = 'block';
    return;
  }
  if (!baseAirportId) {
    errorDiv.textContent = 'Please select a base airport';
    errorDiv.style.display = 'block';
    return;
  }
  if (!difficulty) {
    errorDiv.textContent = 'Please select a difficulty';
    errorDiv.style.display = 'block';
    return;
  }

  // Show loading overlay
  closeCreateSPModal();
  showLoadingOverlay('Creating your world...<br><small style="opacity: 0.7;">Spawning AI competitors...</small>');

  try {
    const response = await fetch('/api/worlds/create-singleplayer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, era, timeAcceleration, difficulty,
        baseAirportId, airlineName, airlineCode, iataCode
      })
    });

    const data = await response.json();

    if (response.ok) {
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } else {
      hideLoadingOverlay();
      openCreateSPModal();
      errorDiv.textContent = data.error || 'Failed to create world';
      errorDiv.style.display = 'block';
    }
  } catch (error) {
    console.error('Error creating SP world:', error);
    hideLoadingOverlay();
    openCreateSPModal();
    errorDiv.textContent = 'Network error. Please try again.';
    errorDiv.style.display = 'block';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadWorlds();

  // Add airport search listener
  const airportSearchInput = document.getElementById('airportSearch');
  if (airportSearchInput) {
    airportSearchInput.addEventListener('input', (e) => {
      clearTimeout(airportSearchTimeout);
      airportSearchTimeout = setTimeout(() => {
        searchAirports(e.target.value);
      }, 300);
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!airportSearchInput.contains(e.target) && !document.getElementById('airportResults').contains(e.target)) {
        document.getElementById('airportResults').style.display = 'none';
      }
    });
  }

  // Add SP airport search listener
  const spAirportSearchInput = document.getElementById('spAirportSearch');
  if (spAirportSearchInput) {
    spAirportSearchInput.addEventListener('input', (e) => {
      clearTimeout(spAirportSearchTimeout);
      spAirportSearchTimeout = setTimeout(() => {
        searchSPAirports(e.target.value);
      }, 300);
    });

    document.addEventListener('click', (e) => {
      const spResults = document.getElementById('spAirportResults');
      if (spResults && !spAirportSearchInput.contains(e.target) && !spResults.contains(e.target)) {
        spResults.style.display = 'none';
      }
    });
  }

  // Measure and set navbar height for fixed sidebar positioning
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    const setNavbarHeight = () => {
      const height = navbar.offsetHeight;
      document.documentElement.style.setProperty('--navbar-height', `${height}px`);
    };

    // Set initially
    setNavbarHeight();

    // Update on window resize
    window.addEventListener('resize', setNavbarHeight);
  }
});

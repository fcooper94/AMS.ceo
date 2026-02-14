/**
 * Competition Page - Market Intelligence & Rankings
 */

let _playerAirlineId = null;

async function loadCompetitionData() {
  try {
    const response = await fetch('/api/world/competition');
    if (!response.ok) {
      throw new Error('Failed to load competition data');
    }

    const data = await response.json();
    _playerAirlineId = data.playerAirlineId;
    renderDifficultyBadge(data);
    renderLeaderboard(data.topAirlines, data.playerAirlineId, data.playerRank, data.totalAirlines);
    renderBaseAirportAirlines(data.baseAirportAirlines, data.playerBaseAirport);
    renderCompetitiveRoutes(data.competitiveRoutes);
  } catch (error) {
    console.error('Error loading competition data:', error);
    document.getElementById('leaderboardTable').innerHTML =
      '<div style="text-align: center; padding: 2rem; color: var(--warning-color);">Error loading competition data. This page is only available in single-player worlds.</div>';
    document.getElementById('competitiveRoutes').innerHTML = '';
    document.getElementById('baseAirportAirlines').innerHTML = '';
  }
}

function renderDifficultyBadge(data) {
  if (!data.difficulty) return;

  const badge = document.getElementById('difficultyBadge');
  const label = document.getElementById('difficultyLabel');
  const countLabel = document.getElementById('aiCountLabel');

  const colors = { easy: '#22c55e', medium: '#f59e0b', hard: '#ef4444' };
  const color = colors[data.difficulty] || '#f59e0b';

  label.textContent = data.difficulty;
  label.style.background = `${color}22`;
  label.style.color = color;

  countLabel.textContent = `${data.totalAICount} AI competitor${data.totalAICount !== 1 ? 's' : ''} \u2022 Your rank: #${data.playerRank} of ${data.totalAirlines}`;

  badge.style.display = 'block';
}

function formatCurrency(amount) {
  if (Math.abs(amount) >= 1000000000) {
    return `$${(amount / 1000000000).toFixed(1)}B`;
  } else if (Math.abs(amount) >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  } else if (Math.abs(amount) >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

function renderLeaderboard(airlines, playerAirlineId, playerRank, totalAirlines) {
  const container = document.getElementById('leaderboardTable');

  if (!airlines || airlines.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">No airlines found</div>';
    return;
  }

  let html = `
    <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
      <thead>
        <tr style="border-bottom: 2px solid var(--border-color);">
          <th style="padding: 0.75rem; text-align: left; color: var(--text-secondary); font-weight: 600;">#</th>
          <th style="padding: 0.75rem; text-align: left; color: var(--text-secondary); font-weight: 600;">AIRLINE</th>
          <th style="padding: 0.75rem; text-align: left; color: var(--text-secondary); font-weight: 600;">BASE</th>
          <th style="padding: 0.75rem; text-align: right; color: var(--text-secondary); font-weight: 600;">FLEET</th>
          <th style="padding: 0.75rem; text-align: right; color: var(--text-secondary); font-weight: 600;">ROUTES</th>
          <th style="padding: 0.75rem; text-align: right; color: var(--text-secondary); font-weight: 600;">REVENUE</th>
          <th style="padding: 0.75rem; text-align: right; color: var(--text-secondary); font-weight: 600;">BALANCE</th>
        </tr>
      </thead>
      <tbody>
  `;

  airlines.forEach((airline) => {
    const isPlayer = airline.id === playerAirlineId;
    const rowBg = isPlayer ? 'background: rgba(59, 130, 246, 0.1);' : '';
    const rank = airline.rank;

    html += `
      <tr style="border-bottom: 1px solid var(--border-color); ${rowBg} cursor: pointer;"
          onclick="openAirlineModal('${airline.id}')"
          onmouseover="this.style.background='var(--surface-elevated)'"
          onmouseout="this.style.background='${isPlayer ? 'rgba(59, 130, 246, 0.1)' : ''}'">
        <td style="padding: 0.75rem; font-weight: 700; color: ${rank <= 3 ? '#fbbf24' : 'var(--text-secondary)'};">
          ${rank}
        </td>
        <td style="padding: 0.75rem;">
          <div style="font-weight: 600; color: var(--text-primary);">
            ${airline.airlineName}
            ${isPlayer ? '<span style="color: var(--primary-color); font-size: 0.75rem; margin-left: 0.25rem;">(YOU)</span>' : ''}
          </div>
          <div style="font-size: 0.75rem; color: var(--text-secondary); font-family: monospace;">${airline.airlineCode} / ${airline.iataCode}</div>
        </td>
        <td style="padding: 0.75rem; color: var(--text-secondary);">${airline.baseAirport?.icaoCode || '--'}</td>
        <td style="padding: 0.75rem; text-align: right; color: var(--text-primary);">${airline.fleetCount}</td>
        <td style="padding: 0.75rem; text-align: right; color: var(--text-primary);">${airline.routeCount}</td>
        <td style="padding: 0.75rem; text-align: right; color: var(--text-primary);">${formatCurrency(airline.totalRevenue)}</td>
        <td style="padding: 0.75rem; text-align: right; color: var(--text-primary);">${formatCurrency(airline.balance)}</td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

function renderBaseAirportAirlines(airlines, playerBaseAirport) {
  const container = document.getElementById('baseAirportAirlines');
  const headerLabel = document.getElementById('baseAirportLabel');

  if (headerLabel && playerBaseAirport) {
    headerLabel.textContent = `AT ${playerBaseAirport.icaoCode} - ${playerBaseAirport.name}`;
  }

  if (!airlines || airlines.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">No other airlines are based at your airport.</div>';
    return;
  }

  let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.75rem;">';

  for (const airline of airlines) {
    html += `
      <div onclick="openAirlineModal('${airline.id}')" style="
        padding: 0.75rem 1rem;
        background: var(--surface-elevated);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        cursor: pointer;
        transition: border-color 0.15s;
      " onmouseover="this.style.borderColor='var(--accent-color)'" onmouseout="this.style.borderColor='var(--border-color)'">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <div>
            <span style="font-weight: 700; color: var(--text-primary);">${airline.airlineName}</span>
            <span style="font-size: 0.75rem; color: var(--text-secondary); font-family: monospace; margin-left: 0.35rem;">${airline.airlineCode}</span>
          </div>
          <span style="font-size: 0.75rem; color: var(--text-muted);">#${airline.rank}</span>
        </div>
        <div style="display: flex; gap: 1rem; font-size: 0.8rem; color: var(--text-secondary);">
          <span>Fleet: <strong style="color: var(--text-primary);">${airline.fleetCount}</strong></span>
          <span>Routes: <strong style="color: var(--text-primary);">${airline.routeCount}</strong></span>
          <span>Rev: <strong style="color: var(--text-primary);">${formatCurrency(airline.totalRevenue)}</strong></span>
        </div>
      </div>
    `;
  }

  html += '</div>';
  container.innerHTML = html;
}

function renderCompetitiveRoutes(competitiveRoutes) {
  const container = document.getElementById('competitiveRoutes');

  if (!competitiveRoutes || competitiveRoutes.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">No contested routes yet. AI airlines will establish competing routes over time.</div>';
    return;
  }

  let html = '';
  for (const route of competitiveRoutes) {
    html += `
      <div style="
        padding: 1rem;
        margin-bottom: 0.75rem;
        background: var(--surface-elevated);
        border: 1px solid var(--border-color);
        border-radius: 6px;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <div>
            <span style="font-weight: 700; font-size: 1.1rem; color: var(--text-primary);">${route.departure} - ${route.arrival}</span>
            <span style="color: var(--text-muted); font-size: 0.85rem; margin-left: 0.5rem;">${route.routeNumber}</span>
          </div>
          <span style="
            padding: 0.2rem 0.5rem;
            background: rgba(239, 68, 68, 0.15);
            color: #ef4444;
            border-radius: 3px;
            font-size: 0.75rem;
            font-weight: 600;
          ">${route.competitors.length} COMPETITOR${route.competitors.length > 1 ? 'S' : ''}</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem;">
          <div style="padding: 0.5rem; background: rgba(59, 130, 246, 0.1); border-radius: 4px;">
            <div style="font-size: 0.75rem; color: var(--primary-color); font-weight: 600; margin-bottom: 0.25rem;">YOUR AIRLINE</div>
            <div style="font-size: 0.85rem; color: var(--text-primary);">Economy: $${route.playerPrice}</div>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">Load Factor: ${Math.round(route.playerLoadFactor * 100)}%</div>
          </div>

          ${route.competitors.map(comp => `
            <div style="padding: 0.5rem; background: var(--surface); border-radius: 4px;">
              <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600; margin-bottom: 0.25rem;">${comp.airline} (${comp.code})</div>
              <div style="font-size: 0.85rem; color: ${comp.price < route.playerPrice ? '#ef4444' : '#22c55e'};">
                Economy: $${comp.price}
                ${comp.price < route.playerPrice ? ' (undercutting)' : ''}
              </div>
              <div style="font-size: 0.8rem; color: var(--text-secondary);">Load Factor: ${Math.round(comp.loadFactor * 100)}%</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

// ── Airline Detail Modal ────────────────────────────────────────────────────

async function openAirlineModal(airlineId) {
  const modal = document.getElementById('airlineModal');
  const nameEl = document.getElementById('airlineModalName');
  const codesEl = document.getElementById('airlineModalCodes');
  const bodyEl = document.getElementById('airlineModalBody');

  // Show modal with loading state
  nameEl.textContent = 'Loading...';
  codesEl.textContent = '';
  bodyEl.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Loading airline data...</div>';
  modal.style.display = 'flex';

  try {
    const response = await fetch(`/api/world/competition/${airlineId}`);
    if (!response.ok) throw new Error('Failed to load airline');
    const data = await response.json();

    renderAirlineModal(data);
  } catch (err) {
    console.error('Error loading airline detail:', err);
    bodyEl.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--warning-color);">Failed to load airline data.</div>';
  }
}

function closeAirlineModal() {
  document.getElementById('airlineModal').style.display = 'none';
}

function renderAirlineModal(data) {
  const nameEl = document.getElementById('airlineModalName');
  const codesEl = document.getElementById('airlineModalCodes');
  const bodyEl = document.getElementById('airlineModalBody');

  const isPlayer = data.id === _playerAirlineId;

  // Header
  nameEl.innerHTML = data.airlineName +
    (isPlayer ? '<span class="airline-header-badge" style="background: rgba(59,130,246,0.15); color: var(--accent-color);">YOU</span>' : '') +
    (data.isAI ? '<span class="airline-header-badge" style="background: rgba(200,210,225,0.08); color: var(--text-muted);">AI</span>' : '');

  const baseInfo = data.baseAirport
    ? `${data.baseAirport.icaoCode} - ${data.baseAirport.city}, ${data.baseAirport.country}`
    : 'Unknown base';
  codesEl.innerHTML = `${data.airlineCode} / ${data.iataCode} &middot; ${baseInfo}`;

  // Build body
  let html = '';

  // Reputation bar
  const rep = data.reputation || 0;
  const repColor = rep >= 70 ? '#22c55e' : rep >= 40 ? '#f59e0b' : '#ef4444';
  html += `
    <div style="margin-bottom: 1rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem;">
        <span style="color: var(--text-secondary); font-weight: 600;">REPUTATION</span>
        <span style="color: ${repColor}; font-weight: 700;">${rep}/100</span>
      </div>
      <div class="reputation-bar">
        <div class="reputation-bar-fill" style="width: ${rep}%; background: ${repColor};"></div>
      </div>
    </div>
  `;

  // Stats grid
  const f = data.financials;
  const profitColor = f.profit >= 0 ? '#22c55e' : '#ef4444';
  html += `
    <div class="airline-stats-grid">
      <div class="airline-stat-card">
        <div class="airline-stat-label">Fleet</div>
        <div class="airline-stat-value">${data.fleetCount}</div>
      </div>
      <div class="airline-stat-card">
        <div class="airline-stat-label">Routes</div>
        <div class="airline-stat-value">${data.routeCount}</div>
      </div>
      <div class="airline-stat-card">
        <div class="airline-stat-label">Flights</div>
        <div class="airline-stat-value">${f.totalFlights.toLocaleString()}</div>
      </div>
      <div class="airline-stat-card">
        <div class="airline-stat-label">Passengers</div>
        <div class="airline-stat-value">${f.totalPassengers.toLocaleString()}</div>
      </div>
    </div>
  `;

  // Financial summary
  html += `
    <div class="airline-stats-grid" style="grid-template-columns: repeat(3, 1fr);">
      <div class="airline-stat-card">
        <div class="airline-stat-label">Revenue</div>
        <div class="airline-stat-value" style="color: #22c55e;">${formatCurrency(f.totalRevenue)}</div>
      </div>
      <div class="airline-stat-card">
        <div class="airline-stat-label">Profit</div>
        <div class="airline-stat-value" style="color: ${profitColor};">${formatCurrency(f.profit)}</div>
      </div>
      <div class="airline-stat-card">
        <div class="airline-stat-label">Balance</div>
        <div class="airline-stat-value" style="color: ${data.balance >= 0 ? 'var(--text-primary)' : '#ef4444'};">${formatCurrency(data.balance)}</div>
      </div>
    </div>
  `;

  // Fleet breakdown
  if (data.fleet && data.fleet.length > 0) {
    html += `<div class="airline-section-title" style="margin-top: 0.5rem;">Fleet (${data.fleetCount} aircraft)</div>`;
    for (const ac of data.fleet) {
      html += `
        <div class="airline-fleet-row">
          <div>
            <div class="airline-fleet-model">${ac.manufacturer} ${ac.model}</div>
            <div class="airline-fleet-detail">${ac.capacity} pax &middot; ${ac.range.toLocaleString()} nm range</div>
          </div>
          <span class="airline-fleet-count">&times;${ac.count}</span>
        </div>
      `;
    }
  } else {
    html += `<div class="airline-section-title" style="margin-top: 0.5rem;">Fleet</div>`;
    html += `<div style="font-size: 0.8rem; color: var(--text-muted); padding: 0.5rem 0;">No active aircraft</div>`;
  }

  // Route network
  if (data.routes && data.routes.length > 0) {
    html += `<div class="airline-section-title" style="margin-top: 1rem;">Routes (${data.routeCount})</div>`;
    html += `
      <table class="airline-route-table">
        <thead>
          <tr>
            <th>Route</th>
            <th>Distance</th>
            <th>Economy</th>
            <th>LF</th>
            <th>Revenue</th>
          </tr>
        </thead>
        <tbody>
    `;
    for (const r of data.routes) {
      html += `
        <tr>
          <td>
            <div class="airline-route-pair">${r.departure} - ${r.arrival}</div>
            <div class="airline-route-city">${r.departureCity} - ${r.arrivalCity}</div>
          </td>
          <td>${r.distance.toLocaleString()} nm</td>
          <td>$${r.economyPrice}</td>
          <td>${Math.round(r.loadFactor * 100)}%</td>
          <td>${formatCurrency(r.totalRevenue)}</td>
        </tr>
      `;
    }
    html += '</tbody></table>';
  } else {
    html += `<div class="airline-section-title" style="margin-top: 1rem;">Routes</div>`;
    html += `<div style="font-size: 0.8rem; color: var(--text-muted); padding: 0.5rem 0;">No active routes</div>`;
  }

  bodyEl.innerHTML = html;
}

// Close modal on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAirlineModal();
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadCompetitionData();

  // Auto-refresh every 30 seconds
  setInterval(loadCompetitionData, 30000);
});

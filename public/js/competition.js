/**
 * Competition Page - Market Intelligence & Rankings
 */

async function loadCompetitionData() {
  try {
    const response = await fetch('/api/world/competition');
    if (!response.ok) {
      throw new Error('Failed to load competition data');
    }

    const data = await response.json();
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
      <tr style="border-bottom: 1px solid var(--border-color); ${rowBg}">
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
      <div style="
        padding: 0.75rem 1rem;
        background: var(--surface-elevated);
        border: 1px solid var(--border-color);
        border-radius: 6px;
      ">
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadCompetitionData();

  // Auto-refresh every 30 seconds
  setInterval(loadCompetitionData, 30000);
});

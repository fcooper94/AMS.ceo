let allAircraft = [];

// Load maintenance data
async function loadMaintenanceData() {
  try {
    const response = await fetch('/api/fleet/maintenance');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch maintenance data');
    }

    allAircraft = data;
    displayMaintenanceData(data);
  } catch (error) {
    console.error('Error loading maintenance data:', error);
    document.getElementById('maintenanceGrid').innerHTML = `
      <div class="table-empty">
        <div class="empty-message">ERROR LOADING MAINTENANCE DATA</div>
      </div>
    `;
  }
}

// Group aircraft by type
function groupAircraftByType(aircraft) {
  const groups = {};

  aircraft.forEach(ac => {
    const typeName = ac.aircraft
      ? `${ac.aircraft.manufacturer} ${ac.aircraft.model}${ac.aircraft.variant ? '-' + ac.aircraft.variant : ''}`
      : 'Unknown';

    if (!groups[typeName]) {
      groups[typeName] = [];
    }
    groups[typeName].push(ac);
  });

  // Sort groups by type name
  return Object.keys(groups)
    .sort()
    .reduce((sorted, key) => {
      sorted[key] = groups[key];
      return sorted;
    }, {});
}

// Get current game time (falls back to real time if not available)
function getGameTime() {
  if (typeof window.getGlobalWorldTime === 'function') {
    const gameTime = window.getGlobalWorldTime();
    if (gameTime) {
      console.log('[Maintenance] Using game time:', gameTime.toISOString());
      return gameTime;
    }
  }
  // Fallback to real time if game time not available
  console.warn('[Maintenance] Game time not available, using real time');
  return new Date();
}

// Calculate check status
function getCheckStatus(lastCheckDate, checkType) {
  if (!lastCheckDate) {
    return { status: 'none', text: 'Never', expiryText: '', lastCheckTime: null };
  }

  const now = getGameTime();
  const lastCheck = new Date(lastCheckDate);
  let expiryDate;

  if (checkType === 'A') {
    // A Check: Valid until 23:59 UTC of next day
    expiryDate = new Date(lastCheck);
    expiryDate.setUTCDate(expiryDate.getUTCDate() + 1);
    expiryDate.setUTCHours(23, 59, 59, 999);
  } else if (checkType === 'B') {
    // B Check: Valid for 7 days
    expiryDate = new Date(lastCheck);
    expiryDate.setUTCDate(expiryDate.getUTCDate() + 7);
    expiryDate.setUTCHours(23, 59, 59, 999);
  } else {
    // C and D checks - not implemented yet
    return { status: 'none', text: '--', expiryText: '', lastCheckTime: null };
  }

  const hoursUntilExpiry = (expiryDate - now) / (1000 * 60 * 60);

  if (hoursUntilExpiry < 0) {
    return {
      status: 'expired',
      text: 'Expired',
      expiryText: formatDateTime(expiryDate),
      lastCheckTime: formatDateTime(lastCheck)
    };
  } else if (hoursUntilExpiry < 24) {
    return {
      status: 'warning',
      text: 'Expiring',
      expiryText: formatDateTime(expiryDate),
      lastCheckTime: formatDateTime(lastCheck)
    };
  } else {
    return {
      status: 'valid',
      text: 'Valid',
      expiryText: formatDateTime(expiryDate),
      lastCheckTime: formatDateTime(lastCheck)
    };
  }
}

// Format date for display
function formatDate(date) {
  const d = new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// Format date and time for display (UTC)
function formatDateTime(date) {
  const d = new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} ${hours}:${minutes}z`;
}

// Format last performed date with time
function formatLastPerformed(dateStr) {
  if (!dateStr) return 'Never';
  return formatDateTime(new Date(dateStr));
}

// Display maintenance data
function displayMaintenanceData(aircraft) {
  const container = document.getElementById('maintenanceGrid');

  if (aircraft.length === 0) {
    container.innerHTML = `
      <div class="table-empty">
        <div class="empty-message">NO AIRCRAFT IN FLEET</div>
        <p style="color: var(--text-muted); margin-top: 0.5rem;">
          <a href="/aircraft-marketplace" style="color: var(--accent-color);">Purchase or lease aircraft</a> to see maintenance status
        </p>
      </div>
    `;
    return;
  }

  const grouped = groupAircraftByType(aircraft);
  let html = '';

  for (const [typeName, aircraftList] of Object.entries(grouped)) {
    html += `
      <div class="aircraft-type-header">
        <h3>${typeName} <span>(${aircraftList.length} aircraft)</span></h3>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: var(--surface); border-bottom: 1px solid var(--border-color);">
            <th style="padding: 0.75rem 1rem; text-align: left; color: var(--text-secondary); font-weight: 600; width: 120px;">REGISTRATION</th>
            <th style="padding: 0.75rem 1rem; text-align: center; color: var(--text-secondary); font-weight: 600;">A CHECK (DAILY)</th>
            <th style="padding: 0.75rem 1rem; text-align: center; color: var(--text-secondary); font-weight: 600;">B CHECK (WEEKLY)</th>
            <th style="padding: 0.75rem 1rem; text-align: center; color: var(--text-secondary); font-weight: 600;">C CHECK</th>
            <th style="padding: 0.75rem 1rem; text-align: center; color: var(--text-secondary); font-weight: 600;">D CHECK</th>
          </tr>
        </thead>
        <tbody>
          ${aircraftList.map(ac => {
            const aCheck = getCheckStatus(ac.lastACheckDate, 'A');
            const bCheck = getCheckStatus(ac.lastBCheckDate, 'B');
            const cCheck = getCheckStatus(ac.lastCCheckDate, 'C');
            const dCheck = getCheckStatus(ac.lastDCheckDate, 'D');

            return `
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 0.75rem 1rem; color: var(--accent-color); font-weight: 600;">
                  ${ac.registration}
                </td>
                <td style="padding: 0.75rem 1rem; text-align: center;">
                  <div style="display: flex; flex-direction: column; align-items: center; gap: 0.35rem;">
                    <span class="check-status check-${aCheck.status}">${aCheck.text}</span>
                    ${aCheck.expiryText ? `<span style="font-size: 0.75rem; color: var(--text-muted);">Expires: ${aCheck.expiryText}</span>` : ''}
                    ${aCheck.status !== 'none' ? `<span style="font-size: 0.7rem; color: var(--text-muted);">Last: ${formatLastPerformed(ac.lastACheckDate)}</span>` : ''}
                  </div>
                </td>
                <td style="padding: 0.75rem 1rem; text-align: center;">
                  <div style="display: flex; flex-direction: column; align-items: center; gap: 0.35rem;">
                    <span class="check-status check-${bCheck.status}">${bCheck.text}</span>
                    ${bCheck.expiryText ? `<span style="font-size: 0.75rem; color: var(--text-muted);">Expires: ${bCheck.expiryText}</span>` : ''}
                    ${bCheck.status !== 'none' ? `<span style="font-size: 0.7rem; color: var(--text-muted);">Last: ${formatLastPerformed(ac.lastBCheckDate)}</span>` : ''}
                  </div>
                </td>
                <td style="padding: 0.75rem 1rem; text-align: center;">
                  <span class="check-status check-none">--</span>
                  <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.35rem;">Coming soon</div>
                </td>
                <td style="padding: 0.75rem 1rem; text-align: center;">
                  <span class="check-status check-none">--</span>
                  <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.35rem;">Coming soon</div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  container.innerHTML = html;
}

// Show notification
function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: var(--success-color);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 4px;
    z-index: 1000;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  loadMaintenanceData();
});

// Re-render when game time becomes available or updates
let lastGameTimeUpdate = 0;
window.addEventListener('worldTimeUpdated', () => {
  // Throttle to once per 5 seconds to avoid excessive re-renders
  const now = Date.now();
  if (now - lastGameTimeUpdate > 5000 && allAircraft.length > 0) {
    lastGameTimeUpdate = now;
    console.log('[Maintenance] Game time updated, re-rendering');
    displayMaintenanceData(allAircraft);
  }
});

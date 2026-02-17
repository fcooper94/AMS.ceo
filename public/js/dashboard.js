// Dashboard - loads stats and notifications from API

const NOTIFICATION_ICONS = {
  plane: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path></svg>',
  wrench: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>',
  dollar: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>',
  chart: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>',
  route: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="19" r="3"></circle><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"></path><circle cx="18" cy="5" r="3"></circle></svg>',
  alert: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
};

const TYPE_COLORS = {
  maintenance: 'var(--warning-color)',
  'maintenance-progress': 'var(--accent-color)',
  finance: '#f59e0b',
  operations: 'var(--accent-color)',
  info: 'var(--text-secondary)',
  aircraft_sold: 'var(--success-color)',
  aircraft_leased_out: 'var(--accent-color)',
  lease_expired: 'var(--warning-color)'
};

const TYPE_STYLE = {
  operations:         { label: 'Operations',   accent: 'var(--accent-color)',  iconBg: 'rgba(37, 99, 235, 0.12)',   badgeBg: 'rgba(37, 99, 235, 0.15)',   badgeColor: 'var(--accent-color)' },
  finance:            { label: 'Finance',      accent: '#f59e0b',             iconBg: 'rgba(245, 158, 11, 0.12)',  badgeBg: 'rgba(245, 158, 11, 0.15)',  badgeColor: '#f59e0b' },
  aircraft_sold:      { label: 'Fleet Sale',   accent: 'var(--success-color)', iconBg: 'rgba(5, 150, 105, 0.12)',   badgeBg: 'rgba(5, 150, 105, 0.15)',   badgeColor: 'var(--success-color)' },
  aircraft_leased_out:{ label: 'Lease',        accent: 'var(--accent-color)',  iconBg: 'rgba(37, 99, 235, 0.12)',   badgeBg: 'rgba(37, 99, 235, 0.15)',   badgeColor: 'var(--accent-color)' },
  lease_expired:      { label: 'Lease',        accent: 'var(--warning-color)', iconBg: 'rgba(217, 119, 6, 0.12)',   badgeBg: 'rgba(217, 119, 6, 0.15)',   badgeColor: 'var(--warning-color)' },
  lease_cancelled:    { label: 'Lease',        accent: 'var(--warning-color)', iconBg: 'rgba(217, 119, 6, 0.12)',   badgeBg: 'rgba(217, 119, 6, 0.15)',   badgeColor: 'var(--warning-color)' },
  lease_recalled:     { label: 'Lease',        accent: '#ef4444',             iconBg: 'rgba(239, 68, 68, 0.12)',   badgeBg: 'rgba(239, 68, 68, 0.15)',   badgeColor: '#ef4444' },
  info:               { label: 'Info',         accent: 'var(--text-secondary)',iconBg: 'rgba(148, 163, 184, 0.12)', badgeBg: 'rgba(148, 163, 184, 0.15)', badgeColor: 'var(--text-secondary)' }
};

function formatBalance(amount) {
  const num = parseFloat(amount) || 0;
  if (Math.abs(num) >= 1000000) {
    return '$' + (num / 1000000).toFixed(1) + 'M';
  } else if (Math.abs(num) >= 1000) {
    return '$' + (num / 1000).toFixed(0) + 'K';
  }
  return '$' + num.toLocaleString();
}

async function loadDashboardStats() {
  try {
    const [worldRes, fleetRes, routesRes] = await Promise.all([
      fetch('/api/world/info'),
      fetch('/api/fleet'),
      fetch('/api/routes')
    ]);

    if (worldRes.ok) {
      const world = await worldRes.json();
      const balanceEl = document.getElementById('statBalance');
      const repEl = document.getElementById('statReputation');
      if (balanceEl) {
        balanceEl.textContent = formatBalance(world.balance);
        const bal = parseFloat(world.balance) || 0;
        if (bal < 0) balanceEl.style.color = '#f85149';
        else if (bal < 50000) balanceEl.style.color = 'var(--warning-color)';
      }
      if (repEl) {
        repEl.textContent = (world.reputation || 0) + '/100';
      }

      // Also set up SP controls from same response (avoids duplicate /api/world/info call)
      applySPControls(world);
    }

    if (fleetRes.ok) {
      const fleet = await fleetRes.json();
      const fleetEl = document.getElementById('statFleet');
      if (fleetEl) {
        const count = Array.isArray(fleet) ? fleet.length : 0;
        fleetEl.textContent = count + ' A/C';
      }
    }

    if (routesRes.ok) {
      const routes = await routesRes.json();
      const routesEl = document.getElementById('statRoutes');
      if (routesEl) {
        const count = Array.isArray(routes) ? routes.length : 0;
        routesEl.textContent = count + ' Active';
      }
    }
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
  }
}

async function loadPerformanceStats() {
  try {
    const [financesRes, summaryRes] = await Promise.all([
      fetch('/api/finances'),
      fetch('/api/routes/summary')
    ]);

    // Weekly profit from finances
    if (financesRes.ok) {
      const data = await financesRes.json();
      const weeks = data.weeks || [];
      const weeklyEl = document.getElementById('statWeeklyProfit');
      const lastWeekEl = document.getElementById('statLastWeekProfit');

      if (weeks.length > 0 && weeklyEl) {
        const thisWeek = weeks[0];
        const profit = (thisWeek.netProfit !== undefined) ? thisWeek.netProfit : (thisWeek.revenues?.total || 0) + (thisWeek.expenses?.total || 0);
        weeklyEl.textContent = formatBalance(profit);
        if (profit < 0) weeklyEl.style.color = '#f85149';
        else if (profit > 0) weeklyEl.style.color = 'var(--success-color)';
      }

      if (weeks.length > 1 && lastWeekEl) {
        const lastWeek = weeks[1];
        const profit = (lastWeek.netProfit !== undefined) ? lastWeek.netProfit : (lastWeek.revenues?.total || 0) + (lastWeek.expenses?.total || 0);
        lastWeekEl.textContent = formatBalance(profit);
        if (profit < 0) lastWeekEl.style.color = '#f85149';
        else if (profit > 0) lastWeekEl.style.color = 'var(--success-color)';
      }
    }

    // Best/worst routes
    if (summaryRes.ok) {
      const summary = await summaryRes.json();
      const bestEl = document.getElementById('statBestRoute');
      const worstEl = document.getElementById('statWorstRoute');

      if (bestEl) {
        if (summary.bestRoutes && summary.bestRoutes.length > 0) {
          const best = summary.bestRoutes[0];
          const dep = best.departureAirport?.iataCode || best.departureAirport?.icaoCode || '???';
          const arr = best.arrivalAirport?.iataCode || best.arrivalAirport?.icaoCode || '???';
          bestEl.textContent = `${dep}-${arr}`;
          bestEl.title = `Profit: ${formatBalance(best.profit)}`;
          if (best.profit > 0) bestEl.style.color = 'var(--success-color)';
        } else {
          bestEl.textContent = 'No data';
          bestEl.style.color = 'var(--text-muted)';
        }
      }

      if (worstEl) {
        if (summary.worstRoutes && summary.worstRoutes.length > 0) {
          const worst = summary.worstRoutes[0];
          const dep = worst.departureAirport?.iataCode || worst.departureAirport?.icaoCode || '???';
          const arr = worst.arrivalAirport?.iataCode || worst.arrivalAirport?.icaoCode || '???';
          worstEl.textContent = `${dep}-${arr}`;
          worstEl.title = `Profit: ${formatBalance(worst.profit)}`;
          if (worst.profit < 0) worstEl.style.color = '#f85149';
        } else {
          worstEl.textContent = 'No data';
          worstEl.style.color = 'var(--text-muted)';
        }
      }
    }
  } catch (error) {
    console.error('Error loading performance stats:', error);
  }
}

let cachedNotifications = [];

function formatNotifDate(gameTime) {
  if (!gameTime) return '';
  const d = new Date(gameTime);
  const day = d.getUTCDate().toString().padStart(2, '0');
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()];
  const yr = d.getUTCFullYear();
  return `${day} ${mon} ${yr}`;
}

async function loadNotifications() {
  const body = document.getElementById('notificationsBody');
  if (!body) return;

  try {
    const res = await fetch('/api/dashboard/notifications');
    if (!res.ok) throw new Error('Failed to load');

    const notifications = await res.json();
    cachedNotifications = notifications;

    if (notifications.length === 0) {
      body.innerHTML = '<div class="panel-empty">No notifications. Your airline is running smoothly!</div>';
      return;
    }

    body.innerHTML = notifications.map((n, idx) => {
      const dateStr = n.gameTime ? `<div class="news-date">${formatNotifDate(n.gameTime)}</div>` : '';

      return `
        <div class="news-item" onclick="openNotificationModal(${idx})" style="cursor: pointer;">
          <div class="news-item-content">
            ${dateStr}
            <div class="news-title">${n.title}</div>
            <div class="news-text">${n.message}</div>
          </div>
          <svg class="notification-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>`;
    }).join('');
  } catch (error) {
    console.error('Error loading notifications:', error);
    body.innerHTML = '<div class="panel-empty">Unable to load notifications.</div>';
  }
}

function getExpandedNotification(n) {
  const msg = n.message || '';
  const title = n.title || '';
  const p = (...lines) => lines.map(l => `<p>${l}</p>`).join('');

  switch (n.type) {
    case 'operations': {
      if (title.includes('Ceased Operations')) {
        const name = title.replace(' Ceased Operations', '');
        return p(
          `${name} has declared bankruptcy and permanently ceased all flight operations. Their aircraft have been grounded and all scheduled services have been cancelled.`,
          `This may create opportunities on routes they previously operated. Consider expanding into any gaps left in the market before other competitors move in.`
        );
      }
      if (title.startsWith('New Competitor:')) {
        const routePair = title.replace('New Competitor: ', '');
        return p(
          `A rival airline has begun operating on the ${routePair} route, directly competing with your existing service. ${msg}`,
          `You may want to review your pricing strategy and service frequency on this route to maintain your market share. Monitor the competition page for their fare levels and adjust accordingly.`
        );
      }
      if (title.includes('Acquired Aircraft')) {
        return p(
          msg,
          `This fleet expansion suggests they may be planning to launch new routes or increase frequency on existing ones. Keep an eye on their operations over the coming days to anticipate any competitive moves that could affect your network.`
        );
      }
      if (title.includes('Cancelled Route')) {
        return p(
          msg,
          `This withdrawal from the route could indicate financial difficulties or a strategic shift by the airline. If you don't already operate this route, it may present an opportunity to capture unserved demand.`,
          `Review the route's potential before other airlines fill the gap.`
        );
      }
      if (title.startsWith('New Airline:') || title.startsWith('New Competitor:')) {
        const isCompetitor = title.startsWith('New Competitor:');
        return p(
          msg,
          isCompetitor
            ? 'As they are based at your hub airport, expect direct competition on some of your routes in the near future. Monitor their route launches closely and consider whether pre-emptive pricing adjustments or frequency increases could help defend your market position.'
            : 'While they are not based at your hub, they may still expand into overlapping markets over time. Keep an eye on their growth and be prepared to respond if they begin operating on your key routes.'
        );
      }
      return p(msg);
    }

    case 'finance': {
      if (title.startsWith('Price Undercut:')) {
        return p(
          msg,
          `This aggressive pricing move could draw passengers away from your service if left unaddressed.`,
          `Consider reviewing your fare structure — you can either match their pricing to stay competitive, differentiate with better service quality, or maintain your current fares if your load factors remain healthy.`
        );
      }
      return p(msg);
    }

    case 'aircraft_sold':
      return p(
        msg,
        `The sale proceeds have been credited to your airline's account and are available immediately. The aircraft has been removed from your fleet roster.`,
        `You may want to consider whether a replacement aircraft is needed to maintain your current route network and schedule coverage.`
      );

    case 'aircraft_leased_out':
      return p(
        msg,
        `Lease income will be credited to your account on a regular basis for the duration of the agreement. The aircraft remains your property and will be returned to your fleet when the lease term expires.`,
        `Note that you cannot operate or modify the aircraft while it is under lease.`
      );

    case 'lease_cancelled':
      return p(
        msg,
        `The aircraft has been returned to your fleet and is now available for your own operations. You may wish to reassign it to an existing route, list it for sale, or offer it on the lease market again.`
      );

    case 'lease_recalled':
      return p(
        msg,
        `You will need to adjust your schedule to account for the loss of this aircraft. Any routes that were dependent on it should be reviewed — you may need to acquire a replacement or redistribute your remaining fleet to cover the affected services.`
      );

    case 'lease_expired':
      return p(
        msg,
        `You can now reassign the aircraft to your route network, list it for sale on the marketplace, or offer it for lease again. Check the aircraft's maintenance status before returning it to active service.`
      );

    default:
      return p(msg);
  }
}

function openNotificationModal(idx) {
  const n = cachedNotifications[idx];
  if (!n) return;

  const icon = NOTIFICATION_ICONS[n.icon] || NOTIFICATION_ICONS.alert;
  const style = TYPE_STYLE[n.type] || TYPE_STYLE.info;

  // Accent bar
  const accent = document.getElementById('notifModalAccent');
  accent.style.background = style.accent;

  // Icon with background
  const iconEl = document.getElementById('notifModalIcon');
  iconEl.innerHTML = icon;
  iconEl.style.color = style.accent;
  iconEl.style.background = style.iconBg;

  // Badge
  const badge = document.getElementById('notifModalBadge');
  badge.textContent = style.label;
  badge.style.background = style.badgeBg;
  badge.style.color = style.badgeColor;

  // Title & message
  document.getElementById('notifModalTitle').textContent = n.title;
  document.getElementById('notifModalMessage').innerHTML = getExpandedNotification(n);

  // Meta row with calendar icon + date
  const meta = document.getElementById('notifModalMeta');
  const dateStr = n.gameTime ? formatNotifDate(n.gameTime) : '';
  meta.innerHTML = dateStr ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>${dateStr}` : '';

  document.getElementById('notificationModal').style.display = 'flex';
}

function closeNotificationModal() {
  document.getElementById('notificationModal').style.display = 'none';
}

async function dismissNotificationFromModal(id) {
  try {
    await fetch(`/api/dashboard/notifications/${id}/read`, { method: 'POST' });
    closeNotificationModal();
    loadNotifications();
  } catch (error) {
    console.error('Error dismissing notification:', error);
  }
}

async function dismissNotification(id, btnEl) {
  try {
    await fetch(`/api/dashboard/notifications/${id}/read`, { method: 'POST' });
    const item = btnEl.closest('.notification-item');
    if (item) {
      item.style.transition = 'opacity 0.3s ease';
      item.style.opacity = '0';
      setTimeout(() => { item.remove(); loadNotifications(); }, 300);
    }
  } catch (error) {
    console.error('Error dismissing notification:', error);
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeNotificationModal();
    closeNewsModal();
  }
});

// News modal
const NEWS_ITEMS = [
  {
    date: '07 Feb 2026',
    title: 'Welcome to AMS',
    message: '<p>Welcome to Airline Management Sim — a realistic airline operations platform where you build and manage your own commercial carrier from the ground up.</p><p>Purchase or lease aircraft from a wide selection of real-world types, establish routes between thousands of airports worldwide, and set competitive fares to attract passengers.</p><p>Your decisions on fleet composition, route planning, pricing strategy, and schedule optimisation will determine whether your airline thrives or struggles. Whether you prefer single-player with AI competition or multiplayer against other pilots, the challenge is yours to take on.</p>'
  },
  {
    date: '07 Feb 2026',
    title: 'Getting Started',
    message: '<p>To begin building your airline, head to the <strong>Fleet</strong> page and purchase or lease your first aircraft from the marketplace.</p><p>Once you have an aircraft in your fleet, visit the <strong>Routes</strong> page to create your first route from your base airport to a destination of your choice. The system will calculate flight times including wind effects and turnaround procedures.</p><p>After creating a route, go to the <strong>Schedule</strong> page to assign flights throughout the week. Keep an eye on your finances — ticket revenue needs to cover fuel, crew, maintenance, and any lease payments.</p><p>As your profits grow, expand your fleet and network to build a competitive airline.</p>'
  },
  {
    date: '07 Feb 2026',
    title: 'Maintenance Matters',
    message: '<p>Every aircraft in your fleet requires regular maintenance checks to remain airworthy. Daily checks are performed automatically during turnaround at your base airport, but you need to ensure your scheduling allows sufficient ground time for these inspections.</p><p>If a daily check is missed, the aircraft will be flagged and may need to be grounded until maintenance is completed.</p><p>You can view upcoming maintenance requirements on the <strong>Maintenance</strong> page, where you can also enable auto-scheduling to have the system manage check timing for you. Keeping on top of maintenance prevents costly disruptions to your flight schedule and protects your airline\'s reputation.</p>'
  }
];

function openNewsModal(idx) {
  const item = NEWS_ITEMS[idx];
  if (!item) return;

  document.getElementById('newsModalTitle').textContent = item.title;
  document.getElementById('newsModalMessage').innerHTML = item.message;
  document.getElementById('newsModalMeta').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>${item.date}`;
  document.getElementById('newsModal').style.display = 'flex';
}

function closeNewsModal() {
  document.getElementById('newsModal').style.display = 'none';
}

let worldIsPaused = false;

function applySPControls(world) {
  if (world.worldType !== 'singleplayer') return;

  const card = document.getElementById('spControlsCard');
  if (!card) return;
  card.style.display = 'block';

  // Set current speed
  const speedSelect = document.getElementById('spSpeedSelect');
  if (speedSelect) {
    const currentSpeed = world.timeAcceleration || 60;
    const optExists = [...speedSelect.options].some(o => parseInt(o.value) === currentSpeed);
    if (optExists) {
      speedSelect.value = String(currentSpeed);
    } else {
      const opt = document.createElement('option');
      opt.value = String(currentSpeed);
      opt.textContent = currentSpeed + 'x';
      opt.selected = true;
      speedSelect.appendChild(opt);
    }
  }

  // Set pause/resume state
  worldIsPaused = !!world.isPaused;
  updatePauseResumeUI();
}

function updatePauseResumeUI() {
  const pauseIcon = document.getElementById('spPauseIcon');
  const playIcon = document.getElementById('spPlayIcon');
  const text = document.getElementById('spPauseResumeText');
  const status = document.getElementById('spWorldStatus');

  if (worldIsPaused) {
    if (pauseIcon) pauseIcon.style.display = 'none';
    if (playIcon) playIcon.style.display = '';
    if (text) text.textContent = 'Resume';
    if (status) { status.textContent = 'Paused'; status.style.color = 'var(--warning-color)'; }
  } else {
    if (pauseIcon) pauseIcon.style.display = '';
    if (playIcon) playIcon.style.display = 'none';
    if (text) text.textContent = 'Pause';
    if (status) { status.textContent = 'Running'; status.style.color = 'var(--success-color)'; }
  }
}

async function toggleWorldPause() {
  try {
    // Capture the current client-side time BEFORE pausing so we freeze at the displayed time
    const currentClientTime = typeof calculateCurrentWorldTime === 'function'
      ? calculateCurrentWorldTime()
      : (typeof getGlobalWorldTime === 'function' ? getGlobalWorldTime() : null);

    const endpoint = worldIsPaused ? '/api/world/resume' : '/api/world/pause';
    const body = {};
    // Send the client's current time so the server freezes at the right moment
    if (!worldIsPaused && currentClientTime) {
      body.clientTime = currentClientTime.toISOString();
    }
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (res.ok) {
      worldIsPaused = !worldIsPaused;
      // Sync global pause state so navbar clock freezes/resumes immediately
      if (typeof worldIsPausedGlobal !== 'undefined') {
        worldIsPausedGlobal = worldIsPaused;
      }
      if (typeof updateNavbarPausedState === 'function') {
        updateNavbarPausedState(worldIsPaused);
      }
      // When pausing, freeze the reference at current client time to avoid jump-back
      if (worldIsPaused && currentClientTime) {
        if (typeof serverReferenceTime !== 'undefined') {
          serverReferenceTime = currentClientTime;
          serverReferenceTimestamp = Date.now();
        }
      }
      updatePauseResumeUI();
    } else {
      const err = await res.json().catch(() => ({}));
      console.error('Failed to toggle pause:', res.status, err);
    }
  } catch (err) {
    console.error('Error toggling pause:', err);
  }
}

async function changeWorldSpeed(factor) {
  try {
    const res = await fetch('/api/world/acceleration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ factor: parseInt(factor) })
    });
    if (res.ok) {
      // Sync global acceleration so navbar clock reflects new speed immediately
      if (typeof worldTimeAcceleration !== 'undefined') {
        worldTimeAcceleration = parseInt(factor);
      }
      console.log(`Speed changed to ${factor}x`);
    } else {
      const err = await res.json().catch(() => ({}));
      console.error('Failed to change speed:', res.status, err);
    }
  } catch (err) {
    console.error('Error changing speed:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadDashboardStats();
  loadPerformanceStats();
  loadNotifications();

  // Measure and set navbar height for fixed sidebar positioning
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    const setNavbarHeight = () => {
      const height = navbar.offsetHeight;
      document.documentElement.style.setProperty('--navbar-height', `${height}px`);
    };
    setNavbarHeight();
    window.addEventListener('resize', setNavbarHeight);
  }
});

// Real-time notification updates via Socket.IO
let notificationRefreshTimer = null;

window.addEventListener('notificationsRefresh', () => {
  if (notificationRefreshTimer) clearTimeout(notificationRefreshTimer);
  notificationRefreshTimer = setTimeout(() => {
    notificationRefreshTimer = null;
    loadNotifications();
  }, 2000);
});

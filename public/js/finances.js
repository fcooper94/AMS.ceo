// Financial Reports — weekly profit + route performance

let allWeeks = [];
let weekPage = 0;
const WEEKS_PER_PAGE = 4;
let passengerExpanded = false;
let cargoExpanded = false;
let opCostsExpanded = false;
let overheadsExpanded = false;

const CARGO_BREAKDOWN_LABELS = {
  general:    'General',
  express:    'Express',
  heavy:      'Heavy',
  oversized:  'Oversized',
  perishable: 'Perishable',
  dangerous:  'Dangerous',
  liveAnimal: 'Live Animal',
  highValue:  'High Value'
};

const GROUP_COLORS = {
  income:   { accent: '#10B981', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.25)', text: '#34D399' },
  outgoing: { accent: '#f85149', bg: 'rgba(248,81,73,0.05)',  border: 'rgba(248,81,73,0.2)',   text: '#f87171' },
  neutral:  { accent: 'var(--accent-color)', bg: 'var(--surface-elevated)', border: 'var(--border-color)', text: 'var(--accent-color)' }
};

async function loadFinancialData() {
  try {
    const res = await fetch('/api/finances');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load');

    renderSummary(data);
    allWeeks = data.weeks || [];
    // If ?week=previous, start on page that shows previous week
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('week') === 'previous' && allWeeks.length > 1) {
      weekPage = Math.floor(1 / WEEKS_PER_PAGE);
    } else {
      weekPage = 0;
    }
    renderWeeklyPL();
    renderRoutes(data.routes);
  } catch (err) {
    console.error('Error loading financial data:', err);
    document.getElementById('weeklyBody').innerHTML =
      '<tr><td colspan="9" style="padding:1.5rem;text-align:center;color:var(--warning-color);">Error loading data</td></tr>';
  }
}

// ── Summary bar ──────────────────────────────────────────────────────────────

function renderSummary(data) {
  setText('statBalance', fmtMoney(data.balance));
  setText('statRevenue', fmtMoney(data.allTime.totalRevenue));
  setText('statFlights', data.allTime.totalFlights.toLocaleString());
  setText('statPax', data.allTime.totalPassengers.toLocaleString());
  setText('statOverhead', fmtMoney(data.weeklyOverheads.total) + '/wk');

  // Weekly profit hero — from latest week record
  var weeks = data.weeks || [];
  var latest = weeks.length > 0 ? weeks[0] : null;
  var profitEl = document.getElementById('statWeeklyProfit');
  var labelEl = document.getElementById('statWeeklyLabel');
  var heroEl = document.getElementById('heroProfit');
  if (latest && profitEl) {
    var wp = latest.netProfit;
    profitEl.textContent = (wp < 0 ? '-' : '+') + fmtMoney(Math.abs(wp));
    profitEl.style.color = wp > 0 ? 'var(--success-color)' : wp < 0 ? '#f85149' : 'var(--text-muted)';
    if (heroEl) {
      heroEl.style.borderLeft = '3px solid ' + (wp > 0 ? 'var(--success-color)' : wp < 0 ? '#f85149' : 'var(--border-color)');
    }
    if (labelEl) labelEl.textContent = 'Wk of ' + fmtDateShort(latest.weekStart);
    setText('statWkRevenue', fmtMoney(latest.flightRevenue));
    setText('statWkCosts', fmtMoney(latest.totalCosts));
  } else if (profitEl) {
    profitEl.textContent = '—';
    profitEl.style.color = 'var(--text-muted)';
    if (labelEl) labelEl.textContent = 'No data yet';
    setText('statWkRevenue', '—');
    setText('statWkCosts', '—');
  }
}

// ── Pagination ───────────────────────────────────────────────────────────────

function changeWeekPage(dir) {
  const maxPage = Math.max(0, Math.ceil(allWeeks.length / WEEKS_PER_PAGE) - 1);
  weekPage = Math.max(0, Math.min(maxPage, weekPage + dir));
  renderWeeklyPL();
}

// ── Weekly breakdown table ───────────────────────────────────────────────────

function renderWeeklyPL() {
  const thead = document.getElementById('weeklyHead');
  const tbody = document.getElementById('weeklyBody');
  const prevBtn = document.getElementById('weekPrev');
  const nextBtn = document.getElementById('weekNext');
  const rangeEl = document.getElementById('weekRange');

  if (!allWeeks || allWeeks.length === 0) {
    thead.innerHTML = '';
    tbody.innerHTML = '<tr><td colspan="2" style="padding:1.5rem;text-align:center;color:var(--text-secondary);">No weekly data yet. Data will appear once the first game week completes.</td></tr>';
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';
    if (rangeEl) rangeEl.textContent = '';
    return;
  }

  const totalPages = Math.ceil(allWeeks.length / WEEKS_PER_PAGE);
  const start = weekPage * WEEKS_PER_PAGE;
  const weeks = allWeeks.slice(start, start + WEEKS_PER_PAGE);

  // Update nav buttons
  if (prevBtn) {
    prevBtn.disabled = weekPage >= totalPages - 1;
    prevBtn.style.opacity = prevBtn.disabled ? '0.3' : '1';
  }
  if (nextBtn) {
    nextBtn.disabled = weekPage <= 0;
    nextBtn.style.opacity = nextBtn.disabled ? '0.3' : '1';
  }
  if (prevBtn) prevBtn.style.display = '';
  if (nextBtn) nextBtn.style.display = '';

  // Range label
  if (rangeEl) {
    if (allWeeks.length <= WEEKS_PER_PAGE) {
      rangeEl.textContent = allWeeks.length + ' week' + (allWeeks.length !== 1 ? 's' : '');
    } else {
      rangeEl.textContent = (weekPage * WEEKS_PER_PAGE + 1) + '–' + Math.min((weekPage + 1) * WEEKS_PER_PAGE, allWeeks.length) + ' of ' + allWeeks.length + ' weeks';
    }
  }

  // Header: Category | Week1 | Week2 | ...
  const cols = weeks.length + 1;
  let head = '<tr style="background:var(--surface-elevated);border-bottom:1px solid var(--border-color);">';
  head += '<th style="padding:0.4rem 0.6rem;text-align:left;color:var(--text-muted);font-size:0.7rem;font-weight:600;min-width:140px;">Category</th>';
  for (var wi = 0; wi < weeks.length; wi++) {
    var w = weeks[wi];
    var isLatest = (weekPage === 0 && wi === 0);
    var badge = isLatest ? ' <span style="background:var(--accent-color);color:#fff;padding:0.1rem 0.3rem;border-radius:3px;font-size:0.5rem;font-weight:700;vertical-align:middle;margin-left:0.2rem;">LATEST</span>' : '';
    var thColor = isLatest ? 'color:var(--accent-color)' : 'color:var(--text-muted)';
    head += '<th style="padding:0.4rem 0.6rem;text-align:left;' + thColor + ';font-size:0.7rem;font-weight:600;white-space:nowrap;">Wk of ' + fmtDateShort(w.weekStart) + badge + '</th>';
  }
  head += '</tr>';
  thead.innerHTML = head;

  // Rows
  let rows = '';

  // ── INCOME ──
  rows += wkGroupHeader('INCOME', 'income');
  rows += wkRevenueToggleRow('Passenger Revenue', passengerExpanded, 'togglePassengerBreakdown', weeks, 'passengerRevenueBreakdown');
  if (passengerExpanded) {
    rows += wkBreakdownRow('Economy',      weeks, 'passengerRevenueBreakdown', 'economy');
    rows += wkBreakdownRow('Economy Plus', weeks, 'passengerRevenueBreakdown', 'economyPlus');
    rows += wkBreakdownRow('Business',     weeks, 'passengerRevenueBreakdown', 'business');
    rows += wkBreakdownRow('First Class',  weeks, 'passengerRevenueBreakdown', 'first');
  }
  rows += wkRevenueToggleRow('Cargo Revenue', cargoExpanded, 'toggleCargoBreakdown', weeks, 'cargoRevenueBreakdown');
  if (cargoExpanded) {
    for (const [key, label] of Object.entries(CARGO_BREAKDOWN_LABELS)) {
      rows += wkBreakdownRow(label, weeks, 'cargoRevenueBreakdown', key);
    }
  }
  rows += wkTotal('Total Income', weeks, 'flightRevenue', false, 'income');

  rows += wkDivider(cols);

  // ── OUTGOINGS ──
  rows += wkGroupHeader('OUTGOINGS', 'outgoing');

  // Operating Costs
  rows += wkOutgoingToggleRow('Operating Costs', opCostsExpanded, 'toggleOpCosts', weeks, 'operatingCosts');
  if (opCostsExpanded) {
    rows += wkRow('Fuel', weeks, 'fuelCosts', true, 'outgoing');
    rows += wkRow('Crew', weeks, 'crewCosts', true, 'outgoing');
    rows += wkRow('Maintenance', weeks, 'maintenanceCosts', true, 'outgoing');
    rows += wkRow('Airport Fees', weeks, 'airportFees', true, 'outgoing');
    rows += wkRow('Ground Handling', weeks, 'groundHandlingCosts', true, 'outgoing');
    rows += wkRow('Pax Services', weeks, 'paxServiceCosts', true, 'outgoing');
  }

  // Overheads
  rows += wkOutgoingToggleRow('Overheads', overheadsExpanded, 'toggleOverheads', weeks, 'overheads');
  if (overheadsExpanded) {
    rows += wkRow('Staff', weeks, 'staffCosts', true, 'outgoing');
    rows += wkRow('Leases', weeks, 'leaseCosts', true, 'outgoing');
    rows += wkRow('Contractors', weeks, 'contractorCosts', true, 'outgoing');
    rows += wkRow('Fleet Commonality', weeks, 'fleetCommonalityCosts', true, 'outgoing');
    rows += wkRow('Insurance', weeks, 'insuranceCosts', true, 'outgoing');
    rows += wkRow('Corporate Admin', weeks, 'corporateAdminCosts', true, 'outgoing');
    rows += wkRow('Loan Payments', weeks, 'loanPayments', true, 'outgoing');
    rows += wkRow('Marketing', weeks, 'marketingCosts', true, 'outgoing');
  }

  // Aircraft purchases: deposits, delivery payments, used purchases, cabin
  // outfitting/refits — its own category (large one-off capital sums)
  rows += wkRow('Aircraft Purchases', weeks, 'fleetCapitalCosts', true, 'outgoing');

  // Total Outgoings
  rows += wkTotal('Total Outgoings', weeks, 'totalCosts', true, 'outgoing');

  rows += wkDivider(cols);

  // ── NET PROFIT ──
  rows += wkHighlight('NET PROFIT', weeks, 'netProfit');

  // ── STATS ──
  rows += wkSpacer(cols);
  rows += wkGroupHeader('STATS', 'neutral');
  rows += wkStatRow('Flights', weeks, 'flights');
  rows += wkStatRow('Passengers', weeks, 'passengers');

  tbody.innerHTML = rows;
}

function wkGroupHeader(title, group) {
  const g = GROUP_COLORS[group] || GROUP_COLORS.neutral;
  return `<tr style="background:${g.bg};">
    <td colspan="99" style="padding:0.45rem 0.6rem;font-weight:700;color:${g.text};font-size:0.7rem;letter-spacing:0.8px;border-left:3px solid ${g.accent};border-top:1px solid ${g.border};">${title}</td></tr>`;
}

function wkSubSection(title) {
  return `<tr style="background:rgba(255,255,255,0.015);">
    <td colspan="99" style="padding:0.25rem 0.6rem 0.25rem 1.2rem;font-weight:600;color:var(--text-muted);font-size:0.65rem;letter-spacing:0.4px;text-transform:uppercase;">${title}</td></tr>`;
}

function wkRow(label, weeks, key, isExpense, group) {
  const tint = group === 'income' ? 'rgba(16,185,129,0.02)' : group === 'outgoing' ? 'rgba(248,81,73,0.015)' : 'transparent';
  let cells = `<td style="padding:0.3rem 0.6rem 0.3rem 1.2rem;color:var(--text-secondary);font-size:0.8rem;">${label}</td>`;
  for (const w of weeks) {
    const v = w[key] || 0;
    const prefix = isExpense && v > 0 ? '-' : '';
    const color = v === 0 ? 'var(--text-muted)' : 'var(--text-secondary)';
    cells += `<td style="padding:0.3rem 0.6rem;font-family:'Courier New',monospace;color:${color};font-size:0.8rem;">${prefix}${fmtNum(Math.abs(v))}</td>`;
  }
  return `<tr style="background:${tint};border-bottom:1px solid rgba(255,255,255,0.03);">${cells}</tr>`;
}

function wkSubTotal(label, weeks, key, isExpense) {
  let cells = `<td style="padding:0.3rem 0.6rem 0.3rem 1.2rem;font-weight:600;color:var(--text-muted);font-size:0.75rem;font-style:italic;">${label}</td>`;
  for (const w of weeks) {
    const v = w[key] || 0;
    const prefix = isExpense && v > 0 ? '-' : '';
    cells += `<td style="padding:0.3rem 0.6rem;font-weight:600;font-family:'Courier New',monospace;color:var(--text-muted);font-size:0.75rem;">${prefix}${fmtNum(Math.abs(v))}</td>`;
  }
  return `<tr style="border-bottom:1px solid rgba(255,255,255,0.06);">${cells}</tr>`;
}

function wkTotal(label, weeks, key, isExpense, group) {
  const g = GROUP_COLORS[group] || GROUP_COLORS.neutral;
  const valColor = group === 'income' ? g.text : group === 'outgoing' ? g.text : 'var(--text-primary)';
  let cells = `<td style="padding:0.45rem 0.6rem;font-weight:700;color:var(--text-primary);font-size:0.8rem;">${label}</td>`;
  for (const w of weeks) {
    const v = w[key] || 0;
    const prefix = isExpense && v > 0 ? '-' : '';
    cells += `<td style="padding:0.45rem 0.6rem;font-weight:700;font-family:'Courier New',monospace;color:${valColor};font-size:0.8rem;">${prefix}${fmtNum(Math.abs(v))}</td>`;
  }
  return `<tr style="background:${g.bg};border-top:1px solid ${g.border};border-bottom:1px solid ${g.border};">${cells}</tr>`;
}

function wkDivider(cols) {
  return `<tr style="height:0.5rem;border-bottom:1px solid var(--border-color);"><td colspan="${cols}"></td></tr>`;
}

function wkHighlight(label, weeks, key) {
  let cells = `<td style="padding:0.5rem 0.6rem;font-weight:700;color:var(--text-primary);font-size:0.85rem;">${label}</td>`;
  for (const w of weeks) {
    const v = w[key] || 0;
    const color = v > 0 ? 'var(--success-color)' : v < 0 ? '#f85149' : 'var(--text-muted)';
    const sign = v < 0 ? '-' : '';
    cells += `<td style="padding:0.5rem 0.6rem;font-weight:700;font-family:'Courier New',monospace;color:${color};font-size:0.85rem;">${sign}${fmtNum(Math.abs(v))}</td>`;
  }
  return `<tr style="background:rgba(255,255,255,0.03);border-top:2px solid var(--border-color);border-bottom:2px solid var(--border-color);">${cells}</tr>`;
}

function wkStatRow(label, weeks, key) {
  let cells = `<td style="padding:0.3rem 0.6rem;color:var(--text-secondary);font-size:0.8rem;">${label}</td>`;
  for (const w of weeks) {
    cells += `<td style="padding:0.3rem 0.6rem;font-family:'Courier New',monospace;color:var(--text-secondary);font-size:0.8rem;">${(w[key] || 0).toLocaleString()}</td>`;
  }
  return `<tr style="border-bottom:1px solid rgba(255,255,255,0.03);">${cells}</tr>`;
}

function wkSpacer(cols) {
  return `<tr style="height:0.3rem;"><td colspan="${cols}"></td></tr>`;
}

// ── Revenue breakdown helpers ─────────────────────────────────────────────────

function toggleOpCosts() {
  opCostsExpanded = !opCostsExpanded;
  renderWeeklyPL();
}

function toggleOverheads() {
  overheadsExpanded = !overheadsExpanded;
  renderWeeklyPL();
}

function wkOutgoingToggleRow(label, isExpanded, toggleFn, weeks, key) {
  const chevron = isExpanded ? '&#9660;' : '&#9654;';
  let cells = `<td style="padding:0.3rem 0.6rem 0.3rem 1.2rem;color:var(--text-secondary);font-size:0.8rem;">
    <span style="color:var(--text-muted);margin-right:0.3rem;font-size:0.65rem;">${chevron}</span>${label}</td>`;
  for (const w of weeks) {
    const v = w[key] || 0;
    const prefix = v > 0 ? '-' : '';
    const color = v === 0 ? 'var(--text-muted)' : 'var(--text-secondary)';
    cells += `<td style="padding:0.3rem 0.6rem;font-family:'Courier New',monospace;color:${color};font-size:0.8rem;">${prefix}${fmtNum(Math.abs(v))}</td>`;
  }
  return `<tr onclick="${toggleFn}()" style="background:rgba(248,81,73,0.015);border-bottom:1px solid rgba(255,255,255,0.03);cursor:pointer;" onmouseenter="this.style.background='rgba(248,81,73,0.03)'" onmouseleave="this.style.background='rgba(248,81,73,0.015)'">${cells}</tr>`;
}

function togglePassengerBreakdown() {
  passengerExpanded = !passengerExpanded;
  renderWeeklyPL();
}

function toggleCargoBreakdown() {
  cargoExpanded = !cargoExpanded;
  renderWeeklyPL();
}

function wkRevenueToggleRow(label, isExpanded, toggleFn, weeks, breakdownKey) {
  const chevron = isExpanded ? '&#9660;' : '&#9654;';
  let cells = `<td style="padding:0.3rem 0.6rem 0.3rem 1.2rem;color:var(--text-secondary);font-size:0.8rem;">
    <span style="color:var(--text-muted);margin-right:0.3rem;font-size:0.65rem;">${chevron}</span>${label}</td>`;
  for (const w of weeks) {
    const v = Object.values(w[breakdownKey] || {}).reduce((s, x) => s + x, 0);
    const color = v === 0 ? 'var(--text-muted)' : 'var(--text-secondary)';
    cells += `<td style="padding:0.3rem 0.6rem;font-family:'Courier New',monospace;color:${color};font-size:0.8rem;">${fmtNum(v)}</td>`;
  }
  return `<tr onclick="${toggleFn}()" style="background:rgba(16,185,129,0.02);border-bottom:1px solid rgba(255,255,255,0.03);cursor:pointer;" onmouseenter="this.style.background='rgba(16,185,129,0.05)'" onmouseleave="this.style.background='rgba(16,185,129,0.02)'">${cells}</tr>`;
}

function wkBreakdownSubSection(title) {
  return `<tr style="background:rgba(16,185,129,0.015);">
    <td colspan="99" style="padding:0.2rem 0.6rem 0.2rem 2rem;font-weight:600;color:rgba(52,211,153,0.6);font-size:0.62rem;letter-spacing:0.4px;text-transform:uppercase;">${title}</td></tr>`;
}

function wkBreakdownRow(label, weeks, jsonKey, subKey) {
  let cells = `<td style="padding:0.25rem 0.6rem 0.25rem 2.4rem;color:var(--text-muted);font-size:0.75rem;">${label}</td>`;
  for (const w of weeks) {
    const v = ((w[jsonKey] || {})[subKey]) || 0;
    const color = v === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(52,211,153,0.7)';
    cells += `<td style="padding:0.25rem 0.6rem;font-family:'Courier New',monospace;color:${color};font-size:0.75rem;">${fmtNum(v)}</td>`;
  }
  return `<tr style="background:rgba(16,185,129,0.01);border-bottom:1px solid rgba(255,255,255,0.02);">${cells}</tr>`;
}

// ── Route Performance (tabbed) ───────────────────────────────────────────────

var _rpRoutes = [];
var _rpActiveTab = 'cityPair';

function renderRoutes(routes) {
  _rpRoutes = routes || [];
  switchRouteTab(_rpActiveTab);
}

function switchRouteTab(tab) {
  _rpActiveTab = tab;
  var btns = document.querySelectorAll('#routePerfTabs .rp-tab');
  for (var i = 0; i < btns.length; i++) {
    var b = btns[i];
    if (b.getAttribute('data-tab') === tab) {
      b.style.background = 'var(--accent-color)';
      b.style.color = '#fff';
    } else {
      b.style.background = 'var(--surface-elevated)';
      b.style.color = 'var(--text-muted)';
    }
  }
  var container = document.getElementById('routePerfContent');
  if (!_rpRoutes.length) {
    container.innerHTML = '<div style="padding:1.5rem;text-align:center;color:var(--text-secondary);font-size:0.85rem;">No routes yet.</div>';
    return;
  }
  if (tab === 'cityPair') renderCityPairTab(container);
  else if (tab === 'allRoutes') renderAllRoutesTab(container);
  else if (tab === 'byAcType') renderByAcTypeTab(container);
}

// Weekly estimates: avg per flight × operating days per week
function _weeklyEstimates(r) {
  if (!r.totalFlights || r.totalFlights === 0) return { weeklyRevenue: 0, weeklyCosts: 0, weeklyProfit: 0 };
  var daysPerWeek = (r.daysOfWeek && r.daysOfWeek.length) ? r.daysOfWeek.length : 7;
  return {
    weeklyRevenue: (r.totalRevenue / r.totalFlights) * daysPerWeek,
    weeklyCosts: (r.totalCosts / r.totalFlights) * daysPerWeek,
    weeklyProfit: (r.profit / r.totalFlights) * daysPerWeek
  };
}

// Aggregate helper: combine route objects into a summary
function _aggregate(routes) {
  var flights = 0, rev = 0, costs = 0, pax = 0, lfWeighted = 0;
  var wRev = 0, wCosts = 0, wProfit = 0;
  for (var i = 0; i < routes.length; i++) {
    var r = routes[i];
    flights += r.totalFlights || 0;
    rev += r.totalRevenue || 0;
    costs += r.totalCosts || 0;
    pax += r.totalPassengers || 0;
    lfWeighted += (r.totalFlights || 0) * (r.averageLoadFactor || 0);
    var we = _weeklyEstimates(r);
    wRev += we.weeklyRevenue;
    wCosts += we.weeklyCosts;
    wProfit += we.weeklyProfit;
  }
  var profit = rev - costs;
  return {
    totalFlights: flights,
    totalRevenue: rev,
    totalCosts: costs,
    profit: profit,
    profitMargin: rev > 0 ? parseFloat(((profit / rev) * 100).toFixed(1)) : 0,
    totalPassengers: pax,
    averageLoadFactor: flights > 0 ? lfWeighted / flights : 0,
    weeklyRevenue: wRev,
    weeklyCosts: wCosts,
    weeklyProfit: wProfit,
    routeCount: routes.length,
    activeCount: routes.filter(function(r) { return r.isActive; }).length
  };
}

var _rpTh = 'padding:0.35rem 0.5rem;text-align:right;color:var(--text-muted);font-size:0.65rem;font-weight:600;';
var _rpGrp = 'padding:0.3rem 0.5rem;text-align:center;font-size:0.6rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;';
var _rpTd = "padding:0.3rem 0.5rem;text-align:right;font-family:'Courier New',monospace;font-size:0.75rem;";
var _rpBorderL = 'border-left:2px solid var(--border-color);';

function _rpProfitColor(v) {
  return v > 0 ? 'var(--success-color)' : v < 0 ? '#f85149' : 'var(--text-muted)';
}

function _rpLfColor(lf) {
  var pct = (lf || 0) * 100;
  return pct >= 70 ? 'var(--success-color)' : pct >= 40 ? 'var(--warning-color)' : '#f85149';
}

function _rpTableHead(col1, col2) {
  return '<table style="width:100%;border-collapse:collapse;font-size:0.75rem;"><thead>' +
    '<tr style="background:var(--surface-elevated);">' +
    '<th colspan="2" style="' + _rpGrp + '"></th>' +
    '<th colspan="4" style="' + _rpGrp + _rpBorderL + 'color:var(--accent-color);">Weekly</th>' +
    '<th colspan="4" style="' + _rpGrp + _rpBorderL + 'color:var(--text-secondary);">All-time</th>' +
    '</tr>' +
    '<tr style="background:var(--surface-elevated);border-bottom:1px solid var(--border-color);">' +
    '<th style="' + _rpTh + 'text-align:left;">' + col1 + '</th>' +
    '<th style="' + _rpTh + 'text-align:left;">' + col2 + '</th>' +
    '<th style="' + _rpTh + _rpBorderL + '">Revenue</th>' +
    '<th style="' + _rpTh + '">Costs</th>' +
    '<th style="' + _rpTh + '">Profit</th>' +
    '<th style="' + _rpTh + '">LF</th>' +
    '<th style="' + _rpTh + _rpBorderL + '">Flights</th>' +
    '<th style="' + _rpTh + '">Revenue</th>' +
    '<th style="' + _rpTh + '">Costs</th>' +
    '<th style="' + _rpTh + '">Profit</th>' +
    '</tr></thead><tbody>';
}

function _rpRow(col1, col2, agg) {
  var pc = _rpProfitColor(agg.profit);
  var wpc = _rpProfitColor(agg.weeklyProfit);
  var wrc = _rpProfitColor(agg.weeklyRevenue);
  var lfc = _rpLfColor(agg.averageLoadFactor);
  return '<tr style="border-bottom:1px solid rgba(255,255,255,0.04);">' +
    '<td style="padding:0.3rem 0.5rem;text-align:left;white-space:nowrap;font-size:0.75rem;">' + col1 + '</td>' +
    '<td style="padding:0.3rem 0.5rem;text-align:left;color:var(--text-muted);font-size:0.7rem;">' + col2 + '</td>' +
    '<td style="' + _rpTd + _rpBorderL + 'color:var(--success-color);">' + fmtNum(Math.abs(Math.round(agg.weeklyRevenue))) + '</td>' +
    '<td style="' + _rpTd + 'color:var(--warning-color);">' + fmtNum(Math.abs(Math.round(agg.weeklyCosts))) + '</td>' +
    '<td style="' + _rpTd + 'color:' + wpc + ';font-weight:600;">' + (agg.weeklyProfit < 0 ? '-' : '') + fmtNum(Math.abs(Math.round(agg.weeklyProfit))) + '</td>' +
    '<td style="' + _rpTd + 'color:' + lfc + ';">' + Math.round((agg.averageLoadFactor || 0) * 100) + '%</td>' +
    '<td style="' + _rpTd + _rpBorderL + 'color:var(--text-secondary);">' + agg.totalFlights.toLocaleString() + '</td>' +
    '<td style="' + _rpTd + 'color:var(--success-color);">' + fmtNum(Math.round(agg.totalRevenue)) + '</td>' +
    '<td style="' + _rpTd + 'color:var(--warning-color);">' + fmtNum(Math.round(agg.totalCosts)) + '</td>' +
    '<td style="' + _rpTd + 'color:' + pc + ';">' + (agg.profit < 0 ? '-' : '') + fmtNum(Math.abs(Math.round(agg.profit))) + '</td>' +
    '</tr>';
}

// ── City Pair tab ────────────────────────────────────────────────────────────
function renderCityPairTab(container) {
  // Group by airport pair (bi-directional: sort IDs so EGLL↔KJFK = KJFK↔EGLL)
  var pairs = {};
  for (var i = 0; i < _rpRoutes.length; i++) {
    var r = _rpRoutes[i];
    var a = r.departureId || r.departure;
    var b = r.arrivalId || r.arrival;
    var key = a < b ? a + '|' + b : b + '|' + a;
    if (!pairs[key]) pairs[key] = { routes: [], dep: r.departure, arr: r.arrival };
    pairs[key].routes.push(r);
  }

  var entries = Object.values(pairs).map(function(p) {
    var agg = _aggregate(p.routes);
    agg.dep = p.dep;
    agg.arr = p.arr;
    return agg;
  });
  entries.sort(function(a, b) { return b.weeklyProfit - a.weeklyProfit; });

  var html = _rpTableHead('City Pair', 'Routes');
  for (var j = 0; j < entries.length; j++) {
    var e = entries[j];
    var pair = '<span style="color:var(--accent-color);">' + e.dep + ' ↔ ' + e.arr + '</span>';
    var count = e.routeCount + ' route' + (e.routeCount !== 1 ? 's' : '');
    html += _rpRow(pair, count, e);
  }
  html += '</tbody></table>';
  container.innerHTML = html;
}

// ── All Routes tab ───────────────────────────────────────────────────────────
function renderAllRoutesTab(container) {
  var routes = _rpRoutes.map(function(r) {
    var we = _weeklyEstimates(r);
    return { r: r, we: we };
  });
  routes.sort(function(a, b) { return b.we.weeklyProfit - a.we.weeklyProfit; });

  var html = _rpTableHead('Flight', 'Pair');
  for (var i = 0; i < routes.length; i++) {
    var r = routes[i].r;
    var we = routes[i].we;
    var tag = r.isActive ? '' : ' <span style="color:var(--text-muted);font-size:0.6rem;">off</span>';
    var flightNum = '<span style="color:var(--accent-color);font-family:\'Courier New\',monospace;">' + r.routeNumber + '</span>' + tag;
    var pair = r.departure + '→' + r.arrival;
    var agg = {
      totalFlights: r.totalFlights,
      totalRevenue: r.totalRevenue,
      totalCosts: r.totalCosts,
      profit: r.profit,
      profitMargin: r.profitMargin,
      totalPassengers: r.totalPassengers,
      averageLoadFactor: r.averageLoadFactor,
      weeklyRevenue: we.weeklyRevenue,
      weeklyCosts: we.weeklyCosts,
      weeklyProfit: we.weeklyProfit
    };
    html += _rpRow(flightNum, pair, agg);
  }
  html += '</tbody></table>';
  container.innerHTML = html;
}

// ── By A/C Type tab ──────────────────────────────────────────────────────────
function renderByAcTypeTab(container) {
  var types = {};
  for (var i = 0; i < _rpRoutes.length; i++) {
    var r = _rpRoutes[i];
    var typeName = r.aircraftType || 'Unassigned';
    if (!types[typeName]) types[typeName] = [];
    types[typeName].push(r);
  }

  var entries = Object.keys(types).map(function(name) {
    var agg = _aggregate(types[name]);
    agg.typeName = name;
    return agg;
  });
  entries.sort(function(a, b) { return b.weeklyProfit - a.weeklyProfit; });

  var html = _rpTableHead('Aircraft', 'Routes');
  for (var j = 0; j < entries.length; j++) {
    var e = entries[j];
    var name = '<span style="color:var(--accent-color);">' + e.typeName + '</span>';
    var count = e.routeCount + ' route' + (e.routeCount !== 1 ? 's' : '');
    html += _rpRow(name, count, e);
  }
  html += '</tbody></table>';
  container.innerHTML = html;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtMoney(n) {
  if (typeof formatCurrencyShort === 'function') return formatCurrencyShort(n);
  const v = parseFloat(n) || 0;
  if (Math.abs(v) >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (Math.abs(v) >= 1e3) return '$' + (v / 1e3).toFixed(0) + 'K';
  return '$' + Math.round(v).toLocaleString();
}

// Currency-aware: converts USD → the world's display currency (+ symbol, snapped).
function fmtNum(n) {
  const sym = (typeof getCurrencySymbol === 'function') ? getCurrencySymbol() : '$';
  const num = (typeof currencyNumber === 'function') ? currencyNumber(n) : Math.round(Number(n) || 0).toLocaleString('en-US');
  return sym + num;
}

function fmtDate(weekStart) {
  const d = new Date(weekStart + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateShort(weekStart) {
  const d = new Date(weekStart + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('weekPrev').addEventListener('click', () => changeWeekPage(1));
  document.getElementById('weekNext').addEventListener('click', () => changeWeekPage(-1));
  loadFinancialData();
});

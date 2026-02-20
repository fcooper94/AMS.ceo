// Financial Reports — week-by-week P&L with route performance

let allWeeks = [];
let weekPage = 0;
const WEEKS_PER_PAGE = 4;

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
  setText('statCosts', fmtMoney(data.allTime.totalCosts));
  setText('statFlights', data.allTime.totalFlights.toLocaleString());
  setText('statPax', data.allTime.totalPassengers.toLocaleString());
  setText('statOverhead', fmtMoney(data.weeklyOverheads.total) + '/wk');
  // Net P&L with color
  const net = (data.allTime.totalRevenue || 0) - (data.allTime.totalCosts || 0);
  const netEl = document.getElementById('statNet');
  if (netEl) {
    netEl.textContent = (net < 0 ? '-' : '') + fmtMoney(Math.abs(net));
    netEl.style.color = net > 0 ? 'var(--success-color)' : net < 0 ? '#f85149' : 'var(--text-muted)';
  }
}

// ── Pagination ───────────────────────────────────────────────────────────────

function changeWeekPage(dir) {
  const maxPage = Math.max(0, Math.ceil(allWeeks.length / WEEKS_PER_PAGE) - 1);
  weekPage = Math.max(0, Math.min(maxPage, weekPage + dir));
  renderWeeklyPL();
}

// ── Weekly P&L table ─────────────────────────────────────────────────────────

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

  // Range label with page indicator
  if (rangeEl) {
    const pageNum = weekPage + 1;
    if (totalPages <= 1) {
      rangeEl.textContent = `${allWeeks.length} week${allWeeks.length !== 1 ? 's' : ''} of data`;
    } else {
      rangeEl.textContent = `Page ${pageNum} of ${totalPages}`;
    }
  }

  // Header: Category | Week1 | Week2 | ...
  const cols = weeks.length + 1;
  let head = '<tr style="background:var(--surface-elevated);border-bottom:1px solid var(--border-color);">';
  head += '<th style="padding:0.4rem 0.6rem;text-align:left;color:var(--text-muted);font-size:0.7rem;font-weight:600;min-width:140px;">Category</th>';
  for (const w of weeks) {
    head += `<th style="padding:0.4rem 0.6rem;text-align:right;color:var(--text-muted);font-size:0.7rem;font-weight:600;white-space:nowrap;">Wk of ${fmtDate(w.weekStart)}</th>`;
  }
  head += '</tr>';
  thead.innerHTML = head;

  // Rows
  let rows = '';

  // ── INCOME ──
  rows += wkGroupHeader('INCOME', 'income');
  rows += wkRow('Flight Revenue', weeks, 'flightRevenue', false, 'income');
  rows += wkTotal('Total Income', weeks, 'flightRevenue', false, 'income');

  rows += wkDivider(cols);

  // ── OUTGOINGS ──
  rows += wkGroupHeader('OUTGOINGS', 'outgoing');

  // Operating Costs sub-section
  rows += wkSubSection('Operating Costs');
  rows += wkRow('Fuel', weeks, 'fuelCosts', true, 'outgoing');
  rows += wkRow('Crew', weeks, 'crewCosts', true, 'outgoing');
  rows += wkRow('Maintenance', weeks, 'maintenanceCosts', true, 'outgoing');
  rows += wkRow('Airport Fees', weeks, 'airportFees', true, 'outgoing');
  rows += wkSubTotal('Subtotal Op. Costs', weeks, 'operatingCosts', true);

  // Overheads sub-section
  rows += wkSubSection('Overheads');
  rows += wkRow('Staff', weeks, 'staffCosts', true, 'outgoing');
  rows += wkRow('Leases', weeks, 'leaseCosts', true, 'outgoing');
  rows += wkRow('Contractors', weeks, 'contractorCosts', true, 'outgoing');
  rows += wkRow('Fleet Commonality', weeks, 'fleetCommonalityCosts', true, 'outgoing');
  rows += wkRow('Loan Payments', weeks, 'loanPayments', true, 'outgoing');
  rows += wkSubTotal('Subtotal Overheads', weeks, 'overheads', true);

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
    cells += `<td style="padding:0.3rem 0.6rem;text-align:right;font-family:'Courier New',monospace;color:${color};font-size:0.8rem;">${prefix}$${fmtNum(Math.abs(v))}</td>`;
  }
  return `<tr style="background:${tint};border-bottom:1px solid rgba(255,255,255,0.03);">${cells}</tr>`;
}

function wkSubTotal(label, weeks, key, isExpense) {
  let cells = `<td style="padding:0.3rem 0.6rem 0.3rem 1.2rem;font-weight:600;color:var(--text-muted);font-size:0.75rem;font-style:italic;">${label}</td>`;
  for (const w of weeks) {
    const v = w[key] || 0;
    const prefix = isExpense && v > 0 ? '-' : '';
    cells += `<td style="padding:0.3rem 0.6rem;text-align:right;font-weight:600;font-family:'Courier New',monospace;color:var(--text-muted);font-size:0.75rem;">${prefix}$${fmtNum(Math.abs(v))}</td>`;
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
    cells += `<td style="padding:0.45rem 0.6rem;text-align:right;font-weight:700;font-family:'Courier New',monospace;color:${valColor};font-size:0.8rem;">${prefix}$${fmtNum(Math.abs(v))}</td>`;
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
    cells += `<td style="padding:0.5rem 0.6rem;text-align:right;font-weight:700;font-family:'Courier New',monospace;color:${color};font-size:0.85rem;">${sign}$${fmtNum(Math.abs(v))}</td>`;
  }
  return `<tr style="background:rgba(255,255,255,0.03);border-top:2px solid var(--border-color);border-bottom:2px solid var(--border-color);">${cells}</tr>`;
}

function wkStatRow(label, weeks, key) {
  let cells = `<td style="padding:0.3rem 0.6rem;color:var(--text-secondary);font-size:0.8rem;">${label}</td>`;
  for (const w of weeks) {
    cells += `<td style="padding:0.3rem 0.6rem;text-align:right;font-family:'Courier New',monospace;color:var(--text-secondary);font-size:0.8rem;">${(w[key] || 0).toLocaleString()}</td>`;
  }
  return `<tr style="border-bottom:1px solid rgba(255,255,255,0.03);">${cells}</tr>`;
}

function wkSpacer(cols) {
  return `<tr style="height:0.3rem;"><td colspan="${cols}"></td></tr>`;
}

// ── Route Performance ────────────────────────────────────────────────────────

function renderRoutes(routes) {
  const tbody = document.getElementById('routeTableBody');

  if (!routes || routes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="padding:1.5rem;text-align:center;color:var(--text-secondary);">No routes yet.</td></tr>';
    return;
  }

  const sorted = [...routes].sort((a, b) => b.profit - a.profit);
  let rows = '';
  for (const r of sorted) {
    const pc = r.profit > 0 ? 'var(--success-color)' : r.profit < 0 ? '#f85149' : 'var(--text-muted)';
    const mc = r.profitMargin > 0 ? 'var(--success-color)' : r.profitMargin < 0 ? '#f85149' : 'var(--text-muted)';
    const tag = r.isActive ? '' : '<span style="color:var(--text-muted);font-size:0.65rem;"> off</span>';
    rows += `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
      <td style="padding:0.35rem 0.6rem;white-space:nowrap;"><span style="color:var(--accent-color);font-family:'Courier New',monospace;">${r.routeNumber}</span> <span style="color:var(--text-muted);font-size:0.75rem;">${r.departure}→${r.arrival}</span>${tag}</td>
      <td style="padding:0.35rem 0.6rem;text-align:right;font-family:'Courier New',monospace;color:var(--text-secondary);">${r.totalFlights}</td>
      <td style="padding:0.35rem 0.6rem;text-align:right;font-family:'Courier New',monospace;color:var(--success-color);">$${fmtNum(r.totalRevenue)}</td>
      <td style="padding:0.35rem 0.6rem;text-align:right;font-family:'Courier New',monospace;color:var(--warning-color);">$${fmtNum(r.totalCosts)}</td>
      <td style="padding:0.35rem 0.6rem;text-align:right;font-family:'Courier New',monospace;color:${pc};">${r.profit<0?'-':''}$${fmtNum(Math.abs(r.profit))}</td>
      <td style="padding:0.35rem 0.6rem;text-align:right;font-family:'Courier New',monospace;color:${mc};">${r.profitMargin}%</td>
      <td style="padding:0.35rem 0.6rem;text-align:right;font-family:'Courier New',monospace;color:var(--text-secondary);">${r.averageLoadFactor}%</td>
      <td style="padding:0.35rem 0.6rem;text-align:right;font-family:'Courier New',monospace;color:var(--text-secondary);">$${fmtNum(r.revenuePerFlight)}</td>
    </tr>`;
  }
  tbody.innerHTML = rows;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtMoney(n) {
  const v = parseFloat(n) || 0;
  if (Math.abs(v) >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (Math.abs(v) >= 1e3) return '$' + (v / 1e3).toFixed(0) + 'K';
  return '$' + Math.round(v).toLocaleString();
}

function fmtNum(n) {
  return Math.round(Number(n) || 0).toLocaleString('en-US');
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

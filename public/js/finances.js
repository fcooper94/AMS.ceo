// Financial Reports — week-by-week P&L with route performance

let allWeeks = [];
let weekPage = 0;
const WEEKS_PER_PAGE = 4;

async function loadFinancialData() {
  try {
    const res = await fetch('/api/finances');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load');

    renderSummary(data);
    allWeeks = data.weeks || [];
    weekPage = 0;
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
  rows += wkSection('REVENUE');
  rows += wkRow('Flight Revenue', weeks, 'flightRevenue', false);
  rows += wkTotal('Total Revenue', weeks, 'flightRevenue', false);
  rows += wkSpacer(cols);

  rows += wkSection('OPERATING COSTS');
  rows += wkRow('Fuel', weeks, 'fuelCosts', true);
  rows += wkRow('Crew', weeks, 'crewCosts', true);
  rows += wkRow('Maintenance', weeks, 'maintenanceCosts', true);
  rows += wkRow('Airport Fees', weeks, 'airportFees', true);
  rows += wkTotal('Total Op. Costs', weeks, 'operatingCosts', true);
  rows += wkSpacer(cols);

  rows += wkSection('OVERHEADS');
  rows += wkRow('Staff', weeks, 'staffCosts', true);
  rows += wkRow('Leases', weeks, 'leaseCosts', true);
  rows += wkRow('Contractors', weeks, 'contractorCosts', true);
  rows += wkRow('Fleet Commonality', weeks, 'fleetCommonalityCosts', true);
  rows += wkRow('Loan Payments', weeks, 'loanPayments', true);
  rows += wkTotal('Total Overheads', weeks, 'overheads', true);
  rows += wkSpacer(cols);

  // Net Profit highlight
  rows += wkHighlight('NET PROFIT', weeks, 'netProfit');

  // Stats
  rows += wkSpacer(cols);
  rows += wkSection('STATS');
  rows += wkStatRow('Flights', weeks, 'flights');
  rows += wkStatRow('Passengers', weeks, 'passengers');

  tbody.innerHTML = rows;
}

function wkSection(title) {
  return `<tr style="background:var(--surface-elevated);">
    <td colspan="99" style="padding:0.35rem 0.6rem;font-weight:700;color:var(--accent-color);font-size:0.7rem;letter-spacing:0.5px;border-top:1px solid var(--border-color);">${title}</td></tr>`;
}

function wkRow(label, weeks, key, isExpense) {
  let cells = `<td style="padding:0.3rem 0.6rem;color:var(--text-secondary);font-size:0.8rem;">${label}</td>`;
  for (const w of weeks) {
    const v = w[key] || 0;
    const prefix = isExpense && v > 0 ? '-' : '';
    const color = v === 0 ? 'var(--text-muted)' : 'var(--text-secondary)';
    cells += `<td style="padding:0.3rem 0.6rem;text-align:right;font-family:'Courier New',monospace;color:${color};font-size:0.8rem;">${prefix}$${fmtNum(Math.abs(v))}</td>`;
  }
  return `<tr style="border-bottom:1px solid rgba(255,255,255,0.03);">${cells}</tr>`;
}

function wkTotal(label, weeks, key, isExpense) {
  let cells = `<td style="padding:0.4rem 0.6rem;font-weight:600;color:var(--text-primary);font-size:0.8rem;">${label}</td>`;
  for (const w of weeks) {
    const v = w[key] || 0;
    const prefix = isExpense && v > 0 ? '-' : '';
    cells += `<td style="padding:0.4rem 0.6rem;text-align:right;font-weight:600;font-family:'Courier New',monospace;color:var(--text-primary);font-size:0.8rem;">${prefix}$${fmtNum(Math.abs(v))}</td>`;
  }
  return `<tr style="background:rgba(255,255,255,0.02);border-top:1px solid var(--border-color);border-bottom:1px solid var(--border-color);">${cells}</tr>`;
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
